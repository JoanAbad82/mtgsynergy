import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

type ModeSelectionKind =
  | "CHOOSE_ONE"
  | "CHOOSE_TWO"
  | "CHOOSE_ONE_OR_MORE"
  | "SPLIT_DIVIDED_DAMAGE_NON_MODAL"
  | "UNKNOWN_MODAL_SELECTION";

type ModalSelectionContractRow = {
  card_name: string;
  kind: string;
  mode_selection_kind: ModeSelectionKind;
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

type BaselineRow = {
  card_name: string;
  min_exists: boolean;
  target_kinds: string[];
  target_count: number | null;
};

type ModalSelectionModelContractV1 = {
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
    no_ui_cse_scoring_overlay_changes: boolean;
    no_public_data_or_package_changes: boolean;
  };
  compatibility: {
    additive_to_sem_cost_target_legality_min_v1: boolean;
    replaces_target_kinds: boolean;
    replaces_target_count: boolean;
    target_kinds_remain_diagnostic_aggregation: boolean;
    target_count_remains_diagnostic_aggregation: boolean;
    preserve_existing_rings: boolean;
    semantic_migration_requires_explicit_future_phase: boolean;
  };
  integration_dependencies: {
    requires_ui_changes: boolean;
    requires_cse_changes: boolean;
    requires_scoring_changes: boolean;
    requires_overlay_changes: boolean;
  };
  fallback_policy: {
    unknown_mode_selection_kind: ModeSelectionKind;
    allow_known_gap: boolean;
    must_not_break_output: boolean;
  };
  modal_selection_model_contract: {
    field_order: string[];
    required_fields: string[];
    mode_selection_kind_enum: ModeSelectionKind[];
    split_divided_damage_separate_from_modal_normal: boolean;
    unknown_modal_selection_fallback_required: boolean;
    total_function_fallback_required: boolean;
    forbidden_in_aggregated_target_kinds: string[];
    notes: string[];
  };
  initial_contract_corpus: ModalSelectionContractRow[];
  current_aggregated_baseline: BaselineRow[];
  no_goals: string[];
};

const here = dirname(fileURLToPath(import.meta.url));
const contractPath = join(
  here,
  "../contract/sem_cost_target_legality_modal_target_selection_model_contract_v1.json",
);

function loadJson<T>(path: string): T {
  const raw = readFileSync(path, "utf8");
  return JSON.parse(raw) as T;
}

function expectIncludesAll(haystack: string[], required: string[]) {
  for (const item of required) {
    expect(haystack).toContain(item);
  }
}

