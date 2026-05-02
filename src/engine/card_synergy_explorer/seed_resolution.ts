import { validateCardSynergyExplorerInput } from "./input_validation";
import type {
  CardSynergyCandidateCard,
  CardSynergyDataAdapter,
  CardSynergyDegradation,
  CardSynergyDegradedCardRecord,
  CardSynergyExplorerInput,
  CardSynergySeedCard,
} from "./types";

export const CARD_SYNERGY_EXPLORER_SEED_RESOLUTION_VERSION =
  "card-synergy-explorer-seed-resolution-contract-v1" as const;

export interface CardSynergySeedResolutionMeta {
  resolutionVersion: typeof CARD_SYNERGY_EXPLORER_SEED_RESOLUTION_VERSION;
  deterministic: true;
  usesInjectedAdapter: true;
  directRuntimeFetches: false;
  performsCandidateSearch: false;
  performsRanking: false;
  evaluatesSemanticBridges: false;
}

export const CARD_SYNERGY_SEED_RESOLUTION_META: CardSynergySeedResolutionMeta = {
  resolutionVersion: CARD_SYNERGY_EXPLORER_SEED_RESOLUTION_VERSION,
  deterministic: true,
  usesInjectedAdapter: true,
  directRuntimeFetches: false,
  performsCandidateSearch: false,
  performsRanking: false,
  evaluatesSemanticBridges: false,
};

export interface CardSynergyResolvedSeed {
  seed: CardSynergySeedCard;
  card: CardSynergyCandidateCard;
  source: "adapter";
}

export interface CardSynergySeedResolutionResult {
  input: CardSynergyExplorerInput;
  resolvedSeeds: readonly CardSynergyResolvedSeed[];
  degradations: readonly CardSynergyDegradation[];
  meta: CardSynergySeedResolutionMeta;
}

export function isCardSynergyDegradedCardRecord(
  value: CardSynergyCandidateCard | CardSynergyDegradedCardRecord,
): value is CardSynergyDegradedCardRecord {
  const maybeRecord = value as { degradation?: unknown };
  if (typeof maybeRecord !== "object" || maybeRecord === null || !("degradation" in maybeRecord)) {
    return false;
  }

  const maybeDegradation = maybeRecord.degradation as { reason?: unknown } | undefined;
  return typeof maybeDegradation === "object" && maybeDegradation !== null && typeof maybeDegradation.reason === "string";
}

export async function resolveCardSynergySeeds(
  input: CardSynergyExplorerInput,
  adapter: CardSynergyDataAdapter,
): Promise<CardSynergySeedResolutionResult> {
  const validation = validateCardSynergyExplorerInput(input);
  if (!validation.ok) {
    return {
      input,
      resolvedSeeds: [],
      degradations: validation.degradations,
      meta: CARD_SYNERGY_SEED_RESOLUTION_META,
    };
  }

  const resolvedSeeds: CardSynergyResolvedSeed[] = [];
  const degradations: CardSynergyDegradation[] = [];

  for (const seed of input.cards) {
    const resolved = await adapter.resolveSeedCard(seed);
    if (isCardSynergyDegradedCardRecord(resolved)) {
      degradations.push(resolved.degradation);
      continue;
    }
    resolvedSeeds.push({
      seed,
      card: resolved,
      source: "adapter",
    });
  }

  return {
    input,
    resolvedSeeds,
    degradations,
    meta: CARD_SYNERGY_SEED_RESOLUTION_META,
  };
}
