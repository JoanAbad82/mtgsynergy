import { describe, expect, it } from "vitest";
import { classifyReplacementPreventionMinV1 } from "../parser/sem_parser_v1";

describe("replacement / prevention min v1", () => {
  it("classifies narrow replacement and prevention wording", () => {
    const cases = [
      {
        name: "Rest in Peace",
        oracle:
          "If a card or token would be put into a graveyard from anywhere, exile it instead.",
        expected: "REPLACEMENT",
      },
      {
        name: "Leyline of the Void",
        oracle:
          "If a card would be put into an opponent's graveyard from anywhere, exile it instead.",
        expected: "REPLACEMENT",
      },
      {
        name: "As Enters Replacement Sample",
        oracle:
          "As this enters the battlefield, choose a color.",
        expected: "REPLACEMENT",
      },
      {
        name: "Fog",
        oracle: "Prevent all combat damage that would be dealt this turn.",
        expected: "PREVENTION",
      },
      {
        name: "Healing Salve",
        oracle:
          "Choose one — Target player gains 3 life; or prevent the next 3 damage that would be dealt to any target this turn.",
        expected: "PREVENTION",
      },
    ] as const;

    for (const row of cases) {
      expect(classifyReplacementPreventionMinV1(row.oracle), row.name).toBe(row.expected);
    }
  });

  it("does not classify unrelated cards as replacement/prevention", () => {
    const guardrails = [
      {
        name: "Oblivion Ring",
        oracle:
          "When Oblivion Ring enters the battlefield, exile another target nonland permanent. When Oblivion Ring leaves the battlefield, return the exiled card to the battlefield under its owner's control.",
      },
      {
        name: "Heart-Piercer Manticore",
        oracle:
          "When Heart-Piercer Manticore enters the battlefield, you may sacrifice another creature. When you do, Heart-Piercer Manticore deals damage equal to that creature's power to any target.",
      },
      {
        name: "Glorious Anthem",
        oracle:
          "Creatures you control get +1/+1.",
      },
    ] as const;

    for (const row of guardrails) {
      expect(classifyReplacementPreventionMinV1(row.oracle), row.name).toBeNull();
    }
  });
});
