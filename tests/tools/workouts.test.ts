import { describe, it, expect, beforeEach } from "vitest";
import {
  getWorkouts,
  getWorkout,
  getWorkoutDetails,
  searchWorkouts,
  compareIntervals,
  getStrengthWorkouts,
} from "../../src/mcp/tools/workouts.js";
import {
  createMockClient,
  mockWorkoutSummary,
  mockWorkoutDetail,
  mockStrengthWorkoutSummary,
  type MockClient,
} from "../mocks/client.js";
import type { ITrainingPeaksClient } from "../../src/index.js";

describe("workout tool handlers", () => {
  let mockClient: MockClient;

  beforeEach(() => {
    mockClient = createMockClient();
  });

  describe("getWorkouts", () => {
    it("should return workouts as JSON", async () => {
      const result = await getWorkouts(
        mockClient as unknown as ITrainingPeaksClient,
        {
          startDate: "2024-01-01",
          endDate: "2024-01-31",
        },
      );
      const parsed = JSON.parse(result);

      expect(parsed).toEqual([mockWorkoutSummary]);
      expect(mockClient.getWorkouts).toHaveBeenCalledWith(
        "2024-01-01",
        "2024-01-31",
        {
          includeDeleted: undefined,
        },
      );
    });
  });

  describe("getWorkout", () => {
    it("should return single workout as JSON", async () => {
      const result = await getWorkout(
        mockClient as unknown as ITrainingPeaksClient,
        {
          workoutId: 100,
        },
      );
      const parsed = JSON.parse(result);

      expect(parsed).toEqual(mockWorkoutSummary);
      expect(mockClient.getWorkout).toHaveBeenCalledWith(100);
    });
  });

  describe("getWorkoutDetails", () => {
    it("should return workout details as JSON", async () => {
      const result = await getWorkoutDetails(
        mockClient as unknown as ITrainingPeaksClient,
        {
          workoutId: 100,
        },
      );
      const parsed = JSON.parse(result);

      expect(parsed).toEqual(mockWorkoutDetail);
      expect(mockClient.getWorkoutDetails).toHaveBeenCalledWith(100);
    });
  });

  describe("getStrengthWorkouts", () => {
    it("should return strength workouts as JSON", async () => {
      const result = await getStrengthWorkouts(
        mockClient as unknown as ITrainingPeaksClient,
        {
          startDate: "2024-01-01",
          endDate: "2024-01-31",
        },
      );
      const parsed = JSON.parse(result);

      expect(parsed).toEqual([mockStrengthWorkoutSummary]);
      expect(mockClient.getStrengthWorkouts).toHaveBeenCalledWith(
        "2024-01-01",
        "2024-01-31",
      );
    });
  });

  describe("searchWorkouts", () => {
    it("should delegate to client.searchWorkouts and return JSON", async () => {
      mockClient.searchWorkouts.mockResolvedValue([mockWorkoutSummary]);

      const result = await searchWorkouts(
        mockClient as unknown as ITrainingPeaksClient,
        {
          title: "ride",
          days: 90,
        },
      );
      const parsed = JSON.parse(result);

      expect(parsed).toEqual([mockWorkoutSummary]);
      expect(mockClient.searchWorkouts).toHaveBeenCalledWith("ride", 90);
    });
  });

  describe("compareIntervals", () => {
    it("should delegate to client.compareIntervals and return JSON", async () => {
      const mockResult = { laps: [], summaries: [] };
      mockClient.compareIntervals.mockResolvedValue(mockResult);

      const args = { workoutIds: [100, 102], durationTolerance: 2 };
      const result = await compareIntervals(
        mockClient as unknown as ITrainingPeaksClient,
        args,
      );
      const parsed = JSON.parse(result);

      expect(parsed).toEqual(mockResult);
      expect(mockClient.compareIntervals).toHaveBeenCalledWith(args);
    });
  });
});
