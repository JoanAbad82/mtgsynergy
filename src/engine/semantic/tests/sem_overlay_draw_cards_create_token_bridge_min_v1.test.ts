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

function findDrawCreateTokenLocalBridgeEdge(edges: ReturnType<typeof buildSemanticEdges>, cardId: number) {
  const drawCardsKey = keyOf(KeyKind.ACTION, ActionId.DRAW_CARDS);
  const createTokenKey = keyOf(KeyKind.ACTION, ActionId.CREATE_TOKEN);
  return edges.find(
    (edge) =>
      edge.local_only &&
      edge.from === cardId &&
      edge.to === cardId &&
      edge.reasons.some((reason) => reason.key === drawCardsKey) &&
      edge.reasons.some((reason) => reason.key === createTokenKey),
  );
}

function hasDrawCreateTokenBridgeForName(
  cards: CardInput[],
  edges: ReturnType<typeof buildSemanticEdges>,
  name: string,
): boolean {
  const lowered = name.toLowerCase();
  return cards
    .filter((card) => card.name.toLowerCase() === lowered)
    .some((card) => !!findDrawCreateTokenLocalBridgeEdge(edges, card.card_id));
}

function buildStructuredSnapshot(cards: CardInput[], edges: ReturnType<typeof buildSemanticEdges>) {
  const drawCardsKey = keyOf(KeyKind.ACTION, ActionId.DRAW_CARDS);
  const createTokenKey = keyOf(KeyKind.ACTION, ActionId.CREATE_TOKEN);
  const byId = new Map(cards.map((card) => [card.card_id, card.name]));
  const localEdges = edges.filter((edge) => edge.local_only);
  const drawCreateTokenEdges = localEdges.filter(
    (edge) =>
      edge.reasons.some((reason) => reason.key === drawCardsKey) &&
      edge.reasons.some((reason) => reason.key === createTokenKey),
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
    draw_create_token_edge_count: drawCreateTokenEdges.length,
    top_edges: drawCreateTokenEdges.slice(0, 5).map((edge) => ({
      from: byId.get(edge.from) ?? edge.from,
      to: byId.get(edge.to) ?? edge.to,
      score: edge.score,
      local_only: edge.local_only === true,
      reasons: edge.reasons.map((reason) => reason.key),
    })),
  };
}

describe("semantic overlay draw cards create token bridge min v1", () => {
  it("emits strict local self-edge for explicit draw-cards plus create-token wording and rejects adjacent families", () => {
    const drawCardsKey = keyOf(KeyKind.ACTION, ActionId.DRAW_CARDS);
    const createTokenKey = keyOf(KeyKind.ACTION, ActionId.CREATE_TOKEN);
    const expectedReasonKeys = [drawCardsKey, createTokenKey].sort((a, b) => a - b);

    const positives = buildCardsFromLiterals([
      {
        name: "The Locust God",
        oracle_text:
          "Whenever you draw a card, create a 1/1 blue and red Insect creature token with flying and haste.",
      },
    ]);
    const positiveEdges = buildSemanticEdges(positives, { includeLocalOnly: true });

    for (const card of positives) {
      const edge = findDrawCreateTokenLocalBridgeEdge(positiveEdges, card.card_id);
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
        name: "Raise the Alarm",
        oracle_text: "Create two 1/1 white Soldier creature tokens.",
      },
      {
        name: "Improbable Alliance",
        oracle_text: "Whenever you draw your second card each turn, create a 1/1 blue Faerie creature token.",
      },
      {
        name: "Psychosis Crawler",
        oracle_text: "Whenever you draw a card, each opponent loses 1 life.",
      },
      {
        name: "Guttersnipe",
        oracle_text:
          "Whenever you cast an instant or sorcery spell, Guttersnipe deals 2 damage to each opponent.",
      },
      {
        name: "Divination",
        oracle_text: "Draw two cards.",
      },
      {
        name: "Shock",
        oracle_text: "Shock deals 2 damage to any target.",
      },
    ]);
    const negativeEdges = buildSemanticEdges(negatives, { includeLocalOnly: true });

    for (const card of negatives) {
      const edge = findDrawCreateTokenLocalBridgeEdge(negativeEdges, card.card_id);
      expect(edge).toBeUndefined();
    }
  });

  it("produces a minimal structured snapshot for draw->create-token without widening to draw-second or adjacent families", () => {
    const drawCardsKey = keyOf(KeyKind.ACTION, ActionId.DRAW_CARDS);
    const createTokenKey = keyOf(KeyKind.ACTION, ActionId.CREATE_TOKEN);
    const expectedReasonKeys = [drawCardsKey, createTokenKey].sort((a, b) => a - b);

    const positiveDeck = buildCardsFromLiterals([
      ...Array.from({ length: 8 }, () => ({
        name: "The Locust God",
        oracle_text:
          "Whenever you draw a card, create a 1/1 blue and red Insect creature token with flying and haste.",
      })),
      ...Array.from({ length: 4 }, () => ({
        name: "Opt",
        oracle_text: "Scry 1. Draw a card.",
      })),
    ]);
    const positiveEdges = buildSemanticEdges(positiveDeck, { includeLocalOnly: true });
    const positiveSnapshot = buildStructuredSnapshot(positiveDeck, positiveEdges);

    expect(hasDrawCreateTokenBridgeForName(positiveDeck, positiveEdges, "The Locust God")).toBe(true);
    expect(hasDrawCreateTokenBridgeForName(positiveDeck, positiveEdges, "Opt")).toBe(false);
    expect(positiveSnapshot.draw_create_token_edge_count).toBeGreaterThan(0);
    for (const edge of positiveSnapshot.top_edges) {
      expect(edge.reasons).toEqual(expectedReasonKeys);
      expect(edge.local_only).toBe(true);
      expect(edge.score).toBe(0);
    }

    const negativeDeck = buildCardsFromLiterals([
      ...Array.from({ length: 4 }, () => ({
        name: "Improbable Alliance",
        oracle_text: "Whenever you draw your second card each turn, create a 1/1 blue Faerie creature token.",
      })),
      ...Array.from({ length: 4 }, () => ({
        name: "Archmage Emeritus",
        oracle_text: "Magecraft — Whenever you cast or copy an instant or sorcery spell, draw a card.",
      })),
      ...Array.from({ length: 4 }, () => ({
        name: "Raise the Alarm",
        oracle_text: "Create two 1/1 white Soldier creature tokens.",
      })),
    ]);
    const negativeEdges = buildSemanticEdges(negativeDeck, { includeLocalOnly: true });
    const negativeSnapshot = buildStructuredSnapshot(negativeDeck, negativeEdges);

    expect(hasDrawCreateTokenBridgeForName(negativeDeck, negativeEdges, "Improbable Alliance")).toBe(false);
    expect(hasDrawCreateTokenBridgeForName(negativeDeck, negativeEdges, "Archmage Emeritus")).toBe(false);
    expect(hasDrawCreateTokenBridgeForName(negativeDeck, negativeEdges, "Raise the Alarm")).toBe(false);
    expect(negativeSnapshot.draw_create_token_edge_count).toBe(0);
    expect(negativeSnapshot.top_edges).toEqual([]);
  });
});
