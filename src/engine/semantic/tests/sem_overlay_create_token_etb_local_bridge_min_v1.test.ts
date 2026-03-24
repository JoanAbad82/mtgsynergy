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

function findCreateTokenEtbLocalBridgeEdge(edges: ReturnType<typeof buildSemanticEdges>, cardId: number) {
  const createTokenKey = keyOf(KeyKind.ACTION, ActionId.CREATE_TOKEN);
  const entersBattlefieldKey = keyOf(KeyKind.EVENT, EventId.ENTERS_BATTLEFIELD);
  return edges.find(
    (edge) =>
      edge.local_only &&
      edge.from === cardId &&
      edge.to === cardId &&
      edge.reasons.some((reason) => reason.key === createTokenKey) &&
      edge.reasons.some((reason) => reason.key === entersBattlefieldKey),
  );
}

function hasCreateTokenEtbBridgeForName(
  cards: CardInput[],
  edges: ReturnType<typeof buildSemanticEdges>,
  name: string,
): boolean {
  const lowered = name.toLowerCase();
  return cards
    .filter((card) => card.name.toLowerCase() === lowered)
    .some((card) => !!findCreateTokenEtbLocalBridgeEdge(edges, card.card_id));
}

function buildStructuredSnapshot(cards: CardInput[], edges: ReturnType<typeof buildSemanticEdges>) {
  const createTokenKey = keyOf(KeyKind.ACTION, ActionId.CREATE_TOKEN);
  const entersBattlefieldKey = keyOf(KeyKind.EVENT, EventId.ENTERS_BATTLEFIELD);
  const byId = new Map(cards.map((card) => [card.card_id, card.name]));
  const localEdges = edges.filter((edge) => edge.local_only);
  const createTokenEtbEdges = localEdges.filter(
    (edge) =>
      edge.reasons.some((reason) => reason.key === createTokenKey) &&
      edge.reasons.some((reason) => reason.key === entersBattlefieldKey),
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
    create_token_etb_edge_count: createTokenEtbEdges.length,
    top_edges: createTokenEtbEdges.slice(0, 5).map((edge) => ({
      from: byId.get(edge.from) ?? edge.from,
      to: byId.get(edge.to) ?? edge.to,
      score: edge.score,
      local_only: edge.local_only === true,
      reasons: edge.reasons.map((reason) => reason.key),
    })),
  };
}

