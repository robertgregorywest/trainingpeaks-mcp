import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  computeAerobicDecoupling,
  getAerobicDecouplingForWorkout,
} from "../../src/api/decoupling.js";
import {
  createMockClient,
  mockWorkoutSummary,
  type MockClient,
} from "../mocks/client.js";
import type { TrainingPeaksClient } from "../../src/index.js";

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

describe("api/decoupling", () => {
  describe("computeAerobicDecoupling", () => {
    it("should return ~0% for steady state data", () => {
      const power = Array.from({ length: 100 }, () => 200);
      const hr = Array.from({ length: 100 }, () => 140);

      const result = computeAerobicDecoupling(power, hr);

      expect(result.decouplingPercent).toBe(0);
      expect(result.firstHalf.avgPower).toBe(200);
      expect(result.firstHalf.avgHR).toBe(140);
      expect(result.secondHalf.avgPower).toBe(200);
      expect(result.secondHalf.avgHR).toBe(140);
      expect(result.interpretation).toContain("minimal cardiac drift");
    });

    it("should detect positive decoupling when HR drifts up", () => {
      const power = Array.from({ length: 100 }, () => 200);
      const hr = [
        ...Array.from({ length: 50 }, () => 140),
        ...Array.from({ length: 50 }, () => 154),
      ];

      const result = computeAerobicDecoupling(power, hr);

      expect(result.decouplingPercent).toBe(10);
      expect(result.interpretation).toContain("aerobic base needs work");
    });

    it("should categorise moderate decoupling (5-10%)", () => {
      const power = Array.from({ length: 100 }, () => 200);
      const hr = [
        ...Array.from({ length: 50 }, () => 140),
        ...Array.from({ length: 50 }, () => 147),
      ];

      const result = computeAerobicDecoupling(power, hr);

      expect(result.decouplingPercent).toBe(5);
      expect(result.interpretation).toContain("Moderate decoupling");
    });

    it("should throw when no power data", () => {
      const power = Array.from({ length: 100 }, () => 0);
      const hr = Array.from({ length: 100 }, () => 140);

      expect(() => computeAerobicDecoupling(power, hr)).toThrow(
        "No power data",
      );
    });

    it("should throw when no HR data", () => {
      const power = Array.from({ length: 100 }, () => 200);
      const hr = Array.from({ length: 100 }, () => 0);

      expect(() => computeAerobicDecoupling(power, hr)).toThrow(
        "No heart rate data",
      );
    });

    it("should throw when all records are zero", () => {
      const power = Array.from({ length: 100 }, () => 0);
      const hr = Array.from({ length: 100 }, () => 0);

      expect(() => computeAerobicDecoupling(power, hr)).toThrow(
        "No valid records after filtering zeros",
      );
    });

    it("should filter out records where both power and HR are zero", () => {
      const power = [
        ...Array.from({ length: 10 }, () => 0),
        ...Array.from({ length: 100 }, () => 200),
      ];
      const hr = [
        ...Array.from({ length: 10 }, () => 0),
        ...Array.from({ length: 50 }, () => 140),
        ...Array.from({ length: 50 }, () => 140),
      ];

      const result = computeAerobicDecoupling(power, hr);

      expect(result.decouplingPercent).toBe(0);
    });
  });

  describe("getAerobicDecouplingForWorkout", () => {
    let mockClient: MockClient;

    beforeEach(() => {
      mockClient = createMockClient();
    });

    function setupFitMock(recordMesgs: Record<string, unknown>[] | undefined) {
      mockDecodeFitBuffer.mockResolvedValue({ recordMesgs });
    }

    it("should return decoupling result for a workout", async () => {
      const records = Array.from({ length: 100 }, () => ({
        power: 200,
        heartRate: 140,
      }));
      setupFitMock(records);

      const result = await getAerobicDecouplingForWorkout(
        mockClient as unknown as TrainingPeaksClient,
        100,
      );

      expect(result.workoutId).toBe(100);
      expect(result.workoutDate).toBe(mockWorkoutSummary.workoutDay);
      expect(result.workoutTitle).toBe(mockWorkoutSummary.title);
      expect(result.totalRecords).toBe(100);
      expect(result.decouplingPercent).toBe(0);
      expect(result.firstHalf).toBeDefined();
      expect(result.secondHalf).toBeDefined();
      expect(result.interpretation).toBeDefined();
    });

    it("should throw when no activity file", async () => {
      mockClient.downloadActivityFile.mockResolvedValue(null);

      await expect(
        getAerobicDecouplingForWorkout(
          mockClient as unknown as TrainingPeaksClient,
          100,
        ),
      ).rejects.toThrow("No activity file available for workout 100");
    });

    it("should throw when no power data in records", async () => {
      const records = Array.from({ length: 100 }, () => ({ heartRate: 140 }));
      setupFitMock(records);

      await expect(
        getAerobicDecouplingForWorkout(
          mockClient as unknown as TrainingPeaksClient,
          100,
        ),
      ).rejects.toThrow("No power data");
    });

    it("should throw when no HR data in records", async () => {
      const records = Array.from({ length: 100 }, () => ({ power: 200 }));
      setupFitMock(records);

      await expect(
        getAerobicDecouplingForWorkout(
          mockClient as unknown as TrainingPeaksClient,
          100,
        ),
      ).rejects.toThrow("No heart rate data");
    });

    it("should throw when no record messages in FIT file", async () => {
      setupFitMock(undefined);

      await expect(
        getAerobicDecouplingForWorkout(
          mockClient as unknown as TrainingPeaksClient,
          100,
        ),
      ).rejects.toThrow("No record data found in FIT file");
    });
  });
});
