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
};

type CorpusPolicyRow = {
  card_name: string;
  split_divided_damage_target_model_baseline: Omit<SplitDividedDamageTargetModelSnapshot, "notes">;
  current_runtime_baseline: {
    min_exists: boolean;
    target_kinds: string[];
    target_count: number | null;
    modal_selection_model: null;
    legality_kinds: string[];
  };
  future_target_kind_integration_expectation: {
    explicit_target_kind_evidence_required: boolean;
    explicit_target_kind_evidence_present: boolean;
    candidate_target_kinds: string[];
    derivation_allowed_now: boolean;
    known_gap: string;
  };
};

type Contract = {
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
    source_model_for_future_target_kind_integration: string;
    additive_to_sem_cost_target_legality_min_v1: boolean;
    derived_target_kinds_are_diagnostic_aggregation_only: boolean;
    derived_target_kinds_replace_split_model: boolean;
    derived_target_kinds_replace_target_count: boolean;
    derived_target_kinds_must_not_create_or_modify_modal_selection_model: boolean;
    modal_selection_model_independent_extraction_only: boolean;
    preserve_existing_rings: boolean;
    semantic_migration_requires_explicit_future_phase: boolean;
  };
  split_divided_damage_target_kind_integration_contract: {
    split_model_kind_required: string;
    contract_is_not_extraction_implementation: boolean;
    must_not_widen_runtime_behavior: boolean;
    explicit_evidence_required_for_target_kind_derivation: boolean;
    allowed_target_kind_candidates_when_explicit_evidence_exists: string[];
    forbidden_legality_inference_kinds_from_split_wording: string[];
    forbidden_in_target_or_model_channels: string[];
    unknown_model_fallback: SplitDamageModelKind;
    any_number_targets_policy: string;
    notes: string[];
  };
  initial_corpus_policy: CorpusPolicyRow[];
  no_goals: string[];
};

type RuntimeSnapshot = {
  cardName: string;
  canonicalName: string;
  current_min_exists: boolean;
  current_target_kinds: string[];
  current_target_count: number | null;
  current_modal_selection_model: "present" | null;
  current_legality_kinds: string[];
  split_divided_damage_target_model: SplitDividedDamageTargetModelSnapshot | null;
};

const here = dirname(fileURLToPath(import.meta.url));
const cardsIndexPath = join(here, "../../../../public/data/cards_index.json.gz");
const contractPath = join(
  here,
  "../contract/sem_cost_target_legality_split_divided_damage_target_kind_integration_contract_v1.json",
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

function buildRuntimeSnapshot(payload: CardsIndexPayload, cardName: string): RuntimeSnapshot {
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
  };
}

