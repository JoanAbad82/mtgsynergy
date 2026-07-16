import { describe, expect, test } from "vitest";
import type { CardRecordMin } from "../cards/types";
import {
  __testing,
  doesPreparedDeckContextLexicalFilterMatch,
  prepareDeckContextAnchorLexicalFilterTokens,
  prepareDeckContextCandidateFeatureCorpus,
  rankPreparedDeckContextCandidateRecordsForSeedsTopK,
} from "../deck_context/external_card_candidate_ranking_v1";

const stopWords = new Set([
  "a", "an", "and", "as", "at", "card", "cards", "each", "for", "from",
  "has", "have", "if", "in", "into", "is", "it", "of", "on", "or",
  "other", "put", "that", "the", "then", "this", "to", "up", "with",
  "you", "your",
]);

const normalize = (name: string): string => name.toLowerCase().replace(/[^a-z0-9]+/g, "");

const record = (
  name: string,
  oracleText: string | null,
  typeLine = "Creature",
  keywords?: readonly string[],
): CardRecordMin => ({
  oracle_id: `oracle-${normalize(name)}`,
  name,
  name_norm: normalize(name),
  type_line: typeLine,
  oracle_text: oracleText,
  cmc: 2,
  ...(keywords ? { keywords } : {}),
});

function normalizeFilterToken(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function collectOldFilterTokens(value: unknown, target: Set<string>): void {
  if (typeof value === "string") {
    for (const token of normalizeFilterToken(value).split(/\s+/)) {
      if (token.length >= 3 && !stopWords.has(token) && !/^\d+$/.test(token)) {
        target.add(token);
      }
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectOldFilterTokens(item, target);
    }
  }
}

function oldSeedRecordFilter(seed: {
  name: string;
  typeLine?: string | null;
  oracleText?: string | null;
}): ((candidate: CardRecordMin) => boolean) | undefined {
  const seedTokens = new Set<string>();
  collectOldFilterTokens(seed.name, seedTokens);
  collectOldFilterTokens(seed.typeLine, seedTokens);
  collectOldFilterTokens(seed.oracleText, seedTokens);

  if (seedTokens.size === 0) {
    return undefined;
  }

  return (candidate) => {
    const recordTokens = new Set<string>();
    collectOldFilterTokens(candidate.name, recordTokens);
    collectOldFilterTokens(candidate.type_line, recordTokens);
    collectOldFilterTokens(candidate.oracle_text, recordTokens);
    collectOldFilterTokens(candidate.keywords, recordTokens);

    for (const token of recordTokens) {
      if (seedTokens.has(token)) {
        return true;
      }
    }
    return false;
  };
}

describe("deck-context lexical filter token cache", () => {
  test("prepares exact immutable candidate tokens once per record", () => {
    __testing.resetFeaturePreparationCounters();
    const corpus = prepareDeckContextCandidateFeatureCorpus([
      record(
        "Élite Élite 123",
        "You and your café create 123 tokens. Café!",
        "Legendary Créature - Wizard",
        ["Prowess", "Prowess", "Haste"],
      ),
    ]);

    const tokens = corpus.records[0].lexicalFilterTokens;
    expect(tokens).toEqual([
      "cafe",
      "create",
      "creature",
      "elite",
      "haste",
      "legendary",
      "prowess",
      "tokens",
      "wizard",
    ]);
    expect(Object.isFrozen(tokens)).toBe(true);
    expect(__testing.getFeaturePreparationCounters()).toMatchObject({
      candidate: 1,
      candidateLexical: 1,
    });
  });

  test("prepares anchor tokens once per anchor and reuses candidate tokens in hot path", () => {
    __testing.resetFeaturePreparationCounters();
    const corpus = prepareDeckContextCandidateFeatureCorpus([
      record("Young Pyromancer", "Whenever you cast an instant or sorcery spell, create a token.", "Creature", ["Prowess"]),
      record("Blank", null, null as unknown as string),
    ]);
    const anchorTokens = prepareDeckContextAnchorLexicalFilterTokens({
      name: "Guttersnipe",
      typeLine: "Creature - Goblin Shaman",
      oracleText: "Whenever you cast an instant or sorcery spell, Guttersnipe deals 2 damage.",
    });

    expect(anchorTokens).toBeTruthy();
    expect(doesPreparedDeckContextLexicalFilterMatch(corpus.records[0].lexicalFilterTokens, anchorTokens!)).toBe(true);
    expect(doesPreparedDeckContextLexicalFilterMatch(corpus.records[1].lexicalFilterTokens, anchorTokens!)).toBe(false);
    expect(__testing.getFeaturePreparationCounters()).toMatchObject({
      candidateLexical: 2,
      anchorLexical: 1,
      hotPathCandidateNormalization: 0,
      hotPathCandidateSetReconstruction: 0,
    });
  });

  test("matches the old mirrored predicate including empty anchor-token fallback", () => {
    __testing.resetFeaturePreparationCounters();
    const candidates = [
      record("Pyromancer's Café", "Create a 1/1 token whenever you cast a spell.", "Créature", ["Magecraft"]),
      record("Numeric Ritual", "123 456.", "999", ["2024"]),
      record("Stop Words", "you and your card then this", "Card"),
      record("Soul Warden", "Whenever another creature enters the battlefield, you gain 1 life."),
    ];
    const seeds = [
      {
        name: "Young Pyromancer",
        typeLine: "Creature - Human Shaman",
        oracleText: "Whenever you cast an instant or sorcery spell, create a 1/1 red Elemental creature token.",
      },
      { name: "if as the", typeLine: "123", oracleText: "you your" },
    ];
    const corpus = prepareDeckContextCandidateFeatureCorpus(candidates);

    for (const seed of seeds) {
      const oldFilter = oldSeedRecordFilter(seed);
      const anchorTokens = prepareDeckContextAnchorLexicalFilterTokens(seed);
      for (const prepared of corpus.records) {
        const oldAccepted = oldFilter ? oldFilter(prepared.record) : true;
        const newAccepted = anchorTokens
          ? doesPreparedDeckContextLexicalFilterMatch(prepared.lexicalFilterTokens, anchorTokens)
          : true;
        expect(newAccepted).toBe(oldAccepted);
      }
    }
  });

  test("top-k accepts the prepared lexical predicate without record reconstruction", () => {
    __testing.resetFeaturePreparationCounters();
    const seed = {
      name: "Guttersnipe",
      typeLine: "Creature - Goblin Shaman",
      oracleText: "Whenever you cast an instant or sorcery spell, Guttersnipe deals 2 damage to each opponent.",
    };
    const corpus = prepareDeckContextCandidateFeatureCorpus([
      record("Young Pyromancer", "Whenever you cast an instant or sorcery spell, create a 1/1 red Elemental creature token."),
      record("Forest Shrine", "Add green mana.", "Land"),
    ]);
    const anchorTokens = prepareDeckContextAnchorLexicalFilterTokens(seed)!;
    const ranked = rankPreparedDeckContextCandidateRecordsForSeedsTopK(
      [{
        key: "guttersnipe",
        seed,
        limit: 8,
        preparedRecordFilter: (prepared) =>
          doesPreparedDeckContextLexicalFilterMatch(prepared.lexicalFilterTokens, anchorTokens),
      }],
      corpus,
    ).get("guttersnipe")!;

    expect(ranked.map((item) => item.record.name)).toEqual(["Young Pyromancer"]);
    expect(__testing.getFeaturePreparationCounters()).toMatchObject({
      candidateLexical: 2,
      anchorLexical: 1,
      corpusPass: 1,
      fullSort: 0,
      topK: 1,
      hotPathCandidateNormalization: 0,
      hotPathCandidateSetReconstruction: 0,
    });
  });
});
