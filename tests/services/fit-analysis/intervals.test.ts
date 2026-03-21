import { describe, it, expect, vi } from "vitest";
import {
  parseLapsFromFit,
  filterLaps,
  buildSummary,
} from "../../../src/services/fit-analysis/intervals.js";
import { mockWorkoutDetail2 } from "../../mocks/client.js";
import type { WorkoutLap } from "../../../src/types.js";

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

function setupFitMockInvalid() {
  mockDecodeFitBuffer.mockRejectedValue(new Error("Not a valid FIT file"));
}

describe("services/fit-analysis/intervals", () => {
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
});
