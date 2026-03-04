import { describe, expect, it } from "vitest";
import {
  SEMANTIC_OVERLAY_AUDIT_TITLE,
  SEMANTIC_OVERLAY_COPY,
  buildCoverageReasons,
  buildCoverageReasonsFromReport,
  buildCoverageSummary,
  buildUncoveredNonLandAudit,
  filterRedundancyGroups,
  getSignalStatus,
} from "../SemanticOverlayPanel";

const panelCopyText = [
  SEMANTIC_OVERLAY_COPY.title,
  SEMANTIC_OVERLAY_COPY.intro,
  SEMANTIC_OVERLAY_COPY.coverageLabel,
  SEMANTIC_OVERLAY_COPY.reasonsTitle,
  SEMANTIC_OVERLAY_COPY.reasonsNone,
  SEMANTIC_OVERLAY_COPY.reasonMissingIndex,
  SEMANTIC_OVERLAY_COPY.reasonUnrecognized,
  SEMANTIC_OVERLAY_COPY.resolvedLabel,
  SEMANTIC_OVERLAY_COPY.missingLabel,
  SEMANTIC_OVERLAY_COPY.entriesLabel,
  SEMANTIC_OVERLAY_COPY.sosLabel,
  SEMANTIC_OVERLAY_COPY.totalEdgeScoreLabel,
  SEMANTIC_OVERLAY_COPY.signalFoundLabel,
  SEMANTIC_OVERLAY_COPY.signalMissingLabel,
  SEMANTIC_OVERLAY_COPY.signalMissingHint,
  SEMANTIC_OVERLAY_COPY.edgesTitle,
  SEMANTIC_OVERLAY_COPY.noEdges,
  SEMANTIC_OVERLAY_COPY.edgeScoreLabel,
  SEMANTIC_OVERLAY_COPY.orphanTitle,
  SEMANTIC_OVERLAY_COPY.excessTitle,
  SEMANTIC_OVERLAY_COPY.noneDetected,
  SEMANTIC_OVERLAY_COPY.redundancyTitle,
  SEMANTIC_OVERLAY_COPY.redundancyNotApplicable,
  SEMANTIC_OVERLAY_COPY.glossaryTitle,
  ...SEMANTIC_OVERLAY_COPY.glossaryItems,
].join(" ");

const countOccurrences = (text: string, term: string) =>
  text.split(term).length - 1;

describe("SemanticOverlayPanel copy", () => {
  it("usa texto en español para los encabezados principales", () => {
    expect(SEMANTIC_OVERLAY_COPY.title).toContain("Superposición semántica");
    expect(SEMANTIC_OVERLAY_COPY.edgesTitle).toContain("Conexiones");
    expect(SEMANTIC_OVERLAY_COPY.noEdges).toContain("No hay conexiones");
    expect(SEMANTIC_OVERLAY_COPY.redundancyNotApplicable.toLowerCase()).toContain("no aplicable");
  });

  it("evita encabezados en inglés y duplicados", () => {
    expect(panelCopyText).not.toContain("Coverage");
    expect(panelCopyText).not.toContain("Orphan");
    expect(panelCopyText).not.toContain("Excess");

    expect(countOccurrences(panelCopyText, SEMANTIC_OVERLAY_COPY.coverageLabel)).toBe(1);

    [
      SEMANTIC_OVERLAY_COPY.title,
      SEMANTIC_OVERLAY_COPY.reasonsTitle,
      SEMANTIC_OVERLAY_COPY.edgesTitle,
      SEMANTIC_OVERLAY_COPY.orphanTitle,
      SEMANTIC_OVERLAY_COPY.excessTitle,
      SEMANTIC_OVERLAY_COPY.redundancyTitle,
      SEMANTIC_OVERLAY_COPY.glossaryTitle,
    ].forEach((heading) => {
      expect(countOccurrences(panelCopyText, heading)).toBe(1);
    });
  });
});

