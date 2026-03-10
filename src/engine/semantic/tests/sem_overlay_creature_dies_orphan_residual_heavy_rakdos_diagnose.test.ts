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
import { buildSemanticCardProfile, explainKey, KeyKind, keyOf, mergeProfiles } from "../overlay/sem_profile";
import { ActionId, EventId } from "../contract";

type CardsIndexPayload = {
  by_name?: Record<string, { oracle_text?: string | null; type_line?: string | null }>;
  by_name_norm?: Record<string, string>;
};

type CardResolved = {
  name: string;
  name_norm: string;
  oracle_text: string;
  type_line?: string | null;
};

const here = dirname(fileURLToPath(import.meta.url));
const cardsIndexPath = join(here, "../../../../public/data/cards_index.json.gz");

const heavyRakdosSlice: Array<{ name: string }> = [
  { name: "Blood Artist" },
  { name: "Zulaport Cutthroat" },
  { name: "Serrated Scorpion" },
  { name: "Persistent Specimen" },
  { name: "Shambling Ghast" },
  { name: "Grim Haruspex" },
  { name: "Morbid Opportunist" },
  { name: "Harvester of Souls" },
  { name: "Village Rites" },
  { name: "Deadly Dispute" },
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

function buildCardInputs(payload: CardsIndexPayload) {
  const resolved = heavyRakdosSlice
    .map((entry) => {
      const canonical = findCanonicalName(payload, entry.name);
      if (!canonical) return null;
      const record = payload.by_name?.[canonical];
      if (!record || !record.oracle_text) return null;
      return {
        name: canonical,
        name_norm: normalizeCardName(canonical),
        oracle_text: record.oracle_text,
        type_line: record.type_line ?? null,
      } as CardResolved;
    })
    .filter((card): card is CardResolved => !!card);

  const ordered = resolved.sort((a, b) => a.name_norm.localeCompare(b.name_norm));
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

describe("semantic overlay creature dies orphan residual heavy rakdos diagnose", () => {
  it("reproduces CREATURE_DIES orphan residual in a heavier Rakdos slice", async () => {
    const payload = loadCardsIndex();
    const lookup = createLocalLookup(payload);
    const entries = heavyRakdosSlice.map((entry) => ({ name: entry.name }));
    const overlay = await computeSemanticOverlayFromDeckEntries(entries, lookup);

    const { cards, idToName } = buildCardInputs(payload);
    const profiles = cards.map((card) => ({
      card_id: card.card_id,
      name: idToName[card.card_id],
      profile: buildSemanticCardProfile(card.ir, card.oracle_text),
    }));

    const diesKey = keyOf(KeyKind.EVENT, EventId.CREATURE_DIES);
    const payoffKeys = [
      keyOf(KeyKind.ACTION, ActionId.LOSE_LIFE),
      keyOf(KeyKind.ACTION, ActionId.DEAL_DAMAGE),
      keyOf(KeyKind.ACTION, ActionId.GAIN_LIFE),
    ];

    const merged = mergeProfiles(profiles.map((entry) => entry.profile));
    const producedDies = merged.produced.get(diesKey)?.count ?? 0;
    const consumedDies = merged.consumed.get(diesKey)?.count ?? 0;

    const diesConsumers = profiles.filter((entry) => entry.profile.consumed.has(diesKey));
    const diesWithPayoff = diesConsumers.filter((entry) =>
      payoffKeys.some((key) => entry.profile.produced.has(key)),
    );
    const diesWithoutPayoff = diesConsumers.filter((entry) =>
      payoffKeys.every((key) => !entry.profile.produced.has(key)),
    );

    const edges = buildSemanticEdges(cards, { includeLocalOnly: true });
    const localDiesEdges = edges.filter(
      (edge) => edge.local_only && edgeHasReason(edge, "EVENT:CREATURE_DIES"),
    );

    const orphanRow = overlay.metrics.orphan_listeners.find((row) =>
      row.explain.includes("EVENT:CREATURE_DIES"),
    );

    const hasOrphan = !!orphanRow;
    const hasLocalClosure = localDiesEdges.length > 0;
    const hasLegitResidual = diesWithoutPayoff.length > 0;
    const orphanConsumed = orphanRow?.consumed ?? 0;

    console.log("CREATURE_DIES heavy slice diagnose:", {
      produced_creature_dies: producedDies,
      consumed_creature_dies: consumedDies,
      dies_consumers: diesConsumers.map((entry) => entry.name),
      dies_with_payoff: diesWithPayoff.map((entry) => entry.name),
      dies_without_payoff: diesWithoutPayoff.map((entry) => entry.name),
      local_only_edges: localDiesEdges.map((edge) => idToName[edge.from]),
      orphan_row: orphanRow,
      orphan_consumed: orphanConsumed,
      classification: {
        bucket_component: hasOrphan && hasLocalClosure,
        legit_component: hasOrphan && hasLegitResidual,
      },
    });

    expect(diesConsumers.length).toBeGreaterThan(0);
    expect(diesWithPayoff.length).toBeGreaterThan(0);
    expect(diesWithoutPayoff.length).toBeGreaterThan(0);
    expect(localDiesEdges.length).toBeGreaterThan(0);
    expect(orphanRow).toBeTruthy();
    expect(orphanConsumed).toBeLessThanOrEqual(diesWithoutPayoff.length);
  });
});
