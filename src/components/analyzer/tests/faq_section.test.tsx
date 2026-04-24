import { describe, expect, it } from "vitest";
import { FAQ_SECTION_COPY } from "../sections/FaqSection";

describe("FaqSection copy", () => {
  it("expone copy actualizado de simulación", () => {
    expect(FAQ_SECTION_COPY.title).toBe("FAQ");
    expect(FAQ_SECTION_COPY.simulationLine.toLowerCase()).toContain("simulación de estabilidad");
    expect(FAQ_SECTION_COPY.simulationLine.toLowerCase()).toContain("estima");
    expect(FAQ_SECTION_COPY.simulationLine.toLowerCase()).toContain("pequeñas variaciones");
  });

  it("no contiene copy obsoleto o futuro", () => {
    const copyText = Object.values(FAQ_SECTION_COPY).join(" ").toLowerCase();
    expect(copyText).not.toContain("la simulación llegará en una siguiente fase");
    expect(copyText).not.toContain("siguiente fase");
    expect(copyText).not.toContain("solo structural");
  });
});
