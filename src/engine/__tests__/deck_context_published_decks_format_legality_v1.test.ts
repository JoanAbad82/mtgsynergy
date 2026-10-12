// @ts-ignore - Node fixture typings are absent from the existing project tsconfig; Vitest runs in Node.
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { analyzeMtgaExportAsync } from "../analyzer";
import { lookupCard, __testing as indexTesting } from "../cards/lookup";
import { computeSemanticOverlayFromDeckEntries } from "../semantic/overlay/sem_overlay_compute";
import {
  selectDeckSemanticAnchors, retrieveBoundedDeckContextCandidates,
  buildCandidateAnchorSemanticConnections, scoreDeckContextCandidate,
  MAX_CONTEXTUALLY_SCORED_CANDIDATES, MAX_VISIBLE_RESULTS,
  type DeckContextCandidateScore,
} from "../deck_context";
import {
  clearLegalityIndexCacheForTests,
  selectFormatLegalCandidates, type DeckLegalFormat,
} from "../deck_context/format_legality_v1";

const decks: Array<{id: string; format: DeckLegalFormat; expectedExcludedBefore: number; deck: string}> = [
  {
    id: "mono-red-madness-guttersnipe", format: "pauper", expectedExcludedBefore: 8,
    deck: `Deck
4 Faithless Looting
4 Lava Dart
4 Lightning Bolt
4 Voldaren Epicure
4 Grab the Prize
4 Highway Robbery
4 Kessig Flamebreather
4 Sneaky Snacker
4 Fiery Temper
3 Guttersnipe
3 Fireblast
18 Mountain`,
  },
  {
    id: "modern-soul-sisters", format: "modern", expectedExcludedBefore: 2,
    deck: `Deck
4 Path to Exile
4 Serra Ascendant
4 Soul Warden
4 Soul's Attendant
4 Ajani's Pridemate
4 Auriok Champion
4 Honor of the Pure
4 Ranger of Eos
1 Archangel of Thune
4 Spectral Procession
4 Ghost Quarter
16 Plains
3 Windbrisk Heights`,
  },
  {
    id: "modern-golgari-elves", format: "modern", expectedExcludedBefore: 2,
    deck: `Deck
4 Elvish Mystic
4 Heritage Druid
4 Llanowar Elves
1 Quirion Ranger
4 Dwynen's Elite
4 Elvish Warmaster
1 Leaf-Crowned Visionary
3 Sylvan Anthem
4 Elvish Archdruid
2 Elvish Champion
1 Ezuri, Renegade Leader
4 Shaman of the Pack
4 Collected Company
2 Boseiju, Who Endures
3 Cavern of Souls
2 Forest
1 Misty Rainforest
3 Nurturing Peatland
1 Nykthos, Shrine to Nyx
3 Overgrown Tomb
1 Verdant Catacombs
1 Windswept Heath
1 Wooded Foothills
2 Yavimaya, Cradle of Growth`,
  },
  {
    id: "modern-izzet-prowess", format: "modern", expectedExcludedBefore: 5,
    deck: `Deck
4 Dragon's Rage Channeler
4 Monastery Swiftspear
4 Slickshot Show-Off
4 Lava Dart
4 Lightning Bolt
2 Monstrous Rage
4 Mutagenic Growth
2 Assault Strobe
2 Expressive Iteration
4 Preordain
4 Cori-Steel Cutter
4 Mishra's Bauble
2 Arid Mesa
2 Bloodstained Mire
2 Fiery Islet
3 Mountain
3 Scalding Tarn
3 Steam Vents
1 Thundering Falls
2 Wooded Foothills`,
  },
];
const fetched: string[] = [];
const cardsBytes = readFileSync("public/data/cards_index.json.gz");
const legalBytes = readFileSync("public/data/cards_format_legalities.json.gz");
beforeAll(() => {
  indexTesting.clearCache();
  clearLegalityIndexCacheForTests();
  vi.stubGlobal("fetch", async (input: unknown) => {
    const url = String(input);
    fetched.push(url);
    if (url === "/data/cards_index.json.gz") {
      return new Response(new Uint8Array(cardsBytes), { status: 200 });
    }
    if (url === "/data/cards_format_legalities.json.gz") {
      return new Response(new Uint8Array(legalBytes), { status: 200 });
    }
    throw Error("Unplanned network request: " + url);
  });
});
afterAll(() => {
  vi.unstubAllGlobals();
  indexTesting.clearCache();
  clearLegalityIndexCacheForTests();
});

