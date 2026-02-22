import { describe, expect, test } from "vitest";
import {
  interpretDensity,
  interpretEdgesTotal,
  interpretRolesDominant,
  interpretSps,
} from "../guidance/metric_guidance";

describe("metric guidance helpers", () => {
  test("SPS levels", () => {
    expect(interpretSps(10).level).toBe("low");
    expect(interpretSps(50).level).toBe("mid");
    expect(interpretSps(90).level).toBe("high");
  });

  test("density levels", () => {
    expect(interpretDensity(0.05).level).toBe("low");
    expect(interpretDensity(0.15).level).toBe("mid");
    expect(interpretDensity(0.25).level).toBe("high");
  });

  test("edges levels", () => {
    expect(interpretEdgesTotal(2).level).toBe("low");
    expect(interpretEdgesTotal(10).level).toBe("mid");
    expect(interpretEdgesTotal(20).level).toBe("high");
  });

  test("NA handling", () => {
    expect(interpretSps(undefined).level).toBe("na");
    expect(interpretDensity(null).level).toBe("na");
    expect(interpretEdgesTotal(undefined).level).toBe("na");
  });

  test("roles guidance fallback", () => {
    const res = interpretRolesDominant([]);
    expect(res.meaning).toBe("");
    expect(res.advice).toBe("");
  });
});
