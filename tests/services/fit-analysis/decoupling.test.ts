import { describe, it, expect } from "vitest";
import { computeAerobicDecoupling } from "../../../src/services/fit-analysis/decoupling.js";

describe("services/fit-analysis/decoupling", () => {
  describe("computeAerobicDecoupling", () => {
    it("should return ~0% for steady state data", () => {
      const power = Array.from({ length: 100 }, () => 200);
      const hr = Array.from({ length: 100 }, () => 140);

      const result = computeAerobicDecoupling(power, hr);

      expect(result.decouplingPercent).toBe(0);
      expect(result.firstHalf.avgPower).toBe(200);
      expect(result.firstHalf.avgHR).toBe(140);
      expect(result.secondHalf.avgPower).toBe(200);
      expect(result.secondHalf.avgHR).toBe(140);
      expect(result.interpretation).toContain("minimal cardiac drift");
    });

    it("should detect positive decoupling when HR drifts up", () => {
      const power = Array.from({ length: 100 }, () => 200);
      const hr = [
        ...Array.from({ length: 50 }, () => 140),
        ...Array.from({ length: 50 }, () => 154),
      ];

      const result = computeAerobicDecoupling(power, hr);

      expect(result.decouplingPercent).toBe(10);
      expect(result.interpretation).toContain("aerobic base needs work");
    });

    it("should categorise moderate decoupling (5-10%)", () => {
      const power = Array.from({ length: 100 }, () => 200);
      const hr = [
        ...Array.from({ length: 50 }, () => 140),
        ...Array.from({ length: 50 }, () => 147),
      ];

      const result = computeAerobicDecoupling(power, hr);

      expect(result.decouplingPercent).toBe(5);
      expect(result.interpretation).toContain("Moderate decoupling");
    });

    it("should throw when no power data", () => {
      const power = Array.from({ length: 100 }, () => 0);
      const hr = Array.from({ length: 100 }, () => 140);

      expect(() => computeAerobicDecoupling(power, hr)).toThrow(
        "No power data",
      );
    });

    it("should throw when no HR data", () => {
      const power = Array.from({ length: 100 }, () => 200);
      const hr = Array.from({ length: 100 }, () => 0);

      expect(() => computeAerobicDecoupling(power, hr)).toThrow(
        "No heart rate data",
      );
    });

    it("should throw when all records are zero", () => {
      const power = Array.from({ length: 100 }, () => 0);
      const hr = Array.from({ length: 100 }, () => 0);

      expect(() => computeAerobicDecoupling(power, hr)).toThrow(
        "No valid records after filtering zeros",
      );
    });

    it("should filter out records where both power and HR are zero", () => {
      const power = [
        ...Array.from({ length: 10 }, () => 0),
        ...Array.from({ length: 100 }, () => 200),
      ];
      const hr = [
        ...Array.from({ length: 10 }, () => 0),
        ...Array.from({ length: 50 }, () => 140),
        ...Array.from({ length: 50 }, () => 140),
      ];

      const result = computeAerobicDecoupling(power, hr);

      expect(result.decouplingPercent).toBe(0);
    });
  });
});
