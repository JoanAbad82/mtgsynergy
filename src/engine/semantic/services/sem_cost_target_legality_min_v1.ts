import {
  CostIR,
  CostItem,
  CostTargetLegalitySemanticsReason,
  CostTargetLegalitySemanticsResult,
  LegalityGate,
  SummoningSicknessTapQMin,
  TargetKind,
  TargetSpec
} from "../types/sem_cost_target_legality_types";

export interface CostTargetLegalityMinProfile {
  costIr: CostIR;
  targetSpecs: TargetSpec[];
  legalityGates: LegalityGate[];
  summoningSicknessTapQMin?: SummoningSicknessTapQMin;
  semantics: CostTargetLegalitySemanticsResult;
}

export interface AnalyzeCostTargetLegalityMinOptions {
  sourceTypeLine?: string | null;
}

function detectAdditionalSpellCosts(text: string): CostItem[] {
  if (!/as an additional cost to cast this spell,\s*sacrifice a creature\./i.test(text)) {
    return [];
  }

  return [
    {
      kind: "SACRIFICE",
      detail: "sacrifice a creature",
      sourceTextSpan: "As an additional cost to cast this spell, sacrifice a creature."
    }
  ];
}

function getActivatedCostPrefix(text: string): string | null {
  const colonIndex = text.indexOf(":");
  if (colonIndex < 0) return null;
  return text.slice(0, colonIndex).trim();
}

function detectActivatedAbilityCosts(text: string): CostItem[] {
  const activationCostText = getActivatedCostPrefix(text);
  if (!activationCostText) return [];

  const symbolMatches = activationCostText.match(/\{[^}]+\}/g) ?? [];
  const manaSymbols = symbolMatches.filter((symbol) => !/^\{T\}$/i.test(symbol) && !/^\{Q\}$/i.test(symbol));
  const hasTap = symbolMatches.some((symbol) => /^\{T\}$/i.test(symbol));
  const hasUntap = symbolMatches.some((symbol) => /^\{Q\}$/i.test(symbol));

  const items: CostItem[] = [];
  if (manaSymbols.length > 0) {
    items.push({
      kind: "MANA",
      detail: manaSymbols.join(""),
      sourceTextSpan: activationCostText.trim()
    });
  }
  if (hasTap) {
    items.push({
      kind: "TAP",
      detail: "{T}",
      sourceTextSpan: activationCostText.trim()
    });
  }
  if (hasUntap) {
    items.push({
      kind: "UNTAP",
      detail: "{Q}",
      sourceTextSpan: activationCostText.trim()
    });
  }

  return items;
}

function buildTargetSpec(kinds: TargetKind[], span: string): TargetSpec {
  return {
    required: true,
    minTargets: 1,
    maxTargets: 1,
    targetKinds: kinds,
    sourceTextSpan: span
  };
}

function detectFormalTargets(text: string): TargetSpec[] {
  const artifactCreatureLandMatch = text.match(/target artifact,\s*creature,\s*or\s*land/i);
  if (artifactCreatureLandMatch) {
    return [buildTargetSpec(["ARTIFACT", "CREATURE", "LAND"], artifactCreatureLandMatch[0])];
  }

  const creatureMatch = text.match(/target creature/i);
  if (creatureMatch) {
    return [buildTargetSpec(["CREATURE"], creatureMatch[0])];
  }

  return [];
}

function detectLegalityGates(text: string): LegalityGate[] {
  const controlsTypeMatch = text.match(/activate only if you control an?\s+([a-z]+)/i);
  if (!controlsTypeMatch) return [];

  const permanentType = controlsTypeMatch[1]?.toLowerCase() ?? "unknown";
  return [
    {
      kind: "CONTROLS_PERMANENT_TYPE",
      detail: `control ${permanentType}`,
      sourceTextSpan: controlsTypeMatch[0]
    }
  ];
}

