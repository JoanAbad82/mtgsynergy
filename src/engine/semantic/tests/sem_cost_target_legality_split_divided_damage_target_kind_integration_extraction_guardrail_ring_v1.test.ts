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

const CANONICAL_ALLOWED = new Set([
  "CREATURE",
  "PLAYER",
  "PLANESWALKER",
  "BATTLE",
  "ANY_TARGET",
]);

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
      if (typeof value !== "string") continue;
      out.push(value);
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

describe("cost target legality split divided damage target kind integration extraction guardrail ring v1", () => {
  it("freezes positive structured projection guard behavior", () => {
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
    expect(fromTargetCamel).toEqual(["ANY_TARGET"]);

    // Conservative fallback for empty/invalid/non-object values.
    expect(__testOnlyProjectTargetKindsFromSplitDividedDamageModelMinV1(undefined)).toEqual([]);
    expect(__testOnlyProjectTargetKindsFromSplitDividedDamageModelMinV1(null)).toEqual([]);
    expect(__testOnlyProjectTargetKindsFromSplitDividedDamageModelMinV1({})).toEqual([]);
    expect(__testOnlyProjectTargetKindsFromSplitDividedDamageModelMinV1(42 as any)).toEqual([]);
    expect(__testOnlyProjectTargetKindsFromSplitDividedDamageModelMinV1("x" as any)).toEqual([]);

    // Canonical filtering guard and forbidden leakage guard.
    for (const kind of [
      ...fromAllowedSnake,
      ...fromAllowedCamel,
      ...fromTargetSnake,
      ...fromTargetCamel,
    ]) {
      expect(CANONICAL_ALLOWED.has(kind)).toBe(true);
    }
    for (const forbidden of [
      "CAST_ONLY_IF",
      "ACTIVATE_ONLY_AS_SORCERY",
      "CONTROLS_X",
      "ATTACKED_THIS_TURN",
      "ONCE_EACH_TURN",
      "OTHER_LEGALITY_TEXT",
    ]) {
      expect(fromAllowedSnake).not.toContain(forbidden);
      expect(fromAllowedCamel).not.toContain(forbidden);
      expect(fromTargetSnake).not.toContain(forbidden);
      expect(fromTargetCamel).not.toContain(forbidden);
    }
  });

  it("freezes real-corpus conservative baseline and split model boundary", () => {
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
      expect(row.split_divided_damage_target_model?.productive_min_hint_currently_models_split_damage).toBe(
        true,
      );

      // Baseline stays conservative when no structured allowed kind properties exist in the model.
      expect(row.model_structured_target_kinds).toEqual([]);
      expect(row.current_target_kinds).toEqual([]);
      expect(row.current_target_count).toBeNull();
      expect(row.current_modal_selection_model).toBeNull();
      expect(row.current_legality_kinds).toEqual([]);

      // No forbidden leakage into target/model/legality channels.
      for (const forbidden of [
        "CAST_ONLY_IF",
        "ACTIVATE_ONLY_AS_SORCERY",
        "CONTROLS_X",
        "ATTACKED_THIS_TURN",
        "ONCE_EACH_TURN",
        "OTHER_LEGALITY_TEXT",
      ]) {
        expect(row.current_target_kinds).not.toContain(forbidden);
        expect(row.current_legality_kinds).not.toContain(forbidden);
        expect(JSON.stringify(row.split_divided_damage_target_model)).not.toContain(forbidden);
      }

      // ANY_TARGET must not be synthesized from absent structured model target-kind data.
      expect(row.current_target_kinds).not.toContain("ANY_TARGET");

      console.log(JSON.stringify(row));
    }

    for (const name of ["Pyrotechnics", "Rolling Thunder"] as const) {
      const row = runA.find((entry) => entry.cardName === name);
      expect(row?.split_divided_damage_target_model?.conceptual_target_slots_min).toBe(0);
      expect(row?.split_divided_damage_target_model?.conceptual_target_slots_max).toBeNull();
      expect(row?.current_target_count).toBeNull();
    }

    console.log("SPLIT_DIVIDED_DAMAGE_TARGET_KIND_INTEGRATION_EXTRACTION_GUARDRAIL_RING_V1_COMPLETE");
  });
});