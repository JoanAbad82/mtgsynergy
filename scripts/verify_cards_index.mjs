import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";

const MANIFEST_PATH = "public/data/cards_index.manifest.json";
const GZ_PATH = "public/data/cards_index.json.gz";

async function main() {
  const manifestRaw = await readFile(MANIFEST_PATH, "utf8");
  const manifest = JSON.parse(manifestRaw);
  const gz = await readFile(GZ_PATH);

  const sha256 = createHash("sha256").update(gz).digest("hex");
  if (sha256 !== manifest.sha256_gz) {
    throw new Error(
      `sha256 mismatch: expected ${manifest.sha256_gz}, got ${sha256}`,
    );
  }

  try {
    const json = gunzipSync(gz).toString("utf8");
    const payload = JSON.parse(json);
    const recordCount = payload?.by_name
      ? Object.keys(payload.by_name).length
      : 0;
    if (manifest.record_count !== recordCount) {
      throw new Error(
        `record_count mismatch: expected ${manifest.record_count}, got ${recordCount}`,
      );
    }
  } catch (err) {
    throw new Error(`verify failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  console.log("cards_index manifest verified: OK");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
