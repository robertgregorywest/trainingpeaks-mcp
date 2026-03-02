import { z } from "zod";
import type { TrainingPeaksClient } from "../../index.js";

export const parseFitFileSchema = z.object({
  filePath: z.string().describe("Path to the FIT file to parse"),
});

export async function parseFitFile(
  client: TrainingPeaksClient,
  args: z.infer<typeof parseFitFileSchema>,
): Promise<string> {
  const result = await client.parseFitFile(args.filePath);
  return JSON.stringify(result, null, 2);
}

export const clearFitCacheSchema = z.object({});

export async function clearFitCache(
  client: TrainingPeaksClient,
): Promise<string> {
  const { count, bytes } = await client.clearFileCache();
  const stats = await client.getFileCacheStats();
  return JSON.stringify({
    cleared: { files: count, bytes },
    cacheDir: stats.cacheDir,
  });
}
