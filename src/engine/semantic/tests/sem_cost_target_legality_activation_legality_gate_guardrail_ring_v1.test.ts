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

type ActivationLegalityGuardrailSnapshot = {
  cardName: string;
  oracleHasActivationGate: boolean;
  cost_kinds: string[];
  target_kinds: string[];
  legality_kinds: string[];
  target_count: number;
  legality_count: number;
};

type ActivationLegalityGuardrailCase = {
  cardName: string;
};

const here = dirname(fileURLToPath(import.meta.url));
const cardsIndexPath = join(here, "../../../../public/data/cards_index.json.gz");

const ACTIVATION_LEGALITY_GUARDRAIL_CASES: ActivationLegalityGuardrailCase[] = [
  { cardName: "Bloodtithe Harvester" },
  { cardName: "Birthing Pod" },
  { cardName: "Transmogrifying Wand" },
];

const EXPECTED_SNAPSHOTS_BY_CARD: Record<string, ActivationLegalityGuardrailSnapshot> = {
  "Bloodtithe Harvester": {
    cardName: "Bloodtithe Harvester",
    oracleHasActivationGate: true,
    cost_kinds: ["SACRIFICE", "TAP"],
    target_kinds: ["CREATURE"],
    legality_kinds: ["ACTIVATE_ONLY_AS_SORCERY", "SUMMONING_SICKNESS_TAP_Q_RESTRICTION"],
    target_count: 1,
    legality_count: 2,
  },
  "Birthing Pod": {
    cardName: "Birthing Pod",
    oracleHasActivationGate: true,
    cost_kinds: ["MANA", "SACRIFICE", "TAP"],
    target_kinds: [],
    legality_kinds: ["ACTIVATE_ONLY_AS_SORCERY"],
    target_count: 0,
    legality_count: 1,
  },
  "Transmogrifying Wand": {
    cardName: "Transmogrifying Wand",
    oracleHasActivationGate: true,
    cost_kinds: ["MANA", "REMOVE_COUNTER", "TAP"],
    target_kinds: ["CREATURE"],
    legality_kinds: ["ACTIVATE_ONLY_AS_SORCERY"],
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
  guardrailCase: ActivationLegalityGuardrailCase,
): ActivationLegalityGuardrailSnapshot {
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
    oracleHasActivationGate: /activate only as a sorcery\./i.test(oracleText),
    cost_kinds: [...min.cost_kinds],
    target_kinds: [...min.target_kinds],
    legality_kinds: [...min.legality_kinds],
    target_count: min.target_count,
    legality_count: min.legality_count,
  };
}

describe("cost target legality activation legality gate guardrail ring v1", () => {
  it("keeps deterministic real-oracle snapshots for the minimal Activate only as a sorcery guardrail corpus", () => {
    const payload = loadCardsIndex();
    const runA = ACTIVATION_LEGALITY_GUARDRAIL_CASES.map((row) => snapshotFromRealOracle(payload, row));
    const runB = ACTIVATION_LEGALITY_GUARDRAIL_CASES.map((row) => snapshotFromRealOracle(payload, row));

    expect(runA).toEqual(runB);
    expect(runA).toEqual(
      ACTIVATION_LEGALITY_GUARDRAIL_CASES.map((row) => EXPECTED_SNAPSHOTS_BY_CARD[row.cardName]),
    );
  });

  it("keeps ACTIVATE_ONLY_AS_SORCERY in legality channel for this wording and preserves Bloodtithe target", () => {
    const payload = loadCardsIndex();
    const snapshots = ACTIVATION_LEGALITY_GUARDRAIL_CASES.map((row) => snapshotFromRealOracle(payload, row));

    for (const snapshot of snapshots) {
      expect(snapshot.oracleHasActivationGate).toBe(true);
      expect(snapshot.legality_kinds).toContain("ACTIVATE_ONLY_AS_SORCERY");
      expect(snapshot.target_kinds).not.toContain("ACTIVATE_ONLY_AS_SORCERY");
      expect(snapshot.cost_kinds).not.toContain("ACTIVATE_ONLY_AS_SORCERY");
    }

    const bloodtithe = snapshots.find((row) => row.cardName === "Bloodtithe Harvester");
    expect(bloodtithe?.cost_kinds).toEqual(expect.arrayContaining(["SACRIFICE", "TAP"]));
    expect(bloodtithe?.target_kinds).toContain("CREATURE");
    expect((bloodtithe?.target_count ?? 0)).toBeGreaterThanOrEqual(1);
  });
});
