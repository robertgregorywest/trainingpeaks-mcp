import { describe, it, expect, beforeEach, vi } from "vitest";
import { getAerobicDecouplingForWorkout } from "../../../src/services/workout-analysis/decoupling.js";
import {
  createMockDataProvider,
  mockWorkoutSummary,
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

describe("services/workout-analysis/decoupling", () => {
  describe("getAerobicDecouplingForWorkout", () => {
    let provider: MockDataProvider;

    beforeEach(() => {
      provider = createMockDataProvider();
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
        provider as IWorkoutDataProvider,
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
      provider.downloadActivityFile.mockResolvedValue(null);

      await expect(
        getAerobicDecouplingForWorkout(provider as IWorkoutDataProvider, 100),
      ).rejects.toThrow("No activity file available for workout 100");
    });

    it("should throw when no power data in records", async () => {
      const records = Array.from({ length: 100 }, () => ({ heartRate: 140 }));
      setupFitMock(records);

      await expect(
        getAerobicDecouplingForWorkout(provider as IWorkoutDataProvider, 100),
      ).rejects.toThrow("No power data");
    });

    it("should throw when no HR data in records", async () => {
      const records = Array.from({ length: 100 }, () => ({ power: 200 }));
      setupFitMock(records);

      await expect(
        getAerobicDecouplingForWorkout(provider as IWorkoutDataProvider, 100),
      ).rejects.toThrow("No heart rate data");
    });

    it("should throw when no record messages in FIT file", async () => {
      setupFitMock(undefined);

      await expect(
        getAerobicDecouplingForWorkout(provider as IWorkoutDataProvider, 100),
      ).rejects.toThrow("No record data found in FIT file");
    });
  });
});
