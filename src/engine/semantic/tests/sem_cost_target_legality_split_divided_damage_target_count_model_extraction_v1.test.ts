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

type TargetCountModel = {
  kind: "ONE_OR_TWO_TARGETS" | "ONE_TWO_OR_THREE_TARGETS" | "ANY_NUMBER_OF_TARGETS";
  min_targets: number;
  max_targets: number | null;
  is_variable: boolean;
  variable_symbol: string | null;
  requires_damage_allocation: true;
  damage_amount_kind: "FIXED" | "VARIABLE";
  damage_amount: number | null;
  raw_text: string;
};

type SplitDividedDamageTargetModelSnapshot = {
  kind: "SPLIT_DIVIDED_DAMAGE_TARGET_MODEL";
  split_damage_model_kind: SplitDamageModelKind;
  conceptual_target_slots_min: number | null;
  conceptual_target_slots_max: number | null;
  damage_allocation_is_divided: boolean;
  productive_min_hint_currently_models_split_damage: boolean;
  target_kinds_policy: string;
  allowed_target_kinds?: string[];
  target_count_model?: TargetCountModel;
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
  current_legality_kinds: string[];
  split_divided_damage_target_model: SplitDividedDamageTargetModelSnapshot | null;
  split_divided_damage_target_model_in_min: SplitDividedDamageTargetModelSnapshot | null;
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

const FORBIDDEN = [
  "CAST_ONLY_IF",
  "ACTIVATE_ONLY_AS_SORCERY",
  "CONTROLS_X",
  "ATTACKED_THIS_TURN",
  "ONCE_EACH_TURN",
  "OTHER_LEGALITY_TEXT",
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

  const hints = buildCostTargetLegalityHints(row.oracle_text ?? "", row.type_line ?? null);
  const min = hints.costTargetLegalityMin;

  const topLevelSplitModel =
    (hints.splitDividedDamageTargetModel as SplitDividedDamageTargetModelSnapshot | undefined) ??
    null;
  const splitModelInMin =
    (min?.split_divided_damage_target_model as SplitDividedDamageTargetModelSnapshot | undefined) ??
    null;

  return {
    cardName,
    canonicalName,
    current_min_exists: Boolean(min),
    current_target_kinds: min ? [...min.target_kinds] : [],
    current_target_count: min ? min.target_count : null,
    current_modal_selection_model: min?.modal_selection_model ? "present" : null,
    current_legality_kinds: min ? [...min.legality_kinds] : [],
    split_divided_damage_target_model: topLevelSplitModel,
    split_divided_damage_target_model_in_min: splitModelInMin,
  };
}

describe("cost target legality split divided damage target count model extraction v1", () => {
  it("emits additive split target_count_model while preserving current min channel boundaries", () => {
    const payload = loadCardsIndex();
    const runA = CORPUS.map((name) => buildSnapshot(payload, name));
    const runB = CORPUS.map((name) => buildSnapshot(payload, name));
    expect(runA).toEqual(runB);

    const expectedKinds: Record<string, SplitDamageModelKind> = {
      Electrolyze: "ONE_OR_TWO_TARGETS",
      "Arc Lightning": "ONE_TWO_OR_THREE_TARGETS",
      "Flames of the Firebrand": "ONE_TWO_OR_THREE_TARGETS",
      Pyrotechnics: "ANY_NUMBER_OF_TARGETS",
      "Rolling Thunder": "ANY_NUMBER_OF_TARGETS",
    };

    const expectedTargetCountModels: Record<string, TargetCountModel> = {
      Electrolyze: {
        kind: "ONE_OR_TWO_TARGETS",
        min_targets: 1,
        max_targets: 2,
        is_variable: false,
        variable_symbol: null,
        requires_damage_allocation: true,
        damage_amount_kind: "FIXED",
        damage_amount: 2,
        raw_text: "2 damage divided as you choose among one or two targets",
      },
      "Arc Lightning": {
        kind: "ONE_TWO_OR_THREE_TARGETS",
        min_targets: 1,
        max_targets: 3,
        is_variable: false,
        variable_symbol: null,
        requires_damage_allocation: true,
        damage_amount_kind: "FIXED",
        damage_amount: 3,
        raw_text: "3 damage divided as you choose among one, two, or three targets",
      },
      "Flames of the Firebrand": {
        kind: "ONE_TWO_OR_THREE_TARGETS",
        min_targets: 1,
        max_targets: 3,
        is_variable: false,
        variable_symbol: null,
        requires_damage_allocation: true,
        damage_amount_kind: "FIXED",
        damage_amount: 3,
        raw_text: "3 damage divided as you choose among one, two, or three targets",
      },
      Pyrotechnics: {
        kind: "ANY_NUMBER_OF_TARGETS",
        min_targets: 1,
        max_targets: null,
        is_variable: true,
        variable_symbol: null,
        requires_damage_allocation: true,
        damage_amount_kind: "FIXED",
        damage_amount: 4,
        raw_text: "4 damage divided as you choose among any number of targets",
      },
      "Rolling Thunder": {
        kind: "ANY_NUMBER_OF_TARGETS",
        min_targets: 1,
        max_targets: null,
        is_variable: true,
        variable_symbol: "X",
        requires_damage_allocation: true,
        damage_amount_kind: "VARIABLE",
        damage_amount: null,
        raw_text: "X damage divided as you choose among any number of targets",
      },
    };

    for (const row of runA) {
      expect(row.canonicalName.length).toBeGreaterThan(0);
      expect(row.split_divided_damage_target_model).toBeTruthy();
      expect(row.split_divided_damage_target_model_in_min).toBeTruthy();

      expect(row.split_divided_damage_target_model?.kind).toBe("SPLIT_DIVIDED_DAMAGE_TARGET_MODEL");
      expect(row.split_divided_damage_target_model?.split_damage_model_kind).toBe(
        expectedKinds[row.cardName],
      );
      expect(row.split_divided_damage_target_model?.allowed_target_kinds).toEqual(["ANY_TARGET"]);
      expect(row.split_divided_damage_target_model_in_min?.allowed_target_kinds).toEqual([
        "ANY_TARGET",
      ]);

      expect(row.current_min_exists).toBe(true);
      expect(row.current_target_kinds).toEqual(["ANY_TARGET"]);
      expect(row.current_target_count).toBeNull();
      expect(row.current_modal_selection_model).toBeNull();
      expect(row.current_legality_kinds).toEqual([]);

      expect(row.split_divided_damage_target_model?.target_count_model).toEqual(
        expectedTargetCountModels[row.cardName],
      );
      expect(row.split_divided_damage_target_model_in_min?.target_count_model).toEqual(
        expectedTargetCountModels[row.cardName],
      );

      for (const forbidden of FORBIDDEN) {
        expect(row.current_target_kinds).not.toContain(forbidden);
        expect(row.current_legality_kinds).not.toContain(forbidden);
        expect(
          JSON.stringify(row.split_divided_damage_target_model?.allowed_target_kinds ?? []),
        ).not.toContain(forbidden);
        expect(JSON.stringify(row.split_divided_damage_target_model)).not.toContain(forbidden);
      }

      console.log(JSON.stringify(row));
    }

    expect(
      runA.find((row) => row.cardName === "Rolling Thunder")?.split_divided_damage_target_model
        ?.target_count_model?.variable_symbol,
    ).toBe("X");
    expect(
      runA.find((row) => row.cardName === "Rolling Thunder")?.split_divided_damage_target_model
        ?.target_count_model?.raw_text,
    ).toContain("X");
    expect(
      runA.find((row) => row.cardName === "Rolling Thunder")?.split_divided_damage_target_model
        ?.target_count_model?.raw_text,
    ).toContain("any number of targets");

    for (const cardName of [
      "Electrolyze",
      "Arc Lightning",
      "Flames of the Firebrand",
      "Pyrotechnics",
    ] as const) {
      const model = runA.find((row) => row.cardName === cardName)?.split_divided_damage_target_model
        ?.target_count_model;
      expect(model?.damage_amount_kind).toBe("FIXED");
      expect(model?.damage_amount).toBeGreaterThan(0);
    }

    expect(
      runA.find((row) => row.cardName === "Electrolyze")?.split_divided_damage_target_model
        ?.target_count_model?.raw_text,
    ).toContain("one or two targets");
    expect(
      runA.find((row) => row.cardName === "Arc Lightning")?.split_divided_damage_target_model
        ?.target_count_model?.raw_text,
    ).toContain("one, two, or three targets");
    expect(
      runA.find((row) => row.cardName === "Flames of the Firebrand")?.split_divided_damage_target_model
        ?.target_count_model?.raw_text,
    ).toContain("one, two, or three targets");
    expect(
      runA.find((row) => row.cardName === "Pyrotechnics")?.split_divided_damage_target_model
        ?.target_count_model?.raw_text,
    ).toContain("any number of targets");

    console.log("TARGET_COUNT_MODEL_EXTRACTION_V1_COMPLETE");
  });
});
