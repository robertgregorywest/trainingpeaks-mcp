import type { IWorkoutDataProvider } from "./types.js";
import type {
  PowerDurationCurveResult,
  WorkoutSummary,
  BuildPowerDurationCurveOptions,
  BestPowerResult,
} from "../../types.js";
import {
  decodeFitBuffer,
  extractPowerStream,
  computeBestPower,
  formatDuration,
} from "../fit-analysis/index.js";

const DEFAULT_DURATIONS = [
  5, 10, 20, 30, 60, 90, 120, 180, 240, 300, 360, 600, 1200,
];

export async function buildPowerDurationCurve(
  provider: IWorkoutDataProvider,
  args: BuildPowerDurationCurveOptions,
): Promise<PowerDurationCurveResult> {
  const durations = args.durations ?? DEFAULT_DURATIONS;
  const excludeSet = new Set(args.exclude_workout_ids ?? []);

  const allWorkouts = await provider.getWorkouts(args.startDate, args.endDate);
  const cyclingWorkouts = allWorkouts.filter(
    (w) => w.workoutType === "Bike" && !excludeSet.has(w.workoutId),
  );

  const warnings: string[] = [];
  const workoutPowerStreams: {
    workout: WorkoutSummary;
    powerStream: number[];
  }[] = [];

  const batchSize = 5;
  for (let i = 0; i < cyclingWorkouts.length; i += batchSize) {
    const batch = cyclingWorkouts.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (workout) => {
        try {
          const buffer = await provider.downloadActivityFile(workout.workoutId);
          if (!buffer) {
            warnings.push(`Workout ${workout.workoutId}: no activity file`);
            return null;
          }
          const messages = await decodeFitBuffer(buffer);
          const recordMesgs = messages.recordMesgs;
          if (!recordMesgs || recordMesgs.length === 0) {
            warnings.push(
              `Workout ${workout.workoutId}: no record data in FIT file`,
            );
            return null;
          }
          const powerStream = extractPowerStream(recordMesgs);
          if (!powerStream.some((p) => p > 0)) {
            warnings.push(`Workout ${workout.workoutId}: no power data`);
            return null;
          }
          return { workout, powerStream };
        } catch (err) {
          warnings.push(
            `Workout ${workout.workoutId}: ${err instanceof Error ? err.message : String(err)}`,
          );
          return null;
        }
      }),
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

export async function getBestPowerForWorkout(
  provider: IWorkoutDataProvider,
  workoutId: number,
  durations: number[],
): Promise<BestPowerResult> {
  const workout = await provider.getWorkout(workoutId);
  const buffer = await provider.downloadActivityFile(workoutId);

  if (!buffer) {
    throw new Error(`No activity file available for workout ${workoutId}`);
  }

  const messages = await decodeFitBuffer(buffer);
  const recordMesgs = messages.recordMesgs;

  if (!recordMesgs || recordMesgs.length === 0) {
    throw new Error("No record data found in FIT file");
  }

  const powerStream = extractPowerStream(recordMesgs);

  const hasPower = powerStream.some((p) => p > 0);
  if (!hasPower) {
    throw new Error("No power data found in workout records");
  }

  const sortedDurations = [...durations].sort((a, b) => a - b);

  const results = sortedDurations.map((duration) => {
    const result = computeBestPower(powerStream, duration);
    if (!result) {
      return {
        durationSeconds: duration,
        bestPowerWatts: null,
        error: "Duration exceeds recording length",
      };
    }
    return {
      durationSeconds: duration,
      bestPowerWatts: result.bestPower,
      startOffsetSeconds: result.startIndex,
    };
  });

  return {
    workoutId,
    workoutDate: workout.workoutDay,
    workoutTitle: workout.title,
    totalRecords: powerStream.length,
    results,
  };
}
