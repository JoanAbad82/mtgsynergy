import { describe, expect, it } from "vitest";
import { ActionId, EventId } from "../semantic/contract";
import { normalizeOracleTextV1 } from "../semantic/normalize";
import { buildSemanticEdges } from "../semantic/overlay/sem_edges";
import { KeyKind, keyOf } from "../semantic/overlay/sem_profile";
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

function hasDrawSecondDamageBridge(
  edges: ReturnType<typeof buildSemanticEdges>,
  cardId: number,
  expectedReasonKeys: number[],
): boolean {
  return edges.some(
    (edge) =>
      edge.local_only &&
      edge.from === cardId &&
      edge.to === cardId &&
      expectedReasonKeys.every((key) => edge.reasons.some((reason) => reason.key === key)),
  );
}

describe("semantic draw-second to damage bridge min v1", () => {
  it("materializes local DRAW_EXTRA_CARD_TURN -> DEAL_DAMAGE only for explicit draw-second damage text", () => {
    const drawSecondKey = keyOf(KeyKind.EVENT, EventId.DRAW_EXTRA_CARD_TURN);
    const dealDamageKey = keyOf(KeyKind.ACTION, ActionId.DEAL_DAMAGE);
    const expectedReasonKeys = [drawSecondKey, dealDamageKey].sort((a, b) => a - b);

    const cards = buildCardsFromLiterals([
      {
        name: "Irencrag Pyromancer",
        oracle_text:
          "Whenever you draw your second card each turn, Irencrag Pyromancer deals 3 damage to any target.",
      },
      {
        name: "Faerie Vandal",
        oracle_text:
          "Whenever you draw your second card each turn, put a +1/+1 counter on Faerie Vandal.",
      },
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
    ]);

    const edges = buildSemanticEdges(cards, { includeLocalOnly: true });

    expect(hasDrawSecondDamageBridge(edges, 1, expectedReasonKeys)).toBe(true);
    expect(hasDrawSecondDamageBridge(edges, 2, expectedReasonKeys)).toBe(false);
    expect(hasDrawSecondDamageBridge(edges, 3, expectedReasonKeys)).toBe(false);
    expect(hasDrawSecondDamageBridge(edges, 4, expectedReasonKeys)).toBe(false);
  });
});
