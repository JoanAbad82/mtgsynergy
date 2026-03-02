import { describe, expect, it } from "vitest";
import { ActionId, EventId, ResourceId } from "../contract";
import {
  OVERLAY_ACTION_IDS,
  OVERLAY_EVENT_IDS,
  OVERLAY_RESOURCE_IDS,
  OVERLAY_TEXT_TAG_IDS,
} from "../overlay/sem_inventory";

function hasNoDuplicates<T>(items: readonly T[]): boolean {
  return new Set(items).size === items.length;
}

function isSortedAscNumber(items: readonly number[]): boolean {
  for (let i = 1; i < items.length; i += 1) {
    if (items[i - 1] > items[i]) return false;
  }
  return true;
}

function isSortedAscString(items: readonly string[]): boolean {
  for (let i = 1; i < items.length; i += 1) {
    if (items[i - 1].localeCompare(items[i]) > 0) return false;
  }
  return true;
}

describe("semantic overlay inventory", () => {
  it("listas no vacías y sin duplicados", () => {
    expect(OVERLAY_EVENT_IDS.length).toBeGreaterThan(0);
    expect(OVERLAY_ACTION_IDS.length).toBeGreaterThan(0);
    expect(OVERLAY_RESOURCE_IDS.length).toBeGreaterThan(0);
    expect(OVERLAY_TEXT_TAG_IDS.length).toBeGreaterThan(0);

    expect(hasNoDuplicates(OVERLAY_EVENT_IDS)).toBe(true);
    expect(hasNoDuplicates(OVERLAY_ACTION_IDS)).toBe(true);
    expect(hasNoDuplicates(OVERLAY_RESOURCE_IDS)).toBe(true);
    expect(hasNoDuplicates(OVERLAY_TEXT_TAG_IDS)).toBe(true);
  });

  it("mantiene orden estable por valor ascendente", () => {
    expect(isSortedAscNumber(OVERLAY_EVENT_IDS as readonly number[])).toBe(true);
    expect(isSortedAscNumber(OVERLAY_ACTION_IDS as readonly number[])).toBe(true);
    expect(isSortedAscNumber(OVERLAY_RESOURCE_IDS as readonly number[])).toBe(true);
    expect(isSortedAscString(OVERLAY_TEXT_TAG_IDS as readonly string[])).toBe(true);
  });

  it("incluye UNKNOWN_EVENT solo como sentinel", () => {
    expect(OVERLAY_EVENT_IDS).toContain(EventId.UNKNOWN_EVENT);
    const runtime = OVERLAY_EVENT_IDS.filter((id) => id !== EventId.UNKNOWN_EVENT);
    expect(runtime).not.toContain(EventId.UNKNOWN_EVENT);
  });

  it("ids numéricos finitos (smoke)", () => {
    for (const id of OVERLAY_EVENT_IDS) {
      expect(Number.isFinite(id)).toBe(true);
    }
    for (const id of OVERLAY_ACTION_IDS) {
      expect(Number.isFinite(id)).toBe(true);
    }
    for (const id of OVERLAY_RESOURCE_IDS) {
      expect(Number.isFinite(id)).toBe(true);
    }
  });
});
