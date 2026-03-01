import type { SemanticEdge } from "../../engine/semantic/overlay/sem_edges";
import type { SemanticOverlayMetrics } from "../../engine/semantic/overlay/sem_metrics";

export const SEMANTIC_OVERLAY_COPY = {
  title: "Superposición semántica (experimental)",
  intro:
    "Esto es experimental. Busca conexiones por “producido/consumido” a partir del texto de reglas.\nEl objetivo es detectar patrones entre cartas sin depender de roles manuales.",
  coverageLabel: "cobertura",
  resolvedLabel: "únicas resueltas",
  missingLabel: "únicas faltantes",
  entriesLabel: "entradas del mazo",
  sosLabel: "SOS",
  totalEdgeScoreLabel: "puntuación total de conexiones",
  edgesTitle: "Conexiones semánticas principales",
  noEdges: "No hay conexiones semánticas.",
  edgeScoreLabel: "puntuación",
  orphanTitle: "Escuchas huérfanas",
  excessTitle: "Productores en exceso",
  noneDetected: "No se detectaron.",
  redundancyTitle: "Grupos de redundancia",
  redundancyNotApplicable: "Redundancias semánticas: no aplicable (sin señal).",
  zeroScoreMessage:
    "Aún no hay conexiones semánticas detectables con las reglas actuales (v1).",
  zeroScoreCauses: "Posibles causas: mazo muy simple / parser aún cubre pocas plantillas.",
  glossaryTitle: "Glosario rápido",
  glossaryItems: [
    "Coverage: porcentaje de cartas con alguna señal semántica.",
    "SOS: magnitud logarítmica del total de conexiones detectadas.",
    "Orphan: evento/acción consumida sin productores en el mazo.",
    "Excess: evento/acción producida sin consumidores en el mazo.",
    "Edge: conexión dirigida entre dos cartas por señal compartida.",
    "Reason: explicación de la conexión (evento/acción/recurso).",
  ],
} as const;

export function filterRedundancyGroups(
  groups: SemanticOverlayMetrics["redundancy_groups"],
): SemanticOverlayMetrics["redundancy_groups"] {
  return groups.filter((group) => group.signature !== "P: | C:");
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
  const coveragePct = Math.round(metrics.semantic_coverage * 1000) / 10;
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
      <p>
        {SEMANTIC_OVERLAY_COPY.coverageLabel}: {coveragePct}% ({metrics.covered_count}/{metrics.card_count})
      </p>
      <p>
        {SEMANTIC_OVERLAY_COPY.resolvedLabel}: {resolvedUnique} · {SEMANTIC_OVERLAY_COPY.missingLabel}: {missingUnique} ·{" "}
        {SEMANTIC_OVERLAY_COPY.entriesLabel}: {deckEntriesCount}
      </p>
      <p>
        {SEMANTIC_OVERLAY_COPY.sosLabel}: {metrics.SOS.toFixed(2)} · {SEMANTIC_OVERLAY_COPY.totalEdgeScoreLabel}:{" "}
        {metrics.total_edge_score}
      </p>
      {metrics.total_edge_score === 0 && (
        <p className="muted">
          {SEMANTIC_OVERLAY_COPY.zeroScoreMessage} {SEMANTIC_OVERLAY_COPY.zeroScoreCauses}
        </p>
      )}

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
