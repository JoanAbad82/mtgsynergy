import { describe, expect, test } from "vitest";
import {
  buildNameMapFromDeckState,
  explainEdgeKind,
  formatEdgeLine,
  groupEdgesForPanel,
} from "../AnalyzerApp";

describe("AnalyzerApp edges panel grouping", () => {
  test("groups edges by kind", () => {
    const edges = [
      {
        kind: "burn_supports_threat",
        from: "lightning strike",
        to: "monastery swiftspear",
        weight: 16,
        score: 28.8,
      },
      {
        kind: "anthem_supports_tokens",
        from: "glorious anthem",
        to: "krenko's command",
        weight: 6,
        score: 6.9,
      },
    ];

    const groups = groupEdgesForPanel(edges);
    expect(groups.length).toBe(2);
    expect(groups[0][0]).toBe("burn_supports_threat");
    expect(groups[1][0]).toBe("anthem_supports_tokens");
    expect(groups[0][1][0].from).toBe("lightning strike");
    const line = `${groups[0][1][0].from} → ${groups[0][1][0].to} (x${groups[0][1][0].weight ?? 0} | score ${groups[0][1][0].score ?? 0})`;
    expect(line).toContain("lightning strike → monastery swiftspear (x16 | score 28.8)");
    expect(`${groups[1][1][0].score ?? 0}`).toBe("6.9");
  });
});

describe("AnalyzerApp edges helpers", () => {
  test("explainEdgeKind burn", () => {
    expect(explainEdgeKind("burn_supports_threat")).toContain("Burn");
  });

  test("buildNameMapFromDeckState maps names", () => {
    const deckState = {
      deck: { entries: [{ name_norm: "lightning strike", name: "Lightning Strike", count: 4 }] },
    };
    const map = buildNameMapFromDeckState(deckState);
    expect(map.get("lightning strike")).toBe("Lightning Strike");
  });

  test("formatEdgeLine uses names and weight/score", () => {
    const edge = {
      kind: "burn_supports_threat",
      from: "lightning strike",
      to: "monastery swiftspear",
      weight: 16,
      score: 28.8,
    };
    const map = new Map<string, string>([
      ["lightning strike", "Lightning Strike"],
      ["monastery swiftspear", "Monastery Swiftspear"],
    ]);
    const line = formatEdgeLine(edge, map);
    expect(line).toContain("Lightning Strike → Monastery Swiftspear");
    expect(line).toContain("x16");
    expect(line).toContain("score 28.8");
  });

  test("formatEdgeLine handles missing values", () => {
    const edge = { from: "a", to: "b" };
    const map = new Map<string, string>();
    const line = formatEdgeLine(edge, map);
    expect(line).toContain("a → b");
    expect(line).toContain("x0");
    expect(line).toContain("score 0");
  });
});
