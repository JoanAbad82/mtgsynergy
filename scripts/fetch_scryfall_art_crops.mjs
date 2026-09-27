import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

const cardNames = [
  "Green Sun's Zenith",
  "Collected Company",
  "Rampaging Ferocidon",
  "Trelasarra, Moon Dancer",
  "Val, Marooned Surveyor",
  "Prosperous Innkeeper",
  "Kithkin Token",
  "Scarecrow Token",
  "Treasure Token",
  "Elk Token",
  "Snake Token",
  "Rhino Warrior Token",
];

const ATTRIBUTION_PATH = path.join(
  process.cwd(),
  "src",
  "generated",
  "cardArtAttributions.json",
);

const OUTPUT_DIR = path.join(
  process.cwd(),
  "public",
  "assets",
  "images",
  "cards",
  "art",
);

function slugify(name) {
  return name
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .toLowerCase()
    .replace(/['’`,]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function resolveArtCrop(cardJson) {
  if (cardJson?.image_uris?.art_crop) {
    return cardJson.image_uris.art_crop;
  }
  if (Array.isArray(cardJson?.card_faces) && cardJson.card_faces[0]?.image_uris?.art_crop) {
    return cardJson.card_faces[0].image_uris.art_crop;
  }
  return null;
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    const error = new Error(`Request failed (${response.status}) for ${url}`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

async function downloadImage(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Image download failed (${response.status}) for ${url}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  await mkdir(path.dirname(ATTRIBUTION_PATH), { recursive: true });
  const attributions = {};

  for (const name of cardNames) {
    const slug = slugify(name);
    const apiUrl = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`;
    const tokenQueryName = name.replace(/\s*token$/i, "").trim();
    const tokenSearchUrl = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(
      `type:token name:"${tokenQueryName}"`,
    )}`;

    try {
      let cardJson;
      try {
        cardJson = await fetchJson(apiUrl);
      } catch (error) {
        if (error.status === 404) {
          const searchJson = await fetchJson(tokenSearchUrl);
          cardJson = Array.isArray(searchJson?.data) ? searchJson.data[0] : null;
        } else {
          throw error;
        }
      }

      if (!cardJson) {
        console.warn(`No card data found for "${name}". Skipping.`);
        continue;
      }

      const artCropUrl = resolveArtCrop(cardJson);

      if (!artCropUrl) {
        console.warn(`No art_crop found for "${name}". Skipping.`);
        continue;
      }

      const imageBuffer = await downloadImage(artCropUrl);
      const outputPath = path.join(OUTPUT_DIR, `${slug}.jpg`);
      await writeFile(outputPath, imageBuffer);

      const faceArtists = Array.isArray(cardJson?.card_faces)
        ? cardJson.card_faces.map((face) => face?.artist).filter(Boolean)
        : [];
      const artist = cardJson?.artist ?? (faceArtists.join(" / ") || null);

      attributions[name] = {
        artist,
        scryfall_uri: String(cardJson?.scryfall_uri ?? "").replace(/\?utm_source=api.*$/, ""),
        set: cardJson?.set ?? null,
        collector_number: cardJson?.collector_number ?? null,
      };

      console.log(`Saved ${name} -> ${outputPath}`);
    } catch (error) {
      console.error(`Failed to fetch "${name}":`, error.message);
    }
  }

  await writeFile(
    ATTRIBUTION_PATH,
    JSON.stringify(attributions, null, 2) + "\n",
    "utf8",
  );
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
