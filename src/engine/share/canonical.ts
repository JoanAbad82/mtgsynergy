import type { CardEntry, DeckState } from "../domain/types";
import { normalizeCardName } from "../normalize/normalize";
import type { ShareDeckState, ShareStatePayload } from "./types";

export function canonicalizeDeckState(
  ds: DeckState,
  schema_version = 1,
): ShareStatePayload {
  const merged = new Map<string, CardEntry>();

  for (const entry of ds.deck.entries) {
    const name = entry.name.trim();
    const name_norm = normalizeCardName(name);

    if (!Number.isInteger(entry.count) || entry.count < 1) {
      throw new Error("COUNT_INVALID_SHARE");
    }

    const existing = merged.get(name_norm);
    if (existing) {
      existing.count += entry.count;
      continue;
    }

    merged.set(name_norm, {
      name,
      name_norm,
      count: entry.count,
      role_primary: entry.role_primary,
    });
  }

  const entries = Array.from(merged.values()).sort((a, b) =>
    a.name_norm.localeCompare(b.name_norm),
  );

  const deck = { entries };
  const edges = ds.edges ?? [];
  const pipelines_active = ds.pipelines_active ?? [];

  return {
    schema_version,
    deck,
    edges,
    pipelines_active,
    sim: ds.sim,
  };
}

export function canonicalizeShareState(
  ds: DeckState | (DeckState & { schema_version?: number }),
): ShareDeckState {
  const schema_version =
    typeof (ds as { schema_version?: number }).schema_version === "number"
      ? (ds as { schema_version?: number }).schema_version
      : 1;
  const payload = canonicalizeDeckState(ds, schema_version);
  return {
    schema_version: payload.schema_version,
    deck: payload.deck,
    edges: payload.edges ?? [],
    pipelines_active: payload.pipelines_active ?? [],
    sim: payload.sim,
  };
}
