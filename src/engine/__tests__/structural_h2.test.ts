import { expect, test } from "vitest";
import type { DeckState } from "../domain/types";
import { computeStructuralSummary } from "../structural";
import { DEFAULT_PIPELINES_ACTIVE } from "../catalog/pipelines";

const deckWithCounts = (counts: Partial<Record<string, number>>): DeckState => {
  const entries = Object.entries(counts).map(([role, count]) => ({
    name: role,
    name_norm: role.toLowerCase(),
    count,
    role_primary: role as DeckState["deck"]["entries"][number]["role_primary"],
  }));
  return {
    deck: { entries },
  };
};

test("nodes_total always 8 with UTILITY-only deck", () => {
  const ds = deckWithCounts({ UTILITY: 60 });
  const summary = computeStructuralSummary(ds);
  expect(summary.nodes_total).toBe(8);
});

test("nodes_active counts roles with count > 0", () => {
  const ds = deckWithCounts({ ENGINE: 10, PAYOFF: 5, UTILITY: 45 });
  const summary = computeStructuralSummary(ds);
  expect(summary.nodes_active).toBe(3);
});

test("density with 0 edges and some edges", () => {
  const ds = deckWithCounts({ ENGINE: 30, PAYOFF: 30 });
  let summary = computeStructuralSummary(ds);
  expect(summary.density).toBe(0);

  summary = computeStructuralSummary({
    ...ds,
    edges: [
      { from: "ENGINE", to: "PAYOFF" },
      { from: "RAMP", to: "ENGINE" },
    ],
  });
  expect(summary.edges_total).toBe(2);
  expect(summary.density).toBeCloseTo(2 / (8 * 7));
});

test("sources/sinks with ENGINE->PAYOFF", () => {
  const ds = deckWithCounts({ ENGINE: 30, PAYOFF: 30 });
  const summary = computeStructuralSummary({
    ...ds,
    edges: [{ from: "ENGINE", to: "PAYOFF" }],
  });
  expect(summary.sources).toEqual(["ENGINE"]);
  expect(summary.sinks).toEqual(["PAYOFF"]);
});

test("cycles_present detects simple cycle", () => {
  const ds = deckWithCounts({ ENGINE: 30, PAYOFF: 30 });
  const summary = computeStructuralSummary({
    ...ds,
    edges: [
      { from: "ENGINE", to: "PAYOFF" },
      { from: "PAYOFF", to: "ENGINE" },
    ],
  });
  expect(summary.cycles_present).toBe(true);
});

test("components_weak returns two components", () => {
  const ds = deckWithCounts({ ENGINE: 10, PAYOFF: 10, RAMP: 10, DRAW: 10 });
  const summary = computeStructuralSummary({
    ...ds,
    edges: [
      { from: "ENGINE", to: "PAYOFF" },
      { from: "RAMP", to: "DRAW" },
    ],
  });
  expect(summary.components_weak.count).toBe(6);
  const components = summary.components_weak.components.map((c) => c.join(","));
  expect(components).toContain("ENGINE,PAYOFF");
  expect(components).toContain("RAMP,DRAW");
});

test("missing_roles_for_pipelines respects min_count", () => {
  const ds = deckWithCounts({ ENGINE: 10, PAYOFF: 10 });
  const summary = computeStructuralSummary({
    ...ds,
    pipelines_active: DEFAULT_PIPELINES_ACTIVE,
  });
  expect(summary.missing_roles_for_pipelines.length).toBeGreaterThan(0);
});

test("diagnostics sparse_graph and isolated_roles", () => {
  const ds = deckWithCounts({ ENGINE: 10, PAYOFF: 10 });
  const summary = computeStructuralSummary(ds);
  expect(summary.diagnostics.sparse_graph.flag).toBe(true);
  expect(summary.diagnostics.isolated_roles.roles).toEqual([
    "ENGINE",
    "PAYOFF",
  ]);
});
