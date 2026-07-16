import {
  listCardsIndexRecords as defaultListCardsIndexRecords,
  lookupCard as defaultLookupCard,
} from "../cards/lookup";
import type { ListCardsIndexRecordsOptions } from "../cards/lookup";
import type { CardRecordMin } from "../cards/types";
import {
  cardIndexRecordToCandidateCard,
  missingCardRecordToDegradedCard,
  missingOracleTextDegradation,
} from "./adapter_contract";
import type { CardSynergyDataAdapter } from "./types";

export const CARD_SYNERGY_EXPLORER_CARDS_INDEX_ADAPTER_VERSION =
  "card-synergy-explorer-cards-index-adapter-v1" as const;

export interface CardSynergyCardsIndexAdapterMeta {
  version: typeof CARD_SYNERGY_EXPLORER_CARDS_INDEX_ADAPTER_VERSION;
  deterministic: true;
  usesCardsIndexLookup: true;
  directRuntimeFetches: false;
  performsCandidateSearch: true;
  performsRanking: false;
  createsScores: false;
  createsExplanations: false;
  evaluatesSemanticBridges: false;
}

export const CARD_SYNERGY_CARDS_INDEX_ADAPTER_META: CardSynergyCardsIndexAdapterMeta = {
  version: CARD_SYNERGY_EXPLORER_CARDS_INDEX_ADAPTER_VERSION,
  deterministic: true,
  usesCardsIndexLookup: true,
  directRuntimeFetches: false,
  performsCandidateSearch: true,
  performsRanking: false,
  createsScores: false,
  createsExplanations: false,
  evaluatesSemanticBridges: false,
};

export type CardSynergyCardsIndexLookup = (
  nameOrNorm: string,
  baseUrl?: string,
) => Promise<CardRecordMin | null>;

export type CardSynergyCardsIndexListRecords = (
  options?: ListCardsIndexRecordsOptions,
) => Promise<readonly CardRecordMin[]>;

export interface CardSynergyCardsIndexAdapterOptions {
  baseUrl?: string;
  lookupCard?: CardSynergyCardsIndexLookup;
  listCardsIndexRecords?: CardSynergyCardsIndexListRecords;
  candidatePoolLimit?: number;
  candidatePoolOverscan?: number;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function hasUsableOracleText(record: CardRecordMin): boolean {
  return isNonEmptyString(record.oracle_text);
}

function resolvePositiveInteger(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  const integerValue = Math.floor(value);
  if (integerValue <= 0) {
    return fallback;
  }
  return integerValue;
}

const SEED_FILTER_STOP_WORDS = new Set([
  "a", "an", "and", "as", "at", "card", "cards", "each", "for", "from",
  "has", "have", "if", "in", "into", "is", "it", "of", "on", "or",
  "other", "put", "that", "the", "then", "this", "to", "up", "with",
  "you", "your",
]);

function normalizeFilterToken(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function collectFilterTokens(value: unknown, target: Set<string>): void {
  if (typeof value === "string") {
    for (const token of normalizeFilterToken(value).split(/\s+/)) {
      if (
        token.length >= 3 &&
        !SEED_FILTER_STOP_WORDS.has(token) &&
        !/^\d+$/.test(token)
      ) {
        target.add(token);
      }
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectFilterTokens(item, target);
    }
  }
}

function buildSeedRecordFilter(
  input: Parameters<CardSynergyDataAdapter["findCandidatePool"]>[0],
): ((record: CardRecordMin) => boolean) | undefined {
  const seedCards = Array.isArray(input.seedCards) ? input.seedCards : [];
  const cards = Array.isArray(input.cards) ? input.cards : [];
  const seeds = seedCards.length > 0 ? seedCards : cards;
  const seedTokens = new Set<string>();

  for (const seed of seeds) {
    collectFilterTokens(seed.name, seedTokens);
    collectFilterTokens(seed.typeLine, seedTokens);
    collectFilterTokens(seed.oracleText, seedTokens);
  }

  if (seedTokens.size === 0) {
    return undefined;
  }

  return (record) => {
    const recordTokens = new Set<string>();
    collectFilterTokens(record.name, recordTokens);
    collectFilterTokens(record.type_line, recordTokens);
    collectFilterTokens(record.oracle_text, recordTokens);
    collectFilterTokens(record.keywords, recordTokens);

    for (const token of recordTokens) {
      if (seedTokens.has(token)) {
        return true;
      }
    }
    return false;
  };
}

function mapCardRecordToCandidateCard(record: CardRecordMin): {
  name: string;
  oracleId?: string;
  typeLine?: string;
  oracleText?: string;
  cmc?: number;
} {
  const candidate: {
    name: string;
    oracleId?: string;
    typeLine?: string;
    oracleText?: string;
    cmc?: number;
  } = {
    name: record.name,
  };

  if (isNonEmptyString(record.oracle_id)) {
    candidate.oracleId = record.oracle_id;
  }
  if (typeof record.type_line === "string") {
    candidate.typeLine = record.type_line;
  }
  if (typeof record.oracle_text === "string") {
    candidate.oracleText = record.oracle_text;
  }
  if (typeof record.cmc === "number") {
    candidate.cmc = record.cmc;
  }

  return candidate;
}

export function createCardSynergyCardsIndexAdapter(
  options: CardSynergyCardsIndexAdapterOptions = {},
): CardSynergyDataAdapter {
  const lookup = options.lookupCard ?? defaultLookupCard;
  const listRecords = options.listCardsIndexRecords ?? defaultListCardsIndexRecords;
  const baseUrl = options.baseUrl;
  const candidatePoolLimit = resolvePositiveInteger(options.candidatePoolLimit, 200);
  const candidatePoolOverscan = resolvePositiveInteger(options.candidatePoolOverscan, 16);

  return {
    async resolveSeedCard(seed) {
      const record = await lookup(seed.name, baseUrl);
      if (!record) {
        return missingCardRecordToDegradedCard(seed);
      }

      if (!hasUsableOracleText(record)) {
        const cardName = isNonEmptyString(record.name) ? record.name : seed.name;
        return {
          name: seed.name,
          degradation: missingOracleTextDegradation(cardName),
        };
      }

      const candidate = cardIndexRecordToCandidateCard({
        seed,
        record,
        source: "cards_index",
      });

      if (isNonEmptyString(record.name)) {
        candidate.name = record.name;
      }

      if (!isNonEmptyString(seed.oracleId) && isNonEmptyString(record.oracle_id)) {
        candidate.oracleId = record.oracle_id;
      }

      return candidate;
    },
    async findCandidatePool(input) {
      const maxCandidates = input.options?.maxCandidates;
      if (typeof maxCandidates === "number") {
        if (maxCandidates <= 0) {
          return [];
        }
      }

      const limit =
        typeof maxCandidates === "number" && Number.isFinite(maxCandidates) && maxCandidates > 0
          ? Math.floor(maxCandidates) + candidatePoolOverscan
          : candidatePoolLimit;
      const recordFilter = buildSeedRecordFilter(input);

      const records = await listRecords({
        baseUrl,
        limit,
        includeEmptyOracleText: false,
        recordFilter,
      });

      return records.map(mapCardRecordToCandidateCard);
    },
  };
}
