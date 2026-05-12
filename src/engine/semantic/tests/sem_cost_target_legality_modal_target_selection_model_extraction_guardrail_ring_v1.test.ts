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

type ModalSelectionModelSnapshot = {
  kind: "MODAL_SELECTION_MODEL";
  mode_selection_kind: "CHOOSE_ONE" | "CHOOSE_TWO" | "CHOOSE_ONE_OR_MORE" | "UNKNOWN_MODAL_SELECTION";
  selected_modes_min: number | null;
  selected_modes_max: number | null;
  modes_total: number | null;
  targeted_modes_count: number | null;
  conceptual_target_slots_min: number | null;
  conceptual_target_slots_max: number | null;
  aggregated_target_kinds: string[];
  notes: string;
  known_gap: string | null;
};

type GuardrailSnapshot = {
  cardName: string;
  canonicalName: string;
  min_exists: boolean;
  cost_kinds: string[];
  target_kinds: string[];
  legality_kinds: string[];
  target_count: number | null;
  legality_count: number | null;
  modal_selection_model: ModalSelectionModelSnapshot | null;
};

const here = dirname(fileURLToPath(import.meta.url));
const cardsIndexPath = join(here, "../../../../public/data/cards_index.json.gz");

const CORPUS = [
  "Abrade",
  "Kolaghan's Command",
  "Cryptic Command",
  "Prismari Command",
  "Casualties of War",
  "Electrolyze",
] as const;

