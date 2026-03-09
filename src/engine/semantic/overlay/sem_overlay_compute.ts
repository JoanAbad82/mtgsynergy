import type { CardRecordMin } from "../../cards/types";
import { normalizeCardName } from "../../cards/normalize";
import { normalizeOracleTextV1 } from "../normalize";
import { EventId } from "../contract";
import { parseSemanticIrV0 } from "../parser/sem_parser_v1";
import { buildSemanticEdges, type SemanticEdge } from "./sem_edges";
import { buildSemanticOverlayMetrics } from "./sem_metrics";
import { KeyKind, keyOf } from "./sem_profile";

type OverlayComputeResult = {
  metrics: ReturnType<typeof buildSemanticOverlayMetrics>;
  edgesTop: ReturnType<typeof buildSemanticEdges>;
  idToName: Record<number, string>;
  resolvedUnique: number;
  missingUnique: number;
  deckEntriesCount: number;
};

function selectEdgesTop(edges: SemanticEdge[], topN: number): SemanticEdge[] {
  const top = edges.slice(0, topN);
  if (topN <= 0 || edges.length === 0) return top;

  const diesKey = keyOf(KeyKind.EVENT, EventId.CREATURE_DIES);
  const isLocalDiesEdge = (edge: SemanticEdge) =>
    !!edge.local_only && edge.reasons.some((reason) => reason.key === diesKey);

  if (top.some(isLocalDiesEdge)) return top;

  const candidates = edges.filter(
    (edge) => isLocalDiesEdge(edge) && !top.includes(edge) && edge.from !== edge.to,
  );
  const nonDiesReasonCount = (edge: SemanticEdge) =>
    edge.reasons.filter((reason) => reason.key !== diesKey).length;
  const isBetterCandidate = (next: SemanticEdge, best: SemanticEdge) => {
    if (next.reasons.length !== best.reasons.length) {
      return next.reasons.length > best.reasons.length;
    }
    const nextNonDies = nonDiesReasonCount(next);
    const bestNonDies = nonDiesReasonCount(best);
    if (nextNonDies !== bestNonDies) {
      return nextNonDies > bestNonDies;
    }
    if (next.from !== best.from) return next.from < best.from;
    return next.to < best.to;
  };

  let candidate: SemanticEdge | null = null;
  for (const edge of candidates) {
    if (!candidate || isBetterCandidate(edge, candidate)) {
      candidate = edge;
    }
  }
  if (!candidate) return top;

  if (top.length < topN) {
    return [...top, candidate];
  }

  const next = [...top];
  next[next.length - 1] = candidate;
  return next;
}

export async function computeSemanticOverlayFromDeckEntries(
  entries: Array<{ name: string }>,
  lookup: (name: string) => Promise<CardRecordMin | null>,
): Promise<OverlayComputeResult> {
  const uniqueNames = Array.from(new Set(entries.map((entry) => entry.name)));
  const resolved = await Promise.all(
    uniqueNames.map(async (name) => {
      const card = await lookup(name);
      if (!card || !card.oracle_text) return null;
      return {
        name: card.name,
        name_norm: card.name_norm ?? normalizeCardName(card.name),
        oracle_text: card.oracle_text,
        type_line: card.type_line ?? null,
      };
    }),
  );

  const found = resolved.filter(
    (card): card is NonNullable<typeof card> => !!card,
  );
  const resolvedUnique = found.length;
  const missingUnique = uniqueNames.length - resolvedUnique;

  const byNorm = new Map<string, (typeof found)[number]>();
  for (const card of found) {
    if (!byNorm.has(card.name_norm)) {
      byNorm.set(card.name_norm, card);
    }
  }

  const ordered = Array.from(byNorm.values()).sort((a, b) =>
    a.name_norm.localeCompare(b.name_norm),
  );
  const idToName: Record<number, string> = {};
  const cards = ordered.map((card, index) => {
    const oracleText = normalizeOracleTextV1(card.oracle_text ?? "");
    const ir = parseSemanticIrV0({
      name: card.name,
      oracle_text: oracleText,
      type_line: card.type_line ?? null,
    });
    const card_id = index + 1;
    ir.card_id = card_id;
    idToName[card_id] = card.name;
    return { card_id, ir, oracle_text: oracleText };
  });

  const edges = buildSemanticEdges(cards);
  const metrics = buildSemanticOverlayMetrics({ cards, edges, topN: 10 });
  const edgesTop = selectEdgesTop(edges, 10);

  return {
    metrics,
    edgesTop,
    idToName,
    resolvedUnique,
    missingUnique,
    deckEntriesCount: entries.length,
  };
}
