/**
 * Integration tests for all MCP tool handlers against real TrainingPeaks API.
 *
 * Prerequisites:
 * - Create .env file with TP_USERNAME and TP_PASSWORD
 * - Run: npx playwright install chromium
 * - Optional: set TP_TEST_BIKE_WORKOUT_ID (a Bike workout with FIT file + power + HR)
 *
 * Run with: npm run test:integration
 */
import 'dotenv/config';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TrainingPeaksClient } from '../../src/index.js';

// Tool handlers
import { getUser, getAthleteId } from '../../src/mcp/tools/user.js';
import {
  getWorkouts,
  getWorkout,
  getWorkoutDetails,
  getStrengthWorkouts,
  searchWorkouts,
  compareIntervals,
} from '../../src/mcp/tools/workouts.js';
import { getFitnessData, getCurrentFitness } from '../../src/mcp/tools/fitness.js';
import { getPeaks, getWorkoutPeaks } from '../../src/mcp/tools/peaks.js';
import { getBestPower, getPowerDurationCurve } from '../../src/mcp/tools/power.js';
import { getAerobicDecoupling } from '../../src/mcp/tools/decoupling.js';
import { parseFitFile } from '../../src/mcp/tools/files.js';
import { getCurrentDate } from '../../src/mcp/tools/datetime.js';

const hasCredentials = process.env.TP_USERNAME && process.env.TP_PASSWORD;
const bikeWorkoutId = process.env.TP_TEST_BIKE_WORKOUT_ID
  ? Number(process.env.TP_TEST_BIKE_WORKOUT_ID)
  : undefined;

