import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  parseLapsFromFit,
  filterLaps,
  buildSummary,
  compareIntervalsForWorkouts,
} from "../../src/api/intervals.js";
import {
  createMockClient,
  mockWorkoutDetail,
  mockWorkoutDetail2,
  mockWorkoutDetailNoLaps,
  type MockClient,
} from "../mocks/client.js";
import type { TrainingPeaksClient } from "../../src/index.js";
import type { WorkoutLap } from "../../src/types.js";

// Mock fit module
import * as fitModule from "../../src/api/fit.js";
vi.mock("../../src/api/fit.js", async (importOriginal) => {
  const actual = await importOriginal<typeof fitModule>();
  return {
    ...actual,
    decodeFitBuffer: vi.fn(),
  };
});
const mockDecodeFitBuffer = vi.mocked(fitModule.decodeFitBuffer);

function setupFitMock(lapMesgs: Record<string, unknown>[]) {
  mockDecodeFitBuffer.mockResolvedValue({ lapMesgs });
}

function setupFitMockInvalid() {
  mockDecodeFitBuffer.mockRejectedValue(new Error("Not a valid FIT file"));
}

describe("api/intervals", () => {
  describe("parseLapsFromFit", () => {
    it("should parse FIT lap messages into WorkoutLap array", async () => {
      setupFitMock([
        {
          avgPower: 200,
          maxPower: 400,
          totalElapsedTime: 1800,
          totalDistance: 20000,
          avgHeartRate: 145,
          maxHeartRate: 170,
          avgCadence: 85,
        },
        {
          avgPower: 230,
          maxPower: 480,
          totalElapsedTime: 1800,
          totalDistance: 20000,
          avgHeartRate: 155,
          maxHeartRate: 180,
          avgCadence: 90,
        },
      ]);

      const laps = await parseLapsFromFit(Buffer.from("fake"));
      expect(laps).toHaveLength(2);
      expect(laps[0]).toEqual({
        lapNumber: 1,
        averagePower: 200,
        maxPower: 400,
        duration: 1800,
        distance: 20000,
        averageHeartRate: 145,
        maxHeartRate: 170,
        averageCadence: 85,
      });
      expect(laps[1].lapNumber).toBe(2);
      expect(laps[1].averagePower).toBe(230);
      expect(laps[1].averageCadence).toBe(90);
    });

    it("should return empty array for invalid FIT file", async () => {
      setupFitMockInvalid();
      const laps = await parseLapsFromFit(Buffer.from("bad"));
      expect(laps).toHaveLength(0);
    });

    it("should return empty array when no lap messages", async () => {
      setupFitMock([]);
      const laps = await parseLapsFromFit(Buffer.from("fake"));
      expect(laps).toHaveLength(0);
    });
  });

  describe("filterLaps", () => {
    const testLaps: WorkoutLap[] = [
      { lapNumber: 1, duration: 1800, averagePower: 200, averageCadence: 85 },
      { lapNumber: 2, duration: 1800, averagePower: 230, averageCadence: 92 },
    ];

    it("should filter by minPower", () => {
      const result = filterLaps(testLaps, {
        minPower: 220,
        durationTolerance: 2,
      });
      expect(result).toHaveLength(1);
      expect(result[0].averagePower).toBe(230);
    });

    it("should filter by targetDuration with tolerance", () => {
      const result = filterLaps(testLaps, {
        targetDuration: 1801,
        durationTolerance: 5,
      });
      expect(result).toHaveLength(2);
    });

    it("should exclude laps outside duration tolerance", () => {
      const result = filterLaps(testLaps, {
        targetDuration: 1810,
        durationTolerance: 2,
      });
      expect(result).toHaveLength(0);
    });
  });

  describe("buildSummary", () => {
    it("should compute per-workout summary", () => {
      const summary = buildSummary(
        mockWorkoutDetail2,
        mockWorkoutDetail2.laps!,
      );
      expect(summary.workoutId).toBe(102);
      expect(summary.lapCount).toBe(2);
      expect(summary.avgPower).toBe(220);
      expect(summary.minPower).toBe(210);
      expect(summary.maxPower).toBe(230);
      expect(summary.powerRange).toBe(20);
      expect(summary.avgCadence).toBe(90);
      expect(summary.totalDuration).toBe(3600);
    });
  });

  describe("compareIntervalsForWorkouts", () => {
    let mockClient: MockClient;

    const fitLaps1 = [
      {
        avgPower: 200,
        maxPower: 400,
        totalElapsedTime: 1800,
        totalDistance: 20000,
        avgHeartRate: 145,
        maxHeartRate: 170,
        avgCadence: 85,
      },
    ];
    const fitLaps2 = [
      {
        avgPower: 210,
        maxPower: 420,
        totalElapsedTime: 1800,
        totalDistance: 20000,
        avgHeartRate: 150,
        maxHeartRate: 175,
        avgCadence: 88,
      },
      {
        avgPower: 230,
        maxPower: 480,
        totalElapsedTime: 1800,
        totalDistance: 20000,
        avgHeartRate: 155,
        maxHeartRate: 180,
        avgCadence: 92,
      },
    ];

    beforeEach(() => {
      mockClient = createMockClient();
    });

    it("should compare laps across workouts side-by-side", async () => {
      mockClient.getWorkoutDetails
        .mockResolvedValueOnce(mockWorkoutDetail)
        .mockResolvedValueOnce(mockWorkoutDetail2);

      mockDecodeFitBuffer
        .mockResolvedValueOnce({ lapMesgs: fitLaps1 })
        .mockResolvedValueOnce({ lapMesgs: fitLaps2 });

      const result = await compareIntervalsForWorkouts(
        mockClient as unknown as TrainingPeaksClient,
        { workoutIds: [100, 102], durationTolerance: 2 },
      );

      expect(result.laps).toHaveLength(2);
      expect(result.laps[0].lapNumber).toBe(1);
      expect(result.laps[0].values).toHaveLength(2);
      expect(result.laps[0].values[0].avgPower).toBe(200);
      expect(result.laps[0].values[1].avgPower).toBe(210);

      expect(result.laps[1].values[0].avgPower).toBeUndefined();
      expect(result.laps[1].values[1].avgPower).toBe(230);

      expect(mockClient.downloadActivityFile).toHaveBeenCalledWith(100);
      expect(mockClient.downloadActivityFile).toHaveBeenCalledWith(102);
    });

    it("should filter laps by minPower", async () => {
      mockClient.getWorkoutDetails.mockResolvedValueOnce(mockWorkoutDetail2);
      setupFitMock(fitLaps2);

      const result = await compareIntervalsForWorkouts(
        mockClient as unknown as TrainingPeaksClient,
        { workoutIds: [102], minPower: 220, durationTolerance: 2 },
      );

      expect(result.laps).toHaveLength(1);
      expect(result.laps[0].values[0].avgPower).toBe(230);
    });

    it("should include warning when FIT download fails", async () => {
      mockClient.getWorkoutDetails.mockResolvedValueOnce(
        mockWorkoutDetailNoLaps,
      );
      mockClient.downloadActivityFile.mockRejectedValueOnce(
        new Error("No file"),
      );

      const result = await compareIntervalsForWorkouts(
        mockClient as unknown as TrainingPeaksClient,
        { workoutIds: [103], durationTolerance: 2 },
      );

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings![0]).toContain("Workout 103");
      expect(result.warnings![0]).toContain("no FIT file");
      expect(result.summaries[0].lapCount).toBe(0);
      expect(result.summaries[0].avgPower).toBeNull();
    });

    it("should include warning when FIT file has no laps", async () => {
      mockClient.getWorkoutDetails.mockResolvedValueOnce(
        mockWorkoutDetailNoLaps,
      );
      setupFitMock([]);

      const result = await compareIntervalsForWorkouts(
        mockClient as unknown as TrainingPeaksClient,
        { workoutIds: [103], durationTolerance: 2 },
      );

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings![0]).toContain("no laps");
    });
  });
});
