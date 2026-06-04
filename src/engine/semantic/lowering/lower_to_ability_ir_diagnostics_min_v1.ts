import { ActionId, FrameKind } from "../contract";
import { parseSemanticIrV0 } from "../parser/sem_parser_v1";
import { lowerToAbilityIrMinV1 } from "./lower_to_ability_ir_min_v1";

type LowerInput = {
  name: string;
  oracle_text: string;
  type_line?: string | null;
};

type TemplateKind = "Activated" | "ConditionalTriggered";

const TEMPLATE_KIND_BY_CARD: Record<string, TemplateKind> = {
  "Elvish Mystic": "Activated",
  "Darksteel Ingot": "Activated",
  "Gilded Lotus": "Activated",
  "Worn Powerstone": "Activated",
  "Crystal Ball": "Activated",
  "Millstone": "Activated",
  "Howling Mine": "ConditionalTriggered",
  "Q Symbol Canonical Carrier": "Activated",
};

const EXPECTED_ACTION_BY_CARD: Record<string, ActionId> = {
  "Elvish Mystic": ActionId.PRODUCE_MANA,
  "Darksteel Ingot": ActionId.PRODUCE_MANA,
  "Gilded Lotus": ActionId.PRODUCE_MANA,
  "Worn Powerstone": ActionId.PRODUCE_MANA,
  "Crystal Ball": ActionId.SCRY,
  "Millstone": ActionId.MILL_CARDS,
  "Howling Mine": ActionId.DRAW_CARDS,
  "Q Symbol Canonical Carrier": ActionId.DRAW_CARDS,
};

export type LoweringNullReasonMinV1 =
  | "LOWERED"
  | "NO_BASE_TEMPLATE"
  | "NO_PARSED_FRAME"
  | "FRAME_KIND_MISMATCH"
  | "RUNTIME_WORDING_MISMATCH"
  | "EXPECTED_ACTION_MISMATCH";

export type LoweringDiagnosticResultMinV1 = {
  card_name: string;
  lowered: boolean;
  reason: LoweringNullReasonMinV1;
  frame_kind?: string;
  expected_template_kind?: string;
  notes: string[];
};

function frameKindLabel(frameKind: unknown): string | undefined {
  if (frameKind === undefined || frameKind === null) return undefined;

  if (frameKind === FrameKind.ACTIVATED) return "ACTIVATED";
  if (frameKind === FrameKind.TRIGGERED) return "TRIGGERED";

  const raw = String(frameKind);
  const normalized = raw.toLowerCase();

  if (normalized.includes("activated")) return "ACTIVATED";
  if (normalized.includes("triggered")) return "TRIGGERED";

  return raw;
}

function matchesTemplateKind(expected: TemplateKind, frameKind: unknown): boolean {
  if (expected === "Activated") return frameKind === FrameKind.ACTIVATED;
  if (expected === "ConditionalTriggered") return frameKind === FrameKind.TRIGGERED;

  return false;
}

function hasExpectedAction(cardName: string, actions: ReadonlyArray<{ action: ActionId }>): boolean {
  const expected = EXPECTED_ACTION_BY_CARD[cardName];
  if (expected === undefined) return false;
  return actions.some((entry) => entry.action === expected);
}

function matchesRuntimeHowlingMine(text: string): boolean {
  return /if this artifact is untapped/i.test(text);
}

export function explainLowerToAbilityIrMinV1(input: LowerInput): LoweringDiagnosticResultMinV1 {
  const expectedTemplateKind = TEMPLATE_KIND_BY_CARD[input.name];

  if (!expectedTemplateKind) {
    return {
      card_name: input.name,
      lowered: false,
      reason: "NO_BASE_TEMPLATE",
      notes: ["No base AbilityIR template exists for this card name."],
    };
  }

  const ir = parseSemanticIrV0({
    name: input.name,
    oracle_text: input.oracle_text,
    type_line: input.type_line ?? null,
  });

  const frame = ir.frames[0];

  if (!frame) {
    return {
      card_name: input.name,
      lowered: false,
      reason: "NO_PARSED_FRAME",
      expected_template_kind: expectedTemplateKind,
      notes: ["No semantic frame was parsed for the card oracle text."],
    };
  }

  if (!matchesTemplateKind(expectedTemplateKind, frame.kind)) {
    return {
      card_name: input.name,
      lowered: false,
      reason: "FRAME_KIND_MISMATCH",
      frame_kind: frameKindLabel(frame.kind),
      expected_template_kind: expectedTemplateKind,
      notes: ["Parsed frame kind does not match the base AbilityIR template kind."],
    };
  }

  if (input.name === "Howling Mine" && !matchesRuntimeHowlingMine(input.oracle_text)) {
    return {
      card_name: input.name,
      lowered: false,
      reason: "RUNTIME_WORDING_MISMATCH",
      frame_kind: frameKindLabel(frame.kind),
      expected_template_kind: expectedTemplateKind,
      notes: ["Howling Mine runtime wording must contain: if this artifact is untapped."],
    };
  }

  if (!hasExpectedAction(input.name, frame.do)) {
    return {
      card_name: input.name,
      lowered: false,
      reason: "EXPECTED_ACTION_MISMATCH",
      frame_kind: frameKindLabel(frame.kind),
      expected_template_kind: expectedTemplateKind,
      notes: ["Parsed frame did not contain the expected semantic action for this card."],
    };
  }

  const lowered = lowerToAbilityIrMinV1(input);

  return {
    card_name: input.name,
    lowered: lowered !== null,
    reason: lowered !== null ? "LOWERED" : "EXPECTED_ACTION_MISMATCH",
    frame_kind: frameKindLabel(frame.kind),
    expected_template_kind: expectedTemplateKind,
    notes: lowered !== null ? [] : ["Runtime lowering still returned null after diagnostic checks."],
  };
}
