import { describe, expect, it } from "vitest";
import { parseSemanticIrV0 } from "../parser/sem_parser_v1";
import { buildSemanticCardProfile } from "../overlay/sem_profile";

describe("semantic profile origin", () => {
  it("incluye origin en produced y consumed con default effect", () => {
    const ir = parseSemanticIrV0({
      name: "Shock",
      oracle_text: "Shock deals 2 damage to any target.",
      type_line: "Instant",
    });
    const profile = buildSemanticCardProfile(ir, "Shock deals 2 damage to any target.");

    for (const entry of profile.produced.values()) {
      expect(entry.origin === "cost" || entry.origin === "effect").toBe(true);
      expect(entry.origin).toBe("effect");
    }
    for (const entry of profile.consumed.values()) {
      expect(entry.origin === "cost" || entry.origin === "effect").toBe(true);
      expect(entry.origin).toBe("effect");
    }
  });
});
