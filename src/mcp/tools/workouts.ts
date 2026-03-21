import { z } from "zod";
import type { ITrainingPeaksClient } from "../../index.js";

export const getStrengthWorkoutsSchema = z.object({
  startDate: z.string().describe("Start date in YYYY-MM-DD format"),
  endDate: z.string().describe("End date in YYYY-MM-DD format"),
});

export async function getStrengthWorkouts(
  client: ITrainingPeaksClient,
  args: z.infer<typeof getStrengthWorkoutsSchema>,
): Promise<string> {
  const workouts = await client.getStrengthWorkouts(
    args.startDate,
    args.endDate,
  );
  return JSON.stringify(workouts, null, 2);
}

export const getWorkoutsSchema = z.object({
  startDate: z.string().describe("Start date in YYYY-MM-DD format"),
  endDate: z.string().describe("End date in YYYY-MM-DD format"),
  includeDeleted: z.boolean().optional().describe("Include deleted workouts"),
});

export const getWorkoutSchema = z.object({
  workoutId: z.number().describe("The workout ID"),
});

export const getWorkoutDetailsSchema = z.object({
  workoutId: z.number().describe("The workout ID"),
});

export async function getWorkouts(
  client: ITrainingPeaksClient,
  args: z.infer<typeof getWorkoutsSchema>,
): Promise<string> {
  const workouts = await client.getWorkouts(args.startDate, args.endDate, {
    includeDeleted: args.includeDeleted,
  });
  return JSON.stringify(workouts, null, 2);
}

export async function getWorkout(
  client: ITrainingPeaksClient,
  args: z.infer<typeof getWorkoutSchema>,
): Promise<string> {
  const workout = await client.getWorkout(args.workoutId);
  return JSON.stringify(workout, null, 2);
}

export async function getWorkoutDetails(
  client: ITrainingPeaksClient,
  args: z.infer<typeof getWorkoutDetailsSchema>,
): Promise<string> {
  const workout = await client.getWorkoutDetails(args.workoutId);
  return JSON.stringify(workout, null, 2);
}

// Search workouts by title

export const searchWorkoutsSchema = z.object({
  title: z
    .string()
    .describe("Case-insensitive substring to match against workout titles"),
  days: z
    .number()
    .optional()
    .default(90)
    .describe("Number of days back from today to search (default 90)"),
});

export async function searchWorkouts(
  client: ITrainingPeaksClient,
  args: z.infer<typeof searchWorkoutsSchema>,
): Promise<string> {
  const matches = await client.searchWorkouts(args.title, args.days);
  return JSON.stringify(matches, null, 2);
}

// Compare intervals across workouts

export const compareIntervalsSchema = z.object({
  workoutIds: z.array(z.number()).min(1).describe("Workout IDs to compare"),
  minPower: z
    .number()
    .optional()
    .describe("Minimum average power filter for laps"),
  targetDuration: z
    .number()
    .optional()
    .describe("Target lap duration in seconds"),
  durationTolerance: z
    .number()
    .optional()
    .default(2)
    .describe("Duration tolerance in seconds (default ±2)"),
});

export async function compareIntervals(
  client: ITrainingPeaksClient,
  args: z.infer<typeof compareIntervalsSchema>,
): Promise<string> {
  const result = await client.compareIntervals(args);
  return JSON.stringify(result, null, 2);
}
