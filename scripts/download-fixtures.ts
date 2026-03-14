/**
 * Download plan FIT + activity FIT files for a specific date and save as test fixtures.
 *
 * Usage: npx tsx scripts/download-fixtures.ts [YYYY-MM-DD]
 * Default date: 2026-03-11
 */
import "dotenv/config";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { TrainingPeaksClient } from "../src/index.js";
import { dump } from "./helpers.js";

const date = process.argv[2] || "2026-03-11";
const fixturesDir = path.resolve("tests/fixtures");

const client = new TrainingPeaksClient();

try {
  console.log(`Fetching workouts around ${date}...`);
  const d = new Date(date);
  const start = new Date(d.getTime() - 3 * 86400000)
    .toISOString()
    .split("T")[0];
  const end = new Date(d.getTime() + 3 * 86400000).toISOString().split("T")[0];
  const allWorkouts = await client.getWorkouts(start, end);

  // Filter to the target date
  const workouts = allWorkouts.filter((w) => w.workoutDay.startsWith(date));

  if (workouts.length === 0) {
    console.log(`No workouts found on ${date}. Available workouts:`);
    for (const w of allWorkouts) {
      console.log(`  ${w.workoutDay} | ${w.workoutId}: "${w.title}"`);
    }
    process.exit(1);
  }

  console.log(`Found ${workouts.length} workout(s) on ${date}:`);
  for (const w of workouts) {
    console.log(
      `  ${w.workoutId}: "${w.title}" (${w.workoutType}) planned TSS=${w.tssPlanned}`,
    );
  }

  const workout = workouts.find((w) => w.tssPlanned != null) ?? workouts[0];
  const workoutId = workout.workoutId;
  console.log(`\nUsing: "${workout.title}" (${workoutId})`);
  dump("Workout Summary", workout);

  await fs.mkdir(fixturesDir, { recursive: true });

  // Download plan FIT
  console.log("\nDownloading plan FIT file...");
  const planBuffer = await client.downloadPlanFitFile(workoutId);
  if (planBuffer) {
    const planPath = path.join(fixturesDir, `${date}-plan.fit`);
    await fs.writeFile(planPath, planBuffer);
    console.log(`Saved: ${planPath} (${planBuffer.length} bytes)`);
  } else {
    console.log("No plan FIT file available.");
  }

  // Download activity FIT
  console.log("\nDownloading activity FIT file...");
  const activityBuffer = await client.downloadActivityFile(workoutId);
  if (activityBuffer) {
    const activityPath = path.join(fixturesDir, `${date}-activity.fit`);
    await fs.writeFile(activityPath, activityBuffer);
    console.log(`Saved: ${activityPath} (${activityBuffer.length} bytes)`);
  } else {
    console.log("No activity file available.");
  }

  // Save workout summary as JSON
  const summaryPath = path.join(fixturesDir, `${date}-workout.json`);
  await fs.writeFile(summaryPath, JSON.stringify(workout, null, 2));
  console.log(`\nSaved: ${summaryPath}`);
} finally {
  await client.close();
}
