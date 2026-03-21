import { describe, it, expect } from "vitest";
import {
  computeBestPower,
  formatDuration,
} from "../../../src/services/fit-analysis/power.js";

describe("services/fit-analysis/power", () => {
  describe("computeBestPower", () => {
    it("should find the best average power and start index", () => {
      const powerStream = [100, 100, 100, 200, 300, 400, 300, 200, 100, 100];
      const result = computeBestPower(powerStream, 3);

      // Best 3s window: [300, 400, 300] starting at index 4 → avg 333
      expect(result).toEqual({ bestPower: 333, startIndex: 4 });
    });

    it("should return null when duration exceeds array length", () => {
      const powerStream = [100, 200, 300];
      const result = computeBestPower(powerStream, 5);

      expect(result).toBeNull();
    });

    it("should return 0 for all-zero power stream", () => {
      const powerStream = [0, 0, 0, 0, 0];
      const result = computeBestPower(powerStream, 3);

      expect(result).toEqual({ bestPower: 0, startIndex: 0 });
    });

    it("should handle single-element duration", () => {
      const powerStream = [100, 200, 300, 150];
      const result = computeBestPower(powerStream, 1);

      expect(result).toEqual({ bestPower: 300, startIndex: 2 });
    });

    it("should handle duration equal to array length", () => {
      const powerStream = [100, 200, 300];
      const result = computeBestPower(powerStream, 3);

      expect(result).toEqual({ bestPower: 200, startIndex: 0 });
    });
  });

  describe("formatDuration", () => {
    it("should format seconds only", () => {
      expect(formatDuration(5)).toBe("5s");
      expect(formatDuration(30)).toBe("30s");
    });

    it("should format exact minutes", () => {
      expect(formatDuration(60)).toBe("1min");
      expect(formatDuration(300)).toBe("5min");
      expect(formatDuration(1200)).toBe("20min");
    });

    it("should format minutes and seconds", () => {
      expect(formatDuration(90)).toBe("1min 30s");
      expect(formatDuration(150)).toBe("2min 30s");
    });
  });
});
