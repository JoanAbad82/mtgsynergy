import { describe, expect, it } from "vitest";
import { ActionId } from "../contract";
import { normalizeOracleTextV1 } from "../normalize";
import { buildSemanticEdges } from "../overlay/sem_edges";
import { KeyKind, keyOf } from "../overlay/sem_profile";
import { parseSemanticIrV0 } from "../parser/sem_parser_v1";

type CardInput = {
  card_id: number;
  name: string;
  ir: ReturnType<typeof parseSemanticIrV0>;
  oracle_text: string;
};

function buildCardsFromLiterals(rows: Array<{ name: string; oracle_text: string }>): CardInput[] {
  return rows.map((row, index) => {
    const oracleText = normalizeOracleTextV1(row.oracle_text);
    const ir = parseSemanticIrV0({ name: row.name, oracle_text: oracleText, type_line: null });
    const card_id = index + 1;
    ir.card_id = card_id;
    return { card_id, name: row.name, ir, oracle_text: oracleText };
  });
}

function findDrawAddCountersLocalBridgeEdge(edges: ReturnType<typeof buildSemanticEdges>, cardId: number) {
  const drawCardsKey = keyOf(KeyKind.ACTION, ActionId.DRAW_CARDS);
  const addCountersKey = keyOf(KeyKind.ACTION, ActionId.ADD_COUNTERS);
  return edges.find(
    (edge) =>
      edge.local_only &&
      edge.from === cardId &&
      edge.to === cardId &&
      edge.reasons.some((reason) => reason.key === drawCardsKey) &&
      edge.reasons.some((reason) => reason.key === addCountersKey),
  );
}

function hasDrawAddCountersBridgeForName(
  cards: CardInput[],
  edges: ReturnType<typeof buildSemanticEdges>,
  name: string,
): boolean {
  const lowered = name.toLowerCase();
  return cards
    .filter((card) => card.name.toLowerCase() === lowered)
    .some((card) => !!findDrawAddCountersLocalBridgeEdge(edges, card.card_id));
}

function buildStructuredSnapshot(cards: CardInput[], edges: ReturnType<typeof buildSemanticEdges>) {
  const drawCardsKey = keyOf(KeyKind.ACTION, ActionId.DRAW_CARDS);
  const addCountersKey = keyOf(KeyKind.ACTION, ActionId.ADD_COUNTERS);
  const byId = new Map(cards.map((card) => [card.card_id, card.name]));
  const localEdges = edges.filter((edge) => edge.local_only);
  const drawAddCountersEdges = localEdges.filter(
    (edge) =>
      edge.reasons.some((reason) => reason.key === drawCardsKey) &&
      edge.reasons.some((reason) => reason.key === addCountersKey),
  );
  const localScore = localEdges.reduce((sum, edge) => sum + edge.score, 0);
  const totalScore = edges.reduce((sum, edge) => sum + edge.score, 0);

  return {
    coverage: {
      cards_total: cards.length,
      cards_with_local_edge: new Set(localEdges.map((edge) => edge.from)).size,
    },
    SOS: localScore,
    total_edge_score: totalScore,
    draw_add_counters_edge_count: drawAddCountersEdges.length,
    top_edges: drawAddCountersEdges.slice(0, 5).map((edge) => ({
      from: byId.get(edge.from) ?? edge.from,
      to: byId.get(edge.to) ?? edge.to,
      score: edge.score,
      local_only: edge.local_only === true,
      reasons: edge.reasons.map((reason) => reason.key),
    })),
  };
}

