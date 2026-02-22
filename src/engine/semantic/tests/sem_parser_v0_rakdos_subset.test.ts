import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseSemanticIrV0 } from "../parser/sem_parser_v0";

type GoldCard = {
  name: string;
  oracle_text: string;
  expected_ir: {
    card_id: number;
    frames: Array<{
      kind: number;
      watch: Array<{ id: number }>; 
      cost: Array<{ cost: number; res?: number; n?: number }>;
      do: Array<{ action: number; args?: number[]; tokenData?: { kind: number; n?: number } }>;
      touch: Array<{ id: number }>;
      gates: Array<{ id: number }>;
    }>;
  };
};

type GoldDataset = {
  SEM_IR_VERSION: number;
  archetype: string;
  cards: GoldCard[];
};

const here = dirname(fileURLToPath(import.meta.url));
const datasetPath = join(here, "../../../../tools/semantics/gold/sem_gold_v0_rakdos_subset.json");

function loadDataset(): GoldDataset {
  const raw = readFileSync(datasetPath, "utf8");
  return JSON.parse(raw) as GoldDataset;
}

function normalizeFrame(frame: GoldCard["expected_ir"]["frames"][number]) {
  const watch = [...frame.watch].sort((a, b) => a.id - b.id);
  const cost = [...frame.cost].sort((a, b) => (a.cost - b.cost) || ((a.res ?? 0) - (b.res ?? 0)));
  const doList = [...frame.do].sort((a, b) => (a.action - b.action) || ((a.tokenData?.kind ?? 0) - (b.tokenData?.kind ?? 0)));
  const touch = [...frame.touch].sort((a, b) => a.id - b.id);
  const gates = [...frame.gates].sort((a, b) => a.id - b.id);
  return { ...frame, watch, cost, do: doList, touch, gates };
}

function normalizeIr(ir: GoldCard["expected_ir"]) {
  const frames = [...ir.frames].map(normalizeFrame).sort((a, b) => a.kind - b.kind);
  return { ...ir, frames };
}

describe("semantic parser v0: rakdos subset", () => {
  it("parses oracle text to expected IR", () => {
    const dataset = loadDataset();
    for (const card of dataset.cards) {
      const actual = parseSemanticIrV0({ name: card.name, oracle_text: card.oracle_text });
      const expected = card.expected_ir;
      expect(normalizeIr(actual as unknown as GoldCard["expected_ir"])).toEqual(normalizeIr(expected));
    }
  });
});
