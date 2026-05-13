import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { normalizeCardName } from "../../cards/normalize";
import {
  __testOnlyProjectTargetKindsFromSplitDividedDamageModelMinV1,
  buildCostTargetLegalityHints,
} from "../lowering/lower_to_ability_ir_min_v1";

type CardsIndexPayload = {
  by_name?: Record<string, { oracle_text?: string | null; type_line?: string | null }>;
  by_name_norm?: Record<string, string>;
};

type SplitDamageModelKind =
  | "ONE_OR_TWO_TARGETS"
  | "ONE_TWO_OR_THREE_TARGETS"
  | "ANY_NUMBER_OF_TARGETS"
  | "UNKNOWN_SPLIT_DIVIDED_DAMAGE_TARGET_MODEL";

type SplitDividedDamageTargetModelSnapshot = {
  kind: "SPLIT_DIVIDED_DAMAGE_TARGET_MODEL";
  split_damage_model_kind: SplitDamageModelKind;
  conceptual_target_slots_min: number | null;
  conceptual_target_slots_max: number | null;
  damage_allocation_is_divided: boolean;
  productive_min_hint_currently_models_split_damage: boolean;
  target_kinds_policy: string;
  notes: string;
  known_gap: string | null;
  allowed_target_kinds?: unknown;
  allowedTargetKinds?: unknown;
  target_kinds?: unknown;
  targetKinds?: unknown;
};

type CorpusRow = {
  cardName: string;
  expected_split_damage_model_kind: SplitDamageModelKind;
  current_runtime: {
    current_min_exists: boolean;
    current_target_kinds: string[];
    target_count: number | null;
    modal_selection_model: null;
    legality_kinds: string[];
  };
  source_model_expectation: {
    split_divided_damage_target_model_present: boolean;
    allowed_target_kinds: string[];
    projected_target_kinds_from_model: string[];
  };
  future_emission_contract: {
    may_emit_costTargetLegalityMin_for_target_kinds_only_after_contract_implementation: boolean;
    allowed_future_target_kinds: string[];
    target_count_must_remain_null: boolean;
    modal_selection_model_must_remain_null: boolean;
    legality_kinds_must_remain_empty: boolean;
  };
  any_number_of_targets_policy?: {
    conceptual_target_slots_min: number;
    conceptual_target_slots_max: null;
    target_count: null;
    target_kinds_emission_must_not_invent_target_count: boolean;
  };
};

type Contract = {
  contract_id: string;
  status: string;
  baseline: string;
  source_model: string;
  source_field: string;
  projected_field: string;
  emission_target: string;
  runtime_emission_in_this_phase: boolean;
  target_kinds_is_source_of_truth: boolean;
  allowed_target_kinds_is_structured_source: boolean;
  costTargetLegalityMin_must_not_be_forced_in_this_phase: boolean;
  any_target_policy: {
    any_target_is_canonical_umbrella: boolean;
    any_target_must_not_expand_to: string[];
    future_emitted_target_kinds_requires_any_target_source: boolean;
    future_emitted_target_kinds_when_any_target: string[];
  };
  independent_channels: {
    target_count_remains_independent: boolean;
    modal_selection_model_remains_independent: boolean;
    legality_kinds_remains_independent: boolean;
    legality_gates_remain_independent: boolean;
  };
  forbidden_leakage: string[];
  corpus: CorpusRow[];
  suggested_next_phases: string[];
};

type Snapshot = {
  cardName: string;
  canonicalName: string;
  current_min_exists: boolean;
  current_target_kinds: string[];
  current_target_count: number | null;
  current_modal_selection_model: "present" | null;
  current_legality_kinds: string[];
  split_divided_damage_target_model: SplitDividedDamageTargetModelSnapshot | null;
  model_structured_target_kinds: string[];
  projected_target_kinds_from_model: string[];
};

const here = dirname(fileURLToPath(import.meta.url));
const cardsIndexPath = join(here, "../../../../public/data/cards_index.json.gz");
const contractPath = join(
  here,
  "../contract/sem_cost_target_legality_split_divided_damage_target_kind_integration_target_kinds_emission_contract_v1.json",
);

function loadCardsIndex(): CardsIndexPayload {
  const gz = readFileSync(cardsIndexPath);
  const json = gunzipSync(gz).toString("utf8");
  return JSON.parse(json) as CardsIndexPayload;
}

