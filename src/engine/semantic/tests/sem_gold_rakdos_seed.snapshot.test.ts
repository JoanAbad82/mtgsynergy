import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  ActionId,
  SEM_IR_VERSION,
  isValidActionId,
  isValidCostId,
  isValidEventId,
  isValidGateId,
  isValidResourceId,
  isValidTokenKindId,
} from "../contract";

const here = dirname(fileURLToPath(import.meta.url));
const datasetPath = join(here, "../../../../tools/semantics/gold/sem_gold_v1_rakdos_seed.json");

function loadDataset(): unknown {
  const raw = readFileSync(datasetPath, "utf8");
  return JSON.parse(raw) as unknown;
}

describe("semantic gold seed: rakdos sacrifice", () => {
  it("validates ids and snapshots dataset", () => {
    const dataset = loadDataset() as {
      SEM_IR_VERSION: number;
      archetype: string;
      cards: Array<{
        name: string;
        notes: string;
        expected_ir: {
          card_id: number;
          frames: Array<{
            kind: number;
            watch: Array<{ id: number }>;
            cost: Array<{ cost: number; res?: number }>;
            do: Array<{ action: number; tokenData?: { kind: number } }>;
            touch: Array<{ id: number }>;
            gates: Array<{ id: number }>;
          }>;
        };
      }>;
    };

    expect(dataset.SEM_IR_VERSION).toBe(SEM_IR_VERSION);

    for (const card of dataset.cards) {
      expect(typeof card.expected_ir.card_id).toBe("number");
      expect(Array.isArray(card.expected_ir.frames)).toBe(true);

      for (const frame of card.expected_ir.frames) {
        expect(Array.isArray(frame.watch)).toBe(true);
        expect(Array.isArray(frame.cost)).toBe(true);
        expect(Array.isArray(frame.do)).toBe(true);
        expect(Array.isArray(frame.touch)).toBe(true);
        expect(Array.isArray(frame.gates)).toBe(true);

        for (const evt of frame.watch) {
          expect(isValidEventId(evt.id)).toBe(true);
        }

        for (const cost of frame.cost) {
          expect(isValidCostId(cost.cost)).toBe(true);
          if (cost.res !== undefined) {
            expect(isValidResourceId(cost.res)).toBe(true);
          }
        }

        for (const eff of frame.do) {
          expect(isValidActionId(eff.action)).toBe(true);
          if (eff.action === ActionId.CREATE_TOKEN) {
            expect(eff.tokenData).toBeTruthy();
            expect(isValidTokenKindId(eff.tokenData!.kind)).toBe(true);
          }
        }

        for (const res of frame.touch) {
          expect(isValidResourceId(res.id)).toBe(true);
        }

        for (const gate of frame.gates) {
          expect(isValidGateId(gate.id)).toBe(true);
        }
      }
    }

    expect(dataset).toMatchSnapshot();
  });
});
