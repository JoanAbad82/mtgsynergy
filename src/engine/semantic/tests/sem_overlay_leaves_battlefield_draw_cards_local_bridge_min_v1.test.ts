import { describe, expect, it } from "vitest";
import { normalizeOracleTextV1 } from "../normalize";
import { parseSemanticIrV0 } from "../parser/sem_parser_v1";
import { buildSemanticEdges } from "../overlay/sem_edges";
import { ActionId, EventId } from "../contract";
import { KeyKind, keyOf } from "../overlay/sem_profile";

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

function findLeavesDrawLocalBridgeEdge(
  edges: ReturnType<typeof buildSemanticEdges>,
  cardId: number,
) {
  const leavesBattlefieldKey = keyOf(KeyKind.EVENT, EventId.LEAVES_BATTLEFIELD);
  const drawCardsKey = keyOf(KeyKind.ACTION, ActionId.DRAW_CARDS);
  return edges.find(
    (edge) =>
      edge.local_only &&
      edge.from === cardId &&
      edge.to === cardId &&
      edge.reasons.some((reason) => reason.key === leavesBattlefieldKey) &&
      edge.reasons.some((reason) => reason.key === drawCardsKey),
  );
}

describe("semantic overlay leaves battlefield draw cards local bridge min v1", () => {
  it("closes locally only for explicit leaves-the-battlefield plus draw-cards", () => {
    const leavesBattlefieldKey = keyOf(KeyKind.EVENT, EventId.LEAVES_BATTLEFIELD);
    const drawCardsKey = keyOf(KeyKind.ACTION, ActionId.DRAW_CARDS);
    const creatureDiesKey = keyOf(KeyKind.EVENT, EventId.CREATURE_DIES);
    const expectedReasonKeys = [leavesBattlefieldKey, drawCardsKey].sort((a, b) => a - b);

    const positiveCards = buildCardsFromLiterals([
      {
        name: "Positive",
        oracle_text: "When Test Card leaves the battlefield, draw a card.",
      },
    ]);
    const positiveEdges = buildSemanticEdges(positiveCards, { includeLocalOnly: true });
    const positiveBridgeEdge = findLeavesDrawLocalBridgeEdge(positiveEdges, 1);

    expect(positiveBridgeEdge).toBeTruthy();
    expect(positiveBridgeEdge?.local_only).toBe(true);
    expect(positiveBridgeEdge?.score).toBe(0);
    expect(positiveBridgeEdge?.reasons.map((reason) => reason.key)).toEqual(expectedReasonKeys);
    expect(positiveBridgeEdge?.reasons.some((reason) => reason.key === creatureDiesKey)).toBe(false);

    const drawOnlyCards = buildCardsFromLiterals([
      { name: "Draw Only", oracle_text: "Draw a card." },
    ]);
    const drawOnlyEdges = buildSemanticEdges(drawOnlyCards, { includeLocalOnly: true });
    const drawOnlyBridgeEdge = findLeavesDrawLocalBridgeEdge(drawOnlyEdges, 1);

    expect(drawOnlyBridgeEdge).toBeUndefined();

    const leavesWithoutDrawCards = buildCardsFromLiterals([
      {
        name: "Leaves Without Draw",
        oracle_text: "When Test Card leaves the battlefield, gain 3 life.",
      },
    ]);
    const leavesWithoutDrawEdges = buildSemanticEdges(leavesWithoutDrawCards, { includeLocalOnly: true });
    const leavesWithoutDrawBridgeEdge = findLeavesDrawLocalBridgeEdge(leavesWithoutDrawEdges, 1);

    expect(leavesWithoutDrawBridgeEdge).toBeUndefined();

    const diesDrawCards = buildCardsFromLiterals([
      {
        name: "Dies Draw",
        oracle_text: "When Test Card dies, draw a card.",
      },
    ]);
    const diesDrawEdges = buildSemanticEdges(diesDrawCards, { includeLocalOnly: true });
    const diesDrawBridgeEdge = findLeavesDrawLocalBridgeEdge(diesDrawEdges, 1);

    expect(diesDrawBridgeEdge).toBeUndefined();
  });
});
