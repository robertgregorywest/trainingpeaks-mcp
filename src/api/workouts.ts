import type { HttpClient } from '../client.js';
import type { UserApi } from './user.js';
import type {
  WorkoutSummary,
  WorkoutDetail,
  GetWorkoutsOptions,
  StrengthWorkoutSummary,
} from '../types.js';

const PEAKSWARE_API_BASE = 'https://api.peakswaresb.com';

const MAX_DATE_RANGE_DAYS = 90;

/** Map workoutTypeValueId → sport name when the API omits the workoutType string. */
const WORKOUT_TYPE_VALUE_MAP: Record<number, string> = {
  1: 'Swim',
  2: 'Bike',
  3: 'Run',
  4: 'Brick',
  5: 'CrossTrain',
  6: 'RestDay',
  7: 'Strength',
  8: 'Custom',
  9: 'Walk',
  10: 'Other',
};

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

  async getStrengthWorkouts(
    startDate: string,
    endDate: string
  ): Promise<StrengthWorkoutSummary[]> {
    const athleteId = await this.userApi.getAthleteId();
    const endpoint = `/rx/activity/v1/workouts/calendar/${athleteId}/${startDate}/${endDate}`;
    const response = await this.client.requestWithBase<StrengthWorkoutApiResponse[]>(
      PEAKSWARE_API_BASE,
      endpoint
    );
    return response.map((w) => this.mapStrengthWorkoutResponse(w, athleteId));
  }

  private mapStrengthWorkoutResponse(
    w: StrengthWorkoutApiResponse,
    athleteId: number
  ): StrengthWorkoutSummary {
    return {
      workoutId: w.id,
      athleteId,
      title: w.title,
      workoutDay: w.prescribedDate,
      workoutType: 'StructuredStrength',
      completedDate: w.completedDateTime ?? undefined,
      totalTime: w.executedDurationInSeconds
        ? w.executedDurationInSeconds / 3600
        : undefined,
      instructions: w.instructions ?? undefined,
      totalBlocks: w.totalBlocks,
      completedBlocks: w.completedBlocks,
      totalSets: w.totalSets,
      completedSets: w.completedSets,
      compliancePercent: w.compliancePercent,
      rpe: w.rpe ?? undefined,
      feel: w.feel ?? undefined,
      exercises: w.sequenceSummary.map((s) => ({
        sequenceOrder: s.sequenceOrder,
        title: s.title,
        compliancePercent: s.compliancePercent,
      })),
      isLocked: w.isLocked,
      isHidden: w.isHidden,
    };
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
      workoutType: w.workoutType || WORKOUT_TYPE_VALUE_MAP[w.workoutTypeValueId ?? -1] || w.userTags?.split(',')[0] || 'Unknown',
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

// Peaksware API response types for strength workouts
interface StrengthWorkoutApiResponse {
  id: string;
  calendarId: number;
  title: string;
  prescribedDate: string;
  prescribedStartTime: string | null;
  startDateTime: string | null;
  completedDateTime: string | null;
  lastUpdatedAt: string;
  instructions: string | null;
  prescribedDurationInSeconds: number | null;
  executedDurationInSeconds: number | null;
  orderOnDay: number | null;
  totalBlocks: number;
  completedBlocks: number;
  totalPrescriptions: number;
  completedPrescriptions: number;
  totalSets: number;
  completedSets: number;
  compliancePercent: number;
  rpe: number | null;
  feel: number | null;
  workoutType: string;
  workoutSubTypeId: number | null;
  isLocked: boolean;
  isHidden: boolean;
  totalComments: number;
  hasPrivateWorkoutNoteForCaller: boolean;
  sequenceSummary: Array<{
    sequenceOrder: string;
    title: string;
    compliancePercent: number;
  }>;
}

export function createWorkoutsApi(client: HttpClient, userApi: UserApi): WorkoutsApi {
  return new WorkoutsApi(client, userApi);
}
