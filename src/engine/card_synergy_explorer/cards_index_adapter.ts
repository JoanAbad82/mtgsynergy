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

      const records = await listRecords({
        baseUrl,
        limit,
        includeEmptyOracleText: false,
      });

      return records.map(mapCardRecordToCandidateCard);
    },
  };
}
