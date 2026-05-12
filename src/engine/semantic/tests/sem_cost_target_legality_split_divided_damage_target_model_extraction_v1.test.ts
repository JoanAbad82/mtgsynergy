import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { normalizeCardName } from "../../cards/normalize";
import { buildCostTargetLegalityHints } from "../lowering/lower_to_ability_ir_min_v1";

type CardsIndexPayload = {
  by_name?: Record<string, { oracle_text?: string | null; type_line?: string | null }>;
  by_name_norm?: Record<string, string>;
};

type SplitDamageModelKind =
  | "ONE_OR_TWO_TARGETS"
  | "ONE_TWO_OR_THREE_TARGETS"
  | "ANY_NUMBER_OF_TARGETS"
  | "UNKNOWN_SPLIT_DIVIDED_DAMAGE_TARGET_MODEL";

type SplitDividedDamageTargetModelSnapshot = {
  kind: "SPLIT_DIVIDED_DAMAGE_TARGET_MODEL";
  split_damage_model_kind: SplitDamageModelKind;
  conceptual_target_slots_min: number | null;
  conceptual_target_slots_max: number | null;
  damage_allocation_is_divided: boolean;
  productive_min_hint_currently_models_split_damage: boolean;
  target_kinds_policy: string;
  notes: string;
  known_gap: string | null;
};

type Snapshot = {
  cardName: string;
  canonicalName: string;
  current_min_exists: boolean;
  current_target_kinds: string[];
  current_target_count: number | null;
  current_modal_selection_model: "present" | null;
  split_divided_damage_target_model: SplitDividedDamageTargetModelSnapshot | null;
};

const here = dirname(fileURLToPath(import.meta.url));
const cardsIndexPath = join(here, "../../../../public/data/cards_index.json.gz");

const CORPUS = [
  "Electrolyze",
  "Arc Lightning",
  "Flames of the Firebrand",
  "Pyrotechnics",
  "Rolling Thunder",
] as const;

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

function buildSnapshot(payload: CardsIndexPayload, cardName: string): Snapshot {
  const canonicalName = findCanonicalName(payload, cardName);
  if (!canonicalName) {
    throw new Error(`Card not found in local cards index: ${cardName}`);
  }

  const row = payload.by_name?.[canonicalName];
  if (!row) {
    throw new Error(`Missing by_name row for canonical card: ${canonicalName}`);
  }

  const oracleText = row.oracle_text ?? "";
  const hints = buildCostTargetLegalityHints(oracleText, row.type_line ?? null);
  const min = hints.costTargetLegalityMin;
  const splitModel =
    (hints.splitDividedDamageTargetModel as SplitDividedDamageTargetModelSnapshot | undefined) ??
    null;

  return {
    cardName,
    canonicalName,
    current_min_exists: Boolean(min),
    current_target_kinds: min ? [...min.target_kinds] : [],
    current_target_count: min ? min.target_count : null,
    current_modal_selection_model: min?.modal_selection_model ? "present" : null,
    split_divided_damage_target_model: splitModel,
  };
}

describe("cost target legality split divided damage target model extraction v1", () => {
  it("adds split_divided_damage_target_model additively for real split/divided damage corpus", () => {
    const payload = loadCardsIndex();
    const runA = CORPUS.map((cardName) => buildSnapshot(payload, cardName));
    const runB = CORPUS.map((cardName) => buildSnapshot(payload, cardName));

    expect(runA).toEqual(runB);

    const expectedKinds: Record<string, SplitDamageModelKind> = {
      Electrolyze: "ONE_OR_TWO_TARGETS",
      "Arc Lightning": "ONE_TWO_OR_THREE_TARGETS",
      "Flames of the Firebrand": "ONE_TWO_OR_THREE_TARGETS",
      Pyrotechnics: "ANY_NUMBER_OF_TARGETS",
      "Rolling Thunder": "ANY_NUMBER_OF_TARGETS",
    };

    for (const row of runA) {
      expect(row.canonicalName.length).toBeGreaterThan(0);

      // target_kinds / target_count remain diagnostic channels and are not replaced in this phase.
      expect(row.current_min_exists).toBe(false);
      expect(row.current_target_kinds).toEqual([]);
      expect(row.current_target_count).toBeNull();

      // split_divided_damage_target_model remains separate from modal_selection_model.
      expect(row.current_modal_selection_model).toBeNull();
      expect(row.split_divided_damage_target_model).toBeTruthy();
      expect(row.split_divided_damage_target_model?.kind).toBe("SPLIT_DIVIDED_DAMAGE_TARGET_MODEL");
      expect(row.split_divided_damage_target_model?.split_damage_model_kind).toBe(
        expectedKinds[row.cardName],
      );
      expect(row.split_divided_damage_target_model?.damage_allocation_is_divided).toBe(true);
      expect(
        row.split_divided_damage_target_model?.productive_min_hint_currently_models_split_damage,
      ).toBe(true);
      expect(
        row.split_divided_damage_target_model?.target_kinds_policy,
      ).toBe("CURRENTLY_UNMODELLED_EMPTY_TARGET_KINDS");
      expect((row.split_divided_damage_target_model?.notes ?? "").trim().length).toBeGreaterThan(0);

      expect(row.current_target_kinds).not.toContain("CAST_ONLY_IF");
      expect(row.current_target_kinds).not.toContain("ACTIVATE_ONLY_AS_SORCERY");
      const serializedModel = JSON.stringify(row.split_divided_damage_target_model);
      expect(serializedModel).not.toContain("CAST_ONLY_IF");
      expect(serializedModel).not.toContain("ACTIVATE_ONLY_AS_SORCERY");

      console.log(JSON.stringify(row));
    }

    const electrolyze = runA.find((row) => row.cardName === "Electrolyze");
    expect(electrolyze?.split_divided_damage_target_model?.conceptual_target_slots_min).toBe(1);
    expect(electrolyze?.split_divided_damage_target_model?.conceptual_target_slots_max).toBe(2);

    const arcLightning = runA.find((row) => row.cardName === "Arc Lightning");
    expect(arcLightning?.split_divided_damage_target_model?.conceptual_target_slots_min).toBe(1);
    expect(arcLightning?.split_divided_damage_target_model?.conceptual_target_slots_max).toBe(3);

    const flames = runA.find((row) => row.cardName === "Flames of the Firebrand");
    expect(flames?.split_divided_damage_target_model?.conceptual_target_slots_min).toBe(1);
    expect(flames?.split_divided_damage_target_model?.conceptual_target_slots_max).toBe(3);

    for (const name of ["Pyrotechnics", "Rolling Thunder"] as const) {
      const row = runA.find((entry) => entry.cardName === name);
      expect(row?.split_divided_damage_target_model?.conceptual_target_slots_min).toBe(0);
      expect(row?.split_divided_damage_target_model?.conceptual_target_slots_max).toBeNull();
      expect(row?.split_divided_damage_target_model?.known_gap).toContain(
        "ANY_NUMBER_OF_TARGETS_MIN_SLOT_IS_CONSERVATIVE_0",
      );
    }

    console.log("SPLIT_DIVIDED_DAMAGE_TARGET_MODEL_EXTRACTION_V1_COMPLETE");
  });
});
