import type { CardRecordMin } from "../cards/types";
import type {
  CardSynergyCandidateCard,
  CardSynergyDegradation,
  CardSynergyDegradedCardRecord,
  CardSynergySeedCard,
} from "./types";

export const CARD_SYNERGY_EXPLORER_ADAPTER_CONTRACT_VERSION =
  "card-synergy-explorer-adapter-contract-v1" as const;

export interface CardSynergyAdapterContractMeta {
  schemaVersion: typeof CARD_SYNERGY_EXPLORER_ADAPTER_CONTRACT_VERSION;
  cardsIndexSchemaVersion: "cardrecordmin-v1";
  deterministic: true;
  runtimeFetches: false;
  performsRanking: false;
}

export const CARD_SYNERGY_ADAPTER_CONTRACT_META: CardSynergyAdapterContractMeta = {
  schemaVersion: CARD_SYNERGY_EXPLORER_ADAPTER_CONTRACT_VERSION,
  cardsIndexSchemaVersion: "cardrecordmin-v1",
  deterministic: true,
  runtimeFetches: false,
  performsRanking: false,
};

export type CardSynergyCardIndexRecordLike =
  Pick<CardRecordMin, "type_line" | "oracle_text" | "cmc"> & Partial<CardRecordMin>;

export interface CardSynergyResolvedCardIndexRecord {
  seed: CardSynergySeedCard;
  record: CardSynergyCardIndexRecordLike;
  source: "cards_index";
}

export function cardIndexRecordToCandidateCard(
  input: CardSynergyResolvedCardIndexRecord,
): CardSynergyCandidateCard {
  const candidate: CardSynergyCandidateCard = {
    name: input.seed.name,
  };

  if (typeof input.seed.oracleId === "string") {
    candidate.oracleId = input.seed.oracleId;
  }

  if (typeof input.record.type_line === "string") {
    candidate.typeLine = input.record.type_line;
  }

  if (typeof input.record.oracle_text === "string") {
    candidate.oracleText = input.record.oracle_text;
  }

  if (typeof input.record.cmc === "number") {
    candidate.cmc = input.record.cmc;
  }

  return candidate;
}

export function missingCardRecordToDegradedCard(
  seed: CardSynergySeedCard,
): CardSynergyDegradedCardRecord {
  return {
    name: seed.name,
    degradation: {
      reason: "missing_card_record",
      message: `No cards_index record is available for seed card "${seed.name}".`,
      recoverable: true,
    },
  };
}

export function missingOracleTextDegradation(cardName: string): CardSynergyDegradation {
  return {
    reason: "missing_oracle_text",
    message: `Card "${cardName}" has no oracle text in the resolved cards_index record.`,
    recoverable: true,
  };
}
