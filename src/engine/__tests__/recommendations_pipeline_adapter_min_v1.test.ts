import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import type { StructuralSummary } from "../domain/types";
import { buildActionableInsightsFromPipeline } from "../recommendations";

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

const here = dirname(fileURLToPath(import.meta.url));
const adapterSourcePath = join(
  here,
  "../recommendations/pipeline_adapter.ts",
);

describe("RECOMMENDATIONS_PIPELINE_ADAPTER_MIN_V1", () => {
  test("adapts edges from input.edges and emits supporting_relations insight", () => {
    const insights = buildActionableInsightsFromPipeline({
      summary: makeSummary(),
      edges: [
        { from: "lightning strike", to: "monastery swiftspear", score: 28.8, weight: 16 },
      ],
    });

    expect(insights.some((insight) => insight.theme === "supporting_relations")).toBe(true);
  });

  test("adapts edges from deckState.edges when input.edges is missing", () => {
    const insights = buildActionableInsightsFromPipeline({
      summary: makeSummary(),
      deckState: {
        edges: [
          { from: "play with fire", to: "slickshot show-off", score: 24.2, weight: 12 },
        ],
      },
    });

    expect(insights.some((insight) => insight.theme === "supporting_relations")).toBe(true);
  });

  test("adapts montecarlo shape and emits fragility insight", () => {
    const insights = buildActionableInsightsFromPipeline({
      summary: makeSummary(),
      monteCarlo: {
        base: { sps: 107.6 },
        metrics: { robust_sps: 0, fragility: 50 },
        dist: { effective_n: 1000, requested_n: 1000, no_op: 0 },
      },
    });

    expect(insights.some((insight) => insight.theme === "fragility")).toBe(true);
  });

  test("adapts semantic overlay metrics and emits candidate_cards_to_review insight", () => {
    const insights = buildActionableInsightsFromPipeline({
      summary: makeSummary(),
      semanticOverlay: {
        metrics: {
          orphan_listeners: [{ key: 1001, consumed: 2, explain: "EVENT:CREATURE_DIES" }],
          excess_producers: [{ key: 2001, produced: 3, explain: "ACTION:CREATE_TOKEN" }],
          redundancy_groups: [{ signature: "sig:dies", card_ids: [11, 22], size: 2 }],
          SOS: 1.2,
        },
      },
    });

    expect(insights.some((insight) => insight.theme === "candidate_cards_to_review")).toBe(true);
  });

  test("returns an array and does not crash on empty input", () => {
    const insights = buildActionableInsightsFromPipeline({});
    expect(Array.isArray(insights)).toBe(true);
  });

  test("ignores invalid edges without crashing", () => {
    const insights = buildActionableInsightsFromPipeline({
      summary: makeSummary(),
      edges: [
        { from: 10, to: "x" },
        { from: "x", to: null },
        { to: "missing-from" },
        null,
        "bad-edge",
        { from: "invalid-score", to: "target", score: "40", weight: 12 },
        { from: "valid", to: "target", score: 30, weight: 10 },
      ],
    });

    expect(insights.some((insight) => insight.theme === "supporting_relations")).toBe(true);
  });

  test("is deterministic and does not mutate frozen input", () => {
    const input = deepFreeze({
      summary: makeSummary(),
      deckState: {
        edges: [{ from: "a", to: "b", score: 21, weight: 9, kind: "burn_supports_threat" }],
      },
      semanticOverlay: {
        metrics: {
          orphan_listeners: [{ key: 3001, consumed: 1, explain: "EVENT:LIFE_GAIN" }],
        },
      },
      monteCarlo: {
        base: { sps: 107.6 },
        metrics: { robust_sps: 40, fragility: 12 },
        dist: { effective_n: 1000, requested_n: 1000, no_op: 0 },
      },
      issues: [{ code: "TAGGING_ACTIVE", severity: "info", message: "ok" }],
    });
    const snapshot = JSON.stringify(input);

    const first = buildActionableInsightsFromPipeline(input);
    const second = buildActionableInsightsFromPipeline(input);

    expect(first).toEqual(second);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  test("does not import forbidden runtime calculation dependencies", () => {
    const source = readFileSync(adapterSourcePath, "utf8");
    const forbiddenTokens = [
      "generateEdges",
      "computeStructuralPowerScore",
      "runMonteCarloV1",
      "parseMtgaExport",
      "lookupCard",
      "../parser",
      "../cards",
      "../cards_index",
      "../montecarlo",
      "../structural/sps",
      "../edges/generate",
      "../../components",
      "../../pages",
    ];

    for (const token of forbiddenTokens) {
      expect(source.includes(token)).toBe(false);
    }
  });
});
