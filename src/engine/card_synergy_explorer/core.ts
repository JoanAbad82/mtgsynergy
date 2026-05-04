import type {
  CardSynergyDataAdapter,
  CardSynergyDegradation,
  CardSynergyExplorerInput,
  CardSynergyExplorerResult,
} from "./types";
import { validateCardSynergyExplorerInput } from "./input_validation";
import { resolveCardSynergyCandidatePool } from "./candidate_pool";
import { createCardSynergyCandidateOutputs } from "./candidate_output";

export const CARD_SYNERGY_EXPLORER_CORE_SKELETON_VERSION =
  "card-synergy-explorer-core-skeleton-v1" as const;

export interface CardSynergyExplorerCoreSkeletonMeta {
  coreVersion: typeof CARD_SYNERGY_EXPLORER_CORE_SKELETON_VERSION;
  schemaVersion: "card-synergy-explorer-contract-v1";
  deterministic: true;
  usesDeckSps: false;
  usesMonteCarlo: false;
  performsRanking: false;
  evaluatesSemanticBridges: false;
}

export const CARD_SYNERGY_EXPLORER_CORE_SKELETON_META: CardSynergyExplorerCoreSkeletonMeta = {
  coreVersion: CARD_SYNERGY_EXPLORER_CORE_SKELETON_VERSION,
  schemaVersion: "card-synergy-explorer-contract-v1",
  deterministic: true,
  usesDeckSps: false,
  usesMonteCarlo: false,
  performsRanking: false,
  evaluatesSemanticBridges: false,
};

const SEMANTIC_IR_UNAVAILABLE_MESSAGE =
  "Semantic bridge evaluation is unavailable in core skeleton v1.";

export function createSemanticIrUnavailableDegradation(): CardSynergyDegradation {
  return {
    reason: "semantic_ir_unavailable",
    message: SEMANTIC_IR_UNAVAILABLE_MESSAGE,
    recoverable: true,
  };
}

function createCoreMeta(): CardSynergyExplorerResult["meta"] {
  return {
    schemaVersion: "card-synergy-explorer-contract-v1",
    deterministic: true,
    usesDeckSps: false,
    usesMonteCarlo: false,
  };
}

export function runCardSynergyExplorerCoreSkeleton(
  input: CardSynergyExplorerInput,
): CardSynergyExplorerResult;
export function runCardSynergyExplorerCoreSkeleton(
  input: CardSynergyExplorerInput,
  adapter: CardSynergyDataAdapter,
): Promise<CardSynergyExplorerResult>;
export function runCardSynergyExplorerCoreSkeleton(
  input: CardSynergyExplorerInput,
  adapter?: CardSynergyDataAdapter,
): CardSynergyExplorerResult | Promise<CardSynergyExplorerResult> {
  if (!adapter) {
    const validation = validateCardSynergyExplorerInput(input);
    if (!validation.ok) {
      return {
        input,
        candidates: [],
        candidateOutputs: [],
        degradations: validation.degradations,
        meta: createCoreMeta(),
      };
    }

    return {
      input,
      candidates: [],
      candidateOutputs: [],
      degradations: [createSemanticIrUnavailableDegradation()],
      meta: createCoreMeta(),
    };
  }

  return resolveCardSynergyCandidatePool(input, adapter).then((poolResult) => {
    if (poolResult.degradations.length > 0) {
      return {
        input,
        candidates: [],
        candidateOutputs: [],
        degradations: poolResult.degradations,
        meta: createCoreMeta(),
      };
    }

    return {
      input,
      candidates: [],
      candidateOutputs: createCardSynergyCandidateOutputs({
        candidatePool: poolResult.candidatePool,
      }),
      degradations: [createSemanticIrUnavailableDegradation()],
      meta: createCoreMeta(),
    };
  });
}
