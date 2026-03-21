export type AnnouncementWindow =
  | "ANNOUNCE_OR_ACTIVATE"
  | "CHOOSE_MODES_IF_ANY"
  | "DECLARE_TARGETS"
  | "CHECK_INITIAL_LEGALITY"
  | "PAY_COSTS"
  | "RESOLUTION_RECHECK_RESERVED";

export type CostKind =
  | "MANA"
  | "TAP"
  | "UNTAP"
  | "SACRIFICE"
  | "PAY_LIFE"
  | "DISCARD"
  | "REMOVE_COUNTER"
  | "OTHER_COST_TEXT";

export interface CostItem {
  kind: CostKind;
  detail: string;
  sourceTextSpan?: string;
}

export interface CostIR {
  items: CostItem[];
}

export type TargetKind =
  | "PLAYER"
  | "OPPONENT"
  | "ANY_TARGET"
  | "CREATURE"
  | "ARTIFACT"
  | "ENCHANTMENT"
  | "LAND"
  | "PLANESWALKER"
  | "SPELL"
  | "CARD"
  | "PERMANENT"
  | "UNKNOWN_TARGET_KIND";

export interface TargetSpec {
  required: boolean;
  minTargets: number;
  maxTargets: number;
  targetKinds: TargetKind[];
  zoneHint?: string;
  controllerConstraint?: string;
  sourceTextSpan?: string;
}

export type LegalityKind =
  | "ACTIVATE_ONLY_AS_SORCERY"
  | "CONTROLS_PERMANENT_TYPE"
  | "ATTACKED_THIS_TURN"
  | "ONCE_EACH_TURN"
  | "SUMMONING_SICKNESS_TAP_RESTRICTION"
  | "SUMMONING_SICKNESS_TAP_Q_RESTRICTION"
  | "OTHER_LEGALITY_TEXT";

export interface LegalityGate {
  kind: LegalityKind;
  detail: string;
  sourceTextSpan?: string;
}

export interface SummoningSicknessTapQMin {
  appliesTo: "ACTIVATE";
  sourceKind: "CREATURE";
  tapSymbolPresent: boolean;
  untapSymbolPresent: boolean;
  restrictionClass: "SUMMONING_SICKNESS_TAP_Q_RESTRICTION";
}

export interface ModeSelectionSpec {
  modal: boolean;
  selectedModeCount?: number;
  sourceTextSpan?: string;
}

export interface CostTargetLegalitySemanticsReason {
  code: string;
  detail: string;
}

export interface CostTargetLegalitySemanticsResult {
  separatesCostFromEffect: boolean;
  separatesTargetFromReferenceText: boolean;
  separatesLegalityFromEffect: boolean;
  reservesResolutionLegalityRecheck: boolean;
  reasons: CostTargetLegalitySemanticsReason[];
}
