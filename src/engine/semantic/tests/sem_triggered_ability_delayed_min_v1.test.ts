import { describe, expect, it } from "vitest";
import { classifyTriggeredAbilityMinV1 } from "../parser/sem_parser_v1";

describe("triggered ability delayed min v1", () => {
  it("classifies narrow delayed-trigger creators as DELAYED", () => {
    const delayedCases = [
      {
        name: "Sneak Attack",
        oracle:
          "{R}: You may put a creature card from your hand onto the battlefield. That creature gains haste. Sacrifice that creature at the beginning of the next end step.",
      },
      {
        name: "Through the Breach",
        oracle:
          "You may put a creature card from your hand onto the battlefield. That creature gains haste. Sacrifice that creature at the beginning of the next end step.",
      },
      {
        name: "Goryo's Vengeance",
        oracle:
          "Return target legendary creature card from your graveyard to the battlefield. That creature gains haste. Exile it at the beginning of the next end step.",
      },
      {
        name: "Twinflame",
        oracle:
          "For each target creature, create a token that's a copy of that creature. It gains haste. Exile the token at the beginning of the next end step.",
      },
    ] as const;

    for (const row of delayedCases) {
      const classified = classifyTriggeredAbilityMinV1(row.oracle);
      expect(classified.is_triggered, row.name).toBe(true);
      expect(classified.class, row.name).toBe("DELAYED");
      expect(classified.fallback, row.name).toBeNull();
    }
  });

  it("preserves guardrails for NORMAL, REFLEXIVE, and LINKED", () => {
    const guardrailCases = [
      {
        name: "Ball Lightning",
        oracle: "Trample, haste. At the beginning of the end step, sacrifice Ball Lightning.",
        expectedClass: "NORMAL",
        expectedFallback: null,
      },
      {
        name: "Heart-Piercer Manticore",
        oracle:
          "When Heart-Piercer Manticore enters the battlefield, you may sacrifice another creature. When you do, Heart-Piercer Manticore deals damage equal to that creature's power to any target.",
        expectedClass: "REFLEXIVE",
        expectedFallback: null,
      },
      {
        name: "Oblivion Ring",
        oracle:
          "When Oblivion Ring enters the battlefield, exile another target nonland permanent. When Oblivion Ring leaves the battlefield, return the exiled card to the battlefield under its owner's control.",
        expectedClass: "NONE",
        expectedFallback: "LINKED",
      },
    ] as const;

    for (const row of guardrailCases) {
      const classified = classifyTriggeredAbilityMinV1(row.oracle);
      expect(classified.is_triggered, row.name).toBe(true);
      expect(classified.class, row.name).toBe(row.expectedClass);
      expect(classified.fallback, row.name).toBe(row.expectedFallback);
    }
  });
});
