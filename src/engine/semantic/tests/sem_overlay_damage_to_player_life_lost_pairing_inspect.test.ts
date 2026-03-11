import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { normalizeCardName } from "../../cards/normalize";
import type { CardRecordMin } from "../../cards/types";
import { normalizeOracleTextV1 } from "../normalize";
import { parseSemanticIrV0 } from "../parser/sem_parser_v1";
import { ActionId } from "../contract";
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
  { name: "Shock", count: 4 },
  { name: "Play with Fire", count: 4 },
  { name: "Lightning Strike", count: 4 },
  { name: "Vampire's Kiss", count: 4 },
  { name: "Epicure of Blood", count: 4 },
  { name: "Marauding Blight-Priest", count: 4 },
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

describe("semantic overlay damage to player life lost pairing inspect", () => {
  it("identifies why DEAL_DAMAGE does not pair with LOSE_LIFE producers", async () => {
    const payload = loadCardsIndex();
    const lookup = createLocalLookup(payload);
    const entries = buildDeckEntries();
    const cards = await buildCardsFromDeck(entries, lookup);
    const edges = buildSemanticEdges(cards);

    const dealDamageKey = keyOf(KeyKind.ACTION, ActionId.DEAL_DAMAGE);
    const loseLifeKey = keyOf(KeyKind.ACTION, ActionId.LOSE_LIFE);

    const damageProducers = cards
      .filter((card) => profileOf(card).produced.has(dealDamageKey))
      .map((card) => card.name)
      .sort();

    const loseLifeProducers = cards
      .filter((card) => profileOf(card).produced.has(loseLifeKey))
      .map((card) => card.name)
      .sort();

    const loseLifeConsumers = cards
      .filter((card) => profileOf(card).consumed.has(loseLifeKey))
      .map((card) => card.name)
      .sort();

    const pairingCandidates = damageProducers.flatMap((producer) =>
      loseLifeProducers.map((lifeLossProducer) => ({ producer, lifeLossProducer })),
    );

    const pairedByKey = pairingCandidates.filter(({ producer }) =>
      profileOf(cards.find((card) => card.name === producer)!).produced.has(loseLifeKey),
    );

    const hasDealDamageEdge = hasEdgeReason(edges, dealDamageKey);
    const hasLoseLifeEdge = hasEdgeReason(edges, loseLifeKey);

    console.log("DEAL_DAMAGE -> LOSE_LIFE pairing inspection:", {
      deal_damage_producer_cards: damageProducers,
      lose_life_producer_cards: loseLifeProducers,
      lose_life_consumer_cards: loseLifeConsumers,
      pairing_candidates_count: pairingCandidates.length,
      paired_by_key_count: pairedByKey.length,
      has_deal_damage_edge: hasDealDamageEdge,
      has_lose_life_edge: hasLoseLifeEdge,
      key_summary: {
        deal_damage: explainKey(dealDamageKey),
        lose_life: explainKey(loseLifeKey),
      },
    });

    expect(damageProducers.length).toBeGreaterThan(0);
    expect(loseLifeProducers.length).toBeGreaterThan(0);
    expect(pairedByKey.length).toBe(0);
  });
});
