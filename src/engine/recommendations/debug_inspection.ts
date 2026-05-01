import type { ActionableInsight, InsightSeverity, InsightTheme } from "./types";

export type RecommendationDebugInspectionInput = {
  deckLabel?: string;
  source?: string;
  actionableInsights?: ActionableInsight[] | null;
  includeEvidence?: boolean;
};

export type RecommendationDebugInsightView = {
  id: string;
  theme: InsightTheme;
  severity: InsightSeverity;
  title: string;
  recommendation: string;
  confidence: number;
  evidenceCount: number;
  evidencePreview?: string[];
};

export type RecommendationDebugInspectionReport = {
  deckLabel: string;
  source: string;
  count: number;
  themes: Partial<Record<InsightTheme, number>>;
  severities: Partial<Record<InsightSeverity, number>>;
  top: RecommendationDebugInsightView[];
  hasEvidence: boolean;
  ids: string[];
};

const MAX_TOP_INSIGHTS = 5;
const MAX_EVIDENCE_LINES = 3;
const MAX_EVIDENCE_LINE_LENGTH = 180;
const DEFAULT_DECK_LABEL = "deck:unknown";
const DEFAULT_SOURCE = "recommendations:internal";

const SEVERITY_RANK: Record<InsightSeverity, number> = {
  critical: 3,
  warning: 2,
  info: 1,
};

function toEvidencePreview(evidence: string[]): string[] {
  return evidence.slice(0, MAX_EVIDENCE_LINES).map((line) => {
    if (line.length <= MAX_EVIDENCE_LINE_LENGTH) return line;
    return `${line.slice(0, MAX_EVIDENCE_LINE_LENGTH)}...`;
  });
}

function sortedInsights(
  insights: ActionableInsight[] | null | undefined,
): ActionableInsight[] {
  const safe = Array.isArray(insights) ? insights : [];
  return safe
    .map((insight) => ({
      ...insight,
      evidence: Array.isArray(insight.evidence) ? [...insight.evidence] : [],
    }))
    .sort((a, b) => {
      const rankDiff = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
      if (rankDiff !== 0) return rankDiff;
      return a.id.localeCompare(b.id);
    });
}

function buildCountMap<T extends string>(
  values: T[],
  sortKeys: (a: T, b: T) => number,
): Partial<Record<T, number>> {
  const map = new Map<T, number>();
  for (const value of values) {
    map.set(value, (map.get(value) ?? 0) + 1);
  }
  const sortedEntries = [...map.entries()].sort((a, b) => sortKeys(a[0], b[0]));
  return Object.fromEntries(sortedEntries) as Partial<Record<T, number>>;
}

export function buildRecommendationDebugInspectionReport(
  input: RecommendationDebugInspectionInput,
): RecommendationDebugInspectionReport {
  const includeEvidence = input.includeEvidence === true;
  const insights = sortedInsights(input.actionableInsights);

  const top = insights.slice(0, MAX_TOP_INSIGHTS).map((insight) => {
    const view: RecommendationDebugInsightView = {
      id: insight.id,
      theme: insight.theme,
      severity: insight.severity,
      title: insight.title,
      recommendation: insight.recommendation,
      confidence: insight.confidence,
      evidenceCount: insight.evidence.length,
    };
    if (includeEvidence) {
      view.evidencePreview = toEvidencePreview(insight.evidence);
    }
    return view;
  });

  return {
    deckLabel: input.deckLabel ?? DEFAULT_DECK_LABEL,
    source: input.source ?? DEFAULT_SOURCE,
    count: insights.length,
    themes: buildCountMap(
      insights.map((insight) => insight.theme),
      (a, b) => a.localeCompare(b),
    ),
    severities: buildCountMap(
      insights.map((insight) => insight.severity),
      (a, b) => SEVERITY_RANK[b] - SEVERITY_RANK[a],
    ),
    top,
    hasEvidence: insights.some((insight) => insight.evidence.length > 0),
    ids: insights.map((insight) => insight.id),
  };
}

export function serializeRecommendationDebugInspectionReport(
  report: RecommendationDebugInspectionReport,
): string {
  return JSON.stringify(report, null, 2);
}
