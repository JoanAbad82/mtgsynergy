import { describe, expect, test } from "vitest";
import type { CardFeatures } from "../cards/types";
import { generateEdges } from "../edges/generate";

function entry(
  name_norm: string,
  role_primary: "REMOVAL" | "PAYOFF" | "ENGINE" | "UTILITY",
  features: Partial<CardFeatures>,
) {
  return {
    name_norm,
    role_primary,
    features: features as CardFeatures,
  };
}

describe("edges v1", () => {
  test("burn supports threat + spells support prowess", () => {
    const edges = generateEdges([
      entry("lightning strike", "REMOVAL", { types: ["Instant"] }),
      entry("monastery swiftspear", "PAYOFF", {
        is_creature: true,
        is_low_cmc_creature: true,
        has_prowess: true,
      }),
    ]);

    const kinds = edges.map((e) => e.kind);
    expect(kinds).toContain("burn_supports_threat");
    expect(kinds).toContain("spells_support_prowess");
  });

  test("anthem supports tokens", () => {
    const edges = generateEdges([
      entry("glorious anthem", "ENGINE", { is_anthem: true }),
      entry("krenko's command", "UTILITY", { creates_tokens: true }),
    ]);

    const kinds = edges.map((e) => e.kind);
    expect(kinds).toContain("anthem_supports_tokens");
  });
});
