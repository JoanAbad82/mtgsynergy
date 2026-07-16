import { describe, expect, test } from "vitest";
import { rankDeckContextCandidateRecords } from "../deck_context/external_card_candidate_ranking_v1";
import type { CardRecordMin } from "../cards/types";

const record = (name: string, oracleText: string, typeLine = "Creature"): CardRecordMin => ({
  name,
  name_norm: name.toLowerCase().replace(/[^a-z0-9]+/g, ""),
  type_line: typeLine,
  oracle_text: oracleText,
  cmc: 2,
});

describe("deck-context external candidate pre-ranking", () => {
  const seed = {
    name: "Guttersnipe",
    typeLine: "Creature - Goblin Shaman",
    oracleText:
      "Whenever you cast an instant or sorcery spell, Guttersnipe deals 2 damage to each opponent.",
  };

  const eligible = [
    record("Alpha Generic", "Target creature gets +1/+1 until end of turn. Activate only as a sorcery."),
    record("Beta Reminder", "Prowess (Whenever you cast a noncreature spell, this creature gets +1/+1 until end of turn.)"),
    record("Firebrand Archer", "Whenever you cast a noncreature spell, Firebrand Archer deals 1 damage to each opponent."),
    record("Kessig Flamebreather", "Whenever you cast a noncreature spell, Kessig Flamebreather deals 1 damage to each opponent."),
    record("Storm-Kiln Artist", "Magecraft - Whenever you cast or copy an instant or sorcery spell, create a Treasure token."),
    record("Aardvark Generic", "Add one mana of any color. Target creature gains haste until end of turn."),
  ];

  test("is independent of source order and penalizes incidental lexical matches", () => {
    const forward = rankDeckContextCandidateRecords(seed, eligible);
    const reverse = rankDeckContextCandidateRecords(seed, [...eligible].reverse());

    expect(forward.map((item) => item.record.name)).toEqual(
      reverse.map((item) => item.record.name),
    );
    expect(new Set(forward.slice(0, 3).map((item) => item.record.name))).toEqual(
      new Set(["Storm-Kiln Artist", "Firebrand Archer", "Kessig Flamebreather"]),
    );
    expect(forward.findIndex((item) => item.record.name === "Beta Reminder")).toBeGreaterThan(
      forward.findIndex((item) => item.record.name === "Kessig Flamebreather"),
    );
    expect(forward.findIndex((item) => item.record.name === "Alpha Generic")).toBeGreaterThan(
      forward.findIndex((item) => item.record.name === "Firebrand Archer"),
    );
  });

  test("uses deterministic tie-breaking instead of source order", () => {
    const tied = [
      record("Zephyr Adept", "Whenever you cast a noncreature spell, Zephyr Adept deals 1 damage to each opponent."),
      record("Amber Adept", "Whenever you cast a noncreature spell, Amber Adept deals 1 damage to each opponent."),
    ];

    expect(rankDeckContextCandidateRecords(seed, tied).map((item) => item.record.name)).toEqual([
      "Amber Adept",
      "Zephyr Adept",
    ]);
    expect(rankDeckContextCandidateRecords(seed, [...tied].reverse()).map((item) => item.record.name)).toEqual([
      "Amber Adept",
      "Zephyr Adept",
    ]);
  });
});
