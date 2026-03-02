import type { SemanticCardIR } from "../contract";
import { buildSemanticCardProfile } from "./sem_profile";

export type SemanticEdgeReason = {
  key: number;
  weight: number;
};

export type SemanticEdge = {
  from: number;
  to: number;
  score: number;
  reasons: SemanticEdgeReason[];
};

type CardInput = {
  card_id: number;
  ir: SemanticCardIR;
  oracle_text?: string;
};

export function buildSemanticEdges(inputCards: CardInput[]): SemanticEdge[] {
  const cards = inputCards.map((card) => ({
    ...card,
    profile:
      (card as { profile?: ReturnType<typeof buildSemanticCardProfile> }).profile ??
      buildSemanticCardProfile(card.ir, card.oracle_text ?? ""),
  }));

  const edges: SemanticEdge[] = [];

  for (let i = 0; i < cards.length; i += 1) {
    for (let j = 0; j < cards.length; j += 1) {
      if (i === j) continue;
      const from = cards[i];
      const to = cards[j];
      if (from.card_id === to.card_id) continue;

      let score = 0;
      const reasons: SemanticEdgeReason[] = [];
      const producedEntries = Array.from(from.profile.produced.entries()).sort((a, b) => a[0] - b[0]);
      for (const [key, prodEntry] of producedEntries) {
        const consEntry = to.profile.consumed.get(key);
        const consWeight = consEntry?.count ?? 0;
        if (!consWeight) continue;
        if (prodEntry.origin === "cost" && consEntry?.origin === "cost") continue;
        const weight = Math.min(prodEntry.count, consWeight);
        if (weight <= 0) continue;
        score += weight;
        reasons.push({ key, weight });
      }

      if (score > 0) {
        reasons.sort((a, b) => a.key - b.key);
        edges.push({ from: from.card_id, to: to.card_id, score, reasons });
      }
    }
  }

  edges.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    if (a.from !== b.from) return a.from - b.from;
    return a.to - b.to;
  });

  return edges;
}
