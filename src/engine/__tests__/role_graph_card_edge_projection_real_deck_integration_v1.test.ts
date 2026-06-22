import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, test, vi } from "vitest";
import { analyzeMtgaExportAsync } from "../analyzer";
import { __testing } from "../cards/lookup";
import type { Role } from "../domain/types";

const here = dirname(fileURLToPath(import.meta.url));
const cardsIndexPath = join(
  here,
  "../../../public/data/cards_index.json.gz",
);

const PUBLIC_REAL_DECK = [
  "4 Monastery Swiftspear",
  "4 Kumano Faces Kakkazan",
  "4 Phoenix Chick",
  "4 Feldon, Ronom Excavator",
  "4 Bloodthirsty Adversary",
  "4 Play with Fire",
  "4 Lightning Strike",
  "4 Stoke the Flames",
  "4 Mechanized Warfare",
  "20 Mountain",
  "",
].join("\n");

const ROLE_ORDER: Role[] = [
  "ENGINE",
  "PAYOFF",
  "RAMP",
  "DRAW",
  "REMOVAL",
  "PROTECTION",
  "LAND",
  "UTILITY",
];

const originalFetch = globalThis.fetch;

afterEach(() => {
  // @ts-expect-error restore test global
  globalThis.fetch = originalFetch;
  __testing.clearCache();
  vi.restoreAllMocks();
});

describe("ROLE_GRAPH_CARD_EDGE_TO_ROLE_EDGE_PROJECTION_REAL_DECK_INTEGRATION_V1", () => {
  test("preserves 15 public card edges while structural summary receives finite role edges", async () => {
    const gz = readFileSync(cardsIndexPath);
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/cards_index.json.gz")) {
        return {
          ok: true,
          arrayBuffer: async () =>
            gz.buffer.slice(gz.byteOffset, gz.byteOffset + gz.byteLength),
        };
      }

      return { ok: false, status: 404 } as any;
    });

    // @ts-expect-error test mock
    globalThis.fetch = fetchMock;
    __testing.clearCache();

    const result = await analyzeMtgaExportAsync(PUBLIC_REAL_DECK, {
      enableCardIndex: true,
      baseUrl: "http://local.test",
    });

    const issueCodes = result.issues.map((issue) => issue.code);
    expect(issueCodes).toContain("TAGGING_ACTIVE");
    expect(issueCodes).not.toContain("TAGGING_UNAVAILABLE");

    const cardEdges = result.deckState.edges;
    expect(cardEdges).toHaveLength(15);

    for (const edge of cardEdges) {
      expect(typeof edge.from).toBe("string");
      expect(typeof edge.to).toBe("string");
      expect(typeof edge.kind).toBe("string");
      expect(Number.isFinite(edge.weight)).toBe(true);
      expect(Number.isFinite(edge.score)).toBe(true);
      expect(ROLE_ORDER).not.toContain(edge.from as Role);
      expect(ROLE_ORDER).not.toContain(edge.to as Role);
    }

    expect(result.summary.edges_total).toBe(15);
    expect(result.summary.density).toBeCloseTo(15 / (8 * 7));

    for (const role of ROLE_ORDER) {
      expect(Number.isFinite(result.summary.in_degree[role])).toBe(true);
      expect(Number.isFinite(result.summary.out_degree[role])).toBe(true);
      expect(Number.isFinite(result.summary.centrality_score[role])).toBe(true);
    }

    expect(result.summary.out_degree.REMOVAL).toBeGreaterThan(0);
    expect(result.summary.in_degree.PAYOFF).toBeGreaterThan(0);
    expect(result.summary.centrality_score.REMOVAL).toBeGreaterThan(0);
    expect(result.summary.centrality_score.PAYOFF).toBeGreaterThan(0);
    expect(JSON.stringify(result.summary)).not.toContain(":null");

    expect(fetchMock).toHaveBeenCalled();
  });
});
