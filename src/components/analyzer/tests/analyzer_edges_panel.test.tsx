import { describe, expect, test } from "vitest";
import { groupEdgesForPanel } from "../AnalyzerApp";

describe("AnalyzerApp edges panel grouping", () => {
  test("groups edges by kind", () => {
    const edges = [
      {
        kind: "burn_supports_threat",
        from: "lightning strike",
        to: "monastery swiftspear",
      },
      {
        kind: "anthem_supports_tokens",
        from: "glorious anthem",
        to: "krenko's command",
      },
    ];

    const groups = groupEdgesForPanel(edges);
    expect(groups.length).toBe(2);
    expect(groups[0][0]).toBe("anthem_supports_tokens");
    expect(groups[1][0]).toBe("burn_supports_threat");
    expect(groups[1][1][0].from).toBe("lightning strike");
  });
});
