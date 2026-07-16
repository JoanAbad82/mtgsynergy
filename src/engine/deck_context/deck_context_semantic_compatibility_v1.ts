import type { CardEntry } from "../domain/types";
import type { SemanticEdge } from "../semantic/overlay/sem_edges";
import type {
  DeckContextAnchor,
  DeckSemanticCompatibilityContext,
} from "./types";
import { MAX_DECK_ANCHORS } from "./types";

function edgeScoreByCard(edges: readonly SemanticEdge[]) {
  const byCard = new Map<number, { score: number; reasons: Set<number>; peers: Set<number> }>();
  for (const edge of edges) {
    if (edge.from === edge.to || edge.local_only) continue;
    for (const id of [edge.from, edge.to]) {
      const row = byCard.get(id) ?? { score: 0, reasons: new Set<number>(), peers: new Set<number>() };
      row.score += edge.score;
      for (const reason of edge.reasons) row.reasons.add(reason.key);
      row.peers.add(id === edge.from ? edge.to : edge.from);
      byCard.set(id, row);
    }
  }
  return byCard;
}

export function selectDeckSemanticAnchors(input: {
  entries: readonly CardEntry[];
  edges: readonly SemanticEdge[];
  idToName: Readonly<Record<number, string>>;
}): DeckContextAnchor[] {
  const scores = edgeScoreByCard(input.edges);
  const nameToId = new Map(
    Object.entries(input.idToName).map(([id, name]) => [name, Number(id)]),
  );

  return input.entries
    .map((entry) => {
      const id = nameToId.get(entry.name);
      const row = id === undefined ? undefined : scores.get(id);
      return {
        key: `name:${entry.name_norm}`,
        name: entry.name,
        nameNorm: entry.name_norm,
        count: entry.count,
        rankScore: row?.score ?? 0,
        reasonCount: row?.reasons.size ?? 0,
        peerCount: row?.peers.size ?? 0,
        evidence: row ? ("supported" as const) : ("limited" as const),
      };
    })
    .sort(
      (a, b) =>
        Number(b.evidence === "supported") - Number(a.evidence === "supported") ||
        b.rankScore - a.rankScore ||
        b.reasonCount - a.reasonCount ||
        b.peerCount - a.peerCount ||
        b.count - a.count ||
        a.nameNorm.localeCompare(b.nameNorm),
    )
    .slice(0, MAX_DECK_ANCHORS)
    .map((row, rank) => ({
      key: row.key,
      name: row.name,
      nameNorm: row.nameNorm,
      count: row.count,
      rank,
      evidence: row.evidence,
    }));
}

export function buildDeckSemanticCompatibilityContext(input: {
  entries: readonly CardEntry[];
  edges: readonly SemanticEdge[];
  idToName: Readonly<Record<number, string>>;
  coverage?: number | null;
}): DeckSemanticCompatibilityContext {
  const qualifying = input.edges.filter(
    (edge) => edge.from !== edge.to && !edge.local_only,
  );
  const connectedNames = new Set<string>();
  for (const edge of qualifying) {
    const from = input.idToName[edge.from];
    const to = input.idToName[edge.to];
    if (from) connectedNames.add(from);
    if (to) connectedNames.add(to);
  }

  return {
    recognizedCards: [...input.entries],
    uniqueCardCount: input.entries.length,
    internalConnectionCount: qualifying.length,
    topRelations: qualifying.slice(0, 10).map((edge) => ({
      from: input.idToName[edge.from] ?? String(edge.from),
      to: input.idToName[edge.to] ?? String(edge.to),
      score: edge.score,
      reasons: edge.reasons,
    })),
    coverage: input.coverage ?? null,
    limitedEvidenceCards: input.entries
      .filter((entry) => !connectedNames.has(entry.name))
      .map((entry) => entry.name),
    isolatedCards: input.entries
      .filter((entry) => !connectedNames.has(entry.name))
      .map((entry) => entry.name),
  };
}
