import { describe, expect, test } from "vitest";
import { buildNameMapFromDeckState, BUILD_SHA, explainEdgeKind, formatEdgeLine, formatNumberCompact, getSpsNumber, groupEdgesForPanel, parseMcParams } from "../AnalyzerApp";

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

  test("formatEdgeLine rounds noisy float score", () => {
    const edge = {
      from: "a",
      to: "b",
      weight: 16,
      score: 28.799999999999997,
    };
    const map = new Map<string, string>();
    const line = formatEdgeLine(edge, map);
    expect(line).toContain("score 28.8");
  });
});

describe("formatNumberCompact", () => {
  test("rounds floats and trims zeros", () => {
    expect(formatNumberCompact(28.799999999999997, 1)).toBe("28.8");
    expect(formatNumberCompact(28.0, 1)).toBe("28");
    expect(formatNumberCompact(28, 1)).toBe("28");
  });

  test("handles decimals=0 correctly", () => {
    expect(formatNumberCompact(16, 0)).toBe("16");
    expect(formatNumberCompact(16.9, 0)).toBe("17");
  });

  test("handles invalid values safely", () => {
    expect(formatNumberCompact(NaN, 1)).toBe("0");
    expect(formatNumberCompact("x" as any, 1)).toBe("0");
    expect(formatNumberCompact(undefined as any, 1)).toBe("0");
  });
});

describe("build marker", () => {
  test("exports BUILD_SHA constant", () => {
    expect(BUILD_SHA).toBe("53944e7");
  });
});

describe("parseMcParams", () => {
  test("defaults when enabled with no overrides", () => {
    const res = parseMcParams("https://x.test/es/analizador?mc=1");
    expect(res.enabled).toBe(true);
    expect(res.iterations).toBe(1000);
    expect(res.seed).toBe(1);
  });

  test("reads overrides", () => {
    const res = parseMcParams("https://x.test/es/analizador?mc=1&mcN=2000&mcSeed=42");
    expect(res.enabled).toBe(true);
    expect(res.iterations).toBe(2000);
    expect(res.seed).toBe(42);
  });

  test("disabled when mc=0", () => {
    const res = parseMcParams("https://x.test/es/analizador?mc=0");
    expect(res.enabled).toBe(false);
  });
});

describe("getSpsNumber", () => {
  test("returns number directly", () => {
    expect(getSpsNumber(12.3)).toBe(12.3);
  });

  test("reads {sps} objects", () => {
    expect(getSpsNumber({ sps: 12.3 })).toBe(12.3);
  });

  test("returns 0 for unknown shapes", () => {
    expect(getSpsNumber({})).toBe(0);
  });
});
