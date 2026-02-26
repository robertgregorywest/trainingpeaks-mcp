import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FilesApi } from '../../src/api/files.js';
import type { HttpClient } from '../../src/client.js';
import type { UserApi } from '../../src/api/user.js';
import type { FitFileCache } from '../../src/cache.js';

describe('FilesApi', () => {
  let mockHttpClient: HttpClient;
  let mockUserApi: UserApi;
  let mockCache: FitFileCache;

  beforeEach(() => {
    mockHttpClient = {
      request: vi.fn().mockResolvedValue({
        workoutDeviceFileInfos: [{ fileId: 'abc', fileName: 'activity.fit' }],
      }),
      requestRaw: vi.fn().mockResolvedValue(Buffer.from('raw fit data')),
    } as unknown as HttpClient;

    mockUserApi = {
      getAthleteId: vi.fn().mockResolvedValue(12345),
    } as unknown as UserApi;

    mockCache = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
    } as unknown as FitFileCache;
  });

  it('should return cached buffer on cache hit (skip HTTP)', async () => {
    const cachedBuf = Buffer.from('cached fit');
    (mockCache.get as ReturnType<typeof vi.fn>).mockResolvedValue(cachedBuf);

    const api = new FilesApi(mockHttpClient, mockUserApi, mockCache);
    const result = await api.downloadActivityFile(100);

    expect(result).toBe(cachedBuf);
    expect(mockCache.get).toHaveBeenCalledWith(100);
    expect(mockHttpClient.request).not.toHaveBeenCalled();
    expect(mockHttpClient.requestRaw).not.toHaveBeenCalled();
  });

  it('should fetch from API on cache miss and cache result', async () => {
    const api = new FilesApi(mockHttpClient, mockUserApi, mockCache);
    const result = await api.downloadActivityFile(100);

    expect(result).toEqual(Buffer.from('raw fit data'));
    expect(mockCache.get).toHaveBeenCalledWith(100);
    expect(mockHttpClient.request).toHaveBeenCalled();
    expect(mockHttpClient.requestRaw).toHaveBeenCalled();
    expect(mockCache.set).toHaveBeenCalledWith(100, Buffer.from('raw fit data'));
  });

  it('should work without cache (backwards compatible)', async () => {
    const api = new FilesApi(mockHttpClient, mockUserApi);
    const result = await api.downloadActivityFile(100);

    expect(result).toEqual(Buffer.from('raw fit data'));
  });

  it('should not cache null results (no file info)', async () => {
    (mockHttpClient.request as ReturnType<typeof vi.fn>).mockResolvedValue({
      workoutDeviceFileInfos: [],
    });

    const api = new FilesApi(mockHttpClient, mockUserApi, mockCache);
    const result = await api.downloadActivityFile(100);

    expect(result).toBeNull();
    expect(mockCache.set).not.toHaveBeenCalled();
  });
});
