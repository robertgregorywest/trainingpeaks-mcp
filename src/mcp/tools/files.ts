import { z } from 'zod';
import * as fs from 'node:fs/promises';
import { decodeFitBuffer } from './fit-utils.js';

export const parseFitFileSchema = z.object({
  filePath: z.string().describe('Path to the FIT file to parse'),
});

export async function parseFitFile(args: z.infer<typeof parseFitFileSchema>): Promise<string> {
  const buffer = await fs.readFile(args.filePath);
  const messages = await decodeFitBuffer(buffer);

  // Extract key data from FIT file
  const result: Record<string, unknown> = {};

  const fileIdMesgs = messages.fileIdMesgs;
  if (fileIdMesgs && fileIdMesgs.length > 0) {
    result.fileId = fileIdMesgs[0];
  }

  const sessionMesgs = messages.sessionMesgs;
  if (sessionMesgs && sessionMesgs.length > 0) {
    result.sessions = sessionMesgs.map((session: Record<string, unknown>) => ({
      sport: session.sport,
      subSport: session.subSport,
      startTime: session.startTime,
      totalElapsedTime: session.totalElapsedTime,
      totalTimerTime: session.totalTimerTime,
      totalDistance: session.totalDistance,
      totalCalories: session.totalCalories,
      avgSpeed: session.avgSpeed,
      maxSpeed: session.maxSpeed,
      avgHeartRate: session.avgHeartRate,
      maxHeartRate: session.maxHeartRate,
      avgPower: session.avgPower,
      maxPower: session.maxPower,
      normalizedPower: session.normalizedPower,
      avgCadence: session.avgCadence,
      maxCadence: session.maxCadence,
      totalAscent: session.totalAscent,
      totalDescent: session.totalDescent,
    }));
  }

  const lapMesgs = messages.lapMesgs;
  if (lapMesgs && lapMesgs.length > 0) {
    result.laps = lapMesgs.map((lap: Record<string, unknown>) => ({
      startTime: lap.startTime,
      totalElapsedTime: lap.totalElapsedTime,
      totalDistance: lap.totalDistance,
      avgSpeed: lap.avgSpeed,
      maxSpeed: lap.maxSpeed,
      avgHeartRate: lap.avgHeartRate,
      maxHeartRate: lap.maxHeartRate,
      avgPower: lap.avgPower,
      maxPower: lap.maxPower,
      avgCadence: lap.avgCadence,
    }));
  }

  // Include record count but not full records (too verbose)
  const recordMesgs = messages.recordMesgs;
  if (recordMesgs && recordMesgs.length > 0) {
    result.recordCount = recordMesgs.length;
    result.recordSummary = {
      firstRecord: recordMesgs[0],
      lastRecord: recordMesgs[recordMesgs.length - 1],
    };
  }

  return JSON.stringify(result, null, 2);
}
