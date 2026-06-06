import { describe, expect, it, vi } from "vitest";
import {
  default as SemanticOverlayPanel,
  formatSemanticKeyLabelForUi,
  formatUncoveredAuditExamples,
  partitionSemanticEdgesByStrength,
  SEMANTIC_OVERLAY_AUDIT_TITLE,
  SEMANTIC_OVERLAY_AUDIT_HELP,
  SEMANTIC_OVERLAY_COPY,
  buildCoverageReasons,
  buildCoverageReasonsFromReport,
  buildCoverageSummary,
  buildUncoveredNonLandAudit,
  buildUncoveredNonLandAuditGroups,
  filterRedundancyGroups,
  getSignalStatus,
} from "../SemanticOverlayPanel";
import { ActionId, EventId } from "../../../engine/semantic/contract";
import { explainKey, explainKeyHuman, KeyKind, keyOf } from "../../../engine/semantic/overlay/sem_profile";

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
  SEMANTIC_OVERLAY_COPY.localSignalFoundLabel,
  SEMANTIC_OVERLAY_COPY.signalMissingLabel,
  SEMANTIC_OVERLAY_COPY.signalMissingHint,
  SEMANTIC_OVERLAY_COPY.edgesTitle,
  SEMANTIC_OVERLAY_COPY.weakEdgesTitle,
  SEMANTIC_OVERLAY_COPY.weakEdgesHint,
  SEMANTIC_OVERLAY_COPY.noEdges,
  SEMANTIC_OVERLAY_COPY.edgeScoreLabel,
  SEMANTIC_OVERLAY_COPY.orphanTitle,
  SEMANTIC_OVERLAY_COPY.excessTitle,
  SEMANTIC_OVERLAY_COPY.noneDetected,
  SEMANTIC_OVERLAY_COPY.redundancyTitle,
  SEMANTIC_OVERLAY_COPY.redundancyNotApplicable,
  SEMANTIC_OVERLAY_COPY.glossaryTitle,
  ...SEMANTIC_OVERLAY_COPY.glossaryItems,
  SEMANTIC_OVERLAY_AUDIT_TITLE,
  SEMANTIC_OVERLAY_AUDIT_HELP,
].join(" ");

const countOccurrences = (text: string, term: string) =>
  text.split(term).length - 1;

