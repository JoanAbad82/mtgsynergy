import { describe, expect, it } from "vitest";
import { lowerToAbilityIrMinV1 } from "../lowering/lower_to_ability_ir_min_v1";
import { parseSemanticIrV0 } from "../parser/sem_parser_v1";

type LoyaltyAbilityMinV1 = {
  class: "LOYALTY";
  loyalty_cost_kind: "PLUS" | "MINUS" | "ZERO";
};

type ParsedSemanticHints = {
  loyalty_ability_min?: LoyaltyAbilityMinV1;
};

describe("loyalty ability classification minimum v1", () => {
  it("classifies explicit loyalty-cost activated prefixes (+N, -N, 0)", () => {
    const rows = [
      {
        oracleText: "+1: Draw a card.",
        expected: { class: "LOYALTY", loyalty_cost_kind: "PLUS" } as const,
      },
      {
        oracleText: "-2: Target player mills two cards.",
        expected: { class: "LOYALTY", loyalty_cost_kind: "MINUS" } as const,
      },
      {
        oracleText: "0: Scry 2.",
        expected: { class: "LOYALTY", loyalty_cost_kind: "ZERO" } as const,
      },
    ] as const;

    for (const row of rows) {
      const parsed = parseSemanticIrV0({
        name: "Loyalty Positive",
        type_line: "Planeswalker",
        oracle_text: row.oracleText,
      });

      const parsedHints = Reflect.get(parsed, "semantic_hints") as ParsedSemanticHints | undefined;
      expect(parsedHints?.loyalty_ability_min, row.oracleText).toEqual(row.expected);
    }
  });

  it("propagates loyalty_ability_min through lowering", () => {
    const rows = [
      {
        name: "Crystal Ball" as const,
        oracleText: "+1: Scry 2.",
        expected: { class: "LOYALTY", loyalty_cost_kind: "PLUS" } as const,
      },
      {
        name: "Millstone" as const,
        oracleText: "-2: Target player mills two cards.",
        expected: { class: "LOYALTY", loyalty_cost_kind: "MINUS" } as const,
      },
      {
        name: "Crystal Ball" as const,
        oracleText: "0: Scry 2.",
        expected: { class: "LOYALTY", loyalty_cost_kind: "ZERO" } as const,
      },
    ] as const;

    for (const row of rows) {
      const lowered = lowerToAbilityIrMinV1({
        name: row.name,
        type_line: "Planeswalker",
        oracle_text: row.oracleText,
      });

      expect(lowered, row.oracleText).not.toBeNull();
      expect(lowered?.semantic_hints?.loyalty_ability_min, row.oracleText).toEqual(row.expected);
      expect(lowered?.legality?.loyalty_ability_min, row.oracleText).toEqual(row.expected);
    }
  });

  it("keeps guardrails outside explicit loyalty activated cost prefixes", () => {
    const negativeRows = [
      "{T}: Add {G}.",
      "Whenever mana is added, add {G}.",
      "Whenever you gain life, draw a card.",
      "Draw two cards.",
      "{1}, {T}: Draw a card.",
    ] as const;

    for (const oracleText of negativeRows) {
      const parsed = parseSemanticIrV0({
        name: "Loyalty Negative",
        type_line: "Instant",
        oracle_text: oracleText,
      });

      const parsedHints = Reflect.get(parsed, "semantic_hints") as ParsedSemanticHints | undefined;
      expect(parsedHints?.loyalty_ability_min, oracleText).toBeUndefined();
    }

    const loweredManaAbility = lowerToAbilityIrMinV1({
      name: "Elvish Mystic",
      type_line: "Creature — Elf Druid",
      oracle_text: "{T}: Add {G}.",
    });
    expect(loweredManaAbility).not.toBeNull();
    expect(loweredManaAbility?.semantic_hints?.loyalty_ability_min).toBeUndefined();
    expect(loweredManaAbility?.legality?.loyalty_ability_min).toBeUndefined();
  });
});
