import { describe, it, expect, beforeEach } from "vitest";
import { getAerobicDecoupling } from "../../src/mcp/tools/decoupling.js";
import { createMockClient, type MockClient } from "../mocks/client.js";
import type { TrainingPeaksClient } from "../../src/index.js";

describe("decoupling tool handler", () => {
  let mockClient: MockClient;

  beforeEach(() => {
    mockClient = createMockClient();
  });

  it("should return JSON string from client.getAerobicDecoupling", async () => {
    const result = await getAerobicDecoupling(
      mockClient as unknown as TrainingPeaksClient,
      {
        workoutId: 100,
      },
    );
    const parsed = JSON.parse(result);

    expect(parsed.workoutId).toBe(100);
    expect(parsed.decouplingPercent).toBe(0);
    expect(mockClient.getAerobicDecoupling).toHaveBeenCalledWith(100);
  });
});
