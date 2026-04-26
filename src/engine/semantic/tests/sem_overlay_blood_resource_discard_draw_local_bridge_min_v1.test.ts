import { describe, expect, it } from "vitest";
import { ActionId, ResourceId } from "../contract";
import { normalizeOracleTextV1 } from "../normalize";
import { buildSemanticEdges } from "../overlay/sem_edges";
import { KeyKind, keyOf } from "../overlay/sem_profile";
import { parseSemanticIrV0 } from "../parser/sem_parser_v1";

type CardInput = {
  card_id: number;
  ir: ReturnType<typeof parseSemanticIrV0>;
  oracle_text: string;
};

function buildCardsFromLiterals(rows: Array<{ name: string; oracle_text: string }>): CardInput[] {
  return rows.map((row, index) => {
    const card_id = index + 1;
    const oracleText = normalizeOracleTextV1(row.oracle_text);
    const parseInput = {
      card_id,
      name: row.name,
      oracle_text: oracleText,
      type_line: null,
    };
    const ir = parseSemanticIrV0(
      parseInput as { name: string; oracle_text: string; type_line?: string | null },
    );
    ir.card_id = card_id;
    return { card_id, ir, oracle_text: oracleText };
  });
}

function findBloodDiscardDrawLocalBridgeEdge(
  edges: ReturnType<typeof buildSemanticEdges>,
  cardId: number,
) {
  const bloodKey = keyOf(KeyKind.RESOURCE, ResourceId.BLOOD);
  const discardKey = keyOf(KeyKind.ACTION, ActionId.DISCARD_CARDS);
  const drawKey = keyOf(KeyKind.ACTION, ActionId.DRAW_CARDS);
  return edges.find(
    (edge) =>
      edge.local_only &&
      edge.from === cardId &&
      edge.to === cardId &&
      edge.reasons.some((reason) => reason.key === bloodKey) &&
      edge.reasons.some((reason) => reason.key === discardKey) &&
      edge.reasons.some((reason) => reason.key === drawKey),
  );
}

describe("semantic overlay blood resource discard draw local bridge min v1", () => {
  it("emits strict local self-edge for narrow Blood discard+draw activation wording", () => {
    const bloodKey = keyOf(KeyKind.RESOURCE, ResourceId.BLOOD);
    const discardKey = keyOf(KeyKind.ACTION, ActionId.DISCARD_CARDS);
    const drawKey = keyOf(KeyKind.ACTION, ActionId.DRAW_CARDS);
    const expectedReasonKeys = [bloodKey, discardKey, drawKey].sort((a, b) => a - b);

    const positives = buildCardsFromLiterals([
      {
        name: "Blood Token Ability",
        oracle_text: "{1}, {T}, Discard a card, Sacrifice this artifact: Draw a card.",
      },
      {
        name: "Sac Blood Discard Draw",
        oracle_text: "Sacrifice a Blood, discard a card: Draw a card.",
      },
      {
        name: "Sac Blood Then Draw",
        oracle_text: "Sacrifice a Blood: Discard a card, then draw a card.",
      },
      {
        name: "Sac Blood Token Then Draw",
        oracle_text: "Sacrifice a Blood token: Discard a card, then draw a card.",
      },
    ]);

    const edges = buildSemanticEdges(positives, { includeLocalOnly: true });

    for (const card of positives) {
      const edge = findBloodDiscardDrawLocalBridgeEdge(edges, card.card_id);
      expect(edge).toBeTruthy();
      expect(edge?.local_only).toBe(true);
      expect(edge?.from).toBe(card.card_id);
      expect(edge?.to).toBe(card.card_id);
      expect(edge?.score).toBe(0);
      expect(edge?.reasons.map((reason) => reason.key)).toEqual(expectedReasonKeys);
    }
  });

  it("does not emit bridge outside narrow Blood discard+draw scope", () => {
    const negatives = buildCardsFromLiterals([
      {
        name: "Generic Discard Draw",
        oracle_text: "Discard a card: Draw a card.",
      },
      {
        name: "Additional Cost Discard Draw",
        oracle_text: "As an additional cost to cast this spell, discard a card. Draw two cards.",
      },
      {
        name: "Sac Artifact Draw",
        oracle_text: "Sacrifice this artifact: Draw a card.",
      },
      {
        name: "Sac Creature Draw",
        oracle_text: "Sacrifice a creature: Draw a card.",
      },
      {
        name: "Sac Food Gain",
        oracle_text: "Sacrifice a Food: You gain 3 life.",
      },
      {
        name: "Sac Clue Draw",
        oracle_text: "Sacrifice a Clue: Draw a card.",
      },
      {
        name: "Create Blood",
        oracle_text: "Create a Blood token.",
      },
      {
        name: "Whenever Sac Blood Draw",
        oracle_text: "Whenever you sacrifice a Blood, draw a card.",
      },
      {
        name: "Attack Discard Draw",
        oracle_text: "Whenever this creature attacks, discard a card, then draw a card.",
      },
      {
        name: "Token Etb Draw",
        oracle_text: "Create a 1/1 white Soldier creature token. When it enters the battlefield, draw a card.",
      },
    ]);

    const edges = buildSemanticEdges(negatives, { includeLocalOnly: true });

    for (const card of negatives) {
      const edge = findBloodDiscardDrawLocalBridgeEdge(edges, card.card_id);
      expect(edge).toBeUndefined();
    }
  });
});
