import { describe, expect, it, vi } from "vitest";

describe("buildMeta", () => {
  it("uses CF_PAGES_COMMIT_SHA when defined", async () => {
    vi.resetModules();
    process.env.CF_PAGES_COMMIT_SHA = "abcdef1234567890";
    const mod = await import("../buildMeta");
    expect(mod.gitShaFull).toBe("abcdef1234567890");
    expect(mod.gitShaShort).toBe("abcdef1");
    delete process.env.CF_PAGES_COMMIT_SHA;
  });

  it("falls back to dev when undefined", async () => {
    vi.resetModules();
    delete process.env.CF_PAGES_COMMIT_SHA;
    const mod = await import("../buildMeta");
    expect(mod.gitShaFull).toBe("dev");
    expect(mod.gitShaShort).toBe("dev");
  });
});
