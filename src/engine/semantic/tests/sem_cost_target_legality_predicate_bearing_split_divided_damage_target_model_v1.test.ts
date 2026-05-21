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

type TargetCountModel = {
  kind: "ONE_OR_TWO_TARGETS" | "ONE_TWO_OR_THREE_TARGETS" | "ANY_NUMBER_OF_TARGETS";
  min_targets: number;
  max_targets: number | null;
  is_variable: boolean;
  variable_symbol: string | null;
  requires_damage_allocation: true;
  damage_amount_kind: "FIXED" | "VARIABLE";
  damage_amount: number | null;
  raw_text: string;
};

type SplitDividedDamageTargetModelSnapshot = {
  kind: "SPLIT_DIVIDED_DAMAGE_TARGET_MODEL";
  split_damage_model_kind:
    | "ONE_OR_TWO_TARGETS"
    | "ONE_TWO_OR_THREE_TARGETS"
    | "ANY_NUMBER_OF_TARGETS"
    | "UNKNOWN_SPLIT_DIVIDED_DAMAGE_TARGET_MODEL";
  allowed_target_kinds?: string[];
  target_count_model?: TargetCountModel;
  target_predicate_kind?: string;
  target_predicate_text?: string;
};

type Snapshot = {
  cardName: string;
  canonicalName: string;
  oracleText: string;
  current_min_exists: boolean;
  current_target_kinds: string[];
  current_target_count: number | null;
  current_modal_selection_model: "present" | null;
  current_legality_kinds: string[];
  split_divided_damage_target_model: SplitDividedDamageTargetModelSnapshot | null;
  split_divided_damage_target_model_in_min: SplitDividedDamageTargetModelSnapshot | null;
};

const here = dirname(fileURLToPath(import.meta.url));
const cardsIndexPath = join(here, "../../../../public/data/cards_index.json.gz");

const PREDICATE_BEARING_CASES = [
  {
    cardName: "Pyrokinesis",
    oracleMustContain: "divided as you choose among any number of target creatures",
    expected: {
      split_damage_model_kind: "ANY_NUMBER_OF_TARGETS",
      allowed_target_kinds: ["CREATURE"],
      target_count_model: {
        kind: "ANY_NUMBER_OF_TARGETS",
        min_targets: 1,
        max_targets: null,
        is_variable: true,
        variable_symbol: null,
        requires_damage_allocation: true,
        damage_amount_kind: "FIXED",
        damage_amount: 4,
        raw_text: "4 damage divided as you choose among any number of target creatures",
      },
      target_predicate_kind: "CREATURE_ONLY",
      target_predicate_text: "target creatures",
    },
  },
  {
    cardName: "Aerial Volley",
    oracleMustContain: "divided as you choose among one, two, or three target creatures with flying",
    expected: {
      split_damage_model_kind: "ONE_TWO_OR_THREE_TARGETS",
      allowed_target_kinds: ["CREATURE"],
      target_count_model: {
        kind: "ONE_TWO_OR_THREE_TARGETS",
        min_targets: 1,
        max_targets: 3,
        is_variable: false,
        variable_symbol: null,
        requires_damage_allocation: true,
        damage_amount_kind: "FIXED",
        damage_amount: 3,
        raw_text: "3 damage divided as you choose among one, two, or three target creatures with flying",
      },
      target_predicate_kind: "WITH_FLYING",
      target_predicate_text: "target creatures with flying",
    },
  },
] as const;

const NEGATIVE_GUARDS = [
  {
    cardName: "Fall of the Titans",
    oracleMustContain: "deals X damage to each of up to two targets",
  },
  {
    cardName: "Arc Trail",
    oracleMustContain: "deals 2 damage to any target and 1 damage to any other target",
  },
  {
    cardName: "Earthquake",
    oracleMustContain: "deals X damage to each creature without flying and each player",
  },
] as const;

