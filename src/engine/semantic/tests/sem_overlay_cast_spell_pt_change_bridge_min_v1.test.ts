import { describe, expect, it } from "vitest";
import { ActionId, EventId } from "../contract";
import { normalizeOracleTextV1 } from "../normalize";
import { buildSemanticEdges } from "../overlay/sem_edges";
import { buildSemanticCardProfile, KeyKind, keyOf } from "../overlay/sem_profile";
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

function findCastPtChangeLocalBridgeEdge(edges: ReturnType<typeof buildSemanticEdges>, cardId: number) {
  const castSpellKey = keyOf(KeyKind.EVENT, EventId.CAST_SPELL);
  const ptChangeKey = keyOf(KeyKind.ACTION, ActionId.PT_CHANGE);
  return edges.find(
    (edge) =>
      edge.local_only &&
      edge.from === cardId &&
      edge.to === cardId &&
      edge.reasons.some((reason) => reason.key === castSpellKey) &&
      edge.reasons.some((reason) => reason.key === ptChangeKey),
  );
}

describe("semantic overlay cast spell pt change bridge min v1", () => {
  it("emits strict local self-edge only for explicit cast-spell pump wording with PT_CHANGE", () => {
    const castSpellKey = keyOf(KeyKind.EVENT, EventId.CAST_SPELL);
    const ptChangeKey = keyOf(KeyKind.ACTION, ActionId.PT_CHANGE);
    const expectedReasonKeys = [castSpellKey, ptChangeKey].sort((a, b) => a - b);

    const positives = buildCardsFromLiterals([
      {
        name: "Kiln Fiend",
        oracle_text:
          "Whenever you cast an instant or sorcery spell, Kiln Fiend gets +3/+0 until end of turn.",
      },
      {
        name: "Festival Crasher",
        oracle_text:
          "Whenever you cast an instant or sorcery spell, Festival Crasher gets +2/+0 until end of turn.",
      },
      {
        name: "Nivix Cyclops",
        oracle_text:
          "Whenever you cast an instant or sorcery spell, Nivix Cyclops gets +3/+0 until end of turn.",
      },
      {
        name: "Noncreature Pump",
        oracle_text:
          "Whenever you cast a noncreature spell, this creature gets +1/+1 until end of turn.",
      },
    ]);

    const positiveEdges = buildSemanticEdges(positives, { includeLocalOnly: true });
    for (const card of positives) {
      const profile = buildSemanticCardProfile(card.ir, card.oracle_text);
      expect(profile.consumed.has(castSpellKey)).toBe(true);
      expect(profile.produced.has(ptChangeKey)).toBe(true);
      const edge = findCastPtChangeLocalBridgeEdge(positiveEdges, card.card_id);
      expect(edge).toBeTruthy();
      expect(edge?.local_only).toBe(true);
      expect(edge?.score).toBe(0);
      expect(edge?.reasons.map((reason) => reason.key)).toEqual(expectedReasonKeys);
    }

    const negatives = [
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
        name: "Firebrand Archer",
        oracle_text:
          "Whenever you cast a noncreature spell, Firebrand Archer deals 1 damage to each opponent.",
      },
      {
        name: "Draw Only",
        oracle_text: "Draw a card.",
      },
      {
        name: "Cast Draw Only",
        oracle_text: "Whenever you cast a noncreature spell, draw a card.",
      },
    ];

    for (const row of negatives) {
      const cards = buildCardsFromLiterals([row]);
      const edges = buildSemanticEdges(cards, { includeLocalOnly: true });
      const edge = findCastPtChangeLocalBridgeEdge(edges, 1);
      expect(edge).toBeUndefined();
    }
  });
});
