/**
 * Explore the power duration curve from TrainingPeaks.
 *
 * Builds a best-power curve across cycling workouts in a date range.
 *
 * Run with: npm run explore:power-curve
 */
import 'dotenv/config';
import { TrainingPeaksClient } from '../src/index.js';
import { buildPowerDurationCurve, formatDuration } from '../src/mcp/tools/power.js';
import { dump, lastNDays } from './helpers.js';

const client = new TrainingPeaksClient();

try {
  const athleteId = await client.getAthleteId();
  console.log(`Athlete ID: ${athleteId}\n`);

  // 1. Default durations, last 90 days
  const { start: start90, end: end90 } = lastNDays(90);
  console.log(`=== Power Duration Curve (last 90 days: ${start90} → ${end90}) ===`);
  const curve90 = await buildPowerDurationCurve(client, {
    startDate: start90,
    endDate: end90,
  });
  dump('90-day curve', curve90);

  // Print a compact table
  if (curve90.curve.length > 0) {
    console.log('\nDuration        | Watts | Workout');
    console.log('----------------|-------|--------');
    for (const pt of curve90.curve) {
      const dur = formatDuration(pt.durationSeconds).padEnd(15);
      const watts = String(pt.bestPowerWatts).padStart(5);
      console.log(`${dur} | ${watts} | ${pt.workoutTitle ?? pt.workoutId} (${pt.workoutDate})`);
    }
  }

  // 2. Custom durations, last 30 days
  const { start: start30, end: end30 } = lastNDays(30);
  console.log(`\n=== Power Duration Curve (last 30 days: ${start30} → ${end30}, custom durations) ===`);
  const curve30 = await buildPowerDurationCurve(client, {
    startDate: start30,
    endDate: end30,
    durations: [5, 15, 30, 60, 300, 600, 1200, 1800, 3600],
  });
  dump('30-day curve (custom durations)', curve30);
} finally {
  await client.close();
}
