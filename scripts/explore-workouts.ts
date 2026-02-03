/**
 * Explore workout data from TrainingPeaks.
 *
 * This script demonstrates:
 * - Fetching a list of workouts
 * - Getting detailed workout information
 * - Understanding the workout data structure
 *
 * Run with: npm run explore:workouts
 */
import "dotenv/config";
import { TrainingPeaksClient } from "../src/index.js";
import { createAuthManager } from "../src/auth.js";
import { createHttpClient } from "../src/client.js";
import { dump, shape, keys, lastNDays, saveSnapshot } from "./helpers.js";

const client = new TrainingPeaksClient();

// Create raw HTTP client for exploring API responses
const username = process.env.TP_USERNAME!;
const password = process.env.TP_PASSWORD!;
const authManager = createAuthManager({ username, password }, true);
const httpClient = createHttpClient(authManager);

try {
  // Get workouts from the last 30 days
  const { start, end } = lastNDays(30);
  console.log(`Fetching workouts from ${start} to ${end}...\n`);

  const workouts = await client.getWorkouts(start, end);
  console.log(`Found ${workouts.length} workouts\n`);

  // Show the structure of the workout list
  console.log("=== Workout List Structure ===");
  shape(workouts);

  // Show first 3 workouts (or fewer if less available)
  const preview = workouts.slice(0, 10);
  dump("First 3 Workouts", preview);

  // If we have workouts, explore the first one in detail
  if (workouts.length > 0) {
    const firstWorkout = workouts[0];
    console.log(
      `\n--- Exploring workout: ${firstWorkout.title || "Untitled"} ---`,
    );
    console.log(`Workout ID: ${firstWorkout.workoutId}`);
    console.log(`Date: ${firstWorkout.workoutDay}`);
    console.log(`Type: ${firstWorkout.workoutType}`);
    console.log(`Has FIT file: ${firstWorkout.hasFile}`);

    // Get full details
    const details = await client.getWorkoutDetails(firstWorkout.workoutId);

    // Show what fields are available
    console.log("\nAvailable fields in workout details:");
    console.log(keys(details));

    // Show the full structure
    console.log("\n=== Workout Details Structure ===");
    shape(details);

    // Show the full data
    dump("Full Workout Details", details);

    // Explore specific parts if they exist
    if (details.metrics) {
      dump("Metrics", details.metrics);
    }

    if (details.intervals && details.intervals.length > 0) {
      dump("Intervals", details.intervals);
    }

    if (details.laps && details.laps.length > 0) {
      dump("Laps", details.laps);
    }

    // Uncomment to save for later analysis:
    // await saveSnapshot('workout-details', details);
  }

  // Summarize workout types found
  const types = new Map<string, number>();
  for (const w of workouts) {
    const t = w.workoutType || "Unknown";
    types.set(t, (types.get(t) || 0) + 1);
  }
  console.log("\n=== Workout Types Summary ===");
  for (const [type, count] of types) {
    console.log(`  ${type}: ${count}`);
  }

  // Fetch raw API response for analysis (useful for debugging type mapping)
  console.log("\n=== Raw API Response (for type analysis) ===");
  const athleteId = await client.getAthleteId();
  const rawWorkouts = await httpClient.request<unknown[]>(
    `/fitness/v6/athletes/${athleteId}/workouts/${start}/${end}`
  );

  // Find a Strength workout in raw data
  const strengthWorkout = rawWorkouts.find(
    (w: unknown) => (w as { workoutType?: string }).workoutType === "Strength"
  );
  if (strengthWorkout) {
    console.log("\nFound Strength workout in raw API response:");
    dump("Raw Strength Workout", strengthWorkout);
    await saveSnapshot("raw-strength-workout", strengthWorkout);
  } else {
    console.log("\nNo Strength workouts found in raw data.");
    // Show type-related fields from first workout
    if (rawWorkouts.length > 0) {
      const first = rawWorkouts[0] as Record<string, unknown>;
      console.log("\nType-related fields from first workout:");
      console.log(`  workoutType: ${first.workoutType}`);
      console.log(`  workoutTypeValueId: ${first.workoutTypeValueId}`);
      console.log(`  workoutSubTypeId: ${first.workoutSubTypeId}`);
      console.log(`  userTags: ${first.userTags}`);
    }
  }
} finally {
  await client.close();
  await authManager.close();
}
