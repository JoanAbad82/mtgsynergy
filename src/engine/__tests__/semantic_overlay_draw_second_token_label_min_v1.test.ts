import { describe, expect, it } from "vitest";
import { ActionId, EventId } from "../semantic/contract";
import { normalizeOracleTextV1 } from "../semantic/normalize";
import { buildSemanticEdges } from "../semantic/overlay/sem_edges";
import { explainKeyHuman, KeyKind, keyOf } from "../semantic/overlay/sem_profile";
import { parseSemanticIrV0 } from "../semantic/parser/sem_parser_v1";

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

function visibleReasonLabelsForCard(
  edges: ReturnType<typeof buildSemanticEdges>,
  cardId: number,
): string[] {
  return edges
    .filter((edge) => edge.from === cardId && edge.to === cardId)
    .flatMap((edge) => {
      const reasonKeys = edge.reasons.map((reason) => reason.key);
      return edge.reasons.map((reason) => explainKeyHuman(reason.key, reasonKeys));
    });
}

describe("semantic overlay draw-second token label min v1", () => {
  it("prioritizes the draw-second -> token label over generic draw-second when both reasons exist", () => {
    const drawSecondKey = keyOf(KeyKind.EVENT, EventId.DRAW_EXTRA_CARD_TURN);
    const createTokenKey = keyOf(KeyKind.ACTION, ActionId.CREATE_TOKEN);
    const genericDrawSecondLabel = explainKeyHuman(drawSecondKey);
    const tokenBridgeLabelRegex = /segunda carta.*ficha/i;

    expect(explainKeyHuman(drawSecondKey, [drawSecondKey])).toBe(genericDrawSecondLabel);
    expect(explainKeyHuman(drawSecondKey, [drawSecondKey, createTokenKey])).toMatch(tokenBridgeLabelRegex);

    const cards = buildCardsFromLiterals([
      {
        name: "Improbable Alliance",
        oracle_text:
          "Whenever you draw your second card each turn, create a 1/1 blue Faerie creature token with flying.",
      },
      {
        name: "Jolrael, Mwonvuli Recluse",
        oracle_text:
          "Whenever you draw your second card each turn, create a 2/2 green Cat creature token.",
      },
      {
        name: "Faerie Vandal",
        oracle_text:
          "Whenever you draw your second card each turn, put a +1/+1 counter on Faerie Vandal.",
      },
      {
        name: "Irencrag Pyromancer",
        oracle_text:
          "Whenever you draw your second card each turn, Irencrag Pyromancer deals 3 damage to any target.",
      },
    ]);

    const edges = buildSemanticEdges(cards, { includeLocalOnly: true });
    const allianceLabels = visibleReasonLabelsForCard(edges, 1);
    const jolraelLabels = visibleReasonLabelsForCard(edges, 2);
    const vandalLabels = visibleReasonLabelsForCard(edges, 3);
    const pyromancerLabels = visibleReasonLabelsForCard(edges, 4);

    expect(allianceLabels.some((label) => tokenBridgeLabelRegex.test(label))).toBe(true);
    expect(jolraelLabels.some((label) => tokenBridgeLabelRegex.test(label))).toBe(true);
    expect(allianceLabels).not.toContain(genericDrawSecondLabel);
    expect(jolraelLabels).not.toContain(genericDrawSecondLabel);

    expect(vandalLabels.some((label) => tokenBridgeLabelRegex.test(label))).toBe(false);
    expect(pyromancerLabels.some((label) => tokenBridgeLabelRegex.test(label))).toBe(false);
  });
});
