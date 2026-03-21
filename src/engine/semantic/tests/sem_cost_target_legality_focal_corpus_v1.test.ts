import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { analyzeCostTargetLegalityMinV1 } from "../services/sem_cost_target_legality_min_v1";
import { CostKind, LegalityKind, SummoningSicknessTapQMin, TargetKind } from "../types/sem_cost_target_legality_types";

type FocalAnchorRow = {
  card_name: string;
  corpus_group: string;
  status: string;
  source_type_line: string | null;
  focus_text: string;
  expected_cost_kinds: CostKind[];
  expected_target_kinds: TargetKind[];
  expected_legality_kinds: LegalityKind[];
  expected_target_count: number;
  expected_legality_count: number;
  expected_summoning_sickness_tap_q_min: SummoningSicknessTapQMin | null;
  notes_scope: string;
};

type FocalCorpus = {
  metadata: {
    document_id: string;
    version: string;
    status: string;
    phase: string;
    scope: string;
  };
  invariants: string[];
  matrix_columns: string[];
  anchor_cards: FocalAnchorRow[];
};

const here = dirname(fileURLToPath(import.meta.url));
const focalCorpusPath = join(here, "../contract/sem_cost_target_legality_focal_corpus_v1.json");

function loadJson<T>(path: string): T {
  const raw = readFileSync(path, "utf8");
  return JSON.parse(raw) as T;
}

function sortedUnique<T extends string>(items: T[]): T[] {
  return Array.from(new Set(items)).sort() as T[];
}

describe("cost target legality focal corpus v1", () => {
  it("matches expected kinds and counts for all focal anchors deterministically", () => {
    const corpus = loadJson<FocalCorpus>(focalCorpusPath);
    const rows = [...corpus.anchor_cards].sort((a, b) => a.card_name.localeCompare(b.card_name));

    for (const row of rows) {
      const result = analyzeCostTargetLegalityMinV1(row.focus_text, {
        sourceTypeLine: row.source_type_line,
      });
      const actualCostKinds = sortedUnique(result.costIr.items.map((item) => item.kind));
      const actualTargetKinds = sortedUnique(result.targetSpecs.flatMap((spec) => spec.targetKinds));
      const actualLegalityKinds = sortedUnique(result.legalityGates.map((gate) => gate.kind));

      expect(actualCostKinds).toEqual(sortedUnique(row.expected_cost_kinds));
      expect(actualTargetKinds).toEqual(sortedUnique(row.expected_target_kinds));
      expect(actualLegalityKinds).toEqual(sortedUnique(row.expected_legality_kinds));
      expect(result.targetSpecs).toHaveLength(row.expected_target_count);
      expect(result.legalityGates).toHaveLength(row.expected_legality_count);
      expect(result.summoningSicknessTapQMin ?? null).toEqual(row.expected_summoning_sickness_tap_q_min);
    }
  });
});