describe("SemanticOverlayPanel redundancy filtering", () => {
  it("excluye perfiles vacíos", () => {
    const input = [
      { signature: "P: | C:", card_ids: [1, 2], size: 2 },
      { signature: "P:1 | C:2", card_ids: [3, 4], size: 2 },
    ];
    const result = filterRedundancyGroups(input);
    expect(result).toEqual([{ signature: "P:1 | C:2", card_ids: [3, 4], size: 2 }]);
  });
});

describe("SemanticOverlayPanel semantic summary helpers", () => {
  it("formats signal status lines", () => {
    const ok = getSignalStatus({ SOS: 0.5 } as any);
    expect(ok.label).toContain("Señal encontrada");
    const missing = getSignalStatus({ SOS: 0 } as any);
    expect(missing.label).toContain("Sin señal");
    expect(missing.hint).toBeTruthy();
  });

  it("computes coverage summary and reasons deterministically", () => {
    const metrics = { covered_count: 3, card_count: 5 } as any;
    const summary = buildCoverageSummary(metrics, 5, 2);
    expect(summary.covered).toBe(3);
    expect(summary.total).toBe(7);
    expect(summary.percent).toBeCloseTo(42.9, 1);

    const reasons = buildCoverageReasons(metrics, 5, 2);
    expect(reasons.map((r) => r.key)).toEqual(["missing_index", "unrecognized_text"]);
    expect(reasons[0].count).toBe(2);
    expect(reasons[1].count).toBe(2);
  });

  it("maps coverage report reasons to labels with counts and examples", () => {
    const coverageReport = {
      reasons: [
        { reasonId: "PARSE_ERROR", count: 1, examples: ["Alpha"] },
        { reasonId: "NO_ORACLE", count: 2, examples: ["Card A", "Card B"] },
        { reasonId: "EMPTY_TEXT", count: 1, examples: ["Empty Card"] },
        { reasonId: "LAND_RULES_UNMODELED_V1", count: 3, examples: ["Dusty Flats"] },
        { reasonId: "NO_MATCH_V1_TEMPLATES", count: 0, examples: ["Ignored"] },
      ],
    } as any;

    const reasons = buildCoverageReasonsFromReport(coverageReport);
    expect(reasons.map((r) => r.key)).toEqual([
      "LAND_RULES_UNMODELED_V1",
      "NO_ORACLE",
      "EMPTY_TEXT",
      "PARSE_ERROR",
    ]);
    expect(reasons[0].label).toBe("Tierras con reglas no modeladas (v1)");
    expect(reasons[0].count).toBe(3);
    expect(reasons[0].examples).toEqual(["Dusty Flats"]);
    expect(reasons[1].label).toBe(SEMANTIC_OVERLAY_COPY.reasonMissingIndex);
    expect(reasons[1].count).toBe(2);
    expect(reasons[1].examples).toEqual(["Card A", "Card B"]);
    expect(reasons[2].label).toBe("Texto vacío tras normalización");
    expect(reasons[2].count).toBe(1);
    expect(reasons[2].examples).toEqual(["Empty Card"]);
    expect(reasons[3].label).toBe("Error de parseo (v1)");
    expect(reasons[3].count).toBe(1);
    expect(reasons[3].examples).toEqual(["Alpha"]);
  });

  it("renders uncoveredNonLand audit list when present", () => {
    const coverageReport = {
      uncoveredNonLand: [
        { name: "Magma Opus", reasonId: "NO_MATCH_V1_TEMPLATES" },
        { name: "Unknown Tome", reasonId: "NO_ORACLE" },
      ],
    } as any;

    const audit = buildUncoveredNonLandAudit(coverageReport);
    expect(audit?.title).toBe(SEMANTIC_OVERLAY_AUDIT_TITLE);
    expect(audit?.items).toEqual([
      { name: "Magma Opus", reasonId: "NO_MATCH_V1_TEMPLATES", label: "No reconocido (v1)" },
      { name: "Unknown Tome", reasonId: "NO_ORACLE", label: "No encontrada en índice o sin texto" },
    ]);
  });
});
