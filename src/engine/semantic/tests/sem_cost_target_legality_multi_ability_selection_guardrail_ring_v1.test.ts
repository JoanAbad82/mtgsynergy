import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { normalizeCardName } from "../../cards/normalize";
import { buildCostTargetLegalityHints } from "../lowering/lower_to_ability_ir_min_v1";

type CardsIndexPayload = {
  by_name?: Record<string, { oracle_text?: string | null; type_line?: string | null }>;
  by_name_norm?: Record<string, string>;
};

type GuardrailCase = {
  cardName: string;
  selectedExpectation: string;
};

type GuardrailSnapshot = {
  cardName: string;
  selectedExpectation: string;
  cost_kinds: string[];
  target_kinds: string[];
  legality_kinds: string[];
  target_count: number;
  legality_count: number;
};

const here = dirname(fileURLToPath(import.meta.url));
const cardsIndexPath = join(here, "../../../../public/data/cards_index.json.gz");

const GUARDRAIL_CASES: GuardrailCase[] = [
  { cardName: "Castle Vantress", selectedExpectation: "MULTI_ABILITY_NON_MANA_LINE_SELECTED" },
  { cardName: "Icy Manipulator", selectedExpectation: "ACTIVATED_TARGETED_NON_MANA_STABLE" },
  { cardName: "Llanowar Elves", selectedExpectation: "SINGLE_MANA_ABILITY_STILL_EMITS_HINT" },
  { cardName: "Mind Stone", selectedExpectation: "MULTI_ABILITY_NON_MANA_DRAW_LINE_SELECTED" },
];

const EXPECTED_SNAPSHOTS_BY_CARD: Record<string, GuardrailSnapshot> = {
  "Castle Vantress": {
    cardName: "Castle Vantress",
    selectedExpectation: "MULTI_ABILITY_NON_MANA_LINE_SELECTED",
    cost_kinds: ["MANA", "TAP"],
    target_kinds: [],
    legality_kinds: [],
    target_count: 0,
    legality_count: 0,
  },
  "Icy Manipulator": {
    cardName: "Icy Manipulator",
    selectedExpectation: "ACTIVATED_TARGETED_NON_MANA_STABLE",
    cost_kinds: ["MANA", "TAP"],
    target_kinds: ["ARTIFACT", "CREATURE", "LAND"],
    legality_kinds: [],
    target_count: 1,
    legality_count: 0,
  },
  "Llanowar Elves": {
    cardName: "Llanowar Elves",
    selectedExpectation: "SINGLE_MANA_ABILITY_STILL_EMITS_HINT",
    cost_kinds: ["TAP"],
    target_kinds: [],
    legality_kinds: ["SUMMONING_SICKNESS_TAP_Q_RESTRICTION"],
    target_count: 0,
    legality_count: 1,
  },
  "Mind Stone": {
    cardName: "Mind Stone",
    selectedExpectation: "MULTI_ABILITY_NON_MANA_DRAW_LINE_SELECTED",
    cost_kinds: ["MANA", "SACRIFICE", "TAP"],
    target_kinds: [],
    legality_kinds: [],
    target_count: 0,
    legality_count: 0,
  },
};

function loadCardsIndex(): CardsIndexPayload {
  const gz = readFileSync(cardsIndexPath);
  const json = gunzipSync(gz).toString("utf8");
  return JSON.parse(json) as CardsIndexPayload;
}

function findCanonicalName(payload: CardsIndexPayload, name: string): string | null {
  const byName = payload.by_name ?? {};
  const byNameNorm = payload.by_name_norm ?? {};
  if (byName[name]) return name;

  const norm = normalizeCardName(name);
  const canonical = byNameNorm[norm];
  if (canonical && byName[canonical]) return canonical;

  if (!name.includes("//")) {
    const prefix = `${norm} //`;
    const matches = Object.entries(byNameNorm)
      .filter(([key]) => key.startsWith(prefix))
      .map(([, value]) => value)
      .filter((value) => value && byName[value]);
    if (matches.length === 1) return matches[0];
  }

  return null;
}

