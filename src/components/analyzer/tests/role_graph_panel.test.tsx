import { describe, expect, it } from "vitest";
import {
  ROLE_GRAPH_PANEL_COPY,
  buildRoleGraphRows,
  formatRoleLabelForUi,
} from "../panels/RoleGraphPanel";

describe("RoleGraphPanel copy", () => {
  it("usa copy friendly en español", () => {
    expect(ROLE_GRAPH_PANEL_COPY.title).toBe("Roles y centralidad");
    expect(ROLE_GRAPH_PANEL_COPY.intro).toBe("Muestra qué funciones del mazo tienen más presencia.");
    expect(ROLE_GRAPH_PANEL_COPY.roleHeader).toBe("Rol");
    expect(ROLE_GRAPH_PANEL_COPY.countHeader).toBe("Cartas");
    expect(ROLE_GRAPH_PANEL_COPY.centralityHeader).toBe("Peso en el plan");
  });

  it("no expone headers legacy exactos", () => {
    const copyText = Object.values(ROLE_GRAPH_PANEL_COPY).join(" ");
    expect(copyText).not.toContain("Count");
    expect(copyText).not.toContain("Centrality");
  });
});

describe("RoleGraphPanel role labels", () => {
  it("traduce roles conocidos y mantiene fallback estable para desconocidos", () => {
    expect(formatRoleLabelForUi("DRAW")).toBe("Robo de cartas");
    expect(formatRoleLabelForUi("ENGINE")).toBe("Motor");
    expect(formatRoleLabelForUi("LAND")).toBe("Tierras");
    expect(formatRoleLabelForUi("PAYOFF")).toBe("Recompensas");
    expect(formatRoleLabelForUi("PROTECTION")).toBe("Protección");
    expect(formatRoleLabelForUi("RAMP")).toBe("Aceleración");
    expect(formatRoleLabelForUi("REMOVAL")).toBe("Interacción / removal");
    expect(formatRoleLabelForUi("UTILITY")).toBe("Utilidad");
    expect(formatRoleLabelForUi("UNKNOWN_ROLE")).toBe("UNKNOWN_ROLE");
  });
});

describe("RoleGraphPanel rows", () => {
  it("preserva valores numéricos, orden determinista y no muta el input", () => {
    const summary = {
      role_counts: {
        UTILITY: 2,
        LAND: 24,
        ENGINE: 8,
        DRAW: 10,
      },
      centrality_score: {
        UTILITY: 0.25,
        LAND: 0.4,
        ENGINE: 0.75,
        DRAW: 0.63,
      },
    } as any;
    const snapshot = JSON.parse(JSON.stringify(summary));

    const first = buildRoleGraphRows(summary);
    const second = buildRoleGraphRows(summary);

    expect(first).toEqual(second);
    expect(first).toEqual([
      { role: "DRAW", roleLabel: "Robo de cartas", count: 10, centrality: 0.63 },
      { role: "ENGINE", roleLabel: "Motor", count: 8, centrality: 0.75 },
      { role: "LAND", roleLabel: "Tierras", count: 24, centrality: 0.4 },
      { role: "UTILITY", roleLabel: "Utilidad", count: 2, centrality: 0.25 },
    ]);
    expect(summary).toEqual(snapshot);
  });
});
