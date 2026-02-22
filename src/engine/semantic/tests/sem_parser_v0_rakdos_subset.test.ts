import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { normalizeCardName } from "../../cards/normalize";
import { parseSemanticIrV0 } from "../parser/sem_parser_v0";

type GoldCard = {
  name: string;
  card_name_norm?: string;
  card_id_scheme?: string;
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
const datasetPath = join(here, "../../../../tools/semantics/gold/sem_gold_v1_rakdos_subset.json");
const cardsIndexPath = join(here, "../../../../public/data/cards_index.json.gz");

function loadDataset(): GoldDataset {
  const raw = readFileSync(datasetPath, "utf8");
  return JSON.parse(raw) as GoldDataset;
}

type CardsIndexPayload = {
  by_name?: Record<string, { oracle_text?: string | null; type_line?: string | null }>;
  by_name_norm?: Record<string, string>;
};

function loadCardsIndex(): CardsIndexPayload {
  const gz = readFileSync(cardsIndexPath);
  const json = gunzipSync(gz).toString("utf8");
  return JSON.parse(json) as CardsIndexPayload;
}

function findCanonicalName(payload: CardsIndexPayload, name: string, nameNorm?: string): string | null {
  const byName = payload.by_name ?? {};
  const byNameNorm = payload.by_name_norm ?? {};
  if (byName[name]) return name;
  const norm = nameNorm && nameNorm.length > 0 ? nameNorm : normalizeCardName(name);
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
    const payload = loadCardsIndex();
    for (const card of dataset.cards) {
      const canonical = findCanonicalName(payload, card.name, card.card_name_norm);
      if (!canonical) {
        throw new Error(`Missing card in cards_index: ${card.name}`);
      }
      const record = payload.by_name?.[canonical];
      if (!record || !record.oracle_text) {
        throw new Error(`Missing oracle_text for card: ${canonical}`);
      }
      let oracleText = record.oracle_text ?? "";
      oracleText = oracleText.replace(/\([^)]*\)/g, "");
      oracleText = oracleText.replace(/\s+/g, " ").trim();
      const actual = parseSemanticIrV0({
        name: canonical,
        oracle_text: oracleText,
        type_line: record.type_line ?? null,
      });
      const expected = card.expected_ir;
      expect(normalizeIr(actual as unknown as GoldCard["expected_ir"])).toEqual(normalizeIr(expected));
    }
  });
});
