import type { CardSynergyCandidateCard } from "./types";

export const CARD_SYNERGY_EXPLORER_CANDIDATE_OUTPUT_VERSION =
  "card-synergy-explorer-candidate-output-contract-v1" as const;

export type CardSynergyCandidateOutputSource = "candidate_pool";
export type CardSynergyCandidateOutputStatus = "unranked";
export type CardSynergyCandidateOutputSemanticStatus = "semantic_bridge_unavailable";

export interface CardSynergyCandidateOutput {
  name: string;
  oracleId?: string;
  typeLine?: string;
  oracleText?: string;
  cmc?: number;
  source: CardSynergyCandidateOutputSource;
  status: CardSynergyCandidateOutputStatus;
  semanticStatus: CardSynergyCandidateOutputSemanticStatus;
}

export interface CardSynergyCandidateOutputInput {
  candidatePool: readonly CardSynergyCandidateCard[];
}

export interface CardSynergyCandidateOutputMeta {
  version: typeof CARD_SYNERGY_EXPLORER_CANDIDATE_OUTPUT_VERSION;
  deterministic: true;
  source: CardSynergyCandidateOutputSource;
  createsScores: false;
  createsExplanations: false;
  createsRank: false;
  evaluatesSemanticBridges: false;
  usesDeckSps: false;
  usesMonteCarlo: false;
  directRuntimeIo: false;
}

export const CARD_SYNERGY_CANDIDATE_OUTPUT_META: CardSynergyCandidateOutputMeta = {
  version: CARD_SYNERGY_EXPLORER_CANDIDATE_OUTPUT_VERSION,
  deterministic: true,
  source: "candidate_pool",
  createsScores: false,
  createsExplanations: false,
  createsRank: false,
  evaluatesSemanticBridges: false,
  usesDeckSps: false,
  usesMonteCarlo: false,
  directRuntimeIo: false,
};

export function createCardSynergyCandidateOutputs(
  input: CardSynergyCandidateOutputInput,
): readonly CardSynergyCandidateOutput[] {
  return input.candidatePool.map((candidate) => {
    const output: CardSynergyCandidateOutput = {
      name: candidate.name,
      source: "candidate_pool",
      status: "unranked",
      semanticStatus: "semantic_bridge_unavailable",
    };

    if (typeof candidate.oracleId === "string") {
      output.oracleId = candidate.oracleId;
    }
    if (typeof candidate.typeLine === "string") {
      output.typeLine = candidate.typeLine;
    }
    if (typeof candidate.oracleText === "string") {
      output.oracleText = candidate.oracleText;
    }
    if (typeof candidate.cmc === "number") {
      output.cmc = candidate.cmc;
    }

    return output;
  });
}
