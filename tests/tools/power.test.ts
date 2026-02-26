import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  computeBestPower,
  getBestPower,
  formatDuration,
  buildPowerDurationCurve,
} from '../../src/mcp/tools/power.js';
import {
  createMockClient,
  mockWorkoutSummary,
  mockWorkoutSummary2,
  mockWorkoutSummary3,
  mockStrengthWorkout,
  type MockClient,
} from '../mocks/client.js';
import type { TrainingPeaksClient } from '../../src/index.js';

// Mock fit-utils
import * as fitUtils from '../../src/mcp/tools/fit-utils.js';
vi.mock('../../src/mcp/tools/fit-utils.js');
const mockDecodeFitBuffer = vi.mocked(fitUtils.decodeFitBuffer);

describe('power tools', () => {
  describe('computeBestPower', () => {
    it('should find the best average power and start index', () => {
      const powerStream = [100, 100, 100, 200, 300, 400, 300, 200, 100, 100];
      const result = computeBestPower(powerStream, 3);

      // Best 3s window: [300, 400, 300] starting at index 4 → avg 333
      expect(result).toEqual({ bestPower: 333, startIndex: 4 });
    });

    it('should return null when duration exceeds array length', () => {
      const powerStream = [100, 200, 300];
      const result = computeBestPower(powerStream, 5);

      expect(result).toBeNull();
    });

    it('should return 0 for all-zero power stream', () => {
      const powerStream = [0, 0, 0, 0, 0];
      const result = computeBestPower(powerStream, 3);

      expect(result).toEqual({ bestPower: 0, startIndex: 0 });
    });

    it('should handle single-element duration', () => {
      const powerStream = [100, 200, 300, 150];
      const result = computeBestPower(powerStream, 1);

      expect(result).toEqual({ bestPower: 300, startIndex: 2 });
    });

    it('should handle duration equal to array length', () => {
      const powerStream = [100, 200, 300];
      const result = computeBestPower(powerStream, 3);

      expect(result).toEqual({ bestPower: 200, startIndex: 0 });
    });
  });

  describe('getBestPower', () => {
    let mockClient: MockClient;

    beforeEach(() => {
      mockClient = createMockClient();
    });

    function setupFitMock(recordMesgs: Record<string, unknown>[] | undefined) {
      mockDecodeFitBuffer.mockResolvedValue({ recordMesgs });
    }

    it('should return best power results', async () => {
      const records = Array.from({ length: 60 }, (_, i) => ({
        power: i < 30 ? 200 : 300,
      }));
      setupFitMock(records);

      const result = await getBestPower(mockClient as unknown as TrainingPeaksClient, {
        workoutId: 100,
        durations: [10, 30],
      });
      const parsed = JSON.parse(result);

      expect(parsed.workoutId).toBe(100);
      expect(parsed.workoutDate).toBe(mockWorkoutSummary.workoutDay);
      expect(parsed.workoutTitle).toBe(mockWorkoutSummary.title);
      expect(parsed.totalRecords).toBe(60);
      expect(parsed.results).toHaveLength(2);
      expect(parsed.results[0].durationSeconds).toBe(10);
      expect(parsed.results[0].bestPowerWatts).toBe(300);
      expect(parsed.results[1].durationSeconds).toBe(30);
    });

    it('should handle duration exceeding recording length', async () => {
      const records = Array.from({ length: 10 }, () => ({ power: 200 }));
      setupFitMock(records);

      const result = await getBestPower(mockClient as unknown as TrainingPeaksClient, {
        workoutId: 100,
        durations: [20],
      });
      const parsed = JSON.parse(result);

      expect(parsed.results[0]).toEqual({
        durationSeconds: 20,
        bestPowerWatts: null,
        error: 'Duration exceeds recording length',
      });
    });

    it('should throw when no activity file is available', async () => {
      mockClient.downloadActivityFile.mockResolvedValue(null);

      await expect(
        getBestPower(mockClient as unknown as TrainingPeaksClient, {
          workoutId: 100,
          durations: [10],
        })
      ).rejects.toThrow('No activity file available for workout 100');
    });

    it('should throw when no power data in records', async () => {
      const records = Array.from({ length: 10 }, () => ({ heartRate: 140 }));
      setupFitMock(records);

      await expect(
        getBestPower(mockClient as unknown as TrainingPeaksClient, {
          workoutId: 100,
          durations: [5],
        })
      ).rejects.toThrow('No power data found in workout records');
    });

    it('should throw when no record messages in FIT file', async () => {
      setupFitMock(undefined);

      await expect(
        getBestPower(mockClient as unknown as TrainingPeaksClient, {
          workoutId: 100,
          durations: [5],
        })
      ).rejects.toThrow('No record data found in FIT file');
    });

    it('should sort results by duration ascending', async () => {
      const records = Array.from({ length: 60 }, () => ({ power: 250 }));
      setupFitMock(records);

      const result = await getBestPower(mockClient as unknown as TrainingPeaksClient, {
        workoutId: 100,
        durations: [30, 5, 15],
      });
      const parsed = JSON.parse(result);

      expect(parsed.results.map((r: { durationSeconds: number }) => r.durationSeconds)).toEqual([
        5, 15, 30,
      ]);
    });
  });

  describe('formatDuration', () => {
    it('should format seconds only', () => {
      expect(formatDuration(5)).toBe('5s');
      expect(formatDuration(30)).toBe('30s');
    });

    it('should format exact minutes', () => {
      expect(formatDuration(60)).toBe('1min');
      expect(formatDuration(300)).toBe('5min');
      expect(formatDuration(1200)).toBe('20min');
    });

    it('should format minutes and seconds', () => {
      expect(formatDuration(90)).toBe('1min 30s');
      expect(formatDuration(150)).toBe('2min 30s');
    });
  });

  describe('buildPowerDurationCurve', () => {
    let mockClient: MockClient;

    beforeEach(() => {
      mockClient = createMockClient();
    });

    function setupFitMock(recordMesgs: Record<string, unknown>[] | undefined) {
      mockDecodeFitBuffer.mockResolvedValue({ recordMesgs });
    }

    it('should filter to cycling workouts only', async () => {
      // Return a mix of cycling and non-cycling workouts
      mockClient.getWorkouts.mockResolvedValue([
        mockWorkoutSummary, // Bike
        mockWorkoutSummary3, // Run
        mockStrengthWorkout, // Strength
      ]);
      const records = Array.from({ length: 60 }, () => ({ power: 250 }));
      setupFitMock(records);

      const result = await buildPowerDurationCurve(mockClient as unknown as TrainingPeaksClient, {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        durations: [5],
      });

      expect(result.workoutsAnalysed).toBe(1);
      // Only downloaded FIT for the Bike workout
      expect(mockClient.downloadActivityFile).toHaveBeenCalledTimes(1);
      expect(mockClient.downloadActivityFile).toHaveBeenCalledWith(mockWorkoutSummary.workoutId);
    });

    it('should exclude specified workout IDs', async () => {
      mockClient.getWorkouts.mockResolvedValue([mockWorkoutSummary, mockWorkoutSummary2]);
      const records = Array.from({ length: 60 }, () => ({ power: 200 }));
      setupFitMock(records);

      const result = await buildPowerDurationCurve(mockClient as unknown as TrainingPeaksClient, {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        durations: [5],
        exclude_workout_ids: [mockWorkoutSummary.workoutId],
      });

      expect(result.workoutsAnalysed).toBe(1);
      expect(mockClient.downloadActivityFile).toHaveBeenCalledWith(mockWorkoutSummary2.workoutId);
      expect(mockClient.downloadActivityFile).not.toHaveBeenCalledWith(
        mockWorkoutSummary.workoutId
      );
    });

    it('should find best power across multiple workouts', async () => {
      mockClient.getWorkouts.mockResolvedValue([mockWorkoutSummary, mockWorkoutSummary2]);

      // First workout: lower power, second: higher power
      let callCount = 0;
      mockDecodeFitBuffer.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return {
            recordMesgs: Array.from({ length: 60 }, () => ({ power: 200 })),
          };
        }
        return {
          recordMesgs: Array.from({ length: 60 }, () => ({ power: 350 })),
        };
      });

      const result = await buildPowerDurationCurve(mockClient as unknown as TrainingPeaksClient, {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        durations: [5, 10],
      });

      expect(result.curve).toHaveLength(2);
      expect(result.curve[0].bestPowerWatts).toBe(350);
      expect(result.curve[0].workoutId).toBe(mockWorkoutSummary2.workoutId);
      expect(result.curve[1].bestPowerWatts).toBe(350);
    });

    it('should return empty curve when no workouts found', async () => {
      mockClient.getWorkouts.mockResolvedValue([]);

      const result = await buildPowerDurationCurve(mockClient as unknown as TrainingPeaksClient, {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        durations: [5],
      });

      expect(result.workoutsAnalysed).toBe(0);
      expect(result.curve).toEqual([]);
      expect(result.warnings).toEqual([]);
    });

    it('should warn for workouts with no power data', async () => {
      mockClient.getWorkouts.mockResolvedValue([mockWorkoutSummary]);
      const records = Array.from({ length: 60 }, () => ({ heartRate: 140 }));
      setupFitMock(records);

      const result = await buildPowerDurationCurve(mockClient as unknown as TrainingPeaksClient, {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        durations: [5],
      });

      expect(result.workoutsAnalysed).toBe(0);
      expect(result.workoutsSkipped).toBe(1);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('no power data');
    });

    it('should include duration labels in curve points', async () => {
      mockClient.getWorkouts.mockResolvedValue([mockWorkoutSummary]);
      const records = Array.from({ length: 1300 }, () => ({ power: 250 }));
      setupFitMock(records);

      const result = await buildPowerDurationCurve(mockClient as unknown as TrainingPeaksClient, {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        durations: [5, 90, 300, 1200],
      });

      expect(result.curve.map((p) => p.durationLabel)).toEqual([
        '5s',
        '1min 30s',
        '5min',
        '20min',
      ]);
    });

    it('should skip durations where no workout has enough data', async () => {
      mockClient.getWorkouts.mockResolvedValue([mockWorkoutSummary]);
      // Only 10 seconds of data
      const records = Array.from({ length: 10 }, () => ({ power: 250 }));
      setupFitMock(records);

      const result = await buildPowerDurationCurve(mockClient as unknown as TrainingPeaksClient, {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        durations: [5, 60],
      });

      expect(result.curve).toHaveLength(1);
      expect(result.curve[0].durationSeconds).toBe(5);
    });
  });
});
