import { SemanticEdge } from "../../engine/semantic/overlay/sem_edges";
import { SemanticOverlayMetrics } from "../../engine/semantic/overlay/sem_metrics";

type Props = {
  metrics: SemanticOverlayMetrics;
  edges: SemanticEdge[];
  explainKey: (key: number) => string;
  idToName: Record<number, string>;
  deckEntriesCount: number;
};

export default function SemanticOverlayPanel({
  metrics,
  edges,
  explainKey,
  idToName,
  deckEntriesCount,
}: Props) {
  const coveragePct = Math.round(metrics.semantic_coverage * 1000) / 10;
  const edgesTop = edges.slice(0, 10);
  const orphanTop = metrics.orphan_listeners.slice(0, 10);
  const excessTop = metrics.excess_producers.slice(0, 10);
  const groups = metrics.redundancy_groups;

  return (
    <div className="panel">
      <h2>Semantic Overlay (Experimental)</h2>
      <p>
        coverage: {coveragePct}% ({metrics.covered_count}/{metrics.card_count})
      </p>
      <p>
        unique cards analyzed: {metrics.card_count} / deck entries: {deckEntriesCount}
      </p>
      <p>
        SOS: {metrics.SOS.toFixed(2)} · total edge score: {metrics.total_edge_score}
      </p>

      <h3>Top Semantic Edges</h3>
      {edgesTop.length === 0 ? (
        <p className="muted">No semantic edges.</p>
      ) : (
        <ul>
          {edgesTop.map((edge) => {
            const fromName = idToName[edge.from] ?? String(edge.from);
            const toName = idToName[edge.to] ?? String(edge.to);
            const reasons = edge.reasons.slice(0, 3);
            return (
              <li key={`${edge.from}-${edge.to}-${edge.score}`}>
                {fromName} → {toName} (score {edge.score})
                {reasons.length > 0 && (
                  <div className="muted">
                    {reasons.map((reason) => (
                      <div key={`${edge.from}-${edge.to}-${reason.key}`}>
                        {explainKey(reason.key)} × {reason.weight}
                      </div>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <h3>Orphan listeners</h3>
      {orphanTop.length === 0 ? (
        <p className="muted">None detected.</p>
      ) : (
        <ul>
          {orphanTop.map((row) => (
            <li key={`orphan-${row.key}`}>
              {row.explain} · {row.consumed}
            </li>
          ))}
        </ul>
      )}

      <h3>Excess producers</h3>
      {excessTop.length === 0 ? (
        <p className="muted">None detected.</p>
      ) : (
        <ul>
          {excessTop.map((row) => (
            <li key={`excess-${row.key}`}>
              {row.explain} · {row.produced}
            </li>
          ))}
        </ul>
      )}

      <h3>Redundancy groups</h3>
      {groups.length === 0 ? (
        <p className="muted">None detected.</p>
      ) : (
        <ul>
          {groups.map((group) => (
            <li key={group.signature}>
              size {group.size}:{" "}
              {group.card_ids
                .map((id) => idToName[id] ?? String(id))
                .join(", ")}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
