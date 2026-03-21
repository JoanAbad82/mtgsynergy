import { describe, expect, it } from "vitest";
import { lowerToAbilityIrMinV1 } from "../lowering/lower_to_ability_ir_min_v1";
import { parseSemanticIrV0 } from "../parser/sem_parser_v1";

type LegalityStaticAbilityRestrictionClassMinV1 =
  | "ONLY_DURING_YOUR_TURN"
  | "ONLY_ONCE_EACH_TURN"
  | "OTHER_STATIC_ABILITY_RESTRICTION_TEXT";

type LegalityStaticAbilityRestrictionMinV1 = {
  hasRestriction: true;
  restrictionClass: LegalityStaticAbilityRestrictionClassMinV1;
  sourceSpan: string;
};

type ParsedSemanticHints = {
  legality_static_ability_restrictions_min_v1?: LegalityStaticAbilityRestrictionMinV1;
};

describe("legality static ability restrictions minimum v1", () => {
  it("captures restricted activate-only wording and lowers 1:1", () => {
    const positives: Array<{ text: string; expected: LegalityStaticAbilityRestrictionMinV1 }> = [
      {
        text: "Activate only during your turn.",
        expected: {
          hasRestriction: true,
          restrictionClass: "ONLY_DURING_YOUR_TURN",
          sourceSpan: "Activate only during your turn",
        },
      },
      {
        text: "Activate only once each turn.",
        expected: {
          hasRestriction: true,
          restrictionClass: "ONLY_ONCE_EACH_TURN",
          sourceSpan: "Activate only once each turn",
        },
      },
      {
        text: "Activate only during combat.",
        expected: {
          hasRestriction: true,
          restrictionClass: "OTHER_STATIC_ABILITY_RESTRICTION_TEXT",
          sourceSpan: "Activate only during combat",
        },
      },
    ];

    for (const row of positives) {
      const parsed = parseSemanticIrV0({
        name: "Test Card",
        type_line: "Artifact",
        oracle_text: row.text,
      });
      const parsedHints = Reflect.get(parsed, "semantic_hints") as ParsedSemanticHints | undefined;
      expect(parsedHints?.legality_static_ability_restrictions_min_v1, row.text).toEqual(row.expected);

      const lowered = lowerToAbilityIrMinV1({
        name: "Crystal Ball",
        oracle_text: `{1}, {T}: Scry 2. ${row.text}`,
      });

      expect(lowered?.semantic_hints?.legality_static_ability_restrictions_min_v1, row.text).toEqual(row.expected);
      expect(lowered?.legality?.static_ability_restrictions_min_v1, row.text).toEqual(row.expected);
    }
  });

  it("does not capture out-of-scope activate-only families or text without restriction", () => {
    const negatives = [
      "Activate only as a sorcery.",
      "Activate only if you control an Island.",
      "{1}, {T}: Scry 2.",
    ] as const;

    for (const text of negatives) {
      const parsed = parseSemanticIrV0({
        name: "Test Card",
        type_line: "Artifact",
        oracle_text: text,
      });
      const parsedHints = Reflect.get(parsed, "semantic_hints") as ParsedSemanticHints | undefined;
      expect(parsedHints?.legality_static_ability_restrictions_min_v1, text).toBeUndefined();

      const lowered = lowerToAbilityIrMinV1({
        name: "Crystal Ball",
        oracle_text: `{1}, {T}: Scry 2. ${text}`,
      });
      expect(lowered?.semantic_hints?.legality_static_ability_restrictions_min_v1, text).toBeUndefined();
      expect(lowered?.legality?.static_ability_restrictions_min_v1, text).toBeUndefined();
    }
  });
});
