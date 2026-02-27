import type { CardRecordMin } from "../../cards/types";
import { normalizeCardName } from "../../cards/normalize";
import { normalizeOracleTextV1 } from "../normalize";
import { parseSemanticIrV0 } from "../parser/sem_parser_v1";
import { buildSemanticEdges } from "./sem_edges";
import { buildSemanticOverlayMetrics } from "./sem_metrics";

type OverlayComputeResult = {
  metrics: ReturnType<typeof buildSemanticOverlayMetrics>;
  edgesTop: ReturnType<typeof buildSemanticEdges>;
  idToName: Record<number, string>;
  resolvedUnique: number;
  missingUnique: number;
  deckEntriesCount: number;
};

export async function computeSemanticOverlayFromDeckEntries(
  entries: Array<{ name: string }>,
  lookup: (name: string) => Promise<CardRecordMin | null>,
): Promise<OverlayComputeResult> {
  const uniqueNames = Array.from(new Set(entries.map((entry) => entry.name)));
  const resolved = await Promise.all(
    uniqueNames.map(async (name) => {
      const card = await lookup(name);
      if (!card || !card.oracle_text) return null;
      return {
        name: card.name,
        name_norm: card.name_norm ?? normalizeCardName(card.name),
        oracle_text: card.oracle_text,
        type_line: card.type_line ?? null,
      };
    }),
  );

  const found = resolved.filter(
    (card): card is NonNullable<typeof card> => !!card,
  );
  const resolvedUnique = found.length;
  const missingUnique = uniqueNames.length - resolvedUnique;

  const byNorm = new Map<string, (typeof found)[number]>();
  for (const card of found) {
    if (!byNorm.has(card.name_norm)) {
      byNorm.set(card.name_norm, card);
    }
  }

  const ordered = Array.from(byNorm.values()).sort((a, b) =>
    a.name_norm.localeCompare(b.name_norm),
  );
  const idToName: Record<number, string> = {};
  const cards = ordered.map((card, index) => {
    const oracleText = normalizeOracleTextV1(card.oracle_text ?? "");
    const ir = parseSemanticIrV0({
      name: card.name,
      oracle_text: oracleText,
      type_line: card.type_line ?? null,
    });
    const card_id = index + 1;
    ir.card_id = card_id;
    idToName[card_id] = card.name;
    return { card_id, ir };
  });

  const edges = buildSemanticEdges(cards);
  const metrics = buildSemanticOverlayMetrics({ cards, edges, topN: 10 });

  return {
    metrics,
    edgesTop: edges.slice(0, 10),
    idToName,
    resolvedUnique,
    missingUnique,
    deckEntriesCount: entries.length,
  };
}
