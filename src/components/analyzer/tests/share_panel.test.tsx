import { describe, expect, it } from "vitest";
import { SHARE_PANEL_COPY } from "../panels/SharePanel";

describe("SharePanel copy", () => {
  it("usa copy friendly para compartir", () => {
    expect(SHARE_PANEL_COPY.title).toBe("Comparte este análisis");
    expect(SHARE_PANEL_COPY.copyLinkButton).toBe("Copiar enlace");
    expect(SHARE_PANEL_COPY.emptyState.toLowerCase()).toContain("enlace");
  });

  it("evita copy legacy en inglés o mixto", () => {
    const copyText = Object.values(SHARE_PANEL_COPY).join(" ");
    expect(copyText).not.toContain("Share URL");
    expect(copyText).not.toContain("Copiar link");
    expect(copyText.toLowerCase()).not.toContain(" link");
  });
});
