import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { FitFileCache } from '../src/cache.js';

describe('FitFileCache', () => {
  let cacheDir: string;
  let cache: FitFileCache;

  beforeEach(async () => {
    cacheDir = path.join(os.tmpdir(), `fit-cache-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    cache = new FitFileCache({ cacheDir, maxBytes: 1024 });
  });

  afterEach(async () => {
    try {
      await fs.rm(cacheDir, { recursive: true });
    } catch {
      // Already gone
    }
  });

  it('should return null on cache miss', async () => {
    expect(await cache.get(999)).toBeNull();
  });

  it('should store and retrieve a buffer', async () => {
    const buf = Buffer.from('test fit data');
    await cache.set(100, buf);
    const result = await cache.get(100);
    expect(result).toEqual(buf);
  });

  it('should create cache directory on first write', async () => {
    await cache.set(100, Buffer.from('data'));
    const stat = await fs.stat(cacheDir);
    expect(stat.isDirectory()).toBe(true);
  });

  it('should delete a cached file', async () => {
    await cache.set(100, Buffer.from('data'));
    expect(await cache.delete(100)).toBe(true);
    expect(await cache.get(100)).toBeNull();
  });

  it('should return false when deleting non-existent entry', async () => {
    expect(await cache.delete(999)).toBe(false);
  });

  it('should clear all cached files', async () => {
    await cache.set(1, Buffer.from('aaa'));
    await cache.set(2, Buffer.from('bbb'));
    const { count, bytes } = await cache.clear();
    expect(count).toBe(2);
    expect(bytes).toBe(6);
    expect(await cache.get(1)).toBeNull();
    expect(await cache.get(2)).toBeNull();
  });

  it('should report stats', async () => {
    await cache.set(1, Buffer.from('hello'));
    const stats = await cache.stats();
    expect(stats.entries).toBe(1);
    expect(stats.totalBytes).toBe(5);
    expect(stats.maxBytes).toBe(1024);
    expect(stats.cacheDir).toBe(cacheDir);
  });

  it('should evict least-recently-accessed files when over limit', async () => {
    // maxBytes = 1024, write 3 x 400 byte files = 1200 > 1024
    const buf400 = Buffer.alloc(400, 'x');
    await cache.set(1, buf400);
    await cache.set(2, buf400);

    // Access file 1 so it's more recent
    await cache.get(1);

    // This should trigger eviction of file 2 (least recently accessed)
    await cache.set(3, buf400);

    expect(await cache.get(1)).not.toBeNull();
    expect(await cache.get(2)).toBeNull();
    expect(await cache.get(3)).not.toBeNull();
  });

  it('should populate index from existing files on startup', async () => {
    // Manually create a cached file
    await fs.mkdir(cacheDir, { recursive: true });
    await fs.writeFile(path.join(cacheDir, '42.fit'), Buffer.from('cached'));

    // Create a new cache instance pointing to same dir
    const cache2 = new FitFileCache({ cacheDir, maxBytes: 1024 });
    const result = await cache2.get(42);
    expect(result).toEqual(Buffer.from('cached'));
  });

  it('should handle missing file gracefully on get', async () => {
    await cache.set(100, Buffer.from('data'));
    // Remove the file behind the cache's back
    await fs.unlink(path.join(cacheDir, '100.fit'));
    expect(await cache.get(100)).toBeNull();
  });
});
