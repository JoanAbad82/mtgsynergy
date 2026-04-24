import { describe, expect, test } from "vitest";
import {
  interpretEffectiveN,
  interpretFragility,
  interpretMcStatus,
  interpretRobustVsBase,
  mapMcLabel,
} from "../guidance/metric_guidance";

describe("metric guidance MC", () => {
  test("fragility levels", () => {
    const low = interpretFragility(10);
    expect(low.level).toBe("low");
    expect(low.advice).not.toContain("OK.");
    expect(interpretFragility(25).level).toBe("mid");
    expect(interpretFragility(50).level).toBe("high");
  });

  test("effective N levels", () => {
    expect(interpretEffectiveN(1000, 1000).level).toBe("high");
    expect(interpretEffectiveN(700, 1000).level).toBe("mid");
    expect(interpretEffectiveN(300, 1000).level).toBe("low");
  });

  test("robust vs base levels", () => {
    expect(interpretRobustVsBase(100, 90).level).toBe("high");
    expect(interpretRobustVsBase(100, 60).level).toBe("mid");
    expect(interpretRobustVsBase(100, 40).level).toBe("low");
    const collapsed = interpretRobustVsBase(100, 0);
    expect(collapsed.level).toBe("low");
    expect(collapsed.meaning).toContain("depende demasiado de pocas piezas");
    expect(collapsed.advice).toContain("Añade redundancia");
    expect(collapsed.advice).toContain("cartas puente entre roles");
    expect(collapsed.meaning.toLowerCase()).not.toContain("dependencia extrema");
    expect(collapsed.meaning.toLowerCase()).not.toContain("perturbación anula");
  });

  test("mc status levels", () => {
    const done = interpretMcStatus("done", null);
    expect(done.level).toBe("high");
    expect(done.meaning).toContain("Simulación completada");
    expect(interpretMcStatus("error").level).toBe("low");
  });

  test("mc label mapping", () => {
    expect(mapMcLabel("samples")).toContain("muestras");
    expect(mapMcLabel("base_sps")).not.toContain("SPS base");
    expect(mapMcLabel("robust_sps")).not.toContain("SPS robusto");
    expect(mapMcLabel("base_sps").toLowerCase()).toMatch(/base|referencia/);
    expect(mapMcLabel("robust_sps")).toContain("resultado simulado");
  });
});
