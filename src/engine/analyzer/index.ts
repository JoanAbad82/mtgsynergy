import type { Deck, DeckState, StructuralSummary } from "../domain/types";
import type { ParseIssue } from "../parser/types";
import type { Issue } from "./enrich";
import type { ActionableInsight } from "../recommendations/types";
import { parseMtgaExport } from "../parser";
import { computeStructuralSummary } from "../structural";
import { enrichEntriesWithCardIndex } from "./enrich";
import { generateEdges } from "../edges";
import type { Edge } from "../edges/types";
import { projectCardEdgesToRoleEdges } from "../structural/project_card_edges_to_role_edges";
import { computeStructuralPowerScore } from "../structural/sps";
import { buildActionableInsightsFromAnalyzerPipeline } from "../recommendations/analyzer_pipeline_wiring";

export type AnalyzeResult = {
  deckState: { deck: Deck; edges: Edge[] };
  summary: StructuralSummary;
  issues: Array<ParseIssue | Issue>;
  actionableInsights?: ActionableInsight[];
};

export async function analyzeMtgaExportAsync(
  input: string,
  opts?: { enableCardIndex?: boolean; baseUrl?: string },
): Promise<AnalyzeResult> {
  const parsed = parseMtgaExport(input);
  const enriched = await enrichEntriesWithCardIndex(parsed.deck.entries, {
    enable: opts?.enableCardIndex,
    baseUrl: opts?.baseUrl,
  });

  const taggingActive = enriched.taggingActive;
  const baseIssues = taggingActive
    ? parsed.issues.filter((i) => i.code !== "ROLES_DEFAULTED_TO_UTILITY")
    : parsed.issues;

  const deck = { entries: enriched.entries };
  const cardEdges = generateEdges(enriched.entries as any);
  const roleEdges = projectCardEdgesToRoleEdges(enriched.entries, cardEdges);
  const deckState = { deck, edges: cardEdges };
  const structuralDeckState: DeckState = { deck, edges: roleEdges };
  const summary = computeStructuralSummary(structuralDeckState);
  const spsResult = computeStructuralPowerScore(summary, cardEdges);
  summary.structuralPowerScore = spsResult.sps;
  summary.structuralPowerBreakdown = spsResult.breakdown;
  const issues = [...baseIssues, ...enriched.issues_added];
  let actionableInsights: ActionableInsight[] = [];
  try {
    actionableInsights = buildActionableInsightsFromAnalyzerPipeline({
      deckState,
      summary,
      issues,
    });
  } catch {
    actionableInsights = [];
  }

  return { deckState, summary, issues, actionableInsights };
}
