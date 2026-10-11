import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { analyzeMtgaExportAsync } from "../analyzer";
import { lookupCard, __testing as indexTesting } from "../cards/lookup";
import { computeSemanticOverlayFromDeckEntries } from "../semantic/overlay/sem_overlay_compute";
import {
  selectDeckSemanticAnchors, retrieveBoundedDeckContextCandidates,
  buildCandidateAnchorSemanticConnections, scoreDeckContextCandidate,
  MAX_CONTEXTUALLY_SCORED_CANDIDATES, MAX_VISIBLE_RESULTS,
  type DeckContextCandidateScore,
} from "../deck_context";

const indexBytes = readFileSync("public/data/cards_index.json.gz");
const fetched: string[] = [];
const cases = [
  {
    id: "guttersnipe-spells", deck: `Deck
4 Guttersnipe
4 Opt
4 Shock
4 Lightning Bolt
4 Consider
40 Mountain`,
    expected: ["Firebrand Archer", "Kessig Flamebreather", "Storm-Kiln Artist", "Young Pyromancer", "Talrand, Sky Summoner"],
    minimum: 2,
  },
  {
    id: "krenko-tokens", deck: `Deck
4 Krenko, Mob Boss
4 Goblin Instigator
4 Goblin Chieftain
4 Lightning Bolt
44 Mountain`,
    expected: ["Impact Tremors", "Purphoros, God of the Forge", "Goblin Bombardment", "Molten Gatekeeper", "Warleader's Call"],
    minimum: 2,
  },
  {
    id: "soul-warden-lifegain", deck: `Deck
4 Soul Warden
4 Ajani's Pridemate
4 Raise the Alarm
4 Impassioned Orator
44 Plains`,
    expected: ["Soul's Attendant", "Lunarch Veteran // Luminous Phantom", "Cleric Class", "Ajani's Welcome", "Daxos, Blessed by the Sun"],
    minimum: 2,
  },
  {
    id: "plains-negative", deck: "Deck\n60 Plains",
    expected: [], minimum: 0,
  },
] as const;

async function analyzeVisible(deck: string) {
  const result = await analyzeMtgaExportAsync(deck, { enableCardIndex: true });
  const entries = result.deckState.deck.entries;
  const overlay = await computeSemanticOverlayFromDeckEntries(entries, lookupCard);
  const anchors = selectDeckSemanticAnchors({
    entries, edges: overlay.edgesTop, idToName: overlay.idToName,
  });
  const retrieval = await retrieveBoundedDeckContextCandidates({
    anchors, presentCards: entries.map((entry) => ({ nameNorm: entry.name_norm })),
  });
  const scored: DeckContextCandidateScore[] = [];
  for (const candidate of retrieval.candidates.slice(0, MAX_CONTEXTUALLY_SCORED_CANDIDATES)) {
    const evidence = await buildCandidateAnchorSemanticConnections({
      candidate: candidate.card, anchors,
    });
    if (evidence.connections.length === 0) continue;
    const row = scoreDeckContextCandidate({
      candidate, connections: evidence.connections,
      hasIncompleteEvidence: evidence.degradations.some((d) => d.reason !== "no_cross_edge"),
    });
    if (row.evidenceLevel !== "inconclusive") scored.push(row);
  }
  const retrievalRank = new Map(retrieval.candidates.map((item, index) => [item.identityKey, index]));
  scored.sort((a, b) =>
    b.contextualScore - a.contextualScore ||
    b.connectedDeckCardCount - a.connectedDeckCardCount ||
    b.reasons.length - a.reasons.length ||
    (retrievalRank.get(a.candidate.identityKey) ?? Infinity) -
      (retrievalRank.get(b.candidate.identityKey) ?? Infinity) ||
    a.candidate.card.name.localeCompare(b.candidate.card.name));
  const visible = scored.slice(0, MAX_VISIBLE_RESULTS);
  return { entries, overlay, anchors, retrieval, scored, visible };
}

describe("deck-context real-index golden acceptance: retrieval + relevance", () => {
  beforeAll(() => {
    indexTesting.clearCache();
    vi.stubGlobal("fetch", async (url: unknown) => {
      fetched.push(String(url));
      if (String(url) !== "/data/cards_index.json.gz") {
        throw new Error("unexpected cards index request: " + String(url));
      }
      return new Response(new Uint8Array(indexBytes), { status: 200 });
    });
  });
  afterAll(() => { vi.unstubAllGlobals(); indexTesting.clearCache(); });

  for (const item of cases) {
    test(item.id + ": yields supported relevant recommendations", async () => {
      const { entries, overlay, retrieval, scored, visible } = await analyzeVisible(item.deck);
      const visibleNames = visible.map(row => row.candidate.card.name);
      const hitNames = item.expected.filter(name => visibleNames.includes(name));
      const retrievalNames = retrieval.candidates.map(row => row.card.name);
      const present = new Set(entries.map(row => row.name.toLowerCase()));
      const positions = item.expected.map(name => ({
        name,
        retrieved: retrievalNames.indexOf(name) + 1,
        scored: scored.findIndex(row => row.candidate.card.name === name) + 1,
        visible: visibleNames.indexOf(name) + 1,
      }));
      console.log("GOLD_DECK_CONTEXT_ACCEPTANCE " + JSON.stringify({
        id: item.id, resolved: overlay.resolvedUnique, missing: overlay.missingUnique,
        retrieved: retrievalNames.length, scored: scored.length,
        visible: visibleNames, hits: hitNames, positions,
      }));
      expect(overlay.missingUnique).toBe(0);
      expect(new Set(retrievalNames).size).toBe(retrievalNames.length);
      expect(visibleNames.every(name => !present.has(name.toLowerCase()))).toBe(true);
      expect(visible.every(row => row.reasons.length > 0 && row.connectedDeckCardCount > 0)).toBe(true);
      expect(hitNames.length).toBeGreaterThanOrEqual(item.minimum);
      if (item.id === "plains-negative") expect(visible).toHaveLength(0);
    }, 120000);
  }
  test("uses only the local static cards index", () => {
    expect(new Set(fetched)).toEqual(new Set(["/data/cards_index.json.gz"]));
  });
});
