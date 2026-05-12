import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { normalizeCardName } from "../../cards/normalize";
import { buildCostTargetLegalityHints } from "../lowering/lower_to_ability_ir_min_v1";

type ModeSelectionKind =
  | "CHOOSE_ONE"
  | "CHOOSE_TWO"
  | "CHOOSE_ONE_OR_MORE"
  | "SPLIT_DIVIDED_DAMAGE_NON_MODAL"
  | "UNKNOWN_MODAL_SELECTION";

type CardsIndexPayload = {
  by_name?: Record<string, { oracle_text?: string | null; type_line?: string | null }>;
  by_name_norm?: Record<string, string>;
};

type ContractRow = {
  card_name: string;
  kind: string;
  mode_selection_kind: ModeSelectionKind;
  selected_modes_min: number | null;
  selected_modes_max: number | null;
  modes_total: number | null;
  targeted_modes_count: number | null;
  conceptual_target_slots_min: number | null;
  conceptual_target_slots_max: number | null;
  aggregated_target_kinds: string[];
  notes: string;
  known_gap: string | null;
};

type ContractModel = {
  compatibility: {
    additive_to_sem_cost_target_legality_min_v1: boolean;
    replaces_target_kinds: boolean;
    replaces_target_count: boolean;
    target_kinds_remain_diagnostic_aggregation: boolean;
    target_count_remains_diagnostic_aggregation: boolean;
  };
  initial_contract_corpus: ContractRow[];
};

type ExtractionDiagnosisSnapshot = {
  cardName: string;
  canonicalName: string;
  mode_selection_kind: ModeSelectionKind;
  selected_modes_min: number | null;
  selected_modes_max: number | null;
  modes_total: number | null;
  targeted_modes_count: number | null;
  conceptual_target_slots_min: number | null;
  conceptual_target_slots_max: number | null;
  aggregated_target_kinds: string[];
  known_gap: string | null;
};

const here = dirname(fileURLToPath(import.meta.url));
const cardsIndexPath = join(here, "../../../../public/data/cards_index.json.gz");
const contractPath = join(
  here,
  "../contract/sem_cost_target_legality_modal_target_selection_model_contract_v1.json",
);

const CORPUS = [
  "Abrade",
  "Kolaghan's Command",
  "Cryptic Command",
  "Prismari Command",
  "Casualties of War",
  "Electrolyze",
] as const;

function loadJson<T>(path: string): T {
  const raw = readFileSync(path, "utf8");
  return JSON.parse(raw) as T;
}

function loadCardsIndex(): CardsIndexPayload {
  const gz = readFileSync(cardsIndexPath);
  const json = gunzipSync(gz).toString("utf8");
  return JSON.parse(json) as CardsIndexPayload;
}

function findCanonicalName(payload: CardsIndexPayload, name: string): string | null {
  const byName = payload.by_name ?? {};
  const byNameNorm = payload.by_name_norm ?? {};
  if (byName[name]) return name;

  const norm = normalizeCardName(name);
  const canonical = byNameNorm[norm];
  if (canonical && byName[canonical]) return canonical;

  if (!name.includes("//")) {
    const prefix = `${norm} //`;
    const matches = Object.entries(byNameNorm)
      .filter(([key]) => key.startsWith(prefix))
      .map(([, value]) => value)
      .filter((value) => value && byName[value]);
    if (matches.length === 1) return matches[0];
  }

  return null;
}

function inferModeSelectionKind(oracleText: string): ModeSelectionKind {
  const lower = oracleText.toLowerCase();
  if (lower.includes("damage divided as you choose among one or two targets")) {
    return "SPLIT_DIVIDED_DAMAGE_NON_MODAL";
  }
  if (/choose one or more\s*[—-]/i.test(oracleText)) {
    return "CHOOSE_ONE_OR_MORE";
  }
  if (/choose two\s*[—-]/i.test(oracleText)) {
    return "CHOOSE_TWO";
  }
  if (/choose one\s*[—-]/i.test(oracleText)) {
    return "CHOOSE_ONE";
  }
  return "UNKNOWN_MODAL_SELECTION";
}

function modeLinesFromOracle(oracleText: string): string[] {
  return oracleText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("•"));
}

