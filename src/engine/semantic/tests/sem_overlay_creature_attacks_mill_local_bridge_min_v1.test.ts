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

function findCreatureAttacksMillLocalBridgeEdge(
  edges: ReturnType<typeof buildSemanticEdges>,
  cardId: number,
) {
  const creatureAttacksKey = keyOf(KeyKind.EVENT, EventId.CREATURE_ATTACKS);
  const millCardsKey = keyOf(KeyKind.ACTION, ActionId.MILL_CARDS);
  return edges.find(
    (edge) =>
      edge.local_only &&
      edge.from === cardId &&
      edge.to === cardId &&
      edge.reasons.some((reason) => reason.key === creatureAttacksKey) &&
      edge.reasons.some((reason) => reason.key === millCardsKey),
  );
}

describe("semantic overlay creature attacks mill local bridge min v1", () => {
  it("emits strict local self-edge for explicit attacks->target opponent/player mills wording", () => {
    const creatureAttacksKey = keyOf(KeyKind.EVENT, EventId.CREATURE_ATTACKS);
    const millCardsKey = keyOf(KeyKind.ACTION, ActionId.MILL_CARDS);
    const expectedReasonKeys = [creatureAttacksKey, millCardsKey].sort((a, b) => a - b);

    const positives = buildCardsFromLiterals([
      {
        name: "Attack Mill Engine",
        oracle_text: "Whenever this creature attacks, target opponent mills two cards.",
      },
      {
        name: "Attack Mill Player Engine",
        oracle_text: "Whenever this creature attacks, target player mills two cards.",
      },
    ]);

    const edges = buildSemanticEdges(positives, { includeLocalOnly: true });

    for (const card of positives) {
      const edge = findCreatureAttacksMillLocalBridgeEdge(edges, card.card_id);
      expect(edge).toBeTruthy();
      expect(edge?.local_only).toBe(true);
      expect(edge?.score).toBe(0);
      expect(edge?.reasons.map((reason) => reason.key)).toEqual(expectedReasonKeys);
    }
  });

  it("does not emit bridge outside narrow attacks->target opponent/player mills scope", () => {
    const negatives = buildCardsFromLiterals([
      {
        name: "You Attack Mill",
        oracle_text: "Whenever you attack, target opponent mills two cards.",
      },
      {
        name: "One Or More Attack Mill",
        oracle_text: "Whenever one or more creatures attack, target opponent mills two cards.",
      },
      {
        name: "Attacks Alone Mill",
        oracle_text: "Whenever this creature attacks alone, target opponent mills two cards.",
      },
      {
        name: "Combat Damage Mill",
        oracle_text: "Whenever this creature deals combat damage to a player, target opponent mills two cards.",
      },
      {
        name: "Attack Each Opponent Mill",
        oracle_text: "Whenever this creature attacks, each opponent mills two cards.",
      },
      {
        name: "Vanilla Mill",
        oracle_text: "Target player mills two cards.",
      },
      {
        name: "Draw Mill",
        oracle_text: "Whenever you draw a card, target opponent mills two cards.",
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
    ]);

    const edges = buildSemanticEdges(negatives, { includeLocalOnly: true });

    for (const card of negatives) {
      const edge = findCreatureAttacksMillLocalBridgeEdge(edges, card.card_id);
      expect(edge).toBeUndefined();
    }
  });
});
