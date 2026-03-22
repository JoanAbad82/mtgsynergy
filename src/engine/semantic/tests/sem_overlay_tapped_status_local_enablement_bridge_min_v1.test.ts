import { describe, expect, it } from "vitest";
import { ActionId, EventId } from "../contract";
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

function findTappedStatusLocalEnablementBridgeEdge(
  cardId: number,
  edges: ReturnType<typeof buildSemanticEdges>,
): ReturnType<typeof buildSemanticEdges>[number] | undefined {
  const drawCardsKey = keyOf(KeyKind.ACTION, ActionId.DRAW_CARDS);
  const untapStatusKey = keyOf(KeyKind.EVENT, EventId.UNTAP);
  return edges.find(
    (edge) =>
      edge.local_only &&
      edge.from === cardId &&
      edge.to === cardId &&
      edge.reasons.some((reason) => reason.key === untapStatusKey) &&
      edge.reasons.some((reason) => reason.key === drawCardsKey),
  );
}

describe("semantic overlay tapped status local enablement bridge min v1", () => {
  it("emits a local bridge for Howling Mine style untapped self-condition and local draw action", () => {
    const card = buildLocalCard(
      1,
      "Howling Mine",
      "At the beginning of each player's draw step, if this artifact is untapped, that player draws an additional card.",
      "Artifact",
    );

    const edges = buildSemanticEdges([card], { includeLocalOnly: true });
    const edge = findTappedStatusLocalEnablementBridgeEdge(card.card_id, edges);

    expect(edge).toBeTruthy();
    expect(edge?.local_only).toBe(true);
    expect(edge?.score).toBe(0);
    expect(edge?.reasons.some((reason) => reason.key === keyOf(KeyKind.EVENT, EventId.UNTAP))).toBe(true);
    expect(edge?.reasons.some((reason) => reason.key === keyOf(KeyKind.EVENT, EventId.TAP))).toBe(false);
  });

  it("does not emit bridge for pure {T} mana cost text without local status condition", () => {
    const card = buildLocalCard(1, "Darksteel Ingot", "{T}: Add one mana of any color.", "Artifact");
    const edges = buildSemanticEdges([card], { includeLocalOnly: true });

    expect(findTappedStatusLocalEnablementBridgeEdge(card.card_id, edges)).toBeUndefined();
  });

  it("does not emit bridge for incidental tapped status text", () => {
    const card = buildLocalCard(
      1,
      "Incidental Tapped Text",
      "This artifact enters the battlefield tapped. Draw a card.",
      "Artifact",
    );
    const edges = buildSemanticEdges([card], { includeLocalOnly: true });

    expect(findTappedStatusLocalEnablementBridgeEdge(card.card_id, edges)).toBeUndefined();
  });

  it("does not emit bridge for untap-step engine wording", () => {
    const card = buildLocalCard(
      1,
      "Untap Step Text",
      "This artifact doesn't untap during your untap step. Draw a card.",
      "Artifact",
    );
    const edges = buildSemanticEdges([card], { includeLocalOnly: true });

    expect(findTappedStatusLocalEnablementBridgeEdge(card.card_id, edges)).toBeUndefined();
  });

  it("does not emit bridge for non-self untapped condition text", () => {
    const card = buildLocalCard(
      1,
      "Cross Object Condition",
      "At the beginning of each player's draw step, if target artifact is untapped, that player draws an additional card.",
      "Artifact",
    );
    const edges = buildSemanticEdges([card], { includeLocalOnly: true });

    expect(findTappedStatusLocalEnablementBridgeEdge(card.card_id, edges)).toBeUndefined();
  });

  it("does not emit bridge for explicit self tapped condition even with draw action", () => {
    const card = buildLocalCard(
      1,
      "Tapped Condition Out Of Scope",
      "As long as this artifact is tapped, draw a card.",
      "Artifact",
    );
    const edges = buildSemanticEdges([card], { includeLocalOnly: true });

    expect(findTappedStatusLocalEnablementBridgeEdge(card.card_id, edges)).toBeUndefined();
  });

  it("does not emit bridge when status condition exists but local downstream action is not recognized", () => {
    const card = buildLocalCard(
      1,
      "No Downstream Action",
      "As long as this artifact is untapped, creatures you control get +1/+1.",
      "Artifact",
    );
    const edges = buildSemanticEdges([card], { includeLocalOnly: true });

    expect(findTappedStatusLocalEnablementBridgeEdge(card.card_id, edges)).toBeUndefined();
  });
});
