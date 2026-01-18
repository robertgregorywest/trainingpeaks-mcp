import type { HttpClient } from '../client.js';
import type { UserApi } from './user.js';
import type {
  WorkoutSummary,
  WorkoutDetail,
  GetWorkoutsOptions,
} from '../types.js';

const MAX_DATE_RANGE_DAYS = 90;

export class WorkoutsApi {
  private client: HttpClient;
  private userApi: UserApi;

  constructor(client: HttpClient, userApi: UserApi) {
    this.client = client;
    this.userApi = userApi;
  }

  async getWorkouts(
    startDate: string,
    endDate: string,
    options: GetWorkoutsOptions = {}
  ): Promise<WorkoutSummary[]> {
    const athleteId = await this.userApi.getAthleteId();
    const dateRanges = this.chunkDateRange(startDate, endDate, MAX_DATE_RANGE_DAYS);

    const allWorkouts: WorkoutSummary[] = [];

    for (const range of dateRanges) {
      const workouts = await this.fetchWorkoutsForRange(
        athleteId,
        range.start,
        range.end,
        options
      );
      allWorkouts.push(...workouts);
    }

    return allWorkouts;
  }

  private async fetchWorkoutsForRange(
    athleteId: number,
    startDate: string,
    endDate: string,
    options: GetWorkoutsOptions
  ): Promise<WorkoutSummary[]> {
    const endpoint = `/fitness/v6/athletes/${athleteId}/workouts/${startDate}/${endDate}`;
    const response = await this.client.request<WorkoutApiResponse[]>(endpoint);

    return response
      .filter((w) => options.includeDeleted || !w.isDeleted)
      .map((w) => this.mapWorkoutResponse(w));
  }

  async getWorkout(workoutId: number): Promise<WorkoutSummary> {
    const athleteId = await this.userApi.getAthleteId();
    const endpoint = `/fitness/v6/athletes/${athleteId}/workouts/${workoutId}`;
    const response = await this.client.request<WorkoutApiResponse>(endpoint);
    return this.mapWorkoutResponse(response);
  }

  async getWorkoutDetails(workoutId: number): Promise<WorkoutDetail> {
    const athleteId = await this.userApi.getAthleteId();
    // The main workout endpoint contains all the metrics we need
    const endpoint = `/fitness/v6/athletes/${athleteId}/workouts/${workoutId}`;
    const response = await this.client.request<WorkoutApiResponse>(endpoint);
    return this.mapWorkoutDetailResponse(response);
  }

  private mapWorkoutResponse(w: WorkoutApiResponse): WorkoutSummary {
    // Determine if workout has device file by checking for recorded metrics
    const hasDeviceData = !!(
      w.heartRateAverage ||
      w.powerAverage ||
      w.startTime
    );

    return {
      workoutId: w.workoutId,
      athleteId: w.athleteId,
      title: w.title,
      workoutDay: w.workoutDay,
      workoutType: w.userTags?.split(',')[0] || w.workoutTypeValueId?.toString() || w.workoutType || 'Unknown',
      completedDate: w.startTime,
      description: w.description,
      totalTimePlanned: w.totalTimePlanned,
      totalTime: w.totalTime,
      totalDistancePlanned: w.totalDistancePlanned,
      totalDistance: w.distance,
      tssPlanned: w.tssPlanned,
      tssActual: w.tssActual,
      ifPlanned: w.ifPlanned,
      ifActual: w.if,
      energyPlanned: w.energyPlanned,
      energy: w.energy,
      elevationGain: w.elevationGain,
      elevationLoss: w.elevationLoss,
      hasFile: hasDeviceData,
      attachments: w.attachments?.map((a) => ({
        id: a.attachmentId,
        fileName: a.fileName,
        fileType: a.fileType,
        fileSize: a.fileSize,
      })),
    };
  }

  private mapWorkoutDetailResponse(w: WorkoutApiResponse): WorkoutDetail {
    const summary = this.mapWorkoutResponse(w);

    // Build metrics from the flat response structure
    const hasMetrics = w.heartRateAverage || w.powerAverage || w.cadenceAverage || w.velocityAverage;

    return {
      ...summary,
      metrics: hasMetrics
        ? {
            averageHeartRate: w.heartRateAverage,
            maxHeartRate: w.heartRateMaximum,
            averagePower: w.powerAverage,
            maxPower: w.powerMaximum,
            normalizedPower: w.normalizedPowerActual,
            averageCadence: w.cadenceAverage,
            maxCadence: w.cadenceMaximum,
            averageSpeed: w.velocityAverage,
            maxSpeed: w.velocityMaximum,
          }
        : undefined,
    };
  }

  private chunkDateRange(
    startDate: string,
    endDate: string,
    maxDays: number
  ): Array<{ start: string; end: string }> {
    const ranges: Array<{ start: string; end: string }> = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    let currentStart = new Date(start);

    while (currentStart < end) {
      const currentEnd = new Date(currentStart);
      currentEnd.setDate(currentEnd.getDate() + maxDays - 1);

      if (currentEnd > end) {
        currentEnd.setTime(end.getTime());
      }

      ranges.push({
        start: this.formatDate(currentStart),
        end: this.formatDate(currentEnd),
      });

      currentStart = new Date(currentEnd);
      currentStart.setDate(currentStart.getDate() + 1);
    }

    return ranges;
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}

// API response types
interface WorkoutApiResponse {
  workoutId: number;
  athleteId: number;
  title?: string;
  workoutDay: string;
  startTime?: string;
  workoutType?: string;
  workoutTypeValueId?: number;
  workoutSubTypeId?: number;
  userTags?: string;
  completedDate?: string;
  description?: string;
  totalTimePlanned?: number;
  totalTime?: number;
  totalDistancePlanned?: number;
  distance?: number;
  tssPlanned?: number;
  tssActual?: number;
  ifPlanned?: number;
  if?: number;
  energyPlanned?: number;
  energy?: number;
  elevationGain?: number;
  elevationLoss?: number;
  heartRateAverage?: number;
  heartRateMaximum?: number;
  heartRateMinimum?: number;
  powerAverage?: number;
  powerMaximum?: number;
  normalizedPowerActual?: number;
  cadenceAverage?: number;
  cadenceMaximum?: number;
  velocityAverage?: number;
  velocityMaximum?: number;
  calories?: number;
  personalRecordCount?: number;
  isDeleted?: boolean;
  attachments?: Array<{
    attachmentId: number;
    fileName: string;
    fileType: string;
    fileSize?: number;
  }>;
}

export function createWorkoutsApi(client: HttpClient, userApi: UserApi): WorkoutsApi {
  return new WorkoutsApi(client, userApi);
}