describe("cost target legality modal target selection model contract v1", () => {
  it("parses and freezes the additive modal_selection_model contract shape", () => {
    const contract = loadJson<ModalSelectionModelContractV1>(contractPath);

    expect(contract.metadata.document_id).toBe(
      "sem_cost_target_legality_modal_target_selection_model_contract_v1",
    );
    expect(contract.metadata.version).toBe("v1");
    expect(contract.compatibility.additive_to_sem_cost_target_legality_min_v1).toBe(true);
    expect(contract.compatibility.replaces_target_kinds).toBe(false);
    expect(contract.compatibility.replaces_target_count).toBe(false);
    expect(contract.compatibility.target_kinds_remain_diagnostic_aggregation).toBe(true);
    expect(contract.compatibility.target_count_remains_diagnostic_aggregation).toBe(true);
    expect(contract.compatibility.preserve_existing_rings).toBe(true);

    expect(contract.scope_rules.contract_only_no_runtime_change).toBe(true);
    expect(contract.scope_rules.no_parser_changes).toBe(true);
    expect(contract.scope_rules.no_lowering_changes).toBe(true);
    expect(contract.scope_rules.no_service_changes).toBe(true);
    expect(contract.scope_rules.no_ui_cse_scoring_overlay_changes).toBe(true);
    expect(contract.scope_rules.no_public_data_or_package_changes).toBe(true);

    expect(contract.integration_dependencies.requires_ui_changes).toBe(false);
    expect(contract.integration_dependencies.requires_cse_changes).toBe(false);
    expect(contract.integration_dependencies.requires_scoring_changes).toBe(false);
    expect(contract.integration_dependencies.requires_overlay_changes).toBe(false);

    expect(contract.fallback_policy.unknown_mode_selection_kind).toBe("UNKNOWN_MODAL_SELECTION");
    expect(contract.fallback_policy.allow_known_gap).toBe(true);
    expect(contract.fallback_policy.must_not_break_output).toBe(true);

    const requiredFields = [
      "kind",
      "mode_selection_kind",
      "selected_modes_min",
      "selected_modes_max",
      "modes_total",
      "targeted_modes_count",
      "conceptual_target_slots_min",
      "conceptual_target_slots_max",
      "aggregated_target_kinds",
      "notes",
      "known_gap",
    ];
    expectIncludesAll(contract.modal_selection_model_contract.required_fields, requiredFields);
    expect(contract.modal_selection_model_contract.field_order).toEqual(requiredFields);

    const modeEnum = contract.modal_selection_model_contract.mode_selection_kind_enum;
    expect(modeEnum).toEqual([
      "CHOOSE_ONE",
      "CHOOSE_TWO",
      "CHOOSE_ONE_OR_MORE",
      "SPLIT_DIVIDED_DAMAGE_NON_MODAL",
      "UNKNOWN_MODAL_SELECTION",
    ]);
    expect(contract.modal_selection_model_contract.split_divided_damage_separate_from_modal_normal).toBe(true);
    expect(contract.modal_selection_model_contract.unknown_modal_selection_fallback_required).toBe(true);
    expect(contract.modal_selection_model_contract.total_function_fallback_required).toBe(true);
    expect(contract.modal_selection_model_contract.forbidden_in_aggregated_target_kinds).toEqual([
      "CAST_ONLY_IF",
      "ACTIVATE_ONLY_AS_SORCERY",
    ]);
  });

  it("contains the required corpus and preserves modal/split separation and no-leakage policy", () => {
    const contract = loadJson<ModalSelectionModelContractV1>(contractPath);
    const byName = new Map(contract.initial_contract_corpus.map((row) => [row.card_name, row]));
    const baselineByName = new Map(contract.current_aggregated_baseline.map((row) => [row.card_name, row]));

    const abrade = byName.get("Abrade");
    expect(abrade).toBeTruthy();
    expect(abrade?.mode_selection_kind).toBe("CHOOSE_ONE");
    expect(abrade?.conceptual_target_slots_min).toBe(1);
    expect(abrade?.conceptual_target_slots_max).toBe(1);

    const kolaghan = byName.get("Kolaghan's Command");
    expect(kolaghan).toBeTruthy();
    expect(kolaghan?.mode_selection_kind).toBe("CHOOSE_TWO");
    expect(kolaghan?.conceptual_target_slots_min).toBe(2);
    expect(kolaghan?.conceptual_target_slots_max).toBe(2);

    const cryptic = byName.get("Cryptic Command");
    expect(cryptic).toBeTruthy();
    expect(cryptic?.mode_selection_kind).toBe("CHOOSE_TWO");
    expect(cryptic?.conceptual_target_slots_min).toBe(0);
    expect(cryptic?.conceptual_target_slots_max).toBe(2);

    const prismari = byName.get("Prismari Command");
    expect(prismari).toBeTruthy();
    expect(prismari?.mode_selection_kind).toBe("CHOOSE_TWO");
    expect(prismari?.conceptual_target_slots_min).toBe(2);
    expect(prismari?.conceptual_target_slots_max).toBe(2);

    const casualties = byName.get("Casualties of War");
    expect(casualties).toBeTruthy();
    expect(casualties?.mode_selection_kind).toBe("CHOOSE_ONE_OR_MORE");
    expect(casualties?.conceptual_target_slots_min).toBe(1);
    expect(casualties?.conceptual_target_slots_max).toBe(5);

    const electrolyze = byName.get("Electrolyze");
    expect(electrolyze).toBeTruthy();
    expect(electrolyze?.mode_selection_kind).toBe("SPLIT_DIVIDED_DAMAGE_NON_MODAL");
    expect(electrolyze?.conceptual_target_slots_min).toBe(1);
    expect(electrolyze?.conceptual_target_slots_max).toBe(2);

    expect(baselineByName.get("Abrade")).toMatchObject({
      min_exists: true,
      target_kinds: ["ARTIFACT", "CREATURE"],
      target_count: 2,
    });
    expect(baselineByName.get("Kolaghan's Command")).toMatchObject({
      min_exists: true,
      target_kinds: ["ANY_TARGET", "ARTIFACT", "CREATURE", "PLAYER"],
      target_count: 4,
    });
    expect(baselineByName.get("Cryptic Command")).toMatchObject({
      min_exists: true,
      target_kinds: ["PERMANENT", "UNKNOWN_TARGET_KIND"],
      target_count: 2,
    });
    expect(baselineByName.get("Prismari Command")).toMatchObject({
      min_exists: true,
      target_kinds: ["ANY_TARGET", "ARTIFACT", "PLAYER"],
      target_count: 4,
    });
    expect(baselineByName.get("Casualties of War")).toMatchObject({
      min_exists: true,
      target_kinds: ["ARTIFACT", "CREATURE", "LAND", "UNKNOWN_TARGET_KIND"],
      target_count: 5,
    });
    expect(baselineByName.get("Electrolyze")).toMatchObject({
      min_exists: false,
      target_kinds: [],
      target_count: null,
    });

    const forbiddenInTargetOrModelChannels = ["CAST_ONLY_IF", "ACTIVATE_ONLY_AS_SORCERY"];
    for (const row of contract.initial_contract_corpus) {
      for (const forbidden of forbiddenInTargetOrModelChannels) {
        expect(row.aggregated_target_kinds).not.toContain(forbidden);
      }
    }
    for (const row of contract.current_aggregated_baseline) {
      for (const forbidden of forbiddenInTargetOrModelChannels) {
        expect(row.target_kinds).not.toContain(forbidden);
      }
    }
  });
});
