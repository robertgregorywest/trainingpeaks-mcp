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

    it('should fall back to workoutTypeValueId lookup when workoutType string is missing', async () => {
      vi.mocked(mockHttpClient.request).mockResolvedValue([
        {
          workoutId: 1,
          athleteId: 12345,
          workoutDay: '2024-01-15',
          workoutTypeValueId: 2,
        },
      ]);

      const workouts = await workoutsApi.getWorkouts('2024-01-01', '2024-01-31');

      expect(workouts[0].workoutType).toBe('Bike');
    });

    it('should fall back to userTags when workoutType and workoutTypeValueId are both missing', async () => {
      vi.mocked(mockHttpClient.request).mockResolvedValue([
        {
          workoutId: 1,
          athleteId: 12345,
          workoutDay: '2024-01-15',
          userTags: 'Custom Tag,Another',
        },
      ]);

      const workouts = await workoutsApi.getWorkouts('2024-01-01', '2024-01-31');

      expect(workouts[0].workoutType).toBe('Custom Tag');
    });

    it('should return Unknown when all type fields are missing', async () => {
      vi.mocked(mockHttpClient.request).mockResolvedValue([
        {
          workoutId: 1,
          athleteId: 12345,
          workoutDay: '2024-01-15',
        },
      ]);

      const workouts = await workoutsApi.getWorkouts('2024-01-01', '2024-01-31');

      expect(workouts[0].workoutType).toBe('Unknown');
    });

    it('should fall back to userTags when workoutTypeValueId is unknown', async () => {
      vi.mocked(mockHttpClient.request).mockResolvedValue([
        {
          workoutId: 1,
          athleteId: 12345,
          workoutDay: '2024-01-15',
          workoutTypeValueId: 999,
          userTags: 'Custom Tag,Another',
        },
      ]);

      const workouts = await workoutsApi.getWorkouts('2024-01-01', '2024-01-31');

      expect(workouts[0].workoutType).toBe('Custom Tag');
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
