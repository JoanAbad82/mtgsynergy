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

function findCreatureAttacksCreateTokenLocalBridgeEdge(
  edges: ReturnType<typeof buildSemanticEdges>,
  cardId: number,
) {
  const creatureAttacksKey = keyOf(KeyKind.EVENT, EventId.CREATURE_ATTACKS);
  const createTokenKey = keyOf(KeyKind.ACTION, ActionId.CREATE_TOKEN);
  return edges.find(
    (edge) =>
      edge.local_only &&
      edge.from === cardId &&
      edge.to === cardId &&
      edge.reasons.some((reason) => reason.key === creatureAttacksKey) &&
      edge.reasons.some((reason) => reason.key === createTokenKey),
  );
}

describe("semantic overlay creature attacks create token local bridge min v1", () => {
  it("emits strict local self-edge for 'Whenever this creature attacks, create ... token'", () => {
    const creatureAttacksKey = keyOf(KeyKind.EVENT, EventId.CREATURE_ATTACKS);
    const createTokenKey = keyOf(KeyKind.ACTION, ActionId.CREATE_TOKEN);
    const expectedReasonKeys = [creatureAttacksKey, createTokenKey].sort((a, b) => a - b);

    const cards = buildCardsFromLiterals([
      {
        name: "Attack Token Maker",
        oracle_text: "Whenever this creature attacks, create a 1/1 white Soldier creature token.",
      },
    ]);

    const edges = buildSemanticEdges(cards, { includeLocalOnly: true });
    const edge = findCreatureAttacksCreateTokenLocalBridgeEdge(edges, cards[0].card_id);
    expect(edge).toBeTruthy();
    expect(edge?.local_only).toBe(true);
    expect(edge?.score).toBe(0);
    expect(edge?.reasons.map((reason) => reason.key)).toEqual(expectedReasonKeys);
  });

  it("does not emit bridge outside narrow wording and signal scope", () => {
    const negatives = buildCardsFromLiterals([
      {
        name: "You Attack Token Maker",
        oracle_text: "Whenever you attack, create a 1/1 white Soldier creature token.",
      },
      {
        name: "One Or More Attack Token Maker",
        oracle_text: "Whenever one or more creatures attack, create a 1/1 white Soldier creature token.",
      },
      {
        name: "Combat Damage Token Maker",
        oracle_text:
          "Whenever this creature deals combat damage to a player, create a 1/1 white Soldier creature token.",
      },
      {
        name: "Vanilla Token Maker",
        oracle_text: "Create a 1/1 white Soldier creature token.",
      },
      {
        name: "Attacks Draw Maker",
        oracle_text: "Whenever this creature attacks, draw a card.",
      },
    ]);

    const edges = buildSemanticEdges(negatives, { includeLocalOnly: true });

    for (const card of negatives) {
      const edge = findCreatureAttacksCreateTokenLocalBridgeEdge(edges, card.card_id);
      expect(edge).toBeUndefined();
    }
  });
});

