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

type SplitDividedDamageModelKind =
  | "ONE_OR_TWO_TARGETS"
  | "ONE_TWO_OR_THREE_TARGETS"
  | "ANY_NUMBER_OF_TARGETS"
  | "UNKNOWN_SPLIT_DIVIDED_DAMAGE_TARGET_MODEL";

type SplitDividedDamageTargetModelDiagnosis = {
  kind: "SPLIT_DIVIDED_DAMAGE_TARGET_MODEL_DIAGNOSIS";
  split_damage_model_kind: SplitDividedDamageModelKind;
  conceptual_target_slots_min: number | null;
  conceptual_target_slots_max: number | null;
  damage_allocation_is_divided: boolean;
  productive_min_hint_currently_models_split_damage: boolean;
  known_gap: string | null;
};

type SplitDividedDamageDiagnosisSnapshot = {
  cardName: string;
  canonicalName: string;
  type_line: string | null;
  oracle_text: string;
  min_exists: boolean;
  cost_kinds: string[];
  target_kinds: string[];
  legality_kinds: string[];
  target_count: number | null;
  legality_count: number | null;
  modal_selection_model: "present" | null;
  split_divided_damage_diagnosis: SplitDividedDamageTargetModelDiagnosis;
};

const here = dirname(fileURLToPath(import.meta.url));
const cardsIndexPath = join(here, "../../../../public/data/cards_index.json.gz");

