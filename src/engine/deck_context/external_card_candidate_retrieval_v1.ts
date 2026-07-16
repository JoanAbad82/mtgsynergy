import {
  createCardSynergyCardsIndexAdapter,
  resolveCardSynergyCandidatePool,
} from "../card_synergy_explorer";
import type { CardSynergyCandidateCard } from "../card_synergy_explorer/types";
import type { CardRecordMin } from "../cards/types";
import {
  getCardsIndexRecordsSourceSnapshot,
  listCardsIndexRecords,
  lookupCard,
  type CardsIndexRecordsSourceSnapshot,
  type CardsIndexSourceIdentity,
} from "../cards/lookup";
import type {
  DeckContextAnchor,
  DeckContextRetrievalResult,
  RetrievedDeckContextCandidate,
} from "./types";
import {
  MAX_DECK_ANCHORS,
  MAX_UNION_CANDIDATES,
  POOL_PER_ANCHOR,
} from "./types";
import {
  doesPreparedDeckContextLexicalFilterMatch,
  prepareDeckContextAnchorLexicalFilterTokens,
  prepareDeckContextCandidateFeatureCorpus,
  rankPreparedDeckContextCandidateRecordsForSeedsTopK,
  type DeckContextCandidateRankingSeed,
  type PreparedDeckContextCandidateCorpus,
  type PreparedDeckContextCandidateRecord,
} from "./external_card_candidate_ranking_v1";

const PRE_RANKING_ELIGIBLE_WINDOW = 24576;
const CANDIDATE_POOL_OVERSCAN = 16;
const RANKED_RECORDS_PER_ANCHOR = POOL_PER_ANCHOR + CANDIDATE_POOL_OVERSCAN;

type PreparedCorpusCacheEntry = {
  sourceIdentity: CardsIndexSourceIdentity;
  promise: Promise<PreparedDeckContextCandidateCorpus>;
};

const preparedCorpusCacheStats = {
  hitCount: 0,
  missCount: 0,
  buildCount: 0,
  rejectionEvictionCount: 0,
  sourceReplacementCount: 0,
};

let preparedCorpusCacheEntry: PreparedCorpusCacheEntry | null = null;

