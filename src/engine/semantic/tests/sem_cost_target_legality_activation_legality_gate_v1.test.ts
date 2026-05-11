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

type ActivationLegalitySnapshot = {
  cardName: string;
  selectedExpectation: string;
  cost_kinds: string[];
  target_kinds: string[];
  legality_kinds: string[];
  target_count: number;
  legality_count: number;
};

type ActivationLegalityCase = {
  cardName: string;
  selectedExpectation: string;
};

const here = dirname(fileURLToPath(import.meta.url));
const cardsIndexPath = join(here, "../../../../public/data/cards_index.json.gz");

const ACTIVATION_LEGALITY_CASES: ActivationLegalityCase[] = [
  { cardName: "Bloodtithe Harvester", selectedExpectation: "ACTIVATE_ONLY_AS_SORCERY_WITH_TARGETED_EFFECT" },
  { cardName: "Birthing Pod", selectedExpectation: "ACTIVATE_ONLY_AS_SORCERY_WITH_COMPOSITE_COST" },
];

const EXPECTED_SNAPSHOT_BY_CARD: Record<string, ActivationLegalitySnapshot> = {
  "Bloodtithe Harvester": {
    cardName: "Bloodtithe Harvester",
    selectedExpectation: "ACTIVATE_ONLY_AS_SORCERY_WITH_TARGETED_EFFECT",
    cost_kinds: ["SACRIFICE", "TAP"],
    target_kinds: ["CREATURE"],
    legality_kinds: ["ACTIVATE_ONLY_AS_SORCERY", "SUMMONING_SICKNESS_TAP_Q_RESTRICTION"],
    target_count: 1,
    legality_count: 2,
  },
  "Birthing Pod": {
    cardName: "Birthing Pod",
    selectedExpectation: "ACTIVATE_ONLY_AS_SORCERY_WITH_COMPOSITE_COST",
    cost_kinds: ["MANA", "SACRIFICE", "TAP"],
    target_kinds: [],
    legality_kinds: ["ACTIVATE_ONLY_AS_SORCERY"],
    target_count: 0,
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

function snapshotFromRealOracle(payload: CardsIndexPayload, anchor: ActivationLegalityCase): ActivationLegalitySnapshot {
  const canonicalName = findCanonicalName(payload, anchor.cardName);
  if (!canonicalName) {
    throw new Error(`Card not found in local cards index: ${anchor.cardName}`);
  }

  const row = payload.by_name?.[canonicalName];
  if (!row) {
    throw new Error(`Missing by_name row for canonical card: ${canonicalName}`);
  }

  const hints = buildCostTargetLegalityHints(row.oracle_text ?? "", row.type_line ?? null);
  const min = hints.costTargetLegalityMin;
  if (!min) {
    throw new Error(`Expected semantic_hints.cost_target_legality_min for ${anchor.cardName}`);
  }

  return {
    cardName: anchor.cardName,
    selectedExpectation: anchor.selectedExpectation,
    cost_kinds: [...min.cost_kinds],
    target_kinds: [...min.target_kinds],
    legality_kinds: [...min.legality_kinds],
    target_count: min.target_count,
    legality_count: min.legality_count,
  };
}

describe("cost target legality activation legality gate v1", () => {
  it("loads real oracle text and freezes deterministic activation legality snapshots", () => {
    const payload = loadCardsIndex();
    const runA = ACTIVATION_LEGALITY_CASES.map((anchor) => snapshotFromRealOracle(payload, anchor));
    const runB = ACTIVATION_LEGALITY_CASES.map((anchor) => snapshotFromRealOracle(payload, anchor));

    expect(runA).toEqual(runB);
    expect(runA).toEqual(
      ACTIVATION_LEGALITY_CASES.map((anchor) => EXPECTED_SNAPSHOT_BY_CARD[anchor.cardName]),
    );
  });

  it("keeps ACTIVATE_ONLY_AS_SORCERY in legality channel and preserves targets/costs", () => {
    const payload = loadCardsIndex();
    const byName = new Map(
      ACTIVATION_LEGALITY_CASES.map((anchor) => [anchor.cardName, snapshotFromRealOracle(payload, anchor)]),
    );

    const bloodtithe = byName.get("Bloodtithe Harvester");
    expect(bloodtithe?.cost_kinds).toEqual(expect.arrayContaining(["SACRIFICE", "TAP"]));
    expect(bloodtithe?.target_kinds).toContain("CREATURE");
    expect((bloodtithe?.target_count ?? 0)).toBeGreaterThanOrEqual(1);
    expect(bloodtithe?.legality_kinds).toContain("ACTIVATE_ONLY_AS_SORCERY");
    expect((bloodtithe?.legality_count ?? 0)).toBeGreaterThanOrEqual(1);
    expect(bloodtithe?.target_kinds).not.toContain("ACTIVATE_ONLY_AS_SORCERY");

    const birthingPod = byName.get("Birthing Pod");
    expect(birthingPod?.cost_kinds).toEqual(expect.arrayContaining(["MANA", "SACRIFICE", "TAP"]));
    expect(birthingPod?.legality_kinds).toContain("ACTIVATE_ONLY_AS_SORCERY");
    expect((birthingPod?.legality_count ?? 0)).toBeGreaterThanOrEqual(1);
    expect(birthingPod?.target_kinds).not.toContain("ACTIVATE_ONLY_AS_SORCERY");
  });
});
