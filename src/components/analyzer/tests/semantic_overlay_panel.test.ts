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
    expect(SEMANTIC_OVERLAY_COPY.coverageLabel).toBe("Cobertura semántica");
    expect(SEMANTIC_OVERLAY_COPY.reasonsTitle).toBe("Qué falta por cubrir");
    expect(SEMANTIC_OVERLAY_COPY.edgesTitle).toContain("Conexiones");
    expect(SEMANTIC_OVERLAY_COPY.noEdges).toContain("No hay conexiones");
    expect(SEMANTIC_OVERLAY_COPY.redundancyNotApplicable).toContain("efectos repetidos");
    expect(SEMANTIC_OVERLAY_COPY.redundancyNotApplicable.toLowerCase()).not.toContain("sin señal");
    expect(SEMANTIC_OVERLAY_AUDIT_TITLE).toBe("Cartas no tierra pendientes de cobertura");
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
    const withVisibleEdges = getSignalStatus({ SOS: 0 } as any, 2);
    expect(withVisibleEdges.label).toContain("Señal encontrada");

    const missing = getSignalStatus({ SOS: 0 } as any, 0);
    expect(missing.label).toContain("Sin señal");
    expect(missing.hint).toBeTruthy();

    const withPositiveSos = getSignalStatus({ SOS: 0.5 } as any, 0);
    expect(withPositiveSos.label).toContain("Señal encontrada");
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
        { reasonId: "NO_MATCH_V1_TEMPLATES", count: 2, examples: ["Magma Opus"] },
      ],
    } as any;

    const reasons = buildCoverageReasonsFromReport(coverageReport);
    const byKey = new Map(reasons.map((row) => [row.key, row]));

    expect(byKey.get("NO_ORACLE")?.label).toBe(SEMANTIC_OVERLAY_COPY.reasonMissingIndex);
    expect(byKey.get("NO_ORACLE")?.count).toBe(2);
    expect(byKey.get("NO_ORACLE")?.examples).toEqual(["Card A", "Card B"]);

    expect(byKey.get("EMPTY_TEXT")?.label).toBe("Sin texto analizable tras normalización");
    expect(byKey.get("EMPTY_TEXT")?.count).toBe(1);
    expect(byKey.get("EMPTY_TEXT")?.examples).toEqual(["Empty Card"]);

    expect(byKey.get("PARSE_ERROR")?.label).toBe("Texto reconocido, pero no interpretable por parser v1");
    expect(byKey.get("PARSE_ERROR")?.count).toBe(1);
    expect(byKey.get("PARSE_ERROR")?.examples).toEqual(["Alpha"]);

    expect(byKey.get("NO_MATCH_V1_TEMPLATES")?.label).toBe(SEMANTIC_OVERLAY_COPY.reasonUnrecognized);
    expect(byKey.get("NO_MATCH_V1_TEMPLATES")?.count).toBe(2);
    expect(byKey.get("NO_MATCH_V1_TEMPLATES")?.examples).toEqual(["Magma Opus"]);

    expect(byKey.get("LAND_RULES_UNMODELED_V1")?.label).toBe(
      "Carta reconocida (tierra), con reglas aún no modeladas en v1",
    );
    expect(byKey.get("LAND_RULES_UNMODELED_V1")?.count).toBe(3);
    expect(byKey.get("LAND_RULES_UNMODELED_V1")?.examples).toEqual(["Dusty Flats"]);
  });

  it("renders uncoveredNonLand audit list with honest labels", () => {
    const coverageReport = {
      uncoveredNonLand: [
        { name: "Nameless Relic", reasonId: "EMPTY_TEXT" },
        { name: "Magma Opus", reasonId: "NO_MATCH_V1_TEMPLATES" },
        { name: "Unknown Tome", reasonId: "NO_ORACLE" },
        { name: "Broken Syntax", reasonId: "PARSE_ERROR" },
        { name: "Dusty Flats", reasonId: "LAND_RULES_UNMODELED_V1" },
      ],
    } as any;

    const audit = buildUncoveredNonLandAudit(coverageReport);
    expect(audit?.title).toBe(SEMANTIC_OVERLAY_AUDIT_TITLE);
    expect(audit?.items).toEqual([
      { name: "Nameless Relic", reasonId: "EMPTY_TEXT", label: "Sin texto analizable tras normalización" },
      {
        name: "Magma Opus",
        reasonId: "NO_MATCH_V1_TEMPLATES",
        label: "Carta reconocida, pero texto aún fuera de plantillas v1",
      },
      { name: "Unknown Tome", reasonId: "NO_ORACLE", label: "No encontrada en índice o sin texto de reglas" },
      {
        name: "Broken Syntax",
        reasonId: "PARSE_ERROR",
        label: "Texto reconocido, pero no interpretable por parser v1",
      },
      {
        name: "Dusty Flats",
        reasonId: "LAND_RULES_UNMODELED_V1",
        label: "Carta reconocida (tierra), con reglas aún no modeladas en v1",
      },
    ]);
  });

  it("keeps uncoveredNonLand audit deterministic and does not mutate input data", () => {
    const coverageReport = {
      uncoveredNonLand: [
        { name: "Magma Opus", reasonId: "NO_MATCH_V1_TEMPLATES" },
        { name: "Unknown Tome", reasonId: "NO_ORACLE" },
      ],
    } as any;
    const snapshot = JSON.parse(JSON.stringify(coverageReport));

    const auditA = buildUncoveredNonLandAudit(coverageReport);
    const auditB = buildUncoveredNonLandAudit(coverageReport);

    expect(auditA).toEqual(auditB);
    expect(coverageReport).toEqual(snapshot);
    expect(coverageReport.uncoveredNonLand).toEqual(snapshot.uncoveredNonLand);
  });
});
