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
  conceptual_target_slots_min: number | null;
  conceptual_target_slots_max: number | null;
  allowed_target_kinds?: string[];
  target_count_model?: TargetCountModel;
};

type Snapshot = {
  cardName: string;
  canonicalName: string;
  current_min_exists: boolean;
  current_target_kinds: string[];
  current_target_count: unknown;
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

const REJECTED_SCALAR_POLICIES = [
  "TARGET_COUNT_EQUALS_MIN_TARGETS",
  "TARGET_COUNT_EQUALS_MAX_TARGETS",
  "TARGET_COUNT_EQUALS_DAMAGE_AMOUNT",
  "TARGET_COUNT_EQUALS_CONCEPTUAL_TARGET_SLOTS_MIN",
  "TARGET_COUNT_EQUALS_CONCEPTUAL_TARGET_SLOTS_MAX",
  "TARGET_COUNT_EQUALS_ZERO_FOR_ANY_NUMBER",
  "TARGET_COUNT_EQUALS_ONE_FOR_ANY_NUMBER",
  "TARGET_COUNT_EQUALS_COMMA_SEPARATED_TARGET_WORDS",
] as const;

const FORBIDDEN_LEGALITY_OR_GATE_VALUES = [
  "CAST_ONLY_IF",
  "ACTIVATE_ONLY_AS_SORCERY",
  "CONTROLS_X",
  "ATTACKED_THIS_TURN",
  "ONCE_EACH_TURN",
  "OTHER_LEGALITY_TEXT",
] as const;

const FORBIDDEN_TARGET_KIND_EXPANSIONS = ["CREATURE", "PLAYER", "PLANESWALKER", "BATTLE"] as const;

const EXPECTED_TARGET_COUNT_MODELS: Record<string, TargetCountModel> = {
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

const CARD_SPECIFIC_FORBIDDEN_SCALAR_PROJECTIONS: Record<string, Array<number | string>> = {
  Electrolyze: [1, 2],
  "Arc Lightning": [1, 3],
  "Flames of the Firebrand": [1, 3],
  Pyrotechnics: [0, 1, 4],
  "Rolling Thunder": [0, 1, "X"],
};

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

  return {
    cardName,
    canonicalName,
    current_min_exists: Boolean(min),
    current_target_kinds: min ? [...min.target_kinds] : [],
    current_target_count: min ? (min as { target_count?: unknown }).target_count ?? null : null,
    current_modal_selection_model: min?.modal_selection_model ? "present" : null,
    current_legality_kinds: min ? [...min.legality_kinds] : [],
    split_divided_damage_target_model:
      (hints.splitDividedDamageTargetModel as SplitDividedDamageTargetModelSnapshot | undefined) ??
      null,
    split_divided_damage_target_model_in_min:
      (min?.split_divided_damage_target_model as SplitDividedDamageTargetModelSnapshot | undefined) ??
      null,
  };
}

function assertNoForbiddenTargetKindLeakage(snapshot: Snapshot): void {
  expect(snapshot.current_target_kinds).toEqual(["ANY_TARGET"]);
  expect(snapshot.split_divided_damage_target_model?.allowed_target_kinds).toEqual(["ANY_TARGET"]);
  if (snapshot.split_divided_damage_target_model_in_min) {
    expect(snapshot.split_divided_damage_target_model_in_min.allowed_target_kinds).toEqual([
      "ANY_TARGET",
    ]);
  }

  for (const forbidden of FORBIDDEN_LEGALITY_OR_GATE_VALUES) {
    expect(snapshot.current_target_kinds).not.toContain(forbidden);
    expect(snapshot.split_divided_damage_target_model?.allowed_target_kinds ?? []).not.toContain(
      forbidden,
    );
    expect(
      snapshot.split_divided_damage_target_model_in_min?.allowed_target_kinds ?? [],
    ).not.toContain(forbidden);
  }

  for (const forbiddenExpansion of FORBIDDEN_TARGET_KIND_EXPANSIONS) {
    expect(snapshot.current_target_kinds).not.toContain(forbiddenExpansion);
    expect(snapshot.split_divided_damage_target_model?.allowed_target_kinds ?? []).not.toContain(
      forbiddenExpansion,
    );
    expect(
      snapshot.split_divided_damage_target_model_in_min?.allowed_target_kinds ?? [],
    ).not.toContain(forbiddenExpansion);
  }
}

function assertNoTargetCountScalarProjection(
  snapshot: Snapshot,
  model: TargetCountModel,
  explicitForbiddenScalars: Array<number | string>,
): void {
  // Runtime scalar policy must remain DO_NOT_PROJECT for this split/divided corpus.
  expect(snapshot.current_target_count).toBeNull();
  const policyResult = snapshot.current_target_count === null ? "DO_NOT_PROJECT" : "PROJECTED";
  expect(policyResult).toBe("DO_NOT_PROJECT");

  expect(snapshot.current_target_count).not.toBe(model.min_targets);
  if (model.max_targets !== null) {
    expect(snapshot.current_target_count).not.toBe(model.max_targets);
  }
  if (model.damage_amount !== null) {
    expect(snapshot.current_target_count).not.toBe(model.damage_amount);
  }
  if (model.variable_symbol !== null) {
    expect(snapshot.current_target_count).not.toBe(model.variable_symbol);
  }

  if (snapshot.split_divided_damage_target_model?.conceptual_target_slots_min !== null) {
    expect(snapshot.current_target_count).not.toBe(
      snapshot.split_divided_damage_target_model.conceptual_target_slots_min,
    );
  }
  if (snapshot.split_divided_damage_target_model?.conceptual_target_slots_max !== null) {
    expect(snapshot.current_target_count).not.toBe(
      snapshot.split_divided_damage_target_model.conceptual_target_slots_max,
    );
  }

  for (const forbidden of explicitForbiddenScalars) {
    expect(snapshot.current_target_count).not.toBe(forbidden);
  }
}

describe(
  "cost target legality split divided damage target count scalar projection policy guardrail ring v1",
  () => {
    it("freezes runtime DO_NOT_PROJECT target_count policy with productive target_count_model preserved", () => {
      expect(REJECTED_SCALAR_POLICIES).toEqual([
        "TARGET_COUNT_EQUALS_MIN_TARGETS",
        "TARGET_COUNT_EQUALS_MAX_TARGETS",
        "TARGET_COUNT_EQUALS_DAMAGE_AMOUNT",
        "TARGET_COUNT_EQUALS_CONCEPTUAL_TARGET_SLOTS_MIN",
        "TARGET_COUNT_EQUALS_CONCEPTUAL_TARGET_SLOTS_MAX",
        "TARGET_COUNT_EQUALS_ZERO_FOR_ANY_NUMBER",
        "TARGET_COUNT_EQUALS_ONE_FOR_ANY_NUMBER",
        "TARGET_COUNT_EQUALS_COMMA_SEPARATED_TARGET_WORDS",
      ]);

      const payload = loadCardsIndex();
      const runA = CORPUS.map((name) => buildSnapshot(payload, name));
      const runB = CORPUS.map((name) => buildSnapshot(payload, name));

      expect(runA).toEqual(runB);
      expect(runA.map((row) => row.cardName)).toEqual([...CORPUS]);

      for (const row of runA) {
        const expectedModel = EXPECTED_TARGET_COUNT_MODELS[row.cardName];
        expect(expectedModel).toBeTruthy();

        expect(row.canonicalName.length).toBeGreaterThan(0);
        expect(row.current_min_exists).toBe(true);
        expect(row.current_modal_selection_model).toBeNull();
        expect(row.current_legality_kinds).toEqual([]);
        expect(row.split_divided_damage_target_model).toBeTruthy();

        expect(row.split_divided_damage_target_model?.allowed_target_kinds).toEqual(["ANY_TARGET"]);
        expect(row.split_divided_damage_target_model?.target_count_model).toEqual(expectedModel);

        if (row.split_divided_damage_target_model_in_min) {
          expect(row.split_divided_damage_target_model_in_min.allowed_target_kinds).toEqual([
            "ANY_TARGET",
          ]);
          expect(row.split_divided_damage_target_model_in_min.target_count_model).toEqual(
            expectedModel,
          );
        }

        assertNoTargetCountScalarProjection(
          row,
          expectedModel,
          CARD_SPECIFIC_FORBIDDEN_SCALAR_PROJECTIONS[row.cardName],
        );
        assertNoForbiddenTargetKindLeakage(row);

        console.log(JSON.stringify(row));
      }

      const rollingThunder = runA.find((row) => row.cardName === "Rolling Thunder");
      expect(rollingThunder?.current_target_count).toBeNull();
      expect(rollingThunder?.split_divided_damage_target_model?.target_count_model?.variable_symbol).toBe(
        "X",
      );
      expect(rollingThunder?.split_divided_damage_target_model?.target_count_model?.damage_amount_kind).toBe(
        "VARIABLE",
      );
      expect(rollingThunder?.current_target_count).not.toEqual(expect.any(String));

      for (const cardName of [
        "Electrolyze",
        "Arc Lightning",
        "Flames of the Firebrand",
        "Pyrotechnics",
      ] as const) {
        const row = runA.find((entry) => entry.cardName === cardName);
        const model = row?.split_divided_damage_target_model?.target_count_model;
        expect(row?.current_target_count).toBeNull();
        expect(model?.damage_amount_kind).toBe("FIXED");
        expect(typeof model?.damage_amount).toBe("number");
        expect(model?.damage_amount).toBeGreaterThan(0);
      }

      console.log("TARGET_COUNT_SCALAR_PROJECTION_POLICY_GUARDRAIL_RING_V1_COMPLETE");
    });
  },
);
