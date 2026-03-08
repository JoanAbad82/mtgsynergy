import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { normalizeCardName } from "../../cards/normalize";
import type { CardRecordMin } from "../../cards/types";
import { normalizeOracleTextV1 } from "../normalize";
import { parseSemanticIrV0 } from "../parser/sem_parser_v1";
import { buildSemanticEdges } from "../overlay/sem_edges";
import { ActionId, CostId, EventId } from "../contract";
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

function collectWatchCards(cards: CardInput[], eventId: EventId): string[] {
  const names: string[] = [];
  for (const card of cards) {
    const watched = card.ir.frames.some((frame) => frame.watch.some((watch) => watch.id === eventId));
    if (watched) names.push(card.name);
  }
  return names.sort();
}

function collectCostCards(cards: CardInput[], costId: CostId): string[] {
  const names: string[] = [];
  for (const card of cards) {
    const hasCost = card.ir.frames.some((frame) => frame.cost.some((cost) => cost.cost === costId));
    if (hasCost) names.push(card.name);
  }
  return names.sort();
}

function collectProfileConsumers(cards: CardInput[], key: number): string[] {
  const names: string[] = [];
  for (const card of cards) {
    const profile = buildSemanticCardProfile(card.ir, card.oracle_text);
    if (profile.consumed.has(key)) names.push(card.name);
  }
  return names.sort();
}

function collectProfileProducers(cards: CardInput[], key: number): string[] {
  const names: string[] = [];
  for (const card of cards) {
    const profile = buildSemanticCardProfile(card.ir, card.oracle_text);
    if (profile.produced.has(key)) names.push(card.name);
  }
  return names.sort();
}

function hasEdgeReason(edges: Array<{ reasons: Array<{ key: number }> }>, key: number): boolean {
  return edges.some((edge) => edge.reasons.some((reason) => reason.key === key));
}

function hasActionProducers(cards: CardInput[], action: ActionId): string[] {
  const key = keyOf(KeyKind.ACTION, action);
  return collectProfileProducers(cards, key);
}

describe("semantic overlay creature dies wiring inspect", () => {
  it("inspects where CREATURE_DIES is wired (watch -> profile -> edges) and contrasts SACRIFICE", async () => {
    const payload = loadCardsIndex();
    const lookup = createLocalLookup(payload);
    const entries = buildDeckEntries();
    const cards = await buildCardsFromDeck(entries, lookup);
    const edges = buildSemanticEdges(cards);

    const diesKey = keyOf(KeyKind.EVENT, EventId.CREATURE_DIES);
    const sacrificeKey = keyOf(KeyKind.EVENT, EventId.SACRIFICE);

    const diesWatchCards = collectWatchCards(cards, EventId.CREATURE_DIES);
    const diesConsumedCards = collectProfileConsumers(cards, diesKey);
    const diesProducedCards = collectProfileProducers(cards, diesKey);
    const diesInEdges = hasEdgeReason(edges, diesKey);

    const sacrificeCostCards = collectCostCards(cards, CostId.SACRIFICE_AS_COST);
    const sacrificeProducedCards = collectProfileProducers(cards, sacrificeKey);
    const sacrificeConsumedCards = collectProfileConsumers(cards, sacrificeKey);
    const sacrificeInEdges = hasEdgeReason(edges, sacrificeKey);

    const loseLifeProducers = hasActionProducers(cards, ActionId.LOSE_LIFE);
    const dealDamageProducers = hasActionProducers(cards, ActionId.DEAL_DAMAGE);
    const lifeGainProducers = hasActionProducers(cards, ActionId.GAIN_LIFE);

    let lossPoint: "parser_watch_missing" | "profile_missing" | "pairing_missing" | "present" | "unknown" = "unknown";
    if (diesWatchCards.length === 0) {
      lossPoint = "parser_watch_missing";
    } else if (diesConsumedCards.length === 0) {
      lossPoint = "profile_missing";
    } else if (!diesInEdges) {
      lossPoint = "pairing_missing";
    } else {
      lossPoint = "present";
    }

    console.log("CREATURE_DIES wiring snapshot:", {
      watch_cards: diesWatchCards,
      profile_consumed_cards: diesConsumedCards,
      profile_produced_cards: diesProducedCards,
      appears_in_edges: diesInEdges,
      loss_point: lossPoint,
      key: explainKey(diesKey),
    });

    console.log("SACRIFICE wiring snapshot:", {
      cost_cards: sacrificeCostCards,
      profile_produced_cards: sacrificeProducedCards,
      profile_consumed_cards: sacrificeConsumedCards,
      appears_in_edges: sacrificeInEdges,
      key: explainKey(sacrificeKey),
    });

    console.log("Payoff action producers:", {
      LOSE_LIFE: loseLifeProducers,
      DEAL_DAMAGE: dealDamageProducers,
      LIFE_GAIN: lifeGainProducers,
    });

    expect(edges.length).toBeGreaterThan(0);
    expect(lossPoint).not.toBe("unknown");
    expect(sacrificeProducedCards.length).toBeGreaterThan(0);
  });
});
