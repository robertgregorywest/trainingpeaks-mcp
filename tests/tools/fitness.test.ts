import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getFitnessData,
  getCurrentFitness,
} from "../../src/mcp/tools/fitness.js";
import {
  createMockClient,
  mockFitnessMetrics,
  type MockClient,
} from "../mocks/client.js";
import type { ITrainingPeaksClient } from "../../src/index.js";

describe("fitness tools", () => {
  let mockClient: MockClient;

  beforeEach(() => {
    mockClient = createMockClient();
  });

  describe("getFitnessData", () => {
    it("should return fitness data as JSON", async () => {
      const result = await getFitnessData(
        mockClient as unknown as ITrainingPeaksClient,
        {
          startDate: "2024-01-01",
          endDate: "2024-01-31",
        },
      );
      const parsed = JSON.parse(result);

      expect(parsed).toEqual([mockFitnessMetrics]);
      expect(mockClient.getFitnessData).toHaveBeenCalledWith(
        "2024-01-01",
        "2024-01-31",
      );
    });
  });

  describe("getCurrentFitness", () => {
    it("should return current fitness as JSON", async () => {
      const result = await getCurrentFitness(
        mockClient as unknown as ITrainingPeaksClient,
      );
      const parsed = JSON.parse(result);

      expect(parsed).toEqual(mockFitnessMetrics);
      expect(mockClient.getCurrentFitness).toHaveBeenCalledOnce();
    });
  });

  describe("error propagation", () => {
    it("should propagate errors from getFitnessData", async () => {
      mockClient.getFitnessData.mockRejectedValueOnce(
        new Error("Server error"),
      );
      await expect(
        getFitnessData(mockClient as unknown as ITrainingPeaksClient, {
          startDate: "2024-01-01",
          endDate: "2024-01-31",
        }),
      ).rejects.toThrow("Server error");
    });

    it("should propagate errors from getCurrentFitness", async () => {
      mockClient.getCurrentFitness.mockRejectedValueOnce(new Error("Timeout"));
      await expect(
        getCurrentFitness(mockClient as unknown as ITrainingPeaksClient),
      ).rejects.toThrow("Timeout");
    });
  });
});
