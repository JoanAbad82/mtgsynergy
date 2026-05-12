import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { normalizeCardName } from "../../cards/normalize";
import {
  __testOnlyProjectTargetKindsFromSplitDividedDamageModelMinV1,
  buildCostTargetLegalityHints,
} from "../lowering/lower_to_ability_ir_min_v1";

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
  allowed_target_kinds?: string[];
  allowedTargetKinds?: string[];
  target_kinds?: string[];
  targetKinds?: string[];
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
  model_structured_target_kinds: string[];
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

function readStructuredAllowedTargetKinds(
  model: SplitDividedDamageTargetModelSnapshot | null,
): string[] {
  if (!model) return [];

  const buckets = [
    model.allowed_target_kinds,
    model.allowedTargetKinds,
    model.target_kinds,
    model.targetKinds,
  ];

  const out: string[] = [];
  for (const candidate of buckets) {
    if (!Array.isArray(candidate)) continue;
    for (const value of candidate) {
      if (typeof value === "string") out.push(value);
    }
  }

  return Array.from(new Set(out));
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
    current_legality_kinds: min ? [...min.legality_kinds] : [],
    split_divided_damage_target_model: splitModel,
    model_structured_target_kinds: readStructuredAllowedTargetKinds(splitModel),
  };
}

describe("cost target legality split divided damage target kind integration extraction v1", () => {
  it("proves positive structured projection behavior for split model target kind data", () => {
    const fromAllowedSnake = __testOnlyProjectTargetKindsFromSplitDividedDamageModelMinV1({
      allowed_target_kinds: ["ANY_TARGET", "CREATURE", "ANY_TARGET", "INVALID_KIND", 42],
    });
    expect(fromAllowedSnake).toEqual(["ANY_TARGET"]);

    const fromAllowedCamel = __testOnlyProjectTargetKindsFromSplitDividedDamageModelMinV1({
      allowedTargetKinds: ["creature", "PLAYER", "PLAYER", "cast_only_if"],
    });
    expect(fromAllowedCamel).toEqual(["CREATURE", "PLAYER"]);

    const fromTargetSnake = __testOnlyProjectTargetKindsFromSplitDividedDamageModelMinV1({
      target_kinds: ["PLANESWALKER", "battle", "once_each_turn"],
    });
    expect(fromTargetSnake).toEqual(["BATTLE", "PLANESWALKER"]);

    const fromTargetCamel = __testOnlyProjectTargetKindsFromSplitDividedDamageModelMinV1({
      targetKinds: ["ANY_TARGET", "CREATURE", "PLAYER"],
    });
    // ANY_TARGET must remain umbrella and must not be expanded.
    expect(fromTargetCamel).toEqual(["ANY_TARGET"]);
  });

  it("projects target_kinds conservatively from structured split model data without replacing independent channels", () => {
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

      // target_kinds stays conservative and independent when structured allowed target kind data is not present.
      expect(row.model_structured_target_kinds).toEqual([]);
      expect(row.current_min_exists).toBe(false);
      expect(row.current_target_kinds).toEqual([]);
      expect(row.current_target_count).toBeNull();

      // split_divided damage must not create modal or legality channels.
      expect(row.current_modal_selection_model).toBeNull();
      expect(row.current_legality_kinds).toEqual([]);

      expect(row.current_target_kinds).not.toContain("ANY_TARGET");
      expect(row.current_target_kinds).not.toContain("CAST_ONLY_IF");
      expect(row.current_target_kinds).not.toContain("ACTIVATE_ONLY_AS_SORCERY");
      expect(row.current_legality_kinds).not.toContain("CAST_ONLY_IF");
      expect(row.current_legality_kinds).not.toContain("ACTIVATE_ONLY_AS_SORCERY");
      expect(row.current_legality_kinds).not.toContain("CONTROLS_X");
      expect(row.current_legality_kinds).not.toContain("ATTACKED_THIS_TURN");
      expect(row.current_legality_kinds).not.toContain("ONCE_EACH_TURN");
      expect(row.current_legality_kinds).not.toContain("OTHER_LEGALITY_TEXT");

      const serializedModel = JSON.stringify(row.split_divided_damage_target_model);
      expect(serializedModel).not.toContain("CAST_ONLY_IF");
      expect(serializedModel).not.toContain("ACTIVATE_ONLY_AS_SORCERY");
      expect(serializedModel).not.toContain("CONTROLS_X");
      expect(serializedModel).not.toContain("ATTACKED_THIS_TURN");
      expect(serializedModel).not.toContain("ONCE_EACH_TURN");
      expect(serializedModel).not.toContain("OTHER_LEGALITY_TEXT");

      console.log(JSON.stringify(row));
    }

    console.log("SPLIT_DIVIDED_DAMAGE_TARGET_KIND_INTEGRATION_EXTRACTION_V1_COMPLETE");
  });
});
