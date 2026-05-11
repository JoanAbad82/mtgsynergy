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

type CastingLegalityGuardrailCase = {
  cardName: string;
};

type CastingLegalityGuardrailSnapshot = {
  cardName: string;
  oracleHasCastingGate: boolean;
  cost_kinds: string[];
  target_kinds: string[];
  legality_kinds: string[];
  target_count: number;
  legality_count: number;
};

const here = dirname(fileURLToPath(import.meta.url));
const cardsIndexPath = join(here, "../../../../public/data/cards_index.json.gz");

const CASTING_LEGALITY_GUARDRAIL_CASES: CastingLegalityGuardrailCase[] = [
  { cardName: "Would You Have Done the Same?" },
  { cardName: "Defiant Stand" },
  { cardName: "Rapid Fire" },
];

const EXPECTED_SNAPSHOTS_BY_CARD: Record<string, CastingLegalityGuardrailSnapshot> = {
  "Would You Have Done the Same?": {
    cardName: "Would You Have Done the Same?",
    oracleHasCastingGate: true,
    cost_kinds: [],
    target_kinds: ["CREATURE"],
    legality_kinds: ["CAST_ONLY_IF"],
    target_count: 1,
    legality_count: 1,
  },
  "Defiant Stand": {
    cardName: "Defiant Stand",
    oracleHasCastingGate: true,
    cost_kinds: [],
    target_kinds: ["CREATURE"],
    legality_kinds: ["CAST_ONLY_IF"],
    target_count: 1,
    legality_count: 1,
  },
  "Rapid Fire": {
    cardName: "Rapid Fire",
    oracleHasCastingGate: true,
    cost_kinds: [],
    target_kinds: ["CREATURE"],
    legality_kinds: ["CAST_ONLY_IF"],
    target_count: 1,
    legality_count: 1,
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

function snapshotFromRealOracle(
  payload: CardsIndexPayload,
  guardrailCase: CastingLegalityGuardrailCase,
): CastingLegalityGuardrailSnapshot {
  const canonicalName = findCanonicalName(payload, guardrailCase.cardName);
  if (!canonicalName) {
    throw new Error(`Card not found in local cards index: ${guardrailCase.cardName}`);
  }

  const row = payload.by_name?.[canonicalName];
  if (!row) {
    throw new Error(`Missing by_name row for canonical card: ${canonicalName}`);
  }

  const oracleText = row.oracle_text ?? "";
  const hints = buildCostTargetLegalityHints(oracleText, row.type_line ?? null);
  const min = hints.costTargetLegalityMin;
  if (!min) {
    throw new Error(`Expected semantic_hints.cost_target_legality_min for ${guardrailCase.cardName}`);
  }

  return {
    cardName: guardrailCase.cardName,
    oracleHasCastingGate: /cast this spell only (if|during|before)\b/i.test(oracleText),
    cost_kinds: [...min.cost_kinds],
    target_kinds: [...min.target_kinds],
    legality_kinds: [...min.legality_kinds],
    target_count: min.target_count,
    legality_count: min.legality_count,
  };
}

describe("cost target legality casting legality gate guardrail ring v1", () => {
  it("keeps deterministic snapshots for real oracle Cast this spell only wording", () => {
    const payload = loadCardsIndex();
    const runA = CASTING_LEGALITY_GUARDRAIL_CASES.map((row) => snapshotFromRealOracle(payload, row));
    const runB = CASTING_LEGALITY_GUARDRAIL_CASES.map((row) => snapshotFromRealOracle(payload, row));

    expect(runA).toEqual(runB);
    expect(runA).toEqual(
      CASTING_LEGALITY_GUARDRAIL_CASES.map((row) => EXPECTED_SNAPSHOTS_BY_CARD[row.cardName]),
    );
  });

  it("keeps CAST_ONLY_IF in legality channel and preserves current formal target behavior", () => {
    const payload = loadCardsIndex();
    const snapshots = CASTING_LEGALITY_GUARDRAIL_CASES.map((row) => snapshotFromRealOracle(payload, row));

    for (const snapshot of snapshots) {
      expect(snapshot.oracleHasCastingGate).toBe(true);
      expect(snapshot.legality_kinds).toContain("CAST_ONLY_IF");
      expect(snapshot.cost_kinds).not.toContain("CAST_ONLY_IF");
      expect(snapshot.target_kinds).not.toContain("CAST_ONLY_IF");
    }

    const would = snapshots.find((row) => row.cardName === "Would You Have Done the Same?");
    expect(would?.target_kinds).toContain("CREATURE");
    expect((would?.target_count ?? 0)).toBeGreaterThanOrEqual(1);

    // This lowering-hint path only exposes aggregated cost/target/legality hints,
    // so there is no effect/action array here for a direct leakage assertion.
  });
});
