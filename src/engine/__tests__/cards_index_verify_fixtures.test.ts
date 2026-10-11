import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { verifyCardsIndex } from "../../../scripts/verify_cards_index.mjs";

describe("cards_index verifier fixtures", () => {
  let fixtureDirectory: string;
  let gzipPath: string;
  let manifestPath: string;

  beforeEach(async () => {
    fixtureDirectory = await mkdtemp(join(tmpdir(), "mtgsynergy-cards-index-"));
    gzipPath = join(fixtureDirectory, "cards_index.json.gz");
    manifestPath = join(fixtureDirectory, "cards_index.manifest.json");
  });

  afterEach(async () => {
    await rm(fixtureDirectory, { recursive: true, force: true });
  });

  async function writeFixture(
    payload: unknown = { by_name: { SyntheticCard: { oracle_text: "" } } },
    options: { recordCount?: number; sha256?: string } = {},
  ) {
    const gzip = gzipSync(JSON.stringify(payload));
    const sha256 = createHash("sha256").update(gzip).digest("hex");
    const manifest = {
      sha256_gz: options.sha256 ?? sha256,
      record_count: options.recordCount ?? Object.keys((payload as { by_name?: object }).by_name ?? {}).length,
    };

    await writeFile(gzipPath, gzip);
    await writeFile(manifestPath, JSON.stringify(manifest));
  }

  test("accepts a valid synthetic manifest and gzip", async () => {
    await writeFixture();

    await expect(verifyCardsIndex(manifestPath, gzipPath)).resolves.toBe(1);
  });

  test("rejects a gzip whose digest differs from the manifest", async () => {
    await writeFixture(undefined, { sha256: "0".repeat(64) });

    await expect(verifyCardsIndex(manifestPath, gzipPath)).rejects.toThrow(/sha256 mismatch/);
  });

  test("rejects a manifest with the wrong record count", async () => {
    await writeFixture(undefined, { recordCount: 2 });

    await expect(verifyCardsIndex(manifestPath, gzipPath)).rejects.toThrow(/record_count mismatch/);
  });

  test("rejects a malformed gzip with a verifier error", async () => {
    const gzip = Buffer.from("not a gzip stream");
    const sha256 = createHash("sha256").update(gzip).digest("hex");
    await writeFile(gzipPath, gzip);
    await writeFile(manifestPath, JSON.stringify({ sha256_gz: sha256, record_count: 0 }));

    await expect(verifyCardsIndex(manifestPath, gzipPath)).rejects.toThrow(/verify failed/);
  });
});
