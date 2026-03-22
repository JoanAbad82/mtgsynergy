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

describe("semantic overlay produce mana enablement closure min v1", () => {
  it("emits a local PRODUCE_MANA -> enablement closure edge for explicit mana-sink activated payoff text", () => {
    const card = buildLocalCard(
      1,
      "Bonder's Ornament",
      "{T}: Add one mana of any color. {4}, {T}: Draw a card.",
      "Artifact",
    );

    const edges = buildSemanticEdges([card], { includeLocalOnly: true });
    const produceManaKey = keyOf(KeyKind.ACTION, ActionId.PRODUCE_MANA);
    const drawCardsKey = keyOf(KeyKind.ACTION, ActionId.DRAW_CARDS);

    const localBridgeEdge = edges.find(
      (edge) =>
        edge.local_only &&
        edge.from === card.card_id &&
        edge.to === card.card_id &&
        edge.reasons.some((reason) => reason.key === produceManaKey) &&
        edge.reasons.some((reason) => reason.key === drawCardsKey),
    );

    expect(localBridgeEdge).toBeTruthy();
    expect(localBridgeEdge?.local_only).toBe(true);
    expect(localBridgeEdge?.score).toBe(0);
  });

  it("does not emit enablement closure for isolated PRODUCE_MANA text", () => {
    const card = buildLocalCard(
      1,
      "Darksteel Ingot",
      "{T}: Add one mana of any color.",
      "Artifact",
    );

    const edges = buildSemanticEdges([card], { includeLocalOnly: true });
    const produceManaKey = keyOf(KeyKind.ACTION, ActionId.PRODUCE_MANA);

    const localProduceManaBridgeEdges = edges.filter(
      (edge) =>
        edge.local_only &&
        edge.from === card.card_id &&
        edge.to === card.card_id &&
        edge.reasons.some((reason) => reason.key === produceManaKey),
    );

    expect(localProduceManaBridgeEdges).toHaveLength(0);
  });
});
