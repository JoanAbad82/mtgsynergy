import { describe, expect, test } from "vitest";
import type { StructuralSummary } from "../domain/types";
import { buildActionableInsights } from "../recommendations";

function makeSummary(
  overrides: Partial<StructuralSummary> = {},
): StructuralSummary {
  return {
    nodes_total: 8,
    nodes_active: 3,
    role_counts: {
      ENGINE: 8,
      PAYOFF: 7,
      RAMP: 4,
      DRAW: 3,
      REMOVAL: 5,
      PROTECTION: 1,
      LAND: 24,
      UTILITY: 8,
    },
    role_share: {
      ENGINE: 0.133,
      PAYOFF: 0.117,
      RAMP: 0.067,
      DRAW: 0.05,
      REMOVAL: 0.083,
      PROTECTION: 0.017,
      LAND: 0.4,
      UTILITY: 0.133,
    },
    edges_total: 12,
    density: 0.214,
    in_degree: {
      ENGINE: 2,
      PAYOFF: 3,
      RAMP: 1,
      DRAW: 2,
      REMOVAL: 2,
      PROTECTION: 1,
      LAND: 0,
      UTILITY: 1,
    },
    out_degree: {
      ENGINE: 3,
      PAYOFF: 1,
      RAMP: 2,
      DRAW: 2,
      REMOVAL: 2,
      PROTECTION: 1,
      LAND: 0,
      UTILITY: 1,
    },
    centrality_score: {
      ENGINE: 5,
      PAYOFF: 4,
      RAMP: 3,
      DRAW: 4,
      REMOVAL: 4,
      PROTECTION: 2,
      LAND: 0,
      UTILITY: 2,
    },
    sources: ["RAMP"],
    sinks: ["PAYOFF"],
    cycles_present: true,
    components_weak: { count: 1, components: [["ENGINE", "PAYOFF"]] },
    missing_roles_for_pipelines: [],
    diagnostics: {
      bottlenecks: { roles: ["ENGINE"], max_centrality: 5 },
      low_redundancy: { roles: ["PROTECTION"], threshold: 4, only_one_active_role: false },
      sparse_graph: { flag: false, density: 0.214, threshold: 0.1 },
      isolated_roles: { roles: [] },
    },
    ...overrides,
  };
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value as Record<string, unknown>)) {
      const nested = (value as Record<string, unknown>)[key];
      if (nested && typeof nested === "object") {
        deepFreeze(nested);
      }
    }
  }
  return value;
}

describe("ACTIONABLE_RECOMMENDATIONS_CORE_MIN_V1", () => {
  test("emits fragility insight when robust_sps collapses with positive base", () => {
    const insights = buildActionableInsights({
      summary: makeSummary(),
      edges: [{ from: "a", to: "b", score: 12, weight: 4 }],
      monteCarlo: {
        base: { sps: 107.6 },
        metrics: { robust_sps: 0, fragility: 50 },
        dist: { effective_n: 1000, requested_n: 1000, no_op: 0 },
      },
    });

    expect(insights.some((insight) => insight.theme === "fragility")).toBe(true);
  });

  test("emits supporting_relations insight when high-scoring relations exist", () => {
    const insights = buildActionableInsights({
      summary: makeSummary(),
      edges: [
        { from: "lightning strike", to: "swiftspear", score: 28.8, weight: 16 },
        { from: "play with fire", to: "adversary", score: 22.2, weight: 12 },
      ],
    });

    expect(insights.some((insight) => insight.theme === "supporting_relations")).toBe(true);
  });

  test("emits structural_gaps insight for decks without relations", () => {
    const insights = buildActionableInsights({
      summary: makeSummary({
        edges_total: 0,
        density: 0,
        diagnostics: {
          bottlenecks: { roles: ["ENGINE"], max_centrality: 0 },
          low_redundancy: { roles: ["ENGINE", "PAYOFF"], threshold: 4, only_one_active_role: false },
          sparse_graph: { flag: true, density: 0, threshold: 0.1 },
          isolated_roles: { roles: ["ENGINE", "PAYOFF"] },
        },
      }),
      edges: [],
    });

    expect(insights.some((insight) => insight.theme === "structural_gaps")).toBe(true);
  });

  test("emits semantic disconnect insight when orphan/excess signals are present", () => {
    const insights = buildActionableInsights({
      summary: makeSummary(),
      edges: [{ from: "a", to: "b", score: 12, weight: 4 }],
      semanticOverlay: {
        metrics: {
          orphan_listeners: [{ key: 1001, consumed: 2, explain: "EVENT:CREATURE_DIES" }],
          excess_producers: [{ key: 2001, produced: 3, explain: "ACTION:CREATE_TOKEN" }],
        },
      },
    });

    expect(insights.some((insight) => insight.theme === "candidate_cards_to_review")).toBe(true);
  });

  test("is deterministic and does not mutate frozen inputs", () => {
    const input = {
      summary: makeSummary(),
      edges: [
        { from: "a", to: "b", score: 28.8, weight: 16, kind: "burn_supports_threat" },
        { from: "c", to: "d", score: 10, weight: 3, kind: "spells_support_prowess" },
      ],
      semanticOverlay: {
        metrics: {
          orphan_listeners: [{ key: 3001, consumed: 1, explain: "EVENT:LIFE_GAIN" }],
          excess_producers: [],
        },
      },
      monteCarlo: {
        base: { sps: 107.6 },
        metrics: { robust_sps: 40, fragility: 12 },
        dist: { effective_n: 1000, requested_n: 1000, no_op: 0 },
      },
      issues: [{ code: "TAGGING_ACTIVE", severity: "info", message: "ok" }],
    };

    const frozenInput = deepFreeze(input);
    const snapshot = JSON.stringify(frozenInput);

    const first = buildActionableInsights(frozenInput);
    const second = buildActionableInsights(frozenInput);

    expect(first).toEqual(second);
    expect(JSON.stringify(frozenInput)).toBe(snapshot);
  });
});
