import { describe, expect, it } from "vitest";
import { FAQ_SECTION_COPY } from "../sections/FaqSection";

describe("FaqSection copy", () => {
  it("expone copy actualizado de FAQ", () => {
    expect(FAQ_SECTION_COPY.title).toBe("FAQ");

    const copyText = JSON.stringify(FAQ_SECTION_COPY).toLowerCase();

    expect(copyText).toContain("sps");
    expect(copyText).toContain("advertencia");
    expect(copyText).not.toContain("solo structural");
  });

  it("no contiene copy obsoleto o futuro", () => {
    const copyText = Object.values(FAQ_SECTION_COPY).join(" ").toLowerCase();
    expect(copyText).not.toContain("la simulación llegará en una siguiente fase");
    expect(copyText).not.toContain("siguiente fase");
    expect(copyText).not.toContain("solo structural");
  });
});

it("copy patch explains SPS as comparative guidance", () => {
  const copyText = JSON.stringify(FAQ_SECTION_COPY);

  expect(copyText).toContain("orientación comparativa");
  expect(copyText).toContain("no mide poder competitivo real");
});
