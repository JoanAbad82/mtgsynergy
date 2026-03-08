import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { normalizeCardName } from "../../cards/normalize";
import type { CardRecordMin } from "../../cards/types";
import { normalizeOracleTextV1 } from "../normalize";
import { parseSemanticIrV0 } from "../parser/sem_parser_v1";
import { ActionId, EventId } from "../contract";
import { buildSemanticEdges } from "../overlay/sem_edges";
import { buildSemanticCardProfile, KeyKind, keyOf, explainKey } from "../overlay/sem_profile";

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
  { name: "Shambling Ghast", count: 4 },
  { name: "Persistent Specimen", count: 4 },
  { name: "Blood Artist", count: 4 },
  { name: "Goblin Bombardment", count: 4 },
  { name: "Village Rites", count: 4 },
  { name: "Deadly Dispute", count: 4 },
  { name: "Experimental Synthesizer", count: 4 },
  { name: "Oni-Cult Anvil", count: 4 },
  { name: "Howling Mine", count: 4 },
  { name: "Darksteel Ingot", count: 4 },
  { name: "Swamp", count: 10 },
  { name: "Mountain", count: 10 },
  { name: "Bloodfell Caves", count: 4 },
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

async function buildCardsFromDeck(entries: Array<{ name: string }>, lookup: (name: string) => Promise<CardRecordMin | null>) {
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

function hasEdgeReason(edges: Array<{ reasons: Array<{ key: number }> }>, key: number): boolean {
  return edges.some((edge) => edge.reasons.some((reason) => reason.key === key));
}

describe("semantic overlay creature dies pairing inspect", () => {
  it("identifies why CREATURE_DIES does not pair with payoff producers", async () => {
    const payload = loadCardsIndex();
    const lookup = createLocalLookup(payload);
    const entries = buildDeckEntries();
    const cards = await buildCardsFromDeck(entries, lookup);
    const edges = buildSemanticEdges(cards);

    const diesKey = keyOf(KeyKind.EVENT, EventId.CREATURE_DIES);
    const loseLifeKey = keyOf(KeyKind.ACTION, ActionId.LOSE_LIFE);
    const dealDamageKey = keyOf(KeyKind.ACTION, ActionId.DEAL_DAMAGE);
    const gainLifeKey = keyOf(KeyKind.ACTION, ActionId.GAIN_LIFE);

    const diesConsumers = cards
      .map((card) => ({ card, profile: profileOf(card) }))
      .filter(({ profile }) => profile.consumed.has(diesKey))
      .map(({ card }) => card.name)
      .sort();

    const diesProducers = cards
      .map((card) => ({ card, profile: profileOf(card) }))
      .filter(({ profile }) => profile.produced.has(diesKey))
      .map(({ card }) => card.name)
      .sort();

    const payoffProducers = {
      LOSE_LIFE: cards
        .filter((card) => profileOf(card).produced.has(loseLifeKey))
        .map((card) => card.name)
        .sort(),
      DEAL_DAMAGE: cards
        .filter((card) => profileOf(card).produced.has(dealDamageKey))
        .map((card) => card.name)
        .sort(),
      GAIN_LIFE: cards
        .filter((card) => profileOf(card).produced.has(gainLifeKey))
        .map((card) => card.name)
        .sort(),
    };

    const hasDiesEdge = hasEdgeReason(edges, diesKey);
    const hasLoseLifeEdge = hasEdgeReason(edges, loseLifeKey);
    const hasDealDamageEdge = hasEdgeReason(edges, dealDamageKey);
    const hasGainLifeEdge = hasEdgeReason(edges, gainLifeKey);

    const pairingCandidates = diesConsumers.flatMap((consumer) =>
      [
        ...payoffProducers.LOSE_LIFE,
        ...payoffProducers.DEAL_DAMAGE,
        ...payoffProducers.GAIN_LIFE,
      ].map((producer) => ({ consumer, producer })),
    );

    const pairedByKey = pairingCandidates.filter(({ producer }) =>
      profileOf(cards.find((card) => card.name === producer)!).produced.has(diesKey),
    );

    console.log("CREATURE_DIES pairing inspection:", {
      dies_consumer_cards: diesConsumers,
      dies_producer_cards: diesProducers,
      payoff_producer_cards: payoffProducers,
      pairing_candidates_count: pairingCandidates.length,
      paired_by_key_count: pairedByKey.length,
      has_dies_edge: hasDiesEdge,
      payoff_edges: {
        LOSE_LIFE: hasLoseLifeEdge,
        DEAL_DAMAGE: hasDealDamageEdge,
        GAIN_LIFE: hasGainLifeEdge,
      },
      key_summary: {
        dies: explainKey(diesKey),
        lose_life: explainKey(loseLifeKey),
        deal_damage: explainKey(dealDamageKey),
        gain_life: explainKey(gainLifeKey),
      },
    });

    expect(diesConsumers.length).toBeGreaterThan(0);
    expect(Object.values(payoffProducers).some((list) => list.length > 0)).toBe(true);
    expect(pairedByKey.length).toBe(0);
    expect(hasDiesEdge).toBe(false);
  });
});
