import { gunzipSync } from "node:zlib";
import type { IHttpClient } from "../../client.js";
import type { IUserApi } from "./user.js";
import type { FitFileCache } from "../../cache.js";

export interface IFilesApi {
  downloadActivityFile(workoutId: number): Promise<Buffer | null>;
  downloadPlanFitFile(workoutId: number): Promise<Buffer | null>;
  downloadAttachment(workoutId: number, attachmentId: number): Promise<Buffer>;
}

interface DeviceFileInfo {
  fileId: string;
  fileName: string;
}

interface WorkoutDetailsResponse {
  workoutDeviceFileInfos?: DeviceFileInfo[];
}

export class FilesApi implements IFilesApi {
  private client: IHttpClient;
  private userApi: IUserApi;
  private cache?: FitFileCache;

  constructor(client: IHttpClient, userApi: IUserApi, cache?: FitFileCache) {
    this.client = client;
    this.userApi = userApi;
    this.cache = cache;
  }

  async downloadActivityFile(workoutId: number): Promise<Buffer | null> {
    // Check cache first
    if (this.cache) {
      const cached = await this.cache.get(workoutId);
      if (cached) return cached;
    }

    const athleteId = await this.userApi.getAthleteId();
    const detailsEndpoint = `/fitness/v6/athletes/${athleteId}/workouts/${workoutId}/details`;
    const details =
      await this.client.request<WorkoutDetailsResponse>(detailsEndpoint);

    const fileInfo = details.workoutDeviceFileInfos?.[0];
    if (!fileInfo) {
      return null;
    }

    const rawEndpoint = `/fitness/v6/athletes/${athleteId}/workouts/${workoutId}/rawfiledata/${fileInfo.fileId}`;
    const buffer = await this.client.requestRaw(rawEndpoint);

    const result = fileInfo.fileName.endsWith(".gz")
      ? Buffer.from(gunzipSync(buffer))
      : buffer;

    // Cache the decompressed result
    if (this.cache) {
      await this.cache.set(workoutId, result);
    }

    return result;
  }

  async downloadPlanFitFile(workoutId: number): Promise<Buffer | null> {
    const athleteId = await this.userApi.getAthleteId();
    const endpoint = `/fitness/v6/athletes/${athleteId}/workouts/${workoutId}/fordevice/fit`;
    try {
      return await this.client.requestRaw(endpoint);
    } catch {
      return null;
    }
  }

  async downloadAttachment(
    workoutId: number,
    attachmentId: number,
  ): Promise<Buffer> {
    const athleteId = await this.userApi.getAthleteId();
    const endpoint = `/fitness/v6/athletes/${athleteId}/workouts/${workoutId}/attachments/${attachmentId}/raw`;
    return this.client.requestRaw(endpoint);
  }
}

export function createFilesApi(
  client: IHttpClient,
  userApi: IUserApi,
  cache?: FitFileCache,
): FilesApi {
  return new FilesApi(client, userApi, cache);
}