function snapshotFromRealOracle(payload: CardsIndexPayload, guardrailCase: GuardrailCase): GuardrailSnapshot {
  const canonicalName = findCanonicalName(payload, guardrailCase.cardName);
  if (!canonicalName) {
    throw new Error(`Card not found in local cards index: ${guardrailCase.cardName}`);
  }

  const row = payload.by_name?.[canonicalName];
  if (!row) {
    throw new Error(`Missing by_name row for canonical card: ${canonicalName}`);
  }

  const oracleText = row.oracle_text ?? "";
  const typeLine = row.type_line ?? null;

  const hints = buildCostTargetLegalityHints(oracleText, typeLine);
  const min = hints.costTargetLegalityMin;
  if (!min) {
    throw new Error(`Expected semantic_hints.cost_target_legality_min for ${guardrailCase.cardName}`);
  }

  return {
    cardName: guardrailCase.cardName,
    selectedExpectation: guardrailCase.selectedExpectation,
    cost_kinds: [...min.cost_kinds],
    target_kinds: [...min.target_kinds],
    legality_kinds: [...min.legality_kinds],
    target_count: min.target_count,
    legality_count: min.legality_count,
  };
}

describe("cost target legality multi-ability selection guardrail ring v1", () => {
  it("keeps deterministic real-oracle snapshots for a minimal multi-ability guardrail corpus", () => {
    const payload = loadCardsIndex();
    const runA = GUARDRAIL_CASES.map((guardrailCase) => snapshotFromRealOracle(payload, guardrailCase));
    const runB = GUARDRAIL_CASES.map((guardrailCase) => snapshotFromRealOracle(payload, guardrailCase));

    expect(runA).toEqual(runB);
    expect(runA).toEqual(GUARDRAIL_CASES.map((guardrailCase) => EXPECTED_SNAPSHOTS_BY_CARD[guardrailCase.cardName]));
  });

  it("keeps Castle repair, preserves single-mana fallback, and avoids effect-kind leakage in target/legality", () => {
    const payload = loadCardsIndex();
    const byName = new Map(
      GUARDRAIL_CASES.map((guardrailCase) => [
        guardrailCase.cardName,
        snapshotFromRealOracle(payload, guardrailCase),
      ]),
    );

    const castle = byName.get("Castle Vantress");
    expect(castle?.cost_kinds).toEqual(expect.arrayContaining(["MANA", "TAP"]));
    expect(castle?.target_count).toBe(0);
    expect(castle?.legality_count).toBe(0);
    expect(castle?.legality_kinds).toEqual([]);

    const icy = byName.get("Icy Manipulator");
    expect(icy?.cost_kinds).toEqual(expect.arrayContaining(["MANA", "TAP"]));
    expect(icy?.target_kinds).toEqual(expect.arrayContaining(["ARTIFACT", "CREATURE", "LAND"]));
    expect((icy?.target_count ?? 0)).toBeGreaterThanOrEqual(1);

    const llanowar = byName.get("Llanowar Elves");
    expect(llanowar?.cost_kinds).toContain("TAP");
    expect(llanowar?.target_count).toBe(0);
    expect((llanowar?.cost_kinds.length ?? 0) > 0).toBe(true);

    const mindStone = byName.get("Mind Stone");
    expect(mindStone?.cost_kinds).toEqual(expect.arrayContaining(["MANA", "TAP", "SACRIFICE"]));
    expect(mindStone?.target_count).toBe(0);
    expect(mindStone?.legality_count).toBe(0);

    for (const snapshot of [castle, icy, llanowar, mindStone]) {
      expect(snapshot?.target_kinds).not.toContain("DRAW_CARDS");
      expect(snapshot?.target_kinds).not.toContain("TAP_PERMANENT");
      expect(snapshot?.legality_kinds).not.toContain("SCRY");
      expect(snapshot?.legality_kinds).not.toContain("DRAW_CARDS");
      expect(snapshot?.legality_kinds).not.toContain("TAP_PERMANENT");
    }
  });
});
