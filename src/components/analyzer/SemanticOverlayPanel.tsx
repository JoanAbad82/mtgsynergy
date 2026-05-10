import type { SemanticEdge } from "../../engine/semantic/overlay/sem_edges";
import type { SemanticOverlayMetrics } from "../../engine/semantic/overlay/sem_metrics";
import type { SemanticCoverageReport, SemanticCoverageReasonId } from "../../engine/semantic/overlay/sem_coverage_report";
import type { ExplainKeyHumanContext } from "../../engine/semantic/overlay/sem_profile";

export const SEMANTIC_OVERLAY_COPY = {
  title: "Superposición semántica (experimental)",
  intro:
    "Esto es experimental. Busca conexiones por “producido/consumido” a partir del texto de reglas.\nEl objetivo es detectar patrones entre cartas sin depender de roles manuales.",
  coverageLabel: "Cobertura semántica",
  resolvedLabel: "únicas resueltas",
  missingLabel: "únicas faltantes",
  entriesLabel: "entradas del mazo",
  sosLabel: "Fuerza semántica",
  totalEdgeScoreLabel: "conexiones explicadas",
  signalFoundLabel: "✅ Señal encontrada (experimental)",
  localSignalFoundLabel: "ℹ️ Señal local encontrada (sin fuerza semántica positiva)",
  signalMissingLabel: "⚠️ Sin señal (experimental)",
  signalMissingHint: "Normal en mazos simples o reglas aún no cubiertas.",
  reasonsTitle: "Qué falta por cubrir",
  reasonsNone: "Sin incidencias destacables.",
  reasonMissingIndex: "No encontrada en índice o sin texto de reglas",
  reasonUnrecognized: "Carta reconocida, pero texto aún fuera de plantillas v1",
  edgesTitle: "Conexiones principales detectadas",
  edgesIntro:
    "Estas conexiones muestran relaciones que el motor puede explicar con el texto de reglas.",
  weakEdgesTitle: "Señales locales de una sola carta",
  weakEdgesHint:
    "Estas señales se detectan dentro de una misma carta. Pueden verse como carta → misma carta, tienen puntuación 0, no cuentan como conexión principal, no aumentan SOS y no aumentan SPS; sirven como evidencia local.",
  noEdges: "No hay conexiones semánticas.",
  edgeScoreLabel: "puntuación",
  orphanTitle: "Efectos sin pareja",
  excessTitle: "Señales detectadas aún sin conexión clara",
  excessHint:
    "El motor reconoce estas señales, pero todavía no siempre puede conectarlas con otra carta.",
  noneDetected: "No se detectaron.",
  redundancyTitle: "Patrones repetidos detectados",
  redundancyNotApplicable: "No se detectaron efectos repetidos relevantes.",
  compactMainEdgesHint:
    "Mostrando conexiones principales resumidas. Cambia a vista detallada para verlas todas.",
  viewAllMainEdgesLabel: "Ver todas las conexiones principales",
  viewWeakEdgesLabel: "Ver señales locales",
  viewOrphanSignalsLabel: "Ver efectos sin pareja",
  viewExcessSignalsLabel: "Ver señales sin conexión clara",
  viewRedundancyLabel: "Ver patrones repetidos",
  glossaryTitle: "Glosario rápido",
  glossaryItems: [
    "Porcentaje de cartas con alguna señal semántica.",
    "Fuerza semántica: magnitud logarítmica del total de conexiones detectadas.",
    "Eventos consumidos sin productores en el mazo.",
    "Señales producidas sin consumidores en el mazo.",
    "Grupos con señales iguales.",
    "Conexión: vínculo dirigido entre dos cartas por señal compartida.",
    "Motivo: explicación de la conexión (evento/acción/recurso).",
  ],
} as const;

export function filterRedundancyGroups(
  groups: SemanticOverlayMetrics["redundancy_groups"],
): SemanticOverlayMetrics["redundancy_groups"] {
  return groups.filter((group) => group.signature !== "P: | C:");
}

type CoverageReason = { key: string; label: string; count: number; priority: number };
type CoverageReasonView = {
  key: string;
  label: string;
  count: number;
  examples?: string[];
};
type UncoveredAuditItem = {
  name: string;
  reasonId: SemanticCoverageReasonId | string;
  label: string;
};
type UncoveredAuditGroup = {
  reasonId: SemanticCoverageReasonId | string;
  label: string;
  count: number;
  cards: string[];
};

