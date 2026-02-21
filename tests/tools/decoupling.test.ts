import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  computeAerobicDecoupling,
  getAerobicDecoupling,
} from '../../src/mcp/tools/decoupling.js';
import { createMockClient, mockWorkoutSummary, type MockClient } from '../mocks/client.js';
import type { TrainingPeaksClient } from '../../src/index.js';

// Mock fit-utils
import * as fitUtils from '../../src/mcp/tools/fit-utils.js';
vi.mock('../../src/mcp/tools/fit-utils.js');
const mockDecodeFitBuffer = vi.mocked(fitUtils.decodeFitBuffer);

describe('decoupling tools', () => {
  describe('computeAerobicDecoupling', () => {
    it('should return ~0% for steady state data', () => {
      const power = Array.from({ length: 100 }, () => 200);
      const hr = Array.from({ length: 100 }, () => 140);

      const result = computeAerobicDecoupling(power, hr);

      expect(result.decouplingPercent).toBe(0);
      expect(result.firstHalf.avgPower).toBe(200);
      expect(result.firstHalf.avgHR).toBe(140);
      expect(result.secondHalf.avgPower).toBe(200);
      expect(result.secondHalf.avgHR).toBe(140);
      expect(result.interpretation).toContain('minimal cardiac drift');
    });

    it('should detect positive decoupling when HR drifts up', () => {
      // First half: HR 140, Power 200 → ratio = 0.7
      // Second half: HR 154, Power 200 → ratio = 0.77
      // Decoupling = (0.77 - 0.7) / 0.7 * 100 = 10%
      const power = Array.from({ length: 100 }, () => 200);
      const hr = [
        ...Array.from({ length: 50 }, () => 140),
        ...Array.from({ length: 50 }, () => 154),
      ];

      const result = computeAerobicDecoupling(power, hr);

      expect(result.decouplingPercent).toBe(10);
      expect(result.interpretation).toContain('aerobic base needs work');
    });

    it('should categorise moderate decoupling (5-10%)', () => {
      // First half: HR 140, Power 200 → ratio = 0.7
      // Second half: HR 147, Power 200 → ratio = 0.735
      // Decoupling = (0.735 - 0.7) / 0.7 * 100 = 5%
      const power = Array.from({ length: 100 }, () => 200);
      const hr = [
        ...Array.from({ length: 50 }, () => 140),
        ...Array.from({ length: 50 }, () => 147),
      ];

      const result = computeAerobicDecoupling(power, hr);

      expect(result.decouplingPercent).toBe(5);
      expect(result.interpretation).toContain('Moderate decoupling');
    });

    it('should throw when no power data', () => {
      const power = Array.from({ length: 100 }, () => 0);
      const hr = Array.from({ length: 100 }, () => 140);

      expect(() => computeAerobicDecoupling(power, hr)).toThrow('No power data');
    });

    it('should throw when no HR data', () => {
      const power = Array.from({ length: 100 }, () => 200);
      const hr = Array.from({ length: 100 }, () => 0);

      expect(() => computeAerobicDecoupling(power, hr)).toThrow('No heart rate data');
    });

    it('should throw when all records are zero', () => {
      const power = Array.from({ length: 100 }, () => 0);
      const hr = Array.from({ length: 100 }, () => 0);

      expect(() => computeAerobicDecoupling(power, hr)).toThrow(
        'No valid records after filtering zeros'
      );
    });

    it('should filter out records where both power and HR are zero', () => {
      // 10 zeros (paused), then 50 steady, then 50 with HR drift
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

      // The 10 zero records should be filtered out, leaving 100 records
      expect(result.decouplingPercent).toBe(0);
    });
  });

  describe('getAerobicDecoupling', () => {
    let mockClient: MockClient;

    beforeEach(() => {
      mockClient = createMockClient();
    });

    function setupFitMock(recordMesgs: Record<string, unknown>[] | undefined) {
      mockDecodeFitBuffer.mockResolvedValue({ recordMesgs });
    }

    it('should return decoupling result for a workout', async () => {
      const records = Array.from({ length: 100 }, () => ({
        power: 200,
        heartRate: 140,
      }));
      setupFitMock(records);

      const result = await getAerobicDecoupling(mockClient as unknown as TrainingPeaksClient, {
        workoutId: 100,
      });
      const parsed = JSON.parse(result);

      expect(parsed.workoutId).toBe(100);
      expect(parsed.workoutDate).toBe(mockWorkoutSummary.workoutDay);
      expect(parsed.workoutTitle).toBe(mockWorkoutSummary.title);
      expect(parsed.totalRecords).toBe(100);
      expect(parsed.decouplingPercent).toBe(0);
      expect(parsed.firstHalf).toBeDefined();
      expect(parsed.secondHalf).toBeDefined();
      expect(parsed.interpretation).toBeDefined();
    });

    it('should throw when no activity file', async () => {
      mockClient.downloadActivityFile.mockResolvedValue(null);

      await expect(
        getAerobicDecoupling(mockClient as unknown as TrainingPeaksClient, {
          workoutId: 100,
        })
      ).rejects.toThrow('No activity file available for workout 100');
    });

    it('should throw when no power data in records', async () => {
      const records = Array.from({ length: 100 }, () => ({ heartRate: 140 }));
      setupFitMock(records);

      await expect(
        getAerobicDecoupling(mockClient as unknown as TrainingPeaksClient, {
          workoutId: 100,
        })
      ).rejects.toThrow('No power data');
    });

    it('should throw when no HR data in records', async () => {
      const records = Array.from({ length: 100 }, () => ({ power: 200 }));
      setupFitMock(records);

      await expect(
        getAerobicDecoupling(mockClient as unknown as TrainingPeaksClient, {
          workoutId: 100,
        })
      ).rejects.toThrow('No heart rate data');
    });

    it('should throw when no record messages in FIT file', async () => {
      setupFitMock(undefined);

      await expect(
        getAerobicDecoupling(mockClient as unknown as TrainingPeaksClient, {
          workoutId: 100,
        })
      ).rejects.toThrow('No record data found in FIT file');
    });
  });
});
