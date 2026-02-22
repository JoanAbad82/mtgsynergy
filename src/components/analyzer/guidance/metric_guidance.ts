type Level = "low" | "mid" | "high" | "na";

export type MetricGuidance = {
  level: Level;
  title: string;
  meaning: string;
  advice: string;
};

export type RolesGuidance = {
  title: string;
  meaning: string;
  advice: string;
};

export type McStatusGuidance = MetricGuidance;

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function interpretSps(
  sps: number | null | undefined,
): MetricGuidance {
  if (!isNumber(sps)) {
    return { level: "na", title: "—", meaning: "", advice: "" };
  }
  if (sps < 30) {
    return {
      level: "low",
      title: "Bajo",
      meaning: "En general indica que el plan estructural aún está disperso.",
      advice: "Refuerza conexiones ENGINE→PAYOFF y evita piezas sueltas.",
    };
  }
  if (sps <= 70) {
    return {
      level: "mid",
      title: "Medio",
      meaning: "Suele indicar una estructura estable con margen de ajuste.",
      advice: "Sube la densidad de pares soporte→amenaza.",
    };
  }
  return {
    level: "high",
    title: "Alto",
    meaning: "En general indica que el mazo tiene un plan estructural coherente.",
    advice: "Recorta cartas marginales que no suman al plan.",
  };
}

export function interpretDensity(
  d: number | null | undefined,
): MetricGuidance {
  if (!isNumber(d)) {
    return { level: "na", title: "—", meaning: "", advice: "" };
  }
  if (d < 0.1) {
    return {
      level: "low",
      title: "Baja",
      meaning: "Suele indicar que hay muchas cartas sin conectar.",
      advice: "Añade cartas puente o recorta standalone.",
    };
  }
  if (d <= 0.2) {
    return {
      level: "mid",
      title: "Media",
      meaning: "A menudo implica sinergias presentes pero no densas.",
      advice: "Refuerza las líneas principales del plan.",
    };
  }
  return {
    level: "high",
    title: "Alta",
    meaning: "En general refleja un entramado de sinergias consistente.",
    advice: "Cuida el equilibrio entre roles para no saturar.",
  };
}

export function interpretEdgesTotal(
  n: number | null | undefined,
): MetricGuidance {
  if (!isNumber(n)) {
    return { level: "na", title: "—", meaning: "", advice: "" };
  }
  if (n < 6) {
    return {
      level: "low",
      title: "Bajo",
      meaning: "A menudo implica pocas sinergias explícitas.",
      advice: "Añade parejas soporte→amenaza o soporte→motor.",
    };
  }
  if (n <= 14) {
    return {
      level: "mid",
      title: "Medio",
      meaning: "Suele indicar algunas sinergias claras y otras débiles.",
      advice: "Consolida las combinaciones que ya funcionan.",
    };
  }
  return {
    level: "high",
    title: "Alto",
    meaning: "En general indica un mazo con muchas relaciones activas.",
    advice: "Elimina redundancias que no aporten al plan.",
  };
}

export function interpretRolesDominant(
  roles: string[] | null | undefined,
): RolesGuidance {
  if (!roles || roles.length === 0) {
    return { title: "—", meaning: "", advice: "" };
  }
  return {
    title: roles.join(", "),
    meaning: "Los roles dominantes sugieren dónde está el peso del plan.",
    advice:
      "Si falta PAYOFF/ENGINE, añade piezas que conviertan recursos en victoria.",
  };
}

export function interpretMcStatus(
  status: "idle" | "running" | "done" | "error",
  omittedReason?: string | null,
): McStatusGuidance {
  if (status === "running") {
    return {
      level: "mid",
      title: "Medio",
      meaning: "Calculando estabilidad…",
      advice: "Espera; puede tardar.",
    };
  }
  if (status === "idle") {
    return {
      level: "mid",
      title: "Medio",
      meaning: "Listo para ejecutarse…",
      advice: "Pulsa Analizar para correr MC.",
    };
  }
  if (status === "error") {
    return {
      level: "low",
      title: "Bajo",
      meaning: "MC falló…",
      advice: "Baja iteraciones o recarga.",
    };
  }
  if (omittedReason) {
    return {
      level: "low",
      title: "Bajo",
      meaning: "No aplica con este mazo…",
      advice: "Añade redundancia o más sinergias; prueba otro mazo.",
    };
  }
  return {
    level: "high",
    title: "Alto",
    meaning: "MC completado; ya estimamos estabilidad bajo perturbaciones.",
    advice:
      "Si fragilidad es alta, añade redundancia; si robustez cae mucho, añade cartas puente.",
  };
}

