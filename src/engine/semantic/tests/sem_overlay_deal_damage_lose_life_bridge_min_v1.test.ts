import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { normalizeCardName } from "../../cards/normalize";
import type { CardRecordMin } from "../../cards/types";
import { ActionId } from "../contract";
import { normalizeOracleTextV1 } from "../normalize";
import { buildSemanticEdges } from "../overlay/sem_edges";
import { KeyKind, keyOf } from "../overlay/sem_profile";
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
  { name: "Scorching Missile", count: 1 }, // target player
  { name: "Zaffai, Thunder Conductor", count: 1 }, // an opponent
  { name: "Creeping Bloodsucker", count: 1 }, // each opponent
  { name: "Flame Rift", count: 1 }, // each player
  { name: "Chain of Plasma", count: 1 }, // any target (negative)
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

function findLocalBridgeEdge(
  edges: ReturnType<typeof buildSemanticEdges>,
  cardId: number,
  requiredKeys: number[],
) {
  return edges.find(
    (edge) =>
      edge.local_only &&
      edge.from === cardId &&
      edge.to === cardId &&
      requiredKeys.every((key) => edge.reasons.some((reason) => reason.key === key)),
  );
}

describe("semantic overlay deal damage lose life bridge min v1", () => {
  it("emits local bridge only for explicit player/opponent damage text and excludes any target", async () => {
    const payload = loadCardsIndex();
    const lookup = createLocalLookup(payload);
    const entries = buildDeckEntries();
    const cards = await buildCardsFromDeck(entries, lookup);
    const edges = buildSemanticEdges(cards, { includeLocalOnly: true });

    const dealDamageKey = keyOf(KeyKind.ACTION, ActionId.DEAL_DAMAGE);
    const loseLifeKey = keyOf(KeyKind.ACTION, ActionId.LOSE_LIFE);
    const requiredKeys = [dealDamageKey, loseLifeKey];

    const positiveCases = [
      "Scorching Missile",
      "Zaffai, Thunder Conductor",
      "Creeping Bloodsucker",
      "Flame Rift",
    ];

    for (const name of positiveCases) {
      const candidate = cards.find(
        (card) => normalizeCardName(card.name) === normalizeCardName(name),
      );
      expect(candidate).toBeTruthy();
      const localBridgeEdge = findLocalBridgeEdge(edges, candidate!.card_id, requiredKeys);
      expect(localBridgeEdge).toBeTruthy();
      expect(localBridgeEdge?.local_only).toBe(true);
      expect(localBridgeEdge?.score).toBe(0);
      expect(localBridgeEdge?.reasons.some((reason) => reason.key === dealDamageKey)).toBe(true);
      expect(localBridgeEdge?.reasons.some((reason) => reason.key === loseLifeKey)).toBe(true);
    }

    const anyTargetCard = cards.find(
      (card) => normalizeCardName(card.name) === normalizeCardName("Chain of Plasma"),
    );
    expect(anyTargetCard).toBeTruthy();
    const anyTargetBridgeEdge = findLocalBridgeEdge(edges, anyTargetCard!.card_id, requiredKeys);
    expect(anyTargetBridgeEdge).toBeUndefined();
  });
});
