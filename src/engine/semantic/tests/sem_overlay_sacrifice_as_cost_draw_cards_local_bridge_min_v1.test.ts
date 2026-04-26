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
    const card_id = index + 1;
    const oracleText = normalizeOracleTextV1(row.oracle_text);
    const parseInput = {
      card_id,
      name: row.name,
      oracle_text: oracleText,
      type_line: null,
    };
    const ir = parseSemanticIrV0(
      parseInput as { name: string; oracle_text: string; type_line?: string | null },
    );
    ir.card_id = card_id;
    return { card_id, ir, oracle_text: oracleText };
  });
}

function findSacrificeAsCostDrawCardsLocalBridgeEdge(
  edges: ReturnType<typeof buildSemanticEdges>,
  cardId: number,
) {
  const sacrificeKey = keyOf(KeyKind.EVENT, EventId.SACRIFICE);
  const drawCardsKey = keyOf(KeyKind.ACTION, ActionId.DRAW_CARDS);
  return edges.find(
    (edge) =>
      edge.local_only &&
      edge.from === cardId &&
      edge.to === cardId &&
      edge.reasons.some((reason) => reason.key === sacrificeKey) &&
      edge.reasons.some((reason) => reason.key === drawCardsKey),
  );
}

describe("semantic overlay sacrifice-as-cost draw-cards local bridge min v1", () => {
  it("emits strict local self-edge for narrow sacrifice-as-cost plus draw wording", () => {
    const sacrificeKey = keyOf(KeyKind.EVENT, EventId.SACRIFICE);
    const drawCardsKey = keyOf(KeyKind.ACTION, ActionId.DRAW_CARDS);
    const expectedReasonKeys = [sacrificeKey, drawCardsKey].sort((a, b) => a - b);

    const positives = buildCardsFromLiterals([
      {
        name: "Additional Cost Draw",
        oracle_text: "As an additional cost to cast this spell, sacrifice a creature. Draw two cards.",
      },
      {
        name: "Sacrifice Another Draw",
        oracle_text: "Sacrifice another creature: Draw a card.",
      },
      {
        name: "Tap Sacrifice Artifact Draw",
        oracle_text: "{T}, Sacrifice this artifact: Draw a card.",
      },
    ]);

    const edges = buildSemanticEdges(positives, { includeLocalOnly: true });

    for (const card of positives) {
      const edge = findSacrificeAsCostDrawCardsLocalBridgeEdge(edges, card.card_id);
      expect(edge).toBeTruthy();
      expect(edge?.local_only).toBe(true);
      expect(edge?.from).toBe(card.card_id);
      expect(edge?.to).toBe(card.card_id);
      expect(edge?.score).toBe(0);
      expect(edge?.reasons.map((reason) => reason.key)).toEqual(expectedReasonKeys);
    }
  });

  it("does not emit bridge outside narrow local sacrifice-as-cost scope", () => {
    const negatives = buildCardsFromLiterals([
      {
        name: "Dies May Sacrifice Draw",
        oracle_text: "When a creature dies, you may sacrifice a creature. Draw a card.",
      },
      {
        name: "Whenever Sacrifice Draw",
        oracle_text: "Whenever you sacrifice a creature, draw a card.",
      },
      {
        name: "Another Dies Draw",
        oracle_text: "When another creature dies, draw a card.",
      },
      {
        name: "Sacrifice Only",
        oracle_text: "Sacrifice a creature.",
      },
      {
        name: "Draw Only",
        oracle_text: "Draw a card.",
      },
      {
        name: "Discard Cost Draw",
        oracle_text: "Discard a card: Draw a card.",
      },
      {
        name: "Additional Cost Discard Draw",
        oracle_text: "As an additional cost to cast this spell, discard a card. Draw two cards.",
      },
      {
        name: "Attacks Draw",
        oracle_text: "Whenever this creature attacks, draw a card.",
      },
      {
        name: "Create Token Etb Draw",
        oracle_text: "Create a 1/1 white Soldier creature token. When it enters the battlefield, draw a card.",
      },
    ]);

    const edges = buildSemanticEdges(negatives, { includeLocalOnly: true });

    for (const card of negatives) {
      const edge = findSacrificeAsCostDrawCardsLocalBridgeEdge(edges, card.card_id);
      expect(edge).toBeUndefined();
    }
  });
});
