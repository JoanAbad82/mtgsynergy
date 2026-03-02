import type { SemanticEdge } from "../../engine/semantic/overlay/sem_edges";
import type { SemanticOverlayMetrics } from "../../engine/semantic/overlay/sem_metrics";

export const SEMANTIC_OVERLAY_COPY = {
  title: "Superposición semántica (experimental)",
  intro:
    "Esto es experimental. Busca conexiones por “producido/consumido” a partir del texto de reglas.\nEl objetivo es detectar patrones entre cartas sin depender de roles manuales.",
  coverageLabel: "Cobertura",
  resolvedLabel: "únicas resueltas",
  missingLabel: "únicas faltantes",
  entriesLabel: "entradas del mazo",
  sosLabel: "SOS",
  totalEdgeScoreLabel: "puntuación total de conexiones",
  signalFoundLabel: "✅ Señal encontrada (experimental)",
  signalMissingLabel: "⚠️ Sin señal (experimental)",
  signalMissingHint: "Normal en mazos simples o reglas aún no cubiertas.",
  reasonsTitle: "Motivos (v1)",
  reasonsNone: "Sin incidencias destacables.",
  reasonMissingIndex: "No encontrada en índice o sin texto de reglas",
  reasonUnrecognized: "Texto aún no reconocido (v1)",
  edgesTitle: "Conexiones semánticas principales",
  noEdges: "No hay conexiones semánticas.",
  edgeScoreLabel: "puntuación",
  orphanTitle: "Efectos sin pareja",
  excessTitle: "Generas más de lo que usas",
  noneDetected: "No se detectaron.",
  redundancyTitle: "Efectos repetidos",
  redundancyNotApplicable: "No aplicable (sin señal).",
  glossaryTitle: "Glosario rápido",
  glossaryItems: [
    "Porcentaje de cartas con alguna señal semántica.",
    "SOS: magnitud logarítmica del total de conexiones detectadas.",
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

export function getSignalStatus(metrics: SemanticOverlayMetrics): { label: string; hint?: string } {
  if (metrics.SOS > 0) {
    return { label: SEMANTIC_OVERLAY_COPY.signalFoundLabel };
  }
  return {
    label: SEMANTIC_OVERLAY_COPY.signalMissingLabel,
    hint: SEMANTIC_OVERLAY_COPY.signalMissingHint,
  };
}

type Props = {
  metrics: SemanticOverlayMetrics;
  edges: SemanticEdge[];
  explainKey: (key: number) => string;
  explainKeyHuman: (key: number) => string;
  idToName: Record<number, string>;
  deckEntriesCount: number;
  resolvedUnique: number;
  missingUnique: number;
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
}: Props) {
  const coverage = buildCoverageSummary(metrics, resolvedUnique, missingUnique);
  const reasons = buildCoverageReasons(metrics, resolvedUnique, missingUnique);
  const status = getSignalStatus(metrics);
  const edgesTop = edges.slice(0, 10);
  const orphanTop = metrics.orphan_listeners.slice(0, 10);
  const excessTop = metrics.excess_producers.slice(0, 10);
  const groups = filterRedundancyGroups(metrics.redundancy_groups);

  return (
    <div className="panel">
      <h2>{SEMANTIC_OVERLAY_COPY.title}</h2>
      <p className="muted" style={{ whiteSpace: "pre-line" }}>
        {SEMANTIC_OVERLAY_COPY.intro}
      </p>
      <p className="muted">{status.label}</p>
      {status.hint && <p className="muted">{status.hint}</p>}
      <p>
        {SEMANTIC_OVERLAY_COPY.coverageLabel}: {coverage.percent}% ({coverage.covered}/{coverage.total})
      </p>
      {reasons.length === 0 ? (
        <p className="muted">
          {SEMANTIC_OVERLAY_COPY.reasonsTitle}: {SEMANTIC_OVERLAY_COPY.reasonsNone}
        </p>
      ) : (
        <>
          <p className="muted">{SEMANTIC_OVERLAY_COPY.reasonsTitle}:</p>
          <ul>
            {reasons.map((reason) => (
              <li key={reason.key}>
                {reason.label} · {reason.count}
              </li>
            ))}
          </ul>
        </>
      )}
      <p>
        {SEMANTIC_OVERLAY_COPY.resolvedLabel}: {resolvedUnique} · {SEMANTIC_OVERLAY_COPY.missingLabel}: {missingUnique} ·{" "}
        {SEMANTIC_OVERLAY_COPY.entriesLabel}: {deckEntriesCount}
      </p>
      <p>
        {SEMANTIC_OVERLAY_COPY.sosLabel}: {metrics.SOS.toFixed(2)} · {SEMANTIC_OVERLAY_COPY.totalEdgeScoreLabel}:{" "}
        {metrics.total_edge_score}
      </p>

      <h3>{SEMANTIC_OVERLAY_COPY.edgesTitle}</h3>
      {edgesTop.length === 0 ? (
        <p className="muted">{SEMANTIC_OVERLAY_COPY.noEdges}</p>
      ) : (
        <ul>
          {edgesTop.map((edge) => {
            const fromName = idToName[edge.from] ?? String(edge.from);
            const toName = idToName[edge.to] ?? String(edge.to);
            const reasons = edge.reasons.slice(0, 3);
            return (
              <li key={`${edge.from}-${edge.to}-${edge.score}`}>
                {fromName} → {toName} ({SEMANTIC_OVERLAY_COPY.edgeScoreLabel} {edge.score})
                {reasons.length > 0 && (
                  <div className="muted">
                    {reasons.map((reason) => {
                      const label = explainKeyHuman(reason.key);
                      const shown = label !== "Unknown" ? label : explainKey(reason.key);
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
      )}

      <h3>{SEMANTIC_OVERLAY_COPY.orphanTitle}</h3>
      {orphanTop.length === 0 ? (
        <p className="muted">{SEMANTIC_OVERLAY_COPY.noneDetected}</p>
      ) : (
        <ul>
          {orphanTop.map((row) => {
            const label = explainKeyHuman(row.key);
            const shown = label !== "Unknown" ? label : explainKey(row.key);
            return (
              <li key={`orphan-${row.key}`}>
                {shown} · {row.consumed}
              </li>
            );
          })}
        </ul>
      )}

      <h3>{SEMANTIC_OVERLAY_COPY.excessTitle}</h3>
      {excessTop.length === 0 ? (
        <p className="muted">{SEMANTIC_OVERLAY_COPY.noneDetected}</p>
      ) : (
        <ul>
          {excessTop.map((row) => {
            const label = explainKeyHuman(row.key);
            const shown = label !== "Unknown" ? label : explainKey(row.key);
            return (
              <li key={`excess-${row.key}`}>
                {shown} · {row.produced}
              </li>
            );
          })}
        </ul>
      )}

      <h3>{SEMANTIC_OVERLAY_COPY.redundancyTitle}</h3>
      {groups.length === 0 ? (
        <p className="muted">{SEMANTIC_OVERLAY_COPY.redundancyNotApplicable}</p>
      ) : (
        <ul>
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

      <details>
        <summary>{SEMANTIC_OVERLAY_COPY.glossaryTitle}</summary>
        <ul>
          {SEMANTIC_OVERLAY_COPY.glossaryItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}
