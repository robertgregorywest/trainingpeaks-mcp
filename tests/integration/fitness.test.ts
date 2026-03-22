import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { TrainingPeaksClient } from "../../src/index.js";
import {
  getFitnessData,
  getCurrentFitness,
} from "../../src/mcp/tools/fitness.js";
import { createClient, today, daysAgo } from "./setup.js";

const hasCredentials = process.env.TP_USERNAME && process.env.TP_PASSWORD;

describe.skipIf(!hasCredentials)(
  "Fitness",
  () => {
    let client: TrainingPeaksClient;

    beforeAll(async () => {
      client = await createClient();
    }, 120000);

    afterAll(async () => {
      await client.close();
    });

    describe("API", () => {
      it("getCurrentFitness returns CTL/ATL/TSB", async () => {
        const fitness = await client.getCurrentFitness();

        expect(fitness).toBeDefined();
        expect(fitness.date).toBeTypeOf("string");
        expect(fitness.ctl).toBeTypeOf("number");
        expect(fitness.atl).toBeTypeOf("number");
        expect(fitness.tsb).toBeTypeOf("number");
      });

      it("getFitnessData returns array for date range", async () => {
        const fitnessData = await client.getFitnessData(daysAgo(7), today);

        expect(Array.isArray(fitnessData)).toBe(true);
        expect(fitnessData.length).toBeGreaterThan(0);
        expect(fitnessData[0].ctl).toBeTypeOf("number");
      });
    });

    describe("MCP Tools", () => {
      it("get_fitness_data returns JSON array with ctl, atl, tsb", async () => {
        const raw = await getFitnessData(client, {
          startDate: daysAgo(7),
          endDate: today,
        });
        const data = JSON.parse(raw);

        expect(Array.isArray(data)).toBe(true);
        expect(data.length).toBeGreaterThan(0);
        expect(data[0].ctl).toBeTypeOf("number");
        expect(data[0].atl).toBeTypeOf("number");
        expect(data[0].tsb).toBeTypeOf("number");
      });

      it("get_current_fitness returns JSON with ctl, atl, tsb, date", async () => {
        const raw = await getCurrentFitness(client);
        const data = JSON.parse(raw);

        expect(data.ctl).toBeTypeOf("number");
        expect(data.atl).toBeTypeOf("number");
        expect(data.tsb).toBeTypeOf("number");
        expect(data.date).toBeTypeOf("string");
      });
    });
  },
  60000,
);
