import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import type { CardSynergyCandidateCard } from "../card_synergy_explorer";
import {
  CARD_SYNERGY_CANDIDATE_OUTPUT_META,
  CARD_SYNERGY_EXPLORER_CANDIDATE_OUTPUT_VERSION,
  createCardSynergyCandidateOutputs,
} from "../card_synergy_explorer";

describe("card synergy explorer candidate output contract v1", () => {
  test("meta/version is stable with expected flags", () => {
    expect(CARD_SYNERGY_EXPLORER_CANDIDATE_OUTPUT_VERSION).toBe(
      "card-synergy-explorer-candidate-output-contract-v1",
    );
    expect(CARD_SYNERGY_CANDIDATE_OUTPUT_META.version).toBe(
      "card-synergy-explorer-candidate-output-contract-v1",
    );
    expect(CARD_SYNERGY_CANDIDATE_OUTPUT_META.deterministic).toBe(true);
    expect(CARD_SYNERGY_CANDIDATE_OUTPUT_META.source).toBe("candidate_pool");
    expect(CARD_SYNERGY_CANDIDATE_OUTPUT_META.createsScores).toBe(false);
    expect(CARD_SYNERGY_CANDIDATE_OUTPUT_META.createsExplanations).toBe(false);
    expect(CARD_SYNERGY_CANDIDATE_OUTPUT_META.createsRank).toBe(false);
    expect(CARD_SYNERGY_CANDIDATE_OUTPUT_META.evaluatesSemanticBridges).toBe(false);
    expect(CARD_SYNERGY_CANDIDATE_OUTPUT_META.usesDeckSps).toBe(false);
    expect(CARD_SYNERGY_CANDIDATE_OUTPUT_META.usesMonteCarlo).toBe(false);
    expect(CARD_SYNERGY_CANDIDATE_OUTPUT_META.directRuntimeIo).toBe(false);
  });

  test("createCardSynergyCandidateOutputs maps basic fields and preserves input order", () => {
    const first: CardSynergyCandidateCard = {
      name: "A",
      oracleId: "a-1",
      typeLine: "Instant",
      oracleText: "Draw a card.",
      cmc: 1,
    };
    const second: CardSynergyCandidateCard = {
      name: "B",
      typeLine: "Creature",
      oracleText: "Flying",
      cmc: 2,
    };
    const outputs = createCardSynergyCandidateOutputs({
      candidatePool: [first, second],
    });

    expect(outputs).toEqual([
      {
        name: "A",
        oracleId: "a-1",
        typeLine: "Instant",
        oracleText: "Draw a card.",
        cmc: 1,
        source: "candidate_pool",
        status: "unranked",
        semanticStatus: "semantic_bridge_unavailable",
      },
      {
        name: "B",
        typeLine: "Creature",
        oracleText: "Flying",
        cmc: 2,
        source: "candidate_pool",
        status: "unranked",
        semanticStatus: "semantic_bridge_unavailable",
      },
    ]);
  });

  test("does not mutate input or frozen candidate objects and returns new objects", () => {
    const candidate: CardSynergyCandidateCard = {
      name: "  Candidate  ",
      oracleText: "Has text.",
      cmc: 3,
    };
    const input = {
      candidatePool: [candidate] as readonly CardSynergyCandidateCard[],
    };
    const snapshot = JSON.parse(JSON.stringify(input));

    Object.freeze(candidate);
    Object.freeze(input.candidatePool);
    Object.freeze(input);

    const outputs = createCardSynergyCandidateOutputs(input);

    expect(input).toEqual(snapshot);
    expect(candidate.name).toBe("  Candidate  ");
    expect(outputs).toHaveLength(1);
    expect(outputs[0]).not.toBe(candidate);
    expect(outputs[0].name).toBe("  Candidate  ");
  });

  test("marks source/status/semantic status and does not create score/rank/explanation/bridges", () => {
    const outputs = createCardSynergyCandidateOutputs({
      candidatePool: [{ name: "Only Candidate" }],
    });
    const output = outputs[0];

    expect(output.source).toBe("candidate_pool");
    expect(output.status).toBe("unranked");
    expect(output.semanticStatus).toBe("semantic_bridge_unavailable");
    expect("score" in output).toBe(false);
    expect("rank" in output).toBe(false);
    expect("explanation" in output).toBe(false);
    expect("bridges" in output).toBe(false);
  });

  test("does not apply limit or truncation", () => {
    const outputs = createCardSynergyCandidateOutputs({
      candidatePool: [{ name: "A" }, { name: "B" }, { name: "C" }],
    });

    expect(outputs.map((output) => output.name)).toEqual(["A", "B", "C"]);
  });

  test("module is publicly exported from card_synergy_explorer index", () => {
    const outputs = createCardSynergyCandidateOutputs({
      candidatePool: [{ name: "Public Export Candidate" }],
    });
    expect(outputs[0].name).toBe("Public Export Candidate");
  });

  test("candidate_output.ts excludes forbidden hooks and imports", () => {
    const source = readFileSync(
      new URL("../card_synergy_explorer/candidate_output.ts", import.meta.url),
      "utf-8",
    );

    expect(source.includes("fetch(")).toBe(false);
    expect(source.includes("Date.now")).toBe(false);
    expect(source.includes("Math.random")).toBe(false);
    expect(source.includes("window")).toBe(false);
    expect(source.includes("document")).toBe(false);
    expect(source.includes("localStorage")).toBe(false);
    expect(source.includes("sessionStorage")).toBe(false);
    expect(source.includes("../semantic")).toBe(false);
    expect(source.includes("../parser")).toBe(false);
    expect(source.includes("../analyzer")).toBe(false);
    expect(source.includes("montecarlo")).toBe(false);
    expect(source.includes("sps")).toBe(false);
  });
});