const norm = (value: string): string =>
  value.normalize("NFKD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();

const identity = (card: CardSynergyCandidateCard): string =>
  card.oracleId?.trim()
    ? `oracle:${card.oracleId.trim()}`
    : `name:${norm(card.name)}`;

type RichAnchorSeed = {
  name: string;
  nameNorm?: string;
  oracleId?: string;
  oracle_id?: string;
  typeLine?: string;
  type_line?: string | null;
  oracleText?: string;
  oracle_text?: string | null;
  keywords?: readonly string[] | null;
};

const nonEmpty = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

function getPreparedCorpusCacheDiagnosticSource() {
  if (!preparedCorpusCacheEntry) {
    return null;
  }
  return {
    generation: preparedCorpusCacheEntry.sourceIdentity.generation,
    cacheKey: preparedCorpusCacheEntry.sourceIdentity.cacheKey,
  };
}

function resetPreparedCorpusCacheForTesting() {
  preparedCorpusCacheEntry = null;
  preparedCorpusCacheStats.hitCount = 0;
  preparedCorpusCacheStats.missCount = 0;
  preparedCorpusCacheStats.buildCount = 0;
  preparedCorpusCacheStats.rejectionEvictionCount = 0;
  preparedCorpusCacheStats.sourceReplacementCount = 0;
}

function getPreparedCorpusCacheStatsForTesting() {
  return {
    ...preparedCorpusCacheStats,
    hasEntry: preparedCorpusCacheEntry !== null,
    currentSource: getPreparedCorpusCacheDiagnosticSource(),
  };
}

function getPreparedCorpusForSourceSnapshot(
  snapshot: CardsIndexRecordsSourceSnapshot,
): Promise<PreparedDeckContextCandidateCorpus> {
  const currentEntry = preparedCorpusCacheEntry;
  if (currentEntry?.sourceIdentity === snapshot.sourceIdentity) {
    preparedCorpusCacheStats.hitCount += 1;
    return currentEntry.promise;
  }

  if (currentEntry) {
    preparedCorpusCacheStats.sourceReplacementCount += 1;
  }
  preparedCorpusCacheStats.missCount += 1;

  const entry: PreparedCorpusCacheEntry = {
    sourceIdentity: snapshot.sourceIdentity,
    promise: Promise.resolve()
      .then(() => {
        preparedCorpusCacheStats.buildCount += 1;
        return prepareDeckContextCandidateFeatureCorpus(snapshot.records);
      })
      .catch((error) => {
        if (preparedCorpusCacheEntry?.promise === entry.promise) {
          preparedCorpusCacheEntry = null;
          preparedCorpusCacheStats.rejectionEvictionCount += 1;
        }
        throw error;
      }),
  };
  preparedCorpusCacheEntry = entry;
  return entry.promise;
}

function buildAnchorSeed(
  anchor: DeckContextAnchor,
  record: CardRecordMin | null,
): RichAnchorSeed {
  const seed: RichAnchorSeed = {
    name: nonEmpty(record?.name) ? record.name : anchor.name,
    nameNorm: nonEmpty(record?.name_norm) ? record.name_norm : anchor.nameNorm,
  };

  const oracleId = nonEmpty(record?.oracle_id) ? record.oracle_id : anchor.oracleId;
  if (nonEmpty(oracleId)) {
    seed.oracleId = oracleId;
    seed.oracle_id = oracleId;
  }

  const typeLine = nonEmpty(record?.type_line) ? record.type_line : anchor.typeLine;
  if (nonEmpty(typeLine)) {
    seed.typeLine = typeLine;
    seed.type_line = typeLine;
  }

  const oracleText = nonEmpty(record?.oracle_text) ? record.oracle_text : anchor.oracleText;
  if (nonEmpty(oracleText)) {
    seed.oracleText = oracleText;
    seed.oracle_text = oracleText;
  }

  if (Array.isArray(record?.keywords)) {
    seed.keywords = record.keywords;
  }

  return seed;
}

export async function retrieveBoundedDeckContextCandidates(input: {
  anchors: readonly DeckContextAnchor[];
  presentCards: readonly { oracleId?: string; nameNorm: string }[];
  baseUrl?: string;
}): Promise<DeckContextRetrievalResult> {
  let activeRankingKey: string | null = null;
  let sharedPreparedCorpusPromise: Promise<PreparedDeckContextCandidateCorpus> | null = null;
  let sharedTopKPromise: Promise<ReadonlyMap<string, readonly CardRecordMin[]>> | null = null;

  const getSharedPreparedCorpus = async (): Promise<PreparedDeckContextCandidateCorpus> => {
    if (!sharedPreparedCorpusPromise) {
      sharedPreparedCorpusPromise = getCardsIndexRecordsSourceSnapshot({
        baseUrl: input.baseUrl,
        limit: PRE_RANKING_ELIGIBLE_WINDOW,
        includeEmptyOracleText: false,
      }).then((snapshot) => getPreparedCorpusForSourceSnapshot(snapshot));
    }
    return sharedPreparedCorpusPromise;
  };

  const anchors = [...input.anchors].slice(0, MAX_DECK_ANCHORS);
  const anchorEntries = [];
  for (const anchor of anchors) {
    let resolvedAnchor: CardRecordMin | null = null;
    try {
      resolvedAnchor = await lookupCard(anchor.name, input.baseUrl);
    } catch {
      resolvedAnchor = null;
    }
    anchorEntries.push({
      key: `${anchorEntries.length}:${anchor.key}`,
      anchor,
      seed: buildAnchorSeed(anchor, resolvedAnchor),
    });
  }

  const anchorFilterEntries = anchorEntries.map((entry) => ({
    key: entry.key,
    filterTokens: prepareDeckContextAnchorLexicalFilterTokens(entry.seed),
  }));
  const anchorFilterTokensByKey = new Map(
    anchorFilterEntries.map((entry) => [entry.key, entry.filterTokens]),
  );

  const getSharedTopKRecords = async (): Promise<ReadonlyMap<string, readonly CardRecordMin[]>> => {
    if (!sharedTopKPromise) {
      sharedTopKPromise = getSharedPreparedCorpus().then((corpus) => {
        const ranked = rankPreparedDeckContextCandidateRecordsForSeedsTopK(
          anchorEntries.map((entry) => {
            const filterTokens = anchorFilterTokensByKey.get(entry.key);
            return {
              key: entry.key,
              seed: entry.seed,
              limit: RANKED_RECORDS_PER_ANCHOR,
              preparedRecordFilter: filterTokens
                ? (prepared: PreparedDeckContextCandidateRecord) =>
                    doesPreparedDeckContextLexicalFilterMatch(
                      prepared.lexicalFilterTokens,
                      filterTokens,
                    )
                : undefined,
            };
          }),
          corpus,
        );
        const records = new Map<string, readonly CardRecordMin[]>();
        for (const [key, items] of ranked) {
          records.set(key, items.map((item) => item.record));
        }
        return records;
      });
    }
    return sharedTopKPromise;
  };

  const adapter = createCardSynergyCardsIndexAdapter({
    baseUrl: input.baseUrl,
    lookupCard: (name: string) => lookupCard(name, input.baseUrl),
    listCardsIndexRecords: async (options) => {
      const requestedLimit = typeof options?.limit === "number" ? Math.floor(options.limit) : undefined;
      if (!activeRankingKey || requestedLimit === undefined || requestedLimit <= 0) {
        return listCardsIndexRecords({ ...options, baseUrl: input.baseUrl });
      }
      const records = (await getSharedTopKRecords()).get(activeRankingKey);
      if (records) {
        return records.slice(0, requestedLimit);
      }

      const rankingSeed = anchorEntries.find((entry) => entry.key === activeRankingKey)?.seed;
      if (!rankingSeed) {
        return listCardsIndexRecords({ ...options, baseUrl: input.baseUrl });
      }
      const corpus = await getSharedPreparedCorpus();
      const adapterFilter = options?.recordFilter;
      const acceptsAdapterFilter = (prepared: PreparedDeckContextCandidateRecord): boolean =>
        adapterFilter ? adapterFilter(prepared.record) : true;
      const preparedRecords = corpus.records.filter(acceptsAdapterFilter);
      const filterTokens = anchorFilterTokensByKey.get(activeRankingKey);
      return rankPreparedDeckContextCandidateRecordsForSeedsTopK(
        [{
          key: activeRankingKey,
          seed: rankingSeed,
          limit: requestedLimit,
          preparedRecordFilter: filterTokens
            ? (prepared: PreparedDeckContextCandidateRecord) =>
                doesPreparedDeckContextLexicalFilterMatch(
                  prepared.lexicalFilterTokens,
                  filterTokens,
                )
            : undefined,
        }],
        preparedRecords,
      )
        .get(activeRankingKey)!
        .map((ranked) => ranked.record);
    },
    candidatePoolLimit: 200,
    candidatePoolOverscan: CANDIDATE_POOL_OVERSCAN,
  });

  const presentOracle = new Set(
    input.presentCards.map((card) => card.oracleId).filter(Boolean),
  );
  const presentNames = new Set(input.presentCards.map((card) => card.nameNorm));
  const merged = new Map<string, RetrievedDeckContextCandidate>();
  const retrievalOrder = new Map<string, number>();
  let excludedPresentCount = 0;
  let duplicateMergeCount = 0;
  const degradations = [];

  for (const entry of anchorEntries) {
    const { anchor, seed } = entry;
    const explorerInput = {
      seeds: [seed],
      seedCards: [seed],
      cards: [seed],
      options: { maxCandidates: POOL_PER_ANCHOR },
    } as any;

    activeRankingKey = entry.key;
    let result;
    try {
      result = await resolveCardSynergyCandidatePool(explorerInput, adapter);
    } finally {
      activeRankingKey = null;
    }
    degradations.push(...result.degradations);

    for (const card of result.candidatePool) {
      const key = identity(card);
      const cardNameNorm = norm(card.name);
      const anchorOrder = retrievalOrder.size;
      if (
        (card.oracleId && presentOracle.has(card.oracleId)) ||
        presentNames.has(cardNameNorm)
      ) {
        excludedPresentCount += 1;
        continue;
      }
      const existing = merged.get(key);
      if (existing) {
        duplicateMergeCount += 1;
        retrievalOrder.set(key, Math.min(retrievalOrder.get(key) ?? anchorOrder, anchorOrder));
        merged.set(key, {
          ...existing,
          retrievedByAnchors: [...new Set([...existing.retrievedByAnchors, anchor.key])].sort(),
        });
      } else {
        retrievalOrder.set(key, anchorOrder);
        merged.set(key, {
          identityKey: key,
          card,
          retrievedByAnchors: [anchor.key],
        });
      }
    }
  }

  const ordered = [...merged.values()].sort(
    (a, b) =>
      b.retrievedByAnchors.length - a.retrievedByAnchors.length ||
      (retrievalOrder.get(a.identityKey) ?? Number.MAX_SAFE_INTEGER) -
        (retrievalOrder.get(b.identityKey) ?? Number.MAX_SAFE_INTEGER) ||
      a.card.name.localeCompare(b.card.name),
  );
  const candidates = ordered.slice(0, MAX_UNION_CANDIDATES);

  return {
    anchorsUsed: anchors,
    candidates,
    excludedPresentCount,
    duplicateMergeCount,
    truncatedCount: Math.max(0, ordered.length - candidates.length),
    degradations,
  };
}

export const __testing = {
  resetPreparedCorpusCache: resetPreparedCorpusCacheForTesting,
  getPreparedCorpusCacheStats: getPreparedCorpusCacheStatsForTesting,
};
