import { describe, expect, it } from "vitest";
import { lowerToAbilityIrMinV1 } from "../lowering/lower_to_ability_ir_min_v1";
import { parseSemanticIrV0 } from "../parser/sem_parser_v1";

type LegalityActorConstraintMinV1 = "ANY_PLAYER" | "YOU_ONLY" | "OPPONENT_ONLY" | "OWNER_ONLY";

type ParsedSemanticHints = {
  legality_actor_constraint_min?: LegalityActorConstraintMinV1;
};

describe("legality actor constraint minimum v1", () => {
  it("classifies and lowers explicit actor constraints", () => {
    const positives: Array<{ text: string; expected: LegalityActorConstraintMinV1 }> = [
      { text: "Any player may activate this ability.", expected: "ANY_PLAYER" },
      { text: "Only an opponent may activate this ability.", expected: "OPPONENT_ONLY" },
      { text: "You may cast this card from your graveyard.", expected: "YOU_ONLY" },
      { text: "Its owner may cast this card from exile.", expected: "OWNER_ONLY" },
    ];

    for (const row of positives) {
      const parsed = parseSemanticIrV0({
        name: "Test Card",
        type_line: "Sorcery",
        oracle_text: row.text,
      });
      const parsedHints = Reflect.get(parsed, "semantic_hints") as ParsedSemanticHints | undefined;
      expect(parsedHints?.legality_actor_constraint_min, row.text).toBe(row.expected);

      const lowered = lowerToAbilityIrMinV1({
        name: "Crystal Ball",
        oracle_text: `{1}, {T}: Scry 2. ${row.text}`,
      });
      expect(lowered, row.text).toBeTruthy();
      expect(lowered?.semantic_hints?.legality_actor_constraint_min, row.text).toBe(row.expected);
      expect(lowered?.legality?.actor_constraint_min, row.text).toBe(row.expected);
    }
  });

  it("does not classify actor constraint when actor wording is absent or indirect", () => {
    const negatives = [
      "{1}, {T}: Scry 2.",
      "Activate only as a sorcery.",
      "Only from your graveyard.",
      "You may play an additional land.",
    ] as const;

    for (const text of negatives) {
      const parsed = parseSemanticIrV0({
        name: "Test Card",
        type_line: "Sorcery",
        oracle_text: text,
      });
      const parsedHints = Reflect.get(parsed, "semantic_hints") as ParsedSemanticHints | undefined;
      expect(parsedHints?.legality_actor_constraint_min, text).toBeUndefined();

      const lowered = lowerToAbilityIrMinV1({
        name: "Crystal Ball",
        oracle_text: `{1}, {T}: Scry 2. ${text}`,
      });
      expect(lowered, text).toBeTruthy();
      expect(lowered?.semantic_hints?.legality_actor_constraint_min, text).toBeUndefined();
      expect(lowered?.legality?.actor_constraint_min, text).toBeUndefined();
    }
  });
});