describe("SemanticOverlayPanel copy", () => {
  it("usa texto en español para los encabezados principales", () => {
    expect(SEMANTIC_OVERLAY_COPY.title).toContain("Superposición semántica");
    expect(SEMANTIC_OVERLAY_COPY.coverageLabel).toBe("Cobertura semántica");
    expect(SEMANTIC_OVERLAY_COPY.reasonsTitle).toBe("Qué falta por cubrir");
    expect(SEMANTIC_OVERLAY_COPY.sosLabel).toBe("Fuerza semántica");
    expect(SEMANTIC_OVERLAY_COPY.totalEdgeScoreLabel).toBe("conexiones explicadas");
    expect(SEMANTIC_OVERLAY_COPY.edgesTitle).toBe("Conexiones principales detectadas");
    expect(SEMANTIC_OVERLAY_COPY.weakEdgesTitle).toBe("Señales locales de una sola carta");
    expect(SEMANTIC_OVERLAY_COPY.localSignalFoundLabel).toBe(
      "ℹ️ Señal local encontrada (sin fuerza semántica positiva)",
    );
    expect(SEMANTIC_OVERLAY_COPY.weakEdgesHint).toContain("misma carta");
    expect(SEMANTIC_OVERLAY_COPY.weakEdgesHint).toContain("puntuación 0");
    expect(SEMANTIC_OVERLAY_COPY.weakEdgesHint).toContain("no cuentan como conexión principal");
    expect(SEMANTIC_OVERLAY_COPY.weakEdgesHint).toContain("no aumentan SOS");
    expect(SEMANTIC_OVERLAY_COPY.weakEdgesHint).toContain("no aumentan SPS");
    expect(SEMANTIC_OVERLAY_COPY.excessTitle).toBe("Señales detectadas aún sin conexión clara");
    expect(SEMANTIC_OVERLAY_COPY.redundancyTitle).toBe("Patrones repetidos detectados");
    expect(SEMANTIC_OVERLAY_COPY.noEdges).toContain("No hay conexiones");
    expect(SEMANTIC_OVERLAY_COPY.redundancyNotApplicable).toContain("efectos repetidos");
    expect(SEMANTIC_OVERLAY_COPY.redundancyNotApplicable.toLowerCase()).not.toContain("sin señal");
    expect(SEMANTIC_OVERLAY_AUDIT_TITLE).toBe("Cartas no tierra pendientes de cobertura");
    expect(SEMANTIC_OVERLAY_AUDIT_HELP).toBe(
      "Agrupamos estas cartas por el motivo por el que todavía no entran en la cobertura semántica v1.",
    );
  });

  it("evita encabezados en inglés y duplicados", () => {
    expect(panelCopyText).not.toContain("Coverage");
    expect(panelCopyText).not.toContain("Orphan");
    expect(panelCopyText).not.toContain("Excess");
    expect(panelCopyText).not.toContain("Conexiones semánticas principales");
    expect(panelCopyText).not.toContain("Generas más de lo que usas");
    expect(panelCopyText).not.toContain("Efectos repetidos");
    expect(panelCopyText).not.toContain("SOS:");
    expect(panelCopyText).not.toContain("puntuación total de conexiones");
    expect(panelCopyText).not.toContain("Señales débiles o locales");
    expect(panelCopyText).not.toContain("reasonId");
    expect(panelCopyText).not.toContain("NO_MATCH_V1_TEMPLATES");

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
  it("formats semantic key labels to friendly UI copy", () => {
    const eventLabel = formatSemanticKeyLabelForUi("Event · ENTERS_BATTLEFIELD");
    expect(eventLabel).toContain("Evento:");
    expect(eventLabel).toContain("entra al campo de batalla");

    const actionLabel = formatSemanticKeyLabelForUi("Action · DEAL_DAMAGE");
    expect(actionLabel).toContain("Acción:");
    expect(actionLabel).toContain("hacer daño");

    const resourceLabel = formatSemanticKeyLabelForUi("Resource · LIFE");
    expect(resourceLabel).toContain("Recurso:");
    expect(resourceLabel).toContain("vida");

    const castSpellLabel = formatSemanticKeyLabelForUi("Action · CAST_SPELL");
    expect(castSpellLabel).toContain("Acción:");
    expect(castSpellLabel).toContain("lanzar hechizo");

    const drawExtraLabel = formatSemanticKeyLabelForUi("Action · DRAW_EXTRA_CARD_TURN");
    expect(drawExtraLabel).toContain("robar carta adicional del turno");

    const tokenCreatedLabel = formatSemanticKeyLabelForUi("Resource · TOKEN_CREATED");
    expect(tokenCreatedLabel).toContain("ficha creada");

    const tokenGenericLabel = formatSemanticKeyLabelForUi("Resource · TOKEN_GENERIC");
    expect(tokenGenericLabel).toContain("ficha genérica");

    const bloodLabel = formatSemanticKeyLabelForUi("Resource · BLOOD");
    expect(bloodLabel).toContain("sangre");

    const scryLabel = formatSemanticKeyLabelForUi("Action · SCRY");
    expect(scryLabel).toContain("adivinar");

    const fallback = formatSemanticKeyLabelForUi("Unknown");
    expect(fallback).toBe("Unknown");
  });

  it("wires cast_spell_context into CAST_SPELL reason labels", () => {
    const castSpellKey = keyOf(KeyKind.EVENT, EventId.CAST_SPELL);
    const drawCardsKey = keyOf(KeyKind.ACTION, ActionId.DRAW_CARDS);
    const explainKeyHumanSpy = vi.fn(explainKeyHuman);
    const prevReact = (globalThis as any).React;
    (globalThis as any).React = {
      createElement: () => null,
      Fragment: "Fragment",
    };
    try {
      SemanticOverlayPanel({
        metrics: {
          covered_count: 1,
          card_count: 1,
          SOS: 0,
          total_edge_score: 0,
          orphan_listeners: [],
          excess_producers: [],
          redundancy_groups: [],
        } as any,
        edges: [
          {
            from: 1,
            to: 1,
            score: 0,
            local_only: true,
            cast_spell_context: "CREATURE_SPELL",
            reasons: [
              { key: castSpellKey, weight: 1 },
              { key: drawCardsKey, weight: 1 },
            ],
          },
        ] as any,
        explainKey,
        explainKeyHuman: explainKeyHumanSpy,
        idToName: { 1: "Creature Spells Matter" },
        deckEntriesCount: 1,
        resolvedUnique: 1,
        missingUnique: 0,
      });
    } finally {
      (globalThis as any).React = prevReact;
    }

    const castSpellCall = explainKeyHumanSpy.mock.calls.find((call) => call[0] === castSpellKey);
    expect(castSpellCall).toBeTruthy();
    expect(castSpellCall?.[2]).toEqual({ cast_spell_context: "CREATURE_SPELL" });
    expect(explainKeyHuman(castSpellKey, castSpellCall?.[1], castSpellCall?.[2])).toBe(
      "Lanzas un hechizo de criatura (experimental)",
    );
  });

  it("partitions semantic edges by score without mutating input", () => {
    const edges = [
      { from: 1, to: 2, score: 2, reasons: [] },
      { from: 2, to: 2, score: 0, reasons: [] },
      { from: 3, to: 4, score: -1, reasons: [] },
    ] as any;
    const snapshot = JSON.parse(JSON.stringify(edges));

    const first = partitionSemanticEdgesByStrength(edges);
    const second = partitionSemanticEdgesByStrength(edges);

    expect(first).toEqual(second);
    expect(first.mainEdges.map((edge) => edge.score)).toEqual([2]);
    expect(first.weakEdges.map((edge) => edge.score)).toEqual([0, -1]);
    expect(edges).toEqual(snapshot);
  });

  it("formats signal status lines", () => {
    const localOnly = getSignalStatus({ SOS: 0 } as any, 0, 2);
    expect(localOnly.label).toBe(SEMANTIC_OVERLAY_COPY.localSignalFoundLabel);
    expect(localOnly.label).not.toBe(SEMANTIC_OVERLAY_COPY.signalFoundLabel);
    expect(localOnly.hint).toBeUndefined();

    const missing = getSignalStatus({ SOS: 0 } as any, 0, 0);
    expect(missing.label).toContain("Sin señal");
    expect(missing.hint).toBeTruthy();

    const withPositiveSos = getSignalStatus({ SOS: 0.5 } as any, 0, 0);
    expect(withPositiveSos.label).toContain("Señal encontrada");

    const withMainEdges = getSignalStatus({ SOS: 0 } as any, 1, 3);
    expect(withMainEdges.label).toContain("Señal encontrada");
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

  it("groups uncoveredNonLand audit by reason with deterministic ordering", () => {
    const coverageReport = {
      uncoveredNonLand: [
        { name: "Kappa", reasonId: "NO_ORACLE" },
        { name: "Beta", reasonId: "NO_MATCH_V1_TEMPLATES" },
        { name: "Eta", reasonId: "PARSE_ERROR" },
        { name: "Alpha", reasonId: "NO_MATCH_V1_TEMPLATES" },
        { name: "Zeta", reasonId: "PARSE_ERROR" },
      ],
    } as any;

    const audit = buildUncoveredNonLandAudit(coverageReport);
    const auditSnapshot = JSON.parse(JSON.stringify(audit));
    const groupsA = buildUncoveredNonLandAuditGroups(audit);
    const groupsB = buildUncoveredNonLandAuditGroups(audit);

    expect(groupsA).toEqual(groupsB);
    expect(groupsA).toEqual([
      {
        reasonId: "NO_MATCH_V1_TEMPLATES",
        label: "Carta reconocida, pero texto aún fuera de plantillas v1",
        count: 2,
        cards: ["Alpha", "Beta"],
      },
      {
        reasonId: "PARSE_ERROR",
        label: "Texto reconocido, pero no interpretable por parser v1",
        count: 2,
        cards: ["Eta", "Zeta"],
      },
      {
        reasonId: "NO_ORACLE",
        label: "No encontrada en índice o sin texto de reglas",
        count: 1,
        cards: ["Kappa"],
      },
    ]);
    expect(audit).toEqual(auditSnapshot);
  });

  it("limits grouped examples with 'y N más' and does not mutate cards", () => {
    const cards = ["Alpha", "Beta", "Delta", "Gamma"];
    const snapshot = [...cards];

    expect(formatUncoveredAuditExamples(cards)).toBe("Alpha, Beta, Delta y 1 más");
    expect(formatUncoveredAuditExamples(cards, 2)).toBe("Alpha, Beta y 2 más");
    expect(formatUncoveredAuditExamples(["Alpha", "Beta"])).toBe("Alpha, Beta");
    expect(cards).toEqual(snapshot);
  });
});

it("copy patch frames semantic overlay force as non-absolute", () => {
  const copy = JSON.stringify(SEMANTIC_OVERLAY_COPY);
  expect(copy).toContain("No es una nota absoluta");
  expect(copy).toContain("no como una mejora directa del mazo");
});
