import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { normalizeCardName } from "../../cards/normalize";
import { buildCostTargetLegalityHints } from "../lowering/lower_to_ability_ir_min_v1";

type SplitDamageModelKind =
  | "ONE_OR_TWO_TARGETS"
  | "ONE_TWO_OR_THREE_TARGETS"
  | "ANY_NUMBER_OF_TARGETS"
  | "UNKNOWN_SPLIT_DIVIDED_DAMAGE_TARGET_MODEL";

type SplitDividedDamageTargetModel = {
  kind: "SPLIT_DIVIDED_DAMAGE_TARGET_MODEL";
  split_damage_model_kind: SplitDamageModelKind;
  conceptual_target_slots_min: number | null;
  conceptual_target_slots_max: number | null;
  damage_allocation_is_divided: boolean;
  productive_min_hint_currently_models_split_damage: boolean;
  target_kinds_policy: string;
  known_gap: string | null;
};

type ContractRow = SplitDividedDamageTargetModel & {
  card_name: string;
  notes: string;
};

type BaselineRow = {
  card_name: string;
  min_exists: boolean;
  target_kinds: string[];
  target_count: number | null;
  modal_selection_model: null;
};

type ContractPayload = {
  initial_contract_corpus: ContractRow[];
  current_min_hint_baseline: BaselineRow[];
};

type CardsIndexPayload = {
  by_name?: Record<string, { oracle_text?: string | null; type_line?: string | null }>;
  by_name_norm?: Record<string, string>;
};

type DiagnosisSnapshot = {
  cardName: string;
  canonicalName: string;
  current_min_exists: boolean;
  current_target_kinds: string[];
  current_target_count: number | null;
  current_modal_selection_model: "present" | null;
  inferred_split_divided_damage_target_model: SplitDividedDamageTargetModel;
  contract_split_divided_damage_target_model: SplitDividedDamageTargetModel;
  extraction_delta_kind: "MATCHES_CONTRACT" | "MISMATCH_CONTRACT";
};

const here = dirname(fileURLToPath(import.meta.url));
const cardsIndexPath = join(here, "../../../../public/data/cards_index.json.gz");
const contractPath = join(
  here,
  "../contract/sem_cost_target_legality_split_divided_damage_target_model_contract_v1.json",
);

const CORPUS = [
  "Electrolyze",
  "Arc Lightning",
  "Flames of the Firebrand",
  "Pyrotechnics",
  "Rolling Thunder",
] as const;

function loadCardsIndex(): CardsIndexPayload {
  const gz = readFileSync(cardsIndexPath);
  const json = gunzipSync(gz).toString("utf8");
  return JSON.parse(json) as CardsIndexPayload;
}

