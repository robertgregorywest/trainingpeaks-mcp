import type { HttpClient } from "../../client.js";
import type { User } from "../../types.js";

interface UserApiResponse {
  user: {
    userId: number;
    firstName: string;
    lastName: string;
    email: string;
    birthday?: string;
    gender?: string;
    country?: string;
    timeZone?: string;
    settings?: {
      account?: {
        isPremium?: boolean;
      };
    };
    athletes?: Array<{
      athleteId: number;
    }>;
  };
}

export class UserApi {
  private client: HttpClient;
  private cachedUser: User | null = null;
  private fetchPromise: Promise<User> | null = null;

  constructor(client: HttpClient) {
    this.client = client;
  }

  async getUser(): Promise<User> {
    if (this.cachedUser) {
      return this.cachedUser;
    }

    if (this.fetchPromise) {
      return this.fetchPromise;
    }

    this.fetchPromise = this.fetchUser().finally(() => {
      this.fetchPromise = null;
    });
    return this.fetchPromise;
  }

  private async fetchUser(): Promise<User> {
    const response =
      await this.client.request<UserApiResponse>("/users/v3/user");

    if (!response || !response.user) {
      console.error(
        "Unexpected API response:",
        JSON.stringify(response, null, 2),
      );
      throw new Error("Invalid response from user API");
    }

    const athletes = response.user.athletes || [];
    const user: User = {
      id: response.user.userId,
      athleteId: athletes[0]?.athleteId ?? response.user.userId,
      email: response.user.email,
      firstName: response.user.firstName,
      lastName: response.user.lastName,
      dateOfBirth: response.user.birthday,
      gender: response.user.gender,
      countryCode: response.user.country,
      timezone: response.user.timeZone,
      isPremium: response.user.settings?.account?.isPremium,
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
    this.fetchPromise = null;
  }
}

export function createUserApi(client: HttpClient): UserApi {
  return new UserApi(client);
}
