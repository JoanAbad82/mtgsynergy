import type { CardSynergyCandidateCard } from "./types";

export const CARD_SYNERGY_EXPLORER_CANDIDATE_NORMALIZATION_VERSION =
  "card-synergy-explorer-candidate-normalization-contract-v1" as const;

export interface CardSynergyCandidateNormalizationMeta {
  version: typeof CARD_SYNERGY_EXPLORER_CANDIDATE_NORMALIZATION_VERSION;
  deterministic: true;
  createsScores: false;
  createsExplanations: false;
  createsBridges: false;
  createsRankedCandidates: false;
  usesDeckSps: false;
  usesMonteCarlo: false;
  directRuntimeIo: false;
}

export const CARD_SYNERGY_CANDIDATE_NORMALIZATION_META: CardSynergyCandidateNormalizationMeta = {
  version: CARD_SYNERGY_EXPLORER_CANDIDATE_NORMALIZATION_VERSION,
  deterministic: true,
  createsScores: false,
  createsExplanations: false,
  createsBridges: false,
  createsRankedCandidates: false,
  usesDeckSps: false,
  usesMonteCarlo: false,
  directRuntimeIo: false,
};

export interface CardSynergyCandidateNormalizationInput {
  candidatePool: readonly CardSynergyCandidateCard[];
  seedCards: readonly CardSynergyCandidateCard[];
  maxCandidates?: number;
}

export interface CardSynergyCandidateNormalizationResult {
  normalizedCandidatePool: readonly CardSynergyCandidateCard[];
  excludedCandidateCount: number;
  duplicateCandidateCount: number;
  seedCandidateCount: number;
  meta: CardSynergyCandidateNormalizationMeta;
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function getOracleId(card: CardSynergyCandidateCard): string | undefined {
  if (typeof card.oracleId !== "string") {
    return undefined;
  }
  const trimmed = card.oracleId.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function getDedupeKey(card: CardSynergyCandidateCard): string {
  const oracleId = getOracleId(card);
  if (oracleId) {
    return `oracle:${oracleId}`;
  }
  return `name:${normalizeName(card.name)}`;
}

export function normalizeCardSynergyCandidatePool(
  input: CardSynergyCandidateNormalizationInput,
): CardSynergyCandidateNormalizationResult {
  const seedOracleIds = new Set<string>();
  const seedNames = new Set<string>();

  for (const seed of input.seedCards) {
    const seedOracleId = getOracleId(seed);
    if (seedOracleId) {
      seedOracleIds.add(seedOracleId);
    }
    seedNames.add(normalizeName(seed.name));
  }

  const accepted: CardSynergyCandidateCard[] = [];
  const seen = new Set<string>();
  let seedCandidateCount = 0;
  let duplicateCandidateCount = 0;

  for (const candidate of input.candidatePool) {
    const oracleId = getOracleId(candidate);
    const nameKey = normalizeName(candidate.name);

    const matchesSeed =
      (oracleId !== undefined && seedOracleIds.has(oracleId)) ||
      (oracleId === undefined && seedNames.has(nameKey));
    if (matchesSeed) {
      seedCandidateCount += 1;
      continue;
    }

    const dedupeKey = getDedupeKey(candidate);
    if (seen.has(dedupeKey)) {
      duplicateCandidateCount += 1;
      continue;
    }

    seen.add(dedupeKey);
    accepted.push(candidate);
  }

  let normalizedCandidatePool = accepted;
  if (typeof input.maxCandidates === "number") {
    if (input.maxCandidates <= 0) {
      normalizedCandidatePool = [];
    } else {
      normalizedCandidatePool = accepted.slice(0, input.maxCandidates);
    }
  }

  const maxTruncatedCount = accepted.length - normalizedCandidatePool.length;

  return {
    normalizedCandidatePool,
    excludedCandidateCount: seedCandidateCount + duplicateCandidateCount + maxTruncatedCount,
    duplicateCandidateCount,
    seedCandidateCount,
    meta: CARD_SYNERGY_CANDIDATE_NORMALIZATION_META,
  };
}
