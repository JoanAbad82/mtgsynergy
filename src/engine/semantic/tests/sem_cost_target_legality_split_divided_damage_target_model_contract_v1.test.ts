import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

type SplitDamageModelKind =
  | "ONE_OR_TWO_TARGETS"
  | "ONE_TWO_OR_THREE_TARGETS"
  | "ANY_NUMBER_OF_TARGETS"
  | "UNKNOWN_SPLIT_DIVIDED_DAMAGE_TARGET_MODEL";

type ContractRow = {
  card_name: string;
  kind: "SPLIT_DIVIDED_DAMAGE_TARGET_MODEL";
  split_damage_model_kind: SplitDamageModelKind;
  conceptual_target_slots_min: number | null;
  conceptual_target_slots_max: number | null;
  damage_allocation_is_divided: boolean;
  productive_min_hint_currently_models_split_damage: boolean;
  target_kinds_policy: string;
  notes: string;
  known_gap: string | null;
};

type CurrentMinHintBaselineRow = {
  card_name: string;
  min_exists: boolean;
  target_kinds: string[];
  target_count: number | null;
  modal_selection_model: null;
};

type SplitDividedDamageTargetModelContractV1 = {
  metadata: {
    document_id: string;
    version: string;
    status: string;
    phase: string;
    scope: string;
  };
  scope_rules: {
    contract_only_no_runtime_change: boolean;
    no_parser_changes: boolean;
    no_lowering_changes: boolean;
    no_service_changes: boolean;
    no_modal_selection_model_changes: boolean;
    no_ui_cse_scoring_overlay_changes: boolean;
    no_public_data_or_package_changes: boolean;
  };
  compatibility: {
    additive_to_sem_cost_target_legality_min_v1: boolean;
    replaces_target_kinds: boolean;
    replaces_target_count: boolean;
    target_kinds_remain_diagnostic_aggregation: boolean;
    target_count_remains_diagnostic_aggregation: boolean;
    separate_from_modal_selection_model: boolean;
    preserve_existing_rings: boolean;
    semantic_migration_requires_explicit_future_phase: boolean;
  };
  integration_dependencies: {
    requires_ui_changes: boolean;
    requires_cse_changes: boolean;
    requires_scoring_changes: boolean;
    requires_overlay_changes: boolean;
    requires_modal_selection_model_changes: boolean;
  };
  fallback_policy: {
    unknown_split_damage_model_kind: SplitDamageModelKind;
    allow_known_gap: boolean;
    must_not_break_output: boolean;
  };
  split_divided_damage_target_model_contract: {
    required_fields: string[];
    field_order: string[];
    split_damage_model_kind_enum: SplitDamageModelKind[];
    forbidden_in_target_or_model_channels: string[];
    notes: string[];
  };
  initial_contract_corpus: ContractRow[];
  current_min_hint_baseline: CurrentMinHintBaselineRow[];
  no_goals: string[];
};

const here = dirname(fileURLToPath(import.meta.url));
const contractPath = join(
  here,
  "../contract/sem_cost_target_legality_split_divided_damage_target_model_contract_v1.json",
);

function loadJson<T>(path: string): T {
  const raw = readFileSync(path, "utf8");
  return JSON.parse(raw) as T;
}

