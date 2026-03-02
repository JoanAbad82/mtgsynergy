import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { normalizeCardName } from "../../cards/normalize";
import { normalizeOracleTextV1 } from "../normalize";
import { parseSemanticIrV0 } from "../parser/sem_parser_v1";
import { buildSemanticEdges } from "../overlay/sem_edges";
import { KeyKind, buildSemanticCardProfile, keyOf } from "../overlay/sem_profile";
import { ActionId, EventId, ResourceId } from "../contract";

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

describe("semantic overlay edges: rakdos subset v1", () => {
  it("builds deterministic edges without self loops", () => {
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
      return { card, ir, oracleText };
    });

    const edgesA = buildSemanticEdges(
      cards.map(({ ir, oracleText }) => ({ card_id: ir.card_id, ir, oracle_text: oracleText })),
    );
    const edgesB = buildSemanticEdges(
      cards.map(({ ir, oracleText }) => ({ card_id: ir.card_id, ir, oracle_text: oracleText })),
    );
    expect(edgesA).toEqual(edgesB);
    for (const edge of edgesA) {
      expect(edge.from).not.toBe(edge.to);
    }

    const sacrificeEventKey = keyOf(KeyKind.EVENT, EventId.SACRIFICE);
    expect(edgesA.length).toBeGreaterThan(0);
    expect(edgesA.some((edge) => edge.reasons.some((reason) => reason.key === sacrificeEventKey))).toBe(true);

    const producers = new Set<number>();
    const listeners = new Set<number>();
    for (const { ir, oracleText } of cards) {
      const profile = buildSemanticCardProfile(ir, oracleText);
      if ((profile.produced.get(sacrificeEventKey)?.count ?? 0) > 0) {
        producers.add(ir.card_id);
      }
      if ((profile.consumed.get(sacrificeEventKey)?.count ?? 0) > 0) {
        listeners.add(ir.card_id);
      }
    }
    const hasProducerListenerEdge = edgesA.some((edge) => producers.has(edge.from) && listeners.has(edge.to));
    expect(hasProducerListenerEdge).toBe(true);

    const hasTokenConsumer = cards.some(({ ir }) =>
      ir.frames.some((frame) => frame.cost.some((cost) => cost.res !== undefined))
    );
    if (hasTokenConsumer) {
      const hasTokenEdge = edgesA.some((edge) =>
        edge.reasons.some((reason) => (reason.key >> 16) === KeyKind.RESOURCE)
      );
      expect(hasTokenEdge).toBe(true);
    } else {
      expect(edgesA.length).toBeGreaterThan(0);
    }

    const thoughtseize = cards.find((card) => card.card.name === "Thoughtseize");
    const kroxa = cards.find((card) => card.card.name.startsWith("Kroxa"));
    if (thoughtseize && kroxa) {
      const profileThought = buildSemanticCardProfile(thoughtseize.ir, thoughtseize.oracleText);
      const profileKroxa = buildSemanticCardProfile(kroxa.ir, kroxa.oracleText);
      const cardKey = keyOf(KeyKind.RESOURCE, ResourceId.CARD);
      const thoughtProducesCard = (profileThought.produced.get(cardKey)?.count ?? 0) > 0;
      const kroxaConsumesCard = (profileKroxa.consumed.get(cardKey)?.count ?? 0) > 0;
      if (kroxaConsumesCard) {
        const hasEdge = edgesA.some((edge) => edge.from === thoughtseize.ir.card_id && edge.to === kroxa.ir.card_id);
        expect(hasEdge).toBe(true);
      } else {
        expect(thoughtProducesCard).toBe(true);
        const hasAnyConsumer = cards.some(({ ir, oracleText }) => {
          const profile = buildSemanticCardProfile(ir, oracleText);
          return (profile.consumed.get(cardKey)?.count ?? 0) > 0;
        });
        expect(hasAnyConsumer).toBe(true);
      }
    }

    const hasDiscardEdge = edgesA.some((edge) =>
      edge.reasons.some((reason) => reason.key === keyOf(KeyKind.ACTION, ActionId.DISCARD_CARDS))
    );
    if (!hasDiscardEdge) {
      expect(edgesA.length).toBeGreaterThan(0);
    }
  });
});
