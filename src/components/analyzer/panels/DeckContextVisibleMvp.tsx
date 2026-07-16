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

export function DeckContextVisibleMvp({
  deckState,
}: {
  deckState: ShareDeckState | null;
}) {
  const [context, setContext] = useState<DeckSemanticCompatibilityContext | null>(null);
  const [candidates, setCandidates] = useState<DeckContextCandidateScore[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!deckState) {
      setContext(null);
      setCandidates([]);
      setError(null);
      return;
    }

    const run = async () => {
      setLoading(true);
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

        scored.sort(
          (a, b) =>
            b.contextualScore - a.contextualScore ||
            b.connectedDeckCardCount - a.connectedDeckCardCount ||
            b.reasons.length - a.reasons.length ||
            a.candidate.card.name.localeCompare(b.candidate.card.name),
        );

        if (!cancelled) {
          setContext(internal);
          setCandidates(scored.slice(0, MAX_VISIBLE_RESULTS));
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
  }, [deckState]);

  if (!deckState) return null;

  return (
    <>
      {context && <DeckSemanticCompatibilityPanel context={context} />}
      <ExternalCardDiscoveryPanel
        candidates={candidates}
        loading={loading}
        error={error}
      />
    </>
  );
}
