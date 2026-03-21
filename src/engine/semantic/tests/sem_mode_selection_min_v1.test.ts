import { describe, expect, it } from "vitest";
import { lowerToAbilityIrMinV1 } from "../lowering/lower_to_ability_ir_min_v1";
import { parseSemanticIrV0 } from "../parser/sem_parser_v1";

type ModeSelectionMinV1 = {
  class: "CHOOSE_ONE" | "CHOOSE_TWO";
  source_span: string;
  mode_dependent_targets_possible: boolean;
};

type ParsedSemanticHints = {
  mode_selection_min?: ModeSelectionMinV1;
};

describe("mode selection minimum semantics v1", () => {
  it("classifies explicit choose-one and choose-two modal wording", () => {
    const rows = [
      {
        oracleText: "{1}, {T}: Choose one. Scry 2. Draw a card.",
        expected: {
          class: "CHOOSE_ONE",
          source_span: "Choose one",
          mode_dependent_targets_possible: false,
        } as const,
      },
      {
        oracleText: "{1}, {T}: Choose two. Scry 2. Destroy target creature. Draw a card.",
        expected: {
          class: "CHOOSE_TWO",
          source_span: "Choose two",
          mode_dependent_targets_possible: true,
        } as const,
      },
    ] as const;

    for (const row of rows) {
      const parsed = parseSemanticIrV0({
        name: "Mode Selection Positive",
        type_line: "Artifact",
        oracle_text: row.oracleText,
      });
      const parsedHints = Reflect.get(parsed, "semantic_hints") as ParsedSemanticHints | undefined;
      expect(parsedHints?.mode_selection_min, row.oracleText).toEqual(row.expected);
    }
  });

  it("propagates mode_selection_min through lowering without leaking into legality/effects", () => {
    const chooseOneLowered = lowerToAbilityIrMinV1({
      name: "Crystal Ball",
      type_line: "Artifact",
      oracle_text: "{1}, {T}: Choose one. Scry 2. Draw a card.",
    });

    expect(chooseOneLowered).not.toBeNull();
    expect(chooseOneLowered?.semantic_hints?.mode_selection_min).toEqual({
      class: "CHOOSE_ONE",
      source_span: "Choose one",
      mode_dependent_targets_possible: false,
    });
    expect((chooseOneLowered?.legality as Record<string, unknown> | undefined)?.mode_selection_min).toBeUndefined();
    expect(JSON.stringify(chooseOneLowered?.effects ?? [])).not.toContain("CHOOSE_ONE");

    const chooseTwoLowered = lowerToAbilityIrMinV1({
      name: "Crystal Ball",
      type_line: "Artifact",
      oracle_text: "{1}, {T}: Choose two. Scry 2. Destroy target creature. Draw a card.",
    });

    expect(chooseTwoLowered).not.toBeNull();
    expect(chooseTwoLowered?.semantic_hints?.mode_selection_min).toEqual({
      class: "CHOOSE_TWO",
      source_span: "Choose two",
      mode_dependent_targets_possible: true,
    });
    expect((chooseTwoLowered?.legality as Record<string, unknown> | undefined)?.mode_selection_min).toBeUndefined();
    expect(JSON.stringify(chooseTwoLowered?.effects ?? [])).not.toContain("CHOOSE_TWO");
  });

  it("keeps guardrails outside choose-one/choose-two modal wording", () => {
    const nonModalParsed = parseSemanticIrV0({
      name: "Mode Selection Negative",
      type_line: "Artifact",
      oracle_text: "{1}, {T}: Scry 2.",
    });
    const nonModalHints = Reflect.get(nonModalParsed, "semantic_hints") as ParsedSemanticHints | undefined;
    expect(nonModalHints?.mode_selection_min).toBeUndefined();

    const chooseWithoutCountParsed = parseSemanticIrV0({
      name: "Mode Selection Negative 2",
      type_line: "Instant",
      oracle_text: "Choose a card name.",
    });
    const chooseWithoutCountHints = Reflect.get(chooseWithoutCountParsed, "semantic_hints") as
      | ParsedSemanticHints
      | undefined;
    expect(chooseWithoutCountHints?.mode_selection_min).toBeUndefined();
  });
});
