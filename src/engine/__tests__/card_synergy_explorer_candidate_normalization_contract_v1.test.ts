import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import type { CardSynergyCandidateCard } from "../card_synergy_explorer";
import {
  CARD_SYNERGY_CANDIDATE_NORMALIZATION_META,
  normalizeCardSynergyCandidatePool,
} from "../card_synergy_explorer";

describe("card synergy explorer candidate normalization contract v1", () => {
  test("meta/version is stable", () => {
    expect(CARD_SYNERGY_CANDIDATE_NORMALIZATION_META.version).toBe(
      "card-synergy-explorer-candidate-normalization-contract-v1",
    );
    expect(CARD_SYNERGY_CANDIDATE_NORMALIZATION_META.deterministic).toBe(true);
    expect(CARD_SYNERGY_CANDIDATE_NORMALIZATION_META.createsScores).toBe(false);
    expect(CARD_SYNERGY_CANDIDATE_NORMALIZATION_META.createsExplanations).toBe(false);
    expect(CARD_SYNERGY_CANDIDATE_NORMALIZATION_META.createsBridges).toBe(false);
    expect(CARD_SYNERGY_CANDIDATE_NORMALIZATION_META.createsRankedCandidates).toBe(false);
    expect(CARD_SYNERGY_CANDIDATE_NORMALIZATION_META.usesDeckSps).toBe(false);
    expect(CARD_SYNERGY_CANDIDATE_NORMALIZATION_META.usesMonteCarlo).toBe(false);
    expect(CARD_SYNERGY_CANDIDATE_NORMALIZATION_META.directRuntimeIo).toBe(false);
  });

  test("returns empty normalized pool when candidatePool is empty", () => {
    const result = normalizeCardSynergyCandidatePool({
      candidatePool: [],
      seedCards: [],
    });

    expect(result.normalizedCandidatePool).toEqual([]);
    expect(result.excludedCandidateCount).toBe(0);
  });

  test("preserves stable order of unique candidates", () => {
    const a: CardSynergyCandidateCard = { name: "A" };
    const b: CardSynergyCandidateCard = { name: "B" };
    const c: CardSynergyCandidateCard = { name: "C" };

    const result = normalizeCardSynergyCandidatePool({
      candidatePool: [a, b, c],
      seedCards: [],
    });

    expect(result.normalizedCandidatePool).toEqual([a, b, c]);
  });

  test("deduplicates by oracleId and preserves first object", () => {
    const first: CardSynergyCandidateCard = { name: "Card One", oracleId: "oid-1" };
    const dup: CardSynergyCandidateCard = { name: "Card One Variant", oracleId: "oid-1" };

    const result = normalizeCardSynergyCandidatePool({
      candidatePool: [first, dup],
      seedCards: [],
    });

    expect(result.normalizedCandidatePool).toHaveLength(1);
    expect(result.normalizedCandidatePool[0]).toBe(first);
    expect(result.duplicateCandidateCount).toBe(1);
  });

  test("deduplicates by name trim().toLowerCase() when oracleId is absent", () => {
    const first: CardSynergyCandidateCard = { name: "  Brainstorm  " };
    const dup: CardSynergyCandidateCard = { name: "brainstorm" };

    const result = normalizeCardSynergyCandidatePool({
      candidatePool: [first, dup],
      seedCards: [],
    });

    expect(result.normalizedCandidatePool).toHaveLength(1);
    expect(result.normalizedCandidatePool[0]).toBe(first);
    expect(result.duplicateCandidateCount).toBe(1);
  });

  test("excludes seed cards by oracleId", () => {
    const seed: CardSynergyCandidateCard = { name: "Seed", oracleId: "seed-1" };
    const candidate: CardSynergyCandidateCard = { name: "Seed Other Print", oracleId: "seed-1" };

    const result = normalizeCardSynergyCandidatePool({
      candidatePool: [candidate],
      seedCards: [seed],
    });

    expect(result.normalizedCandidatePool).toEqual([]);
    expect(result.seedCandidateCount).toBe(1);
  });

  test("excludes seed cards by name when oracleId is absent", () => {
    const seed: CardSynergyCandidateCard = { name: "  Opt  " };
    const candidate: CardSynergyCandidateCard = { name: "opt" };

    const result = normalizeCardSynergyCandidatePool({
      candidatePool: [candidate],
      seedCards: [seed],
    });

    expect(result.normalizedCandidatePool).toEqual([]);
    expect(result.seedCandidateCount).toBe(1);
  });

  test("applies maxCandidates after seed exclusion and deduplication", () => {
    const seed: CardSynergyCandidateCard = { name: "Seed", oracleId: "seed-id" };
    const filteredSeed: CardSynergyCandidateCard = { name: "Seed", oracleId: "seed-id" };
    const first: CardSynergyCandidateCard = { name: "A" };
    const dupOfFirst: CardSynergyCandidateCard = { name: "  a  " };
    const second: CardSynergyCandidateCard = { name: "B" };
    const third: CardSynergyCandidateCard = { name: "C" };

    const result = normalizeCardSynergyCandidatePool({
      candidatePool: [filteredSeed, first, dupOfFirst, second, third],
      seedCards: [seed],
      maxCandidates: 2,
    });

    expect(result.normalizedCandidatePool).toEqual([first, second]);
    expect(result.seedCandidateCount).toBe(1);
    expect(result.duplicateCandidateCount).toBe(1);
    expect(result.excludedCandidateCount).toBe(3);
  });

  test("maxCandidates <= 0 returns empty normalized pool", () => {
    const result = normalizeCardSynergyCandidatePool({
      candidatePool: [{ name: "A" }, { name: "B" }],
      seedCards: [],
      maxCandidates: 0,
    });

    expect(result.normalizedCandidatePool).toEqual([]);
  });

  test("does not mutate input object or candidate card objects", () => {
    const candidate: CardSynergyCandidateCard = { name: "  Opt  ", oracleText: "Draw a card." };
    const seed: CardSynergyCandidateCard = { name: "Seed" };
    const input = {
      candidatePool: [candidate] as readonly CardSynergyCandidateCard[],
      seedCards: [seed] as readonly CardSynergyCandidateCard[],
      maxCandidates: 5,
    };
    const snapshot = JSON.parse(JSON.stringify(input));

    Object.freeze(candidate);
    Object.freeze(seed);
    Object.freeze(input.candidatePool);
    Object.freeze(input.seedCards);
    Object.freeze(input);

    normalizeCardSynergyCandidatePool(input);

    expect(input).toEqual(snapshot);
    expect(candidate.name).toBe("  Opt  ");
  });

  test("does not create score, explanation, bridges, or CardSynergyCandidate shape", () => {
    const result = normalizeCardSynergyCandidatePool({
      candidatePool: [{ name: "A" }],
      seedCards: [],
    });

    expect(result.normalizedCandidatePool).toHaveLength(1);
    expect("score" in result.normalizedCandidatePool[0]).toBe(false);
    expect("explanation" in result.normalizedCandidatePool[0]).toBe(false);
    expect("bridges" in result.normalizedCandidatePool[0]).toBe(false);
  });

  test("candidate_normalization.ts has no forbidden hooks/layers and no literal fetch", () => {
    const source = readFileSync(
      new URL("../card_synergy_explorer/candidate_normalization.ts", import.meta.url),
      "utf-8",
    );

    expect(source.includes("fetch")).toBe(false);
    expect(source.includes("Date.now")).toBe(false);
    expect(source.includes("Math.random")).toBe(false);
    expect(source.includes("localStorage")).toBe(false);
    expect(source.includes("sessionStorage")).toBe(false);
    expect(source.includes("window")).toBe(false);
    expect(source.includes("document")).toBe(false);
    expect(source.includes("cards_index")).toBe(false);
    expect(source.includes("analyzer")).toBe(false);
    expect(source.includes("parser")).toBe(false);
    expect(source.includes("semantic")).toBe(false);
    expect(source.includes("montecarlo")).toBe(false);
    expect(source.includes("sps")).toBe(false);
  });

  test("index.ts exports candidate_normalization module", () => {
    const source = readFileSync(new URL("../card_synergy_explorer/index.ts", import.meta.url), "utf-8");
    expect(source.includes('export * from "./candidate_normalization";')).toBe(true);
  });
});