describe("semantic overlay draw cards add counters local bridge min v1", () => {
  it("emits strict local self-edge for explicit draw-cards plus +1/+1 counters on self and rejects adjacent families", () => {
    const drawCardsKey = keyOf(KeyKind.ACTION, ActionId.DRAW_CARDS);
    const addCountersKey = keyOf(KeyKind.ACTION, ActionId.ADD_COUNTERS);
    const expectedReasonKeys = [drawCardsKey, addCountersKey].sort((a, b) => a - b);

    const positives = buildCardsFromLiterals([
      {
        name: "Chasm Skulker",
        oracle_text: "Whenever you draw a card, put a +1/+1 counter on Chasm Skulker.",
      },
      {
        name: "Toothy, Imaginary Friend",
        oracle_text: "Whenever you draw a card, put a +1/+1 counter on Toothy, Imaginary Friend.",
      },
      {
        name: "Lorescale Coatl",
        oracle_text: "Whenever you draw a card, put a +1/+1 counter on Lorescale Coatl.",
      },
    ]);
    const positiveEdges = buildSemanticEdges(positives, { includeLocalOnly: true });

    for (const card of positives) {
      const edge = findDrawAddCountersLocalBridgeEdge(positiveEdges, card.card_id);
      expect(edge).toBeTruthy();
      expect(edge?.local_only).toBe(true);
      expect(edge?.score).toBe(0);
      expect(edge?.reasons.map((reason) => reason.key)).toEqual(expectedReasonKeys);
    }

    const negatives = buildCardsFromLiterals([
      {
        name: "Archmage Emeritus",
        oracle_text: "Magecraft — Whenever you cast or copy an instant or sorcery spell, draw a card.",
      },
      {
        name: "Teferi's Tutelage",
        oracle_text: "Whenever you draw a card, target opponent mills two cards.",
      },
      {
        name: "Ajani's Pridemate",
        oracle_text: "Whenever you gain life, put a +1/+1 counter on Ajani's Pridemate.",
      },
      {
        name: "Raise the Alarm",
        oracle_text: "Create two 1/1 white Soldier creature tokens.",
      },
      {
        name: "Draw Then Target Counter",
        oracle_text: "Draw a card. Then put a +1/+1 counter on target creature.",
      },
      {
        name: "Divination",
        oracle_text: "Draw two cards.",
      },
    ]);
    const negativeEdges = buildSemanticEdges(negatives, { includeLocalOnly: true });

    for (const card of negatives) {
      const edge = findDrawAddCountersLocalBridgeEdge(negativeEdges, card.card_id);
      expect(edge).toBeUndefined();
    }
  });

  it("produces a minimal structured snapshot for draw->add-counters without widening to neighboring families", () => {
    const drawCardsKey = keyOf(KeyKind.ACTION, ActionId.DRAW_CARDS);
    const addCountersKey = keyOf(KeyKind.ACTION, ActionId.ADD_COUNTERS);
    const expectedReasonKeys = [drawCardsKey, addCountersKey].sort((a, b) => a - b);

    const positiveDeck = buildCardsFromLiterals([
      ...Array.from({ length: 4 }, () => ({
        name: "Chasm Skulker",
        oracle_text: "Whenever you draw a card, put a +1/+1 counter on Chasm Skulker.",
      })),
      ...Array.from({ length: 4 }, () => ({
        name: "Toothy, Imaginary Friend",
        oracle_text: "Whenever you draw a card, put a +1/+1 counter on Toothy, Imaginary Friend.",
      })),
      ...Array.from({ length: 4 }, () => ({
        name: "Lorescale Coatl",
        oracle_text: "Whenever you draw a card, put a +1/+1 counter on Lorescale Coatl.",
      })),
      ...Array.from({ length: 4 }, () => ({
        name: "Opt",
        oracle_text: "Scry 1. Draw a card.",
      })),
    ]);
    const positiveEdges = buildSemanticEdges(positiveDeck, { includeLocalOnly: true });
    const positiveSnapshot = buildStructuredSnapshot(positiveDeck, positiveEdges);

    expect(hasDrawAddCountersBridgeForName(positiveDeck, positiveEdges, "Chasm Skulker")).toBe(true);
    expect(hasDrawAddCountersBridgeForName(positiveDeck, positiveEdges, "Toothy, Imaginary Friend")).toBe(true);
    expect(hasDrawAddCountersBridgeForName(positiveDeck, positiveEdges, "Lorescale Coatl")).toBe(true);
    expect(hasDrawAddCountersBridgeForName(positiveDeck, positiveEdges, "Opt")).toBe(false);
    expect(positiveSnapshot.draw_add_counters_edge_count).toBeGreaterThan(0);
    for (const edge of positiveSnapshot.top_edges) {
      expect(edge.reasons).toEqual(expectedReasonKeys);
      expect(edge.local_only).toBe(true);
      expect(edge.score).toBe(0);
    }

    const negativeDeck = buildCardsFromLiterals([
      ...Array.from({ length: 4 }, () => ({
        name: "Archmage Emeritus",
        oracle_text: "Magecraft — Whenever you cast or copy an instant or sorcery spell, draw a card.",
      })),
      ...Array.from({ length: 4 }, () => ({
        name: "Teferi's Tutelage",
        oracle_text: "Whenever you draw a card, target opponent mills two cards.",
      })),
      ...Array.from({ length: 4 }, () => ({
        name: "Ajani's Pridemate",
        oracle_text: "Whenever you gain life, put a +1/+1 counter on Ajani's Pridemate.",
      })),
      ...Array.from({ length: 4 }, () => ({
        name: "Raise the Alarm",
        oracle_text: "Create two 1/1 white Soldier creature tokens.",
      })),
    ]);
    const negativeEdges = buildSemanticEdges(negativeDeck, { includeLocalOnly: true });
    const negativeSnapshot = buildStructuredSnapshot(negativeDeck, negativeEdges);

    expect(hasDrawAddCountersBridgeForName(negativeDeck, negativeEdges, "Archmage Emeritus")).toBe(false);
    expect(hasDrawAddCountersBridgeForName(negativeDeck, negativeEdges, "Teferi's Tutelage")).toBe(false);
    expect(hasDrawAddCountersBridgeForName(negativeDeck, negativeEdges, "Ajani's Pridemate")).toBe(false);
    expect(hasDrawAddCountersBridgeForName(negativeDeck, negativeEdges, "Raise the Alarm")).toBe(false);
    expect(negativeSnapshot.draw_add_counters_edge_count).toBe(0);
    expect(negativeSnapshot.top_edges).toEqual([]);
  });
});
