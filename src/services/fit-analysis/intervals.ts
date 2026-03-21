import type { WorkoutDetail, WorkoutLap } from "../../types.js";
import { decodeFitBuffer } from "./decoder.js";

export interface LapValue {
  workoutId: number;
  title?: string;
  date?: string;
  avgPower?: number;
  maxPower?: number;
  avgCadence?: number;
  duration?: number;
}

export interface LapRow {
  lapNumber: number;
  values: LapValue[];
}

export interface WorkoutSummaryResult {
  workoutId: number;
  title?: string;
  date?: string;
  lapCount: number;
  avgPower: number | null;
  minPower: number | null;
  maxPower: number | null;
  powerRange: number | null;
  avgCadence: number | null;
  totalDuration: number;
}

export interface FilterLapsOptions {
  minPower?: number;
  targetDuration?: number;
  durationTolerance: number;
}

export async function parseLapsFromFit(buffer: Buffer): Promise<WorkoutLap[]> {
  let messages;
  try {
    messages = await decodeFitBuffer(buffer);
  } catch {
    return [];
  }

  const lapMesgs = messages.lapMesgs;
  if (!lapMesgs || lapMesgs.length === 0) {
    return [];
  }

  return lapMesgs.map((lap: Record<string, unknown>, i: number) => ({
    lapNumber: i + 1,
    duration: lap.totalElapsedTime as number | undefined,
    distance: lap.totalDistance as number | undefined,
    averageHeartRate: lap.avgHeartRate as number | undefined,
    maxHeartRate: lap.maxHeartRate as number | undefined,
    averagePower: lap.avgPower as number | undefined,
    maxPower: lap.maxPower as number | undefined,
    averageCadence: lap.avgCadence as number | undefined,
  }));
}

export function filterLaps(
  laps: WorkoutLap[],
  opts: FilterLapsOptions,
): WorkoutLap[] {
  let filtered = laps;

  if (opts.minPower !== undefined) {
    filtered = filtered.filter((l) => (l.averagePower ?? 0) >= opts.minPower!);
  }

  if (opts.targetDuration !== undefined) {
    const tolerance = opts.durationTolerance;
    filtered = filtered.filter((l) => {
      if (l.duration === undefined) return false;
      return Math.abs(l.duration - opts.targetDuration!) <= tolerance;
    });
  }

  return filtered;
}

export function buildSummary(
  detail: WorkoutDetail,
  laps: WorkoutLap[],
): WorkoutSummaryResult {
  const powers = laps
    .map((l) => l.averagePower)
    .filter((p): p is number => p !== undefined);
  const avgPower =
    powers.length > 0
      ? Math.round(powers.reduce((a, b) => a + b, 0) / powers.length)
      : null;
  const minPower =
    powers.length > 0
      ? powers.reduce((a, b) => (b < a ? b : a), powers[0])
      : null;
  const maxPower =
    powers.length > 0
      ? powers.reduce((a, b) => (b > a ? b : a), powers[0])
      : null;
  const powerRange =
    minPower !== null && maxPower !== null ? maxPower - minPower : null;
  const cadences = laps
    .map((l) => l.averageCadence)
    .filter((c): c is number => c !== undefined);
  const avgCadence =
    cadences.length > 0
      ? Math.round(cadences.reduce((a, b) => a + b, 0) / cadences.length)
      : null;
  const totalDuration = laps.reduce((sum, l) => sum + (l.duration ?? 0), 0);

  return {
    workoutId: detail.workoutId,
    title: detail.title,
    date: detail.completedDate ?? detail.workoutDay,
    lapCount: laps.length,
    avgPower,
    minPower,
    maxPower,
    powerRange,
    avgCadence,
    totalDuration,
  };
}
