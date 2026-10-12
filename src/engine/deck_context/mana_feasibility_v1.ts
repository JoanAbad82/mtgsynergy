// @ts-ignore - pako is a runtime dependency; the baseline project omits its typings.
import pako from "pako";
import { resolveUniqueSnapshotNameKey } from "../cards/canonical_identity_v1";
import type { DeckContextCandidateScore } from "./types";
import { MAX_LEGALITY_SNAPSHOT_AGE_DAYS } from "./format_legality_v1";

const COLORS = ["W", "U", "B", "R", "G"] as const;
type ManaColor = (typeof COLORS)[number];
export const MANA_SIGNALS_URL = "/data/cards_mana_signals.json.gz";

export type ManaSignal = {
  type: "land" | "nonland";
  mana_cost: string | null;
  identity: readonly string[];
  produced: readonly string[];
  conditional: boolean;
  complex_cast: boolean;
};
export type ManaSnapshot = {
  schema_version: "cards-mana-signals-v1";
  provider: "Scryfall";
  source_updated_at: string;
  by_name_norm: Record<string, ManaSignal | null>;
};
export type ManaFit = "direct" | "needs_review" | "unknown";
export type ManaCardDecision = {
  row: DeckContextCandidateScore;
  fit: ManaFit;
  required: ManaColor[];
  withoutDirectSource: ManaColor[];
  note: string;
};
export type ManaFitResult = {
  direct: ManaCardDecision[];
  needsReview: ManaCardDecision[];
  unknown: ManaCardDecision[];
  evaluatedCount: number;
  directColors: ManaColor[];
  landSourcesNotModelled: number;
  sourceUpdatedAt: string | null;
  degraded: boolean;
  warning: string | null;
};
export type ManaDeckEntry = {name: string; name_norm?: string; count?: number};

let manaPromise: Promise<ManaSnapshot> | null = null;
export function clearManaCacheForTests(): void { manaPromise = null; }
function isColor(value: string): value is ManaColor {
  return COLORS.some(color => color === value);
}
async function loadManaIndex(): Promise<ManaSnapshot> {
  if (!manaPromise) {
    manaPromise = (async () => {
      const response = await fetch(MANA_SIGNALS_URL);
      if (!response.ok) throw Error("Mana signals unavailable");
      const data = new Uint8Array(await response.arrayBuffer());
      const text = data[0] === 0x1f && data[1] === 0x8b
        ? pako.ungzip(data, {to: "string"})
        : new TextDecoder().decode(data);
      const doc: unknown = JSON.parse(text);
      if (!doc || typeof doc !== "object") throw Error("Invalid mana signals");
      const snapshot = doc as ManaSnapshot;
      if (snapshot.schema_version !== "cards-mana-signals-v1" ||
          snapshot.provider !== "Scryfall" ||
          typeof snapshot.source_updated_at !== "string" ||
          !snapshot.by_name_norm || typeof snapshot.by_name_norm !== "object") {
        throw Error("Wrong mana schema");
      }
      return snapshot;
    })().catch(error => {manaPromise = null; throw error;});
  }
  return manaPromise;
}
function getCard(map: ManaSnapshot["by_name_norm"], name: string): ManaSignal | null {
  const key = resolveUniqueSnapshotNameKey(map, name);
  return key === null ? null : map[key] ?? null;
}

/** Only unambiguous colored pips are modelled. Hybrid, phyrexian, split and
 * alternative costs are UNKNOWN rather than claims of incompatibility. */
export function parseRequiredDirectColors(cost: string | null, complex = false): ManaColor[] | null {
  if (cost === null || complex) return null;
  if (cost === "") return [];
  const parts = [...cost.matchAll(/\{([^{}]+)\}/g)];
  if (parts.length === 0 || parts.map(x => x[0]).join("") !== cost) return null;
  const result = new Set<ManaColor>();
  for (const part of parts) {
    const symbol = part[1];
    if (isColor(symbol)) result.add(symbol);
    else if (!/^(?:\d+|[XYZCS])$/.test(symbol)) return null;
  }
  return COLORS.filter(c => result.has(c));
}

