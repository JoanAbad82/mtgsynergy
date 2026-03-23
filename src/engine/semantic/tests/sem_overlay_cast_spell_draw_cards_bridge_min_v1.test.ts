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

function findCastDrawLocalBridgeEdge(
  edges: ReturnType<typeof buildSemanticEdges>,
  cardId: number,
) {
  const castSpellKey = keyOf(KeyKind.EVENT, EventId.CAST_SPELL);
  const drawCardsKey = keyOf(KeyKind.ACTION, ActionId.DRAW_CARDS);
  return edges.find(
    (edge) =>
      edge.local_only &&
      edge.from === cardId &&
      edge.to === cardId &&
      edge.reasons.some((reason) => reason.key === castSpellKey) &&
      edge.reasons.some((reason) => reason.key === drawCardsKey),
  );
}

function hasCastDrawBridgeForName(
  cards: CardInput[],
  edges: ReturnType<typeof buildSemanticEdges>,
  name: string,
): boolean {
  const lowered = name.toLowerCase();
  return cards
    .filter((card) => card.name.toLowerCase() === lowered)
    .some((card) => !!findCastDrawLocalBridgeEdge(edges, card.card_id));
}

function buildStructuredSnapshot(
  cards: CardInput[],
  edges: ReturnType<typeof buildSemanticEdges>,
) {
  const castSpellKey = keyOf(KeyKind.EVENT, EventId.CAST_SPELL);
  const drawCardsKey = keyOf(KeyKind.ACTION, ActionId.DRAW_CARDS);
  const byId = new Map(cards.map((card) => [card.card_id, card.name]));
  const localEdges = edges.filter((edge) => edge.local_only);
  const castDrawEdges = localEdges.filter(
    (edge) =>
      edge.reasons.some((reason) => reason.key === castSpellKey) &&
      edge.reasons.some((reason) => reason.key === drawCardsKey),
  );
  const cardsWithLocalEdge = new Set(localEdges.map((edge) => edge.from)).size;
  const localScore = localEdges.reduce((sum, edge) => sum + edge.score, 0);
  const totalScore = edges.reduce((sum, edge) => sum + edge.score, 0);

  return {
    coverage: {
      cards_total: cards.length,
      cards_with_local_edge: cardsWithLocalEdge,
      ratio: cards.length === 0 ? 0 : Number((cardsWithLocalEdge / cards.length).toFixed(4)),
    },
    SOS: localScore,
    total_edge_score: totalScore,
    cast_draw_edge_count: castDrawEdges.length,
    top_edges: castDrawEdges.slice(0, 5).map((edge) => ({
      from: byId.get(edge.from) ?? edge.from,
      to: byId.get(edge.to) ?? edge.to,
      score: edge.score,
      local_only: edge.local_only === true,
      reasons: edge.reasons.map((reason) => reason.key),
    })),
  };
}

