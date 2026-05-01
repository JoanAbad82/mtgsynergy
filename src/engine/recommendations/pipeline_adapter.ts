import type { StructuralSummary } from "../domain/types";
import { buildActionableInsights } from "./actionable_insights";
import type {
  ActionableInsight,
  ActionableInsightsInput,
  RecommendationEdge,
  RecommendationIssue,
  RecommendationMonteCarlo,
  RecommendationSemanticOverlay,
} from "./types";

export type RecommendationsPipelineAdapterInput = {
  deckState?: unknown | null;
  summary?: StructuralSummary | null;
  edges?: unknown[] | null;
  semanticOverlay?: unknown | null;
  monteCarlo?: unknown | null;
  issues?: unknown[] | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object";
}

function toFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function toNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function adaptEdges(rawEdges: unknown[] | null | undefined): RecommendationEdge[] {
  if (!rawEdges || rawEdges.length === 0) return [];

  const adapted: RecommendationEdge[] = [];
  for (const candidate of rawEdges) {
    if (!isRecord(candidate)) continue;

    const from = toNonEmptyString(candidate.from);
    const to = toNonEmptyString(candidate.to);
    if (!from || !to) continue;

    const edge: RecommendationEdge = { from, to };
    const kind = toNonEmptyString(candidate.kind);
    if (kind) edge.kind = kind;

    const weight = toFiniteNumber(candidate.weight);
    if (weight !== undefined) edge.weight = weight;

    const score = toFiniteNumber(candidate.score);
    if (score !== undefined) edge.score = score;

    adapted.push(edge);
  }

  return adapted;
}

function extractDeckStateEdges(deckState: unknown | null | undefined): unknown[] {
  if (!isRecord(deckState)) return [];
  return Array.isArray(deckState.edges) ? deckState.edges : [];
}

function adaptOrphanListeners(
  raw: unknown,
): Array<{ key: number; consumed: number; explain?: string }> | undefined {
  if (!Array.isArray(raw)) return undefined;
  const adapted = raw
    .map((entry) => {
      if (!isRecord(entry)) return null;
      const key = toFiniteNumber(entry.key);
      const consumed = toFiniteNumber(entry.consumed);
      if (key === undefined || consumed === undefined) return null;
      const explain = toNonEmptyString(entry.explain);
      return explain ? { key, consumed, explain } : { key, consumed };
    })
    .filter((entry): entry is { key: number; consumed: number; explain?: string } => entry !== null);

  return adapted.length > 0 ? adapted : undefined;
}

function adaptExcessProducers(
  raw: unknown,
): Array<{ key: number; produced: number; explain?: string }> | undefined {
  if (!Array.isArray(raw)) return undefined;
  const adapted = raw
    .map((entry) => {
      if (!isRecord(entry)) return null;
      const key = toFiniteNumber(entry.key);
      const produced = toFiniteNumber(entry.produced);
      if (key === undefined || produced === undefined) return null;
      const explain = toNonEmptyString(entry.explain);
      return explain ? { key, produced, explain } : { key, produced };
    })
    .filter((entry): entry is { key: number; produced: number; explain?: string } => entry !== null);

  return adapted.length > 0 ? adapted : undefined;
}

function adaptRedundancyGroups(
  raw: unknown,
): Array<{ signature: string; card_ids: number[]; size: number }> | undefined {
  if (!Array.isArray(raw)) return undefined;
  const adapted = raw
    .map((entry) => {
      if (!isRecord(entry)) return null;
      const signature = toNonEmptyString(entry.signature);
      const size = toFiniteNumber(entry.size);
      const cardIds = Array.isArray(entry.card_ids)
        ? entry.card_ids.filter((id): id is number => typeof id === "number" && Number.isFinite(id))
        : [];
      if (!signature || size === undefined) return null;
      return { signature, card_ids: cardIds, size };
    })
    .filter(
      (entry): entry is { signature: string; card_ids: number[]; size: number } => entry !== null,
    );

  return adapted.length > 0 ? adapted : undefined;
}