export function assessManaAgainstSnapshot(
  legal: readonly DeckContextCandidateScore[],
  entries: readonly ManaDeckEntry[],
  snapshot: ManaSnapshot,
  now: Date = new Date(),
): ManaFitResult {
  const unknownAll = (message: string): ManaFitResult => ({
    direct: [], needsReview: [],
    unknown: legal.map(row => ({
      row, fit: "unknown", required: [], withoutDirectSource: [],
      note: "No hay datos suficientemente fiables para valorar el maná.",
    })),
    evaluatedCount: legal.length,
    directColors: [], landSourcesNotModelled: entries.length,
    sourceUpdatedAt: snapshot.source_updated_at,
    degraded: true, warning: message,
  });
  const stamp = Date.parse(snapshot.source_updated_at);
  if (!Number.isFinite(stamp) || stamp > now.getTime() + 86_400_000 ||
      now.getTime() - stamp > MAX_LEGALITY_SNAPSHOT_AGE_DAYS * 86_400_000) {
    return unknownAll("El índice de maná no tiene una fecha válida o ha caducado.");
  }
  const directColors = new Set<ManaColor>();
  let landSourcesNotModelled = 0;
  for (const entry of entries) {
    const card = getCard(snapshot.by_name_norm, entry.name);
    if (!card || card.type !== "land") {
      if (!card) landSourcesNotModelled++;
      continue;
    }
    if (card.conditional || card.produced.length === 0) {
      landSourcesNotModelled++;
      continue;
    }
    for (const color of card.produced) if (isColor(color)) directColors.add(color);
  }

  const direct: ManaCardDecision[] = [];
  const needsReview: ManaCardDecision[] = [];
  const unknown: ManaCardDecision[] = [];
  for (const row of legal) {
    const card = getCard(snapshot.by_name_norm, row.candidate.card.name);
    const required = card && card.type !== "land"
      ? parseRequiredDirectColors(card.mana_cost, card.complex_cast)
      : null;
    if (required === null) {
      unknown.push({row, fit: "unknown", required: [], withoutDirectSource: [],
        note: "Coste alternativo, carta de tierra o datos de maná no modelados."});
      continue;
    }
    const missing = required.filter(c => !directColors.has(c));
    if (missing.length === 0) {
      direct.push({row, fit: "direct", required, withoutDirectSource: [],
        note: "Hay tierras registradas que producen los colores de su coste; no certifica curva ni cantidad."});
    } else {
      needsReview.push({row, fit: "needs_review", required,
        withoutDirectSource: missing,
        note: "No se ha acreditado una fuente directa para " + missing.join(", ") +
          ". Puede requerir cambios de tierras o aprovechar fuentes condicionales."});
    }
  }
  return {
    direct, needsReview, unknown, evaluatedCount: legal.length,
    directColors: COLORS.filter(c => directColors.has(c)),
    landSourcesNotModelled, sourceUpdatedAt: snapshot.source_updated_at,
    degraded: unknown.length > 0 || landSourcesNotModelled > 0,
    warning: landSourcesNotModelled > 0
      ? "Hay tierras o fuentes de maná condicionadas no modeladas. La clasificación es orientativa."
      : null,
  };
}

export async function prioritizeLegalDeckCandidatesByMana(
  legal: readonly DeckContextCandidateScore[],
  entries: readonly ManaDeckEntry[],
  options?: {fetchSnapshot?: () => Promise<ManaSnapshot>; now?: Date},
): Promise<ManaFitResult> {
  try {
    const snapshot = await (options?.fetchSnapshot ?? loadManaIndex)();
    return assessManaAgainstSnapshot(legal, entries, snapshot, options?.now);
  } catch {
    return {
      direct: [], needsReview: [], unknown: legal.map(row => ({
        row, fit: "unknown" as const, required: [], withoutDirectSource: [],
        note: "Índice de maná no disponible; carta legal, viabilidad por maná sin comprobar.",
      })),
      evaluatedCount: legal.length, directColors: [], landSourcesNotModelled: entries.length,
      sourceUpdatedAt: null, degraded: true,
      warning: "No se puede comprobar el maná: ninguna sugerencia se etiqueta como viable.",
    };
  }
}
