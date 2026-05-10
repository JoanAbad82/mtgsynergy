import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

type CostTargetLegalityContractMinV1 = {
  version: string;
  announcementWindows: string[];
  costRules: {
    costIsDistinctFromEffect: boolean;
    activationCostBeforeColonBelongsToCostIr: boolean;
    additionalSpellCostBelongsToCostIr: boolean;
    costPaymentIsNotEffectResolution: boolean;
    supportedCostKinds: string[];
  };
  targetRules: {
    formalTargetMustBeExplicitTarget: boolean;
    anaphoraIsNotAutomaticallyTarget: boolean;
    targetDeclarationOccursAtAnnouncementOrActivation: boolean;
    targetRecheckAtResolutionReserved: boolean;
    supportedTargetKinds: string[];
  };
  legalityRules: {
    legalityIsDistinctFromEffect: boolean;
    legalityGateIsDistinctFromTargetSpec: boolean;
    initialLegalityCheckOccursBeforePaymentCompletion: boolean;
    resolutionLegalityRecheckReserved: boolean;
    supportedLegalityKinds: string[];
  };
  modeRules: {
    modeSelectionIsDistinctFromTargetSpec: boolean;
  };
  anchorCards: Array<{ cardName: string; purpose: string }>;
  notes?: string[];
};

type FocalCorpus = {
  anchor_cards: Array<{
    card_name: string;
    focus_text: string;
    expected_cost_kinds: string[];
    expected_target_kinds: string[];
    expected_legality_kinds: string[];
    expected_target_count: number;
    expected_legality_count: number;
  }>;
};

const here = dirname(fileURLToPath(import.meta.url));
const contractPath = join(here, "../contract/sem_cost_target_legality_min_v1.json");
const focalCorpusPath = join(here, "../contract/sem_cost_target_legality_focal_corpus_v1.json");

function loadJson<T>(path: string): T {
  const raw = readFileSync(path, "utf8");
  return JSON.parse(raw) as T;
}

function expectIncludesAll(haystack: string[], required: string[]) {
  for (const item of required) {
    expect(haystack).toContain(item);
  }
}

