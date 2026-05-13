import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

type TargetCountModelKind =
  | "ONE_OR_TWO_TARGETS"
  | "ONE_TWO_OR_THREE_TARGETS"
  | "ANY_NUMBER_OF_TARGETS";

type DamageAmountKind = "FIXED" | "VARIABLE";

type TargetCountModel = {
  kind: TargetCountModelKind;
  min_targets: number;
  max_targets: number | null;
  is_variable: boolean;
  variable_symbol: string | null;
  requires_damage_allocation: boolean;
  damage_amount_kind: DamageAmountKind;
  damage_amount: number | null;
  raw_text: string;
};

type ContractCase = {
  card: string;
  oracle_excerpt?: string;
  oracle_pattern?: string;
  expected: {
    split_divided_damage_target_model_exists: boolean;
    allowed_target_kinds: string[];
    cost_target_legality_min: {
      target_kinds: string[];
      target_count: null;
      modal_selection_model: null;
      legality_kinds: string[];
    };
    target_count_model: TargetCountModel;
  };
};

type TargetCountContract = {
  version: string;
  phase: string;
  status: string;
  purpose: string;
  no_runtime_change: boolean;
  policy: {
    keep_costTargetLegalityMin_target_count_null_for_now: boolean;
  };
  guardrails: {
    target_kinds_must_remain_any_target_only: boolean;
    allowed_target_kinds_must_remain_any_target_only: boolean;
    target_count_must_remain_null: boolean;
    modal_selection_model_must_remain_null: boolean;
    legality_kinds_must_remain_empty: boolean;
    do_not_expand_any_target_to_specific_kinds: boolean;
    do_not_leak_legality_or_gate_values_into_target_kinds: boolean;
    forbidden_values: string[];
  };
  cases: ContractCase[];
};

const here = dirname(fileURLToPath(import.meta.url));
const contractPath = join(
  here,
  "../contract/sem_cost_target_legality_split_divided_damage_target_count_model_contract_v1.json",
);

function loadContract(): TargetCountContract {
  return JSON.parse(readFileSync(contractPath, "utf8")) as TargetCountContract;
}