describe("cost target legality split divided damage target model contract v1", () => {
  it("parses and freezes the additive split_divided_damage_target_model contract shape", () => {
    const contract = loadJson<SplitDividedDamageTargetModelContractV1>(contractPath);

    expect(contract.metadata.document_id).toBe(
      "sem_cost_target_legality_split_divided_damage_target_model_contract_v1",
    );
    expect(contract.metadata.version).toBe("v1");
    expect(contract.metadata.status).toBe("contract-freeze");
    expect(contract.metadata.phase).toBe("A2.10");

    expect(contract.scope_rules.contract_only_no_runtime_change).toBe(true);
    expect(contract.scope_rules.no_parser_changes).toBe(true);
    expect(contract.scope_rules.no_lowering_changes).toBe(true);
    expect(contract.scope_rules.no_service_changes).toBe(true);
    expect(contract.scope_rules.no_modal_selection_model_changes).toBe(true);
    expect(contract.scope_rules.no_ui_cse_scoring_overlay_changes).toBe(true);
    expect(contract.scope_rules.no_public_data_or_package_changes).toBe(true);

    expect(contract.compatibility.additive_to_sem_cost_target_legality_min_v1).toBe(true);
    expect(contract.compatibility.replaces_target_kinds).toBe(false);
    expect(contract.compatibility.replaces_target_count).toBe(false);
    expect(contract.compatibility.target_kinds_remain_diagnostic_aggregation).toBe(true);
    expect(contract.compatibility.target_count_remains_diagnostic_aggregation).toBe(true);
    expect(contract.compatibility.separate_from_modal_selection_model).toBe(true);
    expect(contract.compatibility.preserve_existing_rings).toBe(true);
    expect(contract.compatibility.semantic_migration_requires_explicit_future_phase).toBe(true);

    expect(contract.integration_dependencies.requires_ui_changes).toBe(false);
    expect(contract.integration_dependencies.requires_cse_changes).toBe(false);
    expect(contract.integration_dependencies.requires_scoring_changes).toBe(false);
    expect(contract.integration_dependencies.requires_overlay_changes).toBe(false);
    expect(contract.integration_dependencies.requires_modal_selection_model_changes).toBe(false);

    expect(contract.fallback_policy.unknown_split_damage_model_kind).toBe(
      "UNKNOWN_SPLIT_DIVIDED_DAMAGE_TARGET_MODEL",
    );
    expect(contract.fallback_policy.allow_known_gap).toBe(true);
    expect(contract.fallback_policy.must_not_break_output).toBe(true);

    const expectedFields = [
      "kind",
      "split_damage_model_kind",
      "conceptual_target_slots_min",
      "conceptual_target_slots_max",
      "damage_allocation_is_divided",
      "productive_min_hint_currently_models_split_damage",
      "target_kinds_policy",
      "notes",
      "known_gap",
    ];
    expect(contract.split_divided_damage_target_model_contract.required_fields).toEqual(
      expectedFields,
    );
    expect(contract.split_divided_damage_target_model_contract.field_order).toEqual(expectedFields);
    expect(contract.split_divided_damage_target_model_contract.split_damage_model_kind_enum).toEqual(
      [
        "ONE_OR_TWO_TARGETS",
        "ONE_TWO_OR_THREE_TARGETS",
        "ANY_NUMBER_OF_TARGETS",
        "UNKNOWN_SPLIT_DIVIDED_DAMAGE_TARGET_MODEL",
      ],
    );
    expect(contract.split_divided_damage_target_model_contract.forbidden_in_target_or_model_channels).toEqual(
      ["CAST_ONLY_IF", "ACTIVATE_ONLY_AS_SORCERY"],
    );
  });

  it("freezes corpus, baseline and no-leakage policy without runtime dependencies", () => {
    const contract = loadJson<SplitDividedDamageTargetModelContractV1>(contractPath);
    const byName = new Map(contract.initial_contract_corpus.map((row) => [row.card_name, row]));
    const baselineByName = new Map(
      contract.current_min_hint_baseline.map((row) => [row.card_name, row]),
    );

    expect(contract.initial_contract_corpus).toHaveLength(5);
    expect(byName.has("Electrolyze")).toBe(true);
    expect(byName.has("Arc Lightning")).toBe(true);
    expect(byName.has("Flames of the Firebrand")).toBe(true);
    expect(byName.has("Pyrotechnics")).toBe(true);
    expect(byName.has("Rolling Thunder")).toBe(true);

    expect(byName.get("Electrolyze")).toMatchObject({
      kind: "SPLIT_DIVIDED_DAMAGE_TARGET_MODEL",
      split_damage_model_kind: "ONE_OR_TWO_TARGETS",
      conceptual_target_slots_min: 1,
      conceptual_target_slots_max: 2,
      damage_allocation_is_divided: true,
      productive_min_hint_currently_models_split_damage: false,
      target_kinds_policy: "CURRENTLY_UNMODELLED_EMPTY_TARGET_KINDS",
      known_gap: "SPLIT_DIVIDED_DAMAGE_UNMODELLED_IN_MIN_HINTS",
    });

    expect(byName.get("Arc Lightning")).toMatchObject({
      split_damage_model_kind: "ONE_TWO_OR_THREE_TARGETS",
      conceptual_target_slots_min: 1,
      conceptual_target_slots_max: 3,
      target_kinds_policy: "CURRENTLY_UNMODELLED_EMPTY_TARGET_KINDS",
      known_gap: "SPLIT_DIVIDED_DAMAGE_UNMODELLED_IN_MIN_HINTS",
    });

    expect(byName.get("Flames of the Firebrand")).toMatchObject({
      split_damage_model_kind: "ONE_TWO_OR_THREE_TARGETS",
      conceptual_target_slots_min: 1,
      conceptual_target_slots_max: 3,
      target_kinds_policy: "CURRENTLY_UNMODELLED_EMPTY_TARGET_KINDS",
      known_gap: "SPLIT_DIVIDED_DAMAGE_UNMODELLED_IN_MIN_HINTS",
    });

    expect(byName.get("Pyrotechnics")).toMatchObject({
      split_damage_model_kind: "ANY_NUMBER_OF_TARGETS",
      conceptual_target_slots_min: 0,
      conceptual_target_slots_max: null,
      target_kinds_policy: "CURRENTLY_UNMODELLED_EMPTY_TARGET_KINDS",
      known_gap:
        "ANY_NUMBER_OF_TARGETS_MIN_SLOT_IS_CONSERVATIVE_0;SPLIT_DIVIDED_DAMAGE_UNMODELLED_IN_MIN_HINTS",
    });

    expect(byName.get("Rolling Thunder")).toMatchObject({
      split_damage_model_kind: "ANY_NUMBER_OF_TARGETS",
      conceptual_target_slots_min: 0,
      conceptual_target_slots_max: null,
      target_kinds_policy: "CURRENTLY_UNMODELLED_EMPTY_TARGET_KINDS",
      known_gap:
        "ANY_NUMBER_OF_TARGETS_MIN_SLOT_IS_CONSERVATIVE_0;SPLIT_DIVIDED_DAMAGE_UNMODELLED_IN_MIN_HINTS",
    });

    for (const row of contract.current_min_hint_baseline) {
      expect(row).toMatchObject({
        min_exists: false,
        target_kinds: [],
        target_count: null,
        modal_selection_model: null,
      });
      expect(row.target_kinds).not.toContain("CAST_ONLY_IF");
      expect(row.target_kinds).not.toContain("ACTIVATE_ONLY_AS_SORCERY");
    }

    for (const row of contract.initial_contract_corpus) {
      const serialized = JSON.stringify(row);
      expect(serialized).not.toContain("CAST_ONLY_IF");
      expect(serialized).not.toContain("ACTIVATE_ONLY_AS_SORCERY");
    }

    expect(contract.compatibility.separate_from_modal_selection_model).toBe(true);

    console.log("SPLIT_DIVIDED_DAMAGE_TARGET_MODEL_CONTRACT_V1_COMPLETE");
  });
});
