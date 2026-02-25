import { z } from 'zod';
import type { TrainingPeaksClient } from '../../index.js';
import type { WorkoutDetail, WorkoutLap } from '../../types.js';
import { decodeFitBuffer } from './fit-utils.js';

export const getStrengthWorkoutsSchema = z.object({
  startDate: z.string().describe('Start date in YYYY-MM-DD format'),
  endDate: z.string().describe('End date in YYYY-MM-DD format'),
});

export async function getStrengthWorkouts(
  client: TrainingPeaksClient,
  args: z.infer<typeof getStrengthWorkoutsSchema>
): Promise<string> {
  const workouts = await client.getStrengthWorkouts(args.startDate, args.endDate);
  return JSON.stringify(workouts, null, 2);
}

export const getWorkoutsSchema = z.object({
  startDate: z.string().describe('Start date in YYYY-MM-DD format'),
  endDate: z.string().describe('End date in YYYY-MM-DD format'),
  includeDeleted: z.boolean().optional().describe('Include deleted workouts'),
});

export const getWorkoutSchema = z.object({
  workoutId: z.number().describe('The workout ID'),
});

export const getWorkoutDetailsSchema = z.object({
  workoutId: z.number().describe('The workout ID'),
});

export async function getWorkouts(
  client: TrainingPeaksClient,
  args: z.infer<typeof getWorkoutsSchema>
): Promise<string> {
  const workouts = await client.getWorkouts(args.startDate, args.endDate, {
    includeDeleted: args.includeDeleted,
  });
  return JSON.stringify(workouts, null, 2);
}

export async function getWorkout(
  client: TrainingPeaksClient,
  args: z.infer<typeof getWorkoutSchema>
): Promise<string> {
  const workout = await client.getWorkout(args.workoutId);
  return JSON.stringify(workout, null, 2);
}

export async function getWorkoutDetails(
  client: TrainingPeaksClient,
  args: z.infer<typeof getWorkoutDetailsSchema>
): Promise<string> {
  const workout = await client.getWorkoutDetails(args.workoutId);
  return JSON.stringify(workout, null, 2);
}

// Search workouts by title

export const searchWorkoutsSchema = z.object({
  title: z.string().describe('Case-insensitive substring to match against workout titles'),
  days: z
    .number()
    .optional()
    .default(90)
    .describe('Number of days back from today to search (default 90)'),
});

export async function searchWorkouts(
  client: TrainingPeaksClient,
  args: z.infer<typeof searchWorkoutsSchema>
): Promise<string> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - args.days);

  const format = (d: Date) => d.toISOString().split('T')[0];
  const workouts = await client.getWorkouts(format(startDate), format(endDate));

  const query = args.title.toLowerCase();
  const matches = workouts.filter((w) => w.title?.toLowerCase().includes(query));

  return JSON.stringify(matches, null, 2);
}

// Compare intervals across workouts

export const compareIntervalsSchema = z.object({
  workoutIds: z.array(z.number()).min(1).describe('Workout IDs to compare'),
  minPower: z.number().optional().describe('Minimum average power filter for laps'),
  targetDuration: z.number().optional().describe('Target lap duration in seconds'),
  durationTolerance: z
    .number()
    .optional()
    .default(2)
    .describe('Duration tolerance in seconds (default ±2)'),
});

interface LapValue {
  workoutId: number;
  title?: string;
  date?: string;
  avgPower?: number;
  maxPower?: number;
  avgCadence?: number;
  duration?: number;
}

interface LapRow {
  lapNumber: number;
  values: LapValue[];
}

interface WorkoutSummaryResult {
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

function filterLaps(
  laps: WorkoutLap[],
  args: z.infer<typeof compareIntervalsSchema>
): WorkoutLap[] {
  let filtered = laps;

  if (args.minPower !== undefined) {
    filtered = filtered.filter((l) => (l.averagePower ?? 0) >= args.minPower!);
  }

  if (args.targetDuration !== undefined) {
    const tolerance = args.durationTolerance;
    filtered = filtered.filter((l) => {
      if (l.duration === undefined) return false;
      return Math.abs(l.duration - args.targetDuration!) <= tolerance;
    });
  }

  return filtered;
}

function buildSummary(
  detail: WorkoutDetail,
  laps: WorkoutLap[]
): WorkoutSummaryResult {
  const powers = laps.map((l) => l.averagePower).filter((p): p is number => p !== undefined);
  const avgPower = powers.length > 0 ? Math.round(powers.reduce((a, b) => a + b, 0) / powers.length) : null;
  const minPower = powers.length > 0 ? powers.reduce((a, b) => (b < a ? b : a), powers[0]) : null;
  const maxPower = powers.length > 0 ? powers.reduce((a, b) => (b > a ? b : a), powers[0]) : null;
  const powerRange = minPower !== null && maxPower !== null ? maxPower - minPower : null;
  const cadences = laps.map((l) => l.averageCadence).filter((c): c is number => c !== undefined);
  const avgCadence = cadences.length > 0 ? Math.round(cadences.reduce((a, b) => a + b, 0) / cadences.length) : null;
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

export async function compareIntervals(
  client: TrainingPeaksClient,
  args: z.infer<typeof compareIntervalsSchema>
): Promise<string> {
  // Fetch details + FIT files in parallel for each workout
  const fetches = await Promise.all(
    args.workoutIds.map(async (id) => {
      const [detail, fitBuffer] = await Promise.all([
        client.getWorkoutDetails(id),
        client.downloadActivityFile(id).catch(() => null),
      ]);
      return { detail, fitBuffer };
    })
  );

  const warnings: string[] = [];

  const workoutLaps: { detail: WorkoutDetail; laps: WorkoutLap[] }[] = await Promise.all(
    fetches.map(async ({ detail, fitBuffer }) => {
      let laps: WorkoutLap[];
      if (fitBuffer) {
        laps = await parseLapsFromFit(fitBuffer);
        if (laps.length === 0) {
          warnings.push(`Workout ${detail.workoutId} (${detail.title ?? 'Untitled'}): FIT file contains no laps`);
        }
      } else {
        laps = [];
        warnings.push(`Workout ${detail.workoutId} (${detail.title ?? 'Untitled'}): no FIT file available`);
      }
      return { detail, laps: filterLaps(laps, args) };
    })
  );

  // Align laps side-by-side
  const maxLaps = Math.max(...workoutLaps.map((w) => w.laps.length), 0);
  const laps: LapRow[] = [];

  for (let i = 0; i < maxLaps; i++) {
    const values: LapValue[] = workoutLaps.map((w) => {
      const lap = w.laps[i];
      return {
        workoutId: w.detail.workoutId,
        title: w.detail.title,
        date: w.detail.completedDate ?? w.detail.workoutDay,
        avgPower: lap?.averagePower,
        maxPower: lap?.maxPower,
        avgCadence: lap?.averageCadence,
        duration: lap?.duration,
      };
    });
    laps.push({ lapNumber: i + 1, values });
  }

  const summaries = workoutLaps.map((w) => buildSummary(w.detail, w.laps));

  const result: Record<string, unknown> = { laps, summaries };
  if (warnings.length > 0) {
    result.warnings = warnings;
  }

  return JSON.stringify(result, null, 2);
}
