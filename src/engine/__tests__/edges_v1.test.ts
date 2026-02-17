import { describe, expect, test } from "vitest";
import type { CardFeatures } from "../cards/types";
import { generateEdges } from "../edges/generate";

function entry(
  name_norm: string,
  role_primary: "REMOVAL" | "PAYOFF" | "ENGINE" | "UTILITY",
  count: number,
  features: Partial<CardFeatures>,
) {
  return {
    name_norm,
    role_primary,
    count,
    features: features as CardFeatures,
  };
}

describe("edges v1", () => {
  test("burn supports threat + spells support prowess", () => {
    const edges = generateEdges([
      entry("lightning strike", "REMOVAL", 4, { types: ["Instant"] }),
      entry("bloodthirsty adversary", "PAYOFF", 4, {
        is_creature: true,
        is_low_cmc_creature: true,
        has_prowess: true,
      }),
    ]);

    const kinds = edges.map((e) => e.kind);
    expect(kinds).toContain("burn_supports_threat");
    expect(kinds).toContain("spells_support_prowess");
    const burnEdge = edges.find((e) => e.kind === "burn_supports_threat");
    expect(burnEdge?.weight).toBe(16);
    expect(burnEdge?.score).toBeCloseTo(28.8, 5);
  });

  test("anthem supports tokens", () => {
    const edges = generateEdges([
      entry("glorious anthem", "ENGINE", 2, { is_anthem: true }),
      entry("krenko's command", "UTILITY", 3, { creates_tokens: true }),
    ]);

    const kinds = edges.map((e) => e.kind);
    expect(kinds).toContain("anthem_supports_tokens");
    const anthemEdge = edges.find((e) => e.kind === "anthem_supports_tokens");
    expect(anthemEdge?.weight).toBe(6);
    expect(anthemEdge?.score).toBeCloseTo(6 * 1.15, 5);
  });

  test("spells support prowess score", () => {
    const edges = generateEdges([
      entry("play with fire", "REMOVAL", 4, { types: ["Instant"] }),
      entry("monastery swiftspear", "PAYOFF", 4, {
        is_creature: true,
        is_low_cmc_creature: true,
        has_prowess: true,
      }),
    ]);
    const spellEdge = edges.find((e) => e.kind === "spells_support_prowess");
    expect(spellEdge?.weight).toBe(16);
    expect(spellEdge?.score).toBeCloseTo(26.4, 5);
  });
});
