import { describe, expect, it } from "vitest";
import {
  SEMANTIC_OVERLAY_COPY,
  filterRedundancyGroups,
} from "../SemanticOverlayPanel";

describe("SemanticOverlayPanel copy", () => {
  it("usa texto en español para los encabezados principales", () => {
    expect(SEMANTIC_OVERLAY_COPY.title).toContain("Superposición semántica");
    expect(SEMANTIC_OVERLAY_COPY.edgesTitle).toContain("Conexiones");
    expect(SEMANTIC_OVERLAY_COPY.noEdges).toContain("No hay conexiones");
    expect(SEMANTIC_OVERLAY_COPY.redundancyNotApplicable).toContain("no aplicable");
  });
});

describe("SemanticOverlayPanel redundancy filtering", () => {
  it("excluye perfiles vacíos", () => {
    const input = [
      { signature: "P: | C:", card_ids: [1, 2], size: 2 },
      { signature: "P:1 | C:2", card_ids: [3, 4], size: 2 },
    ];
    const result = filterRedundancyGroups(input);
    expect(result).toEqual([{ signature: "P:1 | C:2", card_ids: [3, 4], size: 2 }]);
  });
});
