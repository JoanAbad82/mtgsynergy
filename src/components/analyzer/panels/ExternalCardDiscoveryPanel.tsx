import type { DeckContextCandidateScore } from "../../../engine/deck_context";
import type { DeckLegalFormat, LegalityCheckResult } from "../../../engine/deck_context/format_legality_v1";
import type { ManaFitResult } from "../../../engine/deck_context/mana_feasibility_v1";

export function ExternalCardDiscoveryPanel({
  candidates,
  loading,
  error,
  selectedFormat,
  legality,
  mana,
}: {
  candidates: readonly DeckContextCandidateScore[];
  loading: boolean;
  error: string | null;
  selectedFormat?: DeckLegalFormat | "";
  legality?: LegalityCheckResult | null;
  mana?: ManaFitResult | null;
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
      {selectedFormat && mana && (
        <div data-testid="mana-compatibility-summary">
          <p>
            Compatibilidad orientativa del maná: {mana.direct.length} candidatas
            con colores de coste producidos directamente por tierras del mazo;
            {" "}{mana.needsReview.length} requieren revisar fuentes de maná y
            {" "}{mana.unknown.length} no pueden clasificarse con estos datos.
          </p>
          {mana.sourceUpdatedAt && (
            <p>Datos de maná: Scryfall, {mana.sourceUpdatedAt.slice(0, 10)}.</p>
          )}
          <p>No verifica curva, cantidad de fuentes, tierras buscadas ni costes alternativos.</p>
          {mana.warning && <p role="status">{mana.warning}</p>}
        </div>
      )}
      {!loading && !error && candidates.length === 0 && selectedFormat !== "" && (!mana || mana.evaluatedCount === 0) && (
        <p>No se ha encontrado evidencia semántica suficiente para ordenar candidatas externas.</p>
      )}
      {candidates.length > 0 && (
        <>
          {selectedFormat && <p>Recomendaciones con legalidad de formato verificada y colores de coste cubiertos por fuentes directas:</p>}
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
              {row.warnings.filter((warning) => !(selectedFormat && legality?.legal.some((legalRow) => legalRow.candidate.identityKey === row.candidate.identityKey) && warning === "Compatibilidad semántica; legalidad de formato no verificada.")).map((warning) => (
                <small key={warning}>{warning}</small>
              ))}
            </li>
          ))}
        </ol>
        </>
      )}
      {selectedFormat && mana && (mana.needsReview.length > 0 || mana.unknown.length > 0) && (
        <details data-testid="mana-review-candidates">
          <summary>Otras cartas legales: revisar maná ({mana.needsReview.length + mana.unknown.length})</summary>
          <p>Son cartas legales en el formato, no prohibidas. No se certifica que puedan lanzarse con la base de maná actual.</p>
          {mana.needsReview.length > 0 && (
            <>
              <h3>Costes con colores sin fuente directa registrada</h3>
              <ol>
                {mana.needsReview.slice(0, 12).map((item) => (
                  <li key={item.row.candidate.identityKey}>
                    <strong>{item.row.candidate.card.name}</strong> ({item.row.contextualScore}/100):
                    {" "}{item.note}
                  </li>
                ))}
              </ol>
            </>
          )}
          {mana.unknown.length > 0 && (
            <>
              <h3>Maná no determinado</h3>
              <ol>
                {mana.unknown.slice(0, 12).map((item) => (
                  <li key={item.row.candidate.identityKey}>
                    <strong>{item.row.candidate.card.name}</strong> ({item.row.contextualScore}/100):
                    {" "}{item.note}
                  </li>
                ))}
              </ol>
            </>
          )}
        </details>
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
