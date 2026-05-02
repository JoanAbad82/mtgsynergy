import type {
  CardSynergyDegradation,
  CardSynergyExplorerInput,
  CardSynergyExplorerResult,
} from "./types";
import { validateCardSynergyExplorerInput } from "./input_validation";

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

export function runCardSynergyExplorerCoreSkeleton(
  input: CardSynergyExplorerInput,
): CardSynergyExplorerResult {
  const validation = validateCardSynergyExplorerInput(input);
  if (!validation.ok) {
    return {
      input,
      candidates: [],
      degradations: validation.degradations,
      meta: {
        schemaVersion: "card-synergy-explorer-contract-v1",
        deterministic: true,
        usesDeckSps: false,
        usesMonteCarlo: false,
      },
    };
  }

  return {
    input,
    candidates: [],
    degradations: [createSemanticIrUnavailableDegradation()],
    meta: {
      schemaVersion: "card-synergy-explorer-contract-v1",
      deterministic: true,
      usesDeckSps: false,
      usesMonteCarlo: false,
    },
  };
}
