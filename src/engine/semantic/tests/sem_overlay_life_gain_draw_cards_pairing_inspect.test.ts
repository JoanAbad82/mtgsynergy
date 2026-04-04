import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { normalizeCardName } from "../../cards/normalize";
import type { CardRecordMin } from "../../cards/types";
import { ActionId, EventId } from "../contract";
import { normalizeOracleTextV1 } from "../normalize";
import { buildSemanticEdges } from "../overlay/sem_edges";
import { buildSemanticCardProfile, KeyKind, keyOf, explainKey } from "../overlay/sem_profile";
import { parseSemanticIrV0 } from "../parser/sem_parser_v1";

type CardsIndexPayload = {
  by_name?: Record<string, { oracle_text?: string | null; type_line?: string | null }>;
  by_name_norm?: Record<string, string>;
};

type CardInput = {
  card_id: number;
  name: string;
  ir: ReturnType<typeof parseSemanticIrV0>;
  oracle_text: string;
};

const here = dirname(fileURLToPath(import.meta.url));
const cardsIndexPath = join(here, "../../../../public/data/cards_index.json.gz");

const deckList: Array<{ name: string; count: number }> = [
  { name: "Drogskol Reaver", count: 4 },
];

function loadCardsIndex(): CardsIndexPayload {
  const gz = readFileSync(cardsIndexPath);
  const json = gunzipSync(gz).toString("utf8");
  return JSON.parse(json) as CardsIndexPayload;
}

function findCanonicalName(payload: CardsIndexPayload, name: string): string | null {
  const byName = payload.by_name ?? {};
  const byNameNorm = payload.by_name_norm ?? {};
  if (byName[name]) return name;
  const norm = normalizeCardName(name);
  const canonical = byNameNorm[norm];
  if (canonical && byName[canonical]) return canonical;
  if (!name.includes("//")) {
    const prefix = `${norm} //`;
    const matches = Object.entries(byNameNorm)
      .filter(([key]) => key.startsWith(prefix))
      .map(([, value]) => value)
      .filter((value) => value && byName[value]);
    if (matches.length === 1) return matches[0];
  }
  return null;
}

function createLocalLookup(payload: CardsIndexPayload) {
  return async (name: string): Promise<CardRecordMin | null> => {
    const canonical = findCanonicalName(payload, name);
    if (!canonical) return null;
    const record = payload.by_name?.[canonical];
    if (!record) return null;
    return {
      name: canonical,
      name_norm: normalizeCardName(canonical),
      type_line: record.type_line ?? null,
      oracle_text: record.oracle_text ?? null,
    };
  };
}

function buildDeckEntries(): Array<{ name: string }> {
  return deckList.flatMap((entry) =>
    Array.from({ length: entry.count }, () => ({ name: entry.name })),
  );
}

async function buildCardsFromDeck(
  entries: Array<{ name: string }>,
  lookup: ReturnType<typeof createLocalLookup>,
) {
  const uniqueNames = Array.from(new Set(entries.map((entry) => entry.name)));
  const resolved = await Promise.all(
    uniqueNames.map(async (name) => {
      const card = await lookup(name);
      if (!card || !card.oracle_text) return null;
      return {
        name: card.name,
        name_norm: card.name_norm ?? normalizeCardName(card.name),
        oracle_text: card.oracle_text,
        type_line: card.type_line ?? null,
      };
    }),
  );

  const found = resolved.filter(
    (card): card is NonNullable<typeof card> => !!card,
  );
  const byNorm = new Map<string, (typeof found)[number]>();
  for (const card of found) {
    if (!byNorm.has(card.name_norm)) {
      byNorm.set(card.name_norm, card);
    }
  }

  const ordered = Array.from(byNorm.values()).sort((a, b) =>
    a.name_norm.localeCompare(b.name_norm),
  );

  return ordered.map((card, index) => {
    const oracleText = normalizeOracleTextV1(card.oracle_text ?? "");
    const ir = parseSemanticIrV0({
      name: card.name,
      oracle_text: oracleText,
      type_line: card.type_line ?? null,
    });
    const card_id = index + 1;
    ir.card_id = card_id;
    return { card_id, name: card.name, ir, oracle_text: oracleText } satisfies CardInput;
  });
}

