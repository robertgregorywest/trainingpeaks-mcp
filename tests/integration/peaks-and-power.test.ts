import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { TrainingPeaksClient } from "../../src/index.js";
import type { WorkoutSummary } from "../../src/types.js";
import { getPeaks, getWorkoutPeaks } from "../../src/mcp/tools/peaks.js";
import {
  getBestPower,
  getPowerDurationCurve,
} from "../../src/mcp/tools/power.js";
import { getAerobicDecoupling } from "../../src/mcp/tools/decoupling.js";
import { createClient, today, daysAgo } from "./setup.js";

const hasCredentials = process.env.TP_USERNAME && process.env.TP_PASSWORD;
const bikeWorkoutId = process.env.TP_TEST_BIKE_WORKOUT_ID
  ? Number(process.env.TP_TEST_BIKE_WORKOUT_ID)
  : undefined;

describe.skipIf(!hasCredentials)(
  "Peaks & Power",
  () => {
    let client: TrainingPeaksClient;
    let recentWorkouts: WorkoutSummary[];

    beforeAll(async () => {
      client = await createClient();
      recentWorkouts = await client.getWorkouts(daysAgo(90), today);
    }, 120000);

    afterAll(async () => {
      await client.close();
    });

    describe("API", () => {
      it("getPeaks returns power peaks for Bike", async () => {
        const peaks = await client.getPeaks("Bike", "power5min");
        expect(Array.isArray(peaks)).toBe(true);
        if (peaks.length > 0) {
          expect(peaks[0].value).toBeTypeOf("number");
          expect(peaks[0].type).toBeTypeOf("string");
        }
      });

      it("getPeaks returns HR peaks for Bike", async () => {
        const peaks = await client.getPeaks("Bike", "hR5min");
        expect(Array.isArray(peaks)).toBe(true);
      });

      it("getWorkoutPeaks returns peaks for specific workout", async () => {
        if (recentWorkouts.length === 0) return;

        const peaks = await client.getWorkoutPeaks(recentWorkouts[0].workoutId);
        expect(peaks).toBeDefined();
        expect(peaks.workoutId).toBe(recentWorkouts[0].workoutId);
        expect(peaks.personalRecordCount).toBeTypeOf("number");
        expect(Array.isArray(peaks.personalRecords)).toBe(true);
      });

      it.skipIf(!bikeWorkoutId)(
        "getPowerDurationCurve returns curve data",
        async () => {
          const result = await client.getPowerDurationCurve({
            startDate: daysAgo(30),
            endDate: today,
          });

          expect(result.workoutsAnalysed).toBeTypeOf("number");
          expect(Array.isArray(result.curve)).toBe(true);
          if (result.curve.length > 0) {
            expect(result.curve[0].durationSeconds).toBeTypeOf("number");
            expect(result.curve[0].bestPowerWatts).toBeTypeOf("number");
          }
        },
      );

      it.skipIf(!bikeWorkoutId)(
        "getAerobicDecoupling returns decoupling data",
        async () => {
          const result = await client.getAerobicDecoupling(bikeWorkoutId!);

          expect(result.decouplingPercent).toBeTypeOf("number");
          expect(result.firstHalf).toBeDefined();
          expect(result.secondHalf).toBeDefined();
          expect(result.interpretation).toBeTypeOf("string");
        },
      );
    });

    describe("MCP Tools", () => {
      it("get_peaks returns JSON array for Bike/power5min", async () => {
        const raw = await getPeaks(client, {
          sport: "Bike",
          type: "power5min",
        });
        const data = JSON.parse(raw);

        expect(Array.isArray(data)).toBe(true);
      });

      it("get_workout_peaks returns personalRecordCount and personalRecords", async () => {
        if (recentWorkouts.length === 0) return;

        const raw = await getWorkoutPeaks(client, {
          workoutId: recentWorkouts[0].workoutId,
        });
        const data = JSON.parse(raw);

        expect(data.personalRecordCount).toBeTypeOf("number");
        expect(Array.isArray(data.personalRecords)).toBe(true);
      });

      it.skipIf(!bikeWorkoutId)(
        "get_best_power computes best power at multiple durations",
        async () => {
          const raw = await getBestPower(client, {
            workoutId: bikeWorkoutId!,
            durations: [5, 60, 300],
          });
          const data = JSON.parse(raw);

          expect(data.workoutId).toBe(bikeWorkoutId);
          expect(Array.isArray(data.results)).toBe(true);
          expect(data.results.length).toBe(3);
          expect(data.results[0].durationSeconds).toBe(5);
          expect(data.results[1].durationSeconds).toBe(60);
          expect(data.results[2].durationSeconds).toBe(300);
          for (const r of data.results) {
            if (r.bestPowerWatts !== null) {
              expect(r.bestPowerWatts).toBeGreaterThan(0);
            }
          }
        },
      );

      it("get_power_duration_curve returns curve with workoutsAnalysed and durationLabel", async () => {
        const raw = await getPowerDurationCurve(client, {
          startDate: daysAgo(90),
          endDate: today,
          durations: [5, 60, 300],
        });
        const data = JSON.parse(raw);

        expect(data.workoutsAnalysed).toBeTypeOf("number");
        expect(data.workoutsAnalysed).toBeGreaterThan(0);
        expect(Array.isArray(data.curve)).toBe(true);
        expect(data.curve.length).toBeGreaterThan(0);
        expect(data.curve[0].durationLabel).toBeTypeOf("string");
        expect(data.curve[0].bestPowerWatts).toBeTypeOf("number");
        expect(data.curve[0].workoutId).toBeTypeOf("number");
      });

      it.skipIf(!bikeWorkoutId)(
        "get_aerobic_decoupling returns decoupling analysis",
        async () => {
          const raw = await getAerobicDecoupling(client, {
            workoutId: bikeWorkoutId!,
          });
          const data = JSON.parse(raw);

          expect(data.decouplingPercent).toBeTypeOf("number");
          expect(data.firstHalf).toBeDefined();
          expect(data.firstHalf.avgPower).toBeTypeOf("number");
          expect(data.firstHalf.avgHR).toBeTypeOf("number");
          expect(data.firstHalf.hrPowerRatio).toBeTypeOf("number");
          expect(data.secondHalf).toBeDefined();
          expect(data.secondHalf.avgPower).toBeTypeOf("number");
          expect(data.secondHalf.avgHR).toBeTypeOf("number");
          expect(data.secondHalf.hrPowerRatio).toBeTypeOf("number");
          expect([
            "Good aerobic fitness — minimal cardiac drift",
            "Moderate decoupling — aerobic endurance developing",
            "High decoupling — aerobic base needs work",
          ]).toContain(data.interpretation);
        },
      );
    });
  },
  60000,
);
