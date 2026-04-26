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

function findCreatureAttacksPtChangeLocalBridgeEdge(
  edges: ReturnType<typeof buildSemanticEdges>,
  cardId: number,
) {
  const creatureAttacksKey = keyOf(KeyKind.EVENT, EventId.CREATURE_ATTACKS);
  const ptChangeKey = keyOf(KeyKind.ACTION, ActionId.PT_CHANGE);
  return edges.find(
    (edge) =>
      edge.local_only &&
      edge.from === cardId &&
      edge.to === cardId &&
      edge.reasons.some((reason) => reason.key === creatureAttacksKey) &&
      edge.reasons.some((reason) => reason.key === ptChangeKey),
  );
}

describe("semantic overlay creature attacks pt change local bridge min v1", () => {
  it("emits strict local self-edge and parser emits PT_CHANGE for explicit attacks->gets +N/+N until end of turn wording", () => {
    const creatureAttacksKey = keyOf(KeyKind.EVENT, EventId.CREATURE_ATTACKS);
    const ptChangeKey = keyOf(KeyKind.ACTION, ActionId.PT_CHANGE);
    const expectedReasonKeys = [creatureAttacksKey, ptChangeKey].sort((a, b) => a - b);

    const cards = buildCardsFromLiterals([
      {
        name: "Attack Pump Engine",
        oracle_text: "Whenever this creature attacks, it gets +1/+1 until end of turn.",
      },
    ]);

    const parserHasAttackWatch = cards[0].ir.frames.some((frame) =>
      frame.watch.some((watch) => watch.id === EventId.CREATURE_ATTACKS),
    );
    const parserHasPtChangeAction = cards[0].ir.frames.some((frame) =>
      frame.do.some((effect) => effect.action === ActionId.PT_CHANGE),
    );

    expect(parserHasAttackWatch).toBe(true);
    expect(parserHasPtChangeAction).toBe(true);

    const edges = buildSemanticEdges(cards, { includeLocalOnly: true });
    const edge = findCreatureAttacksPtChangeLocalBridgeEdge(edges, cards[0].card_id);

    expect(edge).toBeTruthy();
    expect(edge?.local_only).toBe(true);
    expect(edge?.score).toBe(0);
    expect(edge?.reasons.map((reason) => reason.key)).toEqual(expectedReasonKeys);
  });

  it("does not emit bridge outside narrow attacks->pt change scope", () => {
    const negatives = buildCardsFromLiterals([
      {
        name: "You Attack Pump",
        oracle_text: "Whenever you attack, this creature gets +1/+1 until end of turn.",
      },
      {
        name: "One Or More Attack Pump",
        oracle_text: "Whenever one or more creatures attack, this creature gets +1/+1 until end of turn.",
      },
      {
        name: "Attacks Alone Pump",
        oracle_text: "Whenever this creature attacks alone, it gets +1/+1 until end of turn.",
      },
      {
        name: "Equipped Creature Static",
        oracle_text: "Equipped creature gets +1/+1.",
      },
      {
        name: "Anthem Static",
        oracle_text: "Creatures you control get +1/+1.",
      },
      {
        name: "Vanilla Pump",
        oracle_text: "This creature gets +1/+1 until end of turn.",
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
      {
        name: "Attack Discard",
        oracle_text: "Whenever this creature attacks, target player discards a card.",
      },
      {
        name: "Attack Add Mana",
        oracle_text: "Whenever this creature attacks, add {R}.",
      },
    ]);

    const edges = buildSemanticEdges(negatives, { includeLocalOnly: true });

    for (const card of negatives) {
      const edge = findCreatureAttacksPtChangeLocalBridgeEdge(edges, card.card_id);
      expect(edge).toBeUndefined();
    }
  });
});