const ANY_TARGET_BASELINES = [
  {
    cardName: "Fire // Ice",
    oracleMustContain: "deals 2 damage divided as you choose among one or two targets",
  },
  {
    cardName: "Magma Opus",
    oracleMustContain: "deals 4 damage divided as you choose among any number of targets",
  },
  {
    cardName: "Boulderfall",
    oracleMustContain: "deals 5 damage divided as you choose among any number of targets",
  },
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

function buildSnapshot(payload: CardsIndexPayload, cardName: string): Snapshot {
  const canonicalName = findCanonicalName(payload, cardName);
  if (!canonicalName) {
    throw new Error(`Card not found in local cards index: ${cardName}`);
  }

  const row = payload.by_name?.[canonicalName];
  if (!row) {
    throw new Error(`Missing by_name row for canonical card: ${canonicalName}`);
  }

  const hints = buildCostTargetLegalityHints(row.oracle_text ?? "", row.type_line ?? null);
  const min = hints.costTargetLegalityMin;

  return {
    cardName,
    canonicalName,
    oracleText: row.oracle_text ?? "",
    current_min_exists: Boolean(min),
    current_target_kinds: min ? [...min.target_kinds] : [],
    current_target_count: min ? min.target_count : null,
    current_modal_selection_model: min?.modal_selection_model ? "present" : null,
    current_legality_kinds: min ? [...min.legality_kinds] : [],
    split_divided_damage_target_model:
      (hints.splitDividedDamageTargetModel as SplitDividedDamageTargetModelSnapshot | undefined) ??
      null,
    split_divided_damage_target_model_in_min:
      (min?.split_divided_damage_target_model as SplitDividedDamageTargetModelSnapshot | undefined) ??
      null,
  };
}

describe("cost target legality predicate-bearing split/divided damage target model v1", () => {
  it("adds narrow predicate-bearing split/divided model additively without scalar projection", () => {
    const payload = loadCardsIndex();

    for (const entry of PREDICATE_BEARING_CASES) {
      const row = buildSnapshot(payload, entry.cardName);
      expect(row.oracleText).toContain(entry.oracleMustContain);
      expect(row.split_divided_damage_target_model).toBeTruthy();
      expect(row.split_divided_damage_target_model?.split_damage_model_kind).toBe(
        entry.expected.split_damage_model_kind,
      );
      expect(row.split_divided_damage_target_model?.allowed_target_kinds).toEqual(
        entry.expected.allowed_target_kinds,
      );
      expect(row.split_divided_damage_target_model?.target_count_model).toEqual(
        entry.expected.target_count_model,
      );
      expect(row.split_divided_damage_target_model?.target_predicate_kind).toBe(
        entry.expected.target_predicate_kind,
      );
      expect(row.split_divided_damage_target_model?.target_predicate_text).toBe(
        entry.expected.target_predicate_text,
      );

      expect(row.split_divided_damage_target_model_in_min?.allowed_target_kinds).toEqual(
        entry.expected.allowed_target_kinds,
      );
      // Guardrail: keep existing formal-target scalar behavior from base target detection;
      // do not overwrite it from split/divided target_count_model projection.
      expect(row.current_target_count).toBe(1);
      expect(row.current_modal_selection_model).toBeNull();
      expect(row.current_legality_kinds).toEqual([]);
      expect(row.current_target_kinds).toContain("CREATURE");
      expect(row.current_target_kinds).not.toContain("ANY_TARGET");
    }

    for (const entry of NEGATIVE_GUARDS) {
      const row = buildSnapshot(payload, entry.cardName);
      expect(row.oracleText).toContain(entry.oracleMustContain);
      expect(row.split_divided_damage_target_model).toBeNull();
    }

    for (const entry of ANY_TARGET_BASELINES) {
      const row = buildSnapshot(payload, entry.cardName);
      expect(row.oracleText).toContain(entry.oracleMustContain);
      expect(row.split_divided_damage_target_model).toBeTruthy();
      expect(row.split_divided_damage_target_model?.allowed_target_kinds).toEqual(["ANY_TARGET"]);
      expect(row.current_target_kinds).toContain("ANY_TARGET");
    }

    console.log("PREDICATE_BEARING_SPLIT_DIVIDED_DAMAGE_TARGET_MODEL_V1_COMPLETE");
  });
});
