import { describe, expect, it } from "vitest";
import { lowerToAbilityIrMinV1 } from "../lowering/lower_to_ability_ir_min_v1";
import {
  classifyCostMinV1,
  classifyLegalityGateMinV1,
  classifyTargetMinV1,
} from "../parser/sem_parser_v1";

describe("legality gate minimum v1", () => {
  it("recognizes ACTIVATE_ONLY_IF from canonical Oracle wording", () => {
    const oracleText =
      "Rivendell enters tapped unless you control a legendary creature. {T}: Add {U}. {1}{U}, {T}: Scry 2. Activate only if you control a legendary creature.";
    const legality = classifyLegalityGateMinV1(oracleText);
    const lowered = lowerToAbilityIrMinV1({
      name: "Crystal Ball",
      oracle_text: oracleText,
    });

    expect(legality).toEqual({
      type: "ACTIVATE_ONLY_IF",
      condition: "you control a legendary creature",
    });
    expect(lowered?.semantic_hints?.legality_gate_min_v1).toEqual({
      type: "ACTIVATE_ONLY_IF",
      condition: "you control a legendary creature",
    });
    expect(lowered?.effects).toEqual([{ type: "SCRY", detail: "2" }]);
  });

  it("classifies activate-only-as-sorcery with timing tag", () => {
    const oracleText =
      "This land enters tapped. {T}: Add {R}. {2}{U}{U}{R}, {T}, Sacrifice this land: Scry 2. This land deals 2 damage to each creature. Activate only as a sorcery.";
    const legality = classifyLegalityGateMinV1(oracleText);
    const lowered = lowerToAbilityIrMinV1({
      name: "Crystal Ball",
      oracle_text: oracleText,
    });

    expect(legality).toEqual({
      type: "ACTIVATE_ONLY_AS_SORCERY",
      timing: "SORCERY_SPEED",
    });
    expect(lowered?.semantic_hints?.legality_gate_min_v1).toEqual({
      type: "ACTIVATE_ONLY_AS_SORCERY",
      timing: "SORCERY_SPEED",
    });
  });

  it("does not emit legality gate when restriction text is absent", () => {
    const oracleText = "{T}: Add {G}.";
    const legality = classifyLegalityGateMinV1(oracleText);
    const lowered = lowerToAbilityIrMinV1({
      name: "Elvish Mystic",
      oracle_text: oracleText,
    });

    expect(legality).toBeNull();
    expect(lowered?.semantic_hints?.legality_gate_min_v1).toBeUndefined();
  });

  it("keeps cost_min_v1 and target_min_v1 wiring intact", () => {
    const oracleText = "{1}, {T}: Tap target artifact, creature, or land.";

    expect(classifyCostMinV1(oracleText)).toEqual({ classes: ["MANA", "TAP"] });
    expect(classifyTargetMinV1(oracleText)).toEqual({
      required: true,
      minTargets: 1,
      maxTargets: 1,
      targetKinds: ["artifact", "creature", "land"],
      zoneHint: "battlefield",
      controllerConstraint: null,
      sourceSpan: "target artifact, creature, or land",
    });
    expect(classifyLegalityGateMinV1(oracleText)).toBeNull();
  });
});
