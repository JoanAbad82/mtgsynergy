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

type ModelKind =
  | "CHOOSE_ONE"
  | "CHOOSE_TWO"
  | "CHOOSE_ONE_OR_MORE"
  | "SPLIT_DIVIDED_DAMAGE_NON_MODAL";

type ConceptualSelectionModel = {
  model_kind: ModelKind;
  selected_modes_min: number | null;
  selected_modes_max: number | null;
  conceptual_target_slots_min: number | null;
  conceptual_target_slots_max: number | null;
};

type ModalTargetSelectionModelGuardrailSnapshot = {
  cardName: string;
  canonicalName: string;
  oracle_text: string;
  type_line: string | null;
  min_exists: boolean;
  cost_kinds: string[];
  target_kinds: string[];
  legality_kinds: string[];
  target_count: number | null;
  legality_count: number | null;
  conceptual_model: ConceptualSelectionModel;
};

const here = dirname(fileURLToPath(import.meta.url));
const cardsIndexPath = join(here, "../../../../public/data/cards_index.json.gz");

const GUARDRAIL_CORPUS = [
  "Abrade",
  "Kolaghan's Command",
  "Cryptic Command",
  "Prismari Command",
  "Casualties of War",
  "Electrolyze",
] as const;

const EXPECTED_CURRENT_BY_CARD: Record<
  string,
  Omit<ModalTargetSelectionModelGuardrailSnapshot, "canonicalName" | "oracle_text" | "type_line" | "conceptual_model">
> = {
  Abrade: {
    cardName: "Abrade",
    min_exists: true,
    cost_kinds: [],
    target_kinds: ["ARTIFACT", "CREATURE"],
    legality_kinds: [],
    target_count: 2,
    legality_count: 0,
  },
  "Kolaghan's Command": {
    cardName: "Kolaghan's Command",
    min_exists: true,
    cost_kinds: [],
    target_kinds: ["ANY_TARGET", "ARTIFACT", "CREATURE", "PLAYER"],
    legality_kinds: [],
    target_count: 4,
    legality_count: 0,
  },
  "Cryptic Command": {
    cardName: "Cryptic Command",
    min_exists: true,
    cost_kinds: [],
    target_kinds: ["PERMANENT", "UNKNOWN_TARGET_KIND"],
    legality_kinds: [],
    target_count: 2,
    legality_count: 0,
  },
  "Prismari Command": {
    cardName: "Prismari Command",
    min_exists: true,
    cost_kinds: [],
    target_kinds: ["ANY_TARGET", "ARTIFACT", "PLAYER"],
    legality_kinds: [],
    target_count: 4,
    legality_count: 0,
  },
  "Casualties of War": {
    cardName: "Casualties of War",
    min_exists: true,
    cost_kinds: [],
    target_kinds: ["ARTIFACT", "CREATURE", "LAND", "UNKNOWN_TARGET_KIND"],
    legality_kinds: [],
    target_count: 5,
    legality_count: 0,
  },
  Electrolyze: {
    cardName: "Electrolyze",
    min_exists: false,
    cost_kinds: [],
    target_kinds: [],
    legality_kinds: [],
    target_count: null,
    legality_count: null,
  },
};

