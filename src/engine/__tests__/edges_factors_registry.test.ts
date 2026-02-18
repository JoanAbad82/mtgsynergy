import { describe, expect, test } from "vitest";
import { KIND_FACTOR_V1, ROLE_FACTOR_V1 } from "../edges/factors";

describe("edge factors registry v1", () => {
  test("known keys exist", () => {
    expect(KIND_FACTOR_V1.burn_supports_threat).toBe(1.2);
    expect(KIND_FACTOR_V1.spells_support_prowess).toBe(1.1);
    expect(KIND_FACTOR_V1.anthem_supports_tokens).toBe(1.15);

    expect(ROLE_FACTOR_V1["REMOVAL->PAYOFF"]).toBe(1.5);
    expect(ROLE_FACTOR_V1["ENGINE->PAYOFF"]).toBe(1.4);
    expect(ROLE_FACTOR_V1["ENGINE->ENGINE"]).toBe(1.2);
  });

  test("score calculation matches expected value", () => {
    const weight = 16;
    const kind = "burn_supports_threat";
    const roleKey = "REMOVAL->PAYOFF";
    const score =
      weight * KIND_FACTOR_V1[kind] * ROLE_FACTOR_V1[roleKey];
    expect(score).toBeCloseTo(28.8, 5);
  });
});
