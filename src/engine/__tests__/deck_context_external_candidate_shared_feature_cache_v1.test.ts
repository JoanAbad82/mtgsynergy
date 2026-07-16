import { describe, expect, test } from "vitest";
import type { CardRecordMin } from "../cards/types";
import {
  __testing,
  prepareDeckContextCandidateFeatureCorpus,
  rankDeckContextCandidateRecords,
  rankPreparedDeckContextCandidateRecords,
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

const corpus = [
  record("Zephyr Adept", "Whenever you cast a noncreature spell, Zephyr Adept deals 1 damage to each opponent."),
  record("Amber Adept", "Whenever you cast a noncreature spell, Amber Adept deals 1 damage to each opponent."),
  record("Young Pyromancer", "Whenever you cast an instant or sorcery spell, create a 1/1 red Elemental creature token."),
  record("Storm-Kiln Artist", "Magecraft - Whenever you cast or copy an instant or sorcery spell, create a Treasure token."),
  record("Collected Company", "Look at the top six cards of your library. Put up to two creature cards with mana value 3 or less from among them onto the battlefield.", "Instant"),
  record("Alpha Generic", "Target creature gets +1/+1 until end of turn. Activate only as a sorcery."),
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

describe("deck-context shared candidate feature cache", () => {
  test("prepares candidate features once and reuses them across anchors", () => {
    __testing.resetFeaturePreparationCounters();
    const prepared = prepareDeckContextCandidateFeatureCorpus(corpus);
    expect(__testing.getFeaturePreparationCounters().candidate).toBe(corpus.length);

    const first = rankPreparedDeckContextCandidateRecords(guttersnipeSeed, prepared);
    const second = rankPreparedDeckContextCandidateRecords(pyromancerSeed, prepared);
    expect(first.length).toBe(corpus.length);
    expect(second.length).toBe(corpus.length);
    expect(__testing.getFeaturePreparationCounters().candidate).toBe(corpus.length);
  });

  test("prepared ranking matches direct ranking and remains source-order independent", () => {
    __testing.resetFeaturePreparationCounters();
    const preparedForward = prepareDeckContextCandidateFeatureCorpus(corpus);
    const preparedReverse = prepareDeckContextCandidateFeatureCorpus([...corpus].reverse());

    expect(rankPreparedDeckContextCandidateRecords(guttersnipeSeed, preparedForward).map((item) => item.record.name)).toEqual(
      rankDeckContextCandidateRecords(guttersnipeSeed, corpus).map((item) => item.record.name),
    );
    expect(rankPreparedDeckContextCandidateRecords(guttersnipeSeed, preparedForward).map((item) => item.record.name)).toEqual(
      rankPreparedDeckContextCandidateRecords(guttersnipeSeed, preparedReverse).map((item) => item.record.name),
    );
    expect(rankPreparedDeckContextCandidateRecords(guttersnipeSeed, preparedForward).map((item) => item.record.name).slice(0, 2)).toEqual([
      "Amber Adept",
      "Zephyr Adept",
    ]);
  });
});
