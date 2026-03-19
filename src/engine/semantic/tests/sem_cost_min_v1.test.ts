import { describe, expect, it } from "vitest";
import { lowerToAbilityIrMinV1 } from "../lowering/lower_to_ability_ir_min_v1";
import { classifyCostMinV1 } from "../parser/sem_parser_v1";

describe("cost minimal semantics v1", () => {
  it("classifies explicit activated costs with narrow high-confidence patterns", () => {
    const positives = [
      {
        name: "tap-only mana ability",
        oracle: "{T}: Add {G}.",
        expected: { classes: ["TAP"] },
      },
      {
        name: "mana plus tap ability",
        oracle: "{2}{G}, {T}: Add {G}{G}{G}.",
        expected: { classes: ["MANA", "TAP"] },
      },
      {
        name: "sacrifice as activated cost",
        oracle: "Sacrifice this artifact: Draw a card.",
        expected: { classes: ["SACRIFICE"] },
      },
      {
        name: "discard as activated cost",
        oracle: "{T}, Discard a card: Draw a card.",
        expected: { classes: ["TAP", "DISCARD"] },
      },
      {
        name: "pay life as activated cost",
        oracle: "Pay 2 life: Draw a card.",
        expected: { classes: ["PAY_LIFE"] },
      },
    ] as const;

    for (const row of positives) {
      expect(classifyCostMinV1(row.oracle), row.name).toEqual(row.expected);
    }
  });

  it("does not classify effect text or non-activated text as costs", () => {
    const negatives = [
      {
        name: "Shock",
        oracle: "Shock deals 2 damage to any target.",
      },
      {
        name: "Opt",
        oracle: "Scry 1. Draw a card.",
      },
      {
        name: "Guttersnipe",
        oracle: "Whenever you cast an instant or sorcery spell, Guttersnipe deals 2 damage to each opponent.",
      },
      {
        name: "resolutive sacrifice",
        oracle: "Target player sacrifices a creature.",
      },
      {
        name: "resolutive discard",
        oracle: "Target player discards a card.",
      },
      {
        name: "trigger-like colon guardrail",
        oracle: "When this enters the battlefield: draw a card.",
      },
    ] as const;

    for (const row of negatives) {
      expect(classifyCostMinV1(row.oracle), row.name).toBeNull();
    }
  });

  it("wires cost_min_v1 into semantic_hints during lowering", () => {
    const lowered = lowerToAbilityIrMinV1({
      name: "Crystal Ball",
      oracle_text: "{1}, {T}: Scry 2.",
    });

    expect(lowered).toBeTruthy();
    expect(lowered?.semantic_hints?.cost_min_v1).toEqual({
      classes: ["MANA", "TAP"],
    });
  });

  it("does not emit cost_min_v1 when no explicit activated cost is present", () => {
    const lowered = lowerToAbilityIrMinV1({
      name: "Howling Mine",
      oracle_text:
        "At the beginning of each player's draw step, if this artifact is untapped, that player draws an additional card.",
    });

    expect(lowered).toBeTruthy();
    expect(lowered?.semantic_hints?.cost_min_v1).toBeUndefined();
  });
});
