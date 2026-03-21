import { describe, expect, it } from "vitest";
import { lowerToAbilityIrMinV1 } from "../lowering/lower_to_ability_ir_min_v1";
import { parseSemanticIrV0 } from "../parser/sem_parser_v1";

type ManaAbilityMinClassV1 = "MANA_ABILITY" | "NON_MANA_ABILITY";
type ManaAbilityMinReasonV1 =
  | "NO_TARGET"
  | "ADDS_MANA"
  | "NOT_LOYALTY"
  | "HAS_TARGET"
  | "IS_LOYALTY"
  | "NO_EXPLICIT_MANA_ADD";
type ManaAbilityMinV1 = {
  class: ManaAbilityMinClassV1;
  reasons: ManaAbilityMinReasonV1[];
};

type ParsedSemanticHints = {
  mana_ability_min?: ManaAbilityMinV1;
};

describe("mana ability classification minimum v1", () => {
  it("classifies canonical mana abilities as MANA_ABILITY", () => {
    const expected: ManaAbilityMinV1 = {
      class: "MANA_ABILITY",
      reasons: ["NO_TARGET", "ADDS_MANA", "NOT_LOYALTY"],
    };

    const parseRows = [
      {
        cardName: "Llanowar Elves",
        typeLine: "Creature — Elf Druid",
        oracleText: "{T}: Add {G}.",
      },
      {
        cardName: "Elvish Mystic",
        typeLine: "Creature — Elf Druid",
        oracleText: "{T}: Add {G}.",
      },
      {
        cardName: "Darksteel Ingot",
        typeLine: "Artifact",
        oracleText: "{T}: Add one mana of any color.",
      },
      {
        cardName: "Worn Powerstone",
        typeLine: "Artifact",
        oracleText: "{T}: Add {C}{C}.",
      },
    ] as const;

    for (const row of parseRows) {
      const parsed = parseSemanticIrV0({
        name: row.cardName,
        type_line: row.typeLine,
        oracle_text: row.oracleText,
      });
      const parsedHints = Reflect.get(parsed, "semantic_hints") as ParsedSemanticHints | undefined;
      expect(parsedHints?.mana_ability_min, row.cardName).toEqual(expected);
    }

    const loweringRows = [
      {
        name: "Elvish Mystic",
        typeLine: "Creature — Elf Druid",
        oracleText: "{T}: Add {G}.",
      },
      {
        name: "Darksteel Ingot",
        typeLine: "Artifact",
        oracleText: "{T}: Add one mana of any color.",
      },
      {
        name: "Worn Powerstone",
        typeLine: "Artifact",
        oracleText: "{T}: Add {C}{C}.",
      },
    ] as const;

    for (const row of loweringRows) {
      const lowered = lowerToAbilityIrMinV1({
        name: row.name,
        type_line: row.typeLine,
        oracle_text: row.oracleText,
      });
      expect(lowered?.semantic_hints?.mana_ability_min, row.name).toEqual(expected);
      expect(lowered?.legality?.mana_ability_min, row.name).toEqual(expected);
    }
  });

  it("keeps guardrails as NON_MANA_ABILITY or out of scope", () => {
    const negativeRows: Array<{
      label: string;
      typeLine: string;
      oracleText: string;
      expected: ManaAbilityMinV1 | undefined;
      lowerName?: "Elvish Mystic" | "Crystal Ball";
    }> = [
      {
        label: "activated ability with target that adds mana",
        typeLine: "Creature — Elf Druid",
        oracleText: "{T}: Add {G} to target creature.",
        expected: {
          class: "NON_MANA_ABILITY",
          reasons: ["HAS_TARGET", "ADDS_MANA", "NOT_LOYALTY"],
        },
        lowerName: "Elvish Mystic",
      },
      {
        label: "loyalty ability",
        typeLine: "Planeswalker",
        oracleText: "+1: Add {G}.",
        expected: {
          class: "NON_MANA_ABILITY",
          reasons: ["NO_TARGET", "ADDS_MANA", "IS_LOYALTY"],
        },
      },
      {
        label: "activated ability with no target that does not add mana",
        typeLine: "Artifact",
        oracleText: "{1}, {T}: Scry 2.",
        expected: {
          class: "NON_MANA_ABILITY",
          reasons: ["NO_TARGET", "NO_EXPLICIT_MANA_ADD", "NOT_LOYALTY"],
        },
        lowerName: "Crystal Ball",
      },
      {
        label: "triggered mana wording out of scope",
        typeLine: "Enchantment",
        oracleText: "Whenever you tap a land for mana, add {G}.",
        expected: undefined,
      },
    ];

    for (const row of negativeRows) {
      const parsed = parseSemanticIrV0({
        name: "Test Card",
        type_line: row.typeLine,
        oracle_text: row.oracleText,
      });
      const parsedHints = Reflect.get(parsed, "semantic_hints") as ParsedSemanticHints | undefined;
      expect(parsedHints?.mana_ability_min, row.label).toEqual(row.expected);

      if (!row.lowerName) continue;

      const lowered = lowerToAbilityIrMinV1({
        name: row.lowerName,
        type_line: row.typeLine,
        oracle_text: row.oracleText,
      });
      expect(lowered?.semantic_hints?.mana_ability_min, row.label).toEqual(row.expected);
      expect(lowered?.legality?.mana_ability_min, row.label).toEqual(row.expected);
    }
  });
});
