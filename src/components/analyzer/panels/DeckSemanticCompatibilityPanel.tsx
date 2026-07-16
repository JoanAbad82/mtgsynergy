import type { DeckSemanticCompatibilityContext } from "../../../engine/deck_context";

export function DeckSemanticCompatibilityPanel({
  context,
}: {
  context: DeckSemanticCompatibilityContext;
}) {
  return (
    <section className="analyzer-panel deck-context-panel" data-testid="deck-semantic-context">
      <h2>Contexto semántico del mazo</h2>
      <p>
        {context.uniqueCardCount} cartas únicas analizadas ·{" "}
        {context.internalConnectionCount} conexiones internas observadas.
      </p>
      {context.topRelations.length > 0 ? (
        <ul>
          {context.topRelations.map((relation, index) => (
            <li key={`${relation.from}-${relation.to}-${index}`}>
              <strong>{relation.from}</strong> → <strong>{relation.to}</strong>{" "}
              <span>({relation.score})</span>
            </li>
          ))}
        </ul>
      ) : (
        <p>No se han observado conexiones internas suficientes.</p>
      )}
      {context.isolatedCards.length > 0 && (
        <p>
          Evidencia limitada: {context.isolatedCards.slice(0, 8).join(", ")}
        </p>
      )}
    </section>
  );
}