const SEMANTIC_KEY_TOKEN_UI_LABELS: Record<string, string> = {
  ENTERS_BATTLEFIELD: "entra al campo de batalla",
  CREATURE_DIES: "una criatura muere",
  LEAVES_BATTLEFIELD: "deja el campo de batalla",
  CAST_SPELL: "lanzar hechizo",
  DRAW_CARDS: "robar cartas",
  DRAW_EXTRA_CARD_TURN: "robar carta adicional del turno",
  DEAL_DAMAGE: "hacer daño",
  GAIN_LIFE: "ganar vida",
  LOSE_LIFE: "perder vida",
  CREATE_TOKEN: "crear fichas",
  TOKEN_CREATED: "ficha creada",
  TOKEN_GENERIC: "ficha genérica",
  BLOOD: "sangre",
  SCRY: "adivinar",
  ADD_COUNTERS: "poner contadores",
  PRODUCE_MANA: "producir maná",
  MILL_CARDS: "moler cartas",
  LIFE: "vida",
  MANA: "maná",
};

export const SEMANTIC_OVERLAY_AUDIT_TITLE = "Cartas no tierra pendientes de cobertura";
export const SEMANTIC_OVERLAY_AUDIT_HELP =
  "Agrupamos estas cartas por el motivo por el que todavía no entran en la cobertura semántica v1.";
export const SEMANTIC_OVERLAY_AUDIT_EXAMPLES_LIMIT = 3;

export function formatSemanticKeyLabelForUi(label: string): string {
  const match = label.match(/^(Event|Action|Resource)\s*·\s*(.+)$/);
  if (!match) return label;

  const category = match[1];
  const token = match[2]?.trim() ?? "";
  if (token.length === 0) return label;

  const normalizedToken = token.toUpperCase();
  const translatedToken =
    SEMANTIC_KEY_TOKEN_UI_LABELS[normalizedToken] ??
    normalizedToken.toLowerCase().replace(/_/g, " ");

  if (category === "Event") return `Evento: ${translatedToken}`;
  if (category === "Action") return `Acción: ${translatedToken}`;
  return `Recurso: ${translatedToken}`;
}

export function buildCoverageSummary(
  metrics: SemanticOverlayMetrics,
  resolvedUnique: number,
  missingUnique: number,
): { covered: number; total: number; percent: number } {
  const total = Math.max(0, resolvedUnique + missingUnique);
  const covered = Math.max(0, metrics.covered_count);
  const percent = total > 0 ? Math.round((covered / total) * 1000) / 10 : 0;
  return { covered, total, percent };
}

export function buildCoverageReasons(
  metrics: SemanticOverlayMetrics,
  resolvedUnique: number,
  missingUnique: number,
): Array<{ key: string; label: string; count: number }> {
  const missingIndex = Math.max(0, missingUnique);
  const unrecognized = Math.max(0, metrics.card_count - metrics.covered_count);
  const reasons: CoverageReason[] = [
    {
      key: "missing_index",
      label: SEMANTIC_OVERLAY_COPY.reasonMissingIndex,
      count: missingIndex,
      priority: 1,
    },
    {
      key: "unrecognized_text",
      label: SEMANTIC_OVERLAY_COPY.reasonUnrecognized,
      count: unrecognized,
      priority: 2,
    },
  ];

  return reasons
    .filter((reason) => reason.count > 0)
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      if (a.count !== b.count) return b.count - a.count;
      return a.key.localeCompare(b.key);
    })
    .slice(0, 5)
    .map(({ key, label, count }) => ({ key, label, count }));
}

export function mapCoverageReasonId(reasonId: SemanticCoverageReasonId | string): string {
  if (reasonId === "NO_ORACLE") return SEMANTIC_OVERLAY_COPY.reasonMissingIndex;
  if (reasonId === "NO_MATCH_V1_TEMPLATES") return SEMANTIC_OVERLAY_COPY.reasonUnrecognized;
  if (reasonId === "LAND_RULES_UNMODELED_V1") return "Carta reconocida (tierra), con reglas aún no modeladas en v1";
  if (reasonId === "EMPTY_TEXT") return "Sin texto analizable tras normalización";
  if (reasonId === "PARSE_ERROR") return "Texto reconocido, pero no interpretable por parser v1";
  return `Motivo: ${reasonId}`;
}

