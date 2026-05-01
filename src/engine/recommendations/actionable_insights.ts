import { buildPlanDiagnostics } from "./plan_diagnostics";
import type {
  ActionableInsight,
  ActionableInsightsInput,
  InsightSeverity,
} from "./types";

const SEVERITY_RANK: Record<InsightSeverity, number> = {
  critical: 3,
  warning: 2,
  info: 1,
};

function createInsight(insight: ActionableInsight): ActionableInsight {
  return {
    ...insight,
    evidence: [...insight.evidence],
    confidence: Math.max(0, Math.min(1, insight.confidence)),
  };
}

export function buildActionableInsights(input: ActionableInsightsInput): ActionableInsight[] {
  const diagnostics = buildPlanDiagnostics(input);
  const insights: ActionableInsight[] = [];

  if (diagnostics.hasFragilityRisk) {
    insights.push(
      createInsight({
        id: "fragility-core-min-v1",
        severity: "critical",
        theme: "fragility",
        title: "Fragilidad estructural bajo perturbación",
        recommendation:
          "Añade redundancia y efectos puente para que el plan no dependa de pocas piezas.",
        evidence: diagnostics.fragilityEvidence,
        confidence: 0.92,
      }),
    );
  }

  if (diagnostics.hasStrongRelations) {
    insights.push(
      createInsight({
        id: "supporting-relations-core-min-v1",
        severity: "info",
        theme: "supporting_relations",
        title: "Relaciones que sostienen el plan detectadas",
        recommendation:
          "Conserva estas líneas de apoyo como núcleo y evita recortes que las rompan simultáneamente.",
        evidence: diagnostics.relationEvidence,
        confidence: 0.78,
      }),
    );
  }

  if (diagnostics.keyPieces.length > 0) {
    insights.push(
      createInsight({
        id: "key-pieces-core-min-v1",
        severity: "info",
        theme: "key_pieces",
        title: "Piezas con mayor impacto estructural",
        recommendation:
          "Prioriza proteger o duplicar funciones equivalentes de estas piezas para estabilizar el plan.",
        evidence: diagnostics.keyPieces,
        confidence: 0.74,
      }),
    );
  }

  if (diagnostics.hasStructuralGaps) {
    insights.push(
      createInsight({
        id: "structural-gaps-core-min-v1",
        severity: "warning",
        theme: "structural_gaps",
        title: "Huecos estructurales en las conexiones del mazo",
        recommendation:
          "Introduce más enlaces funcionales entre motor, payoff y soporte para reducir dispersión.",
        evidence: diagnostics.structuralEvidence,
        confidence: 0.86,
      }),
    );
  }

  if (diagnostics.weakRoles.length > 0 || diagnostics.dominantRoles.length > 0) {
    const evidence = [
      diagnostics.dominantRoles.length > 0
        ? `Roles dominantes: ${diagnostics.dominantRoles.join(", ")}`
        : "Sin roles dominantes claros",
      diagnostics.weakRoles.length > 0
        ? `Roles a reforzar: ${diagnostics.weakRoles.join(", ")}`
        : "Sin roles débiles claros",
    ];
    insights.push(
      createInsight({
        id: "role-reinforcement-core-min-v1",
        severity: diagnostics.weakRoles.length > 0 ? "warning" : "info",
        theme: "role_reinforcement",
        title: "Balance de roles con margen de refuerzo",
        recommendation:
          "Refuerza roles poco representados con efectos equivalentes para reducir cuellos de botella.",
        evidence,
        confidence: diagnostics.weakRoles.length > 0 ? 0.83 : 0.67,
      }),
    );
  }

  if (diagnostics.hasSemanticDisconnects) {
    insights.push(
      createInsight({
        id: "semantic-disconnects-core-min-v1",
        severity: "warning",
        theme: "candidate_cards_to_review",
        title: "Señales semánticas sin conexión clara",
        recommendation:
          "Revisa piezas que producen o consumen señales huérfanas para alinearlas con el plan principal.",
        evidence: diagnostics.semanticEvidence,
        confidence: 0.8,
      }),
    );
  }

  return insights.sort((a, b) => {
    if (a.severity !== b.severity) {
      return SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
    }
    return a.id.localeCompare(b.id);
  });
}
