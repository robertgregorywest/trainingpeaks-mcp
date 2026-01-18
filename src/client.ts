import type { AuthManager } from './auth.js';
import type { HttpClientConfig, RequestOptions } from './types.js';

const DEFAULT_CONFIG: HttpClientConfig = {
  baseUrl: 'https://tpapi.trainingpeaks.com',
  rateLimitMs: 150,
};

export class HttpClient {
  private config: HttpClientConfig;
  private authManager: AuthManager;
  private lastRequestTime = 0;

  constructor(authManager: AuthManager, config: Partial<HttpClientConfig> = {}) {
    this.authManager = authManager;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    await this.enforceRateLimit();

    const token = await this.getValidToken();
    const url = `${this.config.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options.headers,
    };

    const fetchOptions: RequestInit = {
      method: options.method || 'GET',
      headers,
    };

    if (options.body) {
      fetchOptions.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, fetchOptions);
    this.lastRequestTime = Date.now();

    if (response.status === 401) {
      // Token expired, refresh and retry once
      const newToken = await this.authManager.refreshToken();
      headers.Authorization = `Bearer ${newToken}`;

      const retryResponse = await fetch(url, {
        ...fetchOptions,
        headers,
      });

      if (!retryResponse.ok) {
        throw new HttpError(retryResponse.status, await this.getErrorMessage(retryResponse));
      }

      return this.parseResponse<T>(retryResponse);
    }

    if (response.status === 429) {
      // Rate limited, wait and retry
      const retryAfter = parseInt(response.headers.get('Retry-After') || '1', 10);
      await this.sleep(retryAfter * 1000);
      return this.request<T>(endpoint, options);
    }

    if (!response.ok) {
      throw new HttpError(response.status, await this.getErrorMessage(response));
    }

    return this.parseResponse<T>(response);
  }

  async requestRaw(endpoint: string, options: RequestOptions = {}): Promise<Buffer> {
    await this.enforceRateLimit();

    const token = await this.getValidToken();
    const url = `${this.config.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      ...options.headers,
    };

    const response = await fetch(url, {
      method: options.method || 'GET',
      headers,
    });

    this.lastRequestTime = Date.now();

    if (response.status === 401) {
      const newToken = await this.authManager.refreshToken();
      headers.Authorization = `Bearer ${newToken}`;

      const retryResponse = await fetch(url, {
        method: options.method || 'GET',
        headers,
      });

      if (!retryResponse.ok) {
        throw new HttpError(retryResponse.status, await this.getErrorMessage(retryResponse));
      }

      const arrayBuffer = await retryResponse.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }

    if (!response.ok) {
      throw new HttpError(response.status, await this.getErrorMessage(response));
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  private async getValidToken(): Promise<string> {
    const token = this.authManager.getToken();
    if (token) {
      return token;
    }
    return this.authManager.authenticate();
  }

  private async enforceRateLimit(): Promise<void> {
    const elapsed = Date.now() - this.lastRequestTime;
    if (elapsed < this.config.rateLimitMs) {
      await this.sleep(this.config.rateLimitMs - elapsed);
    }
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return response.json() as Promise<T>;
    }
    return response.text() as unknown as T;
  }

  private async getErrorMessage(response: Response): Promise<string> {
    try {
      const data = (await response.json()) as { message?: string; error?: string };
      return data.message || data.error || response.statusText;
    } catch {
      return response.statusText;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'HttpError';
  }
}

export function createHttpClient(
  authManager: AuthManager,
  config?: Partial<HttpClientConfig>
): HttpClient {
  return new HttpClient(authManager, config);
}
