export interface CardSynergyExplorerInput {
  cards:
    | readonly [CardSynergySeedCard]
    | readonly [CardSynergySeedCard, CardSynergySeedCard];
  options?: CardSynergyExplorerOptions;
}

export interface CardSynergySeedCard {
  name: string;
  oracleId?: string;
  setCode?: string;
  collectorNumber?: string;
}

export interface CardSynergyExplorerOptions {
  maxCandidates?: number;
  includeDegraded?: boolean;
  explanationLevel?: "summary" | "detailed";
}

export interface CardSynergyCandidate {
  card: CardSynergyCandidateCard;
  score: CardSynergyScore;
  explanation: CardSynergyExplanation;
  degradation?: CardSynergyDegradation;
}

export interface CardSynergyCandidateCard {
  name: string;
  oracleId?: string;
  typeLine?: string;
  oracleText?: string;
  cmc?: number;
}

export interface CardSynergyScore {
  value: number;
  confidence: "none" | "low" | "medium" | "high";
  basis: "explicit_causal_bridge" | "partial_semantic_match" | "degraded";
}

export interface CardSynergyExplanation {
  summary: string;
  bridges: readonly CardSynergyBridgeExplanation[];
  warnings?: readonly string[];
}

export interface CardSynergyBridgeExplanation {
  fromEvent?: string;
  fromEffect?: string;
  toEvent?: string;
  toEffect?: string;
  bridgeKind:
    | "event_to_effect"
    | "effect_to_event"
    | "effect_to_effect"
    | "event_to_event";
  evidence: readonly CardSynergyEvidence[];
}

export interface CardSynergyEvidence {
  source: "oracle_text" | "semantic_ir" | "cards_index" | "opaque";
  text?: string;
  ref?: string;
}

export interface CardSynergyDegradation {
  reason:
    | "missing_card_record"
    | "missing_oracle_text"
    | "semantic_ir_unavailable"
    | "no_explicit_bridge"
    | "opaque_text";
  message: string;
  recoverable: boolean;
}

export interface CardSynergyDataAdapter {
  resolveSeedCard(
    seed: CardSynergySeedCard,
  ): Promise<CardSynergyCandidateCard | CardSynergyDegradedCardRecord>;
  findCandidatePool(
    input: CardSynergyExplorerInput,
  ): Promise<readonly CardSynergyCandidateCard[]>;
}

export interface CardSynergyDegradedCardRecord {
  name: string;
  degradation: CardSynergyDegradation;
}

export interface CardSynergyExplorerResult {
  input: CardSynergyExplorerInput;
  candidates: readonly CardSynergyCandidate[];
  degradations: readonly CardSynergyDegradation[];
  meta: CardSynergyExplorerMeta;
}

export interface CardSynergyExplorerMeta {
  schemaVersion: "card-synergy-explorer-contract-v1";
  deterministic: true;
  usesDeckSps: false;
  usesMonteCarlo: false;
}
