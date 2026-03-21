import { describe, it, expect, beforeEach, vi } from "vitest";
import { getUser, getAthleteId } from "../../src/mcp/tools/user.js";
import {
  createMockClient,
  mockUser,
  type MockClient,
} from "../mocks/client.js";
import type { ITrainingPeaksClient } from "../../src/index.js";

describe("user tools", () => {
  let mockClient: MockClient;

  beforeEach(() => {
    mockClient = createMockClient();
  });

  describe("getUser", () => {
    it("should return user data as JSON", async () => {
      const result = await getUser(
        mockClient as unknown as ITrainingPeaksClient,
      );
      const parsed = JSON.parse(result);

      expect(parsed).toEqual(mockUser);
      expect(mockClient.getUser).toHaveBeenCalledOnce();
    });
  });

  describe("getAthleteId", () => {
    it("should return athlete ID as JSON", async () => {
      const result = await getAthleteId(
        mockClient as unknown as ITrainingPeaksClient,
      );
      const parsed = JSON.parse(result);

      expect(parsed).toEqual({ athleteId: 12345 });
      expect(mockClient.getAthleteId).toHaveBeenCalledOnce();
    });
  });

  describe("error propagation", () => {
    it("should propagate errors from getUser", async () => {
      mockClient.getUser.mockRejectedValueOnce(new Error("Auth failed"));
      await expect(
        getUser(mockClient as unknown as ITrainingPeaksClient),
      ).rejects.toThrow("Auth failed");
    });

    it("should propagate errors from getAthleteId", async () => {
      mockClient.getAthleteId.mockRejectedValueOnce(new Error("Network error"));
      await expect(
        getAthleteId(mockClient as unknown as ITrainingPeaksClient),
      ).rejects.toThrow("Network error");
    });
  });
});
