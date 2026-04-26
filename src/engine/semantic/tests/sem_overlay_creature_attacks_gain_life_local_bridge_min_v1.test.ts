import { describe, expect, it } from "vitest";
import { ActionId, EventId } from "../contract";
import { normalizeOracleTextV1 } from "../normalize";
import { buildSemanticEdges } from "../overlay/sem_edges";
import { KeyKind, keyOf } from "../overlay/sem_profile";
import { parseSemanticIrV0 } from "../parser/sem_parser_v1";

type CardInput = {
  card_id: number;
  ir: ReturnType<typeof parseSemanticIrV0>;
  oracle_text: string;
};

function buildCardsFromLiterals(rows: Array<{ name: string; oracle_text: string }>): CardInput[] {
  return rows.map((row, index) => {
    const oracleText = normalizeOracleTextV1(row.oracle_text);
    const ir = parseSemanticIrV0({ name: row.name, oracle_text: oracleText, type_line: null });
    const card_id = index + 1;
    ir.card_id = card_id;
    return { card_id, ir, oracle_text: oracleText };
  });
}

function findCreatureAttacksGainLifeLocalBridgeEdge(
  edges: ReturnType<typeof buildSemanticEdges>,
  cardId: number,
) {
  const creatureAttacksKey = keyOf(KeyKind.EVENT, EventId.CREATURE_ATTACKS);
  const gainLifeKey = keyOf(KeyKind.ACTION, ActionId.GAIN_LIFE);
  return edges.find(
    (edge) =>
      edge.local_only &&
      edge.from === cardId &&
      edge.to === cardId &&
      edge.reasons.some((reason) => reason.key === creatureAttacksKey) &&
      edge.reasons.some((reason) => reason.key === gainLifeKey),
  );
}

describe("semantic overlay creature attacks gain life local bridge min v1", () => {
  it("emits strict local self-edge for explicit attacks->gain life wording", () => {
    const creatureAttacksKey = keyOf(KeyKind.EVENT, EventId.CREATURE_ATTACKS);
    const gainLifeKey = keyOf(KeyKind.ACTION, ActionId.GAIN_LIFE);
    const expectedReasonKeys = [creatureAttacksKey, gainLifeKey].sort((a, b) => a - b);

    const cards = buildCardsFromLiterals([
      {
        name: "Attack Life Gain Engine",
        oracle_text: "Whenever this creature attacks, you gain 1 life.",
      },
    ]);

    const edges = buildSemanticEdges(cards, { includeLocalOnly: true });
    const edge = findCreatureAttacksGainLifeLocalBridgeEdge(edges, cards[0].card_id);

    expect(edge).toBeTruthy();
    expect(edge?.local_only).toBe(true);
    expect(edge?.score).toBe(0);
    expect(edge?.reasons.map((reason) => reason.key)).toEqual(expectedReasonKeys);
  });

  it("does not emit bridge outside narrow wording and gain-life scope", () => {
    const negatives = buildCardsFromLiterals([
      {
        name: "You Attack Gain Life",
        oracle_text: "Whenever you attack, you gain 1 life.",
      },
      {
        name: "One Or More Attack Gain Life",
        oracle_text: "Whenever one or more creatures attack, you gain 1 life.",
      },
      {
        name: "Attacks Alone Gain Life",
        oracle_text: "Whenever this creature attacks alone, you gain 1 life.",
      },
      {
        name: "Combat Damage Gain Life",
        oracle_text: "Whenever this creature deals combat damage to a player, you gain 1 life.",
      },
      {
        name: "Lifelink Attack Damage",
        oracle_text: "Lifelink. Whenever this creature attacks, it deals 1 damage to any target.",
      },
      {
        name: "Life Gain Draw",
        oracle_text: "Whenever you gain life, draw a card.",
      },
      {
        name: "Vanilla Gain Life",
        oracle_text: "You gain 1 life.",
      },
      {
        name: "Attack Lose Life",
        oracle_text: "Whenever this creature attacks, each opponent loses 1 life.",
      },
      {
        name: "Attack Deal Damage",
        oracle_text: "Whenever this creature attacks, it deals 1 damage to any target.",
      },
      {
        name: "Attack Draw",
        oracle_text: "Whenever this creature attacks, draw a card.",
      },
      {
        name: "Attack Token",
        oracle_text: "Whenever this creature attacks, create a 1/1 white Soldier creature token.",
      },
      {
        name: "Attack Counters",
        oracle_text: "Whenever this creature attacks, put a +1/+1 counter on it.",
      },
    ]);

    const edges = buildSemanticEdges(negatives, { includeLocalOnly: true });

    for (const card of negatives) {
      const edge = findCreatureAttacksGainLifeLocalBridgeEdge(edges, card.card_id);
      expect(edge).toBeUndefined();
    }
  });
});