export function mapAuditReasonId(reasonId: SemanticCoverageReasonId | string): string {
  if (reasonId === "NO_ORACLE") return "No encontrada en índice o sin texto de reglas";
  if (reasonId === "EMPTY_TEXT") return "Sin texto analizable tras normalización";
  if (reasonId === "NO_MATCH_V1_TEMPLATES") return "Carta reconocida, pero texto aún fuera de plantillas v1";
  if (reasonId === "PARSE_ERROR") return "Texto reconocido, pero no interpretable por parser v1";
  if (reasonId === "LAND_RULES_UNMODELED_V1") return "Carta reconocida (tierra), con reglas aún no modeladas en v1";
  return mapCoverageReasonId(reasonId);
}

export function buildUncoveredNonLandAudit(
  coverageReport?: SemanticCoverageReport,
): { title: string; items: UncoveredAuditItem[] } | null {
  const raw = coverageReport?.uncoveredNonLand ?? [];
  if (raw.length === 0) return null;
  const items = raw.map((entry) => ({
    name: entry.name,
    reasonId: entry.reasonId,
    label: mapAuditReasonId(entry.reasonId),
  }));
  return { title: SEMANTIC_OVERLAY_AUDIT_TITLE, items };
}

export function buildUncoveredNonLandAuditGroups(
  audit: { title: string; items: UncoveredAuditItem[] } | null,
): UncoveredAuditGroup[] {
  if (!audit || audit.items.length === 0) return [];
  const grouped = new Map<string, UncoveredAuditGroup>();

  for (const item of audit.items) {
    const key = `${item.reasonId}::${item.label}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.count += 1;
      existing.cards.push(item.name);
      continue;
    }
    grouped.set(key, {
      reasonId: item.reasonId,
      label: item.label,
      count: 1,
      cards: [item.name],
    });
  }

  return Array.from(grouped.values())
    .map((group) => ({
      ...group,
      cards: [...group.cards].sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => {
      if (a.count !== b.count) return b.count - a.count;
      const byLabel = a.label.localeCompare(b.label);
      if (byLabel !== 0) return byLabel;
      return String(a.reasonId).localeCompare(String(b.reasonId));
    });
}

export function formatUncoveredAuditExamples(
  cards: string[],
  maxExamples = SEMANTIC_OVERLAY_AUDIT_EXAMPLES_LIMIT,
): string {
  const limit = Math.max(1, Math.floor(maxExamples));
  const examples = cards.slice(0, limit);
  const remaining = Math.max(0, cards.length - examples.length);
  if (remaining > 0) return `${examples.join(", ")} y ${remaining} más`;
  return examples.join(", ");
}

export function buildCoverageReasonsFromReport(
  coverageReport?: SemanticCoverageReport,
): CoverageReasonView[] {
  if (!coverageReport?.reasons?.length) return [];
  return coverageReport.reasons
    .filter((reason) => reason.count > 0)
    .map((reason, index) => ({ ...reason, index }))
    .sort((a, b) => {
      if (a.count !== b.count) return b.count - a.count;
      const byId = a.reasonId.localeCompare(b.reasonId);
      if (byId !== 0) return byId;
      return a.index - b.index;
    })
    .map((reason) => ({
      key: reason.reasonId,
      label: mapCoverageReasonId(reason.reasonId),
      count: reason.count,
      examples: reason.examples,
    }));
}

export function getSignalStatus(
  metrics: SemanticOverlayMetrics,
  mainEdgesCount = 0,
  weakEdgesCount = 0,
): { label: string; hint?: string } {
  if (metrics.SOS > 0 || mainEdgesCount > 0) {
    return { label: SEMANTIC_OVERLAY_COPY.signalFoundLabel };
  }
  if (weakEdgesCount > 0) {
    return { label: SEMANTIC_OVERLAY_COPY.localSignalFoundLabel };
  }
  return {
    label: SEMANTIC_OVERLAY_COPY.signalMissingLabel,
    hint: SEMANTIC_OVERLAY_COPY.signalMissingHint,
  };
}

export function partitionSemanticEdgesByStrength(
  edges: SemanticEdge[],
): { mainEdges: SemanticEdge[]; weakEdges: SemanticEdge[] } {
  return {
    mainEdges: edges.filter((edge) => edge.score > 0),
    weakEdges: edges.filter((edge) => edge.score <= 0),
  };
}

type Props = {
  metrics: SemanticOverlayMetrics;
  edges: SemanticEdge[];
  explainKey: (key: number) => string;
  explainKeyHuman: (
    key: number,
    reasonKeys?: number[],
    context?: ExplainKeyHumanContext,
  ) => string;
  idToName: Record<number, string>;
  deckEntriesCount: number;
  resolvedUnique: number;
  missingUnique: number;
  coverageReport?: SemanticCoverageReport;
  viewMode?: "compact" | "detailed";
};

export default function SemanticOverlayPanel({
  metrics,
  edges,
  explainKey,
  explainKeyHuman,
  idToName,
  deckEntriesCount,
  resolvedUnique,
  missingUnique,
  coverageReport,
  viewMode = "detailed",
}: Props) {
  const isCompact = viewMode === "compact";
  const coverage = buildCoverageSummary(metrics, resolvedUnique, missingUnique);
  const reportReasons = buildCoverageReasonsFromReport(coverageReport);
  const reasons: CoverageReasonView[] =
    reportReasons.length > 0
      ? reportReasons
      : buildCoverageReasons(metrics, resolvedUnique, missingUnique);
  const edgesTop = edges.slice(0, 10);
  const { mainEdges, weakEdges } = partitionSemanticEdgesByStrength(edgesTop);
  const visibleMainEdges = isCompact ? mainEdges.slice(0, 3) : mainEdges;
  const hiddenMainEdges = mainEdges.slice(visibleMainEdges.length);
  const status = getSignalStatus(metrics, mainEdges.length, weakEdges.length);
  const orphanTop = metrics.orphan_listeners.slice(0, 10);
  const excessTop = metrics.excess_producers.slice(0, 10);
  const groups = filterRedundancyGroups(metrics.redundancy_groups);
  const audit = buildUncoveredNonLandAudit(coverageReport);
  const auditGroups = buildUncoveredNonLandAuditGroups(audit);

  const renderEdgeList = (list: SemanticEdge[]) => (
    <ul className="semantic-list semantic-edge-list">
      {list.map((edge) => {
        const fromName = idToName[edge.from] ?? String(edge.from);
        const toName = idToName[edge.to] ?? String(edge.to);
        const reasons = edge.reasons.slice(0, 3);
        const reasonKeys = edge.reasons.map((reason) => reason.key);
        return (
          <li key={`${edge.from}-${edge.to}-${edge.score}`} className="semantic-edge-item">
            <div>
              {fromName} → {toName} ({SEMANTIC_OVERLAY_COPY.edgeScoreLabel} {edge.score})
            </div>
            {reasons.length > 0 && (
              <div className="muted semantic-edge-reasons">
                {reasons.map((reason) => {
                  const label = explainKeyHuman(reason.key, reasonKeys, {
                    cast_spell_context: edge.cast_spell_context,
                  });
                  const raw = label !== "Unknown" ? label : explainKey(reason.key);
                  const shown = formatSemanticKeyLabelForUi(raw);
                  return (
                    <div key={`${edge.from}-${edge.to}-${reason.key}`}>
                      {shown} × {reason.weight}
                    </div>
                  );
                })}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="panel semantic-overlay-panel">
      <h2>{SEMANTIC_OVERLAY_COPY.title}</h2>
      <p className="muted semantic-overlay-intro" style={{ whiteSpace: "pre-line" }}>
        {SEMANTIC_OVERLAY_COPY.intro}
      </p>
      <div className="semantic-status-row">
        <span className="badge semantic-status-badge">{status.label}</span>
        {status.hint && <p className="muted">{status.hint}</p>}
      </div>

      <div className="semantic-summary-grid">
        <div className="semantic-summary-card">
          <span className="muted semantic-summary-label">{SEMANTIC_OVERLAY_COPY.coverageLabel}</span>
          <strong className="semantic-summary-value">
            {coverage.percent}% ({coverage.covered}/{coverage.total})
          </strong>
        </div>
        <div className="semantic-summary-card">
          <span className="muted semantic-summary-label">{SEMANTIC_OVERLAY_COPY.sosLabel}</span>
          <strong className="semantic-summary-value">{metrics.SOS.toFixed(2)}</strong>
        </div>
        <div className="semantic-summary-card">
          <span className="muted semantic-summary-label">{SEMANTIC_OVERLAY_COPY.totalEdgeScoreLabel}</span>
          <strong className="semantic-summary-value">{metrics.total_edge_score}</strong>
        </div>
        <div className="semantic-summary-card">
          <span className="muted semantic-summary-label">{SEMANTIC_OVERLAY_COPY.resolvedLabel}</span>
          <strong className="semantic-summary-value">{resolvedUnique}</strong>
        </div>
        <div className="semantic-summary-card">
          <span className="muted semantic-summary-label">{SEMANTIC_OVERLAY_COPY.missingLabel}</span>
          <strong className="semantic-summary-value">{missingUnique}</strong>
        </div>
        <div className="semantic-summary-card">
          <span className="muted semantic-summary-label">{SEMANTIC_OVERLAY_COPY.entriesLabel}</span>
          <strong className="semantic-summary-value">{deckEntriesCount}</strong>
        </div>
      </div>

      <section className="semantic-block semantic-coverage-block">
        <h3>{SEMANTIC_OVERLAY_COPY.reasonsTitle}</h3>
        {reasons.length === 0 ? (
          <p className="muted">{SEMANTIC_OVERLAY_COPY.reasonsNone}</p>
        ) : (
          <ul className="semantic-list">
            {reasons.map((reason) => (
              <li key={reason.key}>
                {reason.label} · {reason.count}
                {reason.examples && reason.examples.length > 0 && (
                  <div className="muted">ej.: {reason.examples.join(", ")}</div>
                )}
              </li>
            ))}
          </ul>
        )}
        {audit && (
          <details className="semantic-audit">
            <summary>{audit.title}</summary>
            <p className="muted">{SEMANTIC_OVERLAY_AUDIT_HELP}</p>
            <ul className="semantic-list">
              {auditGroups.map((group) => (
                <li key={`${group.reasonId}-${group.label}`}>
                  {group.label} · {group.count}
                  <div className="muted">{formatUncoveredAuditExamples(group.cards)}</div>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      <section className="semantic-block semantic-edges-block">
        <h3>{SEMANTIC_OVERLAY_COPY.edgesTitle}</h3>
        <p className="muted">{SEMANTIC_OVERLAY_COPY.edgesIntro}</p>
        {visibleMainEdges.length === 0 ? (
          <p className="muted">{SEMANTIC_OVERLAY_COPY.noEdges}</p>
        ) : (
          renderEdgeList(visibleMainEdges)
        )}
        {isCompact && hiddenMainEdges.length > 0 && (
          <>
            <p className="muted semantic-compact-hint">{SEMANTIC_OVERLAY_COPY.compactMainEdgesHint}</p>
            <details className="semantic-section-details semantic-main-details">
              <summary>{SEMANTIC_OVERLAY_COPY.viewAllMainEdgesLabel}</summary>
              {renderEdgeList(hiddenMainEdges)}
            </details>
          </>
        )}
      </section>

      {weakEdges.length > 0 && (
        <section className="semantic-block semantic-weak-block">
          <h3>{SEMANTIC_OVERLAY_COPY.weakEdgesTitle}</h3>
          {isCompact ? (
            <details className="semantic-section-details" open={false}>
              <summary>{SEMANTIC_OVERLAY_COPY.viewWeakEdgesLabel}</summary>
              <p className="muted">{SEMANTIC_OVERLAY_COPY.weakEdgesHint}</p>
              {renderEdgeList(weakEdges)}
            </details>
          ) : (
            <>
              <p className="muted">{SEMANTIC_OVERLAY_COPY.weakEdgesHint}</p>
              {renderEdgeList(weakEdges)}
            </>
          )}
        </section>
      )}

      <section className="semantic-block">
        <h3>{SEMANTIC_OVERLAY_COPY.orphanTitle}</h3>
        {isCompact ? (
          <details className="semantic-section-details" open={false}>
            <summary>{SEMANTIC_OVERLAY_COPY.viewOrphanSignalsLabel}</summary>
            {orphanTop.length === 0 ? (
              <p className="muted">{SEMANTIC_OVERLAY_COPY.noneDetected}</p>
            ) : (
              <ul className="semantic-list">
                {orphanTop.map((row) => {
                  const label = explainKeyHuman(row.key);
                  const raw = label !== "Unknown" ? label : explainKey(row.key);
                  const shown = formatSemanticKeyLabelForUi(raw);
                  return (
                    <li key={`orphan-${row.key}`}>
                      {shown} · {row.consumed}
                    </li>
                  );
                })}
              </ul>
            )}
          </details>
        ) : (
          <>
            {orphanTop.length === 0 ? (
              <p className="muted">{SEMANTIC_OVERLAY_COPY.noneDetected}</p>
            ) : (
              <ul className="semantic-list">
                {orphanTop.map((row) => {
                  const label = explainKeyHuman(row.key);
                  const raw = label !== "Unknown" ? label : explainKey(row.key);
                  const shown = formatSemanticKeyLabelForUi(raw);
                  return (
                    <li key={`orphan-${row.key}`}>
                      {shown} · {row.consumed}
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </section>

      <section className="semantic-block">
        <h3>{SEMANTIC_OVERLAY_COPY.excessTitle}</h3>
        {isCompact ? (
          <details className="semantic-section-details" open={false}>
            <summary>{SEMANTIC_OVERLAY_COPY.viewExcessSignalsLabel}</summary>
            <p className="muted">{SEMANTIC_OVERLAY_COPY.excessHint}</p>
            {excessTop.length === 0 ? (
              <p className="muted">{SEMANTIC_OVERLAY_COPY.noneDetected}</p>
            ) : (
              <ul className="semantic-list">
                {excessTop.map((row) => {
                  const label = explainKeyHuman(row.key);
                  const raw = label !== "Unknown" ? label : explainKey(row.key);
                  const shown = formatSemanticKeyLabelForUi(raw);
                  return (
                    <li key={`excess-${row.key}`}>
                      {shown} · {row.produced}
                    </li>
                  );
                })}
              </ul>
            )}
          </details>
        ) : (
          <>
            <p className="muted">{SEMANTIC_OVERLAY_COPY.excessHint}</p>
            {excessTop.length === 0 ? (
              <p className="muted">{SEMANTIC_OVERLAY_COPY.noneDetected}</p>
            ) : (
              <ul className="semantic-list">
                {excessTop.map((row) => {
                  const label = explainKeyHuman(row.key);
                  const raw = label !== "Unknown" ? label : explainKey(row.key);
                  const shown = formatSemanticKeyLabelForUi(raw);
                  return (
                    <li key={`excess-${row.key}`}>
                      {shown} · {row.produced}
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </section>

      <section className="semantic-block">
        <h3>{SEMANTIC_OVERLAY_COPY.redundancyTitle}</h3>
        {isCompact ? (
          <details className="semantic-section-details" open={false}>
            <summary>{SEMANTIC_OVERLAY_COPY.viewRedundancyLabel}</summary>
            {groups.length === 0 ? (
              <p className="muted">{SEMANTIC_OVERLAY_COPY.redundancyNotApplicable}</p>
            ) : (
              <ul className="semantic-list">
                {groups.map((group) => (
                  <li key={group.signature}>
                    tamaño {group.size}:{" "}
                    {group.card_ids
                      .map((id) => idToName[id] ?? String(id))
                      .join(", ")}
                  </li>
                ))}
              </ul>
            )}
          </details>
        ) : (
          <>
            {groups.length === 0 ? (
              <p className="muted">{SEMANTIC_OVERLAY_COPY.redundancyNotApplicable}</p>
            ) : (
              <ul className="semantic-list">
                {groups.map((group) => (
                  <li key={group.signature}>
                    tamaño {group.size}:{" "}
                    {group.card_ids
                      .map((id) => idToName[id] ?? String(id))
                      .join(", ")}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      <details className="semantic-glossary">
        <summary>{SEMANTIC_OVERLAY_COPY.glossaryTitle}</summary>
        <ul className="semantic-list">
          {SEMANTIC_OVERLAY_COPY.glossaryItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}
