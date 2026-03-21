import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  buildPowerDurationCurve,
  getBestPowerForWorkout,
} from "../../../src/services/workout-analysis/power.js";
import {
  createMockDataProvider,
  mockWorkoutSummary,
  mockWorkoutSummary2,
  mockWorkoutSummary3,
  mockStrengthWorkout,
  type MockDataProvider,
} from "../../mocks/client.js";
import type { IWorkoutDataProvider } from "../../../src/services/workout-analysis/types.js";

// Mock fit-analysis decoder
import * as decoderModule from "../../../src/services/fit-analysis/decoder.js";
vi.mock(
  "../../../src/services/fit-analysis/decoder.js",
  async (importOriginal) => {
    const actual = await importOriginal<typeof decoderModule>();
    return {
      ...actual,
      decodeFitBuffer: vi.fn(),
    };
  },
);
const mockDecodeFitBuffer = vi.mocked(decoderModule.decodeFitBuffer);

describe("services/workout-analysis/power", () => {
  describe("getBestPowerForWorkout", () => {
    let provider: MockDataProvider;

    beforeEach(() => {
      provider = createMockDataProvider();
    });

    function setupFitMock(recordMesgs: Record<string, unknown>[] | undefined) {
      mockDecodeFitBuffer.mockResolvedValue({ recordMesgs });
    }

    it("should return best power results", async () => {
      const records = Array.from({ length: 60 }, (_, i) => ({
        power: i < 30 ? 200 : 300,
      }));
      setupFitMock(records);

      const result = await getBestPowerForWorkout(
        provider as IWorkoutDataProvider,
        100,
        [10, 30],
      );

      expect(result.workoutId).toBe(100);
      expect(result.workoutDate).toBe(mockWorkoutSummary.workoutDay);
      expect(result.workoutTitle).toBe(mockWorkoutSummary.title);
      expect(result.totalRecords).toBe(60);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].durationSeconds).toBe(10);
      expect(result.results[0].bestPowerWatts).toBe(300);
      expect(result.results[1].durationSeconds).toBe(30);
    });

    it("should handle duration exceeding recording length", async () => {
      const records = Array.from({ length: 10 }, () => ({ power: 200 }));
      setupFitMock(records);

      const result = await getBestPowerForWorkout(
        provider as IWorkoutDataProvider,
        100,
        [20],
      );

      expect(result.results[0]).toEqual({
        durationSeconds: 20,
        bestPowerWatts: null,
        error: "Duration exceeds recording length",
      });
    });

    it("should throw when no activity file is available", async () => {
      provider.downloadActivityFile.mockResolvedValue(null);

      await expect(
        getBestPowerForWorkout(provider as IWorkoutDataProvider, 100, [10]),
      ).rejects.toThrow("No activity file available for workout 100");
    });

    it("should throw when no power data in records", async () => {
      const records = Array.from({ length: 10 }, () => ({ heartRate: 140 }));
      setupFitMock(records);

      await expect(
        getBestPowerForWorkout(provider as IWorkoutDataProvider, 100, [5]),
      ).rejects.toThrow("No power data found in workout records");
    });

    it("should throw when no record messages in FIT file", async () => {
      setupFitMock(undefined);

      await expect(
        getBestPowerForWorkout(provider as IWorkoutDataProvider, 100, [5]),
      ).rejects.toThrow("No record data found in FIT file");
    });

    it("should sort results by duration ascending", async () => {
      const records = Array.from({ length: 60 }, () => ({ power: 250 }));
      setupFitMock(records);

      const result = await getBestPowerForWorkout(
        provider as IWorkoutDataProvider,
        100,
        [30, 5, 15],
      );

      expect(result.results.map((r) => r.durationSeconds)).toEqual([5, 15, 30]);
    });
  });

  describe("buildPowerDurationCurve", () => {
    let provider: MockDataProvider;

    beforeEach(() => {
      provider = createMockDataProvider();
    });

    function setupFitMock(recordMesgs: Record<string, unknown>[] | undefined) {
      mockDecodeFitBuffer.mockResolvedValue({ recordMesgs });
    }

    it("should filter to cycling workouts only", async () => {
      provider.getWorkouts.mockResolvedValue([
        mockWorkoutSummary, // Bike
        mockWorkoutSummary3, // Run
        mockStrengthWorkout, // Strength
      ]);
      const records = Array.from({ length: 60 }, () => ({ power: 250 }));
      setupFitMock(records);

      const result = await buildPowerDurationCurve(
        provider as IWorkoutDataProvider,
        {
          startDate: "2024-01-01",
          endDate: "2024-01-31",
          durations: [5],
        },
      );

      expect(result.workoutsAnalysed).toBe(1);
      expect(provider.downloadActivityFile).toHaveBeenCalledTimes(1);
      expect(provider.downloadActivityFile).toHaveBeenCalledWith(
        mockWorkoutSummary.workoutId,
      );
    });

    it("should exclude specified workout IDs", async () => {
      provider.getWorkouts.mockResolvedValue([
        mockWorkoutSummary,
        mockWorkoutSummary2,
      ]);
      const records = Array.from({ length: 60 }, () => ({ power: 200 }));
      setupFitMock(records);

      const result = await buildPowerDurationCurve(
        provider as IWorkoutDataProvider,
        {
          startDate: "2024-01-01",
          endDate: "2024-01-31",
          durations: [5],
          exclude_workout_ids: [mockWorkoutSummary.workoutId],
        },
      );

      expect(result.workoutsAnalysed).toBe(1);
      expect(provider.downloadActivityFile).toHaveBeenCalledWith(
        mockWorkoutSummary2.workoutId,
      );
      expect(provider.downloadActivityFile).not.toHaveBeenCalledWith(
        mockWorkoutSummary.workoutId,
      );
    });

    it("should find best power across multiple workouts", async () => {
      provider.getWorkouts.mockResolvedValue([
        mockWorkoutSummary,
        mockWorkoutSummary2,
      ]);

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

      const result = await buildPowerDurationCurve(
        provider as IWorkoutDataProvider,
        {
          startDate: "2024-01-01",
          endDate: "2024-01-31",
          durations: [5, 10],
        },
      );

      expect(result.curve).toHaveLength(2);
      expect(result.curve[0].bestPowerWatts).toBe(350);
      expect(result.curve[0].workoutId).toBe(mockWorkoutSummary2.workoutId);
      expect(result.curve[1].bestPowerWatts).toBe(350);
    });

    it("should return empty curve when no workouts found", async () => {
      provider.getWorkouts.mockResolvedValue([]);

      const result = await buildPowerDurationCurve(
        provider as IWorkoutDataProvider,
        {
          startDate: "2024-01-01",
          endDate: "2024-01-31",
          durations: [5],
        },
      );

      expect(result.workoutsAnalysed).toBe(0);
      expect(result.curve).toEqual([]);
      expect(result.warnings).toEqual([]);
    });

    it("should warn for workouts with no power data", async () => {
      provider.getWorkouts.mockResolvedValue([mockWorkoutSummary]);
      const records = Array.from({ length: 60 }, () => ({ heartRate: 140 }));
      setupFitMock(records);

      const result = await buildPowerDurationCurve(
        provider as IWorkoutDataProvider,
        {
          startDate: "2024-01-01",
          endDate: "2024-01-31",
          durations: [5],
        },
      );

      expect(result.workoutsAnalysed).toBe(0);
      expect(result.workoutsSkipped).toBe(1);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain("no power data");
    });

    it("should include duration labels in curve points", async () => {
      provider.getWorkouts.mockResolvedValue([mockWorkoutSummary]);
      const records = Array.from({ length: 1300 }, () => ({ power: 250 }));
      setupFitMock(records);

      const result = await buildPowerDurationCurve(
        provider as IWorkoutDataProvider,
        {
          startDate: "2024-01-01",
          endDate: "2024-01-31",
          durations: [5, 90, 300, 1200],
        },
      );

      expect(result.curve.map((p) => p.durationLabel)).toEqual([
        "5s",
        "1min 30s",
        "5min",
        "20min",
      ]);
    });

    it("should skip durations where no workout has enough data", async () => {
      provider.getWorkouts.mockResolvedValue([mockWorkoutSummary]);
      const records = Array.from({ length: 10 }, () => ({ power: 250 }));
      setupFitMock(records);

      const result = await buildPowerDurationCurve(
        provider as IWorkoutDataProvider,
        {
          startDate: "2024-01-01",
          endDate: "2024-01-31",
          durations: [5, 60],
        },
      );

      expect(result.curve).toHaveLength(1);
      expect(result.curve[0].durationSeconds).toBe(5);
    });
  });
});
