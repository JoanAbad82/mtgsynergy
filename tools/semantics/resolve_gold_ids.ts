import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { normalizeCardName } from "../../src/engine/cards/normalize.ts";

type GoldDataset = {
  SEM_IR_VERSION: number;
  archetype: string;
  card_id_scheme?: string;
  notes_meta?: string;
  cards: Array<{
    name: string;
    notes: string;
    card_name_norm?: string;
    card_id_scheme?: string;
    expected_ir: {
      card_id: number;
      frames: Array<unknown>;
    };
  }>;
};

type CardsIndexPayload = {
  by_name?: Record<string, { type_line?: string | null; oracle_text?: string | null; cmc?: number | null }>;
  by_name_norm?: Record<string, string>;
};

const here = dirname(fileURLToPath(import.meta.url));
const datasetPath = join(here, "gold", "sem_gold_v1_rakdos_seed.json");
const cardsIndexPath = join(here, "..", "..", "public", "data", "cards_index.json.gz");
const CARD_ID_SCHEME = "stable_name_rank_v1" as const;

function loadDataset(): GoldDataset {
  const raw = readFileSync(datasetPath, "utf8");
  return JSON.parse(raw) as GoldDataset;
}

function loadCardsIndex(): CardsIndexPayload {
  const gz = readFileSync(cardsIndexPath);
  const json = gunzipSync(gz).toString("utf8");
  return JSON.parse(json) as CardsIndexPayload;
}

function buildIdMap(payload: CardsIndexPayload): Map<string, number> {
  const byName = payload.by_name ?? {};
  const byNameNorm = { ...(payload.by_name_norm ?? {}) } as Record<string, string>;
  if (Object.keys(byNameNorm).length === 0) {
    for (const name of Object.keys(byName)) {
      byNameNorm[normalizeCardName(name)] = name;
    }
  }
  const sortedNorms = Object.keys(byNameNorm).sort();
  const idMap = new Map<string, number>();
  sortedNorms.forEach((norm, idx) => {
    idMap.set(norm, idx + 1);
  });
  return idMap;
}

function findCanonicalName(payload: CardsIndexPayload, nameOrNorm: string): string | null {
  const byName = payload.by_name ?? {};
  const byNameNorm = payload.by_name_norm ?? {};
  const name = nameOrNorm.trim();
  if (byName[name]) return name;
  const nameNorm = normalizeCardName(name);
  const canonical = byNameNorm[nameNorm];
  if (canonical && byName[canonical]) return canonical;

  if (!name.includes("//")) {
    const prefix = `${nameNorm} //`;
    const matches = Object.entries(byNameNorm)
      .filter(([norm]) => norm.startsWith(prefix))
      .map(([, canon]) => canon)
      .filter((canon) => canon && byName[canon]);
    if (matches.length === 1) return matches[0];
  }

  return null;
}

async function main() {
  const dataset = loadDataset();
  const payload = loadCardsIndex();
  const idMap = buildIdMap(payload);
  const missing: string[] = [];
  let resolved = 0;

  dataset.card_id_scheme = CARD_ID_SCHEME;
  dataset.notes_meta = "card_id is a deterministic rank over normalized card names from cards_index";

  for (const card of dataset.cards) {
    const canonical = findCanonicalName(payload, card.name);
    if (!canonical) {
      card.expected_ir.card_id = 0;
      card.card_name_norm = "";
      card.card_id_scheme = CARD_ID_SCHEME;
      missing.push(card.name);
      continue;
    }
    const nameNorm = normalizeCardName(canonical);
    const id = idMap.get(nameNorm);
    if (!id) {
      card.expected_ir.card_id = 0;
      card.card_name_norm = nameNorm;
      card.card_id_scheme = CARD_ID_SCHEME;
      missing.push(card.name);
      continue;
    }
    card.expected_ir.card_id = id;
    card.card_name_norm = nameNorm;
    card.card_id_scheme = CARD_ID_SCHEME;
    resolved += 1;
  }

  writeFileSync(datasetPath, JSON.stringify(dataset, null, 2) + "\n", "utf8");

  const total = dataset.cards.length;
  console.log(`resolved: ${resolved}/${total}`);
  console.log(`missing: ${missing.length}`);
  for (const name of missing) {
    console.log(name);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
