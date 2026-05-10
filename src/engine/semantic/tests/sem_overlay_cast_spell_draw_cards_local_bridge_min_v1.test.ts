import { describe, expect, it } from "vitest";
import { normalizeOracleTextV1 } from "../normalize";
import { parseSemanticIrV0 } from "../parser/sem_parser_v1";
import { buildSemanticEdges } from "../overlay/sem_edges";
import { ActionId, EventId } from "../contract";
import { KeyKind, explainKeyHuman, keyOf } from "../overlay/sem_profile";

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

function findCastDrawLocalBridgeEdge(
  edges: ReturnType<typeof buildSemanticEdges>,
  cardId: number,
) {
  const castSpellKey = keyOf(KeyKind.EVENT, EventId.CAST_SPELL);
  const drawCardsKey = keyOf(KeyKind.ACTION, ActionId.DRAW_CARDS);
  return edges.find(
    (edge) =>
      edge.local_only &&
      edge.from === cardId &&
      edge.to === cardId &&
      edge.reasons.some((reason) => reason.key === castSpellKey) &&
      edge.reasons.some((reason) => reason.key === drawCardsKey),
  );
}

describe("semantic overlay cast spell draw cards local bridge min v1", () => {
  it("closes locally only for explicit cast-spell plus draw-cards wording", () => {
    const castSpellKey = keyOf(KeyKind.EVENT, EventId.CAST_SPELL);
    const drawCardsKey = keyOf(KeyKind.ACTION, ActionId.DRAW_CARDS);
    const expectedReasonKeys = [castSpellKey, drawCardsKey].sort((a, b) => a - b);

    const positiveCards = buildCardsFromLiterals([
      {
        name: "Positive",
        oracle_text: "Whenever you cast an instant or sorcery spell, draw a card.",
      },
    ]);
    const positiveEdges = buildSemanticEdges(positiveCards, { includeLocalOnly: true });
    const positiveBridgeEdge = findCastDrawLocalBridgeEdge(positiveEdges, 1);

    expect(positiveBridgeEdge).toBeTruthy();
    expect(positiveBridgeEdge?.local_only).toBe(true);
    expect(positiveBridgeEdge?.score).toBe(0);
    expect(positiveBridgeEdge?.reasons.map((reason) => reason.key)).toEqual(expectedReasonKeys);

    const drawOnlyCards = buildCardsFromLiterals([
      { name: "Draw Only", oracle_text: "Draw a card." },
    ]);
    const drawOnlyEdges = buildSemanticEdges(drawOnlyCards, { includeLocalOnly: true });
    const drawOnlyBridgeEdge = findCastDrawLocalBridgeEdge(drawOnlyEdges, 1);

    expect(drawOnlyBridgeEdge).toBeUndefined();

    const castWithoutDrawCards = buildCardsFromLiterals([
      {
        name: "Cast Without Draw",
        oracle_text: "Whenever you cast an instant or sorcery spell, this creature gets +1/+0 until end of turn.",
      },
    ]);
    const castWithoutDrawEdges = buildSemanticEdges(castWithoutDrawCards, { includeLocalOnly: true });
    const castWithoutDrawBridgeEdge = findCastDrawLocalBridgeEdge(castWithoutDrawEdges, 1);

    expect(castWithoutDrawBridgeEdge).toBeUndefined();

    const genericSpellsMatterCards = buildCardsFromLiterals([
      {
        name: "Generic Spells Matter",
        oracle_text: "Whenever you cast a noncreature spell, draw a card.",
      },
    ]);
    const genericSpellsMatterEdges = buildSemanticEdges(genericSpellsMatterCards, { includeLocalOnly: true });
    const genericSpellsMatterBridgeEdge = findCastDrawLocalBridgeEdge(genericSpellsMatterEdges, 1);

    expect(genericSpellsMatterBridgeEdge).toBeTruthy();
    expect(genericSpellsMatterBridgeEdge?.local_only).toBe(true);
    expect(genericSpellsMatterBridgeEdge?.score).toBe(0);
    expect(genericSpellsMatterBridgeEdge?.cast_spell_context).toBe("INSTANT_OR_SORCERY_OR_NONCREATURE");
    expect(genericSpellsMatterBridgeEdge?.reasons.map((reason) => reason.key)).toEqual(expectedReasonKeys);

    const creatureSpellsMatterCards = buildCardsFromLiterals([
      {
        name: "Creature Spells Matter",
        oracle_text: "Whenever you cast a creature spell, draw a card.",
      },
    ]);
    const creatureSpellsMatterEdges = buildSemanticEdges(creatureSpellsMatterCards, { includeLocalOnly: true });
    const creatureSpellsMatterBridgeEdge = findCastDrawLocalBridgeEdge(creatureSpellsMatterEdges, 1);

    expect(creatureSpellsMatterBridgeEdge).toBeTruthy();
    expect(creatureSpellsMatterBridgeEdge?.local_only).toBe(true);
    expect(creatureSpellsMatterBridgeEdge?.score).toBe(0);
    expect(creatureSpellsMatterBridgeEdge?.cast_spell_context).toBe("CREATURE_SPELL");
    expect(creatureSpellsMatterBridgeEdge?.reasons.map((reason) => reason.key)).toEqual(expectedReasonKeys);

    expect(
      explainKeyHuman(castSpellKey, expectedReasonKeys, {
        castSpellContext: creatureSpellsMatterBridgeEdge?.cast_spell_context,
      }),
    ).toContain("Lanzas un hechizo de criatura (experimental)");
    expect(
      explainKeyHuman(castSpellKey, expectedReasonKeys, {
        cast_spell_context: creatureSpellsMatterBridgeEdge?.cast_spell_context,
      }),
    ).toContain("Lanzas un hechizo de criatura (experimental)");
    expect(
      explainKeyHuman(castSpellKey, expectedReasonKeys, {
        castSpellContext: genericSpellsMatterBridgeEdge?.cast_spell_context,
      }),
    ).toContain("Lanzas instantáneo o conjuro (experimental)");
    expect(explainKeyHuman(castSpellKey, expectedReasonKeys)).toContain(
      "Lanzas instantáneo o conjuro (experimental)",
    );
  });
});
