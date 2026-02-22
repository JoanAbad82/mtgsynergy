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
