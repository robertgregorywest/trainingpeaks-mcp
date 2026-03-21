import type { IHttpClient } from "../../client.js";
import type { IUserApi } from "./user.js";
import type {
  PeakSport,
  PeakType,
  PeakData,
  WorkoutPeaks,
  GetPeaksOptions,
} from "../../types.js";

export interface IPeaksApi {
  getPeaks(
    sport: PeakSport,
    type: PeakType,
    options?: GetPeaksOptions,
  ): Promise<PeakData[]>;
  getWorkoutPeaks(workoutId: number): Promise<WorkoutPeaks>;
}

interface PeaksApiRecord {
  id: number;
  athleteId: number;
  workoutId: number;
  workoutDate: string;
  workoutTypeId: number;
  workoutTitle: string;
  class: string;
  type: string;
  timeFrame: string;
  value: number;
  invalid: boolean;
  rank: number;
  eventName: string;
}

interface WorkoutPeaksApiResponse {
  calcsPending: boolean;
  workoutId: number;
  personalRecordCount: number;
  personalRecords: PeaksApiRecord[];
}

function mapRecord(r: PeaksApiRecord): PeakData {
  return {
    type: r.type,
    value: r.value,
    workoutId: r.workoutId,
    workoutDate: r.workoutDate,
    workoutTitle: r.workoutTitle,
    rank: r.rank,
    eventName: r.eventName,
  };
}

export class PeaksApi implements IPeaksApi {
  private client: IHttpClient;
  private userApi: IUserApi;

  constructor(client: IHttpClient, userApi: IUserApi) {
    this.client = client;
    this.userApi = userApi;
  }

  async getPeaks(
    sport: PeakSport,
    type: PeakType,
    options: GetPeaksOptions = {},
  ): Promise<PeakData[]> {
    const athleteId = await this.userApi.getAthleteId();

    const params = new URLSearchParams();
    params.set("prType", type);

    if (options.startDate) {
      params.set("startDate", `${options.startDate}T00:00:00`);
    }
    if (options.endDate) {
      params.set("endDate", `${options.endDate}T00:00:00`);
    }

    const endpoint = `/personalrecord/v2/athletes/${athleteId}/${sport}?${params.toString()}`;
    const response = await this.client.request<PeaksApiRecord[]>(endpoint);

    return response.map(mapRecord);
  }

  async getWorkoutPeaks(workoutId: number): Promise<WorkoutPeaks> {
    const athleteId = await this.userApi.getAthleteId();
    const endpoint = `/personalrecord/v2/athletes/${athleteId}/workouts/${workoutId}?displayPeaksForBasic=true`;
    const response =
      await this.client.request<WorkoutPeaksApiResponse>(endpoint);

    return {
      workoutId: response.workoutId,
      personalRecordCount: response.personalRecordCount,
      personalRecords: response.personalRecords.map(mapRecord),
    };
  }
}

export function createPeaksApi(
  client: IHttpClient,
  userApi: IUserApi,
): PeaksApi {
  return new PeaksApi(client, userApi);
}
