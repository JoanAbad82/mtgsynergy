import {
  clamp,
  mean,
  normalizeIterations,
  normalizeRobustP,
  normalizeRounding,
  normalizeSeed,
  quantileNearestRank,
  roundTo,
  stdev,
} from "./calculator";
import type {
  McDebug,
  McResultV1,
  McSettingsV1,
  McSettingsV1Normalized,
  McWarning,
} from "./types";
import { eligibleIndices, mulberry32, sampleSwap1 } from "./sampler";

export type McEntryInput = {
  name: string;
  count: number;
  role_primary?: string;
};

export function normalizeMcSettings(
  input?: Partial<McSettingsV1>,
): McSettingsV1Normalized {
  return {
    mode: input?.mode ?? "on",
    kind: input?.kind ?? "swap1_internal",
    iterations: normalizeIterations(input?.iterations ?? 1000),
    seed: normalizeSeed(input?.seed ?? 1),
    exclude_roles: input?.exclude_roles ?? ["LAND"],
    sample_by_count: input?.sample_by_count ?? true,
    robust_p: normalizeRobustP(input?.robust_p ?? 0.1),
    gamma_sigma: input?.gamma_sigma ?? 0.5,
    gamma_downside: input?.gamma_downside ?? 0.5,
    rounding: normalizeRounding(input?.rounding),
  };
}

type RunArgs = {
  entries: McEntryInput[];
  baseSps: number;
  analyzeSps: (entries: McEntryInput[]) => Promise<number>;
  settings?: Partial<McSettingsV1>;
  provenance?: { build_sha?: string; cards_index_count?: number | null };
};

