import type { CardEntry } from "../domain/types";
import type {
  CardSynergyCandidateCard,
  CardSynergyDegradation,
} from "../card_synergy_explorer/types";
import type { SemanticEdgeReason } from "../semantic/overlay/sem_edges";

export const MAX_DECK_ANCHORS = 8;
export const POOL_PER_ANCHOR = 32;
export const MAX_UNION_CANDIDATES = 128;
export const MAX_CONTEXTUALLY_SCORED_CANDIDATES = 64;
export const MAX_VISIBLE_RESULTS = 12;
export const MAX_EVALUATED_PAIRS = 512;
export const MAX_EDGES_PER_PAIR = 64;
export const MAX_REASONS_PER_CONNECTION = 12;

export interface DeckContextAnchor {
  key: string;
  name: string;
  nameNorm: string;
  count: number;
  oracleId?: string;
  typeLine?: string;
  oracleText?: string;
  rank: number;
  evidence: "supported" | "limited";
}

export interface RetrievedDeckContextCandidate {
  identityKey: string;
  card: CardSynergyCandidateCard;
  retrievedByAnchors: readonly string[];
}

export interface DeckContextRetrievalResult {
  anchorsUsed: readonly DeckContextAnchor[];
  candidates: readonly RetrievedDeckContextCandidate[];
  excludedPresentCount: number;
  duplicateMergeCount: number;
  truncatedCount: number;
  degradations: readonly CardSynergyDegradation[];
}

export type CandidateAnchorDirection =
  | "candidate_to_anchor"
  | "anchor_to_candidate";

export interface CandidateAnchorDirectionalEdge {
  direction: CandidateAnchorDirection;
  from: number;
  to: number;
  score: number;
  reasons: readonly SemanticEdgeReason[];
  localOnly: boolean;
}

export interface CandidateAnchorSemanticConnection {
  candidateKey: string;
  anchorKey: string;
  candidateName: string;
  anchorName: string;
  directions: readonly CandidateAnchorDirectionalEdge[];
  primaryScore: number;
  reasons: readonly SemanticEdgeReason[];
  bidirectional: boolean;
}

export type CandidateAnchorSemanticDegradationReason =
  | "missing_candidate_oracle"
  | "missing_anchor_oracle"
  | "missing_candidate_type_line"
  | "missing_anchor_type_line"
  | "candidate_lowering_failed"
  | "anchor_lowering_failed"
  | "no_cross_edge"
  | "unresolved_identity";

export interface CandidateAnchorSemanticDegradation {
  candidateKey: string;
  anchorKey?: string;
  reason: CandidateAnchorSemanticDegradationReason;
}

export interface CandidateAnchorSemanticConnectionBuildResult {
  connections: readonly CandidateAnchorSemanticConnection[];
  degradations: readonly CandidateAnchorSemanticDegradation[];
  candidateLocalEvidenceCount: number;
  anchorLocalEvidenceCount: number;
  evaluatedAnchorCount: number;
}

export interface DeckContextReason {
  key: number;
  weight: number;
}

export interface RelatedDeckCard {
  key: string;
  name: string;
  score: number;
}

export interface DeckContextCandidateScore {
  candidate: RetrievedDeckContextCandidate;
  contextualScore: number;
  connectedDeckCardCount: number;
  relatedDeckCards: readonly RelatedDeckCard[];
  reasons: readonly DeckContextReason[];
  evidenceLevel: "high" | "medium" | "limited" | "inconclusive";
  warnings: readonly string[];
}

export interface DeckSemanticCompatibilityContext {
  recognizedCards: readonly CardEntry[];
  uniqueCardCount: number;
  internalConnectionCount: number;
  topRelations: readonly {
    from: string;
    to: string;
    score: number;
    reasons: readonly SemanticEdgeReason[];
  }[];
  coverage: number | null;
  limitedEvidenceCards: readonly string[];
  isolatedCards: readonly string[];
}
