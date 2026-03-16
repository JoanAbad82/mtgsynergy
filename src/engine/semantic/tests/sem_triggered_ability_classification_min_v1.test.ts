import { describe, expect, it } from "vitest";
import { classifyTriggeredAbilityMinV1 } from "../parser/sem_parser_v1";

describe("triggered ability classification min v1", () => {
  it("classifies focal corpus as NORMAL / INTERVENING_IF / ZONE_CHANGE with explicit fallbacks", () => {
    const cases = [
      {
        name: "Ajani's Pridemate",
        oracle:
          "Whenever you gain life, put a +1/+1 counter on Ajani's Pridemate.",
        expectedClass: "NORMAL",
        expectedFallback: null,
      },
      {
        name: "Resplendent Angel",
        oracle:
          "At the beginning of each end step, if you gained 5 or more life this turn, create a 4/4 white Angel creature token with flying and vigilance.",
        expectedClass: "INTERVENING_IF",
        expectedFallback: null,
      },
      {
        name: "Doomed Dissenter",
        oracle:
          "When Doomed Dissenter dies, create a 2/2 black Zombie creature token.",
        expectedClass: "ZONE_CHANGE",
        expectedFallback: null,
      },
      {
        name: "Blood Artist",
        oracle:
          "Whenever Blood Artist or another creature dies, target player loses 1 life and you gain 1 life.",
        expectedClass: "ZONE_CHANGE",
        expectedFallback: null,
      },
      {
        name: "Heart-Piercer Manticore",
        oracle:
          "When Heart-Piercer Manticore enters the battlefield, you may sacrifice another creature. When you do, Heart-Piercer Manticore deals damage equal to that creature's power to any target.",
        expectedClass: "NONE",
        expectedFallback: "REFLEXIVE",
      },
      {
        name: "Oblivion Ring",
        oracle:
          "When Oblivion Ring enters the battlefield, exile another target nonland permanent. When Oblivion Ring leaves the battlefield, return the exiled card to the battlefield under its owner's control.",
        expectedClass: "NONE",
        expectedFallback: "LINKED",
      },
      {
        name: "At-End Trigger Sample",
        oracle:
          "At end of combat, untap target creature.",
        expectedClass: "NORMAL",
        expectedFallback: null,
      },
    ] as const;

    for (const row of cases) {
      const classified = classifyTriggeredAbilityMinV1(row.oracle);
      expect(classified.is_triggered, row.name).toBe(true);
      expect(classified.class, row.name).toBe(row.expectedClass);
      expect(classified.fallback, row.name).toBe(row.expectedFallback);
    }
  });

  it("marks delayed triggered text as explicit DELAYED class", () => {
    const delayedOracle = "At the beginning of the next end step, sacrifice that creature.";
    const classified = classifyTriggeredAbilityMinV1(delayedOracle);
    expect(classified.is_triggered).toBe(true);
    expect(classified.class).toBe("DELAYED");
    expect(classified.fallback).toBeNull();
  });
});
