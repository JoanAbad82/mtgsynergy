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
};

const here = dirname(fileURLToPath(import.meta.url));
const cardsIndexPath = join(here, "../../../../public/data/cards_index.json.gz");

const POSITIVE_CASES = [
  {
    cardName: "Fire // Ice",
    oracleMustContain: "deals 2 damage divided as you choose among one or two targets",
    expectedModel: {
      kind: "ONE_OR_TWO_TARGETS",
      min_targets: 1,
      max_targets: 2,
      is_variable: false,
      variable_symbol: null,
      requires_damage_allocation: true,
      damage_amount_kind: "FIXED",
      damage_amount: 2,
      raw_text: "2 damage divided as you choose among one or two targets",
    } as const,
  },
  {
    cardName: "Magma Opus",
    oracleMustContain: "deals 4 damage divided as you choose among any number of targets",
    expectedModel: {
      kind: "ANY_NUMBER_OF_TARGETS",
      min_targets: 1,
      max_targets: null,
      is_variable: true,
      variable_symbol: null,
      requires_damage_allocation: true,
      damage_amount_kind: "FIXED",
      damage_amount: 4,
      raw_text: "4 damage divided as you choose among any number of targets",
    } as const,
  },
  {
    cardName: "Boulderfall",
    oracleMustContain: "deals 5 damage divided as you choose among any number of targets",
    expectedModel: {
      kind: "ANY_NUMBER_OF_TARGETS",
      min_targets: 1,
      max_targets: null,
      is_variable: true,
      variable_symbol: null,
      requires_damage_allocation: true,
      damage_amount_kind: "FIXED",
      damage_amount: 5,
      raw_text: "5 damage divided as you choose among any number of targets",
    } as const,
  },
] as const;

const DEFERRED_CASES = [
  {
    cardName: "Pyrokinesis",
    oracleMustContain: "divided as you choose among any number of target creatures",
  },
  {
    cardName: "Aerial Volley",
    oracleMustContain: "divided as you choose among one, two, or three target creatures with flying",
  },
] as const;

const NEGATIVE_CASES = [
  {
    cardName: "Fall of the Titans",
    oracleMustContain: "deals X damage to each of up to two targets",
  },
  {
    cardName: "Arc Trail",
    oracleMustContain: "deals 2 damage to any target and 1 damage to any other target",
  },
  {
    cardName: "Comet Storm",
    oracleMustContain: "Choose any target, then choose another target",
  },
] as const;

const NON_TARGET_DAMAGE_GUARD = {
  cardName: "Earthquake",
  oracleMustContain: "deals X damage to each creature without flying and each player",
} as const;

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

  const oracleText = row.oracle_text ?? "";
  const hints = buildCostTargetLegalityHints(oracleText, row.type_line ?? null);
  const min = hints.costTargetLegalityMin;

  return {
    cardName,
    canonicalName,
    oracleText,
    current_min_exists: Boolean(min),
    current_target_kinds: min ? [...min.target_kinds] : [],
    current_target_count: min ? min.target_count : null,
    current_modal_selection_model: min?.modal_selection_model ? "present" : null,
    current_legality_kinds: min ? [...min.legality_kinds] : [],
    split_divided_damage_target_model:
      (hints.splitDividedDamageTargetModel as SplitDividedDamageTargetModelSnapshot | undefined) ??
      null,
  };
}

describe("cost target legality split divided damage target count model additional corpus extraction v1", () => {
  it("adds narrow real-Oracle edge coverage while preserving A2.10 guardrails", () => {
    const payload = loadCardsIndex();

    const positives = POSITIVE_CASES.map((entry) => ({
      ...entry,
      snapshot: buildSnapshot(payload, entry.cardName),
    }));
    const deferred = DEFERRED_CASES.map((entry) => ({
      ...entry,
      snapshot: buildSnapshot(payload, entry.cardName),
    }));
    const negatives = NEGATIVE_CASES.map((entry) => ({
      ...entry,
      snapshot: buildSnapshot(payload, entry.cardName),
    }));
    const nonTarget = buildSnapshot(payload, NON_TARGET_DAMAGE_GUARD.cardName);

    for (const entry of positives) {
      expect(entry.snapshot.oracleText).toContain(entry.oracleMustContain);
      expect(entry.snapshot.split_divided_damage_target_model).toBeTruthy();
      expect(entry.snapshot.split_divided_damage_target_model?.target_count_model).toEqual(
        entry.expectedModel,
      );

      // Guardrail: preserve ANY_TARGET umbrella for split/divided clause without forcing unrelated target clauses away.
      expect(entry.snapshot.current_target_kinds).toContain("ANY_TARGET");
      expect(entry.snapshot.current_modal_selection_model).toBeNull();
      expect(entry.snapshot.current_legality_kinds).toEqual([]);
      expect(entry.snapshot.split_divided_damage_target_model?.allowed_target_kinds).toEqual([
        "ANY_TARGET",
      ]);

      if (entry.cardName === "Boulderfall") {
        expect(entry.snapshot.current_target_kinds).toEqual(["ANY_TARGET"]);
        expect(entry.snapshot.current_target_count).toBeNull();
      }
      expect(entry.snapshot.split_divided_damage_target_model?.target_count_model?.raw_text).not.toContain(
        "Tap two target permanents",
      );
    }

    for (const entry of deferred) {
      expect(entry.snapshot.oracleText).toContain(entry.oracleMustContain);
      expect(entry.snapshot.split_divided_damage_target_model).toBeTruthy();
      expect(entry.snapshot.split_divided_damage_target_model?.split_damage_model_kind).toBe(
        "UNKNOWN_SPLIT_DIVIDED_DAMAGE_TARGET_MODEL",
      );
      // Guardrail: no over-claim on predicate-bearing target semantics.
      expect(entry.snapshot.split_divided_damage_target_model?.target_count_model).toBeUndefined();
      expect(entry.snapshot.current_modal_selection_model).toBeNull();
    }

    for (const entry of negatives) {
      expect(entry.snapshot.oracleText).toContain(entry.oracleMustContain);
      // Guardrail: do not infer divided model from other multi-target damage patterns.
      expect(entry.snapshot.split_divided_damage_target_model).toBeNull();
      expect(entry.snapshot.current_modal_selection_model).toBeNull();
    }

    expect(nonTarget.oracleText).toContain(NON_TARGET_DAMAGE_GUARD.oracleMustContain);
    // Guardrail: do not invent formal targets from non-target damage text.
    expect(nonTarget.current_min_exists).toBe(false);
    expect(nonTarget.current_target_kinds).toEqual([]);
    expect(nonTarget.current_target_count).toBeNull();
    expect(nonTarget.split_divided_damage_target_model).toBeNull();

    console.log("SPLIT_DIVIDED_DAMAGE_TARGET_COUNT_MODEL_ADDITIONAL_CORPUS_EXTRACTION_V1_COMPLETE");
  });
});
