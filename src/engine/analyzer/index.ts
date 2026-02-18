import type { DeckState, StructuralSummary } from "../domain/types";
import type { ParseIssue } from "../parser/types";
import type { Issue } from "./enrich";
import { parseMtgaExport } from "../parser";
import { computeStructuralSummary } from "../structural";
import { enrichEntriesWithCardIndex } from "./enrich";
import { generateEdges } from "../edges";
import { computeStructuralPowerScore } from "../structural/sps";

export type AnalyzeResult = {
  deckState: DeckState;
  summary: StructuralSummary;
  issues: Array<ParseIssue | Issue>;
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
  const edges = generateEdges(enriched.entries as any);
  const deckState: DeckState = { deck, edges };
  const summary = computeStructuralSummary(deckState);
  const spsResult = computeStructuralPowerScore(summary, deckState.edges ?? []);
  summary.structuralPowerScore = spsResult.sps;
  summary.structuralPowerBreakdown = spsResult.breakdown;
  const issues = [...baseIssues, ...enriched.issues_added];

  return { deckState, summary, issues };
}
