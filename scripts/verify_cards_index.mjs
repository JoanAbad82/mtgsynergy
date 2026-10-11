import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MANIFEST_PATH = "public/data/cards_index.manifest.json";
const GZ_PATH = "public/data/cards_index.json.gz";

export async function verifyCardsIndex(
  manifestPath = MANIFEST_PATH,
  gzipPath = GZ_PATH,
) {
  const manifestRaw = await readFile(manifestPath, "utf8");
  const manifest = JSON.parse(manifestRaw);
  const gz = await readFile(gzipPath);

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
    return recordCount;
  } catch (err) {
    throw new Error(`verify failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function main() {
  await verifyCardsIndex();
  console.log("cards_index manifest verified: OK");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
