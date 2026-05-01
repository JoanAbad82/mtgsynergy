export type V117BaselineMonteCarlo = {
  samplesEffective: number;
  samplesRequested: number;
  simulatedResult: number;
  baselineReference: number;
  estimatedVariation: number;
};

export type V117BaselineMetrics = {
  version: 117;
  sourceCommit: "b6a63a7";
  phase: "analyzer-ui-ux-pdf-stability-closure";
  status: "accepted";
  deckFixtureStatus: "missing_v117_deck_export";
  cardsIndexCount: number;
  sps: number;
  synergies: number;
  density: number;
  relations: number;
  monteCarlo: V117BaselineMonteCarlo;
  recommendation: string;
  interpretation: string;
};

export type V117MetricSnapshot = Partial<
  Omit<V117BaselineMetrics, "monteCarlo"> & {
    monteCarlo: Partial<V117BaselineMonteCarlo>;
  }
>;

export type V117MetricMismatch = {
  field: string;
  expected: number | string;
  actual: number | string;
  tolerance?: number;
};

const TOLERANCE_SPS = 0.05;
const TOLERANCE_DENSITY = 0.001;
const TOLERANCE_BASELINE_REFERENCE = 0.05;

export const V117_ANALYZER_BASELINE_METRICS: Readonly<V117BaselineMetrics> =
  Object.freeze({
    version: 117,
    sourceCommit: "b6a63a7",
    phase: "analyzer-ui-ux-pdf-stability-closure",
    status: "accepted",
    deckFixtureStatus: "missing_v117_deck_export",
    cardsIndexCount: 36063,
    sps: 107.6,
    synergies: 19,
    density: 0.339,
    relations: 19,
    monteCarlo: Object.freeze({
      samplesEffective: 1000,
      samplesRequested: 1000,
      simulatedResult: 0,
      baselineReference: 107.6,
      estimatedVariation: 50,
    }),
    recommendation: "Añade redundancia y cartas puente entre roles.",
    interpretation: "El plan parece depender de pocas piezas clave.",
  });

function compareExact(
  mismatches: V117MetricMismatch[],
  field: string,
  expected: number | string,
  actual: number | string,
): void {
  if (actual !== expected) {
    mismatches.push({ field, expected, actual });
  }
}

function compareNumber(
  mismatches: V117MetricMismatch[],
  field: string,
  expected: number,
  actual: number,
  tolerance = 0,
): void {
  if (Math.abs(actual - expected) > tolerance) {
    mismatches.push({ field, expected, actual, tolerance });
  }
}

export function compareV117MetricSnapshot(
  snapshot: V117MetricSnapshot,
): V117MetricMismatch[] {
  const expected = V117_ANALYZER_BASELINE_METRICS;
  const mismatches: V117MetricMismatch[] = [];

  if (snapshot.version !== undefined) {
    compareExact(mismatches, "version", expected.version, snapshot.version);
  }
  if (snapshot.sourceCommit !== undefined) {
    compareExact(
      mismatches,
      "sourceCommit",
      expected.sourceCommit,
      snapshot.sourceCommit,
    );
  }
  if (snapshot.phase !== undefined) {
    compareExact(mismatches, "phase", expected.phase, snapshot.phase);
  }
  if (snapshot.status !== undefined) {
    compareExact(mismatches, "status", expected.status, snapshot.status);
  }
  if (snapshot.deckFixtureStatus !== undefined) {
    compareExact(
      mismatches,
      "deckFixtureStatus",
      expected.deckFixtureStatus,
      snapshot.deckFixtureStatus,
    );
  }
  if (snapshot.cardsIndexCount !== undefined) {
    compareNumber(
      mismatches,
      "cardsIndexCount",
      expected.cardsIndexCount,
      snapshot.cardsIndexCount,
    );
  }
  if (snapshot.sps !== undefined) {
    compareNumber(mismatches, "sps", expected.sps, snapshot.sps, TOLERANCE_SPS);
  }
  if (snapshot.synergies !== undefined) {
    compareNumber(
      mismatches,
      "synergies",
      expected.synergies,
      snapshot.synergies,
    );
  }
  if (snapshot.density !== undefined) {
    compareNumber(
      mismatches,
      "density",
      expected.density,
      snapshot.density,
      TOLERANCE_DENSITY,
    );
  }
  if (snapshot.relations !== undefined) {
    compareNumber(
      mismatches,
      "relations",
      expected.relations,
      snapshot.relations,
    );
  }
  if (snapshot.recommendation !== undefined) {
    compareExact(
      mismatches,
      "recommendation",
      expected.recommendation,
      snapshot.recommendation,
    );
  }
  if (snapshot.interpretation !== undefined) {
    compareExact(
      mismatches,
      "interpretation",
      expected.interpretation,
      snapshot.interpretation,
    );
  }

  if (snapshot.monteCarlo !== undefined) {
    const mc = snapshot.monteCarlo;
    if (mc.samplesEffective !== undefined) {
      compareNumber(
        mismatches,
        "monteCarlo.samplesEffective",
        expected.monteCarlo.samplesEffective,
        mc.samplesEffective,
      );
    }
    if (mc.samplesRequested !== undefined) {
      compareNumber(
        mismatches,
        "monteCarlo.samplesRequested",
        expected.monteCarlo.samplesRequested,
        mc.samplesRequested,
      );
    }
    if (mc.simulatedResult !== undefined) {
      compareNumber(
        mismatches,
        "monteCarlo.simulatedResult",
        expected.monteCarlo.simulatedResult,
        mc.simulatedResult,
      );
    }
    if (mc.baselineReference !== undefined) {
      compareNumber(
        mismatches,
        "monteCarlo.baselineReference",
        expected.monteCarlo.baselineReference,
        mc.baselineReference,
        TOLERANCE_BASELINE_REFERENCE,
      );
    }
    if (mc.estimatedVariation !== undefined) {
      compareNumber(
        mismatches,
        "monteCarlo.estimatedVariation",
        expected.monteCarlo.estimatedVariation,
        mc.estimatedVariation,
      );
    }
  }

  return mismatches;
}
