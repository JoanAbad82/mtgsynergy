import { describe, expect, it } from "vitest";
import { lowerToAbilityIrMinV1 } from "../lowering/lower_to_ability_ir_min_v1";
import { parseSemanticIrV0 } from "../parser/sem_parser_v1";

type ZonePermissionMinV1 = {
  type: "ALLOW_FROM_ZONE" | "ONLY_FROM_ZONE";
  zone: "GRAVEYARD" | "EXILE";
};

type ParsedSemanticHints = {
  zone_permission_min?: ZonePermissionMinV1;
};

describe("legality zone permission minimum v1", () => {
  it("detects and lowers explicit cast permissions from zone", () => {
    const positives: Array<{
      text: string;
      expected: ZonePermissionMinV1;
    }> = [
      {
        text: "You may cast this card from your graveyard.",
        expected: { type: "ALLOW_FROM_ZONE", zone: "GRAVEYARD" },
      },
      {
        text: "You may cast this card from exile.",
        expected: { type: "ALLOW_FROM_ZONE", zone: "EXILE" },
      },
      {
        text: "Cast this card only from your graveyard.",
        expected: { type: "ONLY_FROM_ZONE", zone: "GRAVEYARD" },
      },
    ];

    for (const row of positives) {
      const parsed = parseSemanticIrV0({
        name: "Test Card",
        type_line: "Sorcery",
        oracle_text: row.text,
      });
      const parsedHints = Reflect.get(parsed, "semantic_hints") as ParsedSemanticHints | undefined;
      expect(parsedHints?.zone_permission_min, row.text).toEqual(row.expected);

      const lowered = lowerToAbilityIrMinV1({
        name: "Crystal Ball",
        oracle_text: `{1}, {T}: Scry 2. ${row.text}`,
      });
      expect(lowered, row.text).toBeTruthy();
      expect(lowered?.legality?.zone_permission_min, row.text).toEqual(row.expected);
    }
  });

  it("does not detect zone permission on out-of-scope text", () => {
    const negatives = [
      "Return this card from your graveyard",
      "You may play an additional land",
      "Exile this card from your graveyard",
    ] as const;

    for (const text of negatives) {
      const parsed = parseSemanticIrV0({
        name: "Test Card",
        type_line: "Sorcery",
        oracle_text: text,
      });
      const parsedHints = Reflect.get(parsed, "semantic_hints") as ParsedSemanticHints | undefined;
      expect(parsedHints?.zone_permission_min, text).toBeUndefined();

      const lowered = lowerToAbilityIrMinV1({
        name: "Crystal Ball",
        oracle_text: `{1}, {T}: Scry 2. ${text}`,
      });
      expect(lowered, text).toBeTruthy();
      expect(lowered?.legality?.zone_permission_min, text).toBeUndefined();
    }
  });
});
