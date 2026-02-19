export type McMode = "off" | "on";
export type McKind = "swap1_internal";

export type McRounding = {
  sps_decimals: number;
  fragility_decimals: number;
  quantile_decimals: number;
};

export type McSettingsV1 = {
  mode: McMode;
  kind: McKind;
  iterations: number;
  seed: number;
  exclude_roles: string[];
  sample_by_count: boolean;
  robust_p: number;
  gamma_sigma: number;
  gamma_downside: number;
  rounding: McRounding;
};

export type McSettingsV1Normalized = McSettingsV1;

export type McWarning = {
  code: "UNKNOWN_ROLE_EXCLUDE" | "DEGENERATE_ELIGIBLE_SET";
  detail: string;
};

export type McProvenance = {
  build_sha?: string;
  cards_index_count?: number | null;
};

export type McDebug = {
  steps_sample?: Array<{ from: string; to: string }>;
};

export type McResultV1 = {
  version: "mc_v1";
  settings: McSettingsV1Normalized;
  base: { sps: number };
  dist: {
    requested_n: number;
    effective_n: number;
    no_op: number;
    mean: number;
    stdev: number;
    min: number;
    max: number;
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    q_robust: number;
    delta_mean: number;
    delta_stdev: number;
    delta_p10: number;
    delta_q_robust: number;
  };
  dist_ext: {
    percentiles: {
      p05: number;
      p10: number;
      p25: number;
      p50: number;
      p75: number;
      p90: number;
      p95: number;
    };
    mean: number;
    stdev: number;
    iqr: number;
    min: number;
    max: number;
    deltas_abs_vs_base: {
      p50: number;
      p10: number;
      p90: number;
      p05?: number;
      p95?: number;
    };
    cv?: number;
  };
  metrics: {
    robust_sps: number;
    fragility: number;
  };
  warnings?: McWarning[];
  provenance?: McProvenance;
  debug?: McDebug;
};
