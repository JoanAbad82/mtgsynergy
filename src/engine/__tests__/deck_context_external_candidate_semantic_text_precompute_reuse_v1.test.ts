import { describe, expect, test } from "vitest";
import type { CardRecordMin } from "../cards/types";
import {
  __testing,
  prepareDeckContextCandidateFeatureCorpus,
  rankPreparedDeckContextCandidateRecords,
  rankPreparedDeckContextCandidateRecordsForSeedsTopK,
} from "../deck_context/external_card_candidate_ranking_v1";

const normalize = (name: string): string => name.toLowerCase().replace(/[^a-z0-9]+/g, "");

const record = (name: string, oracleText: string, typeLine = "Creature"): CardRecordMin => ({
  oracle_id: `oracle-${normalize(name)}`,
  name,
  name_norm: normalize(name),
  type_line: typeLine,
  oracle_text: oracleText,
  cmc: 3,
});

const candidates = [
  record("Young Pyromancer", "Whenever you cast an instant or sorcery spell, create a 1/1 red Elemental creature token."),
  record("Guttersnipe", "Whenever you cast an instant or sorcery spell, Guttersnipe deals 2 damage to each opponent."),
  record("Alpha Generic", "Target creature gets +1/+1 until end of turn. Activate only as a sorcery."),
  record("Storm-Kiln Artist", "Magecraft - Whenever you cast or copy an instant or sorcery spell, create a Treasure token."),
  record("Collected Company", "Look at the top six cards of your library. Put up to two creature cards with mana value 3 or less from among them onto the battlefield.", "Instant"),
];

const guttersnipeSeed = {
  name: "Guttersnipe",
  typeLine: "Creature - Goblin Shaman",
  oracleText:
    "Whenever you cast an instant or sorcery spell, Guttersnipe deals 2 damage to each opponent.",
};

const pyromancerSeed = {
  name: "Young Pyromancer",
  typeLine: "Creature - Human Shaman",
  oracleText:
    "Whenever you cast an instant or sorcery spell, create a 1/1 red Elemental creature token.",
};

const comparable = (items: ReturnType<typeof rankPreparedDeckContextCandidateRecords>) =>
  items.map((item) => ({
    name: item.record.name,
    score: item.score,
    sourceIndex: item.sourceIndex,
    reasons: item.reasons,
  }));

describe("deck-context candidate semantic-text precompute and reuse", () => {
  test("product corpus preparation computes candidate semantic text once per record", () => {
    __testing.resetFeaturePreparationCounters();

    const prepared = prepareDeckContextCandidateFeatureCorpus(candidates);

    expect(prepared.records).toHaveLength(candidates.length);
    expect(prepared.records.every((item) => item.semanticText)).toBe(true);
    expect(__testing.getFeaturePreparationCounters()).toMatchObject({
      candidate: candidates.length,
      candidateSemanticText: candidates.length,
      candidateLexical: candidates.length,
      hotPathCandidateSemanticTextFallback: 0,
    });
  });

  test("multi-anchor top-k reuses prepared candidate semantic text in the hot path", () => {
    __testing.resetFeaturePreparationCounters();
    const prepared = prepareDeckContextCandidateFeatureCorpus(candidates);
    const afterPrepare = __testing.getFeaturePreparationCounters();

    const ranked = rankPreparedDeckContextCandidateRecordsForSeedsTopK(
      [
        { key: "guttersnipe", seed: guttersnipeSeed, limit: 3 },
        { key: "pyromancer", seed: pyromancerSeed, limit: 3 },
      ],
      prepared,
    );

    expect(ranked.get("guttersnipe")!.map((item) => item.record.name)).toEqual([
      "Guttersnipe",
      "Storm-Kiln Artist",
      "Young Pyromancer",
    ]);
    expect(ranked.get("pyromancer")!.map((item) => item.record.name)).toEqual([
      "Storm-Kiln Artist",
      "Young Pyromancer",
      "Guttersnipe",
    ]);
    expect(__testing.getFeaturePreparationCounters()).toMatchObject({
      candidateSemanticText: afterPrepare.candidateSemanticText,
      hotPathCandidateSemanticTextFallback: 0,
      corpusPass: 1,
      topK: 1,
      fullSort: 0,
    });
  });

  test("fallback compatibility is bounded to manually constructed prepared records", () => {
    const prepared = prepareDeckContextCandidateFeatureCorpus(candidates);
    const manualLegacyCorpus = prepared.records.map(({
      record,
      sourceIndex,
      features,
      lexicalFilterTokens,
    }) => ({
      record,
      sourceIndex,
      features,
      lexicalFilterTokens,
    }));

    __testing.resetFeaturePreparationCounters();
    const current = comparable(rankPreparedDeckContextCandidateRecords(guttersnipeSeed, prepared));
    expect(__testing.getFeaturePreparationCounters().hotPathCandidateSemanticTextFallback).toBe(0);

    __testing.resetFeaturePreparationCounters();
    const fallback = comparable(rankPreparedDeckContextCandidateRecords(guttersnipeSeed, manualLegacyCorpus));
    expect(fallback).toEqual(current);
    expect(__testing.getFeaturePreparationCounters()).toMatchObject({
      candidateSemanticText: 0,
      hotPathCandidateSemanticTextFallback: candidates.length,
    });
  });

  test("prepared and fallback top-k preserve scores, reasons, order, source indices, and lexical behavior", () => {
    const prepared = prepareDeckContextCandidateFeatureCorpus(candidates);
    const manualLegacyCorpus = prepared.records.map(({
      record,
      sourceIndex,
      features,
      lexicalFilterTokens,
    }) => ({
      record,
      sourceIndex,
      features,
      lexicalFilterTokens,
    }));
    const requests = [
      { key: "guttersnipe", seed: guttersnipeSeed, limit: 4 },
      { key: "pyromancer", seed: pyromancerSeed, limit: 4 },
    ];

    __testing.resetFeaturePreparationCounters();
    const current = rankPreparedDeckContextCandidateRecordsForSeedsTopK(requests, prepared);
    expect(__testing.getFeaturePreparationCounters().hotPathCandidateSemanticTextFallback).toBe(0);

    __testing.resetFeaturePreparationCounters();
    const fallback = rankPreparedDeckContextCandidateRecordsForSeedsTopK(requests, manualLegacyCorpus);
    expect(__testing.getFeaturePreparationCounters().hotPathCandidateSemanticTextFallback).toBe(
      candidates.length * requests.length,
    );

    for (const request of requests) {
      expect(comparable(fallback.get(request.key)!)).toEqual(comparable(current.get(request.key)!));
    }
  });
});
