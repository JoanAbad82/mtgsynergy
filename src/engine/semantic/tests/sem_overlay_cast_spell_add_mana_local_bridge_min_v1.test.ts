import { describe, expect, it } from "vitest";
import { ActionId, EventId } from "../contract";
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
    const oracleText = normalizeOracleTextV1(row.oracle_text);
    const ir = parseSemanticIrV0({ name: row.name, oracle_text: oracleText, type_line: null });
    const card_id = index + 1;
    ir.card_id = card_id;
    return { card_id, ir, oracle_text: oracleText };
  });
}

function findCastAddManaLocalBridgeEdge(
  edges: ReturnType<typeof buildSemanticEdges>,
  cardId: number,
) {
  const castSpellKey = keyOf(KeyKind.EVENT, EventId.CAST_SPELL);
  const addManaKey = keyOf(KeyKind.ACTION, ActionId.PRODUCE_MANA);
  return edges.find(
    (edge) =>
      edge.local_only &&
      edge.from === cardId &&
      edge.to === cardId &&
      edge.reasons.some((reason) => reason.key === castSpellKey) &&
      edge.reasons.some((reason) => reason.key === addManaKey),
  );
}

describe("semantic overlay cast spell add mana local bridge min v1", () => {
  it("emits strict local self-edge for explicit cast-spell plus add-mana wording and rejects adjacent families", () => {
    const castSpellKey = keyOf(KeyKind.EVENT, EventId.CAST_SPELL);
    const addManaKey = keyOf(KeyKind.ACTION, ActionId.PRODUCE_MANA);
    const expectedReasonKeys = [castSpellKey, addManaKey].sort((a, b) => a - b);

    const positives = buildCardsFromLiterals([
      {
        name: "Birgi, God of Storytelling",
        oracle_text:
          "Whenever you cast a spell, add {R}. Until end of turn, you don't lose this mana as steps and phases end.",
      },
      {
        name: "Urabrask",
        oracle_text:
          "Whenever you cast an instant or sorcery spell, add {R}.",
      },
      {
        name: "Noncreature Add Mana",
        oracle_text:
          "Whenever you cast a noncreature spell, add one mana of any color.",
      },
    ]);

    const positiveEdges = buildSemanticEdges(positives, { includeLocalOnly: true });
    for (const card of positives) {
      const edge = findCastAddManaLocalBridgeEdge(positiveEdges, card.card_id);
      expect(edge).toBeTruthy();
      expect(edge?.local_only).toBe(true);
      expect(edge?.score).toBe(0);
      expect(edge?.reasons.map((reason) => reason.key)).toEqual(expectedReasonKeys);
    }

    const negatives = buildCardsFromLiterals([
      {
        name: "Young Pyromancer",
        oracle_text:
          "Whenever you cast an instant or sorcery spell, create a 1/1 red Elemental creature token.",
      },
      {
        name: "Third Path Iconoclast",
        oracle_text:
          "Whenever you cast a noncreature spell, create a 1/1 colorless Soldier artifact creature token.",
      },
      {
        name: "Guttersnipe",
        oracle_text:
          "Whenever you cast an instant or sorcery spell, Guttersnipe deals 2 damage to each opponent.",
      },
      {
        name: "Storm-Kiln Artist",
        oracle_text:
          "Magecraft — Whenever you cast or copy an instant or sorcery spell, create a Treasure token. (It's an artifact with \"{T}, Sacrifice this artifact: Add one mana of any color.\")",
      },
      {
        name: "Kiln Fiend",
        oracle_text:
          "Whenever you cast an instant or sorcery spell, Kiln Fiend gets +3/+0 until end of turn.",
      },
    ]);

    const negativeEdges = buildSemanticEdges(negatives, { includeLocalOnly: true });
    for (const card of negatives) {
      const edge = findCastAddManaLocalBridgeEdge(negativeEdges, card.card_id);
      expect(edge).toBeUndefined();
    }
  });
});
