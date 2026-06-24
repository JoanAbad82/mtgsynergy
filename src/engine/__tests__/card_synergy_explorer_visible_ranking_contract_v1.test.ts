import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

test("public card synergy explorer exposes deterministic score and visible reasons", () => {
  const source = readFileSync(
    new URL("../../pages/es/explorador-de-sinergias-mtg.astro", import.meta.url),
    "utf8",
  );

  expect(source).toContain("scoreVisibleMatch");
  expect(source).toContain("buildVisibleReasons");
  expect(source).toContain("Sinergia ${candidate.score}/100");
  expect(source).toContain("Cartas ordenadas por fuerza de conexión semántica explicable.");
  expect(source).toContain("Razones visibles de conexión");
  expect(source).toContain("sin usar SPS ni centralidad");
  expect(source).toContain("candidateRows.sort(compareCandidateRows)");
});

test("public card synergy explorer preserves bounded output and seed exclusion", () => {
  const source = readFileSync(
    new URL("../../pages/es/explorador-de-sinergias-mtg.astro", import.meta.url),
    "utf8",
  );

  expect(source).toContain("const CANDIDATE_LIMIT = 8");
  expect(source).toContain("excludedSeeds.has(name)");
  expect(source).toContain(".slice(0, CANDIDATE_LIMIT)");
});


test("visible candidate order is explicitly driven by displayed score", () => {
  const source = readFileSync(
    new URL("../../pages/es/explorador-de-sinergias-mtg.astro", import.meta.url),
    "utf8",
  );

  expect(source).toContain("right.score - left.score");
  expect(source).toContain("right.reasons.length - left.reasons.length");
  expect(source).toContain("left.name.localeCompare(right.name)");
  expect(source).toContain(".slice(0, CANDIDATE_LIMIT)");
  expect(source).not.toMatch(/candidatos?\s+no\s+rankeados?/i);
  expect(source).not.toMatch(/todav[ií]a\s+no\s+presenta\s+una\s+lista\s+ordenada\s+por\s+sinergia/i);
  expect(source).not.toMatch(/sin\s+ranking/i);
  expect(source).not.toMatch(/sin\s+score/i);
  expect(source).not.toMatch(/sin\s+explicaci[oó]n\s+causal/i);
});


test("public copy contains no stale non-ranking claims", () => {
  const source = readFileSync(
    new URL("../../pages/es/explorador-de-sinergias-mtg.astro", import.meta.url),
    "utf8",
  );

  expect(source).not.toMatch(/candidatos?\s+no\s+rankeados?/i);
  expect(source).not.toMatch(/salida\s+no\s+rankeada/i);
  expect(source).not.toMatch(/no\s+calcula\s+ranking/i);
  expect(source).not.toMatch(/no\s+calcula\s+score/i);
  expect(source).not.toMatch(/no\s+genera\s+explicaci[oó]n\s+causal/i);
  expect(source).not.toMatch(/sin\s+introducir\s+ranking/i);
  expect(source).not.toMatch(/sin\s+ranking/i);
  expect(source).not.toMatch(/sin\s+score/i);
  expect(source).not.toMatch(/sin\s+explicaci[oó]n\s+causal/i);
  expect(source).not.toMatch(/score\s+ni\s+explicaci[oó]n\s+causal/i);
});
