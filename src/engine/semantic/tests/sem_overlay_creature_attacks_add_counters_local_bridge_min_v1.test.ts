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

function findCreatureAttacksAddCountersLocalBridgeEdge(
  edges: ReturnType<typeof buildSemanticEdges>,
  cardId: number,
) {
  const creatureAttacksKey = keyOf(KeyKind.EVENT, EventId.CREATURE_ATTACKS);
  const addCountersKey = keyOf(KeyKind.ACTION, ActionId.ADD_COUNTERS);
  return edges.find(
    (edge) =>
      edge.local_only &&
      edge.from === cardId &&
      edge.to === cardId &&
      edge.reasons.some((reason) => reason.key === creatureAttacksKey) &&
      edge.reasons.some((reason) => reason.key === addCountersKey),
  );
}

describe("semantic overlay creature attacks add counters local bridge min v1", () => {
  it("emits strict local self-edge for explicit attacks->add counters wording", () => {
    const creatureAttacksKey = keyOf(KeyKind.EVENT, EventId.CREATURE_ATTACKS);
    const addCountersKey = keyOf(KeyKind.ACTION, ActionId.ADD_COUNTERS);
    const expectedReasonKeys = [creatureAttacksKey, addCountersKey].sort((a, b) => a - b);

    const cards = buildCardsFromLiterals([
      {
        name: "Attack Counter Engine",
        oracle_text: "Whenever this creature attacks, put a +1/+1 counter on it.",
      },
    ]);
    const edges = buildSemanticEdges(cards, { includeLocalOnly: true });
    const edge = findCreatureAttacksAddCountersLocalBridgeEdge(edges, cards[0].card_id);

    expect(edge).toBeTruthy();
    expect(edge?.local_only).toBe(true);
    expect(edge?.score).toBe(0);
    expect(edge?.reasons.map((reason) => reason.key)).toEqual(expectedReasonKeys);
  });

  it("does not emit bridge outside narrow wording and +1/+1 self-counter scope", () => {
    const negatives = buildCardsFromLiterals([
      {
        name: "You Attack Counters",
        oracle_text: "Whenever you attack, put a +1/+1 counter on this creature.",
      },
      {
        name: "One Or More Attack Counters",
        oracle_text: "Whenever one or more creatures attack, put a +1/+1 counter on this creature.",
      },
      {
        name: "Attacks Alone Counters",
        oracle_text: "Whenever this creature attacks alone, put a +1/+1 counter on it.",
      },
      {
        name: "Attack Target Counter",
        oracle_text: "Whenever this creature attacks, put a +1/+1 counter on target creature.",
      },
      {
        name: "Vanilla Counters",
        oracle_text: "Put a +1/+1 counter on this creature.",
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
    ]);
    const edges = buildSemanticEdges(negatives, { includeLocalOnly: true });

    for (const card of negatives) {
      const edge = findCreatureAttacksAddCountersLocalBridgeEdge(edges, card.card_id);
      expect(edge).toBeUndefined();
    }
  });
});

