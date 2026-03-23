import { describe, expect, it } from "vitest";
import { ActionId, EventId } from "../contract";
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

function findCastAddCountersLocalBridgeEdge(
  edges: ReturnType<typeof buildSemanticEdges>,
  cardId: number,
) {
  const castSpellKey = keyOf(KeyKind.EVENT, EventId.CAST_SPELL);
  const addCountersKey = keyOf(KeyKind.ACTION, ActionId.ADD_COUNTERS);
  return edges.find(
    (edge) =>
      edge.local_only &&
      edge.from === cardId &&
      edge.to === cardId &&
      edge.reasons.some((reason) => reason.key === castSpellKey) &&
      edge.reasons.some((reason) => reason.key === addCountersKey),
  );
}

function hasCastAddCountersBridgeForName(
  cards: CardInput[],
  edges: ReturnType<typeof buildSemanticEdges>,
  name: string,
): boolean {
  const lowered = name.toLowerCase();
  return cards
    .filter((card) => card.name.toLowerCase() === lowered)
    .some((card) => !!findCastAddCountersLocalBridgeEdge(edges, card.card_id));
}

function buildStructuredSnapshot(cards: CardInput[], edges: ReturnType<typeof buildSemanticEdges>) {
  const castSpellKey = keyOf(KeyKind.EVENT, EventId.CAST_SPELL);
  const addCountersKey = keyOf(KeyKind.ACTION, ActionId.ADD_COUNTERS);
  const byId = new Map(cards.map((card) => [card.card_id, card.name]));
  const localEdges = edges.filter((edge) => edge.local_only);
  const castAddCountersEdges = localEdges.filter(
    (edge) =>
      edge.reasons.some((reason) => reason.key === castSpellKey) &&
      edge.reasons.some((reason) => reason.key === addCountersKey),
  );

  return {
    coverage: {
      cards_total: cards.length,
      cards_with_local_edge: new Set(localEdges.map((edge) => edge.from)).size,
    },
    cast_add_counters_edge_count: castAddCountersEdges.length,
    top_edges: castAddCountersEdges.slice(0, 5).map((edge) => ({
      from: byId.get(edge.from) ?? edge.from,
      to: byId.get(edge.to) ?? edge.to,
      score: edge.score,
      local_only: edge.local_only === true,
      reasons: edge.reasons.map((reason) => reason.key),
    })),
  };
}