describe("cost/target/legality contract freeze v1", () => {
  it("parses contract JSON and exposes minimal CostIR/TargetSpec/Legality shape", () => {
    const contract = loadJson<CostTargetLegalityContractMinV1>(contractPath);

    expect(contract.version).toBe("sem_cost_target_legality_min_v1");
    expect(Array.isArray(contract.announcementWindows)).toBe(true);
    expectIncludesAll(contract.announcementWindows, [
      "ANNOUNCE_OR_ACTIVATE",
      "DECLARE_TARGETS",
      "CHECK_INITIAL_LEGALITY",
      "PAY_COSTS",
      "RESOLUTION_RECHECK_RESERVED",
    ]);

    expect(contract.costRules.costIsDistinctFromEffect).toBe(true);
    expect(contract.costRules.activationCostBeforeColonBelongsToCostIr).toBe(true);
    expect(contract.costRules.additionalSpellCostBelongsToCostIr).toBe(true);
    expect(contract.costRules.costPaymentIsNotEffectResolution).toBe(true);
    expectIncludesAll(contract.costRules.supportedCostKinds, [
      "MANA",
      "TAP",
      "UNTAP",
      "SACRIFICE",
      "PAY_LIFE",
      "DISCARD",
      "REMOVE_COUNTER",
      "OTHER_COST_TEXT",
    ]);

    expect(contract.targetRules.formalTargetMustBeExplicitTarget).toBe(true);
    expect(contract.targetRules.anaphoraIsNotAutomaticallyTarget).toBe(true);
    expect(contract.targetRules.targetDeclarationOccursAtAnnouncementOrActivation).toBe(true);
    expect(contract.targetRules.targetRecheckAtResolutionReserved).toBe(true);
    expectIncludesAll(contract.targetRules.supportedTargetKinds, [
      "CREATURE",
      "ARTIFACT",
      "LAND",
      "PERMANENT",
      "UNKNOWN_TARGET_KIND",
    ]);

    expect(contract.legalityRules.legalityIsDistinctFromEffect).toBe(true);
    expect(contract.legalityRules.legalityGateIsDistinctFromTargetSpec).toBe(true);
    expect(contract.legalityRules.initialLegalityCheckOccursBeforePaymentCompletion).toBe(true);
    expect(contract.legalityRules.resolutionLegalityRecheckReserved).toBe(true);

    const legalityKinds = contract.legalityRules.supportedLegalityKinds;
    const hasMinimalRestrictionClass = [
      "ACTIVATE_ONLY_IF",
      "CAST_ONLY_IF",
      "CONTROLS_PERMANENT_TYPE",
    ].some((kind) => legalityKinds.includes(kind));
    expect(hasMinimalRestrictionClass).toBe(true);

    expect(contract.modeRules.modeSelectionIsDistinctFromTargetSpec).toBe(true);

    const notesBlob = (contract.notes ?? []).join(" ");
    expect(notesBlob).toContain("CostIR");
    expect(notesBlob).toContain("TargetSpec");
    expect(notesBlob).toContain("LegalityGate");
  });

  it("keeps the four A2.10 anchor cards declared in contract", () => {
    const contract = loadJson<CostTargetLegalityContractMinV1>(contractPath);
    const anchorNames = contract.anchorCards.map((row) => row.cardName);

    expectIncludesAll(anchorNames, [
      "Village Rites",
      "Bone Splinters",
      "Icy Manipulator",
      "Castle Vantress",
    ]);
  });

  it("keeps fixtures/examples for Village Rites, Bone Splinters, Icy Manipulator and Castle Vantress", () => {
    const corpus = loadJson<FocalCorpus>(focalCorpusPath);
    const byName = new Map(corpus.anchor_cards.map((row) => [row.card_name, row]));

    const village = byName.get("Village Rites");
    expect(village).toBeTruthy();
    expect(village?.focus_text).toContain("As an additional cost to cast this spell, sacrifice a creature");
    expect(village?.focus_text).toContain("Draw two cards");
    expect(village?.expected_cost_kinds).toContain("SACRIFICE");
    expect(village?.expected_target_count).toBe(0);
    expect(village?.expected_legality_count).toBe(0);

    const bone = byName.get("Bone Splinters");
    expect(bone).toBeTruthy();
    expect(bone?.focus_text).toContain("As an additional cost to cast this spell, sacrifice a creature");
    expect(bone?.focus_text).toContain("Destroy target creature");
    expect(bone?.expected_cost_kinds).toContain("SACRIFICE");
    expect(bone?.expected_target_kinds).toContain("CREATURE");
    expect(bone?.expected_target_count).toBe(1);

    const icy = byName.get("Icy Manipulator");
    expect(icy).toBeTruthy();
    expect(icy?.focus_text).toContain("{1}, {T}:");
    expect(icy?.focus_text).toContain("target artifact, creature, or land");
    expect(icy?.expected_cost_kinds).toEqual(expect.arrayContaining(["MANA", "TAP"]));
    expect(icy?.expected_target_kinds).toEqual(expect.arrayContaining(["ARTIFACT", "CREATURE", "LAND"]));
    expect(icy?.expected_legality_count).toBe(0);

    const castle = byName.get("Castle Vantress");
    expect(castle).toBeTruthy();
    expect(castle?.focus_text).toContain("{2}{U}{U}, {T}:");
    expect(castle?.focus_text).toContain("Activate only if you control an Island");
    expect(castle?.expected_cost_kinds).toEqual(expect.arrayContaining(["MANA", "TAP"]));
    expect(castle?.expected_target_count).toBe(0);

    const castleLegalityKinds = castle?.expected_legality_kinds ?? [];
    const castleHasMinimalRestrictionClass = [
      "ACTIVATE_ONLY_IF",
      "CAST_ONLY_IF",
      "CONTROLS_PERMANENT_TYPE",
    ].some((kind) => castleLegalityKinds.includes(kind));
    expect(castleHasMinimalRestrictionClass).toBe(true);
  });
});
