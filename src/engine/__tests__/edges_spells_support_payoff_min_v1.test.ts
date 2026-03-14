import { describe, expect, test } from "vitest";
import type { CardFeatures } from "../cards/types";
import type { Role } from "../domain/types";
import { generateEdges } from "../edges/generate";

function entry(
  name_norm: string,
  role_primary: Role,
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

describe("edges spells_support_prowess payoff microphase v1", () => {
  test("connects spell support cards to PAYOFF spell-matter target", () => {
    const edges = generateEdges([
      entry("opt", "DRAW", 4, { types: ["Instant"] }),
      entry("shock", "REMOVAL", 4, { types: ["Instant"] }),
      entry("guttersnipe", "PAYOFF", 4, { cares_about_spells: true }),
    ]);

    const spellsToGuttersnipe = edges.filter(
      (e) => e.kind === "spells_support_prowess" && e.to === "guttersnipe",
    );
    expect(spellsToGuttersnipe.length).toBeGreaterThan(0);
    expect(spellsToGuttersnipe).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "spells_support_prowess",
          from: "opt",
          to: "guttersnipe",
          weight: 16,
        }),
        expect.objectContaining({
          kind: "spells_support_prowess",
          from: "shock",
          to: "guttersnipe",
          weight: 16,
        }),
      ]),
    );
  });

  test("does not connect to PAYOFF target without spells-matter flag", () => {
    const edges = generateEdges([
      entry("opt", "DRAW", 4, { types: ["Instant"] }),
      entry("shock", "REMOVAL", 4, { types: ["Instant"] }),
      entry("generic payoff", "PAYOFF", 4, { cares_about_spells: false }),
    ]);

    const forbiddenEdge = edges.find(
      (e) => e.kind === "spells_support_prowess" && e.to === "generic payoff",
    );
    expect(forbiddenEdge).toBeUndefined();
  });

  test("keeps historical prowess target behavior when cares_about_spells is false", () => {
    const edges = generateEdges([
      entry("consider", "DRAW", 4, { types: ["Instant"] }),
      entry("monastery swiftspear", "PAYOFF", 4, {
        has_prowess: true,
        cares_about_spells: false,
      }),
    ]);

    const prowessEdge = edges.find(
      (e) =>
        e.kind === "spells_support_prowess" &&
        e.from === "consider" &&
        e.to === "monastery swiftspear",
    );
    expect(prowessEdge).toBeDefined();
    expect(prowessEdge?.weight).toBe(16);
  });
});
