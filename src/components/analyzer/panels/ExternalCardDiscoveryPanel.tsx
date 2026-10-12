import type { DeckContextCandidateScore } from "../../../engine/deck_context";
import type { DeckLegalFormat, LegalityCheckResult } from "../../../engine/deck_context/format_legality_v1";

export function ExternalCardDiscoveryPanel({
  candidates,
  loading,
  error,
  selectedFormat,
  legality,
}: {
  candidates: readonly DeckContextCandidateScore[];
  loading: boolean;
  error: string | null;
  selectedFormat?: DeckLegalFormat | "";
  legality?: LegalityCheckResult | null;
}) {
  return (
    <section className="analyzer-panel deck-context-panel" data-testid="external-card-discovery">
      <h2>Compatibilidad semántica externa</h2>
      {loading && <p>Analizando relaciones semánticas y buscando candidatas compatibles…</p>}
      {error && <p role="alert">{error}</p>}
      {selectedFormat === "" && !loading && (
        <p>Selecciona un formato para mostrar recomendaciones de legalidad comprobada.</p>
      )}
      {selectedFormat && legality?.sourceUpdatedAt && (
        <p data-testid="legality-provenance">
          Fuente: Scryfall, instantánea del {legality.sourceUpdatedAt.slice(0, 10)}.
          La legalidad puede cambiar después de esa fecha.
        </p>
      )}
      {selectedFormat && legality && (
        <p data-testid="legality-summary">
          Se han excluido {legality.excluded} candidatas confirmadas como no legales
          en {selectedFormat}. {legality.unknown.length} candidatas pendientes de verificación.
        </p>
      )}
      {legality?.warning && <p role="status">{legality.warning}</p>}
      {!loading && !error && candidates.length === 0 && selectedFormat !== "" && (
        <p>No se ha encontrado evidencia semántica suficiente para ordenar candidatas externas.</p>
      )}
      {candidates.length > 0 && (
        <>
          {selectedFormat && <p>Recomendaciones con legalidad de formato verificada:</p>}
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
        </>
      )}
      {selectedFormat && legality && legality.unknown.length > 0 && (
        <div data-testid="unverified-legality-candidates">
          <h3>Sin legalidad confirmada (no recomendadas)</h3>
          <p>Datos ausentes, caducados o con restricciones. No se presentan como cartas legales.</p>
          <ul>
            {legality.unknown.slice(0, 4).map((row) => (
              <li key={row.candidate.identityKey}>{row.candidate.card.name} — no verificada</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
