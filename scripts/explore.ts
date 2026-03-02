/**
 * Main exploration script for the TrainingPeaks API.
 *
 * Usage:
 *   npm run explore          # Run this script
 *   npm run explore:debug    # Run with debugger attached
 *
 * Or in VS Code: Press F5 with this file open
 *
 * Tips:
 * - Hover over variables to see their TypeScript types
 * - Use Ctrl+Space for autocomplete after `client.`
 * - Set breakpoints by clicking left of line numbers
 * - Uncomment sections below to explore different APIs
 */
import "dotenv/config";
import { TrainingPeaksClient } from "../src/index.js";
import { dump, shape, lastNDays } from "./helpers.js";

// Create the client (uses TP_USERNAME and TP_PASSWORD from .env)
const client = new TrainingPeaksClient();

try {
  // ============================================
  // USER PROFILE
  // ============================================
  // const user = await client.getUser();
  // dump('User Profile', user);

  // Just the athlete ID (needed for some API calls)
  const athleteId = await client.getAthleteId();
  console.log(`\nAthlete ID: ${athleteId}`);

  // ============================================
  // WORKOUTS - Uncomment to explore
  // ============================================
  // const { start, end } = lastNDays(30);
  // const workouts = await client.getWorkouts(start, end);
  // dump("Recent Workouts", workouts);
  //
  // // See the shape/structure without all the data:
  // console.log('\nWorkout structure:');
  // shape(workouts);
  //
  // // Get details for the first workout:
  // if (workouts.length > 0) {
  //   const details = await client.getWorkoutDetails(workouts[0].workoutId);
  //   dump("Workout Details", details);
  // }

  // ============================================
  // FITNESS METRICS - Uncomment to explore
  // ============================================
  const currentFitness = await client.getCurrentFitness();
  dump("Current Fitness (CTL/ATL/TSB)", currentFitness);

  const { start, end } = lastNDays(7);
  const fitnessHistory = await client.getFitnessData(start, end);
  dump("Fitness History", fitnessHistory);

  // ============================================
  // PEAKS / PERSONAL RECORDS - Uncomment to explore
  // ============================================
  const bikePeaks = await client.getPeaks("Bike", "power5min");
  dump("Cycling Peaks (power5min)", bikePeaks);
  //
  // const runPeaks = await client.getPeaks('Run', 'speed5K');
  // dump('Running Peaks (speed5K)', runPeaks);
  //
  const { start: curveStart, end: curveEnd } = lastNDays(90);
  const powerCurve = await client.getPowerDurationCurve({
    startDate: curveStart,
    endDate: curveEnd,
  });
  dump("Power Duration Curve (90 days)", powerCurve);

  // ============================================
  // SAVE DATA FOR LATER - Uncomment to use
  // ============================================
  // import { saveSnapshot } from './helpers.js';
  // await saveSnapshot('user-profile', user);
  // await saveSnapshot('workouts', workouts);
} finally {
  // Always close the client (cleans up the browser)
  await client.close();
}
