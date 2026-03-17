import { describe, expect, it } from "vitest";
import { classifyLinkedAbilityMinV1 } from "../parser/sem_parser_v1";

describe("linked ability min v1", () => {
  it("classifies narrow linked ability patterns as LINKED", () => {
    const positives = [
      {
        name: "Oblivion Ring",
        oracle:
          "When Oblivion Ring enters the battlefield, exile another target nonland permanent. When Oblivion Ring leaves the battlefield, return the exiled card to the battlefield under its owner's control.",
      },
      {
        name: "Banishing Light",
        oracle:
          "When Banishing Light enters the battlefield, exile target nonland permanent an opponent controls until Banishing Light leaves the battlefield.",
      },
      {
        name: "Fiend Hunter",
        oracle:
          "When Fiend Hunter enters the battlefield, you may exile another target creature. When Fiend Hunter leaves the battlefield, return the exiled card to the battlefield under its owner's control.",
      },
      {
        name: "Elite Spellbinder",
        oracle:
          "When Elite Spellbinder enters the battlefield, look at target opponent's hand. You may exile a nonland card from it. For as long as that card remains exiled, its owner may play it.",
      },
    ] as const;

    for (const row of positives) {
      expect(classifyLinkedAbilityMinV1(row.oracle), row.name).toBe("LINKED");
    }
  });

  it("does not classify unrelated cards as linked", () => {
    const negatives = [
      {
        name: "Rest in Peace",
        oracle:
          "If a card or token would be put into a graveyard from anywhere, exile it instead.",
      },
      {
        name: "Fog",
        oracle: "Prevent all combat damage that would be dealt this turn.",
      },
      {
        name: "Heart-Piercer Manticore",
        oracle:
          "When Heart-Piercer Manticore enters the battlefield, you may sacrifice another creature. When you do, Heart-Piercer Manticore deals damage equal to that creature's power to any target.",
      },
      {
        name: "Sneak Attack",
        oracle:
          "{R}: You may put a creature card from your hand onto the battlefield. That creature gains haste. Sacrifice that creature at the beginning of the next end step.",
      },
    ] as const;

    for (const row of negatives) {
      expect(classifyLinkedAbilityMinV1(row.oracle), row.name).toBeNull();
    }
  });
});
