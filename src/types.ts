// Authentication
export interface AuthCredentials {
  username: string;
  password: string;
}

export interface AuthToken {
  token: string;
  expiresAt?: Date;
}

// User
export interface User {
  id: number;
  athleteId: number;
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  gender?: string;
  countryCode?: string;
  timezone?: string;
  isPremium?: boolean;
}

// Workout Summary (from list endpoint)
export interface WorkoutSummary {
  workoutId: number;
  athleteId: number;
  title?: string;
  workoutDay: string;
  workoutType: string;
  completedDate?: string;
  description?: string;
  totalTimePlanned?: number;
  totalTime?: number;
  totalDistancePlanned?: number;
  totalDistance?: number;
  tssPlanned?: number;
  tssActual?: number;
  ifPlanned?: number;
  ifActual?: number;
  energyPlanned?: number;
  energy?: number;
  elevationGain?: number;
  elevationLoss?: number;
  structure?: WorkoutStructure;
  hasFile?: boolean;
  attachments?: WorkoutAttachment[];
}

export interface WorkoutStructure {
  primaryLengthMetric?: string;
  primaryIntensityMetric?: string;
  structure?: WorkoutInterval[];
}

export interface WorkoutAttachment {
  id: number;
  fileName: string;
  fileType: string;
  fileSize?: number;
}

// Workout Details (from details endpoint)
export interface WorkoutDetail extends WorkoutSummary {
  metrics?: WorkoutMetrics;
  intervals?: WorkoutInterval[];
  laps?: WorkoutLap[];
  heartRateZones?: ZoneData[];
  powerZones?: ZoneData[];
  paceZones?: ZoneData[];
}

export interface WorkoutMetrics {
  averageHeartRate?: number;
  maxHeartRate?: number;
  averagePower?: number;
  maxPower?: number;
  normalizedPower?: number;
  averageCadence?: number;
  maxCadence?: number;
  averageSpeed?: number;
  maxSpeed?: number;
  averagePace?: number;
  bestPace?: number;
  variabilityIndex?: number;
  efficiencyFactor?: number;
}

export interface WorkoutInterval {
  name?: string;
  start?: number;
  end?: number;
  duration?: number;
  distance?: number;
  averageHeartRate?: number;
  averagePower?: number;
  averageCadence?: number;
  averageSpeed?: number;
}

export interface WorkoutLap {
  lapNumber: number;
  startTime?: string;
  duration?: number;
  distance?: number;
  averageHeartRate?: number;
  maxHeartRate?: number;
  averagePower?: number;
  maxPower?: number;
  averageCadence?: number;
  averageSpeed?: number;
}

export interface ZoneData {
  zone: number;
  name?: string;
  low?: number;
  high?: number;
  timeInZone?: number;
  percentInZone?: number;
}

// Strength Workout (from Peaksware API)
export interface StrengthWorkoutSummary {
  workoutId: string;
  athleteId: number;
  title: string;
  workoutDay: string;
  workoutType: 'StructuredStrength';
  completedDate?: string;
  totalTime?: number;
  instructions?: string;
  totalBlocks: number;
  completedBlocks: number;
  totalSets: number;
  completedSets: number;
  compliancePercent: number;
  rpe?: number;
  feel?: number;
  exercises: StrengthExerciseSummary[];
  isLocked: boolean;
  isHidden: boolean;
}

export interface StrengthExerciseSummary {
  sequenceOrder: string;
  title: string;
  compliancePercent: number;
}

// Fitness Metrics (CTL/ATL/TSB)
export interface FitnessMetrics {
  date: string;
  ctl: number;
  atl: number;
  tsb: number;
  dailyTss?: number;
}

// Peaks / Personal Records
export type PeakSport = 'Bike' | 'Run';
export type PeakType =
  | 'power5sec'
  | 'power1min'
  | 'power5min'
  | 'power10min'
  | 'power20min'
  | 'power60min'
  | 'power90min'
  | 'hR5sec'
  | 'hR1min'
  | 'hR5min'
  | 'hR10min'
  | 'hR20min'
  | 'hR60min'
  | 'hR90min'
  | 'speed400Meter'
  | 'speed800Meter'
  | 'speed1K'
  | 'speed1Mi'
  | 'speed5K'
  | 'speed5Mi'
  | 'speed10K'
  | 'speed10Mi'
  | 'speedHalfMarathon'
  | 'speedMarathon'
  | 'speed50K';

export interface PeakData {
  type: string;
  value: number;
  workoutId?: number;
  workoutDate?: string;
  workoutTitle?: string;
  rank?: number;
  eventName?: string;
}

export interface WorkoutPeaks {
  workoutId: number;
  personalRecordCount: number;
  personalRecords: PeakData[];
}

// Power Duration Curve
export interface PowerDurationPoint {
  durationSeconds: number;
  durationLabel: string;
  bestPowerWatts: number;
  workoutId: number;
  workoutDate: string;
  workoutTitle?: string;
}

export interface PowerDurationCurveResult {
  startDate: string;
  endDate: string;
  workoutsAnalysed: number;
  workoutsSkipped: number;
  curve: PowerDurationPoint[];
  warnings: string[];
}

// Aerobic Decoupling
export interface AerobicDecouplingHalf {
  avgPower: number;
  avgHR: number;
  hrPowerRatio: number;
}

export interface AerobicDecouplingResult {
  workoutId: number;
  workoutDate: string;
  workoutTitle?: string;
  totalRecords: number;
  firstHalf: AerobicDecouplingHalf;
  secondHalf: AerobicDecouplingHalf;
  decouplingPercent: number;
  interpretation: string;
}

// API Options
export interface GetWorkoutsOptions {
  includeDeleted?: boolean;
}

export interface GetPeaksOptions {
  startDate?: string;
  endDate?: string;
}

// Client Options
export interface ClientOptions {
  username?: string;
  password?: string;
  headless?: boolean;
}

// HTTP Client types
export interface HttpClientConfig {
  baseUrl: string;
  rateLimitMs: number;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
}
