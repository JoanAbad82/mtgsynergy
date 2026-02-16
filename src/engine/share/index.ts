import type { DeckState } from "../domain/types";
import { canonicalizeDeckState, canonicalizeShareState } from "./canonical";
import { decodeTokenToPayload, encodePayloadToToken } from "./codec";
import type { ShareDeckState, ShareStatePayload } from "./types";

export const SHARE_WARN_CHARS = 2000;
export const SHARE_HARD_CHARS = 3500;

export function isShareWarn(token: string): boolean {
  return token.length > SHARE_WARN_CHARS;
}

function getSchemaVersion(ds: DeckState | ShareDeckState): number {
  const version = (ds as ShareDeckState).schema_version;
  return typeof version === "number" ? version : 1;
}

export function exportShareJson(ds: DeckState | ShareDeckState): string {
  const payload = canonicalizeDeckState(ds as DeckState, getSchemaVersion(ds));
  return JSON.stringify(payload);
}

export function importShareJson(json: string): ShareDeckState {
  const raw = JSON.parse(json) as ShareStatePayload;
  const schema_version = raw.schema_version ?? 1;
  const deck = raw.deck ?? { entries: [] };
  const edges = raw.edges ?? [];
  const pipelines_active = raw.pipelines_active ?? [];
  const sim = raw.sim;

  return canonicalizeShareState({
    deck,
    edges,
    pipelines_active,
    sim,
    schema_version,
  } as DeckState & { schema_version: number });
}

export function encodeShareState(ds: DeckState | ShareDeckState): string {
  const payload = canonicalizeDeckState(ds as DeckState, getSchemaVersion(ds));
  const token = encodePayloadToToken(JSON.stringify(payload));
  if (token.length > SHARE_HARD_CHARS) {
    throw new Error("SHARE_URL_TOO_LONG");
  }
  return token;
}

export function decodeShareState(token: string): ShareDeckState {
  const json = decodeTokenToPayload(token);
  const payload = JSON.parse(json) as ShareStatePayload;
  return canonicalizeShareState({
    deck: payload.deck,
    edges: payload.edges ?? [],
    pipelines_active: payload.pipelines_active ?? [],
    sim: payload.sim,
    schema_version: payload.schema_version ?? 1,
  } as DeckState & { schema_version: number });
}
