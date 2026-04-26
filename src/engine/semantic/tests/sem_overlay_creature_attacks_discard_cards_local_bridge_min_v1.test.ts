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

function findCreatureAttacksDiscardCardsLocalBridgeEdge(
  edges: ReturnType<typeof buildSemanticEdges>,
  cardId: number,
) {
  const creatureAttacksKey = keyOf(KeyKind.EVENT, EventId.CREATURE_ATTACKS);
  const discardCardsKey = keyOf(KeyKind.ACTION, ActionId.DISCARD_CARDS);
  return edges.find(
    (edge) =>
      edge.local_only &&
      edge.from === cardId &&
      edge.to === cardId &&
      edge.reasons.some((reason) => reason.key === creatureAttacksKey) &&
      edge.reasons.some((reason) => reason.key === discardCardsKey),
  );
}

describe("semantic overlay creature attacks discard cards local bridge min v1", () => {
  it("emits strict local self-edge for explicit attacks->discard cards wording", () => {
    const creatureAttacksKey = keyOf(KeyKind.EVENT, EventId.CREATURE_ATTACKS);
    const discardCardsKey = keyOf(KeyKind.ACTION, ActionId.DISCARD_CARDS);
    const expectedReasonKeys = [creatureAttacksKey, discardCardsKey].sort((a, b) => a - b);

    const positives = buildCardsFromLiterals([
      {
        name: "Attack Discard Player",
        oracle_text: "Whenever this creature attacks, target player discards a card.",
      },
      {
        name: "Attack Discard Opponent",
        oracle_text: "Whenever this creature attacks, target opponent discards a card.",
      },
      {
        name: "Attack Discard Defending",
        oracle_text: "Whenever this creature attacks, defending player discards a card.",
      },
    ]);

    const edges = buildSemanticEdges(positives, { includeLocalOnly: true });

    for (const card of positives) {
      const edge = findCreatureAttacksDiscardCardsLocalBridgeEdge(edges, card.card_id);
      expect(edge).toBeTruthy();
      expect(edge?.local_only).toBe(true);
      expect(edge?.score).toBe(0);
      expect(edge?.reasons.map((reason) => reason.key)).toEqual(expectedReasonKeys);
    }
  });

  it("does not emit bridge outside narrow attacks->discard cards scope", () => {
    const negatives = buildCardsFromLiterals([
      {
        name: "You Attack Discard",
        oracle_text: "Whenever you attack, target player discards a card.",
      },
      {
        name: "One Or More Attack Discard",
        oracle_text: "Whenever one or more creatures attack, target player discards a card.",
      },
      {
        name: "Attacks Alone Discard",
        oracle_text: "Whenever this creature attacks alone, target player discards a card.",
      },
      {
        name: "Combat Damage Discard",
        oracle_text: "Whenever this creature deals combat damage to a player, that player discards a card.",
      },
      {
        name: "Discard As Cost",
        oracle_text: "{T}, Discard a card: Draw a card.",
      },
      {
        name: "Vanilla Discard",
        oracle_text: "Target player discards a card.",
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
        name: "Attack Damage",
        oracle_text: "Whenever this creature attacks, it deals 1 damage to any target.",
      },
      {
        name: "Attack Counters",
        oracle_text: "Whenever this creature attacks, put a +1/+1 counter on it.",
      },
      {
        name: "Attack Lose Life",
        oracle_text: "Whenever this creature attacks, each opponent loses 1 life.",
      },
      {
        name: "Attack Gain Life",
        oracle_text: "Whenever this creature attacks, you gain 1 life.",
      },
      {
        name: "Attack Mill",
        oracle_text: "Whenever this creature attacks, target opponent mills two cards.",
      },
    ]);

    const edges = buildSemanticEdges(negatives, { includeLocalOnly: true });

    for (const card of negatives) {
      const edge = findCreatureAttacksDiscardCardsLocalBridgeEdge(edges, card.card_id);
      expect(edge).toBeUndefined();
    }
  });
});
