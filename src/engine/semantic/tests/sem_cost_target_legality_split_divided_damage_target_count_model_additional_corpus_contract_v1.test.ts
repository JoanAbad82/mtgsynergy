import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const CONTRACT_PATH = path.resolve(
  "src/engine/semantic/contract/sem_cost_target_legality_split_divided_damage_target_count_model_additional_corpus_contract_v1.json",
);

type ContractCase = {
  card: string;
  classification: string;
  oracle_text: string;
  expected: {
    should_emit_split_divided_damage_target_model_after_future_extraction: boolean;
    target_count_must_remain_null?: boolean;
    allowed_target_kinds?: string[];
    modal_selection_model?: unknown;
    legality_kinds?: unknown[];
    target_count_model?: {
      kind: string;
      min_targets: number;
      max_targets: number | null;
      is_variable: boolean;
      variable_symbol: string | null;
      requires_damage_allocation: boolean;
      damage_amount_kind: string;
      damage_amount: number | null;
      raw_text: string;
    };
    reason?: string;
    future_model_needed?: string;
  };
};

type Contract = {
  version: string;
  phase: string;
  status: string;
  no_runtime_change: boolean;
  policy: {
    target_count_projection_policy: string;
    costTargetLegalityMin_target_count_must_remain_null: boolean;
    do_not_treat_each_of_up_to_N_as_divided_allocation: boolean;
    do_not_treat_ordered_fixed_multi_target_damage_as_divided_allocation: boolean;
    do_not_treat_even_division_extra_cost_fireball_like_wording_as_current_model: boolean;
  };
  source_audit: {
    discovered_record_count: number;
    candidate_count: number;
    exact_count: number;
    fuzzy_count: number;
    missing_count: number;
    missing: string[];
  };
  cases: ContractCase[];
  final_markers: string[];
};

function readContract(): Contract {
  return JSON.parse(fs.readFileSync(CONTRACT_PATH, "utf8")) as Contract;
}

