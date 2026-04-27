import { describe, expect, it } from "vitest";
import { ActionId, EventId } from "../contract";
import { normalizeOracleTextV1 } from "../normalize";
import { buildSemanticEdges } from "../overlay/sem_edges";
import { computeSemanticOverlayFromDeckEntries } from "../overlay/sem_overlay_compute";
import { KeyKind, keyOf } from "../overlay/sem_profile";
import { parseSemanticIrV0 } from "../parser/sem_parser_v1";

type DeckCard = {
  name: string;
  name_norm: string;
  type_line: string;
  oracle_text: string;
  cmc: number;
};

type ParsedCard = {
  card_id: number;
  ir: ReturnType<typeof parseSemanticIrV0>;
  oracle_text: string;
};

const MINI_CORPUS: DeckCard[] = [
  {
    name: "Village Rites",
    name_norm: "village rites",
    type_line: "Instant",
    oracle_text: "As an additional cost to cast this spell, sacrifice a creature.\nDraw two cards.",
    cmc: 1,
  },
  {
    name: "Deadly Dispute",
    name_norm: "deadly dispute",
    type_line: "Instant",
    oracle_text:
      "As an additional cost to cast this spell, sacrifice an artifact or creature.\nDraw two cards and create a Treasure token.",
    cmc: 2,
  },
  {
    name: "Costly Plunder",
    name_norm: "costly plunder",
    type_line: "Instant",
    oracle_text:
      "As an additional cost to cast this spell, sacrifice an artifact or creature.\nDraw two cards.",
    cmc: 2,
  },
];

const SACRIFICE_KEY = keyOf(KeyKind.EVENT, EventId.SACRIFICE);
const DRAW_CARDS_KEY = keyOf(KeyKind.ACTION, ActionId.DRAW_CARDS);
const EXPECTED_REASON_KEYS = [SACRIFICE_KEY, DRAW_CARDS_KEY].sort((a, b) => a - b);

function toParsedCards(cards: DeckCard[]): ParsedCard[] {
  return cards.map((card, index) => {
    const card_id = index + 1;
    const oracle_text = normalizeOracleTextV1(card.oracle_text);
    const parseInput = {
      card_id,
      name: card.name,
      oracle_text,
      type_line: card.type_line,
    };
    const ir = parseSemanticIrV0(
      parseInput as { name: string; oracle_text: string; type_line?: string | null },
    );
    ir.card_id = card_id;
    return { card_id, ir, oracle_text };
  });
}

function isSacrificeDrawLocalSelfEdge(
  edge: ReturnType<typeof buildSemanticEdges>[number],
): boolean {
  return (
    edge.local_only === true &&
    edge.from === edge.to &&
    edge.score === 0 &&
    edge.reasons.some((reason) => reason.key === SACRIFICE_KEY) &&
    edge.reasons.some((reason) => reason.key === DRAW_CARDS_KEY)
  );
}

describe("semantic overlay local self-edges diagnostic lock min v1", () => {
  it("keeps sacrifice-as-cost draw-cards self-edges local, zero-score, and visible in edgesTop", async () => {
    const parsedCards = toParsedCards(MINI_CORPUS);

    // A) buildSemanticEdges over parsed cards
    const edges = buildSemanticEdges(parsedCards, { includeLocalOnly: true });

    const cardNamesById = new Map(MINI_CORPUS.map((card, index) => [index + 1, card.name]));
    const localSelfEdges = edges.filter(isSacrificeDrawLocalSelfEdge);
    const namesWithEdge = localSelfEdges
      .map((edge) => cardNamesById.get(edge.from) ?? "")
      .filter((name) => name.length > 0)
      .sort((a, b) => a.localeCompare(b));

    expect(namesWithEdge).toEqual(["Costly Plunder", "Deadly Dispute", "Village Rites"]);

    for (const edge of localSelfEdges) {
      expect(edge.local_only).toBe(true);
      expect(edge.from).toBe(edge.to);
      expect(edge.score).toBe(0);
      expect(edge.reasons.map((reason) => reason.key)).toEqual(EXPECTED_REASON_KEYS);
    }

    // B) runtime overlay computeSemanticOverlayFromDeckEntries
    const byName = new Map(MINI_CORPUS.map((card) => [card.name, card]));
    const entries = MINI_CORPUS.map((card) => ({ name: card.name }));
    const lookupLocal = async (name: string) => {
      const card = byName.get(name);
      if (!card) return null;
      return {
        name: card.name,
        name_norm: card.name_norm,
        type_line: card.type_line,
        oracle_text: card.oracle_text,
      };
    };

    const runtime = await computeSemanticOverlayFromDeckEntries(entries, lookupLocal);

    const runtimeLocalSelfEdges = runtime.edgesTop.filter(isSacrificeDrawLocalSelfEdge);
    const runtimeNamesWithEdge = runtimeLocalSelfEdges
      .map((edge) => runtime.idToName[edge.from] ?? "")
      .filter((name) => name.length > 0)
      .sort((a, b) => a.localeCompare(b));

    expect(runtimeNamesWithEdge).toEqual(["Costly Plunder", "Deadly Dispute", "Village Rites"]);

    for (const edge of runtimeLocalSelfEdges) {
      expect(edge.local_only).toBe(true);
      expect(edge.from).toBe(edge.to);
      expect(edge.score).toBe(0);
      expect(edge.reasons.map((reason) => reason.key)).toEqual(EXPECTED_REASON_KEYS);
    }

    expect(runtime.metrics.card_count).toBe(3);
    expect(runtime.metrics.covered_count).toBe(3);
    expect(runtime.metrics.total_edge_score).toBe(0);
    expect(runtime.metrics.SOS).toBe(0);
  });
});
