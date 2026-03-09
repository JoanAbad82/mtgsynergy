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

describe("semantic overlay creature dies payoff bridge min v1", () => {
  it("closes locally for dies+payoff profile without cross-card or non-target matches", () => {
    const diesKey = keyOf(KeyKind.EVENT, EventId.CREATURE_DIES);
    const loseLifeKey = keyOf(KeyKind.ACTION, ActionId.LOSE_LIFE);
    const dealDamageKey = keyOf(KeyKind.ACTION, ActionId.DEAL_DAMAGE);
    const gainLifeKey = keyOf(KeyKind.ACTION, ActionId.GAIN_LIFE);

    const localPayoffCards = buildCardsFromLiterals([
      {
        name: "Local Payoff",
        oracle_text: "Whenever a creature dies, target player loses 1 life.",
      },
    ]);
    const localEdges = buildSemanticEdges(localPayoffCards, { includeLocalOnly: true });
    const localBridgeEdge = findLocalBridgeEdge(localEdges, 1);

    expect(localBridgeEdge).toBeTruthy();
    expect(localBridgeEdge?.reasons.some((reason) => reason.key === diesKey)).toBe(true);
    expect(
      localBridgeEdge?.reasons.some((reason) =>
        [loseLifeKey, dealDamageKey, gainLifeKey].includes(reason.key),
      ),
    ).toBe(true);

    const crossCardCards = buildCardsFromLiterals([
      { name: "Dies Listener", oracle_text: "Whenever a creature dies, draw a card." },
      { name: "Payoff Only", oracle_text: "Target player loses 1 life." },
    ]);
    const crossEdges = buildSemanticEdges(crossCardCards, { includeLocalOnly: true });
    const crossBridgeEdge1 = findLocalBridgeEdge(crossEdges, 1);
    const crossBridgeEdge2 = findLocalBridgeEdge(crossEdges, 2);

    expect(crossBridgeEdge1).toBeUndefined();
    expect(crossBridgeEdge2).toBeUndefined();

    const nonTargetCards = buildCardsFromLiterals([
      { name: "Non Target", oracle_text: "Whenever a creature dies, draw a card." },
    ]);
    const nonTargetEdges = buildSemanticEdges(nonTargetCards, { includeLocalOnly: true });
    const nonTargetBridgeEdge = findLocalBridgeEdge(nonTargetEdges, 1);

    expect(nonTargetBridgeEdge).toBeUndefined();
  });
});
