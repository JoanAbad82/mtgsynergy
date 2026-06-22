import { describe, expect, test } from "vitest";
import type { CardEntry, Role } from "../domain/types";
import type { Edge } from "../edges/types";
import { computeStructuralSummary } from "../structural";
import { projectCardEdgesToRoleEdges } from "../structural/project_card_edges_to_role_edges";

const entries: CardEntry[] = [
  { name: "Burn A", name_norm: "burn a", count: 4, role_primary: "REMOVAL" },
  { name: "Burn B", name_norm: "burn b", count: 4, role_primary: "REMOVAL" },
  { name: "Threat A", name_norm: "threat a", count: 4, role_primary: "PAYOFF" },
  { name: "Threat B", name_norm: "threat b", count: 4, role_primary: "PAYOFF" },
  { name: "Engine A", name_norm: "engine a", count: 4, role_primary: "ENGINE" },
  { name: "Engine B", name_norm: "engine b", count: 4, role_primary: "ENGINE" },
  { name: "Land", name_norm: "land", count: 20, role_primary: "LAND" },
];

const edges: Edge[] = [
  { kind: "burn_supports_threat", from: "burn a", to: "threat a", weight: 16, score: 28.8 },
  { kind: "burn_supports_threat", from: "burn a", to: "threat b", weight: 16, score: 28.8 },
  { kind: "burn_supports_threat", from: "burn b", to: "threat a", weight: 16, score: 28.8 },
  { kind: "burn_supports_threat", from: "burn b", to: "threat b", weight: 16, score: 28.8 },
  { kind: "spells_support_prowess", from: "burn a", to: "engine a", weight: 16, score: 26.4 },
  { kind: "spells_support_prowess", from: "burn b", to: "engine b", weight: 16, score: 26.4 },
  { kind: "spells_support_prowess", from: "engine a", to: "engine b", weight: 16, score: 26.4 },
  { kind: "spells_support_prowess", from: "missing", to: "engine b", weight: 1, score: 1 },
];

describe("ROLE_GRAPH_CARD_EDGE_TO_ROLE_EDGE_PROJECTION_V1", () => {
  test("projects exact card endpoints to roles without mutation or deduplication", () => {
    const entriesBefore = JSON.stringify(entries);
    const edgesBefore = JSON.stringify(edges);

    const projected = projectCardEdgesToRoleEdges(entries, edges);

    expect(projected).toEqual([
      { from: "REMOVAL", to: "PAYOFF", weight: 16 },
      { from: "REMOVAL", to: "PAYOFF", weight: 16 },
      { from: "REMOVAL", to: "PAYOFF", weight: 16 },
      { from: "REMOVAL", to: "PAYOFF", weight: 16 },
      { from: "REMOVAL", to: "ENGINE", weight: 16 },
      { from: "REMOVAL", to: "ENGINE", weight: 16 },
      { from: "ENGINE", to: "ENGINE", weight: 16 },
    ]);

    expect(JSON.stringify(entries)).toBe(entriesBefore);
    expect(JSON.stringify(edges)).toBe(edgesBefore);
  });

  test("feeds only finite role-domain values to the structural summary", () => {
    const projected = projectCardEdgesToRoleEdges(entries, edges);
    const summary = computeStructuralSummary({
      deck: { entries },
      edges: projected,
    });

    expect(summary.edges_total).toBe(7);
    expect(summary.density).toBeCloseTo(7 / (8 * 7));

    const roleOrder: Role[] = [
      "ENGINE",
      "PAYOFF",
      "RAMP",
      "DRAW",
      "REMOVAL",
      "PROTECTION",
      "LAND",
      "UTILITY",
    ];

    for (const role of roleOrder) {
      expect(Number.isFinite(summary.in_degree[role])).toBe(true);
      expect(Number.isFinite(summary.out_degree[role])).toBe(true);
      expect(Number.isFinite(summary.centrality_score[role])).toBe(true);
    }

    expect(summary.out_degree.REMOVAL).toBe(6);
    expect(summary.in_degree.PAYOFF).toBe(4);
    expect(summary.centrality_score.REMOVAL).toBeGreaterThan(0);
    expect(summary.centrality_score.PAYOFF).toBeGreaterThan(0);
    expect(JSON.stringify(summary)).not.toContain(":null");
  });
});
