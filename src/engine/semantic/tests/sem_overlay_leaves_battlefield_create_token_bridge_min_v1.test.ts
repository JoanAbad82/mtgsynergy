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

function findLocalBridgeEdge(
  edges: ReturnType<typeof buildSemanticEdges>,
  cardId: number,
) {
  return edges.find((edge) => edge.local_only && edge.from === cardId && edge.to === cardId);
}

describe("semantic overlay leaves battlefield create token bridge min v1", () => {
  it("closes locally only for explicit leaves-the-battlefield plus create-token", () => {
    const leavesBattlefieldKey = keyOf(KeyKind.EVENT, EventId.LEAVES_BATTLEFIELD);
    const createTokenKey = keyOf(KeyKind.ACTION, ActionId.CREATE_TOKEN);
    const expectedReasonKeys = [leavesBattlefieldKey, createTokenKey].sort((a, b) => a - b);

    const positiveCards = buildCardsFromLiterals([
      {
        name: "Positive",
        oracle_text: "When Test Card leaves the battlefield, create a 1/1 Soldier token.",
      },
    ]);
    const positiveEdges = buildSemanticEdges(positiveCards, { includeLocalOnly: true });
    const positiveBridgeEdge = findLocalBridgeEdge(positiveEdges, 1);

    expect(positiveBridgeEdge).toBeTruthy();
    expect(positiveBridgeEdge?.local_only).toBe(true);
    expect(positiveBridgeEdge?.score).toBe(0);
    expect(positiveBridgeEdge?.reasons.map((reason) => reason.key)).toEqual(expectedReasonKeys);

    const createTokenOnlyCards = buildCardsFromLiterals([
      { name: "Create Token Only", oracle_text: "Create a 1/1 Soldier token." },
    ]);
    const createTokenOnlyEdges = buildSemanticEdges(createTokenOnlyCards, { includeLocalOnly: true });
    const createTokenOnlyBridgeEdge = findLocalBridgeEdge(createTokenOnlyEdges, 1);

    expect(createTokenOnlyBridgeEdge).toBeUndefined();

    const leavesWithoutTokenCards = buildCardsFromLiterals([
      {
        name: "Leaves Without Token",
        oracle_text: "When Test Card leaves the battlefield, draw a card.",
      },
    ]);
    const leavesWithoutTokenEdges = buildSemanticEdges(leavesWithoutTokenCards, { includeLocalOnly: true });
    const leavesWithoutTokenBridgeEdge = findLocalBridgeEdge(leavesWithoutTokenEdges, 1);

    expect(leavesWithoutTokenBridgeEdge).toBeUndefined();

    const diesCreateTokenCards = buildCardsFromLiterals([
      {
        name: "Dies Create Token",
        oracle_text: "When Test Card dies, create a 1/1 Soldier token.",
      },
    ]);
    const diesCreateTokenEdges = buildSemanticEdges(diesCreateTokenCards, { includeLocalOnly: true });
    const diesCreateTokenBridgeEdge = findLocalBridgeEdge(diesCreateTokenEdges, 1);

    expect(diesCreateTokenBridgeEdge).toBeUndefined();
  });
});
