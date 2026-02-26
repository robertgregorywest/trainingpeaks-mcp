import { z } from 'zod';
import type { TrainingPeaksClient } from '../../index.js';
import type { PowerDurationCurveResult, WorkoutSummary } from '../../types.js';
import { decodeFitBuffer } from './fit-utils.js';

export const getBestPowerSchema = z.object({
  workoutId: z.number().describe('The workout ID'),
  durations: z
    .array(z.number())
    .describe('Target durations in seconds to compute best power for'),
});

export function computeBestPower(
  powerStream: number[],
  durationSeconds: number
): { bestPower: number; startIndex: number } | null {
  if (durationSeconds > powerStream.length) {
    return null;
  }

  let windowSum = 0;
  for (let i = 0; i < durationSeconds; i++) {
    windowSum += (powerStream[i] ?? 0);
  }

  let bestSum = windowSum;
  let bestStart = 0;

  for (let i = durationSeconds; i < powerStream.length; i++) {
    windowSum += (powerStream[i] ?? 0) - (powerStream[i - durationSeconds] ?? 0);
    if (windowSum > bestSum) {
      bestSum = windowSum;
      bestStart = i - durationSeconds + 1;
    }
  }

  return {
    bestPower: Math.round(bestSum / durationSeconds),
    startIndex: bestStart,
  };
}

export async function getBestPower(
  client: TrainingPeaksClient,
  args: z.infer<typeof getBestPowerSchema>
): Promise<string> {
  const workout = await client.getWorkout(args.workoutId);
  const buffer = await client.downloadActivityFile(args.workoutId);

  if (!buffer) {
    throw new Error(`No activity file available for workout ${args.workoutId}`);
  }

  const messages = await decodeFitBuffer(buffer);
  const recordMesgs = messages.recordMesgs;

  if (!recordMesgs || recordMesgs.length === 0) {
    throw new Error('No record data found in FIT file');
  }

  const powerStream: number[] = recordMesgs.map(
    (r: Record<string, unknown>) => (typeof r.power === 'number' ? r.power : 0)
  );

  const hasPower = powerStream.some((p) => p > 0);
  if (!hasPower) {
    throw new Error('No power data found in workout records');
  }

  const sortedDurations = [...args.durations].sort((a, b) => a - b);

  const results = sortedDurations.map((duration) => {
    const result = computeBestPower(powerStream, duration);
    if (!result) {
      return {
        durationSeconds: duration,
        bestPowerWatts: null,
        error: 'Duration exceeds recording length',
      };
    }
    return {
      durationSeconds: duration,
      bestPowerWatts: result.bestPower,
      startOffsetSeconds: result.startIndex,
    };
  });

  return JSON.stringify(
    {
      workoutId: args.workoutId,
      workoutDate: workout.workoutDay,
      workoutTitle: workout.title,
      totalRecords: powerStream.length,
      results,
    },
    null,
    2
  );
}

// --- Power Duration Curve ---

const DEFAULT_DURATIONS = [5, 10, 20, 30, 60, 90, 120, 180, 240, 300, 360, 600, 1200];

export const getPowerDurationCurveSchema = z.object({
  startDate: z.string().describe('Start date (YYYY-MM-DD)'),
  endDate: z.string().describe('End date (YYYY-MM-DD)'),
  durations: z
    .array(z.number())
    .optional()
    .default(DEFAULT_DURATIONS)
    .describe('Durations in seconds to compute best power for'),
  exclude_workout_ids: z
    .array(z.number())
    .optional()
    .describe('Workout IDs to exclude from analysis'),
});

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (secs === 0) return `${mins}min`;
  return `${mins}min ${secs}s`;
}

export interface BuildPowerDurationCurveOptions {
  startDate: string;
  endDate: string;
  durations?: number[];
  exclude_workout_ids?: number[];
}

export async function buildPowerDurationCurve(
  client: TrainingPeaksClient,
  args: BuildPowerDurationCurveOptions
): Promise<PowerDurationCurveResult> {
  const durations = args.durations ?? DEFAULT_DURATIONS;
  const excludeSet = new Set(args.exclude_workout_ids ?? []);

  const allWorkouts = await client.getWorkouts(args.startDate, args.endDate);
  const cyclingWorkouts = allWorkouts.filter(
    (w) => w.workoutType === 'Bike' && !excludeSet.has(w.workoutId)
  );

  const warnings: string[] = [];
  const workoutPowerStreams: { workout: WorkoutSummary; powerStream: number[] }[] = [];

  // Download and decode FIT files in batches of 5
  const batchSize = 5;
  for (let i = 0; i < cyclingWorkouts.length; i += batchSize) {
    const batch = cyclingWorkouts.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (workout) => {
        try {
          const buffer = await client.downloadActivityFile(workout.workoutId);
          if (!buffer) {
            warnings.push(`Workout ${workout.workoutId}: no activity file`);
            return null;
          }
          const messages = await decodeFitBuffer(buffer);
          const recordMesgs = messages.recordMesgs;
          if (!recordMesgs || recordMesgs.length === 0) {
            warnings.push(`Workout ${workout.workoutId}: no record data in FIT file`);
            return null;
          }
          const powerStream: number[] = recordMesgs.map(
            (r: Record<string, unknown>) => (typeof r.power === 'number' ? r.power : 0)
          );
          if (!powerStream.some((p) => p > 0)) {
            warnings.push(`Workout ${workout.workoutId}: no power data`);
            return null;
          }
          return { workout, powerStream };
        } catch (err) {
          warnings.push(
            `Workout ${workout.workoutId}: ${err instanceof Error ? err.message : String(err)}`
          );
          return null;
        }
      })
    );
    for (const r of results) {
      if (r) workoutPowerStreams.push(r);
    }
  }

  const sortedDurations = [...durations].sort((a, b) => a - b);

  const curve = sortedDurations
    .map((duration) => {
      let bestPower = -1;
      let bestWorkout: WorkoutSummary | null = null;

      for (const { workout, powerStream } of workoutPowerStreams) {
        const result = computeBestPower(powerStream, duration);
        if (result && result.bestPower > bestPower) {
          bestPower = result.bestPower;
          bestWorkout = workout;
        }
      }

      if (!bestWorkout || bestPower < 0) return null;

      return {
        durationSeconds: duration,
        durationLabel: formatDuration(duration),
        bestPowerWatts: bestPower,
        workoutId: bestWorkout.workoutId,
        workoutDate: bestWorkout.workoutDay,
        workoutTitle: bestWorkout.title,
      };
    })
    .filter((p) => p !== null);

  return {
    startDate: args.startDate,
    endDate: args.endDate,
    workoutsAnalysed: workoutPowerStreams.length,
    workoutsSkipped: cyclingWorkouts.length - workoutPowerStreams.length,
    curve,
    warnings,
  };
}

export async function getPowerDurationCurve(
  client: TrainingPeaksClient,
  args: z.infer<typeof getPowerDurationCurveSchema>
): Promise<string> {
  const result = await buildPowerDurationCurve(client, args);
  return JSON.stringify(result, null, 2);
}
