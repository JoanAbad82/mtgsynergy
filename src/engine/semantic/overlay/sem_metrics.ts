import { SemanticCardIR } from "../contract";
import { SemanticEdge } from "./sem_edges";
import { buildSemanticCardProfile, explainKey, mergeProfiles } from "./sem_profile";

export type SemanticOverlayMetrics = {
  card_count: number;
  covered_count: number;
  semantic_coverage: number;
  produced_total_keys: number;
  consumed_total_keys: number;
  orphan_listeners: Array<{ key: number; consumed: number; explain: string }>;
  excess_producers: Array<{ key: number; produced: number; explain: string }>;
  redundancy_groups: Array<{ signature: string; card_ids: number[]; size: number }>;
  total_edge_score: number;
  SOS: number;
};

type MetricsInput = {
  cards: Array<{ card_id: number; ir: SemanticCardIR }>;
  edges: Array<SemanticEdge>;
  topN?: number;
};

function signatureOf(profile: { produced: Map<number, number>; consumed: Map<number, number> }): string {
  const producedKeys = Array.from(profile.produced.keys()).sort((a, b) => a - b);
  const consumedKeys = Array.from(profile.consumed.keys()).sort((a, b) => a - b);
  return `P:${producedKeys.join(",")} | C:${consumedKeys.join(",")}`;
}

export function buildSemanticOverlayMetrics(args: MetricsInput): SemanticOverlayMetrics {
  const { cards, edges } = args;
  const topN = args.topN ?? 10;

  const profiles = cards.map((card) => ({
    card_id: card.card_id,
    profile: buildSemanticCardProfile(card.ir),
  }));

  const card_count = cards.length;
  let covered_count = 0;
  for (const entry of profiles) {
    if (entry.profile.produced.size > 0 || entry.profile.consumed.size > 0) {
      covered_count += 1;
    }
  }
  const semantic_coverage = card_count > 0 ? covered_count / card_count : 0;

  const merged = mergeProfiles(profiles.map((entry) => entry.profile));
  const produced_total_keys = merged.produced.size;
  const consumed_total_keys = merged.consumed.size;

  const orphan_listeners = Array.from(merged.consumed.entries())
    .filter(([key]) => !merged.produced.has(key))
    .map(([key, consumed]) => ({ key, consumed, explain: explainKey(key) }))
    .sort((a, b) => {
      if (a.consumed !== b.consumed) return b.consumed - a.consumed;
      return a.key - b.key;
    })
    .slice(0, topN);

  const excess_producers = Array.from(merged.produced.entries())
    .filter(([key]) => !merged.consumed.has(key))
    .map(([key, produced]) => ({ key, produced, explain: explainKey(key) }))
    .sort((a, b) => {
      if (a.produced !== b.produced) return b.produced - a.produced;
      return a.key - b.key;
    })
    .slice(0, topN);

  const grouped = new Map<string, number[]>();
  for (const entry of profiles) {
    const sig = signatureOf(entry.profile);
    const list = grouped.get(sig);
    if (list) {
      list.push(entry.card_id);
    } else {
      grouped.set(sig, [entry.card_id]);
    }
  }

  const redundancy_groups = Array.from(grouped.entries())
    .filter(([, ids]) => ids.length >= 2)
    .map(([signature, ids]) => {
      const card_ids = [...ids].sort((a, b) => a - b);
      return { signature, card_ids, size: card_ids.length };
    })
    .sort((a, b) => {
      if (a.size !== b.size) return b.size - a.size;
      return a.signature.localeCompare(b.signature);
    });

  const total_edge_score = edges.reduce((sum, edge) => sum + edge.score, 0);
  const SOS = Math.log(1 + total_edge_score);

  return {
    card_count,
    covered_count,
    semantic_coverage,
    produced_total_keys,
    consumed_total_keys,
    orphan_listeners,
    excess_producers,
    redundancy_groups,
    total_edge_score,
    SOS,
  };
}
