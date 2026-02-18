import type { StructuralSummary } from "../domain/types";

export const SPS_ALPHA = 0.15;

export function computeStructuralPowerScore(
  summary: StructuralSummary,
  edges: Array<{ score?: number }>,
): {
  sps: number;
  breakdown: {
    sumScore: number;
    B: number;
    density: number;
    F_dens: number;
    H_hat: number;
    F_roles: number;
    u: number;
    F_util: number;
  };
} {
  const sumScore = edges.reduce((s, e) => s + (e.score ?? 0), 0);
  const B = 10 * Math.log(1 + sumScore);
  const density = summary.density ?? 0;
  const F_dens = 1 + Math.sqrt(Math.max(0, density));

  const roleCounts = summary.role_counts;
  const nonLandRoles = Object.keys(roleCounts).filter((r) => r !== "LAND");
  const totalNonLand = nonLandRoles.reduce((s, r) => s + (roleCounts as any)[r], 0);
  const activeNonLandRoles = nonLandRoles.filter((r) => (roleCounts as any)[r] > 0);
  const R = activeNonLandRoles.length;

  let H_hat = 0;
  if (R > 1 && totalNonLand > 0) {
    let H = 0;
    for (const r of activeNonLandRoles) {
      const p = (roleCounts as any)[r] / totalNonLand;
      if (p > 0) H += -p * Math.log2(p);
    }
    const H_max = Math.log2(R);
    H_hat = H_max > 0 ? H / H_max : 0;
  }
  const F_roles = 1 + SPS_ALPHA * H_hat;

  const utilityCount = (roleCounts as any)["UTILITY"] ?? 0;
  const u = totalNonLand > 0 ? utilityCount / totalNonLand : 0;
  const F_util_raw = u <= 0.3 ? 1 : 1 - 0.25 * (u - 0.3) / 0.7;
  const F_util = Math.max(0, F_util_raw);

  const sps = B * F_dens * F_roles * F_util;

  return {
    sps,
    breakdown: {
      sumScore,
      B,
      density,
      F_dens,
      H_hat,
      F_roles,
      u,
      F_util,
    },
  };
}
