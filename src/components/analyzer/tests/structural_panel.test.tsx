import { describe, expect, it } from "vitest";
import { STRUCTURAL_PANEL_COPY, buildStructuralSummaryLines } from "../panels/StructuralPanel";

describe("StructuralPanel copy", () => {
  it("usa copy friendly en español para el panel estructural", () => {
    expect(STRUCTURAL_PANEL_COPY.title).toBe("Estructura interna del mazo");
    expect(STRUCTURAL_PANEL_COPY.intro).toContain("Lectura rápida de cómo se conectan los roles del mazo");
    expect(STRUCTURAL_PANEL_COPY.nodesActiveLabel).toBe("Nodos activos");
    expect(STRUCTURAL_PANEL_COPY.relationsLabel).toBe("Relaciones");
    expect(STRUCTURAL_PANEL_COPY.densityLabel).toBe("Densidad");
    expect(STRUCTURAL_PANEL_COPY.cyclesDetectedLabel).toBe("Ciclos detectados");
    expect(STRUCTURAL_PANEL_COPY.connectedComponentsLabel).toBe("Componentes conectados");
    expect(STRUCTURAL_PANEL_COPY.sourceRolesLabel).toBe("Roles origen");
    expect(STRUCTURAL_PANEL_COPY.destinationRolesLabel).toBe("Roles destino");
  });

  it("no expone labels legacy en inglés", () => {
    const copyText = Object.values(STRUCTURAL_PANEL_COPY).join(" ");
    expect(copyText).not.toContain("Cycles");
    expect(copyText).not.toContain("Components (weak)");
    expect(copyText).not.toContain("Sources");
    expect(copyText).not.toContain("Sinks");
  });
});

describe("StructuralPanel summary formatter", () => {
  it("preserva valores de summary y formatea densidad a 3 decimales", () => {
    const summary = {
      nodes_active: 5,
      nodes_total: 8,
      edges_total: 12,
      density: 0.37542,
      cycles_present: true,
      components_weak: { count: 3 },
      sources: ["RAMP", "DRAW"],
      sinks: ["PAYOFF", "UTILITY"],
    } as any;

    const lines = buildStructuralSummaryLines(summary);
    expect(lines.activity).toBe("Nodos activos: 5 / 8 · Relaciones: 12 · Densidad: 0.375");
    expect(lines.topology).toBe("Ciclos detectados: sí · Componentes conectados: 3");
    expect(lines.roleFlow).toBe(
      "Roles origen: Aceleración, Robo de cartas · Roles destino: Recompensas, Utilidad",
    );
  });

  it("usa fallback '—' cuando no hay roles origen/destino y es determinista", () => {
    const summary = {
      nodes_active: 0,
      nodes_total: 8,
      edges_total: 0,
      density: 0,
      cycles_present: false,
      components_weak: { count: 8 },
      sources: [],
      sinks: [],
    } as any;
    const snapshot = JSON.parse(JSON.stringify(summary));

    const first = buildStructuralSummaryLines(summary);
    const second = buildStructuralSummaryLines(summary);

    expect(first).toEqual(second);
    expect(first.roleFlow).toBe("Roles origen: — · Roles destino: —");
    expect(summary).toEqual(snapshot);
  });
});
