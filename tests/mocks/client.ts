import { vi } from 'vitest';
import type {
  User,
  WorkoutSummary,
  WorkoutDetail,
  StrengthWorkoutSummary,
  FitnessMetrics,
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
      averageCadence: 85,
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

export const mockPeakData: PeakData[] = [
  {
    type: 'Pr5Minutes',
    value: 320,
    workoutId: 100,
    workoutDate: '2024-01-15',
    workoutTitle: 'Morning Ride',
    rank: 0,
    eventName: '',
  },
];

export const mockWorkoutPeaks: WorkoutPeaks = {
  workoutId: 100,
  personalRecordCount: 1,
  personalRecords: [
    {
      type: 'Pr5Minutes',
      value: 320,
      workoutId: 100,
      workoutDate: '2024-01-15',
      workoutTitle: 'Morning Ride',
      rank: 0,
      eventName: '',
    },
  ],
};

export const mockWorkoutSummary2: WorkoutSummary = {
  workoutId: 102,
  athleteId: 12345,
  title: 'Evening Ride',
  workoutDay: '2024-01-20',
  workoutType: 'Bike',
  completedDate: '2024-01-20',
  totalTime: 5400,
  totalDistance: 60000,
  tssActual: 110,
  hasFile: true,
};

export const mockWorkoutSummary3: WorkoutSummary = {
  workoutId: 103,
  athleteId: 12345,
  title: 'Morning Run',
  workoutDay: '2024-01-18',
  workoutType: 'Run',
  completedDate: '2024-01-18',
  totalTime: 2400,
  totalDistance: 8000,
  tssActual: 50,
  hasFile: true,
};

export const mockWorkoutDetail2: WorkoutDetail = {
  ...mockWorkoutSummary2,
  metrics: {
    averagePower: 210,
    maxPower: 500,
  },
  laps: [
    {
      lapNumber: 1,
      duration: 1800,
      distance: 20000,
      averagePower: 210,
      maxPower: 420,
      averageCadence: 88,
    },
    {
      lapNumber: 2,
      duration: 1800,
      distance: 20000,
      averagePower: 230,
      maxPower: 480,
      averageCadence: 92,
    },
  ],
};

export const mockWorkoutDetailNoLaps: WorkoutDetail = {
  ...mockWorkoutSummary3,
  metrics: {},
  laps: [],
};

export const mockStrengthWorkoutSummary: StrengthWorkoutSummary = {
  workoutId: 'abc-123',
  athleteId: 12345,
  title: 'Upper Body Strength',
  workoutDay: '2024-01-17',
  workoutType: 'StructuredStrength',
  completedDate: '2024-01-17',
  totalTime: 3600,
  totalBlocks: 4,
  completedBlocks: 4,
  totalSets: 12,
  completedSets: 10,
  compliancePercent: 83,
  exercises: [
    { sequenceOrder: '1', title: 'Bench Press', compliancePercent: 100 },
    { sequenceOrder: '2', title: 'Pull Ups', compliancePercent: 75 },
  ],
  isLocked: false,
  isHidden: false,
};

export const mockFitBuffer = Buffer.from('mock FIT file content');

export function createMockClient() {
  return {
    getUser: vi.fn().mockResolvedValue(mockUser),
    getAthleteId: vi.fn().mockResolvedValue(12345),
    getWorkouts: vi.fn().mockResolvedValue([mockWorkoutSummary]),
    getWorkout: vi.fn().mockResolvedValue(mockWorkoutSummary),
    getWorkoutDetails: vi.fn().mockResolvedValue(mockWorkoutDetail),
    downloadActivityFile: vi.fn().mockResolvedValue(mockFitBuffer),
    getFitnessData: vi.fn().mockResolvedValue([mockFitnessMetrics]),
    getCurrentFitness: vi.fn().mockResolvedValue(mockFitnessMetrics),
    getPeaks: vi.fn().mockResolvedValue(mockPeakData),
    getWorkoutPeaks: vi.fn().mockResolvedValue(mockWorkoutPeaks),
    getStrengthWorkouts: vi.fn().mockResolvedValue([mockStrengthWorkoutSummary]),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

export type MockClient = ReturnType<typeof createMockClient>;