describe("semantic overlay create token etb local bridge min v1", () => {
  it("emits strict local self-edge for explicit token creation with ETB consequence and rejects non-token/adjacent families", () => {
    const createTokenKey = keyOf(KeyKind.ACTION, ActionId.CREATE_TOKEN);
    const entersBattlefieldKey = keyOf(KeyKind.EVENT, EventId.ENTERS_BATTLEFIELD);
    const expectedReasonKeys = [createTokenKey, entersBattlefieldKey].sort((a, b) => a - b);

    const positives = buildCardsFromLiterals([
      {
        name: "Raise the Alarm",
        oracle_text: "Create two 1/1 white Soldier creature tokens.",
      },
      {
        name: "Hordeling Outburst",
        oracle_text: "Create three 1/1 red Goblin creature tokens.",
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
        name: "Monastery Mentor",
        oracle_text:
          "Whenever you cast a noncreature spell, create a 1/1 white Monk creature token with prowess.",
      },
    ]);
    const positiveEdges = buildSemanticEdges(positives, { includeLocalOnly: true });

    for (const card of positives) {
      const edge = findCreateTokenEtbLocalBridgeEdge(positiveEdges, card.card_id);
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
        name: "Archmage Emeritus",
        oracle_text: "Magecraft — Whenever you cast or copy an instant or sorcery spell, draw a card.",
      },
      {
        name: "Kiln Fiend",
        oracle_text:
          "Whenever you cast an instant or sorcery spell, Kiln Fiend gets +3/+0 until end of turn.",
      },
      {
        name: "Soul Warden",
        oracle_text: "Whenever another creature enters the battlefield, you gain 1 life.",
      },
      {
        name: "Token Mention Only",
        oracle_text: "Token creatures you control get +1/+1.",
      },
    ]);
    const negativeEdges = buildSemanticEdges(negatives, { includeLocalOnly: true });

    for (const card of negatives) {
      const edge = findCreateTokenEtbLocalBridgeEdge(negativeEdges, card.card_id);
      expect(edge).toBeUndefined();
    }
  });

  it("produces a minimal structured snapshot for a short canonical deck without widening beyond create-token->etb", () => {
    const createTokenKey = keyOf(KeyKind.ACTION, ActionId.CREATE_TOKEN);
    const entersBattlefieldKey = keyOf(KeyKind.EVENT, EventId.ENTERS_BATTLEFIELD);
    const expectedReasonKeys = [createTokenKey, entersBattlefieldKey].sort((a, b) => a - b);

    const positiveDeck = buildCardsFromLiterals([
      ...Array.from({ length: 4 }, () => ({
        name: "Raise the Alarm",
        oracle_text: "Create two 1/1 white Soldier creature tokens.",
      })),
      ...Array.from({ length: 4 }, () => ({
        name: "Hordeling Outburst",
        oracle_text: "Create three 1/1 red Goblin creature tokens.",
      })),
      ...Array.from({ length: 4 }, () => ({
        name: "Young Pyromancer",
        oracle_text:
          "Whenever you cast an instant or sorcery spell, create a 1/1 red Elemental creature token.",
      })),
      ...Array.from({ length: 4 }, () => ({
        name: "Third Path Iconoclast",
        oracle_text:
          "Whenever you cast a noncreature spell, create a 1/1 colorless Soldier artifact creature token.",
      })),
      ...Array.from({ length: 4 }, () => ({
        name: "Monastery Mentor",
        oracle_text:
          "Whenever you cast a noncreature spell, create a 1/1 white Monk creature token with prowess.",
      })),
    ]);
    const positiveEdges = buildSemanticEdges(positiveDeck, { includeLocalOnly: true });
    const positiveSnapshot = buildStructuredSnapshot(positiveDeck, positiveEdges);

    expect(hasCreateTokenEtbBridgeForName(positiveDeck, positiveEdges, "Raise the Alarm")).toBe(true);
    expect(hasCreateTokenEtbBridgeForName(positiveDeck, positiveEdges, "Hordeling Outburst")).toBe(true);
    expect(hasCreateTokenEtbBridgeForName(positiveDeck, positiveEdges, "Young Pyromancer")).toBe(true);
    expect(hasCreateTokenEtbBridgeForName(positiveDeck, positiveEdges, "Third Path Iconoclast")).toBe(true);
    expect(hasCreateTokenEtbBridgeForName(positiveDeck, positiveEdges, "Monastery Mentor")).toBe(true);
    expect(positiveSnapshot.create_token_etb_edge_count).toBeGreaterThan(0);
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
        name: "Archmage Emeritus",
        oracle_text: "Magecraft — Whenever you cast or copy an instant or sorcery spell, draw a card.",
      })),
      ...Array.from({ length: 4 }, () => ({
        name: "Kiln Fiend",
        oracle_text:
          "Whenever you cast an instant or sorcery spell, Kiln Fiend gets +3/+0 until end of turn.",
      })),
      ...Array.from({ length: 4 }, () => ({
        name: "Soul Warden",
        oracle_text: "Whenever another creature enters the battlefield, you gain 1 life.",
      })),
    ]);
    const negativeEdges = buildSemanticEdges(negativeDeck, { includeLocalOnly: true });
    const negativeSnapshot = buildStructuredSnapshot(negativeDeck, negativeEdges);

    expect(hasCreateTokenEtbBridgeForName(negativeDeck, negativeEdges, "Guttersnipe")).toBe(false);
    expect(hasCreateTokenEtbBridgeForName(negativeDeck, negativeEdges, "Archmage Emeritus")).toBe(false);
    expect(hasCreateTokenEtbBridgeForName(negativeDeck, negativeEdges, "Kiln Fiend")).toBe(false);
    expect(hasCreateTokenEtbBridgeForName(negativeDeck, negativeEdges, "Soul Warden")).toBe(false);
    expect(negativeSnapshot.create_token_etb_edge_count).toBe(0);
    expect(negativeSnapshot.top_edges).toEqual([]);
  });
});
