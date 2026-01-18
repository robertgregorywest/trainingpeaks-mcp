import type { HttpClient } from '../client.js';
import type { UserApi } from './user.js';
import type { FitnessMetrics } from '../types.js';

interface FitnessDataItem {
  workoutDay: string;
  ctl?: number | string;
  atl?: number | string;
  tsb?: number | string;
  tssActual?: number;
  tssPlanned?: number;
  ifActual?: number;
  ifPlanned?: number;
}

type FitnessDataResponse = FitnessDataItem[] | { data: FitnessDataItem[] };

export class FitnessApi {
  private client: HttpClient;
  private userApi: UserApi;

  constructor(client: HttpClient, userApi: UserApi) {
    this.client = client;
    this.userApi = userApi;
  }

  async getFitnessData(startDate: string, endDate: string): Promise<FitnessMetrics[]> {
    const athleteId = await this.userApi.getAthleteId();
    const endpoint = `/fitness/v1/athletes/${athleteId}/reporting/performancedata/${startDate}/${endDate}`;
    const response = await this.client.request<FitnessDataResponse>(endpoint, {
      method: 'POST',
      body: { types: ['ctl', 'atl', 'tsb', 'tss'] },
    });

    // Handle different response structures
    const data = Array.isArray(response) ? response : (response as { data: FitnessDataItem[] }).data || [];

    if (!Array.isArray(data)) {
      console.error('Unexpected fitness API response structure');
      return [];
    }

    return data.map((d) => {
      // Parse CTL/ATL/TSB - they may be strings like "NaN" or numbers
      const parseMetric = (val: number | string | undefined): number => {
        if (val === undefined || val === null) return 0;
        if (typeof val === 'string') {
          const parsed = parseFloat(val);
          return isNaN(parsed) ? 0 : parsed;
        }
        return isNaN(val) ? 0 : val;
      };

      return {
        date: d.workoutDay?.split('T')[0] || '',
        ctl: parseMetric(d.ctl),
        atl: parseMetric(d.atl),
        tsb: parseMetric(d.tsb),
        dailyTss: d.tssActual,
      };
    });
  }

  async getCurrentFitness(): Promise<FitnessMetrics> {
    const today = new Date().toISOString().split('T')[0];
    const data = await this.getFitnessData(today, today);
    return (
      data[0] ?? {
        date: today,
        ctl: 0,
        atl: 0,
        tsb: 0,
      }
    );
  }
}

export function createFitnessApi(client: HttpClient, userApi: UserApi): FitnessApi {
  return new FitnessApi(client, userApi);
}
