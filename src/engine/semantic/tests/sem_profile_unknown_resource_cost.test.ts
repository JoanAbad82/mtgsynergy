import { describe, expect, it } from "vitest";
import { CostId, EventId, FrameKind, ResourceId } from "../contract";
import { buildSemanticCardProfile, keyOf, KeyKind } from "../overlay/sem_profile";

function buildCostProfile(text: string) {
  return buildSemanticCardProfile(
    {
      card_id: 1,
      frames: [
        {
          kind: FrameKind.ACTIVATED,
          watch: [],
          do: [],
          touch: [],
          gates: [],
          cost: [{ cost: CostId.SACRIFICE_AS_COST, res: ResourceId.UNKNOWN_RESOURCE }],
        },
      ],
    },
    text,
  );
}

describe("semantic profile: unknown resource on sacrifice cost", () => {
  it("reclasifica Food/Treasure y evita UNKNOWN_RESOURCE", () => {
    const cases = [
      { text: "Sacrifice a Food: Draw a card.", id: ResourceId.FOOD },
      { text: "Sacrifice a Treasure: Draw a card.", id: ResourceId.TREASURE },
    ];

    for (const testCase of cases) {
      const profile = buildCostProfile(testCase.text);
      const unknownKey = keyOf(KeyKind.RESOURCE, ResourceId.UNKNOWN_RESOURCE);
      const resourceKey = keyOf(KeyKind.RESOURCE, testCase.id);
      const entry = profile.consumed.get(resourceKey);
      expect(profile.consumed.has(unknownKey)).toBe(false);
      expect(entry?.origin).toBe("cost");
    }
  });

  it("mantiene SACRIFICE sin inventar recurso para criaturas", () => {
    const profile = buildCostProfile("Sacrifice a creature: Draw a card.");
    const unknownKey = keyOf(KeyKind.RESOURCE, ResourceId.UNKNOWN_RESOURCE);
    const sacrificeKey = keyOf(KeyKind.EVENT, EventId.SACRIFICE);
    expect(profile.consumed.has(unknownKey)).toBe(false);
    expect(profile.produced.has(sacrificeKey)).toBe(true);
  });
});
