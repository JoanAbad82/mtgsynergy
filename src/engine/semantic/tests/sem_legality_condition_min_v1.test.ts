import { describe, expect, it } from "vitest";
import { lowerToAbilityIrMinV1 } from "../lowering/lower_to_ability_ir_min_v1";
import { parseSemanticIrV0 } from "../parser/sem_parser_v1";

type LegalityConditionClassMinV1 =
  | "CONTROLS_X"
  | "OPPONENT_STATE"
  | "ATTACKED_THIS_TURN"
  | "OTHER_LEGALITY_TEXT";

type LegalityConditionMinV1 = {
  appliesTo: "ACTIVATE" | "CAST";
  hasCondition: true;
  conditionTextNormalized: string;
  conditionClass: LegalityConditionClassMinV1;
};

type ParsedSemanticHints = {
  legality_condition_min?: LegalityConditionMinV1;
};

describe("legality condition minimum v1", () => {
  it("captures explicit only-if legality conditions and lowers 1:1", () => {
    const positives: Array<{ text: string; expected: LegalityConditionMinV1 }> = [
      {
        text: "Activate only if you control an Island",
        expected: {
          appliesTo: "ACTIVATE",
          hasCondition: true,
          conditionTextNormalized: "you control an island",
          conditionClass: "CONTROLS_X",
        },
      },
      {
        text: "Cast this spell only if an opponent lost life this turn",
        expected: {
          appliesTo: "CAST",
          hasCondition: true,
          conditionTextNormalized: "an opponent lost life this turn",
          conditionClass: "OPPONENT_STATE",
        },
      },
      {
        text: "Activate only if you attacked this turn",
        expected: {
          appliesTo: "ACTIVATE",
          hasCondition: true,
          conditionTextNormalized: "you attacked this turn",
          conditionClass: "ATTACKED_THIS_TURN",
        },
      },
      {
        text: "Activate only if exactly seven cards are in your graveyard",
        expected: {
          appliesTo: "ACTIVATE",
          hasCondition: true,
          conditionTextNormalized: "exactly seven cards are in your graveyard",
          conditionClass: "OTHER_LEGALITY_TEXT",
        },
      },
    ];

    for (const row of positives) {
      const parsed = parseSemanticIrV0({
        name: "Test Card",
        type_line: "Instant",
        oracle_text: row.text,
      });
      const parsedHints = Reflect.get(parsed, "semantic_hints") as ParsedSemanticHints | undefined;
      expect(parsedHints?.legality_condition_min, row.text).toEqual(row.expected);

      const lowered = lowerToAbilityIrMinV1({
        name: "Crystal Ball",
        oracle_text: `{1}, {T}: Scry 2. ${row.text}.`,
      });
      expect(lowered, row.text).toBeTruthy();
      expect(lowered?.semantic_hints?.legality_condition_min, row.text).toEqual(row.expected);
      expect(lowered?.legality?.condition_min, row.text).toEqual(row.expected);
    }
  });

  it("does not capture out-of-scope legality or triggered if clauses", () => {
    const negatives = [
      "Activate only as a sorcery",
      "You may cast this from your graveyard",
      "Whenever this creature attacks, if you control an Island, draw a card",
    ] as const;

    for (const text of negatives) {
      const parsed = parseSemanticIrV0({
        name: "Test Card",
        type_line: "Instant",
        oracle_text: text,
      });
      const parsedHints = Reflect.get(parsed, "semantic_hints") as ParsedSemanticHints | undefined;
      expect(parsedHints?.legality_condition_min, text).toBeUndefined();

      const lowered = lowerToAbilityIrMinV1({
        name: "Crystal Ball",
        oracle_text: `{1}, {T}: Scry 2. ${text}.`,
      });
      expect(lowered?.semantic_hints?.legality_condition_min, text).toBeUndefined();
      expect(lowered?.legality?.condition_min, text).toBeUndefined();
    }
  });
});
