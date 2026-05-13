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
  allowed_target_kinds?: unknown;
  allowedTargetKinds?: unknown;
  target_kinds?: unknown;
  targetKinds?: unknown;
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
  projected_target_kinds_from_model: string[];
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
      out.push(value.trim().toUpperCase());
    }
  }
  return Array.from(new Set(out)).sort();
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
    projected_target_kinds_from_model:
      __testOnlyProjectTargetKindsFromSplitDividedDamageModelMinV1(splitModel),
  };
}

describe("cost target legality split divided damage target kind integration allowed target kinds guardrail ring v1", () => {
  it("freezes projection helper umbrella and canonical filtering behavior", () => {
    expect(
      __testOnlyProjectTargetKindsFromSplitDividedDamageModelMinV1({
        allowed_target_kinds: ["ANY_TARGET", "CREATURE", "PLAYER"],
      }),
    ).toEqual(["ANY_TARGET"]);

    expect(
      __testOnlyProjectTargetKindsFromSplitDividedDamageModelMinV1({
        allowed_target_kinds: ["CREATURE", "PLAYER", "CREATURE"],
      }),
    ).toEqual(["CREATURE", "PLAYER"]);

    expect(
      __testOnlyProjectTargetKindsFromSplitDividedDamageModelMinV1({
        allowed_target_kinds: ["CAST_ONLY_IF", "INVALID", 7, null],
      }),
    ).toEqual([]);

    expect(__testOnlyProjectTargetKindsFromSplitDividedDamageModelMinV1(null)).toEqual([]);
    expect(__testOnlyProjectTargetKindsFromSplitDividedDamageModelMinV1(undefined)).toEqual([]);
    expect(__testOnlyProjectTargetKindsFromSplitDividedDamageModelMinV1({})).toEqual([]);
    expect(__testOnlyProjectTargetKindsFromSplitDividedDamageModelMinV1(42 as any)).toEqual([]);
  });

  it("freezes real-corpus structured allowed_target_kinds with emitted runtime target_kinds baseline", () => {
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

    for (const row of runA) {
      expect(row.canonicalName.length).toBeGreaterThan(0);

      expect(row.split_divided_damage_target_model).toBeTruthy();
      expect(row.split_divided_damage_target_model?.kind).toBe("SPLIT_DIVIDED_DAMAGE_TARGET_MODEL");
      expect(
        row.split_divided_damage_target_model?.productive_min_hint_currently_models_split_damage,
      ).toBe(true);
      expect(row.split_divided_damage_target_model?.split_damage_model_kind).toBe(
        expectedKinds[row.cardName],
      );

      expect(row.split_divided_damage_target_model?.allowed_target_kinds).toEqual(["ANY_TARGET"]);
      expect(row.model_structured_target_kinds).toEqual(["ANY_TARGET"]);
      expect(row.projected_target_kinds_from_model).toEqual(["ANY_TARGET"]);

      // Runtime now emits a minimal min payload from structured split-model evidence.
      expect(row.current_min_exists).toBe(true);
      expect(row.current_target_kinds).toEqual(["ANY_TARGET"]);
      expect(row.current_target_count).toBeNull();
      expect(row.current_modal_selection_model).toBeNull();
      expect(row.current_legality_kinds).toEqual([]);

      // ANY_TARGET remains umbrella and is not expanded into specific classes in projection output.
      expect(row.projected_target_kinds_from_model).not.toContain("CREATURE");
      expect(row.projected_target_kinds_from_model).not.toContain("PLAYER");
      expect(row.projected_target_kinds_from_model).not.toContain("PLANESWALKER");
      expect(row.projected_target_kinds_from_model).not.toContain("BATTLE");

      for (const forbidden of FORBIDDEN) {
        expect(row.current_target_kinds).not.toContain(forbidden);
        expect(row.current_legality_kinds).not.toContain(forbidden);
        expect(JSON.stringify(row.split_divided_damage_target_model)).not.toContain(forbidden);
      }

      console.log(JSON.stringify(row));
    }

    for (const cardName of ["Pyrotechnics", "Rolling Thunder"] as const) {
      const row = runA.find((entry) => entry.cardName === cardName);
      expect(row?.split_divided_damage_target_model?.conceptual_target_slots_min).toBe(0);
      expect(row?.split_divided_damage_target_model?.conceptual_target_slots_max).toBeNull();
      expect(row?.current_target_count).toBeNull();
    }

    console.log(
      "SPLIT_DIVIDED_DAMAGE_TARGET_KIND_INTEGRATION_ALLOWED_TARGET_KINDS_GUARDRAIL_RING_V1_COMPLETE",
    );
  });
});
