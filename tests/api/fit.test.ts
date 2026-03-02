import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import {
  extractPowerStream,
  extractHrStream,
  parseFitFile,
} from "../../src/api/fit.js";

// Mock the Garmin FIT SDK used by decodeFitBuffer
const mockRead = vi.fn();
const mockIsFIT = vi.fn().mockReturnValue(true);
const mockCheckIntegrity = vi.fn().mockReturnValue(true);

vi.mock("@garmin/fitsdk", () => ({
  Decoder: vi.fn().mockImplementation(() => ({
    isFIT: mockIsFIT,
    checkIntegrity: mockCheckIntegrity,
    read: mockRead,
  })),
  Stream: {
    fromBuffer: vi.fn().mockReturnValue({}),
  },
}));

describe("api/fit", () => {
  describe("extractPowerStream", () => {
    it("should extract power values from record messages", () => {
      const records = [
        { power: 200, heartRate: 140 },
        { power: 250, heartRate: 150 },
        { heartRate: 160 },
      ];
      expect(extractPowerStream(records)).toEqual([200, 250, 0]);
    });

    it("should return zeros for records without power", () => {
      const records = [{ heartRate: 140 }, { heartRate: 150 }];
      expect(extractPowerStream(records)).toEqual([0, 0]);
    });
  });

  describe("extractHrStream", () => {
    it("should extract heart rate values from record messages", () => {
      const records = [
        { power: 200, heartRate: 140 },
        { power: 250, heartRate: 150 },
        { power: 260 },
      ];
      expect(extractHrStream(records)).toEqual([140, 150, 0]);
    });

    it("should return zeros for records without heartRate", () => {
      const records = [{ power: 200 }, { power: 250 }];
      expect(extractHrStream(records)).toEqual([0, 0]);
    });
  });

  describe("parseFitFile", () => {
    const testFilePath = path.join(os.tmpdir(), "test-fit-file.fit");

    beforeEach(async () => {
      await fs.writeFile(testFilePath, Buffer.from("fake FIT data"));
      mockIsFIT.mockReturnValue(true);
      mockCheckIntegrity.mockReturnValue(true);
    });

    afterEach(async () => {
      try {
        await fs.unlink(testFilePath);
      } catch {
        // Ignore
      }
    });

    it("should parse a valid FIT file and extract sessions, laps, records", async () => {
      mockRead.mockReturnValue({
        messages: {
          fileIdMesgs: [{ type: "activity", manufacturer: "garmin" }],
          sessionMesgs: [
            {
              sport: "cycling",
              subSport: "road",
              startTime: "2024-01-15T08:00:00Z",
              totalElapsedTime: 3600,
              totalTimerTime: 3500,
              totalDistance: 40000,
              totalCalories: 800,
              avgSpeed: 11.1,
              maxSpeed: 15.0,
              avgHeartRate: 145,
              maxHeartRate: 175,
              avgPower: 200,
              maxPower: 450,
              normalizedPower: 220,
              avgCadence: 85,
              maxCadence: 110,
              totalAscent: 500,
              totalDescent: 500,
            },
          ],
          lapMesgs: [
            {
              startTime: "2024-01-15T08:00:00Z",
              totalElapsedTime: 1800,
              totalDistance: 20000,
              avgSpeed: 11.1,
              maxSpeed: 14.0,
              avgHeartRate: 140,
              maxHeartRate: 170,
              avgPower: 195,
              maxPower: 400,
              avgCadence: 83,
            },
          ],
          recordMesgs: [
            { power: 200, heartRate: 140 },
            { power: 210, heartRate: 145 },
          ],
        },
      });

      const result = await parseFitFile(testFilePath);

      expect(result.fileId).toEqual({
        type: "activity",
        manufacturer: "garmin",
      });
      expect(result.sessions).toHaveLength(1);
      expect(result.sessions![0].sport).toBe("cycling");
      expect(result.sessions![0].avgPower).toBe(200);
      expect(result.laps).toHaveLength(1);
      expect(result.laps![0].avgPower).toBe(195);
      expect(result.recordCount).toBe(2);
      expect(result.recordSummary!.firstRecord).toEqual({
        power: 200,
        heartRate: 140,
      });
    });

    it("should throw for invalid FIT file", async () => {
      mockIsFIT.mockReturnValue(false);

      await expect(parseFitFile(testFilePath)).rejects.toThrow(
        "Not a valid FIT file",
      );
    });

    it("should throw for failed integrity check", async () => {
      mockCheckIntegrity.mockReturnValue(false);

      await expect(parseFitFile(testFilePath)).rejects.toThrow(
        "FIT file integrity check failed",
      );
    });

    it("should handle FIT file with no sessions or laps", async () => {
      mockRead.mockReturnValue({
        messages: {
          fileIdMesgs: [{ type: "activity" }],
        },
      });

      const result = await parseFitFile(testFilePath);

      expect(result.fileId).toEqual({ type: "activity" });
      expect(result.sessions).toBeUndefined();
      expect(result.laps).toBeUndefined();
      expect(result.recordCount).toBeUndefined();
    });
  });
});
