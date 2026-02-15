import type { DeckState, Role } from "../domain/types";
import type { StructuralSummary } from "../domain/types";
import { computeRoleCounts, computeRoleShare, ROLE_ORDER } from "./counts";
import {
  buildRoleGraph,
  computeCentrality,
  computeComponentsWeak,
  computeInOutDegree,
  computeSourcesSinks,
  detectCyclesDirected,
} from "./graph";
import { missingRolesForPipelines } from "./pipelines";
import { computeDiagnostics } from "./diagnostics";
import { computeTotalCards } from "../validate/validate";

export type { Diagnostics } from "./diagnostics";
export type {
  MissingRole,
  MissingRolesForPipeline,
} from "./pipelines";

export function computeStructuralSummary(ds: DeckState): StructuralSummary {
  const nodes_total = ROLE_ORDER.length;
  const role_counts = computeRoleCounts(ds.deck);
  const total_cards = computeTotalCards(ds.deck);
  const role_share = computeRoleShare(role_counts, total_cards);
  const nodes_active = ROLE_ORDER.filter((role) => role_counts[role] > 0).length;

  const graph = buildRoleGraph(ds.edges ?? []);
  const edges_total = graph.edges.length;
  const density =
    nodes_total > 1
      ? edges_total / (nodes_total * (nodes_total - 1))
      : 0;

  const { in_degree, out_degree } = computeInOutDegree(graph.edges);
  const centrality_score = computeCentrality(in_degree, out_degree);
  const { sources, sinks } = computeSourcesSinks(in_degree, out_degree);
  const cycles_present = detectCyclesDirected(graph.edges);
  const components_weak = computeComponentsWeak(graph.edges);
  const missing_roles_for_pipelines = missingRolesForPipelines(
    ds,
    role_counts,
  );

  const diagnostics = computeDiagnostics({
    role_counts,
    centrality_score,
    in_degree,
    out_degree,
    density,
    nodes_active,
  });

  return {
    nodes_total,
    nodes_active,
    role_counts,
    role_share,
    edges_total,
    density,
    in_degree,
    out_degree,
    centrality_score,
    sources,
    sinks,
    cycles_present,
    components_weak,
    missing_roles_for_pipelines,
    diagnostics,
  };
}
