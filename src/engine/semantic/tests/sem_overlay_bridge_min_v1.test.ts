import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { normalizeCardName } from "../../cards/normalize";
import type { CardRecordMin } from "../../cards/types";
import { EventId } from "../contract";
import { normalizeOracleTextV1 } from "../normalize";
import { parseSemanticIrV0 } from "../parser/sem_parser_v1";
import { buildSemanticEdges } from "../overlay/sem_edges";
import { isExplicitSacrificeCreatureText } from "../overlay/sem_bridge_evidence";
import { buildSemanticOverlayMetrics } from "../overlay/sem_metrics";
import { buildSemanticCardProfile, KeyKind, keyOf, mergeProfiles } from "../overlay/sem_profile";

type CardsIndexPayload = {
  by_name?: Record<string, { oracle_text?: string | null; type_line?: string | null }>;
  by_name_norm?: Record<string, string>;
};

type CardInput = {
  card_id: number;
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
    return { card_id, ir, oracle_text: oracleText } satisfies CardInput;
  });
}

function buildCardsFromLiterals(rows: Array<{ name: string; oracle_text: string }>): CardInput[] {
  return rows.map((row, index) => {
    const oracleText = normalizeOracleTextV1(row.oracle_text);
    const ir = parseSemanticIrV0({ name: row.name, oracle_text: oracleText, type_line: null });
    const card_id = index + 1;
    ir.card_id = card_id;
    return { card_id, ir, oracle_text: oracleText };
  });
}

function computeOrphanExcessWithoutBridge(cards: CardInput[]) {
  const profiles = cards.map((card) => buildSemanticCardProfile(card.ir, card.oracle_text));
  const merged = mergeProfiles(profiles.map((profile) => profile));
  const orphan = new Set<number>();
  const excess = new Set<number>();
  for (const key of merged.consumed.keys()) {
    if (!merged.produced.has(key)) orphan.add(key);
  }
  for (const key of merged.produced.keys()) {
    if (!merged.consumed.has(key)) excess.add(key);
  }
  return { orphan, excess };
}

function addSupport(
  map: Map<number, { count: number; origin: "cost" | "effect" }>,
  key: number,
): void {
  const current = map.get(key);
  if (current) {
    current.count += 1;
    if (current.origin !== "effect") current.origin = "effect";
    return;
  }
  map.set(key, { count: 1, origin: "effect" });
}

function computeOrphanExcessWithLocalBridge(cards: CardInput[]) {
  const sacrificeKey = keyOf(KeyKind.EVENT, EventId.SACRIFICE);
  const diesKey = keyOf(KeyKind.EVENT, EventId.CREATURE_DIES);
  const profiles = cards.map((card) => buildSemanticCardProfile(card.ir, card.oracle_text));

  profiles.forEach((profile, index) => {
    const oracleText = cards[index]?.oracle_text ?? "";
    if (!isExplicitSacrificeCreatureText(oracleText)) return;
    if (!profile.produced.has(sacrificeKey)) return;
    addSupport(profile.produced, diesKey);
    addSupport(profile.consumed, sacrificeKey);
  });

  const merged = mergeProfiles(profiles.map((profile) => profile));
  const orphan = new Set<number>();
  const excess = new Set<number>();
  for (const key of merged.consumed.keys()) {
    if (!merged.produced.has(key)) orphan.add(key);
  }
  for (const key of merged.produced.keys()) {
    if (!merged.consumed.has(key)) excess.add(key);
  }
  return { orphan, excess };
}

describe("semantic overlay bridge min v1", () => {
  it("improves local SACRIFICE/CREATURE_DIES closure for the Rakdos test deck", async () => {
    const payload = loadCardsIndex();
    const lookup = createLocalLookup(payload);
    const entries = buildDeckEntries();
    const cards = await buildCardsFromDeck(entries, lookup);
    const edges = buildSemanticEdges(cards);

    const before = computeOrphanExcessWithoutBridge(cards);
    const expected = computeOrphanExcessWithLocalBridge(cards);
    const after = buildSemanticOverlayMetrics({ cards, edges, topN: 20 });

    const sacrificeKey = keyOf(KeyKind.EVENT, EventId.SACRIFICE);
    const diesKey = keyOf(KeyKind.EVENT, EventId.CREATURE_DIES);

    expect(before.orphan.has(diesKey)).toBe(true);
    expect(before.excess.has(sacrificeKey)).toBe(true);

    const diesOrphanAfter = after.orphan_listeners.some((row) => row.key === diesKey);
    const sacrificeExcessAfter = after.excess_producers.some((row) => row.key === sacrificeKey);

    expect(expected.orphan.has(diesKey)).toBe(false);
    expect(expected.excess.has(sacrificeKey)).toBe(false);
    expect(diesOrphanAfter).toBe(false);
    expect(sacrificeExcessAfter).toBe(false);
  });

  it("does not activate for non-creature sacrifice (negative case)", () => {
    const cards = buildCardsFromLiterals([
      { name: "Fake Sacrifice", oracle_text: "Sacrifice a permanent: Draw a card." },
      { name: "Fake Dies Listener", oracle_text: "Whenever a creature dies, you gain 1 life." },
    ]);
    const edges = buildSemanticEdges(cards);

    const before = computeOrphanExcessWithoutBridge(cards);
    const expected = computeOrphanExcessWithLocalBridge(cards);
    const after = buildSemanticOverlayMetrics({ cards, edges, topN: 10 });

    const sacrificeKey = keyOf(KeyKind.EVENT, EventId.SACRIFICE);
    const diesKey = keyOf(KeyKind.EVENT, EventId.CREATURE_DIES);

    expect(before.orphan.has(diesKey)).toBe(true);
    expect(before.excess.has(sacrificeKey)).toBe(true);

    const diesOrphanAfter = after.orphan_listeners.some((row) => row.key === diesKey);
    const sacrificeExcessAfter = after.excess_producers.some((row) => row.key === sacrificeKey);

    expect(expected.orphan.has(diesKey)).toBe(true);
    expect(expected.excess.has(sacrificeKey)).toBe(true);
    expect(diesOrphanAfter).toBe(true);
    expect(sacrificeExcessAfter).toBe(true);
  });
});
