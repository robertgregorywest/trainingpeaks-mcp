import { createRequire } from "node:module";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ITrainingPeaksClient } from "../index.js";
import { logResponse, logError } from "./logger.js";

const require = createRequire(import.meta.url);
const { version } = require("../../package.json") as { version: string };

import {
  getUserSchema,
  getAthleteIdSchema,
  getUser,
  getAthleteId,
} from "./tools/user.js";

import {
  getWorkoutsSchema,
  getWorkoutSchema,
  getWorkoutDetailsSchema,
  searchWorkoutsSchema,
  compareIntervalsSchema,
  getStrengthWorkoutsSchema,
  getWorkouts,
  getWorkout,
  getWorkoutDetails,
  searchWorkouts,
  compareIntervals,
  getStrengthWorkouts,
} from "./tools/workouts.js";

import {
  parseFitFileSchema,
  parseFitFile,
  clearFitCacheSchema,
  clearFitCache,
} from "./tools/files.js";

import {
  getFitnessDataSchema,
  getCurrentFitnessSchema,
  getFitnessData,
  getCurrentFitness,
} from "./tools/fitness.js";

import { getCurrentDateSchema, getCurrentDate } from "./tools/datetime.js";

import {
  getBestPowerSchema,
  getBestPower,
  getPowerDurationCurveSchema,
  getPowerDurationCurve,
} from "./tools/power.js";

import {
  getPeaksSchema,
  getWorkoutPeaksSchema,
  getPeaks,
  getWorkoutPeaks,
} from "./tools/peaks.js";

import {
  getAerobicDecouplingSchema,
  getAerobicDecoupling,
} from "./tools/decoupling.js";

import {
  assessComplianceSchema,
  assessCompliance,
} from "./tools/compliance.js";

import { buildZwoSchema, buildZwoWorkout } from "./tools/zwo.js";

type ToolResult = { content: Array<{ type: "text"; text: string }> };

