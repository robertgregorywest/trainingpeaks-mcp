import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { TrainingPeaksClient } from "../../src/index.js";
import { parseFitFile } from "../../src/mcp/tools/files.js";
import { getCurrentDate } from "../../src/mcp/tools/datetime.js";
import { createClient } from "./setup.js";

const hasCredentials = process.env.TP_USERNAME && process.env.TP_PASSWORD;
const bikeWorkoutId = process.env.TP_TEST_BIKE_WORKOUT_ID
  ? Number(process.env.TP_TEST_BIKE_WORKOUT_ID)
  : undefined;

describe.skipIf(!hasCredentials)(
  "Files & DateTime",
  () => {
    let client: TrainingPeaksClient;

    beforeAll(async () => {
      client = await createClient();
    }, 120000);

    afterAll(async () => {
      await client.close();
    });

    describe("API", () => {
      it.skipIf(!bikeWorkoutId)(
        "downloadActivityFile returns Buffer for workout with file",
        async () => {
          const buffer = await client.downloadActivityFile(bikeWorkoutId!);

          expect(buffer).not.toBeNull();
          expect(buffer!.length).toBeGreaterThan(0);
        },
      );

      it("downloadActivityFile throws for non-existent workout", async () => {
        await expect(client.downloadActivityFile(999999999)).rejects.toThrow();
      });
    });

    describe("MCP Tools", () => {
      it.skipIf(!bikeWorkoutId)(
        "parse_fit_file parses a downloaded FIT file",
        async () => {
          const buffer = await client.downloadActivityFile(bikeWorkoutId!);
          expect(buffer).not.toBeNull();

          const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "tp-fit-"));
          const tmpFile = path.join(tmpDir, "test.fit");
          await fs.writeFile(tmpFile, buffer!);

          try {
            const raw = await parseFitFile(client, { filePath: tmpFile });
            const data = JSON.parse(raw);

            expect(Array.isArray(data.sessions)).toBe(true);
            expect(data.sessions.length).toBeGreaterThan(0);
            expect(Array.isArray(data.laps)).toBe(true);
            expect(data.recordCount).toBeTypeOf("number");
            expect(data.recordCount).toBeGreaterThan(0);
          } finally {
            await fs.rm(tmpDir, { recursive: true, force: true });
          }
        },
      );

      it("get_current_date returns ISO date matching YYYY-MM-DD", async () => {
        const raw = await getCurrentDate({ format: "iso" });
        const data = JSON.parse(raw);

        expect(data.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });
  },
  60000,
);