function loadContract(): ContractPayload {
  const raw = readFileSync(contractPath, "utf8");
  return JSON.parse(raw) as ContractPayload;
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

function projectContractModel(row: ContractRow): SplitDividedDamageTargetModel {
  return {
    kind: row.kind,
    split_damage_model_kind: row.split_damage_model_kind,
    conceptual_target_slots_min: row.conceptual_target_slots_min,
    conceptual_target_slots_max: row.conceptual_target_slots_max,
    damage_allocation_is_divided: row.damage_allocation_is_divided,
    productive_min_hint_currently_models_split_damage:
      row.productive_min_hint_currently_models_split_damage,
    target_kinds_policy: row.target_kinds_policy,
    known_gap: row.known_gap,
  };
}

// Diagnosis-only local inference helper; this does not implement productive extraction.
function inferSplitDividedDamageTargetModel(
  oracleText: string,
  productiveMinHintCurrentlyModelsSplitDamage: boolean,
): SplitDividedDamageTargetModel {
  const lower = oracleText.toLowerCase();

  if (lower.includes("damage divided as you choose among one or two targets")) {
    return {
      kind: "SPLIT_DIVIDED_DAMAGE_TARGET_MODEL",
      split_damage_model_kind: "ONE_OR_TWO_TARGETS",
      conceptual_target_slots_min: 1,
      conceptual_target_slots_max: 2,
      damage_allocation_is_divided: true,
      productive_min_hint_currently_models_split_damage: productiveMinHintCurrentlyModelsSplitDamage,
      target_kinds_policy: "CURRENTLY_UNMODELLED_EMPTY_TARGET_KINDS",
      known_gap: "SPLIT_DIVIDED_DAMAGE_UNMODELLED_IN_MIN_HINTS",
    };
  }

  if (lower.includes("damage divided as you choose among one, two, or three targets")) {
    return {
      kind: "SPLIT_DIVIDED_DAMAGE_TARGET_MODEL",
      split_damage_model_kind: "ONE_TWO_OR_THREE_TARGETS",
      conceptual_target_slots_min: 1,
      conceptual_target_slots_max: 3,
      damage_allocation_is_divided: true,
      productive_min_hint_currently_models_split_damage: productiveMinHintCurrentlyModelsSplitDamage,
      target_kinds_policy: "CURRENTLY_UNMODELLED_EMPTY_TARGET_KINDS",
      known_gap: "SPLIT_DIVIDED_DAMAGE_UNMODELLED_IN_MIN_HINTS",
    };
  }

  if (
    lower.includes("damage divided as you choose among any number of target") &&
    lower.includes("and/or players")
  ) {
    return {
      kind: "SPLIT_DIVIDED_DAMAGE_TARGET_MODEL",
      split_damage_model_kind: "ANY_NUMBER_OF_TARGETS",
      conceptual_target_slots_min: 0,
      conceptual_target_slots_max: null,
      damage_allocation_is_divided: true,
      productive_min_hint_currently_models_split_damage: productiveMinHintCurrentlyModelsSplitDamage,
      target_kinds_policy: "CURRENTLY_UNMODELLED_EMPTY_TARGET_KINDS",
      known_gap:
        "ANY_NUMBER_OF_TARGETS_MIN_SLOT_IS_CONSERVATIVE_0;SPLIT_DIVIDED_DAMAGE_UNMODELLED_IN_MIN_HINTS",
    };
  }

  if (lower.includes("damage divided as you choose among any number of targets")) {
    return {
      kind: "SPLIT_DIVIDED_DAMAGE_TARGET_MODEL",
      split_damage_model_kind: "ANY_NUMBER_OF_TARGETS",
      conceptual_target_slots_min: 0,
      conceptual_target_slots_max: null,
      damage_allocation_is_divided: true,
      productive_min_hint_currently_models_split_damage: productiveMinHintCurrentlyModelsSplitDamage,
      target_kinds_policy: "CURRENTLY_UNMODELLED_EMPTY_TARGET_KINDS",
      known_gap:
        "ANY_NUMBER_OF_TARGETS_MIN_SLOT_IS_CONSERVATIVE_0;SPLIT_DIVIDED_DAMAGE_UNMODELLED_IN_MIN_HINTS",
    };
  }

  return {
    kind: "SPLIT_DIVIDED_DAMAGE_TARGET_MODEL",
    split_damage_model_kind: "UNKNOWN_SPLIT_DIVIDED_DAMAGE_TARGET_MODEL",
    conceptual_target_slots_min: null,
    conceptual_target_slots_max: null,
    damage_allocation_is_divided: false,
    productive_min_hint_currently_models_split_damage: productiveMinHintCurrentlyModelsSplitDamage,
    target_kinds_policy: "CURRENTLY_UNMODELLED_EMPTY_TARGET_KINDS",
    known_gap: "SPLIT_DIVIDED_DAMAGE_UNMODELLED_IN_MIN_HINTS",
  };
}

function buildSnapshot(
  cards: CardsIndexPayload,
  contractByName: Map<string, ContractRow>,
  baselineByName: Map<string, BaselineRow>,
  cardName: string,
): DiagnosisSnapshot {
  const canonicalName = findCanonicalName(cards, cardName);
  if (!canonicalName) {
    throw new Error(`Card not found in local cards index: ${cardName}`);
  }

  const row = cards.by_name?.[canonicalName];
  if (!row) {
    throw new Error(`Missing by_name row for canonical card: ${canonicalName}`);
  }

  const oracleText = row.oracle_text ?? "";
  const min = buildCostTargetLegalityHints(oracleText, row.type_line ?? null).costTargetLegalityMin;
  const currentMinExists = Boolean(min);
  const currentTargetKinds = min ? [...min.target_kinds] : [];
  const currentTargetCount = min ? min.target_count : null;
  const currentModalSelectionModel = min?.modal_selection_model ? "present" : null;
  const productiveMinHintCurrentlyModelsSplitDamage = currentMinExists && currentTargetKinds.length > 0;

  const contractRow = contractByName.get(cardName);
  if (!contractRow) {
    throw new Error(`Card not found in split contract corpus: ${cardName}`);
  }
  const baselineRow = baselineByName.get(cardName);
  if (!baselineRow) {
    throw new Error(`Card not found in split baseline corpus: ${cardName}`);
  }

  const inferred = inferSplitDividedDamageTargetModel(
    oracleText,
    productiveMinHintCurrentlyModelsSplitDamage,
  );
  const contractModel = projectContractModel(contractRow);
  const extractionDeltaKind: DiagnosisSnapshot["extraction_delta_kind"] =
    JSON.stringify(inferred) === JSON.stringify(contractModel)
      ? "MATCHES_CONTRACT"
      : "MISMATCH_CONTRACT";

  expect(oracleText.trim().length).toBeGreaterThan(0);
  expect(currentMinExists).toBe(true);
  expect(currentTargetKinds).toEqual(["ANY_TARGET"]);
  expect(currentTargetCount).toBeNull();
  expect(currentModalSelectionModel).toBeNull();

  return {
    cardName,
    canonicalName,
    current_min_exists: currentMinExists,
    current_target_kinds: currentTargetKinds,
    current_target_count: currentTargetCount,
    current_modal_selection_model: currentModalSelectionModel,
    inferred_split_divided_damage_target_model: inferred,
    contract_split_divided_damage_target_model: contractModel,
    extraction_delta_kind: extractionDeltaKind,
  };
}

describe("cost target legality split divided damage target model extraction diagnosis v1", () => {
  it("compares contract, real Oracle, current baseline and local diagnosis-only inference without runtime changes", () => {
    const cards = loadCardsIndex();
    const contract = loadContract();
    const contractByName = new Map(contract.initial_contract_corpus.map((row) => [row.card_name, row]));
    const baselineByName = new Map(contract.current_min_hint_baseline.map((row) => [row.card_name, row]));

    const runA = CORPUS.map((cardName) =>
      buildSnapshot(cards, contractByName, baselineByName, cardName),
    );
    const runB = CORPUS.map((cardName) =>
      buildSnapshot(cards, contractByName, baselineByName, cardName),
    );

    expect(runA).toEqual(runB);

    for (const snapshot of runA) {
      expect(snapshot.current_min_exists).toBe(true);
      expect(snapshot.current_target_kinds).toEqual(["ANY_TARGET"]);
      expect(snapshot.current_target_count).toBeNull();
      expect(snapshot.current_modal_selection_model).toBeNull();

      expect(snapshot.inferred_split_divided_damage_target_model.kind).toBe(
        "SPLIT_DIVIDED_DAMAGE_TARGET_MODEL",
      );
      expect(snapshot.inferred_split_divided_damage_target_model.damage_allocation_is_divided).toBe(
        true,
      );

      expect(snapshot.extraction_delta_kind).toBe("MISMATCH_CONTRACT");

      expect(snapshot.current_target_kinds).not.toContain("CAST_ONLY_IF");
      expect(snapshot.current_target_kinds).not.toContain("ACTIVATE_ONLY_AS_SORCERY");
      const inferredSerialized = JSON.stringify(snapshot.inferred_split_divided_damage_target_model);
      const contractSerialized = JSON.stringify(snapshot.contract_split_divided_damage_target_model);
      expect(inferredSerialized).not.toContain("CAST_ONLY_IF");
      expect(inferredSerialized).not.toContain("ACTIVATE_ONLY_AS_SORCERY");
      expect(contractSerialized).not.toContain("CAST_ONLY_IF");
      expect(contractSerialized).not.toContain("ACTIVATE_ONLY_AS_SORCERY");

      console.log(JSON.stringify(snapshot));
    }

    const electrolyze = runA.find((row) => row.cardName === "Electrolyze");
    expect(electrolyze?.inferred_split_divided_damage_target_model.split_damage_model_kind).toBe(
      "ONE_OR_TWO_TARGETS",
    );
    expect(electrolyze?.inferred_split_divided_damage_target_model.conceptual_target_slots_min).toBe(
      1,
    );
    expect(electrolyze?.inferred_split_divided_damage_target_model.conceptual_target_slots_max).toBe(
      2,
    );

    const arcLightning = runA.find((row) => row.cardName === "Arc Lightning");
    expect(arcLightning?.inferred_split_divided_damage_target_model.split_damage_model_kind).toBe(
      "ONE_TWO_OR_THREE_TARGETS",
    );
    expect(arcLightning?.inferred_split_divided_damage_target_model.conceptual_target_slots_min).toBe(
      1,
    );
    expect(arcLightning?.inferred_split_divided_damage_target_model.conceptual_target_slots_max).toBe(
      3,
    );

    const flames = runA.find((row) => row.cardName === "Flames of the Firebrand");
    expect(flames?.inferred_split_divided_damage_target_model.split_damage_model_kind).toBe(
      "ONE_TWO_OR_THREE_TARGETS",
    );
    expect(flames?.inferred_split_divided_damage_target_model.conceptual_target_slots_min).toBe(
      1,
    );
    expect(flames?.inferred_split_divided_damage_target_model.conceptual_target_slots_max).toBe(3);

    for (const name of ["Pyrotechnics", "Rolling Thunder"] as const) {
      const row = runA.find((snapshot) => snapshot.cardName === name);
      expect(row?.inferred_split_divided_damage_target_model.split_damage_model_kind).toBe(
        "ANY_NUMBER_OF_TARGETS",
      );
      expect(row?.inferred_split_divided_damage_target_model.conceptual_target_slots_min).toBe(0);
      expect(row?.inferred_split_divided_damage_target_model.conceptual_target_slots_max).toBeNull();
      expect(row?.inferred_split_divided_damage_target_model.known_gap).toContain(
        "ANY_NUMBER_OF_TARGETS_MIN_SLOT_IS_CONSERVATIVE_0",
      );
    }

    console.log("SPLIT_DIVIDED_DAMAGE_TARGET_MODEL_EXTRACTION_DIAGNOSIS_COMPLETE");
  });
});
