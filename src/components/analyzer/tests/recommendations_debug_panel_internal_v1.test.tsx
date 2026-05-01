import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { ActionableInsight } from "../../../engine/recommendations";
import {
  buildRecommendationsDebugPanelModel,
  RECOMMENDATIONS_DEBUG_PANEL_COPY,
} from "../panels/RecommendationsDebugPanel";

const here = dirname(fileURLToPath(import.meta.url));
const analyzerAppSourcePath = join(here, "../AnalyzerApp.tsx");
const panelSourcePath = join(here, "../panels/RecommendationsDebugPanel.tsx");

const SYNTHETIC_INSIGHTS: ActionableInsight[] = [
  {
    id: "warning-structural",
    severity: "warning",
    theme: "structural_gaps",
    title: "Huecos estructurales",
    recommendation: "Añade enlaces de soporte",
    evidence: ["Relaciones: 0", "Densidad: 0.000"],
    confidence: 0.83,
  },
  {
    id: "critical-fragility",
    severity: "critical",
    theme: "fragility",
    title: "Fragilidad alta",
    recommendation: "Añade redundancia",
    evidence: ["SPS base: 107.6", "SPS robusto: 0"],
    confidence: 0.92,
  },
  {
    id: "info-relations",
    severity: "info",
    theme: "supporting_relations",
    title: "Relaciones fuertes",
    recommendation: "Conserva núcleo",
    evidence: [],
    confidence: 0.74,
  },
];

describe("RECOMMENDATIONS_UI_DEBUG_PANEL_INTERNAL_V1", () => {
  it("builds debug summary with count/themes/severities/ids/top", () => {
    const model = buildRecommendationsDebugPanelModel(SYNTHETIC_INSIGHTS);

    expect(RECOMMENDATIONS_DEBUG_PANEL_COPY.title).toContain("Debug interno");
    expect(model.report.count).toBe(3);
    expect(model.report.themes).toEqual({
      fragility: 1,
      structural_gaps: 1,
      supporting_relations: 1,
    });
    expect(model.report.severities).toEqual({
      critical: 1,
      warning: 1,
      info: 1,
    });
    expect(model.report.ids).toEqual([
      "critical-fragility",
      "warning-structural",
      "info-relations",
    ]);
    expect(model.report.top).toHaveLength(3);
    expect(model.report.top[0].id).toBe("critical-fragility");
  });

  it("does not crash with undefined/null/empty insights", () => {
    const undefinedModel = buildRecommendationsDebugPanelModel(undefined);
    const nullModel = buildRecommendationsDebugPanelModel(null);
    const emptyModel = buildRecommendationsDebugPanelModel([]);

    expect(undefinedModel.report.count).toBe(0);
    expect(nullModel.report.count).toBe(0);
    expect(emptyModel.report.count).toBe(0);
    expect(emptyModel.report.top).toEqual([]);
    expect(emptyModel.report.ids).toEqual([]);
  });

  it("keeps serialized report deterministic and parseable", () => {
    const first = buildRecommendationsDebugPanelModel(SYNTHETIC_INSIGHTS);
    const second = buildRecommendationsDebugPanelModel(SYNTHETIC_INSIGHTS);

    expect(first.serializedReport).toBe(second.serializedReport);
    const parsed = JSON.parse(first.serializedReport);
    expect(parsed.count).toBe(3);
    expect(Array.isArray(parsed.top)).toBe(true);
  });

  it("AnalyzerApp gates panel by debugRecommendations flag", () => {
    const source = readFileSync(analyzerAppSourcePath, "utf8");

    expect(source.includes("debugRecommendations")).toBe(true);
    expect(source.includes("getDebugRecommendationsFlag")).toBe(true);
    expect(
      source.includes("debugRecommendations && Array.isArray(actionableInsights)"),
    ).toBe(true);
    expect(
      source.includes("RecommendationsDebugPanel actionableInsights={actionableInsights}"),
    ).toBe(true);
  });

  it("RecommendationsDebugPanel avoids prohibited engine dependencies", () => {
    const source = readFileSync(panelSourcePath, "utf8");
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
    ];

    for (const token of forbiddenTokens) {
      expect(source.includes(token)).toBe(false);
    }
  });
});
