import { lookupCard as defaultLookupCard } from "../cards/lookup";
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
  performsCandidateSearch: false;
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
  performsCandidateSearch: false,
  performsRanking: false,
  createsScores: false,
  createsExplanations: false,
  evaluatesSemanticBridges: false,
};

export type CardSynergyCardsIndexLookup = (
  nameOrNorm: string,
  baseUrl?: string,
) => Promise<CardRecordMin | null>;

export interface CardSynergyCardsIndexAdapterOptions {
  baseUrl?: string;
  lookupCard?: CardSynergyCardsIndexLookup;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function hasUsableOracleText(record: CardRecordMin): boolean {
  return isNonEmptyString(record.oracle_text);
}

export function createCardSynergyCardsIndexAdapter(
  options: CardSynergyCardsIndexAdapterOptions = {},
): CardSynergyDataAdapter {
  const lookup = options.lookupCard ?? defaultLookupCard;
  const baseUrl = options.baseUrl;

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
      void input;
      return [];
    },
  };
}
