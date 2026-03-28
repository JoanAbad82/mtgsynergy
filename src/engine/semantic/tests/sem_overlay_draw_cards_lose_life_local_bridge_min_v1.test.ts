import { describe, expect, it } from "vitest";
import { ActionId } from "../contract";
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

function findDrawLoseLifeLocalBridgeEdge(
  edges: ReturnType<typeof buildSemanticEdges>,
  cardId: number,
) {
  const drawCardsKey = keyOf(KeyKind.ACTION, ActionId.DRAW_CARDS);
  const loseLifeKey = keyOf(KeyKind.ACTION, ActionId.LOSE_LIFE);
  return edges.find(
    (edge) =>
      edge.local_only &&
      edge.from === cardId &&
      edge.to === cardId &&
      edge.reasons.some((reason) => reason.key === drawCardsKey) &&
      edge.reasons.some((reason) => reason.key === loseLifeKey),
  );
}

describe("semantic overlay draw cards lose life local bridge min v1", () => {
  it("emits strict local self-edge for explicit draw-cards plus lose-life wording and rejects adjacent families", () => {
    const drawCardsKey = keyOf(KeyKind.ACTION, ActionId.DRAW_CARDS);
    const loseLifeKey = keyOf(KeyKind.ACTION, ActionId.LOSE_LIFE);
    const expectedReasonKeys = [drawCardsKey, loseLifeKey].sort((a, b) => a - b);

    const positives = buildCardsFromLiterals([
      {
        name: "Psychosis Crawler",
        oracle_text: "Whenever you draw a card, each opponent loses 1 life.",
      },
    ]);
    const positiveEdges = buildSemanticEdges(positives, { includeLocalOnly: true });

    for (const card of positives) {
      const edge = findDrawLoseLifeLocalBridgeEdge(positiveEdges, card.card_id);
      expect(edge).toBeTruthy();
      expect(edge?.local_only).toBe(true);
      expect(edge?.score).toBe(0);
      expect(edge?.reasons.map((reason) => reason.key)).toEqual(expectedReasonKeys);
    }

    const negatives = buildCardsFromLiterals([
      {
        name: "Niv-Mizzet, the Firemind",
        oracle_text: "Whenever you draw a card, Niv-Mizzet, the Firemind deals 1 damage to any target.",
      },
      {
        name: "The Locust God",
        oracle_text:
          "Whenever you draw a card, create a 1/1 blue and red Insect creature token with flying and haste.",
      },
      {
        name: "Chasm Skulker",
        oracle_text: "Whenever you draw a card, put a +1/+1 counter on Chasm Skulker.",
      },
      {
        name: "Teferi's Tutelage",
        oracle_text: "Whenever you draw a card, target opponent mills two cards.",
      },
      {
        name: "Draw Second Lose Life",
        oracle_text: "Whenever you draw your second card each turn, each opponent loses 1 life.",
      },
    ]);
    const negativeEdges = buildSemanticEdges(negatives, { includeLocalOnly: true });

    for (const card of negatives) {
      const edge = findDrawLoseLifeLocalBridgeEdge(negativeEdges, card.card_id);
      expect(edge).toBeUndefined();
    }
  });
});
