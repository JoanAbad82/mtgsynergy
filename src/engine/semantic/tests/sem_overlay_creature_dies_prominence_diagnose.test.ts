import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { normalizeCardName } from "../../cards/normalize";
import { normalizeOracleTextV1 } from "../normalize";
import { parseSemanticIrV0 } from "../parser/sem_parser_v1";
import { buildSemanticEdges } from "../overlay/sem_edges";
import { computeSemanticOverlayFromDeckEntries } from "../overlay/sem_overlay_compute";
import { explainKey } from "../overlay/sem_profile";

const here = dirname(fileURLToPath(import.meta.url));
const cardsIndexPath = join(here, "../../../../public/data/cards_index.json.gz");

type CardsIndexPayload = {
  by_name?: Record<string, { oracle_text?: string | null; type_line?: string | null }>;
  by_name_norm?: Record<string, string>;
};

type CardRecordMin = {
  name: string;
  name_norm: string;
  oracle_text?: string | null;
  type_line?: string | null;
};

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

function resolveCard(payload: CardsIndexPayload, name: string): CardRecordMin | null {
  const canonical = findCanonicalName(payload, name);
  if (!canonical) return null;
  const record = payload.by_name?.[canonical];
  if (!record) return null;
  return {
    name: canonical,
    name_norm: normalizeCardName(canonical),
    oracle_text: record.oracle_text ?? null,
    type_line: record.type_line ?? null,
  };
}

function createLocalLookup(payload: CardsIndexPayload) {
  return async (name: string): Promise<CardRecordMin | null> => resolveCard(payload, name);
}

function buildDeckEntries(): Array<{ name: string }> {
  return deckList.flatMap((entry) =>
    Array.from({ length: entry.count }, () => ({ name: entry.name })),
  );
}

function buildCardInputs(payload: CardsIndexPayload, entries: Array<{ name: string }>) {
  const uniqueNames = Array.from(new Set(entries.map((entry) => entry.name)));
  const resolved = uniqueNames
    .map((name) => resolveCard(payload, name))
    .filter((card): card is CardRecordMin => !!card);

  const byNorm = new Map<string, CardRecordMin>();
  for (const card of resolved) {
    if (!byNorm.has(card.name_norm)) {
      byNorm.set(card.name_norm, card);
    }
  }

  const ordered = Array.from(byNorm.values()).sort((a, b) =>
    a.name_norm.localeCompare(b.name_norm),
  );

  const idToName: Record<number, string> = {};
  const cards = ordered.map((card, index) => {
    const oracleText = normalizeOracleTextV1(card.oracle_text ?? "");
    const ir = parseSemanticIrV0({
      name: card.name,
      oracle_text: oracleText,
      type_line: card.type_line ?? null,
    });
    const card_id = index + 1;
    ir.card_id = card_id;
    idToName[card_id] = card.name;
    return { card_id, ir, oracle_text: oracleText };
  });

  return { cards, idToName };
}

function edgeHasPattern(edge: { reasons: Array<{ key: number }> }, patterns: string[]): boolean {
  return edge.reasons.some((reason) =>
    patterns.some((pattern) => explainKey(reason.key).includes(pattern)),
  );
}

describe("semantic overlay creature dies prominence diagnose", () => {
  it("diagnoses whether CREATURE_DIES bridge edges are present but low-ranked", async () => {
    const payload = loadCardsIndex();
    const entries = buildDeckEntries();
    const lookup = createLocalLookup(payload);
    const overlay = await computeSemanticOverlayFromDeckEntries(entries, lookup);
    const { cards, idToName } = buildCardInputs(payload, entries);
    const edges = buildSemanticEdges(cards);
    const edgesTop = overlay.edgesTop;

    const diesPattern = ["EVENT:CREATURE_DIES"];
    const diesEdges = edges.filter((edge) => edgeHasPattern(edge, diesPattern));
    const diesLocalEdges = diesEdges.filter((edge) => edge.local_only);
    const diesLocalInTop = edgesTop.some(
      (edge) => edge.local_only && edgeHasPattern(edge, diesPattern),
    );

    const scoredEdges = edges.filter((edge) => edge.score > 0);
    const scoredInTop = edgesTop.some((edge) => edge.score > 0);
    const firstLocalIndex = edges.findIndex(
      (edge) => edge.local_only && edgeHasPattern(edge, diesPattern),
    );
    const lastScoredIndex = edges.reduce(
      (max, edge, idx) => (edge.score > 0 ? idx : max),
      -1,
    );

    const topSummary = edgesTop.map((edge) => ({
      from: idToName[edge.from],
      to: idToName[edge.to],
      score: edge.score,
      local_only: edge.local_only ?? false,
      reasons: edge.reasons.map((reason) => explainKey(reason.key)),
    }));

    console.log("Rakdos top edges (prominence diagnose):", topSummary);
    console.log("CREATURE_DIES edges count:", {
      total: diesEdges.length,
      local_only: diesLocalEdges.length,
      local_only_in_top: diesLocalInTop,
      first_local_index: firstLocalIndex,
      last_scored_index: lastScoredIndex,
    });

    expect(diesEdges.length).toBeGreaterThan(0);
    expect(diesLocalEdges.length).toBeGreaterThan(0);
    expect(diesLocalInTop).toBe(true);
    expect(scoredEdges.length).toBeGreaterThan(0);
    expect(scoredInTop).toBe(true);
    expect(firstLocalIndex).toBeGreaterThan(lastScoredIndex);
  });
});
