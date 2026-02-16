import type { DeckState } from "../../../engine";
import type { ShareDeckState } from "../../../engine";
import { exportShareJson, importShareJson } from "../../../engine";

export function exportJson(ds: DeckState | ShareDeckState): string {
  return exportShareJson(ds);
}

export function importJson(json: string): ShareDeckState {
  return importShareJson(json);
}
