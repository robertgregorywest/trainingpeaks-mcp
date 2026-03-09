import { describe, it, expect, beforeEach } from "vitest";
import { assessCompliance } from "../../src/mcp/tools/compliance.js";
import { createMockClient, type MockClient } from "../mocks/client.js";
import type { TrainingPeaksClient } from "../../src/index.js";

describe("compliance tool handler", () => {
  let mockClient: MockClient;

  beforeEach(() => {
    mockClient = createMockClient();
  });

  it("should return JSON string from client.assessCompliance", async () => {
    const result = await assessCompliance(
      mockClient as unknown as TrainingPeaksClient,
      { workoutId: 100 },
    );
    const parsed = JSON.parse(result);

    expect(parsed.workoutId).toBe(100);
    expect(parsed.title).toBe("Morning Ride");
    expect(parsed.planAvailable).toBe(false);
    expect(parsed.summary.tssPlanned).toBe(75);
    expect(mockClient.assessCompliance).toHaveBeenCalledWith(100);
  });
});
