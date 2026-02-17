import type { DeckState, StructuralSummary } from "../domain/types";
import type { ParseIssue } from "../parser/types";
import type { Issue } from "./enrich";
import { parseMtgaExport } from "../parser";
import { computeStructuralSummary } from "../structural";
import { enrichEntriesWithCardIndex } from "./enrich";

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

  const deck = { entries: enriched.entries };
  const deckState: DeckState = { deck };
  const summary = computeStructuralSummary(deckState);
  const issues = [...parsed.issues, ...enriched.issues_added];

  return { deckState, summary, issues };
}
