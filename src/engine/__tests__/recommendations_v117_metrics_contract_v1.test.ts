import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import {
  compareV117MetricSnapshot,
  V117_ANALYZER_BASELINE_METRICS,
} from "../recommendations";

const here = dirname(fileURLToPath(import.meta.url));
const contractSourcePath = join(
  here,
  "../recommendations/baselines/v117_metrics_contract.ts",
);

describe("BASELINE_V117_METRICS_CONTRACT_V1", () => {
  test("stores expected canonical v117 values", () => {
    expect(V117_ANALYZER_BASELINE_METRICS).toEqual({
      version: 117,
      sourceCommit: "b6a63a7",
      phase: "analyzer-ui-ux-pdf-stability-closure",
      status: "accepted",
      deckFixtureStatus: "missing_v117_deck_export",
      cardsIndexCount: 36063,
      sps: 107.6,
      synergies: 19,
      density: 0.339,
      relations: 19,
      monteCarlo: {
        samplesEffective: 1000,
        samplesRequested: 1000,
        simulatedResult: 0,
        baselineReference: 107.6,
        estimatedVariation: 50,
      },
      recommendation: "Añade redundancia y cartas puente entre roles.",
      interpretation: "El plan parece depender de pocas piezas clave.",
    });
  });

  test("declares missing tracked deck fixture status explicitly", () => {
    expect(V117_ANALYZER_BASELINE_METRICS.deckFixtureStatus).toBe(
      "missing_v117_deck_export",
    );
  });

  test("returns empty mismatches for matching snapshot", () => {
    const mismatches = compareV117MetricSnapshot({
      cardsIndexCount: 36063,
      sps: 107.6,
      synergies: 19,
      density: 0.339,
      relations: 19,
      monteCarlo: {
        samplesEffective: 1000,
        samplesRequested: 1000,
        simulatedResult: 0,
        baselineReference: 107.6,
        estimatedVariation: 50,
      },
      recommendation: "Añade redundancia y cartas puente entre roles.",
      interpretation: "El plan parece depender de pocas piezas clave.",
    });

    expect(mismatches).toEqual([]);
  });

  test("accepts float tolerance for sps density and montecarlo baseline reference", () => {
    const mismatches = compareV117MetricSnapshot({
      sps: 107.64,
      density: 0.3398,
      monteCarlo: { baselineReference: 107.56 },
    });

    expect(mismatches).toEqual([]);
  });

  test("detects mismatches in sps density relations and montecarlo fields", () => {
    const mismatches = compareV117MetricSnapshot({
      sps: 108.0,
      density: 0.345,
      relations: 17,
      monteCarlo: {
        samplesEffective: 995,
        baselineReference: 106.2,
      },
    });

    const mismatchFields = mismatches.map((row) => row.field).sort();
    expect(mismatchFields).toEqual(
      [
        "density",
        "monteCarlo.baselineReference",
        "monteCarlo.samplesEffective",
        "relations",
        "sps",
      ].sort(),
    );
  });

  test("supports partial snapshot comparison without failing", () => {
    const mismatches = compareV117MetricSnapshot({
      relations: 19,
      monteCarlo: { samplesRequested: 1000 },
    });

    expect(mismatches).toEqual([]);
  });

  test("does not import parser scoring montecarlo or ui layers", () => {
    const source = readFileSync(contractSourcePath, "utf8");
    const bannedTokens = [
      "../parser",
      "../structural/sps",
      "../montecarlo",
      "../../components",
      "runMonteCarloV1",
      "computeStructuralPowerScore",
      "parseMtgaExport",
      "lookupCard",
    ];

    for (const token of bannedTokens) {
      expect(source.includes(token)).toBe(false);
    }
  });
});