function profileOf(card: CardInput) {
  return buildSemanticCardProfile(card.ir, card.oracle_text);
}

function hasEdgeReason(
  edges: Array<{ reasons: Array<{ key: number }> }>,
  key: number,
): boolean {
  return edges.some((edge) => edge.reasons.some((reason) => reason.key === key));
}

describe("semantic overlay life gain draw cards pairing inspect post-bridge", () => {
  it("shows raw-key pairing is insufficient and local bridge inserts honest LIFE_GAIN -> DRAW_CARDS closure", async () => {
    const payload = loadCardsIndex();
    const lookup = createLocalLookup(payload);
    const entries = buildDeckEntries();
    const cards = await buildCardsFromDeck(entries, lookup);
    const edges = buildSemanticEdges(cards);

    const lifeGainEventKey = keyOf(KeyKind.EVENT, EventId.LIFE_GAIN);
    const gainLifeActionKey = keyOf(KeyKind.ACTION, ActionId.GAIN_LIFE);
    const drawCardsKey = keyOf(KeyKind.ACTION, ActionId.DRAW_CARDS);

    const lifeGainListeners = cards
      .filter((card) => profileOf(card).consumed.has(lifeGainEventKey))
      .map((card) => card.name)
      .sort();

    const lifeGainEventProducers = cards
      .filter((card) => profileOf(card).produced.has(lifeGainEventKey))
      .map((card) => card.name)
      .sort();

    const gainLifeActionProducers = cards
      .filter((card) => profileOf(card).produced.has(gainLifeActionKey))
      .map((card) => card.name)
      .sort();

    const drawCardsProducers = cards
      .filter((card) => profileOf(card).produced.has(drawCardsKey))
      .map((card) => card.name)
      .sort();

    const pairingCandidates = lifeGainListeners.flatMap((listener) =>
      drawCardsProducers.map((producer) => ({ listener, producer })),
    );

    const pairedByKey = pairingCandidates.filter(({ producer }) =>
      profileOf(cards.find((card) => card.name === producer)!).produced.has(lifeGainEventKey),
    );

    const hasLifeGainEdge = hasEdgeReason(edges, lifeGainEventKey);
    const hasDrawCardsEdge = hasEdgeReason(edges, drawCardsKey);
    const hasLifeGainDrawCardsLocalEdge = edges.some(
      (edge) =>
        edge.local_only &&
        edge.reasons.some((reason) => reason.key === lifeGainEventKey) &&
        edge.reasons.some((reason) => reason.key === drawCardsKey),
    );

    console.log("LIFE_GAIN -> DRAW_CARDS pairing inspection (post-bridge, raw-key view):", {
      life_gain_listener_cards: lifeGainListeners,
      life_gain_event_producer_cards: lifeGainEventProducers,
      gain_life_action_producer_cards: gainLifeActionProducers,
      draw_cards_producer_cards: drawCardsProducers,
      pairing_candidates_count: pairingCandidates.length,
      paired_by_key_count: pairedByKey.length,
      has_life_gain_edge: hasLifeGainEdge,
      has_draw_cards_edge: hasDrawCardsEdge,
      has_life_gain_draw_cards_local_edge: hasLifeGainDrawCardsLocalEdge,
      key_summary: {
        life_gain_event: explainKey(lifeGainEventKey),
        gain_life_action: explainKey(gainLifeActionKey),
        draw_cards: explainKey(drawCardsKey),
      },
    });

    expect(lifeGainListeners.length).toBeGreaterThan(0);
    expect(drawCardsProducers.length).toBeGreaterThan(0);
    expect(pairingCandidates.length).toBeGreaterThan(0);
    expect(pairedByKey.length).toBe(0);
    expect(hasLifeGainEdge).toBe(true);
    expect(hasDrawCardsEdge).toBe(true);
    expect(hasLifeGainDrawCardsLocalEdge).toBe(true);
  });
});
