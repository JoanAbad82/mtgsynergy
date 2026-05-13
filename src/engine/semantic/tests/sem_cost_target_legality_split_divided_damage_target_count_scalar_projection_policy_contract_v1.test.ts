import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

type TargetCountModelKind =
  | "ONE_OR_TWO_TARGETS"
  | "ONE_TWO_OR_THREE_TARGETS"
  | "ANY_NUMBER_OF_TARGETS";

type DamageAmountKind = "FIXED" | "VARIABLE";

type ContractCase = {
  card: string;
  target_count_model_kind: TargetCountModelKind;
  min_targets: number;
  max_targets: number | null;
  is_variable: boolean;
  variable_symbol: string | null;
  damage_amount_kind: DamageAmountKind;
  damage_amount: number | null;
  expected_channels: {
    allowed_target_kinds: string[];
    target_kinds: string[];
    current_modal_selection_model: null;
    current_legality_kinds: string[];
  };
  scalar_projection: {
    expected_target_count: null;
    policy_result: "DO_NOT_PROJECT";
    reason: string;
    rejected_scalar_values: number[];
  };
};

type Contract = {
  version: string;
  phase: string;
  status: string;
  purpose: string;
  no_runtime_change: boolean;
  policy_name: string;
  policy_summary: string;
  recommended_policy: string;
  rejected_policies: string[];
  exact_only_future_candidate: {
    documented: boolean;
    applies_in_this_contract: boolean;
    conditions: {
      min_targets_equals_max_targets: boolean;
      max_targets_is_number: boolean;
      is_variable_false: boolean;
      target_count_model_kind_not_any_number_of_targets: boolean;
      target_count_model_kind_not_one_or_two_targets: boolean;
      target_count_model_kind_not_one_two_or_three_targets: boolean;
    };
    note: string;
  };
  guardrails: {
    split_divided_damage_target_count_model_remains_canonical: boolean;
    cost_target_legality_min_target_count_remains_null_for_current_corpus: boolean;
    target_kinds_must_remain_any_target_only: boolean;
    allowed_target_kinds_must_remain_any_target_only: boolean;
    modal_selection_model_must_remain_null: boolean;
    legality_kinds_must_remain_empty: boolean;
    any_target_must_not_expand_to_concrete_target_subtypes: boolean;
    no_legality_gate_leakage_into_target_kind_fields: boolean;
    forbidden_legality_or_gate_values: string[];
    forbidden_target_kind_expansion_values: string[];
  };
  cases: ContractCase[];
};

const here = dirname(fileURLToPath(import.meta.url));
const contractPath = join(
  here,
  "../contract/sem_cost_target_legality_split_divided_damage_target_count_scalar_projection_policy_contract_v1.json",
);

function loadContract(): Contract {
  return JSON.parse(readFileSync(contractPath, "utf8")) as Contract;
}

