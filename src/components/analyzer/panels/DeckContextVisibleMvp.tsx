import { useEffect, useState } from "preact/hooks";
import type { ShareDeckState } from "../../../engine";
import { computeSemanticOverlayFromDeckEntries } from "../../../engine/semantic/overlay/sem_overlay_compute";
import {
  buildCandidateAnchorSemanticConnections,
  buildDeckSemanticCompatibilityContext,
  retrieveBoundedDeckContextCandidates,
  scoreDeckContextCandidate,
  selectDeckSemanticAnchors,
  MAX_CONTEXTUALLY_SCORED_CANDIDATES,
  MAX_VISIBLE_RESULTS,
  type DeckContextCandidateScore,
  type DeckSemanticCompatibilityContext,
} from "../../../engine";
import { DeckSemanticCompatibilityPanel } from "./DeckSemanticCompatibilityPanel";
import { ExternalCardDiscoveryPanel } from "./ExternalCardDiscoveryPanel";
import { lookupCard } from "../../../engine/cards/lookup";
import {
  selectFormatLegalCandidates, SUPPORTED_DECK_FORMATS,
  type DeckLegalFormat, type LegalityCheckResult,
} from "../../../engine/deck_context/format_legality_v1";

export function DeckContextVisibleMvp({
  deckState,
}: {
  deckState: ShareDeckState | null;
}) {
  const [context, setContext] = useState<DeckSemanticCompatibilityContext | null>(null);
  const [candidates, setCandidates] = useState<DeckContextCandidateScore[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<DeckLegalFormat | "">("");
  const [legality, setLegality] = useState<LegalityCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!deckState) {
      setContext(null);
      setCandidates([]);
      setLegality(null);
      setError(null);
      return;
    }

    const run = async () => {
      setLoading(true);
      setCandidates([]);
      setLegality(null);
      setError(null);
      try {
        const entries = deckState.deck.entries;
        const overlay = await computeSemanticOverlayFromDeckEntries(entries,
          lookupCard);
        const anchors = selectDeckSemanticAnchors({
          entries,
          edges: overlay.edgesTop,
          idToName: overlay.idToName,
        });
        const internal = buildDeckSemanticCompatibilityContext({
          entries,
          edges: overlay.edgesTop,
          idToName: overlay.idToName,
          coverage: null,
        });

        if (!selectedFormat) {
          if (!cancelled) {
            setContext(internal);
            setLegality(null);
            setCandidates([]);
          }
          return; // do not rank unused recommendations until a format is chosen
        }

        const retrieval = await retrieveBoundedDeckContextCandidates({
          anchors,
          presentCards: entries.map((entry) => ({ nameNorm: entry.name_norm })),
        });

        const scored: DeckContextCandidateScore[] = [];
        for (const candidate of retrieval.candidates.slice(
          0,
          MAX_CONTEXTUALLY_SCORED_CANDIDATES,
        )) {
          const built = await buildCandidateAnchorSemanticConnections({
            candidate: candidate.card,
            anchors,
          });
          if (built.connections.length === 0) continue;
          const row = scoreDeckContextCandidate({
            candidate,
            connections: built.connections,
            hasIncompleteEvidence: built.degradations.some(
              (item) => item.reason !== "no_cross_edge",
            ),
          });
          if (row.evidenceLevel !== "inconclusive") scored.push(row);
        }

        const retrievalRank = new Map(retrieval.candidates.map((item, index) => [item.identityKey, index]));
        scored.sort(
          (a, b) =>
            b.contextualScore - a.contextualScore ||
            b.connectedDeckCardCount - a.connectedDeckCardCount ||
            b.reasons.length - a.reasons.length ||
            (retrievalRank.get(a.candidate.identityKey) ?? Infinity) -
              (retrievalRank.get(b.candidate.identityKey) ?? Infinity) ||
            a.candidate.card.name.localeCompare(b.candidate.card.name),
        );

        // Never label semantic matches as playable suggestions without a
        // deliberately selected format and a bounded Scryfall snapshot.
        const checked = selectedFormat
          ? await selectFormatLegalCandidates(scored, selectedFormat)
          : null;
        if (!cancelled) {
          setContext(internal);
          setLegality(checked);
          setCandidates(checked ? checked.legal.slice(0, MAX_VISIBLE_RESULTS) : []);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof Error
              ? caught.message
              : "No se pudo completar el análisis semántico externo.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [deckState, selectedFormat]);

  if (!deckState) return null;

  return (
    <>
      {context && <DeckSemanticCompatibilityPanel context={context} />}
      <div className="analyzer-panel deck-context-panel" data-testid="deck-format-picker">
        <label htmlFor="deck-context-format">Formato para comprobar legalidad de las recomendaciones</label>
        <select
          id="deck-context-format"
          value={selectedFormat}
          onChange={(event) => setSelectedFormat(event.currentTarget.value as DeckLegalFormat | "")}
        >
          <option value="">Selecciona un formato (obligatorio)</option>
          {SUPPORTED_DECK_FORMATS.map((item) => (
            <option value={item} key={item}>{item[0].toUpperCase() + item.slice(1)}</option>
          ))}
        </select>
        <p className="muted">
          La legalidad se consulta en una instantánea local de Scryfall. No se envían cartas
          del mazo a Scryfall. Si faltan datos o están caducados, no se presentan como verificadas.
        </p>
      </div>
      <ExternalCardDiscoveryPanel
        candidates={candidates}
        loading={loading}
        error={error}
        selectedFormat={selectedFormat}
        legality={legality}
      />
    </>
  );
}
