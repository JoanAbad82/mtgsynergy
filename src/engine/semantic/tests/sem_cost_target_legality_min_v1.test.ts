import { describe, expect, it } from "vitest";
import { analyzeCostTargetLegalityMinV1 } from "../services/sem_cost_target_legality_min_v1";

describe("cost target legality min v1 service", () => {
  it("detects additional sacrifice cost without targets or legality gates for Village Rites", () => {
    const text = "As an additional cost to cast this spell, sacrifice a creature. Draw two cards.";
    const result = analyzeCostTargetLegalityMinV1(text);

    expect(result.costIr.items.some((item) => item.kind === "SACRIFICE")).toBe(true);
    expect(result.targetSpecs).toHaveLength(0);
    expect(result.legalityGates).toHaveLength(0);
  });

  it("detects additional sacrifice cost and one creature target for Bone Splinters", () => {
    const text = "As an additional cost to cast this spell, sacrifice a creature. Destroy target creature.";
    const result = analyzeCostTargetLegalityMinV1(text);

    expect(result.costIr.items.some((item) => item.kind === "SACRIFICE")).toBe(true);
    expect(result.targetSpecs).toHaveLength(1);
    expect(result.targetSpecs[0]?.targetKinds).toEqual(["CREATURE"]);
    expect(result.legalityGates).toHaveLength(0);
  });

  it("activates target recheck-at-resolution guard only when formal targets exist", () => {
    const withFormalTarget = analyzeCostTargetLegalityMinV1("Destroy target creature.");
    expect(withFormalTarget.targetSpecs).toHaveLength(1);
    expect(withFormalTarget.semantics.reservesResolutionLegalityRecheck).toBe(true);
    expect(
      withFormalTarget.semantics.reasons.some(
        (reason) =>
          reason.code === "RESOLUTION_RECHECK_RESERVED_MIN" &&
          reason.detail === "resolution_legality_recheck_reserved_for_formal_targets_only",
      ),
    ).toBe(true);

    const withoutFormalTarget = analyzeCostTargetLegalityMinV1("Draw two cards.");
    expect(withoutFormalTarget.targetSpecs).toHaveLength(0);
    expect(withoutFormalTarget.semantics.reservesResolutionLegalityRecheck).toBe(false);
    expect(
      withoutFormalTarget.semantics.reasons.some(
        (reason) =>
          reason.code === "RESOLUTION_RECHECK_RESERVED_MIN" &&
          reason.detail === "resolution_legality_recheck_guard_not_applicable_without_formal_targets",
      ),
    ).toBe(true);
  });

  it("detects mana and tap costs plus artifact/creature/land target for Icy Manipulator", () => {
    const text = "{1}, {T}: Tap target artifact, creature, or land.";
    const result = analyzeCostTargetLegalityMinV1(text);

    expect(result.costIr.items.some((item) => item.kind === "MANA")).toBe(true);
    expect(result.costIr.items.some((item) => item.kind === "TAP")).toBe(true);
    expect(result.targetSpecs).toHaveLength(1);
    expect(result.targetSpecs[0]?.targetKinds).toEqual(["ARTIFACT", "CREATURE", "LAND"]);
    expect(result.legalityGates).toHaveLength(0);
  });

  it("detects mana and tap costs without legality gate for canonical Castle Vantress activation text", () => {
    const text = "{2}{U}{U}, {T}: Scry 2.";
    const result = analyzeCostTargetLegalityMinV1(text);

    expect(result.costIr.items.some((item) => item.kind === "MANA")).toBe(true);
    expect(result.costIr.items.some((item) => item.kind === "TAP")).toBe(true);
    expect(result.targetSpecs).toHaveLength(0);
    expect(result.legalityGates).toHaveLength(0);
  });

  it("detects summoning sickness tap/q restriction for creature activated ability with {T}", () => {
    const text = "{T}: Add {G}.";
    const result = analyzeCostTargetLegalityMinV1(text, {
      sourceTypeLine: "Creature — Elf Druid",
    });

    expect(result.summoningSicknessTapQMin).toEqual({
      appliesTo: "ACTIVATE",
      sourceKind: "CREATURE",
      tapSymbolPresent: true,
      untapSymbolPresent: false,
      restrictionClass: "SUMMONING_SICKNESS_TAP_Q_RESTRICTION",
    });
    expect(result.legalityGates.some((gate) => gate.kind === "SUMMONING_SICKNESS_TAP_Q_RESTRICTION")).toBe(true);
  });

  it("detects summoning sickness tap/q restriction for creature activated ability with {Q}", () => {
    const text = "{Q}: Draw a card.";
    const result = analyzeCostTargetLegalityMinV1(text, {
      sourceTypeLine: "Creature — Human Wizard",
    });

    expect(result.summoningSicknessTapQMin).toEqual({
      appliesTo: "ACTIVATE",
      sourceKind: "CREATURE",
      tapSymbolPresent: false,
      untapSymbolPresent: true,
      restrictionClass: "SUMMONING_SICKNESS_TAP_Q_RESTRICTION",
    });
    expect(result.legalityGates.some((gate) => gate.kind === "SUMMONING_SICKNESS_TAP_Q_RESTRICTION")).toBe(true);
  });

  it("does not detect summoning sickness tap/q restriction for non-creature with {T}", () => {
    const text = "{1}, {T}: Tap target artifact, creature, or land.";
    const result = analyzeCostTargetLegalityMinV1(text, {
      sourceTypeLine: "Artifact",
    });

    expect(result.summoningSicknessTapQMin).toBeUndefined();
    expect(result.legalityGates.some((gate) => gate.kind === "SUMMONING_SICKNESS_TAP_Q_RESTRICTION")).toBe(false);
  });

  it("does not detect summoning sickness tap/q restriction for creature activated ability without {T}/{Q}", () => {
    const text = "{1}: Scry 1.";
    const result = analyzeCostTargetLegalityMinV1(text, {
      sourceTypeLine: "Creature — Human Wizard",
    });

    expect(result.summoningSicknessTapQMin).toBeUndefined();
    expect(result.legalityGates.some((gate) => gate.kind === "SUMMONING_SICKNESS_TAP_Q_RESTRICTION")).toBe(false);
  });
});
