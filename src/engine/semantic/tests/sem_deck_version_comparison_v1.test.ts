import { describe, expect, it } from "vitest";
import { compareSemanticAnalysisResultsV1 } from "../comparison/compare_semantic_analysis_results_v1";
import { analyzeMtgaExportAsync as analyzeRealDeckStateV1 } from "../../index";

const result=(entries:Array<{name:string;name_norm:string;count:number}>,connections:unknown[]=[],events:unknown[]=[],coverage=0)=>({deckState:{deck:{entries}},semanticOverlay:{connections,events,coverage}});
describe("semantic deck-version comparison v1",()=>{it("reports gain and inverse loss",()=>{const a=result([{name:"Guttersnipe",name_norm:"guttersnipe",count:4}]);const b=result([{name:"Guttersnipe",name_norm:"guttersnipe",count:4},{name:"Opt",name_norm:"opt",count:4}],[{source:"opt",target:"guttersnipe",reason:{key:7}}],[{eventId:"CAST_SPELL"}],.5);const g=compareSemanticAnalysisResultsV1(a,b),l=compareSemanticAnalysisResultsV1(b,a);expect(g.cardsAdded.map(x=>x.key)).toEqual(["opt"]);expect(g.connectionsGained).toHaveLength(1);expect(l.cardsRemoved.map(x=>x.key)).toEqual(["opt"]);expect(l.connectionsLost).toEqual(g.connectionsGained);});it("does not fabricate duplicate-line deltas",()=>{const d=compareSemanticAnalysisResultsV1(result([{name:"Plains",name_norm:"plains",count:56}]),result([{name:"Plains",name_norm:"plains",count:2},{name:"Plains",name_norm:"plains",count:54}]));expect(d.cardsAdded).toEqual([]);expect(d.cardsRemoved).toEqual([]);expect(d.quantityChanges).toEqual([]);});it("separates quantity from presence and preserves inputs",()=>{const a=result([{name:"Guttersnipe",name_norm:"guttersnipe",count:4}]),b=result([{name:"Guttersnipe",name_norm:"guttersnipe",count:2}]),before=JSON.stringify([a,b]),d=compareSemanticAnalysisResultsV1(a,b);expect(d.cardsAdded).toEqual([]);expect(d.cardsRemoved).toEqual([]);expect(d.quantityChanges).toEqual([{key:"guttersnipe",name:"Guttersnipe",quantityA:4,quantityB:2,delta:-2}]);expect(JSON.stringify([a,b])).toBe(before);});});


it("real analyzer entrypoint validates canonical Pair 3 and Pair 4", async () => {
  const analyze = async (deckText: string) => {
    const roots = [
      process.env.MTGS_CARDS_BASE_URL,
      `${process.env.MTGS_CARDS_BASE_URL}/cards_index`,
      `${process.env.MTGS_CARDS_BASE_URL}/cards_index/`,
    ];
    const failures: string[] = [];
    for (const baseUrl of roots) {
      try {
        return await analyzeRealDeckStateV1(deckText, {
          enableCardIndex: true,
          baseUrl,
        });
      } catch (error) {
        failures.push(`${baseUrl}: ${String(error)}`);
      }
    }
    throw new Error(failures.join(" | "));
  };

  const pair3A = await analyze(`Deck
4 Banisher Priest
56 Plains`);
  const pair3B = await analyze(`Deck
4 Banisher Priest
2 Plains
54 Plains`);
  const pair4A = await analyze(`Deck
4 Guttersnipe
4 Opt
52 Mountain`);
  const pair4B = await analyze(`Deck
2 Guttersnipe
4 Opt
54 Mountain`);

  const pair3 = compareSemanticAnalysisResultsV1(pair3A, pair3B);
  expect(pair3.cardsAdded).toEqual([]);
  expect(pair3.cardsRemoved).toEqual([]);
  expect(pair3.quantityChanges).toEqual([]);
  expect(pair3.connectionsGained).toEqual([]);
  expect(pair3.connectionsLost).toEqual([]);
  expect(pair3.eventsGained).toEqual([]);
  expect(pair3.eventsLost).toEqual([]);

  const pair4 = compareSemanticAnalysisResultsV1(pair4A, pair4B);
  const guttersnipe = pair4.quantityChanges.find(
    (entry) => entry.key === "guttersnipe",
  );
  expect(guttersnipe).toEqual({
    key: "guttersnipe",
    name: "Guttersnipe",
    quantityA: 4,
    quantityB: 2,
    delta: -2,
  });
  expect(pair4.cardsAdded.some((entry) => entry.key === "guttersnipe")).toBe(false);
  expect(pair4.cardsRemoved.some((entry) => entry.key === "guttersnipe")).toBe(false);
  expect(compareSemanticAnalysisResultsV1(pair4A, pair4B)).toEqual(pair4);
});