const SPLIT_DIVIDED_DAMAGE_CORPUS = [
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

function inferSplitDividedDamageTargetModelDiagnosis(
  oracleText: string,
  productiveMinHintCurrentlyModelsSplitDamage: boolean,
): SplitDividedDamageTargetModelDiagnosis {
  const lower = oracleText.toLowerCase();
  const dividedPattern = "damage divided as you choose among";
  const hasDividedDamagePattern = lower.includes(dividedPattern);

  let split_damage_model_kind: SplitDividedDamageModelKind =
    "UNKNOWN_SPLIT_DIVIDED_DAMAGE_TARGET_MODEL";
  let conceptual_target_slots_min: number | null = null;
  let conceptual_target_slots_max: number | null = null;
  let known_gap: string | null = null;

  if (lower.includes("damage divided as you choose among one or two targets")) {
    split_damage_model_kind = "ONE_OR_TWO_TARGETS";
    conceptual_target_slots_min = 1;
    conceptual_target_slots_max = 2;
  } else if (
    lower.includes("damage divided as you choose among one, two, or three targets")
  ) {
    split_damage_model_kind = "ONE_TWO_OR_THREE_TARGETS";
    conceptual_target_slots_min = 1;
    conceptual_target_slots_max = 3;
  } else if (
    lower.includes("damage divided as you choose among any number of target") &&
    lower.includes("and/or players")
  ) {
    split_damage_model_kind = "ANY_NUMBER_OF_TARGETS";
    conceptual_target_slots_min = 0;
    conceptual_target_slots_max = null;
    known_gap = "ANY_NUMBER_OF_TARGETS_MIN_SLOT_IS_CONSERVATIVE_0";
  } else if (lower.includes("damage divided as you choose among any number of targets")) {
    split_damage_model_kind = "ANY_NUMBER_OF_TARGETS";
    conceptual_target_slots_min = 0;
    conceptual_target_slots_max = null;
    known_gap = "ANY_NUMBER_OF_TARGETS_MIN_SLOT_IS_CONSERVATIVE_0";
  } else {
    known_gap = hasDividedDamagePattern
      ? "UNRECOGNIZED_SPLIT_DIVIDED_DAMAGE_WORDING_PATTERN"
      : "NO_SPLIT_DIVIDED_DAMAGE_WORDING_PATTERN_FOUND";
  }

  if (hasDividedDamagePattern && !productiveMinHintCurrentlyModelsSplitDamage) {
    known_gap = known_gap
      ? `${known_gap};SPLIT_DIVIDED_DAMAGE_UNMODELLED_IN_MIN_HINTS`
      : "SPLIT_DIVIDED_DAMAGE_UNMODELLED_IN_MIN_HINTS";
  }

  return {
    kind: "SPLIT_DIVIDED_DAMAGE_TARGET_MODEL_DIAGNOSIS",
    split_damage_model_kind,
    conceptual_target_slots_min,
    conceptual_target_slots_max,
    damage_allocation_is_divided: hasDividedDamagePattern,
    productive_min_hint_currently_models_split_damage: productiveMinHintCurrentlyModelsSplitDamage,
    known_gap,
  };
}

function buildDiagnosisSnapshot(
  payload: CardsIndexPayload,
  cardName: string,
): SplitDividedDamageDiagnosisSnapshot {
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
  const modalSelectionModel = (min?.modal_selection_model as unknown | undefined) ?? null;
  const productiveMinHintCurrentlyModelsSplitDamage =
    Boolean(min) && Array.isArray(min?.target_kinds) && min.target_kinds.length > 0;
  const splitDividedDamageDiagnosis = inferSplitDividedDamageTargetModelDiagnosis(
    oracleText,
    productiveMinHintCurrentlyModelsSplitDamage,
  );

  return {
    cardName,
    canonicalName,
    type_line: typeLine,
    oracle_text: oracleText,
    min_exists: Boolean(min),
    cost_kinds: min ? [...min.cost_kinds] : [],
    target_kinds: min ? [...min.target_kinds] : [],
    legality_kinds: min ? [...min.legality_kinds] : [],
    target_count: min ? min.target_count : null,
    legality_count: min ? min.legality_count : null,
    modal_selection_model: modalSelectionModel ? "present" : null,
    split_divided_damage_diagnosis: splitDividedDamageDiagnosis,
  };
}

describe("cost target legality split divided damage target model diagnosis v1", () => {
  it("diagnoses split/divided damage target model patterns from real Oracle without productive repair", () => {
    const payload = loadCardsIndex();
    const runA = SPLIT_DIVIDED_DAMAGE_CORPUS.map((cardName) =>
      buildDiagnosisSnapshot(payload, cardName),
    );
    const runB = SPLIT_DIVIDED_DAMAGE_CORPUS.map((cardName) =>
      buildDiagnosisSnapshot(payload, cardName),
    );

    expect(runA).toEqual(runB);

    for (const snapshot of runA) {
      expect(snapshot.canonicalName.length).toBeGreaterThan(0);
      expect(snapshot.oracle_text.trim().length).toBeGreaterThan(0);

      expect(snapshot.split_divided_damage_diagnosis.kind).toBe(
        "SPLIT_DIVIDED_DAMAGE_TARGET_MODEL_DIAGNOSIS",
      );
      expect(snapshot.split_divided_damage_diagnosis.damage_allocation_is_divided).toBe(true);

      expect(snapshot.target_kinds).not.toContain("CAST_ONLY_IF");
      expect(snapshot.target_kinds).not.toContain("ACTIVATE_ONLY_AS_SORCERY");
      const diagnosisSerialized = JSON.stringify(snapshot.split_divided_damage_diagnosis);
      expect(diagnosisSerialized).not.toContain("CAST_ONLY_IF");
      expect(diagnosisSerialized).not.toContain("ACTIVATE_ONLY_AS_SORCERY");

      for (const targetKind of snapshot.target_kinds) {
        expect(snapshot.cost_kinds).not.toContain(targetKind);
        expect(snapshot.legality_kinds).not.toContain(targetKind);
      }

      // This microphase is diagnosis-only and must not inject productive modal_selection_model here.
      expect(snapshot.modal_selection_model).toBeNull();

      console.log(JSON.stringify(snapshot));
    }

    const electrolyze = runA.find((row) => row.cardName === "Electrolyze");
    expect(electrolyze).toBeTruthy();
    expect(electrolyze?.min_exists).toBe(false);
    expect(electrolyze?.target_kinds).toEqual([]);
    expect(electrolyze?.target_count).toBeNull();
    expect(electrolyze?.modal_selection_model).toBeNull();
    expect(electrolyze?.split_divided_damage_diagnosis.split_damage_model_kind).toBe(
      "ONE_OR_TWO_TARGETS",
    );
    expect(electrolyze?.split_divided_damage_diagnosis.conceptual_target_slots_min).toBe(1);
    expect(electrolyze?.split_divided_damage_diagnosis.conceptual_target_slots_max).toBe(2);

    const arcLightning = runA.find((row) => row.cardName === "Arc Lightning");
    expect(arcLightning).toBeTruthy();
    expect(arcLightning?.split_divided_damage_diagnosis.split_damage_model_kind).toBe(
      "ONE_TWO_OR_THREE_TARGETS",
    );
    expect(arcLightning?.split_divided_damage_diagnosis.conceptual_target_slots_min).toBe(1);
    expect(arcLightning?.split_divided_damage_diagnosis.conceptual_target_slots_max).toBe(3);

    const flames = runA.find((row) => row.cardName === "Flames of the Firebrand");
    expect(flames).toBeTruthy();
    expect(flames?.split_divided_damage_diagnosis.split_damage_model_kind).toBe(
      "ONE_TWO_OR_THREE_TARGETS",
    );
    expect(flames?.split_divided_damage_diagnosis.conceptual_target_slots_min).toBe(1);
    expect(flames?.split_divided_damage_diagnosis.conceptual_target_slots_max).toBe(3);

    for (const cardName of ["Pyrotechnics", "Rolling Thunder"] as const) {
      const row = runA.find((snapshot) => snapshot.cardName === cardName);
      expect(row).toBeTruthy();
      expect(row?.split_divided_damage_diagnosis.split_damage_model_kind).toBe(
        "ANY_NUMBER_OF_TARGETS",
      );
      // Conservative diagnosis: wording says "any number of targets", so min target slots is kept at 0.
      expect(row?.split_divided_damage_diagnosis.conceptual_target_slots_min).toBe(0);
      expect(row?.split_divided_damage_diagnosis.conceptual_target_slots_max).toBeNull();
    }

    console.log("SPLIT_DIVIDED_DAMAGE_TARGET_MODEL_DIAGNOSIS_COMPLETE");
  });
});
