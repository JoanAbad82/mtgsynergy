import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { normalizeCardName } from "../../cards/normalize";
import type { CardRecordMin } from "../../cards/types";
import { normalizeOracleTextV1 } from "../normalize";
import { parseSemanticIrV0 } from "../parser/sem_parser_v1";
import { computeSemanticOverlayFromDeckEntries } from "../overlay/sem_overlay_compute";
import { buildSemanticEdges } from "../overlay/sem_edges";
import { buildSemanticCardProfile, explainKey, KeyKind, keyOf } from "../overlay/sem_profile";
import { ActionId, EventId } from "../contract";

type CardsIndexPayload = {
  by_name?: Record<string, { oracle_text?: string | null; type_line?: string | null }>;
  by_name_norm?: Record<string, string>;
};

const here = dirname(fileURLToPath(import.meta.url));
const cardsIndexPath = join(here, "../../../../public/data/cards_index.json.gz");

const deckList: Array<{ name: string; count: number }> = [
  { name: "Shambling Ghast", count: 4 },
  { name: "Persistent Specimen", count: 4 },
  { name: "Blood Artist", count: 4 },
  { name: "Goblin Bombardment", count: 4 },
  { name: "Village Rites", count: 4 },
  { name: "Deadly Dispute", count: 4 },
  { name: "Experimental Synthesizer", count: 4 },
  { name: "Oni-Cult Anvil", count: 4 },
  { name: "Howling Mine", count: 4 },
  { name: "Darksteel Ingot", count: 4 },
  { name: "Swamp", count: 10 },
  { name: "Mountain", count: 10 },
  { name: "Bloodfell Caves", count: 4 },
];

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

function createLocalLookup(payload: CardsIndexPayload) {
  return async (name: string): Promise<CardRecordMin | null> => {
    const canonical = findCanonicalName(payload, name);
    if (!canonical) return null;
    const record = payload.by_name?.[canonical];
    if (!record) return null;
    return {
      name: canonical,
      name_norm: normalizeCardName(canonical),
      type_line: record.type_line ?? null,
      oracle_text: record.oracle_text ?? null,
    };
  };
}

function buildDeckEntries(): Array<{ name: string }> {
  return deckList.flatMap((entry) =>
    Array.from({ length: entry.count }, () => ({ name: entry.name })),
  );
}

function buildCardInputs(payload: CardsIndexPayload, entries: Array<{ name: string }>) {
  const uniqueNames = Array.from(new Set(entries.map((entry) => entry.name)));
  const resolved = uniqueNames
    .map((name) => {
      const canonical = findCanonicalName(payload, name);
      if (!canonical) return null;
      const record = payload.by_name?.[canonical];
      if (!record || !record.oracle_text) return null;
      return {
        name: canonical,
        name_norm: normalizeCardName(canonical),
        oracle_text: record.oracle_text,
        type_line: record.type_line ?? null,
      };
    })
    .filter((card): card is NonNullable<typeof card> => !!card);

  const byNorm = new Map<string, (typeof resolved)[number]>();
  for (const card of resolved) {
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
    return { card_id, ir, oracle_text: oracleText };
  });

  return { cards, idToName };
}

function edgeHasReason(edge: { reasons: Array<{ key: number }> }, pattern: string): boolean {
  return edge.reasons.some((reason) => explainKey(reason.key).includes(pattern));
}

describe("semantic overlay creature dies orphan residual diagnose", () => {
  it("separates local closure vs orphan bucket for CREATURE_DIES", async () => {
    const payload = loadCardsIndex();
    const entries = buildDeckEntries();
    const lookup = createLocalLookup(payload);

    const overlay = await computeSemanticOverlayFromDeckEntries(entries, lookup);
    const { cards, idToName } = buildCardInputs(payload, entries);

    const diesKey = keyOf(KeyKind.EVENT, EventId.CREATURE_DIES);
    const payoffKeys = [
      keyOf(KeyKind.ACTION, ActionId.LOSE_LIFE),
      keyOf(KeyKind.ACTION, ActionId.DEAL_DAMAGE),
      keyOf(KeyKind.ACTION, ActionId.GAIN_LIFE),
    ];

    const profiles = cards.map((card) => ({
      card_id: card.card_id,
      name: idToName[card.card_id],
      profile: buildSemanticCardProfile(card.ir, card.oracle_text),
    }));

    const diesConsumers = profiles.filter((entry) => entry.profile.consumed.has(diesKey));
    const diesWithPayoff = diesConsumers.filter((entry) =>
      payoffKeys.some((key) => entry.profile.produced.has(key)),
    );

    const edges = buildSemanticEdges(cards);
    const localDiesEdges = edges.filter(
      (edge) => edge.local_only && edgeHasReason(edge, "EVENT:CREATURE_DIES"),
    );

    const orphanRow = overlay.metrics.orphan_listeners.find((row) =>
      row.explain.includes("EVENT:CREATURE_DIES"),
    );

    const hasOrphan = !!orphanRow;
    const hasLocalClosure = localDiesEdges.length > 0;
    let classification: "A" | "B" | "C" | "B+C" | "no_residual_in_slice" | "unknown" = "unknown";
    if (!hasOrphan) {
      classification = "no_residual_in_slice";
    } else if (hasOrphan && hasLocalClosure) {
      classification = "B+C";
    } else if (hasOrphan && !hasLocalClosure) {
      classification = "C";
    }

    console.log("CREATURE_DIES residual diagnose:", {
      dies_consumers: diesConsumers.map((entry) => entry.name),
      dies_with_payoff: diesWithPayoff.map((entry) => entry.name),
      local_only_edges: localDiesEdges.map((edge) => idToName[edge.from]),
      orphan_row: orphanRow,
      classification,
    });

    expect(diesConsumers.length).toBeGreaterThan(0);
    expect(localDiesEdges.length).toBeGreaterThan(0);
    expect(classification).not.toBe("unknown");
  });
});
