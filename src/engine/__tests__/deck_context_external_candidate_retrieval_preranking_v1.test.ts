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
import { __testing as rankingTesting } from "../deck_context/external_card_candidate_ranking_v1";

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

const weakPrefix = Array.from({ length: 60 }, (_, index) =>
  record(
    `A${String(index).padStart(2, "0")} Weak Sorcery Speed`,
    "Target creature gets +1/+1 until end of turn. Activate only as a sorcery.",
    "Enchantment",
  ),
);

const corpus = [
  ...weakPrefix,
  record(
    "Collected Company",
    "Look at the top six cards of your library. Put up to two creature cards with mana value 3 or less from among them onto the battlefield.",
    "Instant",
  ),
  record("Elvish Visionary", "When Elvish Visionary enters the battlefield, draw a card."),
  record("Firebrand Archer", "Whenever you cast a noncreature spell, Firebrand Archer deals 1 damage to each opponent."),
  record(
    "Guttersnipe",
    "Whenever you cast an instant or sorcery spell, Guttersnipe deals 2 damage to each opponent.",
  ),
  record("Impact Tremors", "Whenever a creature enters the battlefield under your control, Impact Tremors deals 1 damage to each opponent.", "Enchantment"),
  record("Kessig Flamebreather", "Whenever you cast a noncreature spell, Kessig Flamebreather deals 1 damage to each opponent."),
  record("Llanowar Elves", "{T}: Add {G}."),
  record("Monastery Swiftspear", "Haste\nProwess"),
  record("Soul Warden", "Whenever another creature enters the battlefield, you gain 1 life."),
  record("Soul's Attendant", "Whenever another creature enters the battlefield, you may gain 1 life."),
  record(
    "Storm-Kiln Artist",
    "Magecraft - Whenever you cast or copy an instant or sorcery spell, create a Treasure token.",
  ),
  record("Talrand, Sky Summoner", "Whenever you cast an instant or sorcery spell, create a 2/2 blue Drake creature token with flying."),
  record("Thermo-Alchemist", "Defender\nWhenever you cast an instant or sorcery spell, untap Thermo-Alchemist.\n{T}: Thermo-Alchemist deals 1 damage to each opponent."),
  record("Third Path Iconoclast", "Whenever you cast a noncreature spell, create a 1/1 colorless Soldier artifact creature token."),
  record("Young Pyromancer", "Whenever you cast an instant or sorcery spell, create a 1/1 red Elemental creature token."),
].sort((left, right) => left.name.localeCompare(right.name));

function listLikeRealIndex(options: {
  limit?: number;
  recordFilter?: (record: CardRecordMin) => boolean;
  includeEmptyOracleText?: boolean;
} = {}): readonly CardRecordMin[] {
  const limit = typeof options.limit === "number" ? Math.max(0, Math.floor(options.limit)) : 200;
  const accepted: CardRecordMin[] = [];
  for (const candidate of corpus) {
    if (!options.includeEmptyOracleText && !candidate.oracle_text?.trim()) {
      continue;
    }
    if (options.recordFilter && !options.recordFilter(candidate)) {
      continue;
    }
    accepted.push(candidate);
    if (accepted.length >= limit) {
      break;
    }
  }
  return accepted;
}

async function retrieveFor(name: string) {
  return retrieveBoundedDeckContextCandidates({
    anchors: [anchor(name)],
    presentCards: [{ nameNorm: normalize(name), oracleId: `oracle-${normalize(name)}` }],
    baseUrl: "http://cards.test",
  });
}

