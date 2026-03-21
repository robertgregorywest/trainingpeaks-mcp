import { describe, it, expect, beforeEach, vi } from "vitest";
import { getPeaks, getWorkoutPeaks } from "../../src/mcp/tools/peaks.js";
import {
  createMockClient,
  mockPeakData,
  mockWorkoutPeaks,
  type MockClient,
} from "../mocks/client.js";
import type { ITrainingPeaksClient } from "../../src/index.js";

describe("peaks tools", () => {
  let mockClient: MockClient;

  beforeEach(() => {
    mockClient = createMockClient();
  });

  describe("getPeaks", () => {
    it("should return peaks as JSON", async () => {
      const result = await getPeaks(
        mockClient as unknown as ITrainingPeaksClient,
        {
          sport: "Bike",
          type: "power5min",
        },
      );
      const parsed = JSON.parse(result);

      expect(parsed).toEqual(mockPeakData);
      expect(mockClient.getPeaks).toHaveBeenCalledWith("Bike", "power5min", {
        startDate: undefined,
        endDate: undefined,
      });
    });

    it("should pass optional filters", async () => {
      await getPeaks(mockClient as unknown as ITrainingPeaksClient, {
        sport: "Run",
        type: "speed5K",
        startDate: "2024-01-01",
        endDate: "2024-12-31",
      });

      expect(mockClient.getPeaks).toHaveBeenCalledWith("Run", "speed5K", {
        startDate: "2024-01-01",
        endDate: "2024-12-31",
      });
    });
  });

  describe("getWorkoutPeaks", () => {
    it("should return workout peaks as JSON", async () => {
      const result = await getWorkoutPeaks(
        mockClient as unknown as ITrainingPeaksClient,
        {
          workoutId: 100,
        },
      );
      const parsed = JSON.parse(result);

      expect(parsed).toEqual(mockWorkoutPeaks);
      expect(mockClient.getWorkoutPeaks).toHaveBeenCalledWith(100);
    });
  });

  describe("error propagation", () => {
    it("should propagate errors from getPeaks", async () => {
      mockClient.getPeaks.mockRejectedValueOnce(new Error("API error"));
      await expect(
        getPeaks(mockClient as unknown as ITrainingPeaksClient, {
          sport: "Bike",
          type: "power5min",
        }),
      ).rejects.toThrow("API error");
    });

    it("should propagate errors from getWorkoutPeaks", async () => {
      mockClient.getWorkoutPeaks.mockRejectedValueOnce(new Error("Not found"));
      await expect(
        getWorkoutPeaks(mockClient as unknown as ITrainingPeaksClient, {
          workoutId: 999,
        }),
      ).rejects.toThrow("Not found");
    });
  });
});
