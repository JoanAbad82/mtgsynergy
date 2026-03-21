import { describe, expect, it } from "vitest";
import { lowerToAbilityIrMinV1 } from "../lowering/lower_to_ability_ir_min_v1";
import { parseSemanticIrV0 } from "../parser/sem_parser_v1";

type TriggeredManaAbilityMinClassV1 = "NONE" | "TRIGGERED_MANA_ABILITY";
type TriggeredManaAbilityMinReasonV1 =
  | "IS_TRIGGERED"
  | "NO_TARGET"
  | "ADDS_MANA"
  | "MANA_RELATED_TRIGGER"
  | "HAS_TARGET"
  | "IS_LOYALTY"
  | "NO_EXPLICIT_MANA_ADD"
  | "NON_MANA_TRIGGER_CONTEXT";
type TriggeredManaAbilityMinV1 = {
  class: TriggeredManaAbilityMinClassV1;
  reasons: TriggeredManaAbilityMinReasonV1[];
};

type ParsedSemanticHints = {
  triggered_mana_ability_min?: TriggeredManaAbilityMinV1;
};

describe("triggered mana ability classification minimum v1", () => {
  it("classifies explicit triggered mana abilities as TRIGGERED_MANA_ABILITY", () => {
    const positiveRows = [
      "Whenever a player activates a mana ability, add {G}.",
      "Whenever an activated mana ability resolves, add {C}.",
      "Whenever mana is added, add one mana of any type.",
    ] as const;

    for (const oracleText of positiveRows) {
      const parsed = parseSemanticIrV0({
        name: "Triggered Mana Positive",
        type_line: "Enchantment",
        oracle_text: oracleText,
      });

      const parsedHints = Reflect.get(parsed, "semantic_hints") as ParsedSemanticHints | undefined;
      expect(parsedHints?.triggered_mana_ability_min?.class, oracleText).toBe("TRIGGERED_MANA_ABILITY");
      expect(parsedHints?.triggered_mana_ability_min?.reasons, oracleText).toEqual([
        "IS_TRIGGERED",
        "NO_TARGET",
        "ADDS_MANA",
        "MANA_RELATED_TRIGGER",
      ]);
    }
  });

  it("does not overclassify non-triggered-mana or guarded cases", () => {
    const negativeRows = [
      "{T}: Add {G}.",
      "Whenever mana is added, target player adds {G}.",
      "Whenever mana is added, draw a card.",
      "Whenever a creature enters the battlefield, add {G}.",
      "+1: Add {G}.",
      "Shock deals 2 damage to any target.",
    ] as const;

    for (const oracleText of negativeRows) {
      const parsed = parseSemanticIrV0({
        name: "Triggered Mana Negative",
        type_line: "Instant",
        oracle_text: oracleText,
      });

      const parsedHints = Reflect.get(parsed, "semantic_hints") as ParsedSemanticHints | undefined;
      expect(parsedHints?.triggered_mana_ability_min, oracleText).toBeUndefined();
    }
  });

  it("propagates triggered_mana_ability_min through lowering when parser classifies it", () => {
    const oracleText =
      "Whenever a player activates a mana ability, if this artifact is untapped, that player draws one card and adds {G}.";

    const lowered = lowerToAbilityIrMinV1({
      name: "Howling Mine",
      type_line: "Artifact",
      oracle_text: oracleText,
    });

    expect(lowered).not.toBeNull();
    expect(lowered?.semantic_hints?.triggered_mana_ability_min).toEqual({
      class: "TRIGGERED_MANA_ABILITY",
      reasons: ["IS_TRIGGERED", "NO_TARGET", "ADDS_MANA", "MANA_RELATED_TRIGGER"],
    });
    expect(lowered?.legality?.triggered_mana_ability_min).toEqual({
      class: "TRIGGERED_MANA_ABILITY",
      reasons: ["IS_TRIGGERED", "NO_TARGET", "ADDS_MANA", "MANA_RELATED_TRIGGER"],
    });
  });

  it("keeps lowering guardrails without triggered mana context", () => {
    const lowered = lowerToAbilityIrMinV1({
      name: "Howling Mine",
      type_line: "Artifact",
      oracle_text:
        "At the beginning of each player's draw step, if this artifact is untapped, that player draws an additional card.",
    });

    expect(lowered).not.toBeNull();
    expect(lowered?.semantic_hints?.triggered_mana_ability_min).toBeUndefined();
    expect(lowered?.legality?.triggered_mana_ability_min).toBeUndefined();
  });
});