describe("cost target legality split divided damage target kind integration contract v1", () => {
  it("parses contract invariants for safe target-kind integration planning without runtime widening", () => {
    const contract = loadContract();

    expect(contract.metadata.document_id).toBe(
      "sem_cost_target_legality_split_divided_damage_target_kind_integration_contract_v1",
    );
    expect(contract.metadata.version).toBe("v1");
    expect(contract.metadata.status).toBe("contract-freeze");
    expect(contract.metadata.phase).toBe("A2.10");

    expect(contract.scope_rules.contract_only_no_runtime_change).toBe(true);
    expect(contract.scope_rules.no_parser_changes).toBe(true);
    expect(contract.scope_rules.no_lowering_changes).toBe(true);
    expect(contract.scope_rules.no_service_changes).toBe(true);
    expect(contract.scope_rules.no_ui_cse_scoring_overlay_changes).toBe(true);
    expect(contract.scope_rules.no_public_data_or_package_changes).toBe(true);

    expect(contract.compatibility.source_model_for_future_target_kind_integration).toBe(
      "split_divided_damage_target_model",
    );
    expect(contract.compatibility.additive_to_sem_cost_target_legality_min_v1).toBe(true);
    expect(contract.compatibility.derived_target_kinds_are_diagnostic_aggregation_only).toBe(true);
    expect(contract.compatibility.derived_target_kinds_replace_split_model).toBe(false);
    expect(contract.compatibility.derived_target_kinds_replace_target_count).toBe(false);
    expect(
      contract.compatibility.derived_target_kinds_must_not_create_or_modify_modal_selection_model,
    ).toBe(true);
    expect(contract.compatibility.modal_selection_model_independent_extraction_only).toBe(true);
    expect(contract.compatibility.preserve_existing_rings).toBe(true);
    expect(contract.compatibility.semantic_migration_requires_explicit_future_phase).toBe(true);

    expect(
      contract.split_divided_damage_target_kind_integration_contract.split_model_kind_required,
    ).toBe("SPLIT_DIVIDED_DAMAGE_TARGET_MODEL");
    expect(
      contract.split_divided_damage_target_kind_integration_contract
        .contract_is_not_extraction_implementation,
    ).toBe(true);
    expect(
      contract.split_divided_damage_target_kind_integration_contract.must_not_widen_runtime_behavior,
    ).toBe(true);
    expect(
      contract.split_divided_damage_target_kind_integration_contract
        .explicit_evidence_required_for_target_kind_derivation,
    ).toBe(true);

    expect(
      contract.split_divided_damage_target_kind_integration_contract
        .allowed_target_kind_candidates_when_explicit_evidence_exists,
    ).toEqual(["CREATURE", "PLAYER", "PLANESWALKER", "BATTLE", "ANY_TARGET"]);

    expect(
      contract.split_divided_damage_target_kind_integration_contract
        .forbidden_legality_inference_kinds_from_split_wording,
    ).toEqual([
      "CAST_ONLY_IF",
      "ACTIVATE_ONLY_AS_SORCERY",
      "CONTROLS_X",
      "ATTACKED_THIS_TURN",
      "ONCE_EACH_TURN",
      "OTHER_LEGALITY_TEXT",
    ]);

    expect(
      contract.split_divided_damage_target_kind_integration_contract
        .forbidden_in_target_or_model_channels,
    ).toEqual(["CAST_ONLY_IF", "ACTIVATE_ONLY_AS_SORCERY"]);
    expect(
      contract.split_divided_damage_target_kind_integration_contract.unknown_model_fallback,
    ).toBe("UNKNOWN_SPLIT_DIVIDED_DAMAGE_TARGET_MODEL");
    expect(
      contract.split_divided_damage_target_kind_integration_contract.any_number_targets_policy,
    ).toBe("ANY_NUMBER_OF_TARGETS_MIN_SLOT_IS_CONSERVATIVE_0");
  });

  it("freezes current runtime baseline and safe boundary relative to split_divided_damage_target_model corpus", () => {
    const contract = loadContract();
    const cardsIndex = loadCardsIndex();

    const corpus = contract.initial_corpus_policy.map((row) => row.card_name);
    const runA = corpus.map((name) => buildRuntimeSnapshot(cardsIndex, name));
    const runB = corpus.map((name) => buildRuntimeSnapshot(cardsIndex, name));

    expect(runA).toEqual(runB);

    const byName = new Map(runA.map((row) => [row.cardName, row]));

    for (const row of contract.initial_corpus_policy) {
      const runtime = byName.get(row.card_name);
      expect(runtime).toBeTruthy();
      expect(runtime?.canonicalName.length).toBeGreaterThan(0);

      expect(runtime?.current_min_exists).toBe(row.current_runtime_baseline.min_exists);
      expect(runtime?.current_target_kinds).toEqual(row.current_runtime_baseline.target_kinds);
      expect(runtime?.current_target_count).toBe(row.current_runtime_baseline.target_count);
      expect(runtime?.current_modal_selection_model).toBe(row.current_runtime_baseline.modal_selection_model);
      expect(runtime?.current_legality_kinds).toEqual(row.current_runtime_baseline.legality_kinds);

      expect(runtime?.split_divided_damage_target_model).toBeTruthy();
      expect(runtime?.split_divided_damage_target_model).toMatchObject(
        row.split_divided_damage_target_model_baseline,
      );
      expect((runtime?.split_divided_damage_target_model?.notes ?? "").trim().length).toBeGreaterThan(0);

      // Contract-level freeze: target-kind derivation from split/divided wording is future policy, not runtime widening in this phase.
      expect(
        row.future_target_kind_integration_expectation.explicit_target_kind_evidence_required,
      ).toBe(true);
      expect(
        row.future_target_kind_integration_expectation.explicit_target_kind_evidence_present,
      ).toBe(
        row.card_name === "Pyrokinesis" || row.card_name === "Aerial Volley",
      );
      expect(row.future_target_kind_integration_expectation.derivation_allowed_now).toBe(
        row.card_name === "Pyrokinesis" || row.card_name === "Aerial Volley",
      );
      if (row.card_name === "Pyrokinesis" || row.card_name === "Aerial Volley") {
        expect(row.future_target_kind_integration_expectation.candidate_target_kinds).toEqual([
          "CREATURE",
        ]);
        expect(runtime?.split_divided_damage_target_model?.target_kinds_policy).toBe(
          "NARROW_PREDICATE_BEARING_TARGET_KIND_MODELED",
        );
      } else {
        expect(row.future_target_kind_integration_expectation.candidate_target_kinds).toEqual([]);
      }

      for (const forbidden of contract.split_divided_damage_target_kind_integration_contract
        .forbidden_legality_inference_kinds_from_split_wording) {
        expect(runtime?.current_legality_kinds).not.toContain(forbidden);
      }

      for (const forbidden of contract.split_divided_damage_target_kind_integration_contract
        .forbidden_in_target_or_model_channels) {
        expect(runtime?.current_target_kinds).not.toContain(forbidden);
        expect(JSON.stringify(runtime?.split_divided_damage_target_model)).not.toContain(forbidden);
      }

      console.log(JSON.stringify(runtime));
    }

    console.log("SPLIT_DIVIDED_DAMAGE_TARGET_KIND_INTEGRATION_CONTRACT_V1_COMPLETE");
  });
});