export async function runMonteCarloV1(args: RunArgs): Promise<McResultV1> {
  const settings = normalizeMcSettings(args.settings);
  const requested_n = settings.iterations;
  const warnings: McWarning[] = [];
  const debug: McDebug = {};

  const rolesPresent = new Set(
    args.entries
      .map((e) => e.role_primary)
      .filter((r): r is string => Boolean(r)),
  );
  for (const role of settings.exclude_roles) {
    if (role === "LAND") continue;
    if (!rolesPresent.has(role)) {
      warnings.push({
        code: "UNKNOWN_ROLE_EXCLUDE",
        detail: `role not present: ${role}`,
      });
    }
  }

  const eligibles = eligibleIndices(args.entries, settings);
  if (eligibles.length < 2) {
    const baseRounded = roundTo(args.baseSps, settings.rounding.sps_decimals);
    return {
      version: "mc_v1",
      settings,
      base: { sps: baseRounded },
      dist: {
        requested_n,
        effective_n: 0,
        no_op: requested_n,
        mean: baseRounded,
        stdev: 0,
        min: baseRounded,
        max: baseRounded,
        p10: baseRounded,
        p25: baseRounded,
        p50: baseRounded,
        p75: baseRounded,
        p90: baseRounded,
        q_robust: baseRounded,
        delta_mean: 0,
        delta_stdev: 0,
        delta_p10: 0,
        delta_q_robust: 0,
      },
      metrics: {
        robust_sps: baseRounded,
        fragility: 0,
      },
      warnings: [
        ...warnings,
        {
          code: "DEGENERATE_ELIGIBLE_SET",
          detail: "Need at least two eligible card names.",
        },
      ],
      provenance: args.provenance,
      debug,
    };
  }

  const spsValues: number[] = [];
  const deltaValues: number[] = [];
  let no_op = 0;
  const eps = 1e-9;

  const steps: Array<{ from: string; to: string }> = [];

  for (let i = 1; i <= requested_n; i += 1) {
    const seed_i = (settings.seed + i * 0x9e3779b9) >>> 0;
    const rng = mulberry32(seed_i);
    const sample = sampleSwap1(
      args.entries,
      eligibles,
      rng,
      settings.sample_by_count,
    );
    if (!sample) {
      no_op += 1;
      continue;
    }

    const from = args.entries[sample.fromIndex];
    const to = args.entries[sample.toIndex];

    if (steps.length < 10) {
      steps.push({ from: from.name, to: to.name });
    }

    const nextEntries = args.entries.map((e, idx) => {
      if (idx === sample.fromIndex) {
        return { ...e, count: Math.max(0, e.count - 1) };
      }
      if (idx === sample.toIndex) {
        return { ...e, count: e.count + 1 };
      }
      return { ...e };
    });

    const sps = await args.analyzeSps(nextEntries);
    spsValues.push(sps);
    const delta = (sps - args.baseSps) / Math.max(eps, args.baseSps);
    deltaValues.push(delta);
  }

  if (steps.length > 0) {
    debug.steps_sample = steps;
  }

  const effective_n = spsValues.length;
  if (effective_n === 0) {
    const baseRounded = roundTo(args.baseSps, settings.rounding.sps_decimals);
    return {
      version: "mc_v1",
      settings,
      base: { sps: baseRounded },
      dist: {
        requested_n,
        effective_n: 0,
        no_op,
        mean: baseRounded,
        stdev: 0,
        min: baseRounded,
        max: baseRounded,
        p10: baseRounded,
        p25: baseRounded,
        p50: baseRounded,
        p75: baseRounded,
        p90: baseRounded,
        q_robust: baseRounded,
        delta_mean: 0,
        delta_stdev: 0,
        delta_p10: 0,
        delta_q_robust: 0,
      },
      metrics: {
        robust_sps: baseRounded,
        fragility: 0,
      },
      warnings,
      provenance: args.provenance,
      debug,
    };
  }

  const spsSorted = [...spsValues].sort((a, b) => a - b);
  const deltaSorted = [...deltaValues].sort((a, b) => a - b);

  const m = mean(spsValues);
  const sd = stdev(spsValues, m);

  const dm = mean(deltaValues);
  const dsd = stdev(deltaValues, dm);

  const p10 = quantileNearestRank(spsSorted, 0.1);
  const p25 = quantileNearestRank(spsSorted, 0.25);
  const p50 = quantileNearestRank(spsSorted, 0.5);
  const p75 = quantileNearestRank(spsSorted, 0.75);
  const p90 = quantileNearestRank(spsSorted, 0.9);
  const qRobust = quantileNearestRank(spsSorted, settings.robust_p);

  const deltaP10 = quantileNearestRank(deltaSorted, 0.1);
  const deltaQRobust = quantileNearestRank(deltaSorted, settings.robust_p);

  const sigma = dsd;
  const downside = Math.max(0, -deltaP10);
  const fragRaw =
    100 *
    Math.min(
      1,
      settings.gamma_sigma * sigma + settings.gamma_downside * downside,
    );
  const fragility = clamp(fragRaw, 0, 100);

  const spsRounded = {
    mean: roundTo(m, settings.rounding.sps_decimals),
    stdev: roundTo(sd, settings.rounding.sps_decimals),
    min: roundTo(spsSorted[0], settings.rounding.sps_decimals),
    max: roundTo(spsSorted[spsSorted.length - 1], settings.rounding.sps_decimals),
  };

  const qRounded = {
    p10: roundTo(p10, settings.rounding.quantile_decimals),
    p25: roundTo(p25, settings.rounding.quantile_decimals),
    p50: roundTo(p50, settings.rounding.quantile_decimals),
    p75: roundTo(p75, settings.rounding.quantile_decimals),
    p90: roundTo(p90, settings.rounding.quantile_decimals),
    q_robust: roundTo(qRobust, settings.rounding.quantile_decimals),
  };

  const deltaRounded = {
    mean: roundTo(dm, settings.rounding.quantile_decimals),
    stdev: roundTo(dsd, settings.rounding.quantile_decimals),
    p10: roundTo(deltaP10, settings.rounding.quantile_decimals),
    q_robust: roundTo(deltaQRobust, settings.rounding.quantile_decimals),
  };

  return {
    version: "mc_v1",
    settings,
    base: { sps: roundTo(args.baseSps, settings.rounding.sps_decimals) },
    dist: {
      requested_n,
      effective_n,
      no_op,
      mean: spsRounded.mean,
      stdev: spsRounded.stdev,
      min: spsRounded.min,
      max: spsRounded.max,
      p10: qRounded.p10,
      p25: qRounded.p25,
      p50: qRounded.p50,
      p75: qRounded.p75,
      p90: qRounded.p90,
      q_robust: qRounded.q_robust,
      delta_mean: deltaRounded.mean,
      delta_stdev: deltaRounded.stdev,
      delta_p10: deltaRounded.p10,
      delta_q_robust: deltaRounded.q_robust,
    },
    metrics: {
      robust_sps: qRounded.q_robust,
      fragility: roundTo(fragility, settings.rounding.fragility_decimals),
    },
    warnings: warnings.length > 0 ? warnings : undefined,
    provenance: args.provenance,
    debug,
  };
}
