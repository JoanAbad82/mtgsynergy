import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { analyzeMtgaExportAsync } from "../analyzer";
import type { ActionableInsight } from "../recommendations";
import {
  buildRecommendationDebugInspectionReport,
  serializeRecommendationDebugInspectionReport,
} from "../recommendations";

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value as Record<string, unknown>)) {
      const nested = (value as Record<string, unknown>)[key];
      if (nested && typeof nested === "object") {
        deepFreeze(nested);
      }
    }
  }
  return value;
}

const here = dirname(fileURLToPath(import.meta.url));
const debugSourcePath = join(here, "../recommendations/debug_inspection.ts");

const SYNTHETIC_INSIGHTS: ActionableInsight[] = [
  {
    id: "b-warning-structural",
    severity: "warning",
    theme: "structural_gaps",
    title: "Huecos",
    recommendation: "Añade conexiones",
    evidence: ["Relaciones: 0", "Densidad: 0.000"],
    confidence: 0.83,
  },
  {
    id: "a-critical-fragility",
    severity: "critical",
    theme: "fragility",
    title: "Fragilidad alta",
    recommendation: "Añade redundancia",
    evidence: ["SPS base: 107.6", "SPS robusto: 0"],
    confidence: 0.92,
  },
  {
    id: "c-info-relations",
    severity: "info",
    theme: "supporting_relations",
    title: "Relaciones fuertes",
    recommendation: "Conservar núcleo",
    evidence: [],
    confidence: 0.74,
  },
];

describe("RECOMMENDATIONS_DEBUG_INSPECTION_INTERNAL_V1", () => {
  test("builds stable report with count/themes/severities/ids/top", () => {
    const report = buildRecommendationDebugInspectionReport({
      deckLabel: "rakdos-test",
      source: "unit-test",
      actionableInsights: SYNTHETIC_INSIGHTS,
    });

    expect(report.deckLabel).toBe("rakdos-test");
    expect(report.source).toBe("unit-test");
    expect(report.count).toBe(3);
    expect(report.themes).toEqual({
      fragility: 1,
      structural_gaps: 1,
      supporting_relations: 1,
    });
    expect(report.severities).toEqual({
      critical: 1,
      warning: 1,
      info: 1,
    });
    expect(report.ids).toEqual([
      "a-critical-fragility",
      "b-warning-structural",
      "c-info-relations",
    ]);
    expect(report.top).toHaveLength(3);
    expect(report.top[0].id).toBe("a-critical-fragility");
    expect(report.top[0].evidenceCount).toBe(2);
  });

  test("does not mutate frozen input", () => {
    const input = deepFreeze({
      deckLabel: "immutable",
      source: "unit",
      actionableInsights: SYNTHETIC_INSIGHTS.map((insight) => ({
        ...insight,
        evidence: [...insight.evidence],
      })),
    });
    const snapshot = JSON.stringify(input);

    buildRecommendationDebugInspectionReport(input);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  test("serialization is deterministic", () => {
    const reportA = buildRecommendationDebugInspectionReport({
      deckLabel: "stable",
      source: "unit",
      actionableInsights: SYNTHETIC_INSIGHTS,
    });
    const reportB = buildRecommendationDebugInspectionReport({
      deckLabel: "stable",
      source: "unit",
      actionableInsights: SYNTHETIC_INSIGHTS,
    });

    const jsonA = serializeRecommendationDebugInspectionReport(reportA);
    const jsonB = serializeRecommendationDebugInspectionReport(reportB);
    expect(jsonA).toBe(jsonB);
  });

  test("does not include evidence payload by default", () => {
    const report = buildRecommendationDebugInspectionReport({
      actionableInsights: SYNTHETIC_INSIGHTS,
    });
    expect(report.top.every((view) => !("evidencePreview" in view))).toBe(true);
  });

  test("includes compact evidence preview when includeEvidence is true", () => {
    const report = buildRecommendationDebugInspectionReport({
      actionableInsights: SYNTHETIC_INSIGHTS,
      includeEvidence: true,
    });

    expect(report.top[0].evidencePreview).toEqual(["SPS base: 107.6", "SPS robusto: 0"]);
    expect(report.top[1].evidencePreview).toEqual(["Relaciones: 0", "Densidad: 0.000"]);
  });

  test("integrates debug-only with real analyzer output", async () => {
    const result = await analyzeMtgaExportAsync("4 Llanowar Elves\n20 Forest\n", {
      enableCardIndex: false,
    });
    const report = buildRecommendationDebugInspectionReport({
      deckLabel: "real-min",
      source: "analyzer",
      actionableInsights: result.actionableInsights,
    });
    const serialized = serializeRecommendationDebugInspectionReport(report);

    expect(report.count).toBe((result.actionableInsights ?? []).length);
    expect(() => JSON.parse(serialized)).not.toThrow();
    expect(JSON.parse(serialized).count).toBe(report.count);
  });

  test("does not import prohibited dependencies", () => {
    const source = readFileSync(debugSourcePath, "utf8");
    const forbiddenTokens = [
      "analyzeMtgaExportAsync",
      "parseMtgaExport",
      "generateEdges",
      "computeStructuralPowerScore",
      "runMonteCarloV1",
      "lookupCard",
      "../parser",
      "../cards",
      "../cards_index",
      "../montecarlo",
      "../semantic",
      "../structural/sps",
      "../edges/generate",
      "../../components",
      "../../pages",
    ];

    for (const token of forbiddenTokens) {
      expect(source.includes(token)).toBe(false);
    }
  });
});