function loadContract(): Contract {
  return JSON.parse(readFileSync(contractPath, "utf8")) as Contract;
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

function readStructuredAllowedTargetKinds(
  model: SplitDividedDamageTargetModelSnapshot | null,
): string[] {
  if (!model) return [];

  const buckets = [
    model.allowed_target_kinds,
    model.allowedTargetKinds,
    model.target_kinds,
    model.targetKinds,
  ];

  const out: string[] = [];
  for (const candidate of buckets) {
    if (!Array.isArray(candidate)) continue;
    for (const value of candidate) {
      if (typeof value !== "string") continue;
      out.push(value.trim().toUpperCase());
    }
  }
  return Array.from(new Set(out)).sort();
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
  const splitModel =
    (hints.splitDividedDamageTargetModel as SplitDividedDamageTargetModelSnapshot | undefined) ??
    null;

  return {
    cardName,
    canonicalName,
    current_min_exists: Boolean(min),
    current_target_kinds: min ? [...min.target_kinds] : [],
    current_target_count: min ? min.target_count : null,
    current_modal_selection_model: min?.modal_selection_model ? "present" : null,
    current_legality_kinds: min ? [...min.legality_kinds] : [],
    split_divided_damage_target_model: splitModel,
    model_structured_target_kinds: readStructuredAllowedTargetKinds(splitModel),
    projected_target_kinds_from_model:
      __testOnlyProjectTargetKindsFromSplitDividedDamageModelMinV1(splitModel),
  };
}

describe("cost target legality split divided damage target kinds emission contract v1", () => {
  it("parses contract markers and policy freeze", () => {
    const contract = loadContract();

    expect(contract.contract_id).toBe(
      "A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_KIND_INTEGRATION_TARGET_KINDS_EMISSION_CONTRACT_V1",
    );
    expect(contract.status).toBe("contract_only_no_runtime_emission");
    expect(contract.baseline).toBe("94252e9");
    expect(contract.source_model).toBe("split_divided_damage_target_model");
    expect(contract.source_field).toBe("allowed_target_kinds");
    expect(contract.projected_field).toBe("projected_target_kinds_from_model");
    expect(contract.emission_target).toBe("costTargetLegalityMin.target_kinds");

    expect(contract.runtime_emission_in_this_phase).toBe(false);
    expect(contract.target_kinds_is_source_of_truth).toBe(false);
    expect(contract.allowed_target_kinds_is_structured_source).toBe(true);
    expect(contract.costTargetLegalityMin_must_not_be_forced_in_this_phase).toBe(true);

    expect(contract.any_target_policy.any_target_is_canonical_umbrella).toBe(true);
    expect(contract.any_target_policy.any_target_must_not_expand_to).toEqual([
      "CREATURE",
      "PLAYER",
      "PLANESWALKER",
      "BATTLE",
    ]);
    expect(contract.any_target_policy.future_emitted_target_kinds_requires_any_target_source).toBe(
      true,
    );
    expect(contract.any_target_policy.future_emitted_target_kinds_when_any_target).toEqual([
      "ANY_TARGET",
    ]);

    expect(contract.independent_channels.target_count_remains_independent).toBe(true);
    expect(contract.independent_channels.modal_selection_model_remains_independent).toBe(true);
    expect(contract.independent_channels.legality_kinds_remains_independent).toBe(true);
    expect(contract.independent_channels.legality_gates_remain_independent).toBe(true);

    expect(contract.forbidden_leakage).toEqual([
      "CAST_ONLY_IF",
      "ACTIVATE_ONLY_AS_SORCERY",
      "CONTROLS_X",
      "ATTACKED_THIS_TURN",
      "ONCE_EACH_TURN",
      "OTHER_LEGALITY_TEXT",
    ]);

    expect(contract.suggested_next_phases).toEqual([
      "A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_KIND_INTEGRATION_TARGET_KINDS_EMISSION_V1",
      "A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_KIND_INTEGRATION_TARGET_KINDS_EMISSION_GUARDRAIL_RING_V1",
    ]);
  });

  it("freezes real-corpus baseline and future emission contract expectations without runtime widening", () => {
    const contract = loadContract();
    const payload = loadCardsIndex();
    const runA = contract.corpus.map((row) => buildSnapshot(payload, row.cardName));
    const runB = contract.corpus.map((row) => buildSnapshot(payload, row.cardName));

    expect(runA).toEqual(runB);
    const byName = new Map(runA.map((row) => [row.cardName, row]));

    for (const row of contract.corpus) {
      const snapshot = byName.get(row.cardName);
      expect(snapshot).toBeTruthy();
      expect(snapshot?.canonicalName.length).toBeGreaterThan(0);

      expect(snapshot?.split_divided_damage_target_model).toBeTruthy();
      expect(snapshot?.split_divided_damage_target_model?.kind).toBe(
        "SPLIT_DIVIDED_DAMAGE_TARGET_MODEL",
      );
      expect(snapshot?.split_divided_damage_target_model?.split_damage_model_kind).toBe(
        row.expected_split_damage_model_kind,
      );

      expect(snapshot?.current_min_exists).toBe(row.current_runtime.current_min_exists);
      expect(snapshot?.current_target_kinds).toEqual(row.current_runtime.current_target_kinds);
      expect(snapshot?.current_target_count).toBe(row.current_runtime.target_count);
      expect(snapshot?.current_modal_selection_model).toBe(row.current_runtime.modal_selection_model);
      expect(snapshot?.current_legality_kinds).toEqual(row.current_runtime.legality_kinds);

      expect(snapshot?.split_divided_damage_target_model).toBeTruthy();
      expect(snapshot?.model_structured_target_kinds).toEqual(
        row.source_model_expectation.allowed_target_kinds,
      );
      expect(snapshot?.split_divided_damage_target_model?.allowed_target_kinds).toEqual(
        row.source_model_expectation.allowed_target_kinds,
      );
      expect(snapshot?.projected_target_kinds_from_model).toEqual(
        row.source_model_expectation.projected_target_kinds_from_model,
      );

      // ANY_TARGET remains umbrella and must not expand.
      expect(snapshot?.projected_target_kinds_from_model).toEqual(["ANY_TARGET"]);
      expect(snapshot?.projected_target_kinds_from_model).not.toContain("CREATURE");
      expect(snapshot?.projected_target_kinds_from_model).not.toContain("PLAYER");
      expect(snapshot?.projected_target_kinds_from_model).not.toContain("PLANESWALKER");
      expect(snapshot?.projected_target_kinds_from_model).not.toContain("BATTLE");

      for (const forbidden of contract.forbidden_leakage) {
        expect(snapshot?.current_target_kinds).not.toContain(forbidden);
        expect(snapshot?.current_legality_kinds).not.toContain(forbidden);
        expect(JSON.stringify(snapshot?.split_divided_damage_target_model)).not.toContain(forbidden);
      }

      expect(
        row.future_emission_contract
          .may_emit_costTargetLegalityMin_for_target_kinds_only_after_contract_implementation,
      ).toBe(true);
      expect(row.future_emission_contract.allowed_future_target_kinds).toEqual(["ANY_TARGET"]);
      expect(row.future_emission_contract.target_count_must_remain_null).toBe(true);
      expect(row.future_emission_contract.modal_selection_model_must_remain_null).toBe(true);
      expect(row.future_emission_contract.legality_kinds_must_remain_empty).toBe(true);

      if (row.cardName === "Pyrotechnics" || row.cardName === "Rolling Thunder") {
        expect(row.any_number_of_targets_policy).toBeTruthy();
        expect(row.any_number_of_targets_policy?.conceptual_target_slots_min).toBe(0);
        expect(row.any_number_of_targets_policy?.conceptual_target_slots_max).toBeNull();
        expect(row.any_number_of_targets_policy?.target_count).toBeNull();
        expect(row.any_number_of_targets_policy?.target_kinds_emission_must_not_invent_target_count).toBe(
          true,
        );
        expect(snapshot?.split_divided_damage_target_model?.conceptual_target_slots_min).toBe(0);
        expect(snapshot?.split_divided_damage_target_model?.conceptual_target_slots_max).toBeNull();
        expect(snapshot?.current_target_count).toBeNull();
      }

      console.log(JSON.stringify(snapshot));
    }

    console.log("SPLIT_DIVIDED_DAMAGE_TARGET_KINDS_EMISSION_CONTRACT_V1_COMPLETE");
  });
});
