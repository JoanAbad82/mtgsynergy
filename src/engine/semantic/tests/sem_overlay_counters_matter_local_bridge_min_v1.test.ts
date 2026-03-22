import { describe, expect, it } from "vitest";
import { ActionId } from "../contract";
import { normalizeOracleTextV1 } from "../normalize";
import { buildSemanticEdges } from "../overlay/sem_edges";
import { KeyKind, keyOf } from "../overlay/sem_profile";
import { parseSemanticIrV0 } from "../parser/sem_parser_v1";

type LocalCard = {
  card_id: number;
  name: string;
  oracle_text: string;
  ir: ReturnType<typeof parseSemanticIrV0>;
};

function buildLocalCard(cardId: number, name: string, oracleText: string, typeLine: string): LocalCard {
  const normalized = normalizeOracleTextV1(oracleText);
  const ir = parseSemanticIrV0({
    name,
    oracle_text: normalized,
    type_line: typeLine,
  });
  ir.card_id = cardId;
  return {
    card_id: cardId,
    name,
    oracle_text: normalized,
    ir,
  };
}

function findCountersMatterLocalBridgeEdge(
  cardId: number,
  edges: ReturnType<typeof buildSemanticEdges>,
): ReturnType<typeof buildSemanticEdges>[number] | undefined {
  const addCountersKey = keyOf(KeyKind.ACTION, ActionId.ADD_COUNTERS);
  const payoffKeys = [
    keyOf(KeyKind.ACTION, ActionId.DRAW_CARDS),
    keyOf(KeyKind.ACTION, ActionId.DEAL_DAMAGE),
    keyOf(KeyKind.ACTION, ActionId.GAIN_LIFE),
    keyOf(KeyKind.ACTION, ActionId.CREATE_TOKEN),
  ];
  return edges.find(
    (edge) =>
      edge.local_only &&
      edge.from === cardId &&
      edge.to === cardId &&
      edge.reasons.some((reason) => reason.key === addCountersKey) &&
      edge.reasons.some((reason) => payoffKeys.includes(reason.key)),
  );
}

describe("semantic overlay counters matter local bridge min v1", () => {
  it("emits a local COUNTERS -> COUNTERS_MATTER bridge for explicit local counters payoff wording", () => {
    const card = buildLocalCard(
      1,
      "Counters Matter Positive",
      "Put a +1/+1 counter on target creature. Draw a card for each +1/+1 counter on that creature.",
      "Sorcery",
    );

    const edges = buildSemanticEdges([card], { includeLocalOnly: true });
    const localBridgeEdge = findCountersMatterLocalBridgeEdge(card.card_id, edges);

    expect(localBridgeEdge).toBeTruthy();
    expect(localBridgeEdge?.local_only).toBe(true);
    expect(localBridgeEdge?.score).toBe(0);
  });

  it("does not emit counters-matter closure for isolated ADD_COUNTERS text", () => {
    const card = buildLocalCard(
      1,
      "Counters Matter Negative",
      "Put a +1/+1 counter on target creature.",
      "Sorcery",
    );

    const edges = buildSemanticEdges([card], { includeLocalOnly: true });
    const localBridgeEdge = findCountersMatterLocalBridgeEdge(card.card_id, edges);

    expect(localBridgeEdge).toBeUndefined();
  });

  it("does not emit closure for counters text that still lacks eligible local payoff", () => {
    const card = buildLocalCard(
      1,
      "Counters Mention Without Eligible Payoff",
      "Put a +1/+1 counter on target creature. Proliferate.",
      "Sorcery",
    );

    const edges = buildSemanticEdges([card], { includeLocalOnly: true });
    const localBridgeEdge = findCountersMatterLocalBridgeEdge(card.card_id, edges);

    expect(localBridgeEdge).toBeUndefined();
  });

  it("does not emit closure for local payoff text without ADD_COUNTERS upstream signal", () => {
    const card = buildLocalCard(
      1,
      "Payoff Without Add Counters",
      "Draw a card for each +1/+1 counter on target creature.",
      "Sorcery",
    );

    const edges = buildSemanticEdges([card], { includeLocalOnly: true });
    const localBridgeEdge = findCountersMatterLocalBridgeEdge(card.card_id, edges);

    expect(localBridgeEdge).toBeUndefined();
  });

  it("does not overclaim on loyalty-adjacent counter text", () => {
    const card = buildLocalCard(
      1,
      "Loyalty Adjacent Text",
      "Put a loyalty counter on target planeswalker.",
      "Sorcery",
    );

    const edges = buildSemanticEdges([card], { includeLocalOnly: true });
    const localBridgeEdge = findCountersMatterLocalBridgeEdge(card.card_id, edges);

    expect(localBridgeEdge).toBeUndefined();
  });
});
