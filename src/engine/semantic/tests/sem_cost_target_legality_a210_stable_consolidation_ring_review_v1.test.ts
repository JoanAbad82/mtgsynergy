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

type SplitModel = {
  kind: "SPLIT_DIVIDED_DAMAGE_TARGET_MODEL";
  split_damage_model_kind:
    | "ONE_OR_TWO_TARGETS"
    | "ONE_TWO_OR_THREE_TARGETS"
    | "ANY_NUMBER_OF_TARGETS"
    | "UNKNOWN_SPLIT_DIVIDED_DAMAGE_TARGET_MODEL";
  allowed_target_kinds?: string[];
  target_count_model?: {
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
  target_predicate_kind?: string;
  target_predicate_text?: string;
  target_kinds_policy?: string;
};

type Snapshot = {
  cardName: string;
  canonicalName: string;
  current_target_kinds: string[];
  current_target_count: number | null;
  current_modal_selection_model: "present" | null;
  current_legality_kinds: string[];
  split_divided_damage_target_model: SplitModel | null;
};

const here = dirname(fileURLToPath(import.meta.url));
const cardsIndexPath = join(here, "../../../../public/data/cards_index.json.gz");
const additionalCorpusContractPath = join(
  here,
  "../contract/sem_cost_target_legality_split_divided_damage_target_count_model_additional_corpus_contract_v1.json",
);
const integrationContractPath = join(
  here,
  "../contract/sem_cost_target_legality_split_divided_damage_target_kind_integration_contract_v1.json",
);
const scalarPolicyContractPath = join(
  here,
  "../contract/sem_cost_target_legality_split_divided_damage_target_count_scalar_projection_policy_contract_v1.json",
);

function loadCardsIndex(): CardsIndexPayload {
  const gz = readFileSync(cardsIndexPath);
  return JSON.parse(gunzipSync(gz).toString("utf8")) as CardsIndexPayload;
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
  if (!canonicalName) throw new Error(`Card not found in local cards index: ${cardName}`);
  const row = payload.by_name?.[canonicalName];
  if (!row) throw new Error(`Missing by_name row for canonical card: ${canonicalName}`);

  const hints = buildCostTargetLegalityHints(row.oracle_text ?? "", row.type_line ?? null);
  const min = hints.costTargetLegalityMin;

  return {
    cardName,
    canonicalName,
    current_target_kinds: min ? [...min.target_kinds] : [],
    current_target_count: min ? min.target_count : null,
    current_modal_selection_model: min?.modal_selection_model ? "present" : null,
    current_legality_kinds: min ? [...min.legality_kinds] : [],
    split_divided_damage_target_model:
      (hints.splitDividedDamageTargetModel as SplitModel | undefined) ?? null,
  };
}

describe("A2.10 cost target legality stable consolidation ring review v1", () => {
  it("keeps contracts coherent with narrow predicate-bearing split/divided runtime exception", () => {
    const additionalCorpusContract = JSON.parse(
      readFileSync(additionalCorpusContractPath, "utf8"),
    ) as {
      phase: string;
      status: string;
      no_runtime_change: boolean;
      cases: Array<{ card: string; classification: string }>;
    };
    const integrationContract = JSON.parse(readFileSync(integrationContractPath, "utf8")) as {
      compatibility: {
        derived_target_kinds_replace_split_model: boolean;
        derived_target_kinds_replace_target_count: boolean;
        derived_target_kinds_must_not_create_or_modify_modal_selection_model: boolean;
      };
      split_divided_damage_target_kind_integration_contract: {
        must_not_widen_runtime_behavior: boolean;
        notes: string[];
      };
      initial_corpus_policy: Array<{
        card_name: string;
        future_target_kind_integration_expectation: {
          explicit_target_kind_evidence_present: boolean;
          derivation_allowed_now: boolean;
          candidate_target_kinds: string[];
        };
      }>;
    };
    const scalarPolicyContract = JSON.parse(readFileSync(scalarPolicyContractPath, "utf8")) as {
      guardrails: {
        cost_target_legality_min_target_count_remains_null_for_current_corpus: boolean;
      };
      cases: Array<{ card: string; scalar_projection: { expected_target_count: number | null } }>;
    };

    // Historical pre-extraction freeze remains explicit and non-contradictory.
    expect(additionalCorpusContract.phase).toBe(
      "A2.10_REAL_ORACLE_SPLIT_DIVIDED_DAMAGE_TARGET_COUNT_MODEL_ADDITIONAL_CORPUS_CONTRACT_V1",
    );
    expect(additionalCorpusContract.status).toBe("contract-freeze");
    expect(additionalCorpusContract.no_runtime_change).toBe(true);
    const deferredCards = additionalCorpusContract.cases
      .filter((c) => c.classification === "DEFERRED_TARGET_PREDICATE_MODEL")
      .map((c) => c.card)
      .sort();
    expect(deferredCards).toEqual(["Aerial Volley", "Fire at Will", "Pyrokinesis"]);

    // Core architectural guardrails must remain unchanged.
    expect(integrationContract.compatibility.derived_target_kinds_replace_split_model).toBe(false);
    expect(integrationContract.compatibility.derived_target_kinds_replace_target_count).toBe(false);
    expect(
      integrationContract.compatibility.derived_target_kinds_must_not_create_or_modify_modal_selection_model,
    ).toBe(true);
    expect(integrationContract.split_divided_damage_target_kind_integration_contract.must_not_widen_runtime_behavior).toBe(
      true,
    );

    // Narrow exception language must be present and explicit.
    const notes = integrationContract.split_divided_damage_target_kind_integration_contract.notes.join(" ");
    expect(notes).toContain("CREATURE_ONLY");
    expect(notes).toContain("WITH_FLYING");
    expect(notes).toContain("no full target legality");
    expect(notes).toContain("no resolution model");

    // Scalar projection policy remains frozen for the baseline split/divided corpus.
    expect(
      scalarPolicyContract.guardrails.cost_target_legality_min_target_count_remains_null_for_current_corpus,
    ).toBe(true);
    for (const row of scalarPolicyContract.cases) {
      expect(row.scalar_projection.expected_target_count).toBeNull();
    }

    // Runtime snapshots: legacy ANY_TARGET rows stay ANY_TARGET/null, predicate-bearing rows are narrow CREATURE-only exceptions.
    const payload = loadCardsIndex();

    for (const cardName of [
      "Electrolyze",
      "Arc Lightning",
      "Flames of the Firebrand",
      "Pyrotechnics",
      "Rolling Thunder",
      "Fire // Ice",
      "Magma Opus",
      "Boulderfall",
    ] as const) {
      const snapshot = buildSnapshot(payload, cardName);
      expect(snapshot.split_divided_damage_target_model).toBeTruthy();
      expect(snapshot.split_divided_damage_target_model?.allowed_target_kinds).toEqual(["ANY_TARGET"]);
      expect(snapshot.current_target_kinds).toContain("ANY_TARGET");
      expect(snapshot.current_modal_selection_model).toBeNull();
      expect(snapshot.current_legality_kinds).toEqual([]);
    }

    for (const cardName of ["Pyrokinesis", "Aerial Volley"] as const) {
      const snapshot = buildSnapshot(payload, cardName);
      expect(snapshot.split_divided_damage_target_model).toBeTruthy();
      expect(snapshot.split_divided_damage_target_model?.allowed_target_kinds).toEqual(["CREATURE"]);
      expect(snapshot.split_divided_damage_target_model?.target_count_model).toBeTruthy();
      expect(snapshot.current_target_kinds).toContain("CREATURE");
      expect(snapshot.current_target_kinds).not.toContain("ANY_TARGET");
      expect(snapshot.current_modal_selection_model).toBeNull();
      expect(snapshot.current_legality_kinds).toEqual([]);

      const predicateKind = snapshot.split_divided_damage_target_model?.target_predicate_kind;
      expect(["CREATURE_ONLY", "WITH_FLYING"]).toContain(predicateKind);
    }

    for (const cardName of ["Fall of the Titans", "Arc Trail", "Earthquake"] as const) {
      const snapshot = buildSnapshot(payload, cardName);
      expect(snapshot.split_divided_damage_target_model).toBeNull();
    }

    // Contract/runtime linkage: only predicate-bearing exceptions may claim explicit evidence present/allowed now.
    for (const row of integrationContract.initial_corpus_policy) {
      const isPredicateException = row.card_name === "Pyrokinesis" || row.card_name === "Aerial Volley";
      expect(row.future_target_kind_integration_expectation.explicit_target_kind_evidence_present).toBe(
        isPredicateException,
      );
      expect(row.future_target_kind_integration_expectation.derivation_allowed_now).toBe(
        isPredicateException,
      );
      if (isPredicateException) {
        expect(row.future_target_kind_integration_expectation.candidate_target_kinds).toEqual(["CREATURE"]);
      }
    }

    console.log("A2_10_COST_TARGET_LEGALITY_STABLE_CONSOLIDATION_RING_REVIEW_V1_COMPLETE");
  });
});