const EXPECTED_CONCEPTUAL_MODEL_BY_CARD: Record<string, ConceptualSelectionModel> = {
  Abrade: {
    model_kind: "CHOOSE_ONE",
    selected_modes_min: 1,
    selected_modes_max: 1,
    conceptual_target_slots_min: 1,
    conceptual_target_slots_max: 1,
  },
  "Kolaghan's Command": {
    model_kind: "CHOOSE_TWO",
    selected_modes_min: 2,
    selected_modes_max: 2,
    conceptual_target_slots_min: 2,
    conceptual_target_slots_max: 2,
  },
  "Cryptic Command": {
    model_kind: "CHOOSE_TWO",
    selected_modes_min: 2,
    selected_modes_max: 2,
    conceptual_target_slots_min: 0,
    conceptual_target_slots_max: 2,
  },
  "Prismari Command": {
    model_kind: "CHOOSE_TWO",
    selected_modes_min: 2,
    selected_modes_max: 2,
    conceptual_target_slots_min: 2,
    conceptual_target_slots_max: 2,
  },
  "Casualties of War": {
    model_kind: "CHOOSE_ONE_OR_MORE",
    selected_modes_min: 1,
    selected_modes_max: 5,
    conceptual_target_slots_min: 1,
    conceptual_target_slots_max: 5,
  },
  Electrolyze: {
    model_kind: "SPLIT_DIVIDED_DAMAGE_NON_MODAL",
    selected_modes_min: null,
    selected_modes_max: null,
    conceptual_target_slots_min: 1,
    conceptual_target_slots_max: 2,
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
  cardName: string,
): ModalTargetSelectionModelGuardrailSnapshot {
  const canonicalName = findCanonicalName(payload, cardName);
  if (!canonicalName) {
    throw new Error(`Card not found in local cards index: ${cardName}`);
  }

  const row = payload.by_name?.[canonicalName];
  if (!row) {
    throw new Error(`Missing by_name row for canonical card: ${canonicalName}`);
  }

  const oracleText = row.oracle_text ?? "";
  const typeLine = row.type_line ?? null;
  const min = buildCostTargetLegalityHints(oracleText, typeLine).costTargetLegalityMin;
  const conceptualModel = EXPECTED_CONCEPTUAL_MODEL_BY_CARD[cardName];
  if (!conceptualModel) {
    throw new Error(`Missing conceptual model for card: ${cardName}`);
  }

  return {
    cardName,
    canonicalName,
    oracle_text: oracleText,
    type_line: typeLine,
    min_exists: Boolean(min),
    cost_kinds: min ? [...min.cost_kinds] : [],
    target_kinds: min ? [...min.target_kinds] : [],
    legality_kinds: min ? [...min.legality_kinds] : [],
    target_count: min ? min.target_count : null,
    legality_count: min ? min.legality_count : null,
    conceptual_model: conceptualModel,
  };
}

function assertNoLeakage(snapshot: ModalTargetSelectionModelGuardrailSnapshot): void {
  expect(snapshot.target_kinds).not.toContain("CAST_ONLY_IF");
  expect(snapshot.target_kinds).not.toContain("ACTIVATE_ONLY_AS_SORCERY");
  if (!snapshot.min_exists) return;
  for (const kind of snapshot.target_kinds) {
    expect(snapshot.cost_kinds).not.toContain(kind);
    expect(snapshot.legality_kinds).not.toContain(kind);
  }
}

describe("cost target legality modal target selection model guardrail ring v1", () => {
  it("freezes current aggregated output and conceptual selection model without declaring final modal semantics", () => {
    const payload = loadCardsIndex();
    const runA = GUARDRAIL_CORPUS.map((cardName) => snapshotFromRealOracle(payload, cardName));
    const runB = GUARDRAIL_CORPUS.map((cardName) => snapshotFromRealOracle(payload, cardName));

    expect(runA).toEqual(runB);

    for (const snapshot of runA) {
      expect(snapshot.canonicalName.length).toBeGreaterThan(0);
      expect(snapshot.oracle_text.trim().length).toBeGreaterThan(0);
      assertNoLeakage(snapshot);
      expect(snapshot).toMatchObject(EXPECTED_CURRENT_BY_CARD[snapshot.cardName]!);
      expect(snapshot.conceptual_model).toEqual(EXPECTED_CONCEPTUAL_MODEL_BY_CARD[snapshot.cardName]!);
    }

    // target_count is a diagnostic aggregation signal here, not final modal semantics.
    const abrade = runA.find((row) => row.cardName === "Abrade");
    expect(abrade?.target_count).toBe(2);

    // Split-target/divided damage remains a non-goal in this guardrail ring.
    const electrolyze = runA.find((row) => row.cardName === "Electrolyze");
    expect(electrolyze?.min_exists).toBe(false);
    expect(electrolyze?.target_kinds).toEqual([]);
    expect(electrolyze?.target_count).toBeNull();
  });
});
