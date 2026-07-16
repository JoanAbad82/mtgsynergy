import { describe, expect, it } from "vitest";
import { selectDeckSemanticAnchors } from "../deck_context";

describe("deck-context anchor selection", () => {
  it("is bounded and deterministic", () => {
    const entries = Array.from({ length: 10 }, (_, index) => ({
      name: `Card ${index}`,
      name_norm: `card ${index}`,
      count: index + 1,
      role_primary: "UNKNOWN" as const,
    }));
    const first = selectDeckSemanticAnchors({ entries, edges: [], idToName: {} });
    const second = selectDeckSemanticAnchors({ entries: [...entries].reverse(), edges: [], idToName: {} });
    expect(first).toHaveLength(8);
    expect(first.map((x) => x.nameNorm)).toEqual(second.map((x) => x.nameNorm));
  });
});
