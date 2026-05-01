import type { StructuralSummary } from "../domain/types";
import { buildActionableInsightsFromPipeline } from "./pipeline_adapter";
import type { ActionableInsight } from "./types";

export type AnalyzerPipelineRecommendationsInput = {
  deckState?: unknown | null;
  summary?: unknown | null;
  edges?: unknown[] | null;
  semanticOverlay?: unknown | null;
  monteCarlo?: unknown | null;
  issues?: unknown[] | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object";
}

function readSummaryFromDeckState(
  deckState: unknown | null | undefined,
): StructuralSummary | null {
  if (!isRecord(deckState) || deckState.summary == null) return null;
  return deckState.summary as StructuralSummary;
}

function readEdgesFromDeckState(
  deckState: unknown | null | undefined,
): unknown[] | null {
  if (!isRecord(deckState) || !Array.isArray(deckState.edges)) return null;
  return deckState.edges;
}

function readIssuesFromDeckState(
  deckState: unknown | null | undefined,
): unknown[] | null {
  if (!isRecord(deckState) || !Array.isArray(deckState.issues)) return null;
  return deckState.issues;
}

export function buildActionableInsightsFromAnalyzerPipeline(
  input: AnalyzerPipelineRecommendationsInput,
): ActionableInsight[] {
  const resolvedSummary =
    input.summary != null
      ? (input.summary as StructuralSummary)
      : readSummaryFromDeckState(input.deckState);

  const resolvedEdges =
    Array.isArray(input.edges) ? input.edges : readEdgesFromDeckState(input.deckState);

  const resolvedIssues =
    Array.isArray(input.issues) ? input.issues : readIssuesFromDeckState(input.deckState);

  return buildActionableInsightsFromPipeline({
    deckState: input.deckState,
    summary: resolvedSummary,
    edges: resolvedEdges,
    semanticOverlay: input.semanticOverlay ?? null,
    monteCarlo: input.monteCarlo ?? null,
    issues: resolvedIssues,
  });
}
