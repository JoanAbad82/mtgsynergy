import type { McSettingsV1Normalized } from "./types";

export type McEntry = {
  name: string;
  count: number;
  role_primary?: string;
};

export type SampleResult = {
  fromIndex: number;
  toIndex: number;
};

export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function eligibleIndices(
  entries: McEntry[],
  settings: McSettingsV1Normalized,
): number[] {
  const excludes = new Set(settings.exclude_roles ?? []);
  const indices: number[] = [];
  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    if (entry.count < 1) continue;
    const role = entry.role_primary;
    if (role && excludes.has(role)) continue;
    indices.push(i);
  }
  return indices;
}

export function sampleSwap1(
  entries: McEntry[],
  eligibles: number[],
  rng: () => number,
  sampleByCount: boolean,
): SampleResult | null {
  if (eligibles.length < 2) return null;

  const chooseIndex = (candidates: number[]): number => {
    if (!sampleByCount) {
      const idx = Math.floor(rng() * candidates.length);
      return candidates[Math.max(0, Math.min(idx, candidates.length - 1))];
    }
    const total = candidates.reduce(
      (sum, i) => sum + Math.max(0, entries[i].count),
      0,
    );
    if (total <= 0) {
      const idx = Math.floor(rng() * candidates.length);
      return candidates[Math.max(0, Math.min(idx, candidates.length - 1))];
    }
    let acc = 0;
    const target = rng() * total;
    for (const i of candidates) {
      acc += Math.max(0, entries[i].count);
      if (acc >= target) return i;
    }
    return candidates[candidates.length - 1];
  };

  const fromIndex = chooseIndex(eligibles);
  const toCandidates = eligibles.filter((i) => i !== fromIndex);
  if (toCandidates.length === 0) return null;
  const toIndex = chooseIndex(toCandidates);

  if (fromIndex === toIndex) return null;
  return { fromIndex, toIndex };
}
