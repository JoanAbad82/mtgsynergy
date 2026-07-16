import type { DeckContextCandidateScore } from "../../../engine/deck_context";

export function ExternalCardDiscoveryPanel({
  candidates,
  loading,
  error,
}: {
  candidates: readonly DeckContextCandidateScore[];
  loading: boolean;
  error: string | null;
}) {
  return (
    <section className="analyzer-panel deck-context-panel" data-testid="external-card-discovery">
      <h2>Compatibilidad semántica externa</h2>
      {loading && <p>Analizando relaciones semánticas y buscando candidatas compatibles…</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && !error && candidates.length === 0 && (
        <p>No se ha encontrado evidencia semántica suficiente para ordenar candidatas externas.</p>
      )}
      {candidates.length > 0 && (
        <ol>
          {candidates.map((row) => (
            <li key={row.candidate.identityKey}>
              <h3>
                {row.candidate.card.name} · {row.contextualScore}/100
              </h3>
              <p>
                Conecta con {row.connectedDeckCardCount} carta(s):{" "}
                {row.relatedDeckCards.map((card) => card.name).join(", ")}
              </p>
              <p>
                Evidencia: {row.evidenceLevel} · razones:{" "}
                {row.reasons.map((reason) => reason.key).join(", ") || "limitadas"}
              </p>
              {row.warnings.map((warning) => (
                <small key={warning}>{warning}</small>
              ))}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
