import { describe, expect, test } from "vitest";
import { buildAnalysisStatusModel } from "../panels/AnalysisStatusPanel";

const baseInput = {
  summary: null,
  deckState: null,
  issues: [],
  shareImported: false,
  jsonImported: false,
  inputTextNonEmpty: false,
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

  test("sin análisis + input vacío", () => {
    const model = buildAnalysisStatusModel(baseInput);
    const input = model.sections.find((s) => s.id === "input");
    expect(input?.summary).toContain("Entrada vacía");
  });

  test("sin análisis + input con texto", () => {
    const model = buildAnalysisStatusModel({
      ...baseInput,
      inputTextNonEmpty: true,
    });
    const input = model.sections.find((s) => s.id === "input");
    expect(input?.summary).toContain("No has analizado");
  });

  test("TAGGING_NO_MATCHES recomienda idioma/nombres", () => {
    const model = buildAnalysisStatusModel({
      ...baseInput,
      issues: [{ code: "TAGGING_NO_MATCHES", severity: "warning", message: "nope" }],
    });
    const tagging = model.sections.find((s) => s.id === "tagging");
    expect(tagging?.summary).toContain("sin coincidencias");
    expect(tagging?.action).toContain("idioma");
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

  test("MC enabled + idle -> pendiente", () => {
    const model = buildAnalysisStatusModel({
      ...baseInput,
      mcParams: { enabled: true },
      mcStatus: "idle",
    });
    const mc = model.sections.find((s) => s.id === "mc");
    expect(mc?.summary).toContain("pendiente");
    expect(mc?.action).toContain("Analizar");
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
    expect(mc?.summary).toContain("effective_n=0");
  });
});