function detectSummoningSicknessTapQMin(
  text: string,
  options?: AnalyzeCostTargetLegalityMinOptions,
): SummoningSicknessTapQMin | null {
  if (!/\bcreature\b/i.test(options?.sourceTypeLine ?? "")) return null;

  const activationCostText = getActivatedCostPrefix(text);
  if (!activationCostText) return null;

  const tapSymbolPresent = /\{T\}/i.test(activationCostText);
  const untapSymbolPresent = /\{Q\}/i.test(activationCostText);
  if (!tapSymbolPresent && !untapSymbolPresent) return null;

  return {
    appliesTo: "ACTIVATE",
    sourceKind: "CREATURE",
    tapSymbolPresent,
    untapSymbolPresent,
    restrictionClass: "SUMMONING_SICKNESS_TAP_Q_RESTRICTION",
  };
}

function buildSemantics(
  costItems: CostItem[],
  targetSpecs: TargetSpec[],
  legalityGates: LegalityGate[],
  summoningSicknessTapQMin?: SummoningSicknessTapQMin,
): CostTargetLegalitySemanticsResult {
  const reasons: CostTargetLegalitySemanticsReason[] = [
    {
      code: "COST_EFFECT_SEPARATION_MIN",
      detail: "cost_items_collected_separately"
    },
    {
      code: "TARGET_REFERENCE_SEPARATION_MIN",
      detail: "formal_target_detection_requires_explicit_target"
    },
    {
      code: "LEGALITY_EFFECT_SEPARATION_MIN",
      detail: "legality_gates_collected_separately"
    },
    {
      code: "RESOLUTION_RECHECK_RESERVED_MIN",
      detail: "resolution_legality_recheck_reserved"
    }
  ];

  if (costItems.some((item) => item.kind === "SACRIFICE")) {
    reasons.push({
      code: "COST_SACRIFICE_RECOGNIZED",
      detail: "additional_cost_sacrifice_creature_detected"
    });
  }
  if (costItems.some((item) => item.kind === "MANA")) {
    reasons.push({
      code: "COST_MANA_RECOGNIZED",
      detail: "activated_ability_mana_cost_detected"
    });
  }
  if (costItems.some((item) => item.kind === "TAP")) {
    reasons.push({
      code: "COST_TAP_RECOGNIZED",
      detail: "activated_ability_tap_cost_detected"
    });
  }
  if (targetSpecs.length > 0) {
    reasons.push({
      code: "FORMAL_TARGET_RECOGNIZED",
      detail: "explicit_target_clause_detected"
    });
  }
  if (legalityGates.length > 0) {
    reasons.push({
      code: "LEGALITY_GATE_RECOGNIZED",
      detail: "activate_only_if_gate_detected"
    });
  }
  if (summoningSicknessTapQMin) {
    reasons.push({
      code: "LEGALITY_SUMMONING_SICKNESS_TAP_Q_RECOGNIZED",
      detail: "activated_creature_ability_with_tap_or_untap_symbol_detected"
    });
  }

  return {
    separatesCostFromEffect: true,
    separatesTargetFromReferenceText: true,
    separatesLegalityFromEffect: true,
    reservesResolutionLegalityRecheck: true,
    reasons
  };
}

export function analyzeCostTargetLegalityMinV1(
  text: string,
  options?: AnalyzeCostTargetLegalityMinOptions,
): CostTargetLegalityMinProfile {
  const costItems = [
    ...detectAdditionalSpellCosts(text),
    ...detectActivatedAbilityCosts(text)
  ];
  const targetSpecs = detectFormalTargets(text);
  const summoningSicknessTapQMin = detectSummoningSicknessTapQMin(text, options) ?? undefined;
  const legalityGates = [...detectLegalityGates(text)];
  if (summoningSicknessTapQMin) {
    legalityGates.push({
      kind: "SUMMONING_SICKNESS_TAP_Q_RESTRICTION",
      detail: "activated creature ability with {T} and/or {Q} in activation cost",
      sourceTextSpan: getActivatedCostPrefix(text) ?? undefined,
    });
  }

  return {
    costIr: { items: costItems },
    targetSpecs,
    legalityGates,
    summoningSicknessTapQMin,
    semantics: buildSemantics(costItems, targetSpecs, legalityGates, summoningSicknessTapQMin)
  };
}
