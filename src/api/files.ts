import type { HttpClient } from '../client.js';
import type { UserApi } from './user.js';

export class FilesApi {
  private client: HttpClient;
  private userApi: UserApi;

  constructor(client: HttpClient, userApi: UserApi) {
    this.client = client;
    this.userApi = userApi;
  }

  async downloadFitFile(workoutId: number): Promise<Buffer> {
    const athleteId = await this.userApi.getAthleteId();
    const endpoint = `/fitness/v6/athletes/${athleteId}/workouts/${workoutId}/fordevice/fit`;
    return this.client.requestRaw(endpoint);
  }

  async downloadAttachment(workoutId: number, attachmentId: number): Promise<Buffer> {
    const athleteId = await this.userApi.getAthleteId();
    const endpoint = `/fitness/v6/athletes/${athleteId}/workouts/${workoutId}/attachments/${attachmentId}/raw`;
    return this.client.requestRaw(endpoint);
  }
}

export function createFilesApi(client: HttpClient, userApi: UserApi): FilesApi {
  return new FilesApi(client, userApi);
}
