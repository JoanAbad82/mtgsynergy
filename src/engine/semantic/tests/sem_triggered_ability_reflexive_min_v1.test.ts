import { describe, expect, it } from "vitest";
import { classifyTriggeredAbilityMinV1 } from "../parser/sem_parser_v1";

describe("triggered ability reflexive min v1", () => {
  it("classifies narrow reflexive patterns as explicit REFLEXIVE", () => {
    const reflexiveCases = [
      {
        name: "Heart-Piercer Manticore",
        oracle:
          "When Heart-Piercer Manticore enters the battlefield, you may sacrifice another creature. When you do, Heart-Piercer Manticore deals damage equal to that creature's power to any target.",
      },
      {
        name: "Dream Eater",
        oracle:
          "Flash. Flying. When Dream Eater enters the battlefield, surveil 4. When you do, you may return target nonland permanent an opponent controls to its owner's hand.",
      },
    ] as const;

    for (const row of reflexiveCases) {
      const classified = classifyTriggeredAbilityMinV1(row.oracle);
      expect(classified.is_triggered, row.name).toBe(true);
      expect(classified.class, row.name).toBe("REFLEXIVE");
      expect(classified.fallback, row.name).toBeNull();
    }
  });

  it("preserves guardrails for delayed, linked, and normal", () => {
    const guardrailCases = [
      {
        name: "Sneak Attack",
        oracle:
          "{R}: You may put a creature card from your hand onto the battlefield. That creature gains haste. Sacrifice that creature at the beginning of the next end step.",
        expectedClass: "DELAYED",
        expectedFallback: null,
      },
      {
        name: "Oblivion Ring",
        oracle:
          "When Oblivion Ring enters the battlefield, exile another target nonland permanent. When Oblivion Ring leaves the battlefield, return the exiled card to the battlefield under its owner's control.",
        expectedClass: "NONE",
        expectedFallback: "LINKED",
      },
      {
        name: "Ball Lightning",
        oracle: "Trample, haste. At the beginning of the end step, sacrifice Ball Lightning.",
        expectedClass: "NORMAL",
        expectedFallback: null,
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