describe("semantic overlay cast spell draw cards bridge min v1", () => {
  it("emits strict local self-edge for explicit cast-spell plus draw wording and rejects non-slice neighbors", () => {
    const castSpellKey = keyOf(KeyKind.EVENT, EventId.CAST_SPELL);
    const drawCardsKey = keyOf(KeyKind.ACTION, ActionId.DRAW_CARDS);
    const expectedReasonKeys = [castSpellKey, drawCardsKey].sort((a, b) => a - b);

    const positives = buildCardsFromLiterals([
      {
        name: "Archmage Emeritus",
        oracle_text:
          "Magecraft — Whenever you cast or copy an instant or sorcery spell, draw a card.",
      },
      {
        name: "Noncreature Draw",
        oracle_text: "Whenever you cast a noncreature spell, draw a card.",
      },
      {
        name: "Instant Sorcery Draw",
        oracle_text: "Whenever you cast an instant or sorcery spell, draw a card.",
      },
    ]);
    const positiveEdges = buildSemanticEdges(positives, { includeLocalOnly: true });

    for (const card of positives) {
      const edge = findCastDrawLocalBridgeEdge(positiveEdges, card.card_id);
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
        name: "Young Pyromancer",
        oracle_text:
          "Whenever you cast an instant or sorcery spell, create a 1/1 red Elemental creature token.",
      },
      {
        name: "Third Path Iconoclast",
        oracle_text:
          "Whenever you cast a noncreature spell, create a 1/1 colorless Soldier artifact creature token.",
      },
      {
        name: "Jori En, Ruin Diver",
        oracle_text:
          "Whenever you cast your second spell each turn, draw a card.",
      },
      {
        name: "Opt",
        oracle_text: "Scry 1. Draw a card.",
      },
      {
        name: "Copy Only",
        oracle_text:
          "Whenever you copy an instant or sorcery spell, draw a card.",
      },
      {
        name: "Draw Second",
        oracle_text:
          "Whenever you draw your second card each turn, create a 1/1 blue Faerie creature token with flying.",
      },
    ]);
    const negativeEdges = buildSemanticEdges(negatives, { includeLocalOnly: true });

    for (const card of negatives) {
      const edge = findCastDrawLocalBridgeEdge(negativeEdges, card.card_id);
      expect(edge).toBeUndefined();
    }
  });

  it("produces a minimal structured smoke snapshot for ring C without widening beyond cast->draw", () => {
    const castSpellKey = keyOf(KeyKind.EVENT, EventId.CAST_SPELL);
    const drawCardsKey = keyOf(KeyKind.ACTION, ActionId.DRAW_CARDS);
    const expectedReasonKeys = [castSpellKey, drawCardsKey].sort((a, b) => a - b);

    const positiveDeck = buildCardsFromLiterals([
      ...Array.from({ length: 4 }, () => ({
        name: "Archmage Emeritus",
        oracle_text:
          "Magecraft — Whenever you cast or copy an instant or sorcery spell, draw a card.",
      })),
      ...Array.from({ length: 4 }, () => ({
        name: "Opt",
        oracle_text: "Scry 1. Draw a card.",
      })),
      ...Array.from({ length: 4 }, () => ({
        name: "Consider",
        oracle_text:
          "Look at the top card of your library. You may put that card into your graveyard. Draw a card.",
      })),
      ...Array.from({ length: 4 }, () => ({
        name: "Sleight of Hand",
        oracle_text:
          "Look at the top two cards of your library. Put one of them into your hand and the other on the bottom of your library.",
      })),
    ]);
    const positiveEdges = buildSemanticEdges(positiveDeck, { includeLocalOnly: true });
    const positiveSnapshot = buildStructuredSnapshot(positiveDeck, positiveEdges);

    expect(hasCastDrawBridgeForName(positiveDeck, positiveEdges, "Archmage Emeritus")).toBe(true);
    expect(hasCastDrawBridgeForName(positiveDeck, positiveEdges, "Opt")).toBe(false);
    expect(hasCastDrawBridgeForName(positiveDeck, positiveEdges, "Consider")).toBe(false);
    expect(hasCastDrawBridgeForName(positiveDeck, positiveEdges, "Sleight of Hand")).toBe(false);
    expect(positiveSnapshot.cast_draw_edge_count).toBeGreaterThan(0);
    for (const edge of positiveSnapshot.top_edges) {
      expect(edge.reasons).toEqual(expectedReasonKeys);
      expect(edge.local_only).toBe(true);
      expect(edge.score).toBe(0);
    }

    const negativeDeck = buildCardsFromLiterals([
      ...Array.from({ length: 4 }, () => ({
        name: "Young Pyromancer",
        oracle_text:
          "Whenever you cast an instant or sorcery spell, create a 1/1 red Elemental creature token.",
      })),
      ...Array.from({ length: 4 }, () => ({
        name: "Opt",
        oracle_text: "Scry 1. Draw a card.",
      })),
      ...Array.from({ length: 4 }, () => ({
        name: "Consider",
        oracle_text:
          "Look at the top card of your library. You may put that card into your graveyard. Draw a card.",
      })),
    ]);
    const negativeEdges = buildSemanticEdges(negativeDeck, { includeLocalOnly: true });
    const negativeSnapshot = buildStructuredSnapshot(negativeDeck, negativeEdges);

    expect(hasCastDrawBridgeForName(negativeDeck, negativeEdges, "Young Pyromancer")).toBe(false);
    expect(hasCastDrawBridgeForName(negativeDeck, negativeEdges, "Opt")).toBe(false);
    expect(hasCastDrawBridgeForName(negativeDeck, negativeEdges, "Consider")).toBe(false);
    expect(negativeSnapshot.cast_draw_edge_count).toBe(0);
    expect(negativeSnapshot.top_edges).toEqual([]);
  });
});