export function interpretEffectiveN(
  effectiveN: number | null | undefined,
  requestedN: number | null | undefined,
): MetricGuidance {
  if (!isNumber(effectiveN) || !isNumber(requestedN) || requestedN <= 0) {
    return { level: "na", title: "—", meaning: "", advice: "" };
  }
  const ratio = effectiveN / requestedN;
  if (ratio >= 0.9) {
    return {
      level: "high",
      title: "Alto",
      meaning: "Estimación más fiable.",
      advice: "",
    };
  }
  if (ratio >= 0.6) {
    return {
      level: "mid",
      title: "Medio",
      meaning: "Fiabilidad media.",
      advice: "Considera subir iteraciones.",
    };
  }
  return {
    level: "low",
    title: "Bajo",
    meaning: "Pocas muestras válidas.",
    advice:
      "Baja iteraciones o usa un mazo con más sinergias; con pocas muestras la estimación es inestable.",
  };
}

export function interpretRobustVsBase(
  baseSps: number | null | undefined,
  robustSps: number | null | undefined,
): MetricGuidance {
  if (!isNumber(baseSps) || !isNumber(robustSps) || baseSps <= 0) {
    return { level: "na", title: "—", meaning: "", advice: "" };
  }
  if (robustSps === 0) {
    return {
      level: "low",
      title: "Bajo",
      meaning:
        "En algunos mazos la robustez puede colapsar a 0; suele indicar dependencia extrema o que la perturbación anula las sinergias.",
      advice:
        "Duplica habilitadores (efectos similares), añade un segundo motor, y reduce cartas únicas imprescindibles.",
    };
  }
  const ratio = robustSps / baseSps;
  if (ratio >= 0.8) {
    return {
      level: "high",
      title: "Alto",
      meaning: "Estabilidad alta: el plan aguanta perturbaciones.",
      advice: "",
    };
  }
  if (ratio >= 0.5) {
    return {
      level: "mid",
      title: "Medio",
      meaning: "Estabilidad media: algunas piezas son críticas.",
      advice: "Añade redundancia y alternativas.",
    };
  }
  return {
    level: "low",
    title: "Bajo",
    meaning: "Dependencia alta de pocas piezas.",
    advice: "Añade redundancia y reduce cuellos de botella.",
  };
}

export function interpretFragility(
  f: number | null | undefined,
): MetricGuidance {
  if (!isNumber(f)) {
    return { level: "na", title: "—", meaning: "", advice: "" };
  }
  if (f < 15) {
    return {
      level: "low",
      title: "Baja",
      meaning: "Caída pequeña bajo perturbaciones.",
      advice: "",
    };
  }
  if (f <= 35) {
    return {
      level: "mid",
      title: "Media",
      meaning: "Caída moderada.",
      advice: "Sube redundancia y reduce puntos únicos de fallo.",
    };
  }
  return {
    level: "high",
    title: "Alta",
    meaning: "Caída grande: dependes de pocas cartas clave.",
    advice: "Suele indicar dependencia; añade redundancia y puentes.",
  };
}

export type McLabelKey =
  | "samples"
  | "no_op"
  | "base_sps"
  | "robust_sps"
  | "fragility"
  | "percentiles"
  | "mean_stdev"
  | "iqr"
  | "min_max"
  | "delta_p50"
  | "delta_p10"
  | "delta_p90";

export function mapMcLabel(key: McLabelKey): string {
  const labels: Record<McLabelKey, string> = {
    samples: "muestras válidas / solicitadas",
    no_op: "sin cambios (no_op)",
    base_sps: "SPS base",
    robust_sps: "SPS robusto",
    fragility: "Fragilidad",
    percentiles: "Percentiles",
    mean_stdev: "media ± desviación",
    iqr: "rango intercuartílico (IQR)",
    min_max: "mín–máx",
    delta_p50: "caída típica (p50)",
    delta_p10: "caída típica (p10)",
    delta_p90: "caída típica (p90)",
  };
  return labels[key];
}