describe.skipIf(!hasCredentials)('MCP Tools Integration', () => {
  let client: TrainingPeaksClient;

  // Date helpers
  const today = new Date().toISOString().split('T')[0];
  const daysAgo = (n: number) =>
    new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  beforeAll(async () => {
    client = new TrainingPeaksClient();
    await client.getAthleteId(); // warm up auth
  }, 120000);

  afterAll(async () => {
    await client.close();
  });

  // --- User tools ---

  describe('get_user', () => {
    it('returns JSON with id, email, firstName', async () => {
      const raw = await getUser(client);
      const data = JSON.parse(raw);

      expect(data.id).toBeTypeOf('number');
      expect(data.email).toBeTypeOf('string');
      expect(data.firstName).toBeTypeOf('string');
    });
  });

  describe('get_athlete_id', () => {
    it('returns athleteId > 0', async () => {
      const raw = await getAthleteId(client);
      const data = JSON.parse(raw);

      expect(data.athleteId).toBeTypeOf('number');
      expect(data.athleteId).toBeGreaterThan(0);
    });
  });

  // --- Workout tools ---

  describe('get_workouts', () => {
    it('returns JSON array for 30-day range', async () => {
      const raw = await getWorkouts(client, { startDate: daysAgo(30), endDate: today });
      const data = JSON.parse(raw);

      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('get_workout', () => {
    it('returns JSON with workoutId matching input', async () => {
      // Find a recent workout first
      const listRaw = await getWorkouts(client, { startDate: daysAgo(90), endDate: today });
      const list = JSON.parse(listRaw);
      if (list.length === 0) return;

      const raw = await getWorkout(client, { workoutId: list[0].workoutId });
      const data = JSON.parse(raw);

      expect(data.workoutId).toBe(list[0].workoutId);
    });
  });

  describe('get_workout_details', () => {
    it('returns JSON with workoutId and metrics', async () => {
      const listRaw = await getWorkouts(client, { startDate: daysAgo(90), endDate: today });
      const list = JSON.parse(listRaw);
      if (list.length === 0) return;

      const raw = await getWorkoutDetails(client, { workoutId: list[0].workoutId });
      const data = JSON.parse(raw);

      expect(data.workoutId).toBe(list[0].workoutId);
    });
  });

  describe('get_strength_workouts', () => {
    it('returns JSON array', async () => {
      const raw = await getStrengthWorkouts(client, {
        startDate: daysAgo(90),
        endDate: today,
      });
      const data = JSON.parse(raw);

      expect(Array.isArray(data)).toBe(true);
    });
  });

  // --- Search & compare tools ---

  describe('search_workouts', () => {
    it('returns matching workouts for known title', async () => {
      // First find any workout title to use as search term
      const listRaw = await getWorkouts(client, { startDate: daysAgo(90), endDate: today });
      const list = JSON.parse(listRaw);
      const titled = list.find((w: { title?: string }) => w.title && w.title.length > 3);
      if (!titled) return;

      // Search using first 4 chars of a known title
      const query = titled.title.slice(0, 4);
      const raw = await searchWorkouts(client, { title: query, days: 90 });
      const data = JSON.parse(raw);

      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
      for (const w of data) {
        expect(w.title.toLowerCase()).toContain(query.toLowerCase());
      }
    });

    it('returns empty array for gibberish search', async () => {
      const raw = await searchWorkouts(client, { title: 'zzzqqqxxx999', days: 90 });
      const data = JSON.parse(raw);

      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(0);
    });
  });

  describe('compare_intervals', () => {
    it.skipIf(!bikeWorkoutId)('returns laps and summaries', async () => {
      const raw = await compareIntervals(client, { workoutIds: [bikeWorkoutId!], durationTolerance: 2 });
      const data = JSON.parse(raw);

      expect(Array.isArray(data.laps)).toBe(true);
      expect(Array.isArray(data.summaries)).toBe(true);
      expect(data.summaries.length).toBe(1);
      expect(data.summaries[0].workoutId).toBe(bikeWorkoutId);
    });
  });

  // --- Fitness tools ---

  describe('get_fitness_data', () => {
    it('returns JSON array with ctl, atl, tsb', async () => {
      const raw = await getFitnessData(client, { startDate: daysAgo(7), endDate: today });
      const data = JSON.parse(raw);

      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
      expect(data[0].ctl).toBeTypeOf('number');
      expect(data[0].atl).toBeTypeOf('number');
      expect(data[0].tsb).toBeTypeOf('number');
    });
  });

  describe('get_current_fitness', () => {
    it('returns JSON with ctl, atl, tsb, date', async () => {
      const raw = await getCurrentFitness(client);
      const data = JSON.parse(raw);

      expect(data.ctl).toBeTypeOf('number');
      expect(data.atl).toBeTypeOf('number');
      expect(data.tsb).toBeTypeOf('number');
      expect(data.date).toBeTypeOf('string');
    });
  });

  // --- Peaks tools ---

  describe('get_peaks', () => {
    it('returns JSON array for Bike/power5min', async () => {
      const raw = await getPeaks(client, { sport: 'Bike', type: 'power5min' });
      const data = JSON.parse(raw);

      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('get_workout_peaks', () => {
    it('returns personalRecordCount and personalRecords', async () => {
      const listRaw = await getWorkouts(client, { startDate: daysAgo(90), endDate: today });
      const list = JSON.parse(listRaw);
      if (list.length === 0) return;

      const raw = await getWorkoutPeaks(client, { workoutId: list[0].workoutId });
      const data = JSON.parse(raw);

      expect(data.personalRecordCount).toBeTypeOf('number');
      expect(Array.isArray(data.personalRecords)).toBe(true);
    });
  });

  // --- Power tools ---

  describe('get_best_power', () => {
    it.skipIf(!bikeWorkoutId)('computes best power at multiple durations', async () => {
      const raw = await getBestPower(client, {
        workoutId: bikeWorkoutId!,
        durations: [5, 60, 300],
      });
      const data = JSON.parse(raw);

      expect(data.workoutId).toBe(bikeWorkoutId);
      expect(Array.isArray(data.results)).toBe(true);
      expect(data.results.length).toBe(3);
      // Results should be sorted by duration ascending
      expect(data.results[0].durationSeconds).toBe(5);
      expect(data.results[1].durationSeconds).toBe(60);
      expect(data.results[2].durationSeconds).toBe(300);
      for (const r of data.results) {
        if (r.bestPowerWatts !== null) {
          expect(r.bestPowerWatts).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('get_power_duration_curve', () => {
    it('returns curve with workoutsAnalysed and durationLabel', async () => {
      const raw = await getPowerDurationCurve(client, {
        startDate: daysAgo(90),
        endDate: today,
        durations: [5, 60, 300],
      });
      const data = JSON.parse(raw);

      expect(data.workoutsAnalysed).toBeTypeOf('number');
      expect(data.workoutsAnalysed).toBeGreaterThan(0);
      expect(Array.isArray(data.curve)).toBe(true);
      expect(data.curve.length).toBeGreaterThan(0);
      expect(data.curve[0].durationLabel).toBeTypeOf('string');
      expect(data.curve[0].bestPowerWatts).toBeTypeOf('number');
      expect(data.curve[0].workoutId).toBeTypeOf('number');
    });
  });

  // --- Decoupling tool ---

  describe('get_aerobic_decoupling', () => {
    it.skipIf(!bikeWorkoutId)('returns decoupling analysis', async () => {
      const raw = await getAerobicDecoupling(client, { workoutId: bikeWorkoutId! });
      const data = JSON.parse(raw);

      expect(data.decouplingPercent).toBeTypeOf('number');
      expect(data.firstHalf).toBeDefined();
      expect(data.firstHalf.avgPower).toBeTypeOf('number');
      expect(data.firstHalf.avgHR).toBeTypeOf('number');
      expect(data.firstHalf.hrPowerRatio).toBeTypeOf('number');
      expect(data.secondHalf).toBeDefined();
      expect(data.secondHalf.avgPower).toBeTypeOf('number');
      expect(data.secondHalf.avgHR).toBeTypeOf('number');
      expect(data.secondHalf.hrPowerRatio).toBeTypeOf('number');
      expect([
        'Good aerobic fitness — minimal cardiac drift',
        'Moderate decoupling — aerobic endurance developing',
        'High decoupling — aerobic base needs work',
      ]).toContain(data.interpretation);
    });
  });

  // --- FIT file tool ---

  describe('parse_fit_file', () => {
    it.skipIf(!bikeWorkoutId)('parses a downloaded FIT file', async () => {
      // Download FIT via client, write to temp file, pass to handler
      const buffer = await client.downloadActivityFile(bikeWorkoutId!);
      expect(buffer).not.toBeNull();

      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tp-fit-'));
      const tmpFile = path.join(tmpDir, 'test.fit');
      await fs.writeFile(tmpFile, buffer!);

      try {
        const raw = await parseFitFile({ filePath: tmpFile });
        const data = JSON.parse(raw);

        expect(Array.isArray(data.sessions)).toBe(true);
        expect(data.sessions.length).toBeGreaterThan(0);
        expect(Array.isArray(data.laps)).toBe(true);
        expect(data.recordCount).toBeTypeOf('number');
        expect(data.recordCount).toBeGreaterThan(0);
      } finally {
        await fs.rm(tmpDir, { recursive: true, force: true });
      }
    });
  });

  // --- Datetime tool ---

  describe('get_current_date', () => {
    it('returns ISO date matching YYYY-MM-DD', async () => {
      const raw = await getCurrentDate({ format: 'iso' });
      const data = JSON.parse(raw);

      expect(data.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
}, 120000);
