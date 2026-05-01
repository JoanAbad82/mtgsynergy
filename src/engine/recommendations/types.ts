import type { StructuralSummary } from "../domain/types";

export type InsightSeverity = "info" | "warning" | "critical";

export type InsightTheme =
  | "key_pieces"
  | "supporting_relations"
  | "structural_gaps"
  | "fragility"
  | "role_reinforcement"
  | "candidate_cards_to_review";

export type ActionableInsight = {
  id: string;
  severity: InsightSeverity;
  theme: InsightTheme;
  title: string;
  recommendation: string;
  evidence: string[];
  confidence: number;
};

export type RecommendationEdge = {
  from: string;
  to: string;
  kind?: string;
  weight?: number;
  score?: number;
};

export type RecommendationIssue = {
  code: string;
  severity?: string;
  message?: string;
};

export type RecommendationSemanticOverlay = {
  metrics?: {
    orphan_listeners?: Array<{ key: number; consumed: number; explain?: string }>;
    excess_producers?: Array<{ key: number; produced: number; explain?: string }>;
    redundancy_groups?: Array<{ signature: string; card_ids: number[]; size: number }>;
    SOS?: number;
  };
};

export type RecommendationMonteCarlo = {
  base?: { sps?: number };
  metrics?: { robust_sps?: number; fragility?: number };
  dist?: { effective_n?: number; requested_n?: number; no_op?: number };
};

export type ActionableInsightsInput = {
  summary?: StructuralSummary | null;
  edges?: RecommendationEdge[] | null;
  semanticOverlay?: RecommendationSemanticOverlay | null;
  monteCarlo?: RecommendationMonteCarlo | null;
  issues?: RecommendationIssue[] | null;
};

export type PlanDiagnostics = {
  hasFragilityRisk: boolean;
  hasStrongRelations: boolean;
  hasStructuralGaps: boolean;
  hasSemanticDisconnects: boolean;
  dominantRoles: string[];
  weakRoles: string[];
  topRelations: RecommendationEdge[];
  keyPieces: string[];
  fragilityEvidence: string[];
  structuralEvidence: string[];
  semanticEvidence: string[];
  relationEvidence: string[];
};
