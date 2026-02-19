import { describe, expect, test } from "vitest";
import { normalizeMcSettings, runMonteCarloV1 } from "../montecarlo";

function hashName(name: string): number {
  return name
    .split("")
    .reduce((s, c) => s + c.charCodeAt(0), 0);
}

async function analyzeSps(entries: Array<{ name: string; count: number }>) {
  return entries.reduce((s, e) => s + e.count * hashName(e.name), 0);
}

describe("MC-SSL v1", () => {
  test("determinism with fixed seed", async () => {
    const entries = [
      { name: "Alpha", count: 4, role_primary: "ENGINE" },
      { name: "Beta", count: 4, role_primary: "PAYOFF" },
      { name: "Gamma", count: 4, role_primary: "REMOVAL" },
      { name: "Forest", count: 20, role_primary: "LAND" },
    ];
    const baseSps = await analyzeSps(entries);
    const settings = normalizeMcSettings({ iterations: 200, seed: 123 });

    const res1 = await runMonteCarloV1({
      entries,
      baseSps,
      analyzeSps,
      settings,
    });
    const res2 = await runMonteCarloV1({
      entries,
      baseSps,
      analyzeSps,
      settings,
    });

    expect(res1.dist.mean).toBe(res2.dist.mean);
    expect(res1.dist.q_robust).toBe(res2.dist.q_robust);
    expect(res1.metrics.fragility).toBe(res2.metrics.fragility);
  });

  test("exclude LAND and record debug steps", async () => {
    const entries = [
      { name: "Alpha", count: 4, role_primary: "ENGINE" },
      { name: "Beta", count: 4, role_primary: "PAYOFF" },
      { name: "Forest", count: 20, role_primary: "LAND" },
    ];
    const baseSps = await analyzeSps(entries);
    const settings = normalizeMcSettings({ iterations: 150, seed: 7 });

    const res = await runMonteCarloV1({
      entries,
      baseSps,
      analyzeSps,
      settings,
    });

    const steps = res.debug?.steps_sample ?? [];
    expect(steps.length).toBeGreaterThan(0);
    for (const step of steps) {
      expect(step.from).not.toBe("Forest");
      expect(step.to).not.toBe("Forest");
    }
  });

  test("degenerate eligible set returns base and warning", async () => {
    const entries = [
      { name: "OnlyOne", count: 4, role_primary: "ENGINE" },
      { name: "Forest", count: 20, role_primary: "LAND" },
    ];
    const baseSps = await analyzeSps(entries);
    const settings = normalizeMcSettings({ iterations: 120, seed: 42 });

    const res = await runMonteCarloV1({
      entries,
      baseSps,
      analyzeSps,
      settings,
    });

    expect(res.dist.effective_n).toBe(0);
    expect(res.dist.mean).toBe(res.base.sps);
    expect(res.metrics.fragility).toBe(0);
    expect(res.warnings?.some((w) => w.code === "DEGENERATE_ELIGIBLE_SET")).toBe(
      true,
    );
  });
});