describe("deck-context external candidate retrieval pre-ranking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    retrievalTesting.resetPreparedCorpusCache();
    mocks.lookupCard.mockImplementation(async (name: string) => {
      return corpus.find((candidate) => candidate.name === name) ?? null;
    });
    mocks.listCardsIndexRecords.mockImplementation(async (options) => listLikeRealIndex(options));
    mocks.getCardsIndexRecordsSourceSnapshot.mockImplementation(async (options) => ({
      sourceIdentity: { generation: 1, cacheKey: "http://cards.test" },
      records: listLikeRealIndex(options),
    }));
  });

  test("ranks a bounded eligible window before adapter truncation", async () => {
    const result = await retrieveFor("Guttersnipe");
    const names = result.candidates.map((candidate) => candidate.card.name);
    const first20 = names.slice(0, 20);
    const relevantNames = [
      "Firebrand Archer",
      "Kessig Flamebreather",
      "Storm-Kiln Artist",
      "Talrand, Sky Summoner",
      "Thermo-Alchemist",
      "Third Path Iconoclast",
      "Young Pyromancer",
    ];

    expect(names.length).toBeGreaterThan(0);
    expect(names).not.toContain("Guttersnipe");
    expect(first20.filter((name) => name.startsWith("A")).length).toBeLessThan(10);
    expect(relevantNames.filter((name) => first20.includes(name)).length).toBeGreaterThanOrEqual(5);

    const broadWindowCall = mocks.getCardsIndexRecordsSourceSnapshot.mock.calls.find(
      ([options]) => options?.limit === 24576,
    );
    expect(broadWindowCall).toBeTruthy();
    const oldPrefix = corpus.slice(0, 48);
    expect(oldPrefix.every((candidate) => candidate.name.startsWith("A"))).toBe(true);
    expect(relevantNames.some((name) => oldPrefix.some((candidate) => candidate.name === name))).toBe(false);
    expect(relevantNames.some((name) => names.includes(name))).toBe(true);
  });

  test("produces distinct bounded profiles for related and contrasting anchors", async () => {
    const guttersnipe = await retrieveFor("Guttersnipe");
    const pyromancer = await retrieveFor("Young Pyromancer");
    const company = await retrieveFor("Collected Company");
    const soulWarden = await retrieveFor("Soul Warden");

    const profile = (names: readonly string[]) => names.slice(0, 10).join("|");
    const guttersnipeNames = guttersnipe.candidates.map((candidate) => candidate.card.name);
    const pyromancerNames = pyromancer.candidates.map((candidate) => candidate.card.name);
    const companyNames = company.candidates.map((candidate) => candidate.card.name);
    const soulWardenNames = soulWarden.candidates.map((candidate) => candidate.card.name);

    expect(profile(pyromancerNames)).not.toEqual(profile(guttersnipeNames));
    expect(profile(companyNames)).not.toEqual(profile(guttersnipeNames));
    expect(profile(soulWardenNames)).not.toEqual(profile(guttersnipeNames));
    expect(mocks.getCardsIndexRecordsSourceSnapshot.mock.calls.every(([options]) => options?.limit === 24576)).toBe(true);
  });

  test("reuses one prepared candidate corpus across multiple anchors in one retrieval", async () => {
    rankingTesting.resetFeaturePreparationCounters();
    const result = await retrieveBoundedDeckContextCandidates({
      anchors: [anchor("Guttersnipe"), anchor("Young Pyromancer"), anchor("Collected Company")],
      presentCards: [
        { nameNorm: normalize("Guttersnipe"), oracleId: "oracle-guttersnipe" },
        { nameNorm: normalize("Young Pyromancer"), oracleId: "oracle-youngpyromancer" },
        { nameNorm: normalize("Collected Company"), oracleId: "oracle-collectedcompany" },
      ],
      baseUrl: "http://cards.test",
    });

    const names = result.candidates.map((candidate) => candidate.card.name);
    expect(names.length).toBeGreaterThan(0);
    expect(names).not.toContain("Guttersnipe");
    expect(names).not.toContain("Young Pyromancer");
    expect(names).not.toContain("Collected Company");
    expect(new Set(names).size).toBe(names.length);
    expect(mocks.getCardsIndexRecordsSourceSnapshot).toHaveBeenCalledTimes(1);
    expect(mocks.getCardsIndexRecordsSourceSnapshot.mock.calls[0]?.[0]).toMatchObject({
      baseUrl: "http://cards.test",
      limit: 24576,
      includeEmptyOracleText: false,
    });
    expect(rankingTesting.getFeaturePreparationCounters().candidate).toBe(corpus.length);
  });
});
