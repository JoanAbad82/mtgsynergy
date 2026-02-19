import type { McSettingsV1Normalized } from "./types";

export function roundTo(value: number, decimals: number): number {
  const d = Math.max(0, Math.min(6, Math.trunc(decimals)));
  const p = 10 ** d;
  return Math.round(value * p) / p;
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

export function stdev(values: number[], m: number): number {
  if (values.length < 2) return 0;
  const variance =
    values.reduce((s, v) => s + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

// Population stdev (divide by n).
export function stdevPopulation(values: number[], m: number): number {
  if (values.length === 0) return 0;
  const variance = values.reduce((s, v) => s + (v - m) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function quantileNearestRank(
  sorted: number[],
  p: number,
): number {
  if (sorted.length === 0) return 0;
  // Nearest-rank by index: idx = floor(p * (n - 1)).
  const idx = Math.floor(p * (sorted.length - 1));
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function normalizeIterations(n: number): number {
  if (!Number.isFinite(n)) return 100;
  const rounded = Math.trunc(n);
  return clamp(rounded, 100, 10000);
}

export function normalizeRobustP(p: number): number {
  if (!Number.isFinite(p)) return 0.1;
  return clamp(p, 0.01, 0.5);
}

export function normalizeSeed(seed: number): number {
  if (!Number.isFinite(seed)) return 1;
  return (seed >>> 0);
}

export function normalizeRounding(
  rounding: McSettingsV1Normalized["rounding"] | undefined,
): McSettingsV1Normalized["rounding"] {
  return {
    sps_decimals: rounding?.sps_decimals ?? 1,
    fragility_decimals: rounding?.fragility_decimals ?? 0,
    quantile_decimals: rounding?.quantile_decimals ?? 1,
  };
}
