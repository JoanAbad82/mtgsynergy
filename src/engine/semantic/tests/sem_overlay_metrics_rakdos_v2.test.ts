import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { normalizeCardName } from "../../cards/normalize";
import { normalizeOracleTextV1 } from "../normalize";
import { parseSemanticIrV0 } from "../parser/sem_parser_v1";
import { buildSemanticEdges } from "../overlay/sem_edges";
import { buildSemanticOverlayMetrics } from "../overlay/sem_metrics";
import { EventId } from "../contract";
import { KeyKind, keyOf } from "../overlay/sem_profile";

type GoldCard = {
  name: string;
  card_name_norm?: string;
  expected_ir: { card_id: number };
};

type GoldDataset = {
  SEM_IR_VERSION: number;
  archetype: string;
  cards: GoldCard[];
};

const here = dirname(fileURLToPath(import.meta.url));
const datasetPath = join(here, "../../../../tools/semantics/gold/sem_gold_v2_rakdos_subset.json");
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

describe("semantic overlay metrics: rakdos subset v2", () => {
  it("computes metrics with high coverage and positive SOS", () => {
    const dataset = loadDataset();
    const payload = loadCardsIndex();
    const cards = dataset.cards.map((card, index) => {
      const canonical = findCanonicalName(payload, card.name, card.card_name_norm);
      if (!canonical) {
        throw new Error(`Missing card in cards_index: ${card.name}`);
      }
      const record = payload.by_name?.[canonical];
      if (!record || !record.oracle_text) {
        throw new Error(`Missing oracle_text for card: ${canonical}`);
      }
      const oracleText = normalizeOracleTextV1(record.oracle_text ?? "");
      const ir = parseSemanticIrV0({
        name: canonical,
        oracle_text: oracleText,
        type_line: record.type_line ?? null,
      });
      ir.card_id = index + 1;
      return { card_id: ir.card_id, ir, oracle_text: oracleText };
    });

    const edges = buildSemanticEdges(cards);
    const metricsA = buildSemanticOverlayMetrics({ cards, edges, topN: 10 });
    const metricsB = buildSemanticOverlayMetrics({ cards, edges, topN: 10 });

    expect(metricsA).toEqual(metricsB);
    expect(metricsA.semantic_coverage).toBeGreaterThanOrEqual(0.85);
    expect(metricsA.semantic_coverage).toBeLessThanOrEqual(1);
    expect(metricsA.SOS).toBeGreaterThan(0);

    const diesKey = keyOf(KeyKind.EVENT, EventId.CREATURE_DIES);
    const hasDiesOrphan = metricsA.orphan_listeners.some((entry) => entry.key === diesKey);
    if (hasDiesOrphan) {
      expect(metricsA.orphan_listeners.length).toBeGreaterThan(0);
    }
  });
});