describe("cost target legality split divided damage target count model contract v1", () => {
  it("parses contract metadata, policy and corpus order", () => {
    const contract = loadContract();

    expect(contract.version).toBe("v1");
    expect(contract.phase).toBe(
      "A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_COUNT_MODEL_CONTRACT_V1",
    );
    expect(contract.status).toBe("contract-freeze");
    expect(contract.purpose.length).toBeGreaterThan(0);
    expect(contract.no_runtime_change).toBe(true);

    expect(contract.policy.keep_costTargetLegalityMin_target_count_null_for_now).toBe(true);
    expect(contract.guardrails.target_count_must_remain_null).toBe(true);
    expect(contract.guardrails.modal_selection_model_must_remain_null).toBe(true);
    expect(contract.guardrails.legality_kinds_must_remain_empty).toBe(true);
    expect(contract.guardrails.target_kinds_must_remain_any_target_only).toBe(true);
    expect(contract.guardrails.allowed_target_kinds_must_remain_any_target_only).toBe(true);
    expect(contract.guardrails.do_not_expand_any_target_to_specific_kinds).toBe(true);
    expect(contract.guardrails.do_not_leak_legality_or_gate_values_into_target_kinds).toBe(true);

    expect(contract.guardrails.forbidden_values).toEqual([
      "CAST_ONLY_IF",
      "ACTIVATE_ONLY_AS_SORCERY",
      "CONTROLS_X",
      "ATTACKED_THIS_TURN",
      "ONCE_EACH_TURN",
      "OTHER_LEGALITY_TEXT",
    ]);

    expect(contract.cases).toHaveLength(5);
    expect(contract.cases.map((entry) => entry.card)).toEqual([
      "Electrolyze",
      "Arc Lightning",
      "Flames of the Firebrand",
      "Pyrotechnics",
      "Rolling Thunder",
    ]);
  });

  it("freezes exact target_count_model semantics and conservative channel invariants", () => {
    const contract = loadContract();
    const byCard = new Map(contract.cases.map((entry) => [entry.card, entry]));
    const requiredModelFields = [
      "kind",
      "min_targets",
      "max_targets",
      "is_variable",
      "variable_symbol",
      "requires_damage_allocation",
      "damage_amount_kind",
      "damage_amount",
      "raw_text",
    ];

    for (const row of contract.cases) {
      expect(Boolean(row.oracle_excerpt || row.oracle_pattern)).toBe(true);
      expect(row.expected.split_divided_damage_target_model_exists).toBe(true);

      expect(row.expected.allowed_target_kinds).toEqual(["ANY_TARGET"]);
      expect(row.expected.cost_target_legality_min.target_kinds).toEqual(["ANY_TARGET"]);
      expect(row.expected.cost_target_legality_min.target_count).toBeNull();
      expect(row.expected.cost_target_legality_min.modal_selection_model).toBeNull();
      expect(row.expected.cost_target_legality_min.legality_kinds).toEqual([]);

      const model = row.expected.target_count_model;
      expect(Object.keys(model)).toEqual(requiredModelFields);
      expect(model.requires_damage_allocation).toBe(true);
      expect(model.min_targets).toBeGreaterThan(0);
      expect(model.max_targets === null || model.max_targets >= model.min_targets).toBe(true);
      expect(model.raw_text.trim().length).toBeGreaterThan(0);

      for (const forbidden of contract.guardrails.forbidden_values) {
        expect(row.expected.allowed_target_kinds).not.toContain(forbidden);
        expect(row.expected.cost_target_legality_min.target_kinds).not.toContain(forbidden);
        expect(row.expected.cost_target_legality_min.legality_kinds).not.toContain(forbidden);
      }
    }

    expect(byCard.get("Electrolyze")?.expected.target_count_model).toEqual({
      kind: "ONE_OR_TWO_TARGETS",
      min_targets: 1,
      max_targets: 2,
      is_variable: false,
      variable_symbol: null,
      requires_damage_allocation: true,
      damage_amount_kind: "FIXED",
      damage_amount: 2,
      raw_text: "one or two targets",
    });
    expect(byCard.get("Electrolyze")?.expected.target_count_model.raw_text).toContain(
      "one or two targets",
    );

    expect(byCard.get("Arc Lightning")?.expected.target_count_model).toEqual({
      kind: "ONE_TWO_OR_THREE_TARGETS",
      min_targets: 1,
      max_targets: 3,
      is_variable: false,
      variable_symbol: null,
      requires_damage_allocation: true,
      damage_amount_kind: "FIXED",
      damage_amount: 3,
      raw_text: "one, two, or three targets",
    });
    expect(byCard.get("Arc Lightning")?.expected.target_count_model.raw_text).toContain(
      "one, two, or three targets",
    );

    expect(byCard.get("Flames of the Firebrand")?.expected.target_count_model).toEqual({
      kind: "ONE_TWO_OR_THREE_TARGETS",
      min_targets: 1,
      max_targets: 3,
      is_variable: false,
      variable_symbol: null,
      requires_damage_allocation: true,
      damage_amount_kind: "FIXED",
      damage_amount: 3,
      raw_text: "one, two, or three targets",
    });
    expect(byCard.get("Flames of the Firebrand")?.expected.target_count_model.raw_text).toContain(
      "one, two, or three targets",
    );

    expect(byCard.get("Pyrotechnics")?.expected.target_count_model).toEqual({
      kind: "ANY_NUMBER_OF_TARGETS",
      min_targets: 1,
      max_targets: null,
      is_variable: true,
      variable_symbol: null,
      requires_damage_allocation: true,
      damage_amount_kind: "FIXED",
      damage_amount: 4,
      raw_text: "any number of targets",
    });
    expect(byCard.get("Pyrotechnics")?.expected.target_count_model.raw_text).toContain(
      "any number of targets",
    );

    expect(byCard.get("Rolling Thunder")?.expected.target_count_model).toEqual({
      kind: "ANY_NUMBER_OF_TARGETS",
      min_targets: 1,
      max_targets: null,
      is_variable: true,
      variable_symbol: "X",
      requires_damage_allocation: true,
      damage_amount_kind: "VARIABLE",
      damage_amount: null,
      raw_text: "X damage divided as you choose among any number of targets",
    });
    expect(byCard.get("Rolling Thunder")?.expected.target_count_model.raw_text).toContain("X");
    expect(byCard.get("Rolling Thunder")?.expected.target_count_model.raw_text).toContain(
      "any number of targets",
    );

    console.log("TARGET_COUNT_MODEL_CONTRACT_V1_COMPLETE");
  });
});
