import { describe, expect, it } from "vitest";
import { lowerToAbilityIrMinV1 } from "../lowering/lower_to_ability_ir_min_v1";
import { parseSemanticIrV0 } from "../parser/sem_parser_v1";

type ParsedSemanticHints = {
  loyalty_ability_min?: {
    class: "LOYALTY";
    loyalty_cost_kind: "PLUS" | "MINUS" | "ZERO";
  };
};

describe("loyalty once-each-turn restriction minimum v1", () => {
  it("projects ONCE_EACH_TURN for already-classified loyalty abilities", () => {
    const parsed = parseSemanticIrV0({
      name: "Loyalty Frequency Positive",
      type_line: "Planeswalker",
      oracle_text: "+1: Scry 2.",
    });
    const parsedHints = Reflect.get(parsed, "semantic_hints") as ParsedSemanticHints | undefined;
    expect(parsedHints?.loyalty_ability_min).toEqual({
      class: "LOYALTY",
      loyalty_cost_kind: "PLUS",
    });

    const lowered = lowerToAbilityIrMinV1({
      name: "Crystal Ball",
      type_line: "Planeswalker",
      oracle_text: "+1: Scry 2.",
    });

    expect(lowered).not.toBeNull();
    expect(lowered?.legality?.loyalty_once_each_turn_restriction_min_v1).toBe("ONCE_EACH_TURN");
    expect(JSON.stringify(lowered?.effects ?? [])).not.toContain("ONCE_EACH_TURN");
  });

  it("keeps guardrails for non-loyalty families", () => {
    const activatedNonLoyalty = lowerToAbilityIrMinV1({
      name: "Crystal Ball",
      type_line: "Artifact",
      oracle_text: "{1}, {T}: Scry 2.",
    });
    expect(activatedNonLoyalty).not.toBeNull();
    expect(activatedNonLoyalty?.legality?.loyalty_once_each_turn_restriction_min_v1).toBeUndefined();

    const activatedMana = lowerToAbilityIrMinV1({
      name: "Elvish Mystic",
      type_line: "Creature — Elf Druid",
      oracle_text: "{T}: Add {G}.",
    });
    expect(activatedMana).not.toBeNull();
    expect(activatedMana?.legality?.loyalty_once_each_turn_restriction_min_v1).toBeUndefined();

    const triggeredMana = lowerToAbilityIrMinV1({
      name: "Howling Mine",
      type_line: "Artifact",
      oracle_text:
        "Whenever a player activates a mana ability, if this artifact is untapped, that player draws one card and adds {G}.",
    });
    expect(triggeredMana).not.toBeNull();
    expect(triggeredMana?.legality?.loyalty_once_each_turn_restriction_min_v1).toBeUndefined();

    const spellParsed = parseSemanticIrV0({
      name: "Spell Guardrail",
      type_line: "Instant",
      oracle_text: "Draw two cards.",
    });
    const spellParsedHints = Reflect.get(spellParsed, "semantic_hints") as ParsedSemanticHints | undefined;
    expect(spellParsedHints?.loyalty_ability_min).toBeUndefined();
  });
});
