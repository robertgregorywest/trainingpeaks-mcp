import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { parseFitFile } from '../../src/mcp/tools/files.js';

// Mock fit-utils
import * as fitUtils from '../../src/mcp/tools/fit-utils.js';
vi.mock('../../src/mcp/tools/fit-utils.js');
const mockDecodeFitBuffer = vi.mocked(fitUtils.decodeFitBuffer);

describe('file tools', () => {
  describe('parseFitFile', () => {
    const testFilePath = path.join(os.tmpdir(), 'test-fit-file.fit');

    beforeEach(async () => {
      await fs.writeFile(testFilePath, Buffer.from('fake FIT data'));
    });

    afterEach(async () => {
      try {
        await fs.unlink(testFilePath);
      } catch {
        // Ignore
      }
    });

    it('should parse a valid FIT file and extract sessions, laps, records', async () => {
      mockDecodeFitBuffer.mockResolvedValue({
        fileIdMesgs: [{ type: 'activity', manufacturer: 'garmin' }],
        sessionMesgs: [
          {
            sport: 'cycling',
            subSport: 'road',
            startTime: '2024-01-15T08:00:00Z',
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
            startTime: '2024-01-15T08:00:00Z',
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
      });

      const result = await parseFitFile({ filePath: testFilePath });
      const parsed = JSON.parse(result);

      expect(parsed.fileId).toEqual({ type: 'activity', manufacturer: 'garmin' });
      expect(parsed.sessions).toHaveLength(1);
      expect(parsed.sessions[0].sport).toBe('cycling');
      expect(parsed.sessions[0].avgPower).toBe(200);
      expect(parsed.laps).toHaveLength(1);
      expect(parsed.laps[0].avgPower).toBe(195);
      expect(parsed.recordCount).toBe(2);
      expect(parsed.recordSummary.firstRecord).toEqual({ power: 200, heartRate: 140 });
    });

    it('should throw for invalid FIT file', async () => {
      mockDecodeFitBuffer.mockRejectedValue(new Error('Not a valid FIT file'));

      await expect(parseFitFile({ filePath: testFilePath })).rejects.toThrow(
        'Not a valid FIT file'
      );
    });

    it('should throw for failed integrity check', async () => {
      mockDecodeFitBuffer.mockRejectedValue(new Error('FIT file integrity check failed'));

      await expect(parseFitFile({ filePath: testFilePath })).rejects.toThrow(
        'FIT file integrity check failed'
      );
    });

    it('should handle FIT file with no sessions or laps', async () => {
      mockDecodeFitBuffer.mockResolvedValue({
        fileIdMesgs: [{ type: 'activity' }],
      });

      const result = await parseFitFile({ filePath: testFilePath });
      const parsed = JSON.parse(result);

      expect(parsed.fileId).toEqual({ type: 'activity' });
      expect(parsed.sessions).toBeUndefined();
      expect(parsed.laps).toBeUndefined();
      expect(parsed.recordCount).toBeUndefined();
    });
  });
});
