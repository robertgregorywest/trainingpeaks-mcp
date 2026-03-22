import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { TrainingPeaksClient } from "../../src/index.js";
import type { WorkoutSummary } from "../../src/types.js";
import {
  getWorkouts,
  getWorkout,
  getWorkoutDetails,
  getStrengthWorkouts,
  searchWorkouts,
  compareIntervals,
} from "../../src/mcp/tools/workouts.js";
import { createClient, today, daysAgo } from "./setup.js";

const hasCredentials = process.env.TP_USERNAME && process.env.TP_PASSWORD;
const bikeWorkoutId = process.env.TP_TEST_BIKE_WORKOUT_ID
  ? Number(process.env.TP_TEST_BIKE_WORKOUT_ID)
  : undefined;

describe.skipIf(!hasCredentials)(
  "Workouts",
  () => {
    let client: TrainingPeaksClient;
    let recentWorkouts: WorkoutSummary[];
    let recentWorkoutsMcp: Array<{ workoutId: number; title?: string }>;

    beforeAll(async () => {
      client = await createClient();
      recentWorkouts = await client.getWorkouts(daysAgo(90), today);
      const raw = await getWorkouts(client, {
        startDate: daysAgo(90),
        endDate: today,
      });
      recentWorkoutsMcp = JSON.parse(raw);
    }, 120000);

    afterAll(async () => {
      await client.close();
    });

    describe("API", () => {
      it("getWorkouts returns array for date range", async () => {
        const workouts = await client.getWorkouts(daysAgo(30), today);

        expect(Array.isArray(workouts)).toBe(true);
        if (workouts.length > 0) {
          expect(workouts[0].workoutId).toBeTypeOf("number");
          expect(workouts[0].athleteId).toBeTypeOf("number");
          expect(workouts[0].workoutDay).toBeTypeOf("string");
        }
      });

      it("getWorkout returns single workout", async () => {
        if (recentWorkouts.length === 0) return;

        const workout = await client.getWorkout(recentWorkouts[0].workoutId);

        expect(workout).toBeDefined();
        expect(workout.workoutId).toBe(recentWorkouts[0].workoutId);
      });

      it("getWorkoutDetails returns detailed metrics", async () => {
        if (recentWorkouts.length === 0) return;

        const details = await client.getWorkoutDetails(
          recentWorkouts[0].workoutId,
        );

        expect(details).toBeDefined();
        expect(details.workoutId).toBe(recentWorkouts[0].workoutId);
      });

      it("getStrengthWorkouts returns array", async () => {
        const workouts = await client.getStrengthWorkouts(daysAgo(90), today);

        expect(Array.isArray(workouts)).toBe(true);
        if (workouts.length > 0) {
          expect(workouts[0].workoutId).toBeTypeOf("string");
          expect(workouts[0].workoutType).toBe("StructuredStrength");
          expect(Array.isArray(workouts[0].exercises)).toBe(true);
        }
      });
    });

    describe("MCP Tools", () => {
      it("get_workouts returns JSON array for 30-day range", async () => {
        const raw = await getWorkouts(client, {
          startDate: daysAgo(30),
          endDate: today,
        });
        const data = JSON.parse(raw);

        expect(Array.isArray(data)).toBe(true);
      });

      it("get_workouts returns workouts for a specific day (2026-03-21)", async () => {
        const raw = await getWorkouts(client, {
          startDate: "2026-03-21",
          endDate: "2026-03-21",
        });
        const data = JSON.parse(raw);

        expect(Array.isArray(data)).toBe(true);
        expect(data.length).toBeGreaterThan(0);
        expect(data[0].workoutId).toBeTypeOf("number");
      });

      it("get_workout returns JSON with workoutId matching input", async () => {
        if (recentWorkoutsMcp.length === 0) return;

        const raw = await getWorkout(client, {
          workoutId: recentWorkoutsMcp[0].workoutId,
        });
        const data = JSON.parse(raw);

        expect(data.workoutId).toBe(recentWorkoutsMcp[0].workoutId);
      });

      it("get_workout_details returns JSON with workoutId and metrics", async () => {
        if (recentWorkoutsMcp.length === 0) return;

        const raw = await getWorkoutDetails(client, {
          workoutId: recentWorkoutsMcp[0].workoutId,
        });
        const data = JSON.parse(raw);

        expect(data.workoutId).toBe(recentWorkoutsMcp[0].workoutId);
      });

      it("get_strength_workouts returns JSON array", async () => {
        const raw = await getStrengthWorkouts(client, {
          startDate: daysAgo(90),
          endDate: today,
        });
        const data = JSON.parse(raw);

        expect(Array.isArray(data)).toBe(true);
      });

      it("search_workouts returns matching workouts for known title", async () => {
        const titled = recentWorkoutsMcp.find(
          (w) => w.title && w.title.length > 3,
        );
        if (!titled) return;

        const query = titled.title!.slice(0, 4);
        const raw = await searchWorkouts(client, { title: query, days: 90 });
        const data = JSON.parse(raw);

        expect(Array.isArray(data)).toBe(true);
        expect(data.length).toBeGreaterThan(0);
        for (const w of data) {
          expect(w.title.toLowerCase()).toContain(query.toLowerCase());
        }
      });

      it("search_workouts returns empty array for gibberish search", async () => {
        const raw = await searchWorkouts(client, {
          title: "zzzqqqxxx999",
          days: 90,
        });
        const data = JSON.parse(raw);

        expect(Array.isArray(data)).toBe(true);
        expect(data.length).toBe(0);
      });

      it.skipIf(!bikeWorkoutId)(
        "compare_intervals returns laps and summaries",
        async () => {
          const raw = await compareIntervals(client, {
            workoutIds: [bikeWorkoutId!],
            durationTolerance: 2,
          });
          const data = JSON.parse(raw);

          expect(Array.isArray(data.laps)).toBe(true);
          expect(Array.isArray(data.summaries)).toBe(true);
          expect(data.summaries.length).toBe(1);
          expect(data.summaries[0].workoutId).toBe(bikeWorkoutId);
        },
      );
    });
  },
  60000,
);
