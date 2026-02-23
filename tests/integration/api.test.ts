/**
 * Integration tests that make real API calls to TrainingPeaks.
 *
 * Prerequisites:
 * - Create .env file with TP_USERNAME and TP_PASSWORD
 * - Run: npx playwright install chromium
 *
 * Run with: npm run test:integration
 */
import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TrainingPeaksClient } from '../../src/index.js';

// Skip if credentials not available
const hasCredentials = process.env.TP_USERNAME && process.env.TP_PASSWORD;

describe.skipIf(!hasCredentials)('TrainingPeaks API Integration', () => {
  let client: TrainingPeaksClient;

  beforeAll(async () => {
    client = new TrainingPeaksClient();
    // Warm up auth by making a simple request
    await client.getAthleteId();
  }, 120000); // 2 minute timeout for initial auth

  afterAll(async () => {
    await client.close();
  });

  describe('User API', () => {
    it('getUser returns user profile', async () => {
      const user = await client.getUser();

      expect(user).toBeDefined();
      expect(user.id).toBeTypeOf('number');
      expect(user.athleteId).toBeTypeOf('number');
      expect(user.email).toBeTypeOf('string');
      expect(user.firstName).toBeTypeOf('string');
      expect(user.lastName).toBeTypeOf('string');
    });

    it('getAthleteId returns numeric ID', async () => {
      const athleteId = await client.getAthleteId();

      expect(athleteId).toBeTypeOf('number');
      expect(athleteId).toBeGreaterThan(0);
    });
  });

  describe('Workouts API', () => {
    it('getWorkouts returns array for date range', async () => {
      // Get workouts from last 30 days
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const workouts = await client.getWorkouts(startDate, endDate);

      expect(Array.isArray(workouts)).toBe(true);
      // May be empty if no workouts in range
      if (workouts.length > 0) {
        expect(workouts[0].workoutId).toBeTypeOf('number');
        expect(workouts[0].athleteId).toBeTypeOf('number');
        expect(workouts[0].workoutDay).toBeTypeOf('string');
      }
    });

    it('getWorkout returns single workout', async () => {
      // First get a workout ID from recent workouts
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const workouts = await client.getWorkouts(startDate, endDate);

      if (workouts.length === 0) {
        console.log('No workouts found to test getWorkout');
        return;
      }

      const workout = await client.getWorkout(workouts[0].workoutId);

      expect(workout).toBeDefined();
      expect(workout.workoutId).toBe(workouts[0].workoutId);
    });

    it('getWorkoutDetails returns detailed metrics', async () => {
      // First get a workout ID from recent workouts
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const workouts = await client.getWorkouts(startDate, endDate);

      if (workouts.length === 0) {
        console.log('No workouts found to test getWorkoutDetails');
        return;
      }

      const details = await client.getWorkoutDetails(workouts[0].workoutId);

      expect(details).toBeDefined();
      expect(details.workoutId).toBe(workouts[0].workoutId);
      // Details may include metrics, intervals, laps depending on workout type
    });
  });

  describe('Fitness API', () => {
    it('getCurrentFitness returns CTL/ATL/TSB', async () => {
      const fitness = await client.getCurrentFitness();

      expect(fitness).toBeDefined();
      expect(fitness.date).toBeTypeOf('string');
      expect(fitness.ctl).toBeTypeOf('number');
      expect(fitness.atl).toBeTypeOf('number');
      expect(fitness.tsb).toBeTypeOf('number');
    });

    it('getFitnessData returns array for date range', async () => {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const fitnessData = await client.getFitnessData(startDate, endDate);

      expect(Array.isArray(fitnessData)).toBe(true);
      expect(fitnessData.length).toBeGreaterThan(0);
      expect(fitnessData[0].ctl).toBeTypeOf('number');
    });
  });

  describe('Strength Workouts API', () => {
    it('getStrengthWorkouts returns array', async () => {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const workouts = await client.getStrengthWorkouts(startDate, endDate);

      expect(Array.isArray(workouts)).toBe(true);
      if (workouts.length > 0) {
        expect(workouts[0].workoutId).toBeTypeOf('string');
        expect(workouts[0].workoutType).toBe('StructuredStrength');
        expect(Array.isArray(workouts[0].exercises)).toBe(true);
      }
    });
  });

  describe('Activity Files API', () => {
    const bikeWorkoutId = process.env.TP_TEST_BIKE_WORKOUT_ID
      ? Number(process.env.TP_TEST_BIKE_WORKOUT_ID)
      : undefined;

    it.skipIf(!bikeWorkoutId)('downloadActivityFile returns Buffer for workout with file', async () => {
      const buffer = await client.downloadActivityFile(bikeWorkoutId!);

      expect(buffer).not.toBeNull();
      expect(buffer!.length).toBeGreaterThan(0);
    });

    it('downloadActivityFile throws for non-existent workout', async () => {
      // The API returns 403 for workout IDs that don't belong to the user
      await expect(client.downloadActivityFile(999999999)).rejects.toThrow();
    });
  });

  describe('Power Duration Curve API', () => {
    const bikeWorkoutId = process.env.TP_TEST_BIKE_WORKOUT_ID
      ? Number(process.env.TP_TEST_BIKE_WORKOUT_ID)
      : undefined;

    it.skipIf(!bikeWorkoutId)('getPowerDurationCurve returns curve data', async () => {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const result = await client.getPowerDurationCurve({ startDate, endDate });

      expect(result.workoutsAnalysed).toBeTypeOf('number');
      expect(Array.isArray(result.curve)).toBe(true);
      if (result.curve.length > 0) {
        expect(result.curve[0].durationSeconds).toBeTypeOf('number');
        expect(result.curve[0].bestPowerWatts).toBeTypeOf('number');
      }
    });
  });

  describe('Aerobic Decoupling API', () => {
    const bikeWorkoutId = process.env.TP_TEST_BIKE_WORKOUT_ID
      ? Number(process.env.TP_TEST_BIKE_WORKOUT_ID)
      : undefined;

    it.skipIf(!bikeWorkoutId)('getAerobicDecoupling returns decoupling data', async () => {
      const result = await client.getAerobicDecoupling(bikeWorkoutId!);

      expect(result.decouplingPercent).toBeTypeOf('number');
      expect(result.firstHalf).toBeDefined();
      expect(result.secondHalf).toBeDefined();
      expect(result.interpretation).toBeTypeOf('string');
    });
  });

  describe('Peaks API', () => {
    it('getPeaks returns power peaks for Bike', async () => {
      const peaks = await client.getPeaks('Bike', 'power5min');
      expect(Array.isArray(peaks)).toBe(true);
      if (peaks.length > 0) {
        expect(peaks[0].value).toBeTypeOf('number');
        expect(peaks[0].type).toBeTypeOf('string');
      }
    });

    it('getPeaks returns HR peaks for Bike', async () => {
      const peaks = await client.getPeaks('Bike', 'hR5min');
      expect(Array.isArray(peaks)).toBe(true);
    });

    it('getWorkoutPeaks returns peaks for specific workout', async () => {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const workouts = await client.getWorkouts(startDate, endDate);

      if (workouts.length === 0) {
        console.log('No workouts found to test getWorkoutPeaks');
        return;
      }

      const peaks = await client.getWorkoutPeaks(workouts[0].workoutId);
      expect(peaks).toBeDefined();
      expect(peaks.workoutId).toBe(workouts[0].workoutId);
      expect(peaks.personalRecordCount).toBeTypeOf('number');
      expect(Array.isArray(peaks.personalRecords)).toBe(true);
    });
  });

}, 60000); // 60 second timeout for the entire suite
