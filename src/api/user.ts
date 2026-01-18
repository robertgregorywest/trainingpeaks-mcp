import type { HttpClient } from '../client.js';
import type { User } from '../types.js';

interface UserApiResponse {
  user: {
    userId: number;
    firstName: string;
    lastName: string;
    email: string;
    dateOfBirth?: string;
    gender?: string;
    countryCode?: string;
    timezone?: string;
  };
  athletes: Array<{
    athleteId: number;
    isPremium?: boolean;
  }>;
}

export class UserApi {
  private client: HttpClient;
  private cachedUser: User | null = null;

  constructor(client: HttpClient) {
    this.client = client;
  }

  async getUser(): Promise<User> {
    if (this.cachedUser) {
      return this.cachedUser;
    }

    const response = await this.client.request<UserApiResponse>('/users/v3/user');

    if (!response || !response.user) {
      console.error('Unexpected API response:', JSON.stringify(response, null, 2));
      throw new Error('Invalid response from user API');
    }

    const athletes = response.athletes || [];
    const user: User = {
      id: response.user.userId,
      athleteId: athletes[0]?.athleteId ?? response.user.userId,
      email: response.user.email,
      firstName: response.user.firstName,
      lastName: response.user.lastName,
      dateOfBirth: response.user.dateOfBirth,
      gender: response.user.gender,
      countryCode: response.user.countryCode,
      timezone: response.user.timezone,
      isPremium: athletes[0]?.isPremium,
    };

    this.cachedUser = user;
    return user;
  }

  async getAthleteId(): Promise<number> {
    const user = await this.getUser();
    return user.athleteId;
  }

  clearCache(): void {
    this.cachedUser = null;
  }
}

export function createUserApi(client: HttpClient): UserApi {
  return new UserApi(client);
}
