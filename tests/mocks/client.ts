import { vi } from 'vitest';
import type {
  User,
  WorkoutSummary,
  WorkoutDetail,
  FitnessMetrics,
  PeaksResponse,
  WorkoutPeaks,
  PeakData,
} from '../../src/types.js';

// Sample test data
export const mockUser: User = {
  id: 1,
  athleteId: 12345,
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  dateOfBirth: '1990-01-01',
  gender: 'Male',
  countryCode: 'US',
  timezone: 'America/New_York',
  isPremium: true,
};

export const mockWorkoutSummary: WorkoutSummary = {
  workoutId: 100,
  athleteId: 12345,
  title: 'Morning Ride',
  workoutDay: '2024-01-15',
  workoutType: 'Bike',
  completedDate: '2024-01-15',
  totalTime: 3600,
  totalDistance: 40000,
  tssActual: 75,
  hasFile: true,
};

export const mockStrengthWorkout: WorkoutSummary = {
  workoutId: 101,
  athleteId: 12345,
  title: 'Weight Training',
  workoutDay: '2024-01-16',
  workoutType: 'Strength',
  completedDate: '2024-01-16',
  totalTime: 2700,
  tssActual: 40,
  hasFile: false,
};

export const mockWorkoutDetail: WorkoutDetail = {
  ...mockWorkoutSummary,
  metrics: {
    averageHeartRate: 145,
    maxHeartRate: 175,
    averagePower: 200,
    maxPower: 450,
    normalizedPower: 220,
    averageCadence: 85,
    maxCadence: 110,
    averageSpeed: 30,
    maxSpeed: 55,
  },
  intervals: [
    {
      name: 'Warmup',
      start: 0,
      end: 600,
      duration: 600,
      averageHeartRate: 120,
      averagePower: 150,
    },
  ],
  laps: [
    {
      lapNumber: 1,
      duration: 1800,
      distance: 20000,
      averageHeartRate: 145,
      maxHeartRate: 170,
      averagePower: 200,
      maxPower: 400,
    },
  ],
};

export const mockFitnessMetrics: FitnessMetrics = {
  date: '2024-01-15',
  ctl: 65,
  atl: 80,
  tsb: -15,
  dailyTss: 75,
};

export const mockPeaksResponse: PeaksResponse = {
  sport: 'Bike',
  peaks: [
    {
      type: 'power5min',
      value: 320,
      unit: 'watts',
      workoutId: 100,
      workoutDate: '2024-01-15',
      workoutTitle: 'Morning Ride',
    },
  ],
};

export const mockWorkoutPeaks: WorkoutPeaks = {
  workoutId: 100,
  peaks: [
    {
      type: 'power5min',
      value: 320,
      unit: 'watts',
    },
  ],
};

export const mockPeakData: PeakData[] = [
  {
    type: 'power5min',
    value: 320,
    unit: 'watts',
    workoutId: 100,
    workoutDate: '2024-01-15',
  },
];

export const mockFitBuffer = Buffer.from('mock FIT file content');

export function createMockClient() {
  return {
    getUser: vi.fn().mockResolvedValue(mockUser),
    getAthleteId: vi.fn().mockResolvedValue(12345),
    getWorkouts: vi.fn().mockResolvedValue([mockWorkoutSummary]),
    getWorkout: vi.fn().mockResolvedValue(mockWorkoutSummary),
    getWorkoutDetails: vi.fn().mockResolvedValue(mockWorkoutDetail),
    downloadFitFile: vi.fn().mockResolvedValue(mockFitBuffer),
    downloadAttachment: vi.fn().mockResolvedValue(mockFitBuffer),
    getFitnessData: vi.fn().mockResolvedValue([mockFitnessMetrics]),
    getCurrentFitness: vi.fn().mockResolvedValue(mockFitnessMetrics),
    getPeaks: vi.fn().mockResolvedValue(mockPeaksResponse),
    getAllPeaks: vi.fn().mockResolvedValue(mockPeaksResponse),
    getWorkoutPeaks: vi.fn().mockResolvedValue(mockWorkoutPeaks),
    getPowerPeaks: vi.fn().mockResolvedValue(mockPeakData),
    getRunningPeaks: vi.fn().mockResolvedValue(mockPeakData),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

export type MockClient = ReturnType<typeof createMockClient>;
