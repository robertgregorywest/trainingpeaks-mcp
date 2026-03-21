/**
 * Explore plan FIT file structure from TrainingPeaks.
 *
 * Downloads a workout's plan FIT file (the coach-prescribed workout structure)
 * and dumps all message types to console for inspection, then runs the
 * compliance assessment to verify correctness.
 *
 * Usage: npm run explore:plan-fit
 *
 * Set WORKOUT_ID env var to target a specific workout, otherwise
 * it will find the first recent workout with planned data.
 */
import "dotenv/config";
import { TrainingPeaksClient } from "../src/index.js";
import { createAuthManager } from "../src/auth.js";
import { createHttpClient } from "../src/client.js";
import {
  decodeFitBuffer,
  parsePlanSteps,
} from "../src/services/fit-analysis/index.js";
import { dump, shape, lastNDays } from "./helpers.js";

const client = new TrainingPeaksClient();

const username = process.env.TP_USERNAME!;
const password = process.env.TP_PASSWORD!;
const authManager = createAuthManager({ username, password }, true);
const httpClient = createHttpClient(authManager);

try {
  let workoutId: number;

  if (process.env.WORKOUT_ID) {
    workoutId = Number(process.env.WORKOUT_ID);
  } else {
    // Find a recent workout that has planned data
    const { start, end } = lastNDays(30);
    console.log(
      `Looking for workouts with planned data (${start} to ${end})...\n`,
    );

    const workouts = await client.getWorkouts(start, end);
    const withPlan = workouts.find(
      (w) => w.tssPlanned != null || w.totalTimePlanned != null,
    );

    if (!withPlan) {
      console.log("No workouts with planned data found in the last 30 days.");
      process.exit(1);
    }

    workoutId = withPlan.workoutId;
    console.log(
      `Found: "${withPlan.title}" (${workoutId}) on ${withPlan.workoutDay}`,
    );
    dump("Workout Summary", withPlan);
  }

  // Download the plan FIT file
  const athleteId = await client.getAthleteId();
  const endpoint = `/fitness/v6/athletes/${athleteId}/workouts/${workoutId}/fordevice/fit`;

  console.log(`\nDownloading plan FIT from: ${endpoint}`);

  try {
    const buffer = await httpClient.requestRaw(endpoint);
    console.log(`Downloaded ${buffer.length} bytes\n`);

    const messages = await decodeFitBuffer(buffer);

    // Show all message types present
    console.log("=== Message Types Found ===");
    for (const [key, value] of Object.entries(messages)) {
      if (Array.isArray(value)) {
        console.log(`  ${key}: ${value.length} messages`);
      } else if (value != null) {
        console.log(`  ${key}: ${typeof value}`);
      }
    }

    // Dump each message type
    for (const [key, value] of Object.entries(messages)) {
      if (Array.isArray(value) && value.length > 0) {
        dump(key, value);
        console.log(`\n--- Shape of ${key} ---`);
        shape(value);
      }
    }

    // Parse plan steps using our parser
    console.log("\n\n=== Parsed Plan Steps ===");
    const planSteps = parsePlanSteps(messages);
    dump("Plan Steps", planSteps);
  } catch (err) {
    console.log(
      `\nFailed to download plan FIT file: ${(err as Error).message}`,
    );
    console.log("This workout may not have a structured plan.");
  }

  // Also download the activity FIT for comparison
  console.log("\n\n=== Activity FIT (for comparison) ===");
  const activityBuffer = await client.downloadActivityFile(workoutId);
  if (activityBuffer) {
    const activityMessages = await decodeFitBuffer(activityBuffer);
    console.log("Activity message types:");
    for (const [key, value] of Object.entries(activityMessages)) {
      if (Array.isArray(value)) {
        console.log(`  ${key}: ${value.length} messages`);
      }
    }

    // Dump activity laps for comparison
    if (activityMessages.lapMesgs && activityMessages.lapMesgs.length > 0) {
      dump("Activity Laps", activityMessages.lapMesgs);
    }
  } else {
    console.log("No activity file for this workout.");
  }

  // Run compliance assessment
  console.log("\n\n=== Compliance Assessment ===");
  const compliance = await client.assessCompliance(workoutId);
  dump("Compliance Result", compliance);
} finally {
  await client.close();
  await authManager.close();
}
