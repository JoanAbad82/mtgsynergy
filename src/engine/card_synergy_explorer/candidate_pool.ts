import { resolveCardSynergySeeds, type CardSynergyResolvedSeed } from "./seed_resolution";
import { normalizeCardSynergyCandidatePool } from "./candidate_normalization";
import type {
  CardSynergyCandidateCard,
  CardSynergyDataAdapter,
  CardSynergyDegradation,
  CardSynergyExplorerInput,
} from "./types";

export const CARD_SYNERGY_EXPLORER_CANDIDATE_POOL_VERSION =
  "card-synergy-explorer-candidate-pool-contract-v1" as const;

export interface CardSynergyCandidatePoolMeta {
  version: typeof CARD_SYNERGY_EXPLORER_CANDIDATE_POOL_VERSION;
  deterministic: true;
  usesInjectedAdapter: true;
  directRuntimeIo: false;
  performsCandidateSearch: true;
  performsRanking: false;
}

export const CARD_SYNERGY_CANDIDATE_POOL_META: CardSynergyCandidatePoolMeta = {
  version: CARD_SYNERGY_EXPLORER_CANDIDATE_POOL_VERSION,
  deterministic: true,
  usesInjectedAdapter: true,
  directRuntimeIo: false,
  performsCandidateSearch: true,
  performsRanking: false,
};

export interface CardSynergyCandidatePoolResult {
  input: CardSynergyExplorerInput;
  resolvedSeeds: readonly CardSynergyResolvedSeed[];
  candidatePool: readonly CardSynergyCandidateCard[];
  degradations: readonly CardSynergyDegradation[];
  meta: CardSynergyCandidatePoolMeta;
}

export async function resolveCardSynergyCandidatePool(
  input: CardSynergyExplorerInput,
  adapter: CardSynergyDataAdapter,
): Promise<CardSynergyCandidatePoolResult> {
  const seedResolution = await resolveCardSynergySeeds(input, adapter);
  if (seedResolution.degradations.length > 0) {
    return {
      input,
      resolvedSeeds: seedResolution.resolvedSeeds,
      candidatePool: [],
      degradations: seedResolution.degradations,
      meta: CARD_SYNERGY_CANDIDATE_POOL_META,
    };
  }

  const candidatePool = await adapter.findCandidatePool(seedResolution.input);
  const normalization = normalizeCardSynergyCandidatePool({
    candidatePool,
    seedCards: seedResolution.resolvedSeeds.map((seed) => seed.card),
    maxCandidates: input.options?.maxCandidates,
  });
  return {
    input,
    resolvedSeeds: seedResolution.resolvedSeeds,
    candidatePool: normalization.normalizedCandidatePool,
    degradations: [],
    meta: CARD_SYNERGY_CANDIDATE_POOL_META,
  };
}