describe("published decks: before/after format legality on actual deck-context pipeline", () => {
  for (const item of decks) {
    it(item.id + ": excludes confirmed illegal without losing previously valid candidates", async () => {
      const analyzed = await analyzeMtgaExportAsync(item.deck, { enableCardIndex: true });
      const entries = analyzed.deckState.deck.entries;
      expect(entries.reduce((n, row) => n + row.count, 0)).toBe(60);
      const overlay = await computeSemanticOverlayFromDeckEntries(entries, lookupCard);
      expect(overlay.missingUnique).toBe(0);
      const anchors = selectDeckSemanticAnchors({ entries, edges: overlay.edgesTop, idToName: overlay.idToName });
      const retrieval = await retrieveBoundedDeckContextCandidates({
        anchors, presentCards: entries.map(row => ({ nameNorm: row.name_norm }))
      });
      const scored: DeckContextCandidateScore[] = [];
      for (const candidate of retrieval.candidates.slice(0, MAX_CONTEXTUALLY_SCORED_CANDIDATES)) {
        const evidence = await buildCandidateAnchorSemanticConnections({
          candidate: candidate.card, anchors
        });
        if (!evidence.connections.length) continue;
        const r = scoreDeckContextCandidate({
          candidate, connections: evidence.connections,
          hasIncompleteEvidence: evidence.degradations.some(d => d.reason !== "no_cross_edge")
        });
        if (r.evidenceLevel !== "inconclusive") scored.push(r);
      }
      const retrievalRank = new Map(retrieval.candidates.map((c, i) => [c.identityKey, i]));
      scored.sort((a, b) => b.contextualScore-a.contextualScore ||
        b.connectedDeckCardCount-a.connectedDeckCardCount ||
        b.reasons.length-a.reasons.length ||
        (retrievalRank.get(a.candidate.identityKey) ?? Infinity)-(retrievalRank.get(b.candidate.identityKey) ?? Infinity) ||
        a.candidate.card.name.localeCompare(b.candidate.card.name));
      const before = scored.slice(0, MAX_VISIBLE_RESULTS);
      const now = new Date("2026-10-12T12:00:00Z");
      const baseline = await selectFormatLegalCandidates(before, item.format, { now });
      const after = await selectFormatLegalCandidates(scored, item.format, { now });
      const visible = after.legal.slice(0, MAX_VISIBLE_RESULTS);
      expect(baseline.excluded).toBe(item.expectedExcludedBefore);
      expect(visible.length).toBeGreaterThanOrEqual(baseline.legal.length);
      const visibleNames = new Set(visible.map(r => r.candidate.card.name));
      expect(baseline.legal.every(r => visibleNames.has(r.candidate.card.name))).toBe(true);
      expect(visible.every(r => !after.unknown.includes(r))).toBe(true);
      expect(visible.length).toBeGreaterThan(0);
      console.log("DECK_FORMAT_LEGALITY_AUDIT " + JSON.stringify({
        id: item.id, format: item.format,
        beforeVisible: before.length, beforeIllegal: baseline.excluded,
        beforeLegal: baseline.legal.length, beforeUnknown: baseline.unknown.length,
        afterVisible: visible.length, afterIllegal: 0,
        excludedFromScored: after.excluded, unknownFromScored: after.unknown.length,
        visibleNames: visible.map(r => r.candidate.card.name)
      }));
    }, 120000);
  }
  it("uses only the local static assets, never calls Scryfall", () => {
    expect(new Set(fetched)).toEqual(new Set([
      "/data/cards_index.json.gz", "/data/cards_format_legalities.json.gz"
    ]));
  });
});
