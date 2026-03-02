import type { CardRecordMin } from "../../cards/types";
import { normalizeCardName } from "../../cards/normalize";
import { normalizeOracleTextV1 } from "../normalize";
import { parseSemanticIrV0 } from "../parser/sem_parser_v1";
import { buildSemanticEdges } from "./sem_edges";
import { buildSemanticCardProfile, explainKey } from "./sem_profile";

type DebugSignalAggregate = Map<string, { count: number; examples: Set<string> }>;

type DebugFlowResult = {
  producedByCard: Array<{ card: string; produced: string[] }>;
  consumedByCard: Array<{ card: string; consumed: string[] }>;
  unmatchedProduced: Array<{ signal: string; count: number; examples: string[] }>;
  unmatchedConsumed: Array<{ signal: string; count: number; examples: string[] }>;
  matchedPairsTop: Array<{ from: string; to: string; signal: string; count: number }>;
};

type DebugFlowInput = {
  entries: Array<{ name: string }>;
  lookup: (name: string) => Promise<CardRecordMin | null>;
};

function addAggregate(map: DebugSignalAggregate, signal: string, count: number, example: string): void {
  const entry = map.get(signal);
  if (entry) {
    entry.count += count;
    entry.examples.add(example);
    return;
  }
  map.set(signal, { count, examples: new Set([example]) });
}

function buildAggregateRows(map: DebugSignalAggregate): Array<{ signal: string; count: number; examples: string[] }> {
  return Array.from(map.entries())
    .map(([signal, data]) => ({
      signal,
      count: data.count,
      examples: Array.from(data.examples).sort((a, b) => a.localeCompare(b)).slice(0, 3),
    }))
    .sort((a, b) => {
      if (a.count !== b.count) return b.count - a.count;
      return a.signal.localeCompare(b.signal);
    });
}

export async function debugSemanticFlowForDeck(input: DebugFlowInput): Promise<DebugFlowResult> {
  const uniqueNames = Array.from(new Set(input.entries.map((entry) => entry.name)));
  const resolved = await Promise.all(
    uniqueNames.map(async (name) => {
      const card = await input.lookup(name);
      if (!card || !card.oracle_text) return null;
      return {
        name: card.name,
        name_norm: card.name_norm ?? normalizeCardName(card.name),
        oracle_text: card.oracle_text,
        type_line: card.type_line ?? null,
      };
    }),
  );

  const found = resolved.filter((card): card is NonNullable<typeof card> => !!card);
  const byNorm = new Map<string, (typeof found)[number]>();
  for (const card of found) {
    if (!byNorm.has(card.name_norm)) {
      byNorm.set(card.name_norm, card);
    }
  }

  const ordered = Array.from(byNorm.values()).sort((a, b) => a.name.localeCompare(b.name));
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
    return { card_id, name: card.name, ir };
  });

  const producedByCard: Array<{ card: string; produced: string[] }> = [];
  const consumedByCard: Array<{ card: string; consumed: string[] }> = [];
  const producedAgg: DebugSignalAggregate = new Map();
  const consumedAgg: DebugSignalAggregate = new Map();

  for (const card of cards) {
    const profile = buildSemanticCardProfile(card.ir);
    const producedSignals = Array.from(profile.produced.keys())
      .map((key) => explainKey(key))
      .sort((a, b) => a.localeCompare(b));
    const consumedSignals = Array.from(profile.consumed.keys())
      .map((key) => explainKey(key))
      .sort((a, b) => a.localeCompare(b));

    producedByCard.push({ card: card.name, produced: producedSignals });
    consumedByCard.push({ card: card.name, consumed: consumedSignals });

    for (const [key, count] of profile.produced.entries()) {
      addAggregate(producedAgg, explainKey(key), count, card.name);
    }
    for (const [key, count] of profile.consumed.entries()) {
      addAggregate(consumedAgg, explainKey(key), count, card.name);
    }
  }

  const unmatchedProduced = buildAggregateRows(
    new Map(
      Array.from(producedAgg.entries()).filter(([signal]) => !consumedAgg.has(signal)),
    ),
  );
  const unmatchedConsumed = buildAggregateRows(
    new Map(
      Array.from(consumedAgg.entries()).filter(([signal]) => !producedAgg.has(signal)),
    ),
  );

  const edges = buildSemanticEdges(cards.map(({ card_id, ir }) => ({ card_id, ir })));
  const matchedPairs = edges.flatMap((edge) => {
    const from = idToName[edge.from] ?? String(edge.from);
    const to = idToName[edge.to] ?? String(edge.to);
    return edge.reasons.map((reason) => ({
      from,
      to,
      signal: explainKey(reason.key),
      count: reason.weight,
    }));
  });

  matchedPairs.sort((a, b) => {
    if (a.count !== b.count) return b.count - a.count;
    if (a.signal !== b.signal) return a.signal.localeCompare(b.signal);
    if (a.from !== b.from) return a.from.localeCompare(b.from);
    return a.to.localeCompare(b.to);
  });

  return {
    producedByCard,
    consumedByCard,
    unmatchedProduced,
    unmatchedConsumed,
    matchedPairsTop: matchedPairs.slice(0, 20),
  };
}
