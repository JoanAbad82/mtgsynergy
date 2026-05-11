import type {
  CostIR,
  CostItem,
  CostKind,
  LegalityGate,
  TargetKind,
  TargetSpec,
} from "../types/sem_cost_target_legality_types";

export type CostTargetLegalityContextV1 = "CAST" | "ACTIVATE";

export type EffectKindV1 =
  | "DRAW_CARDS"
  | "DESTROY"
  | "TAP_PERMANENT"
  | "SCRY"
  | "OTHER_EFFECT_TEXT";

export type EffectIRV1 = {
  kind: EffectKindV1;
  detail: string;
  sourceTextSpan?: string;
};

export type CostTargetLegalityClauseSetV1 = {
  costClauses?: string[];
  targetClauses?: string[];
  legalityClauses?: string[];
  effectClauses?: string[];
};

export type CostTargetLegalityCaseV1 = {
  cardName: string;
  context: CostTargetLegalityContextV1;
  clauses: CostTargetLegalityClauseSetV1;
};

export type CostTargetLegalityAnalysisV1 = {
  cardName: string;
  context: CostTargetLegalityContextV1;
  costs: CostIR;
  targets: TargetSpec[];
  legality: LegalityGate[];
  effects: EffectIRV1[];
};

const COST_KIND_ORDER: CostKind[] = [
  "SACRIFICE",
  "PAY_LIFE",
  "DISCARD",
  "REMOVE_COUNTER",
  "MANA",
  "TAP",
  "UNTAP",
  "OTHER_COST_TEXT",
];

function normalizeClause(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function normalizeClauses(clauses: string[] | undefined): string[] {
  if (!clauses || clauses.length === 0) return [];
  return clauses.map((clause) => normalizeClause(clause)).filter((clause) => clause.length > 0);
}

function detectCostKindsFromClause(clause: string): CostKind[] {
  const lowered = clause.toLowerCase();
  const symbols = clause.match(/\{[^}]+\}/g) ?? [];
  const manaSymbols = symbols.filter((symbol) => !/^\{t\}$/i.test(symbol) && !/^\{q\}$/i.test(symbol));
  const kinds = new Set<CostKind>();

  if (/\bsacrifice\b/.test(lowered)) kinds.add("SACRIFICE");
  if (/\bpay\b[^.]*\blife\b/.test(lowered)) kinds.add("PAY_LIFE");
  if (/\bdiscard\b/.test(lowered)) kinds.add("DISCARD");
  if (/\bremove\b[^.]*\bcounter\b/.test(lowered)) kinds.add("REMOVE_COUNTER");
  if (manaSymbols.length > 0) kinds.add("MANA");
  if (symbols.some((symbol) => /^\{t\}$/i.test(symbol))) kinds.add("TAP");
  if (symbols.some((symbol) => /^\{q\}$/i.test(symbol))) kinds.add("UNTAP");
  if (kinds.size === 0) kinds.add("OTHER_COST_TEXT");

  return COST_KIND_ORDER.filter((kind) => kinds.has(kind));
}

function costDetailForKind(kind: CostKind, clause: string): string {
  if (kind === "MANA") {
    const symbols = clause.match(/\{[^}]+\}/g) ?? [];
    const manaSymbols = symbols.filter((symbol) => !/^\{t\}$/i.test(symbol) && !/^\{q\}$/i.test(symbol));
    return manaSymbols.join("") || clause;
  }
  if (kind === "TAP") return "{T}";
  if (kind === "UNTAP") return "{Q}";
  return clause;
}

function analyzeCosts(costClauses: string[]): CostIR {
  const items: CostItem[] = [];
  for (const clause of costClauses) {
    const kinds = detectCostKindsFromClause(clause);
    for (const kind of kinds) {
      items.push({
        kind,
        detail: costDetailForKind(kind, clause),
        sourceTextSpan: clause,
      });
    }
  }
  return { items };
}

function detectTargetKindsFromClause(clause: string): TargetKind[] {
  const lowered = clause.toLowerCase();
  if (/\btarget artifact,\s*creature,\s*or\s*land\b/.test(lowered)) {
    return ["ARTIFACT", "CREATURE", "LAND"];
  }
  if (/\btarget creature\b/.test(lowered)) return ["CREATURE"];
  if (/\btarget artifact\b/.test(lowered)) return ["ARTIFACT"];
  if (/\btarget land\b/.test(lowered)) return ["LAND"];
  if (/\btarget permanent\b/.test(lowered)) return ["PERMANENT"];
  return ["UNKNOWN_TARGET_KIND"];
}

function analyzeTargets(targetClauses: string[]): TargetSpec[] {
  const specs: TargetSpec[] = [];
  for (const clause of targetClauses) {
    if (!/\btarget\b/i.test(clause)) continue;
    specs.push({
      required: true,
      minTargets: 1,
      maxTargets: 1,
      targetKinds: detectTargetKindsFromClause(clause),
      sourceTextSpan: clause,
    });
  }
  return specs;
}

function analyzeLegality(legalityClauses: string[]): LegalityGate[] {
  const gates: LegalityGate[] = [];
  for (const clause of legalityClauses) {
    const controlsType = clause.match(/activate only if you control an?\s+([a-z]+)/i);
    if (controlsType) {
      gates.push({
        kind: "CONTROLS_PERMANENT_TYPE",
        detail: `control ${controlsType[1]!.toLowerCase()}`,
        sourceTextSpan: clause,
      });
      continue;
    }
    if (/activate only/i.test(clause)) {
      gates.push({
        kind: "ACTIVATE_ONLY_AS_SORCERY",
        detail: clause,
        sourceTextSpan: clause,
      });
      continue;
    }
    if (/cast this spell only (if|during|before)\b/i.test(clause)) {
      gates.push({
        kind: "CAST_ONLY_IF" as LegalityGate["kind"],
        detail: clause,
        sourceTextSpan: clause,
      });
      continue;
    }
    gates.push({
      kind: "OTHER_LEGALITY_TEXT",
      detail: clause,
      sourceTextSpan: clause,
    });
  }
  return gates;
}

function detectEffectKind(clause: string): EffectKindV1 {
  const lowered = clause.toLowerCase();
  if (/\bdraw\b[^.]*\bcards?\b/.test(lowered)) return "DRAW_CARDS";
  if (/\bdestroy\b/.test(lowered)) return "DESTROY";
  if (/\btap\b[^.]*\btarget\b[^.]*\bpermanent\b/.test(lowered)) return "TAP_PERMANENT";
  if (/\bscry\b/.test(lowered)) return "SCRY";
  return "OTHER_EFFECT_TEXT";
}

function analyzeEffects(effectClauses: string[]): EffectIRV1[] {
  return effectClauses.map((clause) => ({
    kind: detectEffectKind(clause),
    detail: clause,
    sourceTextSpan: clause,
  }));
}

export function analyzeCostTargetLegalityCaseV1(
  input: CostTargetLegalityCaseV1,
): CostTargetLegalityAnalysisV1 {
  const normalized = {
    costClauses: normalizeClauses(input.clauses.costClauses),
    targetClauses: normalizeClauses(input.clauses.targetClauses),
    legalityClauses: normalizeClauses(input.clauses.legalityClauses),
    effectClauses: normalizeClauses(input.clauses.effectClauses),
  };

  return {
    cardName: input.cardName,
    context: input.context,
    costs: analyzeCosts(normalized.costClauses),
    targets: analyzeTargets(normalized.targetClauses),
    legality: analyzeLegality(normalized.legalityClauses),
    effects: analyzeEffects(normalized.effectClauses),
  };
}
