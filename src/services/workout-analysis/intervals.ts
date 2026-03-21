import type { IWorkoutDataProvider } from "./types.js";
import type { WorkoutDetail, WorkoutLap } from "../../types.js";
import type {
  CompareIntervalsOptions,
  CompareIntervalsResult,
} from "../../types.js";
import {
  parseLapsFromFit,
  filterLaps,
  buildSummary,
  type LapValue,
  type LapRow,
} from "../fit-analysis/index.js";

export async function compareIntervalsForWorkouts(
  provider: IWorkoutDataProvider,
  opts: CompareIntervalsOptions,
): Promise<CompareIntervalsResult> {
  const fetches = await Promise.all(
    opts.workoutIds.map(async (id) => {
      const [detail, fitBuffer] = await Promise.all([
        provider.getWorkoutDetails(id),
        provider.downloadActivityFile(id).catch(() => null),
      ]);
      return { detail, fitBuffer };
    }),
  );

  const warnings: string[] = [];

  const workoutLaps: { detail: WorkoutDetail; laps: WorkoutLap[] }[] =
    await Promise.all(
      fetches.map(async ({ detail, fitBuffer }) => {
        let laps: WorkoutLap[];
        if (fitBuffer) {
          laps = await parseLapsFromFit(fitBuffer);
          if (laps.length === 0) {
            warnings.push(
              `Workout ${detail.workoutId} (${detail.title ?? "Untitled"}): FIT file contains no laps`,
            );
          }
        } else {
          laps = [];
          warnings.push(
            `Workout ${detail.workoutId} (${detail.title ?? "Untitled"}): no FIT file available`,
          );
        }
        return { detail, laps: filterLaps(laps, opts) };
      }),
    );

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

  const result: CompareIntervalsResult = { laps, summaries };
  if (warnings.length > 0) {
    result.warnings = warnings;
  }

  return result;
}