function adaptSemanticOverlay(rawOverlay: unknown): RecommendationSemanticOverlay | null {
  if (!isRecord(rawOverlay) || !isRecord(rawOverlay.metrics)) return null;

  const orphanListeners = adaptOrphanListeners(rawOverlay.metrics.orphan_listeners);
  const excessProducers = adaptExcessProducers(rawOverlay.metrics.excess_producers);
  const redundancyGroups = adaptRedundancyGroups(rawOverlay.metrics.redundancy_groups);
  const SOS = toFiniteNumber(rawOverlay.metrics.SOS);

  if (!orphanListeners && !excessProducers && !redundancyGroups && SOS === undefined) {
    return null;
  }

  const metrics: NonNullable<RecommendationSemanticOverlay["metrics"]> = {};
  if (orphanListeners) metrics.orphan_listeners = orphanListeners;
  if (excessProducers) metrics.excess_producers = excessProducers;
  if (redundancyGroups) metrics.redundancy_groups = redundancyGroups;
  if (SOS !== undefined) metrics.SOS = SOS;

  return { metrics };
}

function adaptMonteCarlo(rawMonteCarlo: unknown): RecommendationMonteCarlo | null {
  if (!isRecord(rawMonteCarlo)) return null;

  const baseRecord = isRecord(rawMonteCarlo.base) ? rawMonteCarlo.base : null;
  const metricsRecord = isRecord(rawMonteCarlo.metrics) ? rawMonteCarlo.metrics : null;
  const distRecord = isRecord(rawMonteCarlo.dist) ? rawMonteCarlo.dist : null;

  const baseSps = toFiniteNumber(baseRecord?.sps);
  const robustSps = toFiniteNumber(metricsRecord?.robust_sps);
  const fragility = toFiniteNumber(metricsRecord?.fragility);
  const effectiveN = toFiniteNumber(distRecord?.effective_n);
  const requestedN = toFiniteNumber(distRecord?.requested_n);
  const noOp = toFiniteNumber(distRecord?.no_op);

  if (
    baseSps === undefined &&
    robustSps === undefined &&
    fragility === undefined &&
    effectiveN === undefined &&
    requestedN === undefined &&
    noOp === undefined
  ) {
    return null;
  }

  const adapted: RecommendationMonteCarlo = {};
  if (baseSps !== undefined) adapted.base = { sps: baseSps };
  if (robustSps !== undefined || fragility !== undefined) {
    adapted.metrics = {};
    if (robustSps !== undefined) adapted.metrics.robust_sps = robustSps;
    if (fragility !== undefined) adapted.metrics.fragility = fragility;
  }
  if (effectiveN !== undefined || requestedN !== undefined || noOp !== undefined) {
    adapted.dist = {};
    if (effectiveN !== undefined) adapted.dist.effective_n = effectiveN;
    if (requestedN !== undefined) adapted.dist.requested_n = requestedN;
    if (noOp !== undefined) adapted.dist.no_op = noOp;
  }

  return adapted;
}

function adaptIssues(rawIssues: unknown[] | null | undefined): RecommendationIssue[] | null {
  if (!rawIssues || rawIssues.length === 0) return null;

  const adapted = rawIssues
    .map((issue) => {
      if (!isRecord(issue)) return null;
      const code = toNonEmptyString(issue.code);
      if (!code) return null;

      const normalized: RecommendationIssue = { code };
      const severity = toNonEmptyString(issue.severity);
      if (severity) normalized.severity = severity;

      const message = toNonEmptyString(issue.message);
      if (message) normalized.message = message;

      return normalized;
    })
    .filter((issue): issue is RecommendationIssue => issue !== null);

  return adapted.length > 0 ? adapted : null;
}

export function buildActionableInsightsFromPipeline(
  input: RecommendationsPipelineAdapterInput,
): ActionableInsight[] {
  const rawEdges =
    Array.isArray(input.edges) && input.edges.length > 0
      ? input.edges
      : extractDeckStateEdges(input.deckState);

  const adaptedInput: ActionableInsightsInput = {
    summary: input.summary ?? null,
    edges: adaptEdges(rawEdges),
    semanticOverlay: adaptSemanticOverlay(input.semanticOverlay),
    monteCarlo: adaptMonteCarlo(input.monteCarlo),
    issues: adaptIssues(input.issues),
  };

  return buildActionableInsights(adaptedInput);
}
