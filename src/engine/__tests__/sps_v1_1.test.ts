import { describe, expect, test } from "vitest";
import type { StructuralSummary } from "../domain/types";
import { computeStructuralPowerScore } from "../structural/sps";

describe("SPS v1.1", () => {
  test("case A no utility penalty", () => {
    const edges = [
      { score: 28.8 },
      { score: 28.8 },
      { score: 28.8 },
      { score: 28.8 },
      { score: 17.6 },
      { score: 17.6 },
    ];
    const summary: StructuralSummary = {
      nodes_total: 8,
      nodes_active: 4,
      role_counts: {
        ENGINE: 8,
        PAYOFF: 10,
        RAMP: 0,
        DRAW: 0,
        REMOVAL: 8,
        PROTECTION: 0,
        LAND: 20,
        UTILITY: 6,
      },
      role_share: {
        ENGINE: 0,
        PAYOFF: 0,
        RAMP: 0,
        DRAW: 0,
        REMOVAL: 0,
        PROTECTION: 0,
        LAND: 0,
        UTILITY: 0,
      },
      edges_total: 0,
      density: 0.107,
      in_degree: {
        ENGINE: 0,
        PAYOFF: 0,
        RAMP: 0,
        DRAW: 0,
        REMOVAL: 0,
        PROTECTION: 0,
        LAND: 0,
        UTILITY: 0,
      },
      out_degree: {
        ENGINE: 0,
        PAYOFF: 0,
        RAMP: 0,
        DRAW: 0,
        REMOVAL: 0,
        PROTECTION: 0,
        LAND: 0,
        UTILITY: 0,
      },
      centrality_score: {
        ENGINE: 0,
        PAYOFF: 0,
        RAMP: 0,
        DRAW: 0,
        REMOVAL: 0,
        PROTECTION: 0,
        LAND: 0,
        UTILITY: 0,
      },
      sources: [],
      sinks: [],
      cycles_present: false,
      components_weak: { count: 1, components: [] },
      missing_roles_for_pipelines: [],
      diagnostics: {
        bottlenecks: { roles: [], max_centrality: 0 },
        low_redundancy: { roles: [], threshold: 4, only_one_active_role: false },
        sparse_graph: { flag: false, density: 0, threshold: 0 },
        isolated_roles: { roles: [] },
      },
    };

    const result = computeStructuralPowerScore(summary, edges);
    expect(result.breakdown.u).toBeCloseTo(0.1875, 5);
    expect(result.breakdown.F_util).toBe(1);
    expect(result.breakdown.B).toBeCloseTo(50.2, 1);
    expect(result.breakdown.F_dens).toBeCloseTo(1.327, 3);
    expect(result.breakdown.F_roles).toBeCloseTo(1.1483, 3);
    expect(result.sps).toBeCloseTo(76.5, 1);
  });

  test("case B utility penalty", () => {
    const edges = [{ score: 10 }];
    const summary: StructuralSummary = {
      nodes_total: 8,
      nodes_active: 2,
      role_counts: {
        ENGINE: 0,
        PAYOFF: 10,
        RAMP: 0,
        DRAW: 0,
        REMOVAL: 0,
        PROTECTION: 0,
        LAND: 0,
        UTILITY: 20,
      },
      role_share: {
        ENGINE: 0,
        PAYOFF: 0,
        RAMP: 0,
        DRAW: 0,
        REMOVAL: 0,
        PROTECTION: 0,
        LAND: 0,
        UTILITY: 0,
      },
      edges_total: 0,
      density: 0,
      in_degree: {
        ENGINE: 0,
        PAYOFF: 0,
        RAMP: 0,
        DRAW: 0,
        REMOVAL: 0,
        PROTECTION: 0,
        LAND: 0,
        UTILITY: 0,
      },
      out_degree: {
        ENGINE: 0,
        PAYOFF: 0,
        RAMP: 0,
        DRAW: 0,
        REMOVAL: 0,
        PROTECTION: 0,
        LAND: 0,
        UTILITY: 0,
      },
      centrality_score: {
        ENGINE: 0,
        PAYOFF: 0,
        RAMP: 0,
        DRAW: 0,
        REMOVAL: 0,
        PROTECTION: 0,
        LAND: 0,
        UTILITY: 0,
      },
      sources: [],
      sinks: [],
      cycles_present: false,
      components_weak: { count: 1, components: [] },
      missing_roles_for_pipelines: [],
      diagnostics: {
        bottlenecks: { roles: [], max_centrality: 0 },
        low_redundancy: { roles: [], threshold: 4, only_one_active_role: false },
        sparse_graph: { flag: false, density: 0, threshold: 0 },
        isolated_roles: { roles: [] },
      },
    };

    const result = computeStructuralPowerScore(summary, edges);
    expect(result.breakdown.u).toBeCloseTo(20 / 30, 5);
    expect(result.breakdown.F_util).toBeCloseTo(0.869, 3);
    expect(result.breakdown.B).toBeCloseTo(23.98, 2);
    expect(result.breakdown.F_dens).toBe(1);
    expect(result.breakdown.F_roles).toBeGreaterThan(1);
    expect(result.sps).toBeCloseTo(
      23.98 * result.breakdown.F_roles * result.breakdown.F_util,
      2,
    );
  });

  test("F_util is clamped at 0 for extreme utility ratio", () => {
    const edges = [{ score: 0 }];
    const summary: StructuralSummary = {
      nodes_total: 8,
      nodes_active: 1,
      role_counts: {
        ENGINE: 0,
        PAYOFF: 1,
        RAMP: 0,
        DRAW: 0,
        REMOVAL: 0,
        PROTECTION: 0,
        LAND: 0,
        UTILITY: 999999,
      },
      role_share: {
        ENGINE: 0,
        PAYOFF: 0,
        RAMP: 0,
        DRAW: 0,
        REMOVAL: 0,
        PROTECTION: 0,
        LAND: 0,
        UTILITY: 0,
      },
      edges_total: 0,
      density: 0,
      in_degree: {
        ENGINE: 0,
        PAYOFF: 0,
        RAMP: 0,
        DRAW: 0,
        REMOVAL: 0,
        PROTECTION: 0,
        LAND: 0,
        UTILITY: 0,
      },
      out_degree: {
        ENGINE: 0,
        PAYOFF: 0,
        RAMP: 0,
        DRAW: 0,
        REMOVAL: 0,
        PROTECTION: 0,
        LAND: 0,
        UTILITY: 0,
      },
      centrality_score: {
        ENGINE: 0,
        PAYOFF: 0,
        RAMP: 0,
        DRAW: 0,
        REMOVAL: 0,
        PROTECTION: 0,
        LAND: 0,
        UTILITY: 0,
      },
      sources: [],
      sinks: [],
      cycles_present: false,
      components_weak: { count: 1, components: [] },
      missing_roles_for_pipelines: [],
      diagnostics: {
        bottlenecks: { roles: [], max_centrality: 0 },
        low_redundancy: { roles: [], threshold: 4, only_one_active_role: false },
        sparse_graph: { flag: false, density: 0, threshold: 0 },
        isolated_roles: { roles: [] },
      },
    };

    const result = computeStructuralPowerScore(summary, edges);
    expect(result.breakdown.u).toBeCloseTo(999999 / 1000000, 6);
    expect(result.breakdown.F_util).toBeGreaterThanOrEqual(0);
    expect(result.breakdown.F_util).toBeCloseTo(0.75, 2);
  });
});
