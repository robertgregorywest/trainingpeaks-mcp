import type { HttpClient } from '../client.js';
import type { UserApi } from './user.js';
import type {
  PeakSport,
  PeakType,
  PeakData,
  PeaksResponse,
  WorkoutPeaks,
  GetPeaksOptions,
} from '../types.js';

interface PeaksApiResponse {
  peaks: Array<{
    type: string;
    value: number;
    unit: string;
    workoutId?: number;
    workoutDate?: string;
    workoutTitle?: string;
  }>;
}

interface WorkoutPeaksApiResponse {
  peaks: Array<{
    type: string;
    value: number;
    unit: string;
  }>;
}

export class PeaksApi {
  private client: HttpClient;
  private userApi: UserApi;

  constructor(client: HttpClient, userApi: UserApi) {
    this.client = client;
    this.userApi = userApi;
  }

  async getPeaks(
    sport: PeakSport,
    type: PeakType,
    options: GetPeaksOptions = {}
  ): Promise<PeaksResponse> {
    const athleteId = await this.userApi.getAthleteId();

    const params = new URLSearchParams();
    params.set('sport', sport);
    params.set('type', type);

    if (options.startDate) {
      params.set('startDate', options.startDate);
    }
    if (options.endDate) {
      params.set('endDate', options.endDate);
    }
    if (options.limit) {
      params.set('limit', options.limit.toString());
    }

    const endpoint = `/fitness/v1/athletes/${athleteId}/peaks?${params.toString()}`;
    const response = await this.client.request<PeaksApiResponse>(endpoint);

    return {
      sport,
      peaks: response.peaks.map((p) => ({
        type: p.type as PeakType,
        value: p.value,
        unit: p.unit,
        workoutId: p.workoutId,
        workoutDate: p.workoutDate,
        workoutTitle: p.workoutTitle,
      })),
    };
  }

  async getAllPeaks(sport: PeakSport, options: GetPeaksOptions = {}): Promise<PeaksResponse> {
    const athleteId = await this.userApi.getAthleteId();

    const params = new URLSearchParams();
    params.set('sport', sport);

    if (options.startDate) {
      params.set('startDate', options.startDate);
    }
    if (options.endDate) {
      params.set('endDate', options.endDate);
    }

    const endpoint = `/fitness/v1/athletes/${athleteId}/peaks/all?${params.toString()}`;
    const response = await this.client.request<PeaksApiResponse>(endpoint);

    return {
      sport,
      peaks: response.peaks.map((p) => ({
        type: p.type as PeakType,
        value: p.value,
        unit: p.unit,
        workoutId: p.workoutId,
        workoutDate: p.workoutDate,
        workoutTitle: p.workoutTitle,
      })),
    };
  }

  async getWorkoutPeaks(workoutId: number): Promise<WorkoutPeaks> {
    const athleteId = await this.userApi.getAthleteId();
    const endpoint = `/fitness/v1/athletes/${athleteId}/workouts/${workoutId}/peaks`;
    const response = await this.client.request<WorkoutPeaksApiResponse>(endpoint);

    return {
      workoutId,
      peaks: response.peaks.map((p) => ({
        type: p.type as PeakType,
        value: p.value,
        unit: p.unit,
      })),
    };
  }

  async getPowerPeaks(options: GetPeaksOptions = {}): Promise<PeakData[]> {
    const response = await this.getAllPeaks('Bike', options);
    return response.peaks.filter((p) => p.type.startsWith('power'));
  }

  async getRunningPeaks(options: GetPeaksOptions = {}): Promise<PeakData[]> {
    const response = await this.getAllPeaks('Run', options);
    return response.peaks.filter((p) => p.type.startsWith('speed'));
  }
}

export function createPeaksApi(client: HttpClient, userApi: UserApi): PeaksApi {
  return new PeaksApi(client, userApi);
}
