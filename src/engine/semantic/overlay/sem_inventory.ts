import { ActionId, EventId, ResourceId } from "../contract";
import type { SemanticTextTagId } from "./sem_coverage_report";

// Inventario canónico del overlay (determinista). UNKNOWN_EVENT es sentinel.
export const OVERLAY_EVENT_IDS = [
  EventId.UNKNOWN_EVENT,
  EventId.CAST_SPELL,
  EventId.ENTERS_BATTLEFIELD,
  EventId.LEAVES_BATTLEFIELD,
  EventId.CREATURE_DIES,
  EventId.SACRIFICE,
  EventId.LIFE_GAIN,
  EventId.TOKEN_CREATED,
  EventId.DRAW_EXTRA_CARD_TURN,
] as const satisfies readonly EventId[];

export const OVERLAY_ACTION_IDS = [
  ActionId.DRAW_CARDS,
  ActionId.DISCARD_CARDS,
  ActionId.CREATE_TOKEN,
  ActionId.ADD_COUNTERS,
  ActionId.DEAL_DAMAGE,
  ActionId.GAIN_LIFE,
  ActionId.LOSE_LIFE,
  ActionId.DESTROY_PERMANENT,
  ActionId.UNTAP,
  ActionId.CHANGE_CONTROL,
] as const satisfies readonly ActionId[];

export const OVERLAY_RESOURCE_IDS = [
  ResourceId.UNKNOWN_RESOURCE,
  ResourceId.LIFE,
  ResourceId.CARD,
  ResourceId.COUNTER_P1P1,
  ResourceId.TOKEN_GENERIC,
  ResourceId.TOKEN_TREASURE,
  ResourceId.TOKEN_FOOD,
  ResourceId.TOKEN_CLUE,
  ResourceId.TOKEN_BLOOD,
  ResourceId.TOKEN_SOLDIER,
  ResourceId.TOKEN_ZOMBIE,
] as const satisfies readonly ResourceId[];

export const OVERLAY_TEXT_TAG_IDS = [
  "DIES",
  "DRAW",
  "ETB",
  "SACRIFICE",
  "SPELLS",
  "TOKEN",
] as const satisfies readonly SemanticTextTagId[];

export function isOverlayEventId(id: EventId): boolean {
  return (OVERLAY_EVENT_IDS as readonly EventId[]).includes(id);
}

export function isOverlayActionId(id: ActionId): boolean {
  return (OVERLAY_ACTION_IDS as readonly ActionId[]).includes(id);
}

export function isOverlayResourceId(id: ResourceId): boolean {
  return (OVERLAY_RESOURCE_IDS as readonly ResourceId[]).includes(id);
}

export function isOverlayTextTagId(id: SemanticTextTagId): boolean {
  return (OVERLAY_TEXT_TAG_IDS as readonly SemanticTextTagId[]).includes(id);
}
