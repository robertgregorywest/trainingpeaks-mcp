import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkoutsApi } from '../../src/api/workouts.js';
import type { HttpClient } from '../../src/client.js';
import type { UserApi } from '../../src/api/user.js';

describe('WorkoutsApi', () => {
  let mockHttpClient: HttpClient;
  let mockUserApi: UserApi;
  let workoutsApi: WorkoutsApi;

  beforeEach(() => {
    mockHttpClient = {
      request: vi.fn(),
    } as unknown as HttpClient;

    mockUserApi = {
      getAthleteId: vi.fn().mockResolvedValue(12345),
    } as unknown as UserApi;

    workoutsApi = new WorkoutsApi(mockHttpClient, mockUserApi);
  });

  describe('workout type determination', () => {
    it('should use workoutType string when available', async () => {
      vi.mocked(mockHttpClient.request).mockResolvedValue([
        {
          workoutId: 1,
          athleteId: 12345,
          workoutDay: '2024-01-15',
          workoutType: 'Strength',
          workoutTypeValueId: 7,
          userTags: 'Weights,Gym',
        },
      ]);

      const workouts = await workoutsApi.getWorkouts('2024-01-01', '2024-01-31');

      expect(workouts[0].workoutType).toBe('Strength');
    });

    it('should fall back to userTags when workoutType is missing', async () => {
      vi.mocked(mockHttpClient.request).mockResolvedValue([
        {
          workoutId: 1,
          athleteId: 12345,
          workoutDay: '2024-01-15',
          workoutTypeValueId: 7,
          userTags: 'Custom Tag,Another',
        },
      ]);

      const workouts = await workoutsApi.getWorkouts('2024-01-01', '2024-01-31');

      expect(workouts[0].workoutType).toBe('Custom Tag');
    });

    it('should return Unknown when both workoutType and userTags are missing', async () => {
      vi.mocked(mockHttpClient.request).mockResolvedValue([
        {
          workoutId: 1,
          athleteId: 12345,
          workoutDay: '2024-01-15',
          workoutTypeValueId: 7,
        },
      ]);

      const workouts = await workoutsApi.getWorkouts('2024-01-01', '2024-01-31');

      expect(workouts[0].workoutType).toBe('Unknown');
    });

    it('should not use numeric workoutTypeValueId as type string', async () => {
      vi.mocked(mockHttpClient.request).mockResolvedValue([
        {
          workoutId: 1,
          athleteId: 12345,
          workoutDay: '2024-01-15',
          workoutTypeValueId: 7,
        },
      ]);

      const workouts = await workoutsApi.getWorkouts('2024-01-01', '2024-01-31');

      // Should NOT be "7" - that was the bug
      expect(workouts[0].workoutType).not.toBe('7');
      expect(workouts[0].workoutType).toBe('Unknown');
    });

    it('should handle Bike workout type correctly', async () => {
      vi.mocked(mockHttpClient.request).mockResolvedValue([
        {
          workoutId: 1,
          athleteId: 12345,
          workoutDay: '2024-01-15',
          workoutType: 'Bike',
          workoutTypeValueId: 2,
        },
      ]);

      const workouts = await workoutsApi.getWorkouts('2024-01-01', '2024-01-31');

      expect(workouts[0].workoutType).toBe('Bike');
    });

    it('should handle Run workout type correctly', async () => {
      vi.mocked(mockHttpClient.request).mockResolvedValue([
        {
          workoutId: 1,
          athleteId: 12345,
          workoutDay: '2024-01-15',
          workoutType: 'Run',
          workoutTypeValueId: 3,
        },
      ]);

      const workouts = await workoutsApi.getWorkouts('2024-01-01', '2024-01-31');

      expect(workouts[0].workoutType).toBe('Run');
    });
  });
});
