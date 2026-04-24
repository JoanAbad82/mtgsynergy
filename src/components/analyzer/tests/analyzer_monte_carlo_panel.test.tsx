import { describe, expect, it } from "vitest";
import {
  MONTE_CARLO_PANEL_COPY,
  formatMonteCarloInsufficientRelationsNote,
  formatMonteCarloStabilityLine,
  formatMonteCarloZeroRobustnessNote,
} from "../AnalyzerApp";

describe("Analyzer Monte Carlo panel copy", () => {
  it("expone copy friendly para título y ayuda", () => {
    expect(MONTE_CARLO_PANEL_COPY.title).toBe("Simulación de estabilidad");
    expect(MONTE_CARLO_PANEL_COPY.intro).toBe(
      "Estima si el plan del mazo aguanta pequeñas variaciones.",
    );
    expect(MONTE_CARLO_PANEL_COPY.insufficientRelationsNote).toBe(
      "No hay relaciones suficientes para ejecutar una simulación útil.",
    );
  });

  it("evita copy técnico legacy como principal", () => {
    const copyText = Object.values(MONTE_CARLO_PANEL_COPY).join(" ");
    expect(copyText).not.toContain("MC-SSL");
    expect(copyText).not.toContain("SPS robust vs SPS base");
  });
});

describe("Analyzer Monte Carlo panel formatters", () => {
  it("formatea línea friendly de estabilidad simulada", () => {
    expect(formatMonteCarloStabilityLine(0, 107.6)).toBe(
      "Resultado simulado: 0 · referencia base: 107.6",
    );
    expect(formatMonteCarloStabilityLine(24.12, 107.6)).toBe(
      "Resultado simulado: 24.1 · referencia base: 107.6",
    );
  });

  it("muestra nota de colapso si robustez es 0 y base positiva", () => {
    expect(formatMonteCarloZeroRobustnessNote(0, 107.6)).toBe(
      "En esta simulación, las conexiones principales no se mantienen cuando el mazo se perturba.",
    );
    expect(formatMonteCarloZeroRobustnessNote(-1, 20)).toBe(
      "En esta simulación, las conexiones principales no se mantienen cuando el mazo se perturba.",
    );
  });

  it("no muestra nota de colapso cuando la robustez es positiva", () => {
    expect(formatMonteCarloZeroRobustnessNote(0.1, 107.6)).toBeNull();
    expect(formatMonteCarloZeroRobustnessNote(10, 0)).toBeNull();
  });

  it("devuelve copy friendly si base <= 0", () => {
    expect(formatMonteCarloInsufficientRelationsNote(0)).toBe(
      "No hay relaciones suficientes para ejecutar una simulación útil.",
    );
    expect(formatMonteCarloInsufficientRelationsNote(-2)).toBe(
      "No hay relaciones suficientes para ejecutar una simulación útil.",
    );
    expect(formatMonteCarloInsufficientRelationsNote(1)).toBeNull();
  });

  it("es determinista", () => {
    const first = formatMonteCarloStabilityLine(0, 107.6);
    const second = formatMonteCarloStabilityLine(0, 107.6);
    expect(first).toBe(second);

    const noteA = formatMonteCarloZeroRobustnessNote(0, 107.6);
    const noteB = formatMonteCarloZeroRobustnessNote(0, 107.6);
    expect(noteA).toBe(noteB);

    const omittedA = formatMonteCarloInsufficientRelationsNote(0);
    const omittedB = formatMonteCarloInsufficientRelationsNote(0);
    expect(omittedA).toBe(omittedB);
  });
});
