import { describe, it, expect, beforeEach } from "vitest";
import {
  getBestPower,
  getPowerDurationCurve,
} from "../../src/mcp/tools/power.js";
import { createMockClient, type MockClient } from "../mocks/client.js";
import type { TrainingPeaksClient } from "../../src/index.js";

describe("power tool handlers", () => {
  let mockClient: MockClient;

  beforeEach(() => {
    mockClient = createMockClient();
  });

  describe("getBestPower", () => {
    it("should return JSON string from client.getBestPower", async () => {
      const result = await getBestPower(
        mockClient as unknown as TrainingPeaksClient,
        {
          workoutId: 100,
          durations: [10, 30],
        },
      );
      const parsed = JSON.parse(result);

      expect(parsed.workoutId).toBe(100);
      expect(mockClient.getBestPower).toHaveBeenCalledWith(100, [10, 30]);
    });
  });

  describe("getPowerDurationCurve", () => {
    it("should return JSON string from client.getPowerDurationCurve", async () => {
      const args = {
        startDate: "2024-01-01",
        endDate: "2024-01-31",
        durations: [5, 10],
      };
      const result = await getPowerDurationCurve(
        mockClient as unknown as TrainingPeaksClient,
        args,
      );
      const parsed = JSON.parse(result);

      expect(parsed.startDate).toBe("2024-01-01");
      expect(mockClient.getPowerDurationCurve).toHaveBeenCalledWith(args);
    });
  });
});
