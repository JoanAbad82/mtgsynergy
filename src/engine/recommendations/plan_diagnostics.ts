import type {
  ActionableInsightsInput,
  PlanDiagnostics,
  RecommendationEdge,
} from "./types";

const KEY_ROLES = ["ENGINE", "PAYOFF", "RAMP", "DRAW", "REMOVAL", "PROTECTION"] as const;
const HIGH_FRAGILITY_THRESHOLD = 35;
const LOW_DENSITY_THRESHOLD = 0.1;
const STRONG_RELATION_SCORE = 20;
const STRONG_RELATION_WEIGHT = 9;

function toFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeEdges(edges: RecommendationEdge[] | null | undefined): RecommendationEdge[] {
  if (!edges || edges.length === 0) return [];
  return edges
    .map((edge) => ({ ...edge }))
    .sort((a, b) => {
      const scoreA = toFiniteNumber(a.score) ?? 0;
      const scoreB = toFiniteNumber(b.score) ?? 0;
      if (scoreA !== scoreB) return scoreB - scoreA;

      const weightA = toFiniteNumber(a.weight) ?? 0;
      const weightB = toFiniteNumber(b.weight) ?? 0;
      if (weightA !== weightB) return weightB - weightA;

      if (a.from !== b.from) return a.from.localeCompare(b.from);
      if (a.to !== b.to) return a.to.localeCompare(b.to);
      return (a.kind ?? "").localeCompare(b.kind ?? "");
    });
}

function extractDominantRoles(roleCounts: Record<string, number>): string[] {
  const entries = Object.entries(roleCounts)
    .filter(([role, count]) => role !== "LAND" && count > 0)
    .sort((a, b) => {
      if (a[1] !== b[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    });
  return entries.slice(0, 3).map(([role]) => role);
}

function extractWeakRoles(roleCounts: Record<string, number>): string[] {
  const weak = KEY_ROLES.filter((role) => (roleCounts[role] ?? 0) <= 1);
  return [...weak].sort((a, b) => a.localeCompare(b));
}

function relationLine(edge: RecommendationEdge): string {
  const score = toFiniteNumber(edge.score) ?? 0;
  const weight = toFiniteNumber(edge.weight) ?? 0;
  return `${edge.from} -> ${edge.to} (score ${score.toFixed(1)}, x${weight.toFixed(0)})`;
}

function buildKeyPieces(edges: RecommendationEdge[]): string[] {
  const scoreByCard = new Map<string, number>();
  for (const edge of edges.slice(0, 10)) {
    const edgeScore = Math.max(0, toFiniteNumber(edge.score) ?? 0);
    scoreByCard.set(edge.from, (scoreByCard.get(edge.from) ?? 0) + edgeScore);
    scoreByCard.set(edge.to, (scoreByCard.get(edge.to) ?? 0) + edgeScore);
  }
  return Array.from(scoreByCard.entries())
    .sort((a, b) => {
      if (a[1] !== b[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    })
    .slice(0, 3)
    .map(([name]) => name);
}

export function buildPlanDiagnostics(input: ActionableInsightsInput): PlanDiagnostics {
  const summary = input.summary ?? null;
  const normalizedEdges = normalizeEdges(input.edges);
  const topRelations = normalizedEdges.slice(0, 5);

  const orphanListeners = input.semanticOverlay?.metrics?.orphan_listeners ?? [];
  const excessProducers = input.semanticOverlay?.metrics?.excess_producers ?? [];
  const semanticEvidence = [
    ...orphanListeners
      .slice(0, 3)
      .map((entry) => `${entry.explain ?? `key ${entry.key}`} (consumed ${entry.consumed})`),
    ...excessProducers
      .slice(0, 3)
      .map((entry) => `${entry.explain ?? `key ${entry.key}`} (produced ${entry.produced})`),
  ];
  const hasSemanticDisconnects = orphanListeners.length > 0 || excessProducers.length > 0;

  const baseSps = toFiniteNumber(input.monteCarlo?.base?.sps);
  const robustSps = toFiniteNumber(input.monteCarlo?.metrics?.robust_sps);
  const fragility = toFiniteNumber(input.monteCarlo?.metrics?.fragility);
  const effectiveN = toFiniteNumber(input.monteCarlo?.dist?.effective_n);
  const requestedN = toFiniteNumber(input.monteCarlo?.dist?.requested_n);

  const hasRobustnessCollapse = (baseSps ?? 0) > 0 && (robustSps ?? Number.POSITIVE_INFINITY) <= 0;
  const hasHighFragility = (fragility ?? 0) >= HIGH_FRAGILITY_THRESHOLD;
  const hasNoUsefulSamples = (requestedN ?? 0) > 0 && (effectiveN ?? 0) === 0;
  const hasFragilityRisk = hasRobustnessCollapse || hasHighFragility || hasNoUsefulSamples;

  const fragilityEvidence: string[] = [];
  if (baseSps != null) fragilityEvidence.push(`SPS base: ${baseSps.toFixed(1)}`);
  if (robustSps != null) fragilityEvidence.push(`SPS robusto: ${robustSps.toFixed(1)}`);
  if (fragility != null) fragilityEvidence.push(`Variación estimada: ${fragility.toFixed(1)}`);
  if (effectiveN != null && requestedN != null) {
    fragilityEvidence.push(`Muestras útiles: ${effectiveN}/${requestedN}`);
  }

  const hasStrongRelations = topRelations.some(
    (edge) =>
      (toFiniteNumber(edge.score) ?? 0) >= STRONG_RELATION_SCORE ||
      (toFiniteNumber(edge.weight) ?? 0) >= STRONG_RELATION_WEIGHT,
  );
  const relationEvidence = topRelations.slice(0, 3).map(relationLine);

  const density = toFiniteNumber(summary?.density);
  const edgesTotal = toFiniteNumber(summary?.edges_total);
  const sparseFlag = Boolean(summary?.diagnostics?.sparse_graph?.flag);
  const hasStructuralGaps =
    (edgesTotal ?? 0) === 0 ||
    (density != null && density <= LOW_DENSITY_THRESHOLD) ||
    sparseFlag;

  const structuralEvidence: string[] = [];
  if (edgesTotal != null) structuralEvidence.push(`Relaciones: ${edgesTotal.toFixed(0)}`);
  if (density != null) structuralEvidence.push(`Densidad: ${density.toFixed(3)}`);
  if (sparseFlag) structuralEvidence.push("Grafo estructural disperso");

  const roleCounts = summary?.role_counts ?? {};
  const dominantRoles = extractDominantRoles(roleCounts);
  const weakRoles = extractWeakRoles(roleCounts);

  return {
    hasFragilityRisk,
    hasStrongRelations,
    hasStructuralGaps,
    hasSemanticDisconnects,
    dominantRoles,
    weakRoles,
    topRelations,
    keyPieces: buildKeyPieces(topRelations),
    fragilityEvidence,
    structuralEvidence,
    semanticEvidence,
    relationEvidence,
  };
}
