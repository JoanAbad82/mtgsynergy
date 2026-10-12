// @ts-ignore - Pako is already a runtime dependency; the baseline repository lacks its type package.
import pako from "pako";
import type { DeckContextCandidateScore } from "./types";

export const SUPPORTED_DECK_FORMATS = [
  "standard", "pioneer", "modern", "legacy", "vintage", "pauper",
] as const;
export type DeckLegalFormat = (typeof SUPPORTED_DECK_FORMATS)[number];

type ScryfallLegalStatus = "legal" | "not_legal" | "banned" | "restricted";
type LegalitySnapshot = {
  schema_version: string;
  provider: string;
  source_updated_at: string;
  formats: string[];
  by_name_norm: Record<string, Record<string, ScryfallLegalStatus>>;
};

export type LegalityCheckResult = {
  legal: DeckContextCandidateScore[];
  unknown: DeckContextCandidateScore[];
  excluded: number;
  restricted: number;
  sourceUpdatedAt: string | null;
  degraded: boolean;
  warning: string | null;
};

export const MAX_LEGALITY_SNAPSHOT_AGE_DAYS = 30;
export const LEGALITY_SNAPSHOT_PATH = "/data/cards_format_legalities.json.gz";
let sourcePromise: Promise<LegalitySnapshot> | null = null;

function normalizeCard(name: string): string {
  return name.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
}

async function loadSnapshot(): Promise<LegalitySnapshot> {
  if (!sourcePromise) {
    sourcePromise = (async () => {
      const res = await fetch(LEGALITY_SNAPSHOT_PATH);
      if (!res.ok) throw Error("Legality index unavailable");
      const data = new Uint8Array(await res.arrayBuffer());
      const text = (data[0] === 0x1f && data[1] === 0x8b)
        ? pako.ungzip(data, { to: "string" })
        : new TextDecoder().decode(data);
      const parsed: unknown = JSON.parse(text);
      if (!parsed || typeof parsed !== "object") throw Error("Invalid legality index");
      const p = parsed as LegalitySnapshot;
      if (p.schema_version !== "cards-format-legalities-v1" ||
          p.provider !== "Scryfall" ||
          !Array.isArray(p.formats) || !p.by_name_norm ||
          typeof p.by_name_norm !== "object" ||
          typeof p.source_updated_at !== "string") {
        throw Error("Incompatible legality index");
      }
      return p;
    })().catch((e) => {
      sourcePromise = null; // failures do not persist; fail closed for this request
      throw e;
    });
  }
  return sourcePromise;
}

export function clearLegalityIndexCacheForTests(): void {
  sourcePromise = null;
}

export async function selectFormatLegalCandidates(
  ranked: readonly DeckContextCandidateScore[],
  format: DeckLegalFormat,
  options?: {
    fetchSnapshot?: () => Promise<LegalitySnapshot>;
    now?: Date;
  },
): Promise<LegalityCheckResult> {
  const unknownResult = (message: string, sourceUpdatedAt: string | null = null): LegalityCheckResult => ({
    legal: [], unknown: [...ranked], excluded: 0, restricted: 0,
    sourceUpdatedAt, degraded: true, warning: message,
  });
  if (!SUPPORTED_DECK_FORMATS.includes(format)) return unknownResult("Formato no admitido.");
  let snapshot: LegalitySnapshot;
  try {
    snapshot = await (options?.fetchSnapshot ?? loadSnapshot)();
  } catch {
    return unknownResult("No se pudo verificar la legalidad: ninguna candidata se considera validada.");
  }
  if (!snapshot.formats.includes(format)) {
    return unknownResult("La instantánea no incluye el formato seleccionado.", snapshot.source_updated_at);
  }
  const snapshotTime = Date.parse(snapshot.source_updated_at);
  const nowTime = (options?.now ?? new Date()).getTime();
  if (!Number.isFinite(snapshotTime) || snapshotTime > nowTime + 86_400_000 ||
      (nowTime - snapshotTime) > MAX_LEGALITY_SNAPSHOT_AGE_DAYS * 86_400_000) {
    return unknownResult("Los datos de legalidad están caducados o no tienen fecha fiable.", snapshot.source_updated_at);
  }
  const legal: DeckContextCandidateScore[] = [];
  const unknown: DeckContextCandidateScore[] = [];
  let excluded = 0;
  let restricted = 0;
  for (const row of ranked) {
    const value = snapshot.by_name_norm[normalizeCard(row.candidate.card.name)];
    const status = value?.[format];
    if (status === "legal") legal.push(row);
    else if (status === "not_legal" || status === "banned") excluded++;
    else {
      unknown.push(row);
      if (status === "restricted") restricted++;
    }
  }
  return {
    legal, unknown, excluded, restricted,
    sourceUpdatedAt: snapshot.source_updated_at,
    degraded: unknown.length > 0,
    warning: unknown.length > 0
      ? "Algunas candidatas carecen de legalidad confirmada o tienen restricciones; no se recomiendan."
      : null,
  };
}
