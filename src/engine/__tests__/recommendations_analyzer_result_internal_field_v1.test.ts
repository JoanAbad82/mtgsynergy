import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { analyzeMtgaExportAsync } from "../analyzer";

const DECK_INPUT = "4 Llanowar Elves\n20 Forest\n";
const ANALYZE_OPTS = Object.freeze({ enableCardIndex: false });

const here = dirname(fileURLToPath(import.meta.url));
const analyzerSourcePath = join(here, "../analyzer/index.ts");

describe("RECOMMENDATIONS_ANALYZER_RESULT_INTERNAL_FIELD_V1", () => {
  test("analyzeMtgaExportAsync returns actionableInsights as an array", async () => {
    const result = await analyzeMtgaExportAsync(DECK_INPUT, ANALYZE_OPTS);
    expect(Array.isArray(result.actionableInsights)).toBe(true);
  });

  test("actionableInsights does not break existing analyzer result fields", async () => {
    const result = await analyzeMtgaExportAsync(DECK_INPUT, ANALYZE_OPTS);

    expect(result.deckState).toBeDefined();
    expect(result.summary).toBeDefined();
    expect(Array.isArray(result.issues)).toBe(true);
    expect(Array.isArray(result.deckState.edges)).toBe(true);
    expect(typeof result.summary.structuralPowerScore).toBe("number");
    expect(Number.isFinite(result.summary.structuralPowerScore)).toBe(true);
  });

  test("produces actionable insights when structural signals are present", async () => {
    const result = await analyzeMtgaExportAsync(DECK_INPUT, ANALYZE_OPTS);
    const insights = result.actionableInsights ?? [];

    expect(insights.length).toBeGreaterThan(0);
    expect(
      insights.some(
        (insight) =>
          insight.theme === "structural_gaps" || insight.theme === "role_reinforcement",
      ),
    ).toBe(true);
  });

  test("is deterministic for the same deck input", async () => {
    const first = await analyzeMtgaExportAsync(DECK_INPUT, ANALYZE_OPTS);
    const second = await analyzeMtgaExportAsync(DECK_INPUT, ANALYZE_OPTS);

    expect(first.actionableInsights).toEqual(second.actionableInsights);
  });

  test("analyzer source does not import components/pages and uses wiring helper", () => {
    const source = readFileSync(analyzerSourcePath, "utf8");
    expect(source.includes("../../components")).toBe(false);
    expect(source.includes("../components")).toBe(false);
    expect(source.includes("../../pages")).toBe(false);
    expect(source.includes("../pages")).toBe(false);
    expect(source.includes("buildActionableInsightsFromAnalyzerPipeline")).toBe(true);
  });
});
