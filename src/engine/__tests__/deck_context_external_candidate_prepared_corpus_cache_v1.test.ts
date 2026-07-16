import { beforeEach, describe, expect, test, vi } from "vitest";
import type { CardRecordMin } from "../cards/types";

const mocks = vi.hoisted(() => ({
  lookupCard: vi.fn(),
  listCardsIndexRecords: vi.fn(),
  getCardsIndexRecordsSourceSnapshot: vi.fn(),
}));

vi.mock("../cards/lookup", () => ({
  lookupCard: mocks.lookupCard,
  listCardsIndexRecords: mocks.listCardsIndexRecords,
  getCardsIndexRecordsSourceSnapshot: mocks.getCardsIndexRecordsSourceSnapshot,
}));

import {
  retrieveBoundedDeckContextCandidates,
  __testing as retrievalTesting,
} from "../deck_context/external_card_candidate_retrieval_v1";

const normalize = (name: string): string => name.toLowerCase().replace(/[^a-z0-9]+/g, "");

const record = (name: string, oracleText: string, typeLine = "Creature"): CardRecordMin => ({
  oracle_id: `oracle-${normalize(name)}`,
  name,
  name_norm: normalize(name),
  type_line: typeLine,
  oracle_text: oracleText,
  cmc: 3,
});

const anchor = (name: string) =>
  ({
    key: `name:${normalize(name)}`,
    name,
    nameNorm: normalize(name),
    count: 1,
    rank: 1,
    evidence: "supported",
  }) as const;

const corpus = [
  record("Firebrand Archer", "Whenever you cast a noncreature spell, Firebrand Archer deals 1 damage to each opponent."),
  record("Guttersnipe", "Whenever you cast an instant or sorcery spell, Guttersnipe deals 2 damage to each opponent."),
  record("Impact Tremors", "Whenever a creature enters the battlefield under your control, Impact Tremors deals 1 damage to each opponent.", "Enchantment"),
  record("Kessig Flamebreather", "Whenever you cast a noncreature spell, Kessig Flamebreather deals 1 damage to each opponent."),
  record("Storm-Kiln Artist", "Magecraft - Whenever you cast or copy an instant or sorcery spell, create a Treasure token."),
  record("Talrand, Sky Summoner", "Whenever you cast an instant or sorcery spell, create a 2/2 blue Drake creature token with flying."),
  record("Thermo-Alchemist", "Defender\nWhenever you cast an instant or sorcery spell, untap Thermo-Alchemist.\n{T}: Thermo-Alchemist deals 1 damage to each opponent."),
  record("Third Path Iconoclast", "Whenever you cast a noncreature spell, create a 1/1 colorless Soldier artifact creature token."),
  record("Young Pyromancer", "Whenever you cast an instant or sorcery spell, create a 1/1 red Elemental creature token."),
].sort((left, right) => left.name.localeCompare(right.name));

const sourceA = Object.freeze({ generation: 1, cacheKey: "http://cards.test" });
const sourceB = Object.freeze({ generation: 2, cacheKey: "http://cards-alt.test" });

function listLikeRealIndex(): readonly CardRecordMin[] {
  return corpus;
}

function retrieveGuttersnipe(baseUrl = "http://cards.test") {
  return retrieveBoundedDeckContextCandidates({
    anchors: [anchor("Guttersnipe")],
    presentCards: [{ nameNorm: normalize("Guttersnipe"), oracleId: "oracle-guttersnipe" }],
    baseUrl,
  });
}

describe("prepared corpus single-entry promise cache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    retrievalTesting.resetPreparedCorpusCache();
    mocks.lookupCard.mockImplementation(async (name: string) => {
      return corpus.find((candidate) => candidate.name === name) ?? null;
    });
    mocks.listCardsIndexRecords.mockResolvedValue(corpus);
    mocks.getCardsIndexRecordsSourceSnapshot.mockImplementation(async () => ({
      sourceIdentity: sourceA,
      records: listLikeRealIndex(),
    }));
  });

  test("miss builds once, same-source hit reuses the prepared corpus and preserves output", async () => {
    const first = await retrieveGuttersnipe();
    const firstNames = first.candidates.map((candidate) => candidate.card.name);
    expect(firstNames).toEqual([
      "Thermo-Alchemist",
      "Firebrand Archer",
      "Kessig Flamebreather",
      "Storm-Kiln Artist",
      "Talrand, Sky Summoner",
      "Young Pyromancer",
      "Third Path Iconoclast",
      "Impact Tremors",
    ]);
    expect(retrievalTesting.getPreparedCorpusCacheStats()).toMatchObject({
      missCount: 1,
      hitCount: 0,
      buildCount: 1,
      hasEntry: true,
    });

    const second = await retrieveGuttersnipe();
    expect(second.candidates.map((candidate) => candidate.card.name)).toEqual(firstNames);
    expect(retrievalTesting.getPreparedCorpusCacheStats()).toMatchObject({
      missCount: 1,
      hitCount: 1,
      buildCount: 1,
      hasEntry: true,
    });
  });

  test("concurrent same-source retrievals share one preparation promise", async () => {
    const [first, second] = await Promise.all([retrieveGuttersnipe(), retrieveGuttersnipe()]);

    expect(first.candidates.map((candidate) => candidate.card.name)).toEqual(
      second.candidates.map((candidate) => candidate.card.name),
    );
    expect(retrievalTesting.getPreparedCorpusCacheStats()).toMatchObject({
      missCount: 1,
      hitCount: 1,
      buildCount: 1,
      hasEntry: true,
    });
  });

  test("source identity change invalidates by replacing the single entry", async () => {
    await retrieveGuttersnipe("http://cards.test");
    mocks.getCardsIndexRecordsSourceSnapshot.mockImplementation(async () => ({
      sourceIdentity: sourceB,
      records: listLikeRealIndex(),
    }));

    await retrieveGuttersnipe("http://cards-alt.test");

    expect(retrievalTesting.getPreparedCorpusCacheStats()).toMatchObject({
      missCount: 2,
      hitCount: 0,
      buildCount: 2,
      sourceReplacementCount: 1,
      hasEntry: true,
      currentSource: { generation: 2, cacheKey: "http://cards-alt.test" },
    });
  });

  test("rejected preparation promise evicts and later retry succeeds", async () => {
    mocks.getCardsIndexRecordsSourceSnapshot.mockResolvedValueOnce({
      sourceIdentity: sourceA,
      get records() {
        throw new Error("synthetic preparation failure");
      },
    });
    await expect(retrieveGuttersnipe()).rejects.toThrow("synthetic preparation failure");
    expect(retrievalTesting.getPreparedCorpusCacheStats()).toMatchObject({
      missCount: 1,
      buildCount: 1,
      rejectionEvictionCount: 1,
      hasEntry: false,
    });

    const retry = await retrieveGuttersnipe();
    expect(retry.candidates.length).toBeGreaterThan(0);
    expect(retrievalTesting.getPreparedCorpusCacheStats()).toMatchObject({
      missCount: 2,
      buildCount: 2,
      rejectionEvictionCount: 1,
      hasEntry: true,
    });
  });
});
