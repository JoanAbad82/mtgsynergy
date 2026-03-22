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

function findCastCreateTokenLocalBridgeEdge(
  edges: ReturnType<typeof buildSemanticEdges>,
  cardId: number,
) {
  const castSpellKey = keyOf(KeyKind.EVENT, EventId.CAST_SPELL);
  const createTokenKey = keyOf(KeyKind.ACTION, ActionId.CREATE_TOKEN);
  return edges.find(
    (edge) =>
      edge.local_only &&
      edge.from === cardId &&
      edge.to === cardId &&
      edge.reasons.some((reason) => reason.key === castSpellKey) &&
      edge.reasons.some((reason) => reason.key === createTokenKey),
  );
}

function findCastDamageLocalBridgeEdge(edges: ReturnType<typeof buildSemanticEdges>, cardId: number) {
  const castSpellKey = keyOf(KeyKind.EVENT, EventId.CAST_SPELL);
  const dealDamageKey = keyOf(KeyKind.ACTION, ActionId.DEAL_DAMAGE);
  return edges.find(
    (edge) =>
      edge.local_only &&
      edge.from === cardId &&
      edge.to === cardId &&
      edge.reasons.some((reason) => reason.key === castSpellKey) &&
      edge.reasons.some((reason) => reason.key === dealDamageKey),
  );
}

describe("semantic overlay cast spell create token local bridge min v1", () => {
  it("emits strict local self-edge for explicit cast-spell token engines and rejects non-token payoffs", () => {
    const castSpellKey = keyOf(KeyKind.EVENT, EventId.CAST_SPELL);
    const createTokenKey = keyOf(KeyKind.ACTION, ActionId.CREATE_TOKEN);
    const expectedReasonKeys = [castSpellKey, createTokenKey].sort((a, b) => a - b);

    const positives = buildCardsFromLiterals([
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
        name: "Monastery Mentor",
        oracle_text:
          "Whenever you cast a noncreature spell, create a 1/1 white Monk creature token with prowess.",
      },
    ]);

    const positiveEdges = buildSemanticEdges(positives, { includeLocalOnly: true });
    for (const card of positives) {
      const profile = buildSemanticCardProfile(card.ir, card.oracle_text);
      expect(profile.consumed.has(castSpellKey)).toBe(true);
      expect(profile.produced.has(createTokenKey)).toBe(true);
    }

    for (const card of positives) {
      const edge = findCastCreateTokenLocalBridgeEdge(positiveEdges, card.card_id);
      expect(edge).toBeTruthy();
      expect(edge?.local_only).toBe(true);
      expect(edge?.score).toBe(0);
      expect(edge?.reasons.map((reason) => reason.key)).toEqual(expectedReasonKeys);
    }

    // Guardrail absorbed in v58 lineage: Iconoclast remains token engine, not cast-damage payoff.
    const iconoclastDamageEdge = findCastDamageLocalBridgeEdge(positiveEdges, 2);
    expect(iconoclastDamageEdge).toBeUndefined();

    const negatives = [
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
        name: "Kiln Fiend",
        oracle_text:
          "Whenever you cast an instant or sorcery spell, Kiln Fiend gets +3/+0 until end of turn.",
      },
    ];

    for (const row of negatives) {
      const cards = buildCardsFromLiterals([row]);
      const edges = buildSemanticEdges(cards, { includeLocalOnly: true });
      const edge = findCastCreateTokenLocalBridgeEdge(edges, 1);
      expect(edge).toBeUndefined();
    }
  });
});
