import { describe, expect, it } from "vitest";
import { buildCandidateAnchorSemanticConnections } from "../deck_context";

describe("deck-context candidate-anchor semantic connections", () => {
  it("preserves productive cross-edge evidence and excludes a negative pair", async () => {
    const positive = await buildCandidateAnchorSemanticConnections({
      candidate: {
        name: "Impact Tremors",
        typeLine: "Enchantment",
        oracleText:
          "Whenever a creature enters the battlefield under your control, Impact Tremors deals 1 damage to each opponent.",
      },
      anchors: [
        {
          key: "name:krenko, mob boss",
          name: "Krenko, Mob Boss",
          nameNorm: "krenko, mob boss",
          count: 1,
          typeLine: "Legendary Creature — Goblin Warrior",
          oracleText:
            "{T}: Create X 1/1 red Goblin creature tokens, where X is the number of Goblins you control.",
          rank: 0,
          evidence: "supported",
        },
      ],
    });

    expect(positive.connections.length).toBeGreaterThan(0);
    expect(positive.connections[0].primaryScore).toBeGreaterThan(0);
    expect(positive.connections[0].reasons.length).toBeGreaterThan(0);
    expect(positive.connections[0].directions.every((edge) => edge.from !== edge.to)).toBe(true);

    const negative = await buildCandidateAnchorSemanticConnections({
      candidate: {
        name: "Colossal Dreadmaw",
        typeLine: "Creature — Dinosaur",
        oracleText: "Trample",
      },
      anchors: [
        {
          key: "name:guttersnipe",
          name: "Guttersnipe",
          nameNorm: "guttersnipe",
          count: 4,
          typeLine: "Creature — Goblin Shaman",
          oracleText:
            "Whenever you cast an instant or sorcery spell, Guttersnipe deals 2 damage to each opponent.",
          rank: 0,
          evidence: "supported",
        },
      ],
    });

    expect(negative.connections).toHaveLength(0);
    expect(
      negative.degradations.some((item) => item.reason === "no_cross_edge"),
    ).toBe(true);
  });
});