const EXPECTED_BY_CARD: Record<string, Omit<GuardrailSnapshot, "canonicalName">> = {
  Abrade: {
    cardName: "Abrade",
    min_exists: true,
    cost_kinds: [],
    target_kinds: ["ARTIFACT", "CREATURE"],
    legality_kinds: [],
    target_count: 2,
    legality_count: 0,
    modal_selection_model: {
      kind: "MODAL_SELECTION_MODEL",
      mode_selection_kind: "CHOOSE_ONE",
      selected_modes_min: 1,
      selected_modes_max: 1,
      modes_total: 2,
      targeted_modes_count: 2,
      conceptual_target_slots_min: 1,
      conceptual_target_slots_max: 1,
      aggregated_target_kinds: ["ARTIFACT", "CREATURE"],
      notes: "modal_selection_model is additive and target_count remains a diagnostic aggregation signal.",
      known_gap: null,
    },
  },
  "Kolaghan's Command": {
    cardName: "Kolaghan's Command",
    min_exists: true,
    cost_kinds: [],
    target_kinds: ["ANY_TARGET", "ARTIFACT", "CREATURE", "PLAYER"],
    legality_kinds: [],
    target_count: 4,
    legality_count: 0,
    modal_selection_model: {
      kind: "MODAL_SELECTION_MODEL",
      mode_selection_kind: "CHOOSE_TWO",
      selected_modes_min: 2,
      selected_modes_max: 2,
      modes_total: 4,
      targeted_modes_count: 4,
      conceptual_target_slots_min: 2,
      conceptual_target_slots_max: 2,
      aggregated_target_kinds: ["ANY_TARGET", "ARTIFACT", "CREATURE", "PLAYER"],
      notes: "modal_selection_model is additive and target_count remains a diagnostic aggregation signal.",
      known_gap: null,
    },
  },
  "Cryptic Command": {
    cardName: "Cryptic Command",
    min_exists: true,
    cost_kinds: [],
    target_kinds: ["PERMANENT", "UNKNOWN_TARGET_KIND"],
    legality_kinds: [],
    target_count: 2,
    legality_count: 0,
    modal_selection_model: {
      kind: "MODAL_SELECTION_MODEL",
      mode_selection_kind: "CHOOSE_TWO",
      selected_modes_min: 2,
      selected_modes_max: 2,
      modes_total: 4,
      targeted_modes_count: 2,
      conceptual_target_slots_min: 0,
      conceptual_target_slots_max: 2,
      aggregated_target_kinds: ["PERMANENT", "UNKNOWN_TARGET_KIND"],
      notes: "modal_selection_model is additive and target_count remains a diagnostic aggregation signal.",
      known_gap: null,
    },
  },
  "Prismari Command": {
    cardName: "Prismari Command",
    min_exists: true,
    cost_kinds: [],
    target_kinds: ["ANY_TARGET", "ARTIFACT", "PLAYER"],
    legality_kinds: [],
    target_count: 4,
    legality_count: 0,
    modal_selection_model: {
      kind: "MODAL_SELECTION_MODEL",
      mode_selection_kind: "CHOOSE_TWO",
      selected_modes_min: 2,
      selected_modes_max: 2,
      modes_total: 4,
      targeted_modes_count: 4,
      conceptual_target_slots_min: 2,
      conceptual_target_slots_max: 2,
      aggregated_target_kinds: ["ANY_TARGET", "ARTIFACT", "PLAYER"],
      notes: "modal_selection_model is additive and target_count remains a diagnostic aggregation signal.",
      known_gap: null,
    },
  },
  "Casualties of War": {
    cardName: "Casualties of War",
    min_exists: true,
    cost_kinds: [],
    target_kinds: ["ARTIFACT", "CREATURE", "LAND", "UNKNOWN_TARGET_KIND"],
    legality_kinds: [],
    target_count: 5,
    legality_count: 0,
    modal_selection_model: {
      kind: "MODAL_SELECTION_MODEL",
      mode_selection_kind: "CHOOSE_ONE_OR_MORE",
      selected_modes_min: 1,
      selected_modes_max: 5,
      modes_total: 5,
      targeted_modes_count: 5,
      conceptual_target_slots_min: 1,
      conceptual_target_slots_max: 5,
      aggregated_target_kinds: ["ARTIFACT", "CREATURE", "LAND", "UNKNOWN_TARGET_KIND"],
      notes: "modal_selection_model is additive and target_count remains a diagnostic aggregation signal.",
      known_gap: null,
    },
  },
  Electrolyze: {
    cardName: "Electrolyze",
    min_exists: false,
    cost_kinds: [],
    target_kinds: [],
    legality_kinds: [],
    target_count: null,
    legality_count: null,
    modal_selection_model: null,
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

function snapshotFromRealOracle(payload: CardsIndexPayload, cardName: string): GuardrailSnapshot {
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

  return {
    cardName,
    canonicalName,
    min_exists: Boolean(min),
    cost_kinds: min ? [...min.cost_kinds] : [],
    target_kinds: min ? [...min.target_kinds] : [],
    legality_kinds: min ? [...min.legality_kinds] : [],
    target_count: min ? min.target_count : null,
    legality_count: min ? min.legality_count : null,
    modal_selection_model: (min?.modal_selection_model as ModalSelectionModelSnapshot | undefined) ?? null,
  };
}

function assertNoLeakage(snapshot: GuardrailSnapshot): void {
  expect(snapshot.target_kinds).not.toContain("CAST_ONLY_IF");
  expect(snapshot.target_kinds).not.toContain("ACTIVATE_ONLY_AS_SORCERY");
  const model = snapshot.modal_selection_model;
  if (model) {
    expect(model.aggregated_target_kinds).not.toContain("CAST_ONLY_IF");
    expect(model.aggregated_target_kinds).not.toContain("ACTIVATE_ONLY_AS_SORCERY");
    expect(model.notes.trim().length).toBeGreaterThan(0);
    expect(model.aggregated_target_kinds).toEqual(snapshot.target_kinds);
  }

  for (const kind of snapshot.target_kinds) {
    expect(snapshot.cost_kinds).not.toContain(kind);
    expect(snapshot.legality_kinds).not.toContain(kind);
  }
}

describe("cost target legality modal target selection model extraction guardrail ring v1", () => {
  it("freezes additive modal_selection_model extraction and existing diagnostic channels on real Oracle corpus", () => {
    const payload = loadCardsIndex();
    const runA = CORPUS.map((cardName) => snapshotFromRealOracle(payload, cardName));
    const runB = CORPUS.map((cardName) => snapshotFromRealOracle(payload, cardName));

    expect(runA).toEqual(runB);

    for (const snapshot of runA) {
      const expected = EXPECTED_BY_CARD[snapshot.cardName];
      expect(expected).toBeTruthy();
      expect(snapshot.canonicalName.length).toBeGreaterThan(0);
      expect(snapshot).toMatchObject(expected!);
      assertNoLeakage(snapshot);
    }

    // SPLIT_DIVIDED_DAMAGE_NON_MODAL remains a documented non-goal in this phase.
    const electrolyze = runA.find((row) => row.cardName === "Electrolyze");
    expect(electrolyze?.min_exists).toBe(false);
    expect(electrolyze?.target_kinds).toEqual([]);
    expect(electrolyze?.target_count).toBeNull();
    expect(electrolyze?.modal_selection_model).toBeNull();

    console.log("MODAL_TARGET_SELECTION_MODEL_EXTRACTION_GUARDRAIL_RING_COMPLETE");
  });
});
