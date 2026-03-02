import { describe, it, expect, vi } from "vitest";
import { parseFitFile, clearFitCache } from "../../src/mcp/tools/files.js";
import type { TrainingPeaksClient } from "../../src/index.js";

describe("file tool handlers", () => {
  describe("parseFitFile", () => {
    it("should delegate to client.parseFitFile and return JSON", async () => {
      const mockResult = { fileId: { type: "activity" }, recordCount: 10 };
      const mockClient = {
        parseFitFile: vi.fn().mockResolvedValue(mockResult),
      } as unknown as TrainingPeaksClient;

      const result = JSON.parse(
        await parseFitFile(mockClient, { filePath: "/tmp/test.fit" }),
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe("clearFitCache", () => {
    it("should clear cache and return result", async () => {
      const mockClient = {
        clearFileCache: vi.fn().mockResolvedValue({ count: 5, bytes: 1024 }),
        getFileCacheStats: vi.fn().mockResolvedValue({
          entries: 0,
          totalBytes: 0,
          maxBytes: 500 * 1024 * 1024,
          cacheDir: "/home/user/.trainingpeaks-mcp/cache/fit",
        }),
      } as unknown as TrainingPeaksClient;

      const result = JSON.parse(await clearFitCache(mockClient));
      expect(result.cleared.files).toBe(5);
      expect(result.cleared.bytes).toBe(1024);
      expect(result.cacheDir).toBe("/home/user/.trainingpeaks-mcp/cache/fit");
    });
  });
});
