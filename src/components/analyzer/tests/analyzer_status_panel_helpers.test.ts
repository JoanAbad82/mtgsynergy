import { describe, expect, test } from "vitest";
import { buildAnalysisStatusModel } from "../panels/AnalysisStatusPanel";

const baseInput = {
  summary: null,
  deckState: null,
  issues: [],
  shareImported: false,
  jsonImported: false,
  mcParams: { enabled: false },
  mcStatus: "idle" as const,
  mcResult: null,
  mcError: null,
};

describe("AnalysisStatusPanel helpers", () => {
  test("base strings include headings", () => {
    const model = buildAnalysisStatusModel(baseInput);
    expect(model.title).toContain("Estado del análisis");
    const titles = model.sections.map((s) => s.title).join(" | ");
    expect(titles).toContain("Índice de cartas");
    expect(titles).toContain("Monte Carlo");
  });

  test("maps TAGGING_ACTIVE to OK", () => {
    const model = buildAnalysisStatusModel({
      ...baseInput,
      issues: [{ code: "TAGGING_ACTIVE", severity: "info", message: "ok" }],
    });
    const tagging = model.sections.find((s) => s.id === "tagging");
    expect(tagging?.status).toBe("OK");
  });

  test("maps TAGGING_UNAVAILABLE to WARN", () => {
    const model = buildAnalysisStatusModel({
      ...baseInput,
      issues: [{ code: "TAGGING_UNAVAILABLE", severity: "warning", message: "no" }],
    });
    const tagging = model.sections.find((s) => s.id === "tagging");
    expect(tagging?.status).toBe("WARN");
  });

  test("MC disabled/enabled + running/done/error", () => {
    const disabled = buildAnalysisStatusModel(baseInput);
    const disabledMc = disabled.sections.find((s) => s.id === "mc");
    expect(disabledMc?.summary).toContain("Desactivado");

    const running = buildAnalysisStatusModel({
      ...baseInput,
      mcParams: { enabled: true },
      mcStatus: "running",
    });
    const runningMc = running.sections.find((s) => s.id === "mc");
    expect(runningMc?.summary).toContain("Ejecutando");

    const done = buildAnalysisStatusModel({
      ...baseInput,
      mcParams: { enabled: true },
      mcStatus: "done",
      mcResult: { base: { sps: 10 }, dist: { effective_n: 10 } },
    });
    const doneMc = done.sections.find((s) => s.id === "mc");
    expect(doneMc?.summary).toContain("Listo");

    const error = buildAnalysisStatusModel({
      ...baseInput,
      mcParams: { enabled: true },
      mcStatus: "error",
      mcError: "boom",
    });
    const errorMc = error.sections.find((s) => s.id === "mc");
    expect(errorMc?.summary).toContain("Error");
  });

  test("MC omitted with reason", () => {
    const model = buildAnalysisStatusModel({
      ...baseInput,
      mcParams: { enabled: true },
      mcStatus: "done",
      mcResult: { base: { sps: 0 }, dist: { effective_n: 0 } },
    });
    const mc = model.sections.find((s) => s.id === "mc");
    expect(mc?.summary).toContain("Omitido");
    expect(mc?.summary).toContain("SPS base");
  });
});
