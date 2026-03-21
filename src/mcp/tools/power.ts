import { z } from "zod";
import type { ITrainingPeaksClient } from "../../index.js";

export const getBestPowerSchema = z.object({
  workoutId: z.number().describe("The workout ID"),
  durations: z
    .array(z.number())
    .describe("Target durations in seconds to compute best power for"),
});

export async function getBestPower(
  client: ITrainingPeaksClient,
  args: z.infer<typeof getBestPowerSchema>,
): Promise<string> {
  const result = await client.getBestPower(args.workoutId, args.durations);
  return JSON.stringify(result, null, 2);
}

const DEFAULT_DURATIONS = [
  5, 10, 20, 30, 60, 90, 120, 180, 240, 300, 360, 600, 1200,
];

export const getPowerDurationCurveSchema = z.object({
  startDate: z.string().describe("Start date (YYYY-MM-DD)"),
  endDate: z.string().describe("End date (YYYY-MM-DD)"),
  durations: z
    .array(z.number())
    .optional()
    .default(DEFAULT_DURATIONS)
    .describe("Durations in seconds to compute best power for"),
  exclude_workout_ids: z
    .array(z.number())
    .optional()
    .describe("Workout IDs to exclude from analysis"),
});

export async function getPowerDurationCurve(
  client: ITrainingPeaksClient,
  args: z.infer<typeof getPowerDurationCurveSchema>,
): Promise<string> {
  const result = await client.getPowerDurationCurve(args);
  return JSON.stringify(result, null, 2);
}
