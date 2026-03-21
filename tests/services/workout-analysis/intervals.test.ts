import { describe, it, expect, beforeEach, vi } from "vitest";
import { compareIntervalsForWorkouts } from "../../../src/services/workout-analysis/intervals.js";
import {
  createMockDataProvider,
  mockWorkoutDetail,
  mockWorkoutDetail2,
  mockWorkoutDetailNoLaps,
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

function setupFitMock(lapMesgs: Record<string, unknown>[]) {
  mockDecodeFitBuffer.mockResolvedValue({ lapMesgs });
}

describe("services/workout-analysis/intervals", () => {
  describe("compareIntervalsForWorkouts", () => {
    let provider: MockDataProvider;

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
      provider = createMockDataProvider();
    });

    it("should compare laps across workouts side-by-side", async () => {
      provider.getWorkoutDetails
        .mockResolvedValueOnce(mockWorkoutDetail)
        .mockResolvedValueOnce(mockWorkoutDetail2);

      mockDecodeFitBuffer
        .mockResolvedValueOnce({ lapMesgs: fitLaps1 })
        .mockResolvedValueOnce({ lapMesgs: fitLaps2 });

      const result = await compareIntervalsForWorkouts(
        provider as IWorkoutDataProvider,
        { workoutIds: [100, 102], durationTolerance: 2 },
      );

      expect(result.laps).toHaveLength(2);
      expect(result.laps[0].lapNumber).toBe(1);
      expect(result.laps[0].values).toHaveLength(2);
      expect(result.laps[0].values[0].avgPower).toBe(200);
      expect(result.laps[0].values[1].avgPower).toBe(210);

      expect(result.laps[1].values[0].avgPower).toBeUndefined();
      expect(result.laps[1].values[1].avgPower).toBe(230);

      expect(provider.downloadActivityFile).toHaveBeenCalledWith(100);
      expect(provider.downloadActivityFile).toHaveBeenCalledWith(102);
    });

    it("should filter laps by minPower", async () => {
      provider.getWorkoutDetails.mockResolvedValueOnce(mockWorkoutDetail2);
      setupFitMock(fitLaps2);

      const result = await compareIntervalsForWorkouts(
        provider as IWorkoutDataProvider,
        { workoutIds: [102], minPower: 220, durationTolerance: 2 },
      );

      expect(result.laps).toHaveLength(1);
      expect(result.laps[0].values[0].avgPower).toBe(230);
    });

    it("should include warning when FIT download fails", async () => {
      provider.getWorkoutDetails.mockResolvedValueOnce(mockWorkoutDetailNoLaps);
      provider.downloadActivityFile.mockRejectedValueOnce(new Error("No file"));

      const result = await compareIntervalsForWorkouts(
        provider as IWorkoutDataProvider,
        { workoutIds: [103], durationTolerance: 2 },
      );

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings![0]).toContain("Workout 103");
      expect(result.warnings![0]).toContain("no FIT file");
      expect(result.summaries[0].lapCount).toBe(0);
      expect(result.summaries[0].avgPower).toBeNull();
    });

    it("should include warning when FIT file has no laps", async () => {
      provider.getWorkoutDetails.mockResolvedValueOnce(mockWorkoutDetailNoLaps);
      setupFitMock([]);

      const result = await compareIntervalsForWorkouts(
        provider as IWorkoutDataProvider,
        { workoutIds: [103], durationTolerance: 2 },
      );

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings![0]).toContain("no laps");
    });
  });
});