export function createMcpServer(client: ITrainingPeaksClient): McpServer {
  const server = new McpServer({
    name: "trainingpeaks-mcp",
    version,
  });

  // Helper that registers a tool and wraps the handler with logging
  function tool(
    name: string,
    description: string,
    schema: Record<string, unknown>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler: (args: any) => Promise<string>,
  ): void {
    server.tool(
      name,
      description,
      schema,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (args: any): Promise<ToolResult> => {
        const start = Date.now();
        try {
          const content = await handler(args);
          logResponse(name, content, Date.now() - start);
          return { content: [{ type: "text", text: content }] };
        } catch (error) {
          logError(name, error as Error, Date.now() - start);
          throw error;
        }
      },
    );
  }

  // User tools
  tool(
    "get_user",
    "Get the current user profile including athlete ID",
    getUserSchema.shape,
    () => getUser(client),
  );

  tool(
    "get_athlete_id",
    "Get just the athlete ID for the current user",
    getAthleteIdSchema.shape,
    () => getAthleteId(client),
  );

  // Workout tools
  tool(
    "get_workouts",
    "Get a list of workouts within a date range",
    getWorkoutsSchema.shape,
    (args) => getWorkouts(client, args),
  );

  tool(
    "get_workout",
    "Get a single workout summary by ID",
    getWorkoutSchema.shape,
    (args) => getWorkout(client, args),
  );

  tool(
    "get_workout_details",
    "Get detailed workout data including metrics, intervals, laps, and zones",
    getWorkoutDetailsSchema.shape,
    (args) => getWorkoutDetails(client, args),
  );

  tool(
    "search_workouts",
    "Search for workouts by title (case-insensitive substring match) within a number of days",
    searchWorkoutsSchema.shape,
    (args) => searchWorkouts(client, args),
  );

  tool(
    "compare_intervals",
    "Compare laps/intervals side-by-side across multiple workouts with optional power and duration filters",
    compareIntervalsSchema.shape,
    (args) => compareIntervals(client, args),
  );

  tool(
    "get_strength_workouts",
    "Get strength workouts within a date range (sets, blocks, exercises, compliance)",
    getStrengthWorkoutsSchema.shape,
    (args) => getStrengthWorkouts(client, args),
  );

  // File tools
  tool(
    "parse_fit_file",
    "Parse a FIT file and extract structured data (sessions, laps, records)",
    parseFitFileSchema.shape,
    (args) => parseFitFile(client, args),
  );

  tool(
    "clear_fit_cache",
    "Clear all cached FIT files downloaded from TrainingPeaks. Returns count and bytes freed.",
    clearFitCacheSchema.shape,
    () => clearFitCache(client),
  );

  // Fitness tools
  tool(
    "get_fitness_data",
    "Get fitness metrics (CTL, ATL, TSB) for a date range",
    getFitnessDataSchema.shape,
    (args) => getFitnessData(client, args),
  );

  tool(
    "get_current_fitness",
    "Get current fitness metrics (CTL, ATL, TSB) for today",
    getCurrentFitnessSchema.shape,
    () => getCurrentFitness(client),
  );

  // Peaks tools
  tool(
    "get_peaks",
    "Get peaks/personal records for a specific sport and type",
    getPeaksSchema.shape,
    (args) => getPeaks(client, args),
  );

  tool(
    "get_workout_peaks",
    "Get peaks/PRs achieved in a specific workout",
    getWorkoutPeaksSchema.shape,
    (args) => getWorkoutPeaks(client, args),
  );

  // Power analysis tools
  tool(
    "get_best_power",
    "Compute best power from raw FIT file for arbitrary durations (e.g., 3min, 8min, 45min)",
    getBestPowerSchema.shape,
    (args) => getBestPower(client, args),
  );

  tool(
    "get_power_duration_curve",
    "Build a power-duration curve across cycling workouts in a date range, finding best power at standardised durations via FIT file analysis",
    getPowerDurationCurveSchema.shape,
    (args) => getPowerDurationCurve(client, args),
  );

  // Decoupling tools
  tool(
    "get_aerobic_decoupling",
    "Calculate aerobic decoupling (Pw:Hr) from a workout FIT file — measures cardiac drift between first and second halves",
    getAerobicDecouplingSchema.shape,
    (args) => getAerobicDecoupling(client, args),
  );

  // Compliance tools
  tool(
    "assess_compliance",
    "Assess workout plan compliance — compares coach-prescribed plan (from plan FIT file) against actual recorded activity, with per-step and summary-level metrics",
    assessComplianceSchema.shape,
    (args) => assessCompliance(client, args),
  );

  // Datetime tools
  tool(
    "get_current_date",
    "Get the current date in various formats (ISO, US, EU, custom)",
    getCurrentDateSchema.shape,
    (args) => getCurrentDate(args),
  );

  // ZWO workout builder
  tool(
    "build_zwo_workout",
    "Build a Zwift .zwo workout file from structured segments. Segment types: warmup (ramp up), cooldown (ramp down), steady (constant power), intervals (repeated on/off work/rest), ramp (linear power change), freeride (no power target). IMPORTANT: For repeated work/rest sets, ALWAYS use the 'intervals' segment type with a repeat count — not multiple individual steady segments. Power can be specified as absolute watts via { watts: 250 } (requires ftp parameter for conversion) or as FTP percentage via { ftpPercent: 75 }. Returns XML string and suggested filename.",
    buildZwoSchema.shape,
    (args) => buildZwoWorkout(args),
  );

  // ZWO building guidance prompt
  server.registerPrompt(
    "build-zwo",
    {
      title: "Build ZWO Workout",
      description:
        "Guidance for structuring a Zwift .zwo workout using build_zwo_workout. Use this prompt before calling the tool.",
    },
    async () => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `You are about to build a Zwift .zwo workout file using the build_zwo_workout tool. Follow these rules:

SEGMENT SELECTION GUIDE:
- warmup: Progressive ramp at start of workout
- cooldown: Progressive ramp down at end of workout
- intervals: Repeated work/rest sets with UNIFORM duration and power — ALWAYS prefer this over multiple steady segments
- steady: Single constant-power block — only use for one-off efforts or reps that differ from the rest of a set
- ramp: Linear power change within a block (e.g., ramp test steps)
- freeride: No power target

CRITICAL RULE — INTERVALS:
When a workout prescribes repeated work/rest intervals (e.g., "5×3min @ 300w with 2min recovery"), use a SINGLE "intervals" segment with a repeat count. Do NOT create 5 separate steady+steady pairs.

Example — uniform set:
  "5×3min @ 105% FTP / 2min @ 50% FTP"
  → { type: "intervals", repeat: 5, onDuration: 180, onPower: { ftpPercent: 105 }, offDuration: 120, offPower: { ftpPercent: 50 } }

Example — mixed set (4 uniform + 1 extended probe):
  "4×2:15 @ 95% + 1×2:30 @ 95%, all with 4min recovery"
  → { type: "intervals", repeat: 4, onDuration: 135, onPower: { ftpPercent: 95 }, offDuration: 240, offPower: { ftpPercent: 55 } }
  → { type: "steady", duration: 150, power: { ftpPercent: 95 } }
  → { type: "steady", duration: 240, power: { ftpPercent: 55 } }

POWER SPECIFICATION:
- Use { ftpPercent: N } when prescription is relative to FTP (most common)
- Use { watts: N } when absolute watts are specified — requires the top-level ftp parameter for conversion
- Pick one style consistently within a workout

Now call build_zwo_workout with structured segments following these rules.`,
          },
        },
      ],
    }),
  );

  return server;
}
