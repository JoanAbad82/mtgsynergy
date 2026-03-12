import type { SemanticCardIR } from "../contract";
import { ActionId, EventId } from "../contract";
import { buildSemanticCardProfile, KeyKind, keyOf } from "./sem_profile";

export type SemanticEdgeReason = {
  key: number;
  weight: number;
};

export type SemanticEdge = {
  from: number;
  to: number;
  score: number;
  reasons: SemanticEdgeReason[];
  local_only?: boolean;
};

type CardInput = {
  card_id: number;
  ir: SemanticCardIR;
  oracle_text?: string;
};

type BuildSemanticEdgesOptions = {
  includeLocalOnly?: boolean;
};

function applyCreatureDiesPayoffBridge(profile: ReturnType<typeof buildSemanticCardProfile>): number[] {
  const diesKey = keyOf(KeyKind.EVENT, EventId.CREATURE_DIES);
  if (!profile.consumed.has(diesKey)) return [];
  const payoffActionKeys = [
    keyOf(KeyKind.ACTION, ActionId.LOSE_LIFE),
    keyOf(KeyKind.ACTION, ActionId.DEAL_DAMAGE),
    keyOf(KeyKind.ACTION, ActionId.GAIN_LIFE),
  ];
  const matched = payoffActionKeys.filter((key) => profile.produced.has(key));
  return matched.length > 0 ? matched : [];
}

function explicitDiesTextEvidence(text: string): boolean {
  const normalized = text.toLowerCase();
  return (
    /\bdies\b/.test(normalized) ||
    normalized.includes("creature dies") ||
    normalized.includes("another creature dies")
  );
}

function applyDealDamageLoseLifeBridge(profile: ReturnType<typeof buildSemanticCardProfile>): boolean {
  const dealDamageKey = keyOf(KeyKind.ACTION, ActionId.DEAL_DAMAGE);
  return profile.produced.has(dealDamageKey);
}

function explicitDamageToPlayerTextEvidence(text: string): boolean {
  const normalized = text.toLowerCase();
  return (
    /\bdeal\w*\s+\d+\s+damage\s+to\s+target\s+player\b/.test(normalized) ||
    /\bdeal\w*\s+\d+\s+damage\s+to\s+an?\s+opponent\b/.test(normalized) ||
    /\bdeal\w*\s+\d+\s+damage\s+to\s+each\s+opponent\b/.test(normalized) ||
    /\bdeal\w*\s+\d+\s+damage\s+to\s+each\s+player\b/.test(normalized)
  );
}

function applyLifeGainAddCountersBridge(profile: ReturnType<typeof buildSemanticCardProfile>): boolean {
  const lifeGainEventKey = keyOf(KeyKind.EVENT, EventId.LIFE_GAIN);
  const addCountersKey = keyOf(KeyKind.ACTION, ActionId.ADD_COUNTERS);
  return profile.consumed.has(lifeGainEventKey) && profile.produced.has(addCountersKey);
}

function applyDamageWithLifelinkLifeGainBridge(profile: ReturnType<typeof buildSemanticCardProfile>): boolean {
  const dealDamageKey = keyOf(KeyKind.ACTION, ActionId.DEAL_DAMAGE);
  return profile.produced.has(dealDamageKey);
}

function explicitLifelinkTextEvidence(text: string): boolean {
  return /\blifelink\b/.test(text.toLowerCase());
}

export function buildSemanticEdges(inputCards: CardInput[], options?: BuildSemanticEdgesOptions): SemanticEdge[] {
  const includeLocalOnly = options?.includeLocalOnly ?? true;
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

  const diesKey = keyOf(KeyKind.EVENT, EventId.CREATURE_DIES);
  for (const card of cards) {
    const matchedPayoffs = applyCreatureDiesPayoffBridge(card.profile);
    if (matchedPayoffs.length === 0) continue;
    if (!explicitDiesTextEvidence(card.oracle_text ?? "")) continue;
    const reasons: SemanticEdgeReason[] = [{ key: diesKey, weight: 1 }];
    for (const key of matchedPayoffs) {
      reasons.push({ key, weight: 1 });
    }
    reasons.sort((a, b) => a.key - b.key);
    edges.push({
      from: card.card_id,
      to: card.card_id,
      score: 0,
      reasons,
      local_only: true,
    });
  }

  const dealDamageKey = keyOf(KeyKind.ACTION, ActionId.DEAL_DAMAGE);
  const loseLifeKey = keyOf(KeyKind.ACTION, ActionId.LOSE_LIFE);
  for (const card of cards) {
    if (!applyDealDamageLoseLifeBridge(card.profile)) continue;
    if (!explicitDamageToPlayerTextEvidence(card.oracle_text ?? "")) continue;
    const reasons: SemanticEdgeReason[] = [
      { key: dealDamageKey, weight: 1 },
      { key: loseLifeKey, weight: 1 },
    ];
    reasons.sort((a, b) => a.key - b.key);
    edges.push({
      from: card.card_id,
      to: card.card_id,
      score: 0,
      reasons,
      local_only: true,
    });
  }

  const lifeGainEventKey = keyOf(KeyKind.EVENT, EventId.LIFE_GAIN);
  const addCountersKey = keyOf(KeyKind.ACTION, ActionId.ADD_COUNTERS);
  for (const card of cards) {
    if (!applyLifeGainAddCountersBridge(card.profile)) continue;
    const reasons: SemanticEdgeReason[] = [
      { key: lifeGainEventKey, weight: 1 },
      { key: addCountersKey, weight: 1 },
    ];
    reasons.sort((a, b) => a.key - b.key);
    edges.push({
      from: card.card_id,
      to: card.card_id,
      score: 0,
      reasons,
      local_only: true,
    });
  }

  const dealDamageLifelinkKey = keyOf(KeyKind.ACTION, ActionId.DEAL_DAMAGE);
  const lifeGainLifelinkKey = keyOf(KeyKind.EVENT, EventId.LIFE_GAIN);
  for (const card of cards) {
    if (!applyDamageWithLifelinkLifeGainBridge(card.profile)) continue;
    if (!explicitLifelinkTextEvidence(card.oracle_text ?? "")) continue;
    const reasons: SemanticEdgeReason[] = [
      { key: dealDamageLifelinkKey, weight: 1 },
      { key: lifeGainLifelinkKey, weight: 1 },
    ];
    reasons.sort((a, b) => a.key - b.key);
    edges.push({
      from: card.card_id,
      to: card.card_id,
      score: 0,
      reasons,
      local_only: true,
    });
  }

  const outputEdges = includeLocalOnly ? edges : edges.filter((edge) => !edge.local_only);

  outputEdges.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    if (a.from !== b.from) return a.from - b.from;
    return a.to - b.to;
  });

  return outputEdges;
}
