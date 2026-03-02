import { AuthManager, createAuthManager } from "./auth.js";
import { HttpClient, createHttpClient, HttpError } from "./client.js";
import { UserApi, createUserApi } from "./api/user.js";
import { WorkoutsApi, createWorkoutsApi } from "./api/workouts.js";
import { FilesApi, createFilesApi } from "./api/files.js";
import { FitnessApi, createFitnessApi } from "./api/fitness.js";
import { PeaksApi, createPeaksApi } from "./api/peaks.js";
import { FitFileCache } from "./cache.js";
import {
  buildPowerDurationCurve,
  getBestPowerForWorkout,
  type BuildPowerDurationCurveOptions,
  type BestPowerResult,
} from "./api/power.js";
import { getAerobicDecouplingForWorkout } from "./api/decoupling.js";
import {
  compareIntervalsForWorkouts,
  type CompareIntervalsOptions,
  type CompareIntervalsResult,
} from "./api/intervals.js";
import { parseFitFile, type ParsedFitFile } from "./api/fit.js";
import type {
  ClientOptions,
  User,
  WorkoutSummary,
  WorkoutDetail,
  StrengthWorkoutSummary,
  FitnessMetrics,
  PeakSport,
  PeakType,
  PeakData,
  WorkoutPeaks,
  GetWorkoutsOptions,
  GetPeaksOptions,
  PowerDurationCurveResult,
  AerobicDecouplingResult,
} from "./types.js";

export class TrainingPeaksClient {
  private authManager: AuthManager;
  private httpClient: HttpClient;
  private userApi: UserApi;
  private workoutsApi: WorkoutsApi;
  private filesApi: FilesApi;
  private fitnessApi: FitnessApi;
  private peaksApi: PeaksApi;
  private fileCache: FitFileCache;

  constructor(options: ClientOptions = {}) {
    const username = options.username || process.env.TP_USERNAME;
    const password = options.password || process.env.TP_PASSWORD;

    if (!username || !password) {
      throw new Error(
        "TrainingPeaks credentials required. " +
          "Provide username/password in options or set TP_USERNAME/TP_PASSWORD env vars.",
      );
    }

    this.authManager = createAuthManager(
      { username, password },
      options.headless ?? true,
    );
    this.httpClient = createHttpClient(this.authManager);
    this.userApi = createUserApi(this.httpClient);
    this.workoutsApi = createWorkoutsApi(this.httpClient, this.userApi);
    this.fileCache = new FitFileCache();
    this.filesApi = createFilesApi(
      this.httpClient,
      this.userApi,
      this.fileCache,
    );
    this.fitnessApi = createFitnessApi(this.httpClient, this.userApi);
    this.peaksApi = createPeaksApi(this.httpClient, this.userApi);
  }

  // User methods
  async getUser(): Promise<User> {
    return this.userApi.getUser();
  }

  async getAthleteId(): Promise<number> {
    return this.userApi.getAthleteId();
  }

  // Workout methods
  async getWorkouts(
    startDate: string,
    endDate: string,
    options?: GetWorkoutsOptions,
  ): Promise<WorkoutSummary[]> {
    return this.workoutsApi.getWorkouts(startDate, endDate, options);
  }

  async getWorkout(workoutId: number): Promise<WorkoutSummary> {
    return this.workoutsApi.getWorkout(workoutId);
  }

  async getWorkoutDetails(workoutId: number): Promise<WorkoutDetail> {
    return this.workoutsApi.getWorkoutDetails(workoutId);
  }

  async getStrengthWorkouts(
    startDate: string,
    endDate: string,
  ): Promise<StrengthWorkoutSummary[]> {
    return this.workoutsApi.getStrengthWorkouts(startDate, endDate);
  }

  async searchWorkouts(
    title: string,
    days?: number,
  ): Promise<WorkoutSummary[]> {
    return this.workoutsApi.searchWorkoutsByTitle(title, days);
  }

  // File methods
  async downloadActivityFile(workoutId: number): Promise<Buffer | null> {
    return this.filesApi.downloadActivityFile(workoutId);
  }

  async downloadAttachment(
    workoutId: number,
    attachmentId: number,
  ): Promise<Buffer> {
    return this.filesApi.downloadAttachment(workoutId, attachmentId);
  }

  async parseFitFile(filePath: string): Promise<ParsedFitFile> {
    return parseFitFile(filePath);
  }

  // Fitness methods
  async getFitnessData(
    startDate: string,
    endDate: string,
  ): Promise<FitnessMetrics[]> {
    return this.fitnessApi.getFitnessData(startDate, endDate);
  }

  async getCurrentFitness(): Promise<FitnessMetrics> {
    return this.fitnessApi.getCurrentFitness();
  }

  // Peaks methods
  async getPeaks(
    sport: PeakSport,
    type: PeakType,
    options?: GetPeaksOptions,
  ): Promise<PeakData[]> {
    return this.peaksApi.getPeaks(sport, type, options);
  }

  async getWorkoutPeaks(workoutId: number): Promise<WorkoutPeaks> {
    return this.peaksApi.getWorkoutPeaks(workoutId);
  }

  // Power analysis
  async getBestPower(
    workoutId: number,
    durations: number[],
  ): Promise<BestPowerResult> {
    return getBestPowerForWorkout(this, workoutId, durations);
  }

  async getPowerDurationCurve(
    options: BuildPowerDurationCurveOptions,
  ): Promise<PowerDurationCurveResult> {
    return buildPowerDurationCurve(this, options);
  }

  // Aerobic decoupling
  async getAerobicDecoupling(
    workoutId: number,
  ): Promise<AerobicDecouplingResult> {
    return getAerobicDecouplingForWorkout(this, workoutId);
  }

  // Interval comparison
  async compareIntervals(
    opts: CompareIntervalsOptions,
  ): Promise<CompareIntervalsResult> {
    return compareIntervalsForWorkouts(this, opts);
  }

  // Cache management
  async clearFileCache(): Promise<{ count: number; bytes: number }> {
    return this.fileCache.clear();
  }

  async getFileCacheStats() {
    return this.fileCache.stats();
  }

  // Cleanup
  async close(): Promise<void> {
    await this.authManager.close();
  }
}

export function createClient(options?: ClientOptions): TrainingPeaksClient {
  return new TrainingPeaksClient(options);
}

// Export types
export type {
  ClientOptions,
  User,
  WorkoutSummary,
  WorkoutDetail,
  StrengthWorkoutSummary,
  StrengthExerciseSummary,
  WorkoutMetrics,
  WorkoutInterval,
  WorkoutLap,
  ZoneData,
  FitnessMetrics,
  PeakSport,
  PeakType,
  PeakData,
  WorkoutPeaks,
  GetWorkoutsOptions,
  GetPeaksOptions,
  AuthCredentials,
  AuthToken,
  PowerDurationPoint,
  PowerDurationCurveResult,
  AerobicDecouplingResult,
  AerobicDecouplingHalf,
} from "./types.js";

// Export error class
export { HttpError };
