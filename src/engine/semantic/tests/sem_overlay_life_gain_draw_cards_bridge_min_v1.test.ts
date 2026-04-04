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

function findLifeGainDrawCardsLocalBridgeEdge(
  edges: ReturnType<typeof buildSemanticEdges>,
  cardId: number,
) {
  const lifeGainEventKey = keyOf(KeyKind.EVENT, EventId.LIFE_GAIN);
  const drawCardsKey = keyOf(KeyKind.ACTION, ActionId.DRAW_CARDS);
  return edges.find(
    (edge) =>
      edge.local_only &&
      edge.from === cardId &&
      edge.to === cardId &&
      edge.reasons.some((reason) => reason.key === lifeGainEventKey) &&
      edge.reasons.some((reason) => reason.key === drawCardsKey),
  );
}

describe("semantic overlay life gain draw cards local bridge min v1", () => {
  it("emits strict local self-edge for direct life-gain trigger with draw-card payoff and rejects adjacent templates", () => {
    const lifeGainEventKey = keyOf(KeyKind.EVENT, EventId.LIFE_GAIN);
    const drawCardsKey = keyOf(KeyKind.ACTION, ActionId.DRAW_CARDS);
    const expectedReasonKeys = [lifeGainEventKey, drawCardsKey].sort((a, b) => a - b);

    const positives = buildCardsFromLiterals([
      {
        name: "Drogskol Reaver",
        oracle_text: "Flying, double strike, lifelink. Whenever you gain life, draw a card.",
      },
    ]);
    const positiveEdges = buildSemanticEdges(positives, { includeLocalOnly: true });

    for (const card of positives) {
      const edge = findLifeGainDrawCardsLocalBridgeEdge(positiveEdges, card.card_id);
      expect(edge).toBeTruthy();
      expect(edge?.local_only).toBe(true);
      expect(edge?.score).toBe(0);
      expect(edge?.reasons.map((reason) => reason.key)).toEqual(expectedReasonKeys);
    }

    const negatives = buildCardsFromLiterals([
      {
        name: "Dawn of Hope",
        oracle_text: "Whenever you gain life, you may pay {2}. If you do, draw a card.",
      },
      {
        name: "Oloro, Ageless Ascetic",
        oracle_text:
          "At the beginning of your upkeep, you gain 2 life. Whenever you gain life, you may pay {1}. If you do, draw a card and each opponent loses 1 life.",
      },
      {
        name: "Exemplar of Light",
        oracle_text:
          "Flying Whenever you gain life, put a +1/+1 counter on this creature. Whenever you put one or more +1/+1 counters on this creature, draw a card. This ability triggers only once each turn.",
      },
      {
        name: "The Archimandrite",
        oracle_text:
          "At the beginning of your upkeep, you gain X life, where X is the number of cards in your hand minus 4. Whenever you gain life, each Advisor, Artificer, and Monk you control gains vigilance and gets +X/+0 until end of turn, where X is the amount of life you gained. Tap three untapped Advisors, Artificers, and/or Monks you control: Draw a card.",
      },
      {
        name: "First-Time Life Gain Draw",
        oracle_text: "Whenever you gain life for the first time each turn, draw a card.",
      },
    ]);
    const negativeEdges = buildSemanticEdges(negatives, { includeLocalOnly: true });

    for (const card of negatives) {
      const edge = findLifeGainDrawCardsLocalBridgeEdge(negativeEdges, card.card_id);
      expect(edge).toBeUndefined();
    }
  });
});
