import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';

interface CacheEntry {
  path: string;
  size: number;
  lastAccess: number;
}

export interface CacheStats {
  entries: number;
  totalBytes: number;
  maxBytes: number;
  cacheDir: string;
}

export class FitFileCache {
  private cacheDir: string;
  private maxBytes: number;
  private index = new Map<number, CacheEntry>();
  private initialized = false;

  constructor(options?: { cacheDir?: string; maxBytes?: number }) {
    this.cacheDir =
      options?.cacheDir ?? path.join(os.homedir(), '.trainingpeaks-mcp', 'cache', 'fit');
    this.maxBytes = options?.maxBytes ?? 500 * 1024 * 1024; // 500MB
  }

  private async init(): Promise<void> {
    if (this.initialized) return;
    await fs.mkdir(this.cacheDir, { recursive: true });

    try {
      const files = await fs.readdir(this.cacheDir);
      for (const file of files) {
        if (!file.endsWith('.fit')) continue;
        const workoutId = parseInt(file.replace('.fit', ''), 10);
        if (isNaN(workoutId)) continue;
        const filePath = path.join(this.cacheDir, file);
        const stat = await fs.stat(filePath);
        this.index.set(workoutId, {
          path: filePath,
          size: stat.size,
          lastAccess: stat.mtimeMs,
        });
      }
    } catch {
      // Empty dir or first run — index stays empty
    }
    this.initialized = true;
  }

  async get(workoutId: number): Promise<Buffer | null> {
    await this.init();
    const entry = this.index.get(workoutId);
    if (!entry) return null;

    try {
      const buffer = await fs.readFile(entry.path);
      const now = Date.now();
      entry.lastAccess = now;
      // Update mtime for LRU ordering on next startup
      await fs.utimes(entry.path, new Date(now), new Date(now)).catch(() => {});
      return buffer;
    } catch {
      // File disappeared — remove from index
      this.index.delete(workoutId);
      return null;
    }
  }

  async set(workoutId: number, buffer: Buffer): Promise<void> {
    await this.init();
    const filePath = path.join(this.cacheDir, `${workoutId}.fit`);

    await fs.writeFile(filePath, buffer);
    const now = Date.now();
    this.index.set(workoutId, { path: filePath, size: buffer.length, lastAccess: now });

    await this.evict();
  }

  async delete(workoutId: number): Promise<boolean> {
    await this.init();
    const entry = this.index.get(workoutId);
    if (!entry) return false;

    try {
      await fs.unlink(entry.path);
    } catch {
      // Already gone
    }
    this.index.delete(workoutId);
    return true;
  }

  async clear(): Promise<{ count: number; bytes: number }> {
    await this.init();
    let count = 0;
    let bytes = 0;

    for (const [id, entry] of this.index) {
      try {
        await fs.unlink(entry.path);
      } catch {
        // Already gone
      }
      bytes += entry.size;
      count++;
      this.index.delete(id);
    }

    return { count, bytes };
  }

  async stats(): Promise<CacheStats> {
    await this.init();
    let totalBytes = 0;
    for (const entry of this.index.values()) {
      totalBytes += entry.size;
    }
    return {
      entries: this.index.size,
      totalBytes,
      maxBytes: this.maxBytes,
      cacheDir: this.cacheDir,
    };
  }

  get size(): number {
    return this.index.size;
  }

  private async evict(): Promise<void> {
    let totalBytes = 0;
    for (const entry of this.index.values()) {
      totalBytes += entry.size;
    }

    if (totalBytes <= this.maxBytes) return;

    // Sort by lastAccess ascending (oldest first)
    const sorted = [...this.index.entries()].sort((a, b) => a[1].lastAccess - b[1].lastAccess);

    for (const [id, entry] of sorted) {
      if (totalBytes <= this.maxBytes) break;
      try {
        await fs.unlink(entry.path);
      } catch {
        // Already gone
      }
      totalBytes -= entry.size;
      this.index.delete(id);
    }
  }
}
