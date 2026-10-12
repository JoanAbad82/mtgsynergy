// @ts-ignore - Node fixture typings are absent from the existing project tsconfig; Vitest runs in Node.
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DeckContextCandidateScore } from "../deck_context/types";
import {
  clearLegalityIndexCacheForTests,
  selectFormatLegalCandidates,
  SUPPORTED_DECK_FORMATS,
} from "../deck_context/format_legality_v1";

const row = (name: string) => ({
  candidate: { identityKey: "name:" + name.toLowerCase(), card: { name }, retrievedByAnchors: [] },
  contextualScore: 85, connectedDeckCardCount: 2, relatedDeckCards: [],
  reasons: [{key: 101, weight: 1}], evidenceLevel: "high", warnings: []
}) as DeckContextCandidateScore;

const snapshot = (by_name_norm: Record<string, Record<string, string>>, when = "2026-10-12T09:02:38Z") => ({
  schema_version: "cards-format-legalities-v1", provider: "Scryfall",
  source_updated_at: when, formats: [...SUPPORTED_DECK_FORMATS], by_name_norm,
});

afterEach(() => { vi.unstubAllGlobals(); clearLegalityIndexCacheForTests(); });

describe("deck-context explicit format legality — fail closed", () => {
  it("does not certify Commander without a commander identity model", async () => {
    expect(SUPPORTED_DECK_FORMATS).not.toContain("commander");
    const got = await selectFormatLegalCandidates(
      [row("Warleader's Call")], "commander" as any,
      { fetchSnapshot: async () => snapshot({
        "warleader's call": {commander: "legal"},
      }) as any, now: new Date("2026-10-12T12:00:00Z") }
    );
    expect(got.legal).toHaveLength(0);
    expect(got.unknown).toHaveLength(1);
  });

  it("excludes proven not_legal and banned; never treats restricted or missing as legal", async () => {
    const input = [row("Legal Card"), row("Not Legal"), row("Banned Card"), row("Restricted Card"), row("Unknown Card")];
    const got = await selectFormatLegalCandidates(input, "modern", {
      fetchSnapshot: async () => snapshot({
        "legal card": {modern: "legal"}, "not legal": {modern: "not_legal"},
        "banned card": {modern: "banned"}, "restricted card": {modern: "restricted"},
      }) as any, now: new Date("2026-10-12T12:00:00Z")
    });
    expect(got.legal.map(x => x.candidate.card.name)).toEqual(["Legal Card"]);
    expect(got.unknown.map(x => x.candidate.card.name)).toEqual(["Restricted Card", "Unknown Card"]);
    expect(got.excluded).toBe(2);
    expect(got.restricted).toBe(1);
    expect(got.degraded).toBe(true);
  });

  it("never certifies on outdated, future, missing or invalid sources", async () => {
    for (const when of ["2026-07-01T00:00:00Z", "2026-10-20T00:00:00Z", "bad-date"]) {
      const got = await selectFormatLegalCandidates([row("Legal Card")], "modern", {
        fetchSnapshot: async () => snapshot({"legal card": {modern: "legal"}}, when) as any,
        now: new Date("2026-10-12T12:00:00Z")
      });
      expect(got.legal).toHaveLength(0);
      expect(got.unknown).toHaveLength(1);
      expect(got.degraded).toBe(true);
    }
  });

  it("fails closed on request failure and does not upload user deck", async () => {
    const fetchMock = vi.fn(async () => { throw Error("offline"); });
    vi.stubGlobal("fetch", fetchMock);
    const got = await selectFormatLegalCandidates([row("Guttersnipe")], "pauper");
    expect(got.legal).toHaveLength(0);
    expect(got.unknown).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/data/cards_format_legalities.json.gz");
  });

  it("reads the frozen local Scryfall bulk, preserves legal cards and excludes illegal ones", async () => {
    const bytes = readFileSync("public/data/cards_format_legalities.json.gz");
    const fetchMock = vi.fn(async (url: unknown) => {
      expect(url).toBe("/data/cards_format_legalities.json.gz");
      return new Response(new Uint8Array(bytes), {status: 200});
    });
    vi.stubGlobal("fetch", fetchMock);
    const pauper = await selectFormatLegalCandidates(
      [row("Firebrand Archer"), row("Circle of Power"), row("Guttersnipe")], "pauper",
      {now: new Date("2026-10-12T12:00:00Z")}
    );
    expect(pauper.legal.map(r => r.candidate.card.name)).toEqual(["Firebrand Archer", "Guttersnipe"]);
    expect(pauper.excluded).toBe(1);
    expect(pauper.unknown).toHaveLength(0);
    const modern = await selectFormatLegalCandidates(
      [row("Invasion of Karsus // Refraction Elemental")], "modern",
      {now: new Date("2026-10-12T12:00:00Z")}
    );
    expect(modern.legal).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1); // shared immutable source cache
  });
});
