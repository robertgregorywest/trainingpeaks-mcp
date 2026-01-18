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

  describe('Peaks API', () => {
    it('getAllPeaks returns peaks for Bike', async () => {
      try {
        const peaks = await client.getAllPeaks('Bike');
        expect(peaks).toBeDefined();
        expect(peaks.sport).toBe('Bike');
        expect(Array.isArray(peaks.peaks)).toBe(true);
      } catch (error) {
        // Peaks API may not be available for all users
        if ((error as Error).message?.includes('Not Found')) {
          console.log('Peaks API not available - skipping');
          return;
        }
        throw error;
      }
    });

    it('getAllPeaks returns peaks for Run', async () => {
      try {
        const peaks = await client.getAllPeaks('Run');
        expect(peaks).toBeDefined();
        expect(peaks.sport).toBe('Run');
        expect(Array.isArray(peaks.peaks)).toBe(true);
      } catch (error) {
        if ((error as Error).message?.includes('Not Found')) {
          console.log('Peaks API not available - skipping');
          return;
        }
        throw error;
      }
    });

    it('getPeaks returns specific peak type', async () => {
      try {
        const peaks = await client.getPeaks('Bike', 'power5min');
        expect(peaks).toBeDefined();
        expect(peaks.sport).toBe('Bike');
        expect(Array.isArray(peaks.peaks)).toBe(true);
      } catch (error) {
        if ((error as Error).message?.includes('Not Found')) {
          console.log('Peaks API not available - skipping');
          return;
        }
        throw error;
      }
    });

    it('getPowerPeaks returns cycling power peaks', async () => {
      try {
        const peaks = await client.getPowerPeaks();
        expect(Array.isArray(peaks)).toBe(true);
      } catch (error) {
        if ((error as Error).message?.includes('Not Found')) {
          console.log('Peaks API not available - skipping');
          return;
        }
        throw error;
      }
    });

    it('getRunningPeaks returns running pace peaks', async () => {
      try {
        const peaks = await client.getRunningPeaks();
        expect(Array.isArray(peaks)).toBe(true);
      } catch (error) {
        if ((error as Error).message?.includes('Not Found')) {
          console.log('Peaks API not available - skipping');
          return;
        }
        throw error;
      }
    });

    it('getWorkoutPeaks returns peaks for specific workout', async () => {
      try {
        // First get a workout ID
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
        expect(Array.isArray(peaks.peaks)).toBe(true);
      } catch (error) {
        if ((error as Error).message?.includes('Not Found')) {
          console.log('Peaks API not available - skipping');
          return;
        }
        throw error;
      }
    });
  });

  describe('Files API', () => {
    it('downloadFitFile returns buffer for workout with file', async () => {
      // Find a workout that has a FIT file
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const workouts = await client.getWorkouts(startDate, endDate);

      const workoutWithFile = workouts.find((w) => w.hasFile);
      if (!workoutWithFile) {
        console.log('No workouts with FIT files found');
        return;
      }

      const buffer = await client.downloadFitFile(workoutWithFile.workoutId);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
      // FIT files start with specific header bytes
      expect(buffer[0]).toBe(14); // Header size
    });
  });
}, 60000); // 60 second timeout for the entire suite
