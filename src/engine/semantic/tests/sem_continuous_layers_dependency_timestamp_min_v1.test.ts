import { describe, expect, it } from "vitest";
import { lowerToAbilityIrMinV1 } from "../lowering/lower_to_ability_ir_min_v1";

// prefix mínimo para activar lowering en tests internos
const MIN_RUNTIME_PREFIX =
  "At the beginning of each player's draw step, if this artifact is untapped, that player draws one card.";

describe("continuous layers/dependency/timestamp min v1", () => {
  it("emits continuous_layers_min on lowering for narrow continuous static patterns", () => {
    const positives = [
      {
        name: "Glorious Anthem",
        oracle: "Creatures you control get +1/+1.",
        expected: { class: "PT_CHANGE", ordering_risk: "NONE" },
      },
      {
        name: "Humility",
        oracle: "All creatures lose all abilities and have base power and toughness 1/1.",
        expected: { class: "MULTI_LAYER", ordering_risk: "TIMESTAMP_OR_DEPENDENCY" },
      },
      {
        name: "Blood Moon",
        oracle: "Nonbasic lands are Mountains.",
        expected: { class: "TYPE_CHANGE", ordering_risk: "TIMESTAMP_OR_DEPENDENCY" },
      },
      {
        name: "Urborg, Tomb of Yawgmoth",
        oracle: "Each land is a Swamp in addition to its other land types.",
        expected: { class: "TYPE_CHANGE", ordering_risk: "TIMESTAMP_OR_DEPENDENCY" },
      },
    ] as const;

    for (const row of positives) {
      const lowered = lowerToAbilityIrMinV1({
        name: "Howling Mine",
        oracle_text: `${MIN_RUNTIME_PREFIX} ${row.oracle}`,
      });

      expect(lowered, `${row.name} lowering`).toBeTruthy();
      expect(lowered?.semantic_hints?.continuous_layers_min, row.name).toEqual(row.expected);
    }
  });

  it("does not emit continuous_layers_min for replacement or linked guardrails", () => {
    const negatives = [
      {
        name: "Rest in Peace",
        oracle:
          "If a card or token would be put into a graveyard from anywhere, exile it instead.",
      },
      {
        name: "Oblivion Ring",
        oracle:
          "When Oblivion Ring enters the battlefield, exile another target nonland permanent. When Oblivion Ring leaves the battlefield, return the exiled card to the battlefield under its owner's control.",
      },
    ] as const;

    for (const row of negatives) {
      const lowered = lowerToAbilityIrMinV1({
        name: "Howling Mine",
        oracle_text: `${MIN_RUNTIME_PREFIX} ${row.oracle}`,
      });

      expect(lowered, `${row.name} lowering`).toBeTruthy();
      expect(lowered?.semantic_hints?.continuous_layers_min, row.name).toBeUndefined();
    }
  });
});
