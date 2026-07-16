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
  cmc: 2,
});

const seed = {
  name: "Guttersnipe",
  typeLine: "Creature - Goblin Shaman",
  oracleText:
    "Whenever you cast an instant or sorcery spell, Guttersnipe deals 2 damage to each opponent.",
};

const focalCorpus = [
  record("Zephyr Adept", "Whenever you cast a noncreature spell, Zephyr Adept deals 1 damage to each opponent."),
  record("Alpha Generic", "Target creature gets +1/+1 until end of turn. Activate only as a sorcery."),
  record("Young Pyromancer", "Whenever you cast an instant or sorcery spell, create a 1/1 red Elemental creature token."),
  record("Storm-Kiln Artist", "Magecraft - Whenever you cast or copy an instant or sorcery spell, create a Treasure token."),
  record("Collected Company", "Look at the top six cards of your library. Put up to two creature cards with mana value 3 or less from among them onto the battlefield.", "Instant"),
  record("Amber Adept", "Whenever you cast a noncreature spell, Amber Adept deals 1 damage to each opponent."),
  record("Beta Reminder", "Prowess (Whenever you cast a noncreature spell, this creature gets +1/+1 until end of turn.)"),
  record("Firebrand Archer", "Whenever you cast a noncreature spell, Firebrand Archer deals 1 damage to each opponent."),
  record("Kessig Flamebreather", "Whenever you cast a noncreature spell, Kessig Flamebreather deals 1 damage to each opponent."),
  record("Talrand, Sky Summoner", "Whenever you cast an instant or sorcery spell, create a 2/2 blue Drake creature token with flying."),
  record("Thermo-Alchemist", "Defender\nWhenever you cast an instant or sorcery spell, untap Thermo-Alchemist.\n{T}: Thermo-Alchemist deals 1 damage to each opponent."),
  record("Aardvark Generic", "Add one mana of any color. Target creature gains haste until end of turn."),
];

const shuffledCorpus = [
  focalCorpus[3],
  focalCorpus[8],
  focalCorpus[1],
  focalCorpus[10],
  focalCorpus[0],
  focalCorpus[6],
  focalCorpus[11],
  focalCorpus[4],
  focalCorpus[2],
  focalCorpus[7],
  focalCorpus[5],
  focalCorpus[9],
] as readonly CardRecordMin[];

function topKNames(records: readonly CardRecordMin[], limit: number): readonly string[] {
  const prepared = prepareDeckContextCandidateFeatureCorpus(records);
  return (
    rankPreparedDeckContextCandidateRecordsForSeedsTopK(
      [{ key: "guttersnipe", seed, limit }],
      prepared,
    ).get("guttersnipe") ?? []
  ).map((item) => item.record.name);
}

describe("deck-context deterministic bounded top-k", () => {
  test("matches the full-sort reference for deterministic focal corpora", () => {
    __testing.resetFeaturePreparationCounters();
    const prepared = prepareDeckContextCandidateFeatureCorpus(focalCorpus);
    const reference = rankPreparedDeckContextCandidateRecords(seed, prepared)
      .slice(0, 6)
      .map((item) => item.record.name);
    const optimized = (
      rankPreparedDeckContextCandidateRecordsForSeedsTopK(
        [{ key: "guttersnipe", seed, limit: 6 }],
        prepared,
      ).get("guttersnipe") ?? []
    ).map((item) => item.record.name);

    expect(optimized).toEqual(reference);
    expect(__testing.getFeaturePreparationCounters()).toMatchObject({
      fullSort: 1,
      topK: 1,
      corpusPass: 1,
    });
  });

  test("preserves tie ordering and source-order independence", () => {
    const expected = topKNames(focalCorpus, 8);
    expect(topKNames([...focalCorpus].reverse(), 8)).toEqual(expected);
    expect(topKNames(shuffledCorpus, 8)).toEqual(expected);
    expect(expected).toEqual(
      rankPreparedDeckContextCandidateRecords(seed, prepareDeckContextCandidateFeatureCorpus(focalCorpus))
        .slice(0, 8)
        .map((item) => item.record.name),
    );
    expect(expected.indexOf("Amber Adept")).toBeLessThan(expected.indexOf("Zephyr Adept"));
  });

  test("handles empty and small corpora", () => {
    expect(topKNames([], 6)).toEqual([]);
    expect(topKNames([focalCorpus[0]], 6)).toEqual(["Zephyr Adept"]);
    expect(topKNames([focalCorpus[0], focalCorpus[5]], 1)).toEqual(["Amber Adept"]);
    expect(topKNames(focalCorpus, 0)).toEqual([]);
  });
});
