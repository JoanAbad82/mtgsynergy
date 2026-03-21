import { describe, expect, it } from "vitest";
import { lowerToAbilityIrMinV1 } from "../lowering/lower_to_ability_ir_min_v1";
import { parseSemanticIrV0 } from "../parser/sem_parser_v1";

type LoyaltySymbolCostMinV1 = {
  kind: "POSITIVE" | "NEGATIVE" | "ZERO";
  amount: number;
  source_symbol: string;
};

type ParsedSemanticHints = {
  loyalty_symbol_cost_min_v1?: LoyaltySymbolCostMinV1;
};

describe("loyalty symbol cost minimum v1", () => {
  it("classifies [+N], [-N], and [0] as explicit loyalty cost hints", () => {
    const rows = [
      {
        oracleText: "[+1]: Scry 2.",
        expected: { kind: "POSITIVE", amount: 1, source_symbol: "[+1]" } as const,
      },
      {
        oracleText: "[-3]: Target player mills two cards.",
        expected: { kind: "NEGATIVE", amount: 3, source_symbol: "[-3]" } as const,
      },
      {
        oracleText: "[0]: Scry 2.",
        expected: { kind: "ZERO", amount: 0, source_symbol: "[0]" } as const,
      },
    ] as const;

    for (const row of rows) {
      const parsed = parseSemanticIrV0({
        name: "Loyalty Symbol Cost Positive",
        type_line: "Planeswalker",
        oracle_text: row.oracleText,
      });
      const parsedHints = Reflect.get(parsed, "semantic_hints") as ParsedSemanticHints | undefined;
      expect(parsedHints?.loyalty_symbol_cost_min_v1, row.oracleText).toEqual(row.expected);
    }
  });

  it("projects loyalty symbol costs into CostIR without leaking to EffectIR or legality gate payload", () => {
    const rows = [
      {
        name: "Crystal Ball" as const,
        oracleText: "[+1]: Scry 2.",
        expectedCost: "LOYALTY_PLUS",
      },
      {
        name: "Millstone" as const,
        oracleText: "[-3]: Target player mills two cards.",
        expectedCost: "LOYALTY_MINUS",
      },
      {
        name: "Crystal Ball" as const,
        oracleText: "[0]: Scry 2.",
        expectedCost: "LOYALTY_ZERO",
      },
    ] as const;

    for (const row of rows) {
      const lowered = lowerToAbilityIrMinV1({
        name: row.name,
        type_line: "Planeswalker",
        oracle_text: row.oracleText,
      });

      expect(lowered, row.oracleText).not.toBeNull();
      expect(lowered?.cost, row.oracleText).toEqual([row.expectedCost]);
      expect(lowered?.semantic_hints?.loyalty_symbol_cost_min_v1, row.oracleText).toBeDefined();
      expect((lowered?.legality as Record<string, unknown> | undefined)?.loyalty_symbol_cost_min_v1, row.oracleText).toBeUndefined();
      expect(JSON.stringify(lowered?.effects ?? []), row.oracleText).not.toContain("LOYALTY_");
    }
  });

  it("keeps guardrails for non-loyalty and non-cost contexts", () => {
    const parsedNonLoyaltyCounterText = parseSemanticIrV0({
      name: "Guardrail Counter Text",
      type_line: "Artifact",
      oracle_text: "{T}: Put a +1/+1 counter on target creature.",
    });
    const parsedCounterHints = Reflect.get(parsedNonLoyaltyCounterText, "semantic_hints") as
      | ParsedSemanticHints
      | undefined;
    expect(parsedCounterHints?.loyalty_symbol_cost_min_v1).toBeUndefined();

    const loweredActivatedNonLoyalty = lowerToAbilityIrMinV1({
      name: "Crystal Ball",
      type_line: "Artifact",
      oracle_text: "{1}, {T}: Scry 2.",
    });
    expect(loweredActivatedNonLoyalty).not.toBeNull();
    expect(loweredActivatedNonLoyalty?.cost).toEqual(["TAP"]);
    expect(loweredActivatedNonLoyalty?.semantic_hints?.loyalty_symbol_cost_min_v1).toBeUndefined();

    const loweredActivatedMana = lowerToAbilityIrMinV1({
      name: "Elvish Mystic",
      type_line: "Creature — Elf Druid",
      oracle_text: "{T}: Add {G}.",
    });
    expect(loweredActivatedMana).not.toBeNull();
    expect(loweredActivatedMana?.cost).toEqual(["TAP"]);
    expect(loweredActivatedMana?.semantic_hints?.loyalty_symbol_cost_min_v1).toBeUndefined();

    const parsedSpell = parseSemanticIrV0({
      name: "Spell Guardrail",
      type_line: "Sorcery",
      oracle_text: "Draw two cards.",
    });
    const parsedSpellHints = Reflect.get(parsedSpell, "semantic_hints") as ParsedSemanticHints | undefined;
    expect(parsedSpellHints?.loyalty_symbol_cost_min_v1).toBeUndefined();
  });
});