describe("A2.10 split/divided damage additional corpus contract v1", () => {
  const contract = readContract();

  it("freezes the audit-backed contract metadata without runtime change", () => {
    expect(contract.version).toBe("v1");
    expect(contract.phase).toBe(
      "A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_COUNT_MODEL_ADDITIONAL_CORPUS_CONTRACT_V1",
    );
    expect(contract.status).toBe("contract-freeze");
    expect(contract.no_runtime_change).toBe(true);

    expect(contract.source_audit.discovered_record_count).toBe(34079);
    expect(contract.source_audit.candidate_count).toBe(21);
    expect(contract.source_audit.exact_count).toBe(21);
    expect(contract.source_audit.fuzzy_count).toBe(0);
    expect(contract.source_audit.missing_count).toBe(0);
    expect(contract.source_audit.missing).toEqual([]);

    expect(contract.policy.target_count_projection_policy).toBe("DO_NOT_PROJECT");
    expect(contract.policy.costTargetLegalityMin_target_count_must_remain_null).toBe(true);
    expect(contract.policy.do_not_treat_each_of_up_to_N_as_divided_allocation).toBe(true);
    expect(contract.policy.do_not_treat_ordered_fixed_multi_target_damage_as_divided_allocation).toBe(true);
    expect(contract.policy.do_not_treat_even_division_extra_cost_fireball_like_wording_as_current_model).toBe(true);
  });

  it("freezes all 21 exact Oracle candidates with unique cards", () => {
    expect(contract.cases).toHaveLength(21);

    const names = contract.cases.map((entry) => entry.card);
    expect(new Set(names).size).toBe(21);

    expect(names).toEqual(
      expect.arrayContaining([
        "Electrolyze",
        "Arc Lightning",
        "Flames of the Firebrand",
        "Pyrotechnics",
        "Rolling Thunder",
        "Twin Bolt",
        "Chandra's Pyrohelix",
        "Forked Bolt",
        "Fire // Ice",
        "Magma Opus",
        "Boulderfall",
        "Meteor Shower",
        "Pyrokinesis",
        "Aerial Volley",
        "Fire at Will",
        "Fall of the Titans",
        "Fireball",
        "Arc Trail",
        "Cone of Flame",
        "Comet Storm",
        "Jaya's Immolating Inferno",
      ]),
    );
  });

  it("freezes immediate positive extraction candidates with target_count remaining null", () => {
    const positives = contract.cases.filter(
      (entry) => entry.expected.should_emit_split_divided_damage_target_model_after_future_extraction,
    );

    expect(positives.map((entry) => entry.card)).toEqual([
      "Electrolyze",
      "Arc Lightning",
      "Flames of the Firebrand",
      "Pyrotechnics",
      "Rolling Thunder",
      "Twin Bolt",
      "Chandra's Pyrohelix",
      "Forked Bolt",
      "Fire // Ice",
      "Magma Opus",
      "Boulderfall",
    ]);

    for (const entry of positives) {
      expect(entry.expected.target_count_must_remain_null).toBe(true);
      expect(entry.expected.modal_selection_model).toBeNull();
      expect(entry.expected.legality_kinds).toEqual([]);
      expect(entry.expected.target_count_model).toBeTruthy();
      expect(entry.expected.target_count_model?.requires_damage_allocation).toBe(true);
    }

    expect(
      positives.filter((entry) => entry.expected.target_count_model?.kind === "ONE_OR_TWO_TARGETS").map(
        (entry) => entry.card,
      ),
    ).toEqual(["Electrolyze", "Twin Bolt", "Chandra's Pyrohelix", "Forked Bolt", "Fire // Ice"]);

    expect(
      positives.filter((entry) => entry.expected.target_count_model?.kind === "ONE_TWO_OR_THREE_TARGETS").map(
        (entry) => entry.card,
      ),
    ).toEqual(["Arc Lightning", "Flames of the Firebrand"]);

    expect(
      positives.filter((entry) => entry.expected.target_count_model?.kind === "ANY_NUMBER_OF_TARGETS").map(
        (entry) => entry.card,
      ),
    ).toEqual(["Pyrotechnics", "Rolling Thunder", "Magma Opus", "Boulderfall"]);
  });

  it("defers predicate-bearing and X-plus-one variants instead of overclaiming extraction", () => {
    const deferred = contract.cases.filter((entry) => entry.classification.startsWith("DEFERRED_"));

    expect(deferred.map((entry) => entry.card)).toEqual([
      "Meteor Shower",
      "Pyrokinesis",
      "Aerial Volley",
      "Fire at Will",
    ]);

    for (const entry of deferred) {
      expect(entry.expected.should_emit_split_divided_damage_target_model_after_future_extraction).toBe(false);
      expect(entry.expected.target_count_must_remain_null).toBe(true);
      expect(entry.expected.future_model_needed).toBeTruthy();
    }
  });

  it("freezes negative guardrails for superficially similar non-divided allocation wording", () => {
    const negatives = contract.cases.filter((entry) => entry.classification.startsWith("NEGATIVE_"));

    expect(negatives.map((entry) => entry.card)).toEqual([
      "Fall of the Titans",
      "Fireball",
      "Arc Trail",
      "Cone of Flame",
      "Comet Storm",
      "Jaya's Immolating Inferno",
    ]);

    for (const entry of negatives) {
      expect(entry.expected.should_emit_split_divided_damage_target_model_after_future_extraction).toBe(false);
      expect(entry.expected.reason).toBeTruthy();
    }

    expect(contract.cases.find((entry) => entry.card === "Fall of the Titans")?.oracle_text).toContain(
      "deals X damage to each of up to two targets",
    );
    expect(contract.cases.find((entry) => entry.card === "Fireball")?.oracle_text).toContain(
      "divided evenly, rounded down",
    );
    expect(contract.cases.find((entry) => entry.card === "Comet Storm")?.oracle_text).toContain(
      "Choose any target, then choose another target for each time this spell was kicked",
    );
  });

  it("includes completion markers for the next extraction phase", () => {
    expect(contract.final_markers).toEqual(
      expect.arrayContaining([
        "A2_10_SPLIT_DIVIDED_DAMAGE_TARGET_COUNT_MODEL_ADDITIONAL_CORPUS_CONTRACT_V1_COMPLETE",
        "A2_10_SPLIT_DIVIDED_DAMAGE_TARGET_COUNT_MODEL_ADDITIONAL_CORPUS_CONTRACT_V1_NO_RUNTIME_CHANGE",
        "A2_10_SPLIT_DIVIDED_DAMAGE_TARGET_COUNT_MODEL_ADDITIONAL_CORPUS_CONTRACT_V1_READY_FOR_EXTRACTION",
      ]),
    );
  });
});