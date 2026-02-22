import { describe, expect, test } from "vitest";
import {
  interpretEffectiveN,
  interpretFragility,
  interpretMcStatus,
  interpretRobustVsBase,
} from "../guidance/metric_guidance";

describe("metric guidance MC", () => {
  test("fragility levels", () => {
    expect(interpretFragility(10).level).toBe("low");
    expect(interpretFragility(25).level).toBe("mid");
    expect(interpretFragility(50).level).toBe("high");
  });

  test("effective N levels", () => {
    expect(interpretEffectiveN(1000, 1000).level).toBe("high");
    expect(interpretEffectiveN(700, 1000).level).toBe("mid");
    expect(interpretEffectiveN(300, 1000).level).toBe("low");
  });

  test("robust vs base levels", () => {
    expect(interpretRobustVsBase(100, 90).level).toBe("high");
    expect(interpretRobustVsBase(100, 60).level).toBe("mid");
    expect(interpretRobustVsBase(100, 40).level).toBe("low");
    const collapsed = interpretRobustVsBase(100, 0);
    expect(collapsed.level).toBe("low");
    expect(collapsed.meaning.toLowerCase()).toContain("colapsar");
  });

  test("mc status levels", () => {
    expect(interpretMcStatus("done", null).level).toBe("high");
    expect(interpretMcStatus("error").level).toBe("low");
  });
});
