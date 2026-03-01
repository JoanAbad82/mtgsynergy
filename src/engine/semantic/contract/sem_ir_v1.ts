export const SEM_IR_VERSION = 1 as const;

export enum FrameKind {
  TRIGGERED = 1,
  ACTIVATED = 2,
  STATIC = 3,
  SPELL = 4,
}

export enum EventId {
  UNKNOWN_EVENT = 0,
  CAST_SPELL = 1,
  ENTERS_BATTLEFIELD = 2,
  LEAVES_BATTLEFIELD = 3,
  CREATURE_DIES = 4,
  SACRIFICE = 5,
  DISCARD = 6,
  DRAW = 7,
  DEAL_DAMAGE = 8,
  LIFE_GAIN = 9,
  LIFE_LOSS = 10,
  COUNTER_PLACED = 11,
  TOKEN_CREATED = 12,
  TAP = 13,
  UNTAP = 14,
  UPKEEP_STEP = 15,
  DRAW_STEP = 16,
  SEARCH_LIBRARY = 17,
  SHUFFLE = 18,
  CONTROL_CHANGE = 19,
  DRAW_SECOND_CARD_TURN = 20,
}

export enum ActionId {
  UNKNOWN_ACTION = 0,
  DRAW_CARDS = 1,
  DISCARD_CARDS = 2,
  CREATE_TOKEN = 3,
  ADD_COUNTERS = 4,
  DEAL_DAMAGE = 5,
  GAIN_LIFE = 6,
  LOSE_LIFE = 7,
  SACRIFICE_PERMANENT = 8,
  DESTROY_PERMANENT = 9,
  EXILE_PERMANENT = 10,
  RETURN_TO_HAND = 11,
  SEARCH_LIBRARY = 12,
  MILL_CARDS = 13,
  PRODUCE_MANA = 14,
  TAP = 15,
  UNTAP = 16,
  SCRY = 17,
  SURVEIL = 18,
  CHANGE_CONTROL = 19,
  COPY_SPELL = 20,
  COPY_PERMANENT = 21,
  EXILE_FACE_DOWN = 22,
}

export enum CostId {
  UNKNOWN_COST = 0,
  PAY_MANA = 1,
  TAP_AS_COST = 2,
  SACRIFICE_AS_COST = 3,
  DISCARD_AS_COST = 4,
  PAY_LIFE_AS_COST = 5,
}

export enum ResourceId {
  UNKNOWN_RESOURCE = 0,
  MANA = 1,
  LIFE = 2,
  CARD = 3,
  COUNTER_P1P1 = 4,
  COUNTER_LOYALTY = 5,
  COUNTER_MINUS1MINUS1 = 6,
  COUNTER_POISON = 7,
  COUNTER_ENERGY = 8,
  TOKEN_GENERIC = 9,
  TOKEN_TREASURE = 10,
  TOKEN_FOOD = 11,
  TOKEN_CLUE = 12,
  TOKEN_BLOOD = 13,
  TOKEN_SOLDIER = 14,
  TOKEN_ZOMBIE = 15,
}

export enum TokenKindId {
  UNKNOWN_TOKEN = 0,
  TREASURE = 1,
  FOOD = 2,
  CLUE = 3,
  BLOOD = 4,
  SOLDIER = 5,
  ZOMBIE = 6,
}

export enum GateId {
  UNKNOWN_GATE = 0,
  YOU_CONTROL = 1,
  OPPONENT_CONTROL = 2,
  TARGET_REQUIRED = 3,
  ANOTHER = 4,
  NONTOKEN = 5,
  ONCE_PER_TURN = 6,
  EACH_OPPONENT = 7,
  UP_TO = 8,
  MAY = 9,
}

export interface EventRef {
  id: EventId;
  args?: ReadonlyArray<number>;
}

export interface TokenData {
  kind: TokenKindId;
  n?: number;
  p?: number;
  t?: number;
  colorMask?: number;
}

export interface EffectAtom {
  action: ActionId;
  args?: ReadonlyArray<number>;
  tokenData?: TokenData;
}

export interface ResourceRef {
  id: ResourceId;
  count?: number;
  args?: ReadonlyArray<number>;
}

export interface Gate {
  id: GateId;
  args?: ReadonlyArray<number>;
}

export interface CostAtom {
  cost: CostId;
  res?: ResourceId;
  n?: number;
  x?: boolean;
}

export interface SemanticFrame {
  kind: FrameKind;
  watch: ReadonlyArray<EventRef>;
  do: ReadonlyArray<EffectAtom>;
  touch: ReadonlyArray<ResourceRef>;
  gates: ReadonlyArray<Gate>;
  cost: ReadonlyArray<CostAtom>;
  mana_value?: number;
}

export interface SemanticCardIR {
  card_id: number;
  frames: ReadonlyArray<SemanticFrame>;
}

export function maxEnumValue(e: Record<string, number | string>): number {
  let max = 0;
  for (const value of Object.values(e)) {
    if (typeof value === "number" && value > max) {
      max = value;
    }
  }
  return max;
}

const MAX_EVENT_ID = maxEnumValue(EventId);
const MAX_ACTION_ID = maxEnumValue(ActionId);
const MAX_COST_ID = maxEnumValue(CostId);
const MAX_RESOURCE_ID = maxEnumValue(ResourceId);
const MAX_TOKEN_KIND_ID = maxEnumValue(TokenKindId);
const MAX_GATE_ID = maxEnumValue(GateId);

export function isValidEventId(id: number): id is EventId {
  return Number.isInteger(id) && id >= 0 && id <= MAX_EVENT_ID;
}

export function isValidActionId(id: number): id is ActionId {
  return Number.isInteger(id) && id >= 0 && id <= MAX_ACTION_ID;
}

export function isValidCostId(id: number): id is CostId {
  return Number.isInteger(id) && id >= 0 && id <= MAX_COST_ID;
}

export function isValidResourceId(id: number): id is ResourceId {
  return Number.isInteger(id) && id >= 0 && id <= MAX_RESOURCE_ID;
}

export function isValidTokenKindId(id: number): id is TokenKindId {
  return Number.isInteger(id) && id >= 0 && id <= MAX_TOKEN_KIND_ID;
}

export function isValidGateId(id: number): id is GateId {
  return Number.isInteger(id) && id >= 0 && id <= MAX_GATE_ID;
}

export function isKnownEventId(id: number): id is EventId {
  return Number.isInteger(id) && id > 0 && id <= MAX_EVENT_ID;
}

export function isKnownActionId(id: number): id is ActionId {
  return Number.isInteger(id) && id > 0 && id <= MAX_ACTION_ID;
}

export function isKnownCostId(id: number): id is CostId {
  return Number.isInteger(id) && id > 0 && id <= MAX_COST_ID;
}

export function isKnownResourceId(id: number): id is ResourceId {
  return Number.isInteger(id) && id > 0 && id <= MAX_RESOURCE_ID;
}

export function isKnownTokenKindId(id: number): id is TokenKindId {
  return Number.isInteger(id) && id > 0 && id <= MAX_TOKEN_KIND_ID;
}

export function isKnownGateId(id: number): id is GateId {
  return Number.isInteger(id) && id > 0 && id <= MAX_GATE_ID;
}
