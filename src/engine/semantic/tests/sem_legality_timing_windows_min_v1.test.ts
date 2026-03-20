import { describe, expect, it } from "vitest";
import { lowerToAbilityIrMinV1 } from "../lowering/lower_to_ability_ir_min_v1";
import { classifyLegalityGateMinV1 } from "../parser/sem_parser_v1";

describe("legality timing windows minimum v1", () => {
  it("classifies and lowers the four allowed timing window classes", () => {
    const cases = [
      {
        name: "ACTIVATE_ONLY_AS_SORCERY",
        oracle: "{1}, {T}: Scry 2. Activate only as a sorcery.",
        expected: { type: "ACTIVATE_ONLY_AS_SORCERY", timing: "SORCERY_SPEED" },
      },
      {
        name: "ACTIVATE_ONLY_AS_INSTANT",
        oracle: "{1}, {T}: Scry 2. Activate only as an instant.",
        expected: { type: "ACTIVATE_ONLY_AS_INSTANT", timing: "INSTANT_SPEED" },
      },
      {
        name: "ACTIVATE_ONLY_DURING_YOUR_TURN",
        oracle: "{1}, {T}: Scry 2. Activate only during your turn.",
        expected: { type: "ACTIVATE_ONLY_DURING_YOUR_TURN", condition: "during your turn" },
      },
      {
        name: "ACTIVATE_ONLY_ONCE_EACH_TURN",
        oracle: "{1}, {T}: Scry 2. Activate only once each turn.",
        expected: { type: "ACTIVATE_ONLY_ONCE_EACH_TURN", condition: "once each turn" },
      },
    ] as const;

    for (const row of cases) {
      expect(classifyLegalityGateMinV1(row.oracle), row.name).toEqual(row.expected);

      const lowered = lowerToAbilityIrMinV1({
        name: "Crystal Ball",
        oracle_text: row.oracle,
      });

      expect(lowered, `${row.name} lowering`).toBeTruthy();
      expect(lowered?.semantic_hints?.legality_gate_min_v1, row.name).toEqual(row.expected);
      expect(lowered?.effects, row.name).toEqual([{ type: "SCRY", detail: "2" }]);
    }
  });

  it("does not emit legality timing window when restriction text is absent", () => {
    const oracle = "{1}, {T}: Scry 2.";
    expect(classifyLegalityGateMinV1(oracle)).toBeNull();

    const lowered = lowerToAbilityIrMinV1({
      name: "Crystal Ball",
      oracle_text: oracle,
    });
    expect(lowered?.semantic_hints?.legality_gate_min_v1).toBeUndefined();
  });
});
