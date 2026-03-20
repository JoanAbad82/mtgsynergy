import { describe, expect, it } from "vitest";
import { lowerToAbilityIrMinV1 } from "../lowering/lower_to_ability_ir_min_v1";
import { parseSemanticIrV0 } from "../parser/sem_parser_v1";

type ParsedSemanticHints = {
  legality_action_binding_min?: "CAST_ONLY";
};

describe("legality action binding min v1", () => {
  it("emits CAST_ONLY for narrow cast restriction wording and projects to legality.action_context", () => {
    const positives = [
      "Cast this spell only during combat.",
      "Cast only if you control a Vampire.",
      "You may cast this spell only during your turn.",
    ] as const;

    for (const text of positives) {
      const parsed = parseSemanticIrV0({
        name: "Test Card",
        type_line: "Sorcery",
        oracle_text: text,
      });
      const parsedHints = Reflect.get(parsed, "semantic_hints") as ParsedSemanticHints | undefined;
      expect(parsedHints?.legality_action_binding_min, text).toBe("CAST_ONLY");

      const lowered = lowerToAbilityIrMinV1({
        name: "Crystal Ball",
        oracle_text: `{1}, {T}: Scry 2. ${text}`,
      });
      expect(lowered, text).toBeTruthy();
      expect(lowered?.legality?.action_context, text).toBe("CAST_ONLY");
    }
  });

  it("does not over-assert CAST_ONLY on non-cast-restriction text", () => {
    const negatives = [
      "Lightning Bolt deals 3 damage to any target.",
      "Whenever you cast an instant or sorcery spell, this creature gets +1/+0 until end of turn.",
    ] as const;

    for (const text of negatives) {
      const parsed = parseSemanticIrV0({
        name: "Test Card",
        type_line: "Instant",
        oracle_text: text,
      });
      const parsedHints = Reflect.get(parsed, "semantic_hints") as ParsedSemanticHints | undefined;
      expect(parsedHints?.legality_action_binding_min, text).toBeUndefined();

      const lowered = lowerToAbilityIrMinV1({
        name: "Crystal Ball",
        oracle_text: text,
      });
      expect(lowered?.legality?.action_context, text).toBeUndefined();
    }
  });
});
