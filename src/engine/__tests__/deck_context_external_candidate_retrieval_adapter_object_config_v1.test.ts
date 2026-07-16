import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resolveCardSynergyCandidatePool: vi.fn(),
  createCardSynergyCardsIndexAdapter: vi.fn(),
  lookupCard: vi.fn(),
  listCardsIndexRecords: vi.fn(),
  getCardsIndexRecordsSourceSnapshot: vi.fn(),
}));

vi.mock("../card_synergy_explorer", () => ({
  createCardSynergyCardsIndexAdapter: mocks.createCardSynergyCardsIndexAdapter,
  resolveCardSynergyCandidatePool: mocks.resolveCardSynergyCandidatePool,
}));

vi.mock("../cards/lookup", () => ({
  lookupCard: mocks.lookupCard,
  listCardsIndexRecords: mocks.listCardsIndexRecords,
  getCardsIndexRecordsSourceSnapshot: mocks.getCardsIndexRecordsSourceSnapshot,
}));

import { retrieveBoundedDeckContextCandidates } from "../deck_context/external_card_candidate_retrieval_v1";

describe("external candidate retrieval adapter object-config integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createCardSynergyCardsIndexAdapter.mockImplementation((options) => ({ __options: options }));
    mocks.lookupCard.mockResolvedValue(null);
    mocks.resolveCardSynergyCandidatePool.mockResolvedValue({ resolvedSeeds: [], candidatePool: [], degradations: [] });
  });

  test("passes the canonical object config and preserves baseUrl propagation", async () => {
    const baseUrl = "http://cards.test";
    await retrieveBoundedDeckContextCandidates({
      anchors: [{ key: "name:guttersnipe", name: "Guttersnipe", nameNorm: "guttersnipe" } as any],
      presentCards: [{ nameNorm: "guttersnipe" }],
      baseUrl,
    });

    expect(mocks.createCardSynergyCardsIndexAdapter).toHaveBeenCalledTimes(1);
    expect(mocks.createCardSynergyCardsIndexAdapter).toHaveBeenCalledWith({
      baseUrl,
      lookupCard: expect.any(Function),
      listCardsIndexRecords: expect.any(Function),
      candidatePoolLimit: 200,
      candidatePoolOverscan: 16,
    });

    const options = mocks.createCardSynergyCardsIndexAdapter.mock.calls[0]?.[0];
    await options.lookupCard("Guttersnipe", "ignored-by-bound-wrapper");
    expect(mocks.lookupCard).toHaveBeenCalledWith("Guttersnipe", baseUrl);
    await options.listCardsIndexRecords({ limit: 12, includeEmptyOracleText: false });
    expect(mocks.listCardsIndexRecords).toHaveBeenCalledWith({ limit: 12, includeEmptyOracleText: false, baseUrl });
    expect(mocks.resolveCardSynergyCandidatePool).toHaveBeenCalledTimes(1);
  });

  test("propagates canonical rich lookup data into candidate-pool seeds", async () => {
    mocks.lookupCard.mockResolvedValueOnce({
      name: "Guttersnipe",
      name_norm: "guttersnipe",
      oracle_id: "oracle-guttersnipe",
      type_line: "Creature - Goblin Shaman",
      oracle_text:
        "Whenever you cast an instant or sorcery spell, Guttersnipe deals 2 damage to each opponent.",
      cmc: 3,
      keywords: ["Magecraft"],
    });

    await retrieveBoundedDeckContextCandidates({
      anchors: [{ key: "name:guttersnipe", name: "Guttersnipe", nameNorm: "guttersnipe" } as any],
      presentCards: [{ nameNorm: "guttersnipe" }],
      baseUrl: "http://cards.test",
    });

    expect(mocks.lookupCard).toHaveBeenCalledWith("Guttersnipe", "http://cards.test");
    const explorerInput = mocks.resolveCardSynergyCandidatePool.mock.calls[0]?.[0];
    expect(explorerInput.cards[0]).toMatchObject({
      name: "Guttersnipe",
      nameNorm: "guttersnipe",
      oracleId: "oracle-guttersnipe",
      oracle_id: "oracle-guttersnipe",
      typeLine: "Creature - Goblin Shaman",
      type_line: "Creature - Goblin Shaman",
      oracleText:
        "Whenever you cast an instant or sorcery spell, Guttersnipe deals 2 damage to each opponent.",
      oracle_text:
        "Whenever you cast an instant or sorcery spell, Guttersnipe deals 2 damage to each opponent.",
      keywords: ["Magecraft"],
    });
    expect(explorerInput.seedCards[0]).toEqual(explorerInput.cards[0]);
    expect(explorerInput.seeds[0]).toEqual(explorerInput.cards[0]);
  });
});
