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

function findCreatureAttacksLoseLifeLocalBridgeEdge(
  edges: ReturnType<typeof buildSemanticEdges>,
  cardId: number,
) {
  const creatureAttacksKey = keyOf(KeyKind.EVENT, EventId.CREATURE_ATTACKS);
  const loseLifeKey = keyOf(KeyKind.ACTION, ActionId.LOSE_LIFE);
  return edges.find(
    (edge) =>
      edge.local_only &&
      edge.from === cardId &&
      edge.to === cardId &&
      edge.reasons.some((reason) => reason.key === creatureAttacksKey) &&
      edge.reasons.some((reason) => reason.key === loseLifeKey),
  );
}

describe("semantic overlay creature attacks lose life local bridge min v1", () => {
  it("emits strict local self-edge for explicit attacks->lose life wording", () => {
    const creatureAttacksKey = keyOf(KeyKind.EVENT, EventId.CREATURE_ATTACKS);
    const loseLifeKey = keyOf(KeyKind.ACTION, ActionId.LOSE_LIFE);
    const expectedReasonKeys = [creatureAttacksKey, loseLifeKey].sort((a, b) => a - b);

    const cards = buildCardsFromLiterals([
      {
        name: "Attack Life Loss Engine",
        oracle_text: "Whenever this creature attacks, each opponent loses 1 life.",
      },
    ]);

    const edges = buildSemanticEdges(cards, { includeLocalOnly: true });
    const edge = findCreatureAttacksLoseLifeLocalBridgeEdge(edges, cards[0].card_id);

    expect(edge).toBeTruthy();
    expect(edge?.local_only).toBe(true);
    expect(edge?.score).toBe(0);
    expect(edge?.reasons.map((reason) => reason.key)).toEqual(expectedReasonKeys);
  });

  it("does not emit bridge outside narrow wording and lose-life scope", () => {
    const negatives = buildCardsFromLiterals([
      {
        name: "You Attack Lose Life",
        oracle_text: "Whenever you attack, each opponent loses 1 life.",
      },
      {
        name: "One Or More Attack Lose Life",
        oracle_text: "Whenever one or more creatures attack, each opponent loses 1 life.",
      },
      {
        name: "Attacks Alone Lose Life",
        oracle_text: "Whenever this creature attacks alone, each opponent loses 1 life.",
      },
      {
        name: "Attack Damage",
        oracle_text: "Whenever this creature attacks, it deals 1 damage to any target.",
      },
      {
        name: "Combat Damage Lose Life",
        oracle_text: "Whenever this creature deals combat damage to a player, that player loses 1 life.",
      },
      {
        name: "Vanilla Lose Life",
        oracle_text: "Each opponent loses 1 life.",
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
      const edge = findCreatureAttacksLoseLifeLocalBridgeEdge(edges, card.card_id);
      expect(edge).toBeUndefined();
    }
  });
});