describe("cost target legality split divided damage target count scalar projection policy contract v1", () => {
  it("parses metadata, policy and fixed corpus order", () => {
    const contract = loadContract();

    expect(contract.version).toBe("v1");
    expect(contract.phase).toBe(
      "A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_COUNT_MODEL_SCALAR_PROJECTION_POLICY_CONTRACT_V1",
    );
    expect(contract.status).toBe("contract-freeze");
    expect(contract.no_runtime_change).toBe(true);
    expect(contract.purpose.length).toBeGreaterThan(0);
    expect(contract.recommended_policy).toBe(
      "KEEP_TARGET_COUNT_NULL_FOR_SPLIT_DIVIDED_RANGE_OR_OPEN_ENDED_CASES",
    );

    expect(contract.cases).toHaveLength(5);
    expect(contract.cases.map((entry) => entry.card)).toEqual([
      "Electrolyze",
      "Arc Lightning",
      "Flames of the Firebrand",
      "Pyrotechnics",
      "Rolling Thunder",
    ]);
  });

  it("freezes scalar projection null policy and exact target_count_model metadata", () => {
    const contract = loadContract();
    const byCard = new Map(contract.cases.map((entry) => [entry.card, entry]));

    expect(contract.rejected_policies).toEqual([
      "TARGET_COUNT_EQUALS_MIN_TARGETS",
      "TARGET_COUNT_EQUALS_MAX_TARGETS",
      "TARGET_COUNT_EQUALS_DAMAGE_AMOUNT",
      "TARGET_COUNT_EQUALS_CONCEPTUAL_TARGET_SLOTS_MIN",
      "TARGET_COUNT_EQUALS_CONCEPTUAL_TARGET_SLOTS_MAX",
      "TARGET_COUNT_EQUALS_ZERO_FOR_ANY_NUMBER",
      "TARGET_COUNT_EQUALS_ONE_FOR_ANY_NUMBER",
      "TARGET_COUNT_EQUALS_COMMA_SEPARATED_TARGET_WORDS",
    ]);

    expect(contract.guardrails.split_divided_damage_target_count_model_remains_canonical).toBe(true);
    expect(contract.guardrails.cost_target_legality_min_target_count_remains_null_for_current_corpus).toBe(
      true,
    );
    expect(contract.guardrails.target_kinds_must_remain_any_target_only).toBe(true);
    expect(contract.guardrails.allowed_target_kinds_must_remain_any_target_only).toBe(true);
    expect(contract.guardrails.modal_selection_model_must_remain_null).toBe(true);
    expect(contract.guardrails.legality_kinds_must_remain_empty).toBe(true);
    expect(contract.guardrails.any_target_must_not_expand_to_concrete_target_subtypes).toBe(true);
    expect(contract.guardrails.no_legality_gate_leakage_into_target_kind_fields).toBe(true);

    expect(contract.guardrails.forbidden_legality_or_gate_values).toEqual([
      "CAST_ONLY_IF",
      "ACTIVATE_ONLY_AS_SORCERY",
      "CONTROLS_X",
      "ATTACKED_THIS_TURN",
      "ONCE_EACH_TURN",
      "OTHER_LEGALITY_TEXT",
    ]);
    expect(contract.guardrails.forbidden_target_kind_expansion_values).toEqual([
      "CREATURE",
      "PLAYER",
      "PLANESWALKER",
      "BATTLE",
    ]);

    for (const row of contract.cases) {
      expect(row.scalar_projection.expected_target_count).toBeNull();
      expect(row.scalar_projection.policy_result).toBe("DO_NOT_PROJECT");
      expect(row.expected_channels.allowed_target_kinds).toEqual(["ANY_TARGET"]);
      expect(row.expected_channels.target_kinds).toEqual(["ANY_TARGET"]);
      expect(row.expected_channels.current_modal_selection_model).toBeNull();
      expect(row.expected_channels.current_legality_kinds).toEqual([]);

      for (const forbidden of contract.guardrails.forbidden_legality_or_gate_values) {
        expect(row.expected_channels.allowed_target_kinds).not.toContain(forbidden);
        expect(row.expected_channels.target_kinds).not.toContain(forbidden);
        expect(row.expected_channels.current_legality_kinds).not.toContain(forbidden);
      }
      for (const forbiddenExpansion of contract.guardrails.forbidden_target_kind_expansion_values) {
        expect(row.expected_channels.target_kinds).not.toContain(forbiddenExpansion);
      }
    }

    expect(byCard.get("Electrolyze")).toMatchObject({
      target_count_model_kind: "ONE_OR_TWO_TARGETS",
      min_targets: 1,
      max_targets: 2,
      is_variable: false,
      variable_symbol: null,
      damage_amount_kind: "FIXED",
      damage_amount: 2,
      scalar_projection: {
        expected_target_count: null,
        policy_result: "DO_NOT_PROJECT",
      },
    });
    expect(byCard.get("Electrolyze")?.scalar_projection.reason.toLowerCase()).toContain(
      "range 1..2",
    );
    expect(byCard.get("Electrolyze")?.scalar_projection.rejected_scalar_values).toEqual(
      expect.arrayContaining([1, 2]),
    );

    expect(byCard.get("Arc Lightning")).toMatchObject({
      target_count_model_kind: "ONE_TWO_OR_THREE_TARGETS",
      min_targets: 1,
      max_targets: 3,
      is_variable: false,
      variable_symbol: null,
      damage_amount_kind: "FIXED",
      damage_amount: 3,
    });
    expect(byCard.get("Arc Lightning")?.scalar_projection.reason.toLowerCase()).toContain(
      "range 1..3",
    );
    expect(byCard.get("Arc Lightning")?.scalar_projection.rejected_scalar_values).toEqual(
      expect.arrayContaining([1, 3]),
    );

    expect(byCard.get("Flames of the Firebrand")).toMatchObject({
      target_count_model_kind: "ONE_TWO_OR_THREE_TARGETS",
      min_targets: 1,
      max_targets: 3,
      is_variable: false,
      variable_symbol: null,
      damage_amount_kind: "FIXED",
      damage_amount: 3,
    });
    expect(byCard.get("Flames of the Firebrand")?.scalar_projection.reason.toLowerCase()).toContain(
      "range 1..3",
    );
    expect(byCard.get("Flames of the Firebrand")?.scalar_projection.rejected_scalar_values).toEqual(
      expect.arrayContaining([1, 3]),
    );

    expect(byCard.get("Pyrotechnics")).toMatchObject({
      target_count_model_kind: "ANY_NUMBER_OF_TARGETS",
      min_targets: 1,
      max_targets: null,
      is_variable: true,
      variable_symbol: null,
      damage_amount_kind: "FIXED",
      damage_amount: 4,
    });
    expect(byCard.get("Pyrotechnics")?.scalar_projection.reason.toLowerCase()).toContain(
      "open-ended range",
    );
    expect(byCard.get("Pyrotechnics")?.scalar_projection.rejected_scalar_values).toEqual(
      expect.arrayContaining([0, 1, 4]),
    );

    expect(byCard.get("Rolling Thunder")).toMatchObject({
      target_count_model_kind: "ANY_NUMBER_OF_TARGETS",
      min_targets: 1,
      max_targets: null,
      is_variable: true,
      variable_symbol: "X",
      damage_amount_kind: "VARIABLE",
      damage_amount: null,
    });
    expect(byCard.get("Rolling Thunder")?.scalar_projection.reason.toLowerCase()).toContain(
      "open-ended range",
    );
    expect(byCard.get("Rolling Thunder")?.scalar_projection.reason.toLowerCase()).toContain(
      "variable x damage",
    );
    expect(byCard.get("Rolling Thunder")?.scalar_projection.rejected_scalar_values).toEqual(
      expect.arrayContaining([0, 1]),
    );

    expect(contract.exact_only_future_candidate.documented).toBe(true);
    expect(contract.exact_only_future_candidate.applies_in_this_contract).toBe(false);
    expect(contract.exact_only_future_candidate.conditions).toEqual({
      min_targets_equals_max_targets: true,
      max_targets_is_number: true,
      is_variable_false: true,
      target_count_model_kind_not_any_number_of_targets: true,
      target_count_model_kind_not_one_or_two_targets: true,
      target_count_model_kind_not_one_two_or_three_targets: true,
    });
    expect(contract.exact_only_future_candidate.note.length).toBeGreaterThan(0);

    const exactOnlyAppliesToRow = (row: ContractCase): boolean =>
      row.max_targets !== null &&
      row.min_targets === row.max_targets &&
      !row.is_variable &&
      row.target_count_model_kind !== "ANY_NUMBER_OF_TARGETS" &&
      row.target_count_model_kind !== "ONE_OR_TWO_TARGETS" &&
      row.target_count_model_kind !== "ONE_TWO_OR_THREE_TARGETS";

    for (const row of contract.cases) {
      expect(exactOnlyAppliesToRow(row)).toBe(false);
    }

    console.log("TARGET_COUNT_SCALAR_PROJECTION_POLICY_CONTRACT_V1_COMPLETE");
  });
});
