import { createRequire } from 'node:module';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { TrainingPeaksClient } from '../index.js';
import { logResponse, logError } from './logger.js';

const require = createRequire(import.meta.url);
const { version } = require('../../package.json') as { version: string };

import {
  getUserSchema,
  getAthleteIdSchema,
  getUser,
  getAthleteId,
} from './tools/user.js';

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
} from './tools/workouts.js';

import { parseFitFileSchema, parseFitFile } from './tools/files.js';

import {
  getFitnessDataSchema,
  getCurrentFitnessSchema,
  getFitnessData,
  getCurrentFitness,
} from './tools/fitness.js';

import { getCurrentDateSchema, getCurrentDate } from './tools/datetime.js';

import {
  getBestPowerSchema,
  getBestPower,
  getPowerDurationCurveSchema,
  getPowerDurationCurve,
} from './tools/power.js';

import {
  getPeaksSchema,
  getWorkoutPeaksSchema,
  getPeaks,
  getWorkoutPeaks,
} from './tools/peaks.js';

import {
  getAerobicDecouplingSchema,
  getAerobicDecoupling,
} from './tools/decoupling.js';

type ToolResult = { content: Array<{ type: 'text'; text: string }> };

export function createMcpServer(client: TrainingPeaksClient): McpServer {
  const server = new McpServer({
    name: 'trainingpeaks-mcp',
    version,
  });

  // Helper that registers a tool and wraps the handler with logging
  function tool(
    name: string,
    description: string,
    schema: Record<string, unknown>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler: (args: any) => Promise<string>
  ): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    server.tool(name, description, schema, async (args: any): Promise<ToolResult> => {
      const start = Date.now();
      try {
        const content = await handler(args);
        logResponse(name, content, Date.now() - start);
        return { content: [{ type: 'text', text: content }] };
      } catch (error) {
        logError(name, error as Error, Date.now() - start);
        throw error;
      }
    });
  }

  // User tools
  tool('get_user', 'Get the current user profile including athlete ID', getUserSchema.shape, () =>
    getUser(client)
  );

  tool(
    'get_athlete_id',
    'Get just the athlete ID for the current user',
    getAthleteIdSchema.shape,
    () => getAthleteId(client)
  );

  // Workout tools
  tool(
    'get_workouts',
    'Get a list of workouts within a date range',
    getWorkoutsSchema.shape,
    (args) => getWorkouts(client, args)
  );

  tool('get_workout', 'Get a single workout summary by ID', getWorkoutSchema.shape, (args) =>
    getWorkout(client, args)
  );

  tool(
    'get_workout_details',
    'Get detailed workout data including metrics, intervals, laps, and zones',
    getWorkoutDetailsSchema.shape,
    (args) => getWorkoutDetails(client, args)
  );

  tool(
    'search_workouts',
    'Search for workouts by title (case-insensitive substring match) within a number of days',
    searchWorkoutsSchema.shape,
    (args) => searchWorkouts(client, args)
  );

  tool(
    'compare_intervals',
    'Compare laps/intervals side-by-side across multiple workouts with optional power and duration filters',
    compareIntervalsSchema.shape,
    (args) => compareIntervals(client, args)
  );

  tool(
    'get_strength_workouts',
    'Get strength workouts within a date range (sets, blocks, exercises, compliance)',
    getStrengthWorkoutsSchema.shape,
    (args) => getStrengthWorkouts(client, args)
  );

  // File tools
  tool(
    'parse_fit_file',
    'Parse a FIT file and extract structured data (sessions, laps, records)',
    parseFitFileSchema.shape,
    (args) => parseFitFile(args)
  );

  // Fitness tools
  tool(
    'get_fitness_data',
    'Get fitness metrics (CTL, ATL, TSB) for a date range',
    getFitnessDataSchema.shape,
    (args) => getFitnessData(client, args)
  );

  tool(
    'get_current_fitness',
    'Get current fitness metrics (CTL, ATL, TSB) for today',
    getCurrentFitnessSchema.shape,
    () => getCurrentFitness(client)
  );

  // Peaks tools
  tool(
    'get_peaks',
    'Get peaks/personal records for a specific sport and type',
    getPeaksSchema.shape,
    (args) => getPeaks(client, args)
  );

  tool(
    'get_workout_peaks',
    'Get peaks/PRs achieved in a specific workout',
    getWorkoutPeaksSchema.shape,
    (args) => getWorkoutPeaks(client, args)
  );

  // Power analysis tools
  tool(
    'get_best_power',
    'Compute best power from raw FIT file for arbitrary durations (e.g., 3min, 8min, 45min)',
    getBestPowerSchema.shape,
    (args) => getBestPower(client, args)
  );

  tool(
    'get_power_duration_curve',
    'Build a power-duration curve across cycling workouts in a date range, finding best power at standardised durations via FIT file analysis',
    getPowerDurationCurveSchema.shape,
    (args) => getPowerDurationCurve(client, args)
  );

  // Decoupling tools
  tool(
    'get_aerobic_decoupling',
    'Calculate aerobic decoupling (Pw:Hr) from a workout FIT file — measures cardiac drift between first and second halves',
    getAerobicDecouplingSchema.shape,
    (args) => getAerobicDecoupling(client, args)
  );

  // Datetime tools
  tool(
    'get_current_date',
    'Get the current date in various formats (ISO, US, EU, custom)',
    getCurrentDateSchema.shape,
    (args) => getCurrentDate(args)
  );

  return server;
}