describe("semantic overlay cast spell add counters bridge min v1", () => {
  it("emits strict local self-edge for explicit cast-spell +1/+1 counter payoff on self and rejects adjacent families", () => {
    const castSpellKey = keyOf(KeyKind.EVENT, EventId.CAST_SPELL);
    const addCountersKey = keyOf(KeyKind.ACTION, ActionId.ADD_COUNTERS);
    const expectedReasonKeys = [castSpellKey, addCountersKey].sort((a, b) => a - b);

    const positives = buildCardsFromLiterals([
      {
        name: "Quirion Dryad",
        oracle_text:
          "Whenever you cast a spell that's white, blue, black, or red, put a +1/+1 counter on Quirion Dryad.",
      },
      {
        name: "Sprite Dragon",
        oracle_text:
          "Whenever you cast a noncreature spell, put a +1/+1 counter on Sprite Dragon.",
      },
      {
        name: "This Creature Counter",
        oracle_text:
          "Whenever you cast an instant or sorcery spell, put a +1/+1 counter on this creature.",
      },
    ]);
    const positiveEdges = buildSemanticEdges(positives, { includeLocalOnly: true });

    for (const card of positives) {
      const edge = findCastAddCountersLocalBridgeEdge(positiveEdges, card.card_id);
      expect(edge).toBeTruthy();
      expect(edge?.local_only).toBe(true);
      expect(edge?.score).toBe(0);
      expect(edge?.reasons.map((reason) => reason.key)).toEqual(expectedReasonKeys);
    }

    const negatives = buildCardsFromLiterals([
      {
        name: "Guttersnipe",
        oracle_text:
          "Whenever you cast an instant or sorcery spell, Guttersnipe deals 2 damage to each opponent.",
      },
      {
        name: "Third Path Iconoclast",
        oracle_text:
          "Whenever you cast a noncreature spell, create a 1/1 colorless Soldier artifact creature token.",
      },
      {
        name: "Archmage Emeritus",
        oracle_text: "Magecraft — Whenever you cast or copy an instant or sorcery spell, draw a card.",
      },
      {
        name: "Kiln Fiend",
        oracle_text:
          "Whenever you cast an instant or sorcery spell, Kiln Fiend gets +3/+0 until end of turn.",
      },
      {
        name: "Counters On Other Creature",
        oracle_text:
          "Whenever you cast a noncreature spell, put a +1/+1 counter on target creature.",
      },
    ]);
    const negativeEdges = buildSemanticEdges(negatives, { includeLocalOnly: true });

    for (const card of negatives) {
      const edge = findCastAddCountersLocalBridgeEdge(negativeEdges, card.card_id);
      expect(edge).toBeUndefined();
    }
  });

  it("produces a minimal structured snapshot for cast->add-counters without widening to neighboring cast-spell families", () => {
    const castSpellKey = keyOf(KeyKind.EVENT, EventId.CAST_SPELL);
    const addCountersKey = keyOf(KeyKind.ACTION, ActionId.ADD_COUNTERS);
    const expectedReasonKeys = [castSpellKey, addCountersKey].sort((a, b) => a - b);

    const positiveDeck = buildCardsFromLiterals([
      ...Array.from({ length: 4 }, () => ({
        name: "Quirion Dryad",
        oracle_text:
          "Whenever you cast a spell that's white, blue, black, or red, put a +1/+1 counter on Quirion Dryad.",
      })),
      ...Array.from({ length: 4 }, () => ({
        name: "Sprite Dragon",
        oracle_text:
          "Whenever you cast a noncreature spell, put a +1/+1 counter on Sprite Dragon.",
      })),
      ...Array.from({ length: 4 }, () => ({
        name: "Opt",
        oracle_text: "Scry 1. Draw a card.",
      })),
    ]);
    const positiveEdges = buildSemanticEdges(positiveDeck, { includeLocalOnly: true });
    const positiveSnapshot = buildStructuredSnapshot(positiveDeck, positiveEdges);

    expect(hasCastAddCountersBridgeForName(positiveDeck, positiveEdges, "Quirion Dryad")).toBe(true);
    expect(hasCastAddCountersBridgeForName(positiveDeck, positiveEdges, "Sprite Dragon")).toBe(true);
    expect(hasCastAddCountersBridgeForName(positiveDeck, positiveEdges, "Opt")).toBe(false);
    expect(positiveSnapshot.cast_add_counters_edge_count).toBeGreaterThan(0);
    for (const edge of positiveSnapshot.top_edges) {
      expect(edge.reasons).toEqual(expectedReasonKeys);
      expect(edge.local_only).toBe(true);
      expect(edge.score).toBe(0);
    }

    const negativeDeck = buildCardsFromLiterals([
      ...Array.from({ length: 4 }, () => ({
        name: "Guttersnipe",
        oracle_text:
          "Whenever you cast an instant or sorcery spell, Guttersnipe deals 2 damage to each opponent.",
      })),
      ...Array.from({ length: 4 }, () => ({
        name: "Third Path Iconoclast",
        oracle_text:
          "Whenever you cast a noncreature spell, create a 1/1 colorless Soldier artifact creature token.",
      })),
      ...Array.from({ length: 4 }, () => ({
        name: "Archmage Emeritus",
        oracle_text: "Magecraft — Whenever you cast or copy an instant or sorcery spell, draw a card.",
      })),
      ...Array.from({ length: 4 }, () => ({
        name: "Kiln Fiend",
        oracle_text:
          "Whenever you cast an instant or sorcery spell, Kiln Fiend gets +3/+0 until end of turn.",
      })),
    ]);
    const negativeEdges = buildSemanticEdges(negativeDeck, { includeLocalOnly: true });
    const negativeSnapshot = buildStructuredSnapshot(negativeDeck, negativeEdges);

    expect(hasCastAddCountersBridgeForName(negativeDeck, negativeEdges, "Guttersnipe")).toBe(false);
    expect(hasCastAddCountersBridgeForName(negativeDeck, negativeEdges, "Third Path Iconoclast")).toBe(false);
    expect(hasCastAddCountersBridgeForName(negativeDeck, negativeEdges, "Archmage Emeritus")).toBe(false);
    expect(hasCastAddCountersBridgeForName(negativeDeck, negativeEdges, "Kiln Fiend")).toBe(false);
    expect(negativeSnapshot.cast_add_counters_edge_count).toBe(0);
    expect(negativeSnapshot.top_edges).toEqual([]);
  });
});