function buildExtractionDiagnosisSnapshot(
  cardName: string,
  canonicalName: string,
  oracleText: string,
  typeLine: string | null,
): ExtractionDiagnosisSnapshot {
  // Diagnosis-only local extraction helper; this is not product extraction.
  // modal_selection_model remains additive and is diagnosed here only.
  const mode_selection_kind = inferModeSelectionKind(oracleText);
  const modeLines = modeLinesFromOracle(oracleText);
  const modes_total =
    mode_selection_kind === "SPLIT_DIVIDED_DAMAGE_NON_MODAL" || mode_selection_kind === "UNKNOWN_MODAL_SELECTION"
      ? null
      : modeLines.length;
  const targeted_modes_count =
    mode_selection_kind === "SPLIT_DIVIDED_DAMAGE_NON_MODAL" || mode_selection_kind === "UNKNOWN_MODAL_SELECTION"
      ? null
      : modeLines.filter((line) => /\btarget\b/i.test(line)).length;

  let selected_modes_min: number | null = null;
  let selected_modes_max: number | null = null;
  let conceptual_target_slots_min: number | null = null;
  let conceptual_target_slots_max: number | null = null;
  let known_gap: string | null = null;

  if (mode_selection_kind === "CHOOSE_ONE") {
    selected_modes_min = 1;
    selected_modes_max = 1;
    conceptual_target_slots_min = (targeted_modes_count ?? 0) > 0 ? 1 : 0;
    conceptual_target_slots_max = (targeted_modes_count ?? 0) > 0 ? 1 : 0;
  } else if (mode_selection_kind === "CHOOSE_TWO") {
    selected_modes_min = 2;
    selected_modes_max = 2;
    if (modes_total !== null && targeted_modes_count !== null) {
      const nonTargetedModes = modes_total - targeted_modes_count;
      conceptual_target_slots_min = Math.max(0, 2 - nonTargetedModes);
      conceptual_target_slots_max = Math.min(2, targeted_modes_count);
    }
  } else if (mode_selection_kind === "CHOOSE_ONE_OR_MORE") {
    selected_modes_min = 1;
    selected_modes_max = modes_total;
    if (modes_total !== null && targeted_modes_count !== null) {
      const nonTargetedModes = modes_total - targeted_modes_count;
      conceptual_target_slots_min = targeted_modes_count === 0 ? 0 : nonTargetedModes > 0 ? 0 : 1;
      conceptual_target_slots_max = targeted_modes_count;
    }
  } else if (mode_selection_kind === "SPLIT_DIVIDED_DAMAGE_NON_MODAL") {
    conceptual_target_slots_min = 1;
    conceptual_target_slots_max = 2;
    known_gap = "SPLIT_DIVIDED_DAMAGE_UNMODELLED_IN_MIN_HINTS";
  } else {
    known_gap = "UNKNOWN_MODAL_SELECTION_UNMODELLED";
  }

  const min = buildCostTargetLegalityHints(oracleText, typeLine).costTargetLegalityMin;
  const aggregated_target_kinds = min ? [...min.target_kinds] : [];

  return {
    cardName,
    canonicalName,
    mode_selection_kind,
    selected_modes_min,
    selected_modes_max,
    modes_total,
    targeted_modes_count,
    conceptual_target_slots_min,
    conceptual_target_slots_max,
    aggregated_target_kinds,
    known_gap,
  };
}

describe("cost target legality modal target selection model extraction diagnosis v1", () => {
  it("diagnoses narrow deterministic extraction patterns against frozen additive contract without changing runtime behavior", () => {
    const cardsIndex = loadCardsIndex();
    const contract = loadJson<ContractModel>(contractPath);
    const contractByName = new Map(contract.initial_contract_corpus.map((row) => [row.card_name, row]));

    expect(contract.compatibility.additive_to_sem_cost_target_legality_min_v1).toBe(true);
    expect(contract.compatibility.replaces_target_kinds).toBe(false);
    expect(contract.compatibility.replaces_target_count).toBe(false);
    expect(contract.compatibility.target_kinds_remain_diagnostic_aggregation).toBe(true);
    expect(contract.compatibility.target_count_remains_diagnostic_aggregation).toBe(true);

    const runA = CORPUS.map((cardName) => {
      const canonicalName = findCanonicalName(cardsIndex, cardName);
      expect(canonicalName).toBeTruthy();
      const row = cardsIndex.by_name?.[canonicalName!];
      expect(row).toBeTruthy();
      const oracleText = row?.oracle_text ?? "";
      expect(oracleText.trim().length).toBeGreaterThan(0);
      return buildExtractionDiagnosisSnapshot(cardName, canonicalName!, oracleText, row?.type_line ?? null);
    });

    const runB = CORPUS.map((cardName) => {
      const canonicalName = findCanonicalName(cardsIndex, cardName)!;
      const row = cardsIndex.by_name?.[canonicalName]!;
      return buildExtractionDiagnosisSnapshot(cardName, canonicalName, row.oracle_text ?? "", row.type_line ?? null);
    });

    expect(runA).toEqual(runB);

    for (const snapshot of runA) {
      const expected = contractByName.get(snapshot.cardName);
      expect(expected).toBeTruthy();
      expect(snapshot.mode_selection_kind).toBe(expected?.mode_selection_kind);
      expect(snapshot.selected_modes_min).toBe(expected?.selected_modes_min);
      expect(snapshot.selected_modes_max).toBe(expected?.selected_modes_max);
      expect(snapshot.modes_total).toBe(expected?.modes_total);
      expect(snapshot.targeted_modes_count).toBe(expected?.targeted_modes_count);
      expect(snapshot.conceptual_target_slots_min).toBe(expected?.conceptual_target_slots_min);
      expect(snapshot.conceptual_target_slots_max).toBe(expected?.conceptual_target_slots_max);
      expect(snapshot.aggregated_target_kinds).toEqual(expected?.aggregated_target_kinds ?? []);
      expect(snapshot.known_gap).toBe(expected?.known_gap ?? null);

      expect(snapshot.aggregated_target_kinds).not.toContain("CAST_ONLY_IF");
      expect(snapshot.aggregated_target_kinds).not.toContain("ACTIVATE_ONLY_AS_SORCERY");
      console.log(JSON.stringify(snapshot));
    }

    console.log("MODAL_TARGET_SELECTION_MODEL_EXTRACTION_DIAGNOSIS_COMPLETE");
  });
});
