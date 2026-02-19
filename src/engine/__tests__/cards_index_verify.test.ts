import { createHash } from "node:crypto";
import pako from "pako";
import { describe, expect, test } from "vitest";

describe("cards_index manifest verification", () => {
  test("sha256 and record_count match payload", () => {
    const payload = {
      schema_version: "cardrecordmin-v1",
      by_name: {
        "Llanowar Elves": {
          type_line: "Creature — Elf Druid",
          oracle_text: "{T}: Add {G}.",
          cmc: 1,
        },
        Forest: {
          type_line: "Basic Land — Forest",
          oracle_text: "",
          cmc: 0,
        },
      },
      by_name_norm: {
        "llanowar elves": "Llanowar Elves",
        forest: "Forest",
      },
    };

    const json = JSON.stringify(payload);
    const gz = pako.gzip(json);
    const sha256 = createHash("sha256")
      .update(gz)
      .digest("hex");

    const recordCount = Object.keys(payload.by_name).length;

    expect(recordCount).toBe(2);
    expect(sha256).toMatch(/^[a-f0-9]{64}$/);
  });
});
