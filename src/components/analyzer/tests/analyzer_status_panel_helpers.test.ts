import { describe, expect, test } from "vitest";
import { buildAnalysisStatusModel, formatStatusTitle } from "../panels/AnalysisStatusPanel";
import { es } from "../i18n/es";

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
  test("formatStatusTitle handles empty", () => {
    expect(formatStatusTitle(undefined).text).toBe("");
    expect(formatStatusTitle(undefined).truncated).toBe(false);
  });

  test("formatStatusTitle keeps short text", () => {
    const res = formatStatusTitle("Texto corto");
    expect(res.text).toBe("Texto corto");
    expect(res.truncated).toBe(false);
  });

  test("formatStatusTitle truncates long text", () => {
    const raw = "x".repeat(500);
    const res = formatStatusTitle(raw, 400);
    expect(res.truncated).toBe(true);
    expect(res.text.endsWith("…")).toBe(true);
  });

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
    expect(input?.summary.toLowerCase()).toContain("cargado");
  });

  test("sin análisis + input con texto", () => {
    const model = buildAnalysisStatusModel({
      ...baseInput,
      inputTextNonEmpty: true,
    });
    const input = model.sections.find((s) => s.id === "input");
    expect(input?.summary).toContain("pulsar Analizar");
  });

  test("TAGGING_NO_MATCHES recomienda idioma/nombres", () => {
    const model = buildAnalysisStatusModel({
      ...baseInput,
      issues: [{ code: "TAGGING_NO_MATCHES", severity: "warning", message: "nope" }],
    });
    const tagging = model.sections.find((s) => s.id === "tagging");
    expect(tagging?.summary.toLowerCase()).toContain("reconocer cartas");
    expect(tagging?.action.toLowerCase()).toContain("idioma");
  });

  test("MC disabled/enabled + running/done/error", () => {
    const disabled = buildAnalysisStatusModel(baseInput);
    const disabledMc = disabled.sections.find((s) => s.id === "mc");
    expect(disabledMc?.summary.toLowerCase()).toContain("desactivado");

    const running = buildAnalysisStatusModel({
      ...baseInput,
      mcParams: { enabled: true },
      mcStatus: "running",
    });
    const runningMc = running.sections.find((s) => s.id === "mc");
    expect(runningMc?.summary.toLowerCase()).toContain("ejecución");

    const done = buildAnalysisStatusModel({
      ...baseInput,
      mcParams: { enabled: true },
      mcStatus: "done",
      mcResult: { base: { sps: 10 }, dist: { effective_n: 10 } },
    });
    const doneMc = done.sections.find((s) => s.id === "mc");
    expect(doneMc?.summary.toLowerCase()).toContain("listo");

    const error = buildAnalysisStatusModel({
      ...baseInput,
      mcParams: { enabled: true },
      mcStatus: "error",
      mcError: "boom",
    });
    const errorMc = error.sections.find((s) => s.id === "mc");
    expect(errorMc?.summary.toLowerCase()).toContain("falló");
  });

  test("MC enabled + idle -> pendiente", () => {
    const model = buildAnalysisStatusModel({
      ...baseInput,
      mcParams: { enabled: true },
      mcStatus: "idle",
    });
    const mc = model.sections.find((s) => s.id === "mc");
    expect(mc?.summary).toContain("pulsa Analizar");
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
    expect(mc?.summary.toLowerCase()).toContain("no aplica");
    expect(mc?.summary).toContain("SPS base");
    expect(mc?.summary).toContain("effective_n=0");
  });

  test("i18n shape includes key labels", () => {
    expect(es.analysisStatus.title).toBeTruthy();
    expect(es.analysisStatus.labels.details).toBeTruthy();
    expect(es.analysisStatus.labels.hide).toBeTruthy();
    expect(es.analysisStatus.labels.focusInput).toBeTruthy();
    expect(es.analysisStatus.labels.enableMc).toBeTruthy();
    expect(es.analysisStatus.labels.reanalyze).toBeTruthy();
  });
});
