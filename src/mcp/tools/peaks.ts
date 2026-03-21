import { z } from "zod";
import type { ITrainingPeaksClient } from "../../index.js";
import type { PeakSport, PeakType } from "../../types.js";

const peakSportEnum = z.enum(["Bike", "Run"]);
const peakTypeEnum = z.enum([
  "power5sec",
  "power1min",
  "power5min",
  "power10min",
  "power20min",
  "power60min",
  "power90min",
  "hR5sec",
  "hR1min",
  "hR5min",
  "hR10min",
  "hR20min",
  "hR60min",
  "hR90min",
  "speed400Meter",
  "speed800Meter",
  "speed1K",
  "speed1Mi",
  "speed5K",
  "speed5Mi",
  "speed10K",
  "speed10Mi",
  "speedHalfMarathon",
  "speedMarathon",
  "speed50K",
]);

export const getPeaksSchema = z.object({
  sport: peakSportEnum.describe("Sport type: Bike or Run"),
  type: peakTypeEnum.describe("Peak type (e.g., power5min, speed5K, hR5min)"),
  startDate: z.string().optional().describe("Start date filter (YYYY-MM-DD)"),
  endDate: z.string().optional().describe("End date filter (YYYY-MM-DD)"),
});

export const getWorkoutPeaksSchema = z.object({
  workoutId: z.number().describe("The workout ID"),
});

export async function getPeaks(
  client: ITrainingPeaksClient,
  args: z.infer<typeof getPeaksSchema>,
): Promise<string> {
  const peaks = await client.getPeaks(
    args.sport as PeakSport,
    args.type as PeakType,
    {
      startDate: args.startDate,
      endDate: args.endDate,
    },
  );
  return JSON.stringify(peaks, null, 2);
}

export async function getWorkoutPeaks(
  client: ITrainingPeaksClient,
  args: z.infer<typeof getWorkoutPeaksSchema>,
): Promise<string> {
  const peaks = await client.getWorkoutPeaks(args.workoutId);
  return JSON.stringify(peaks, null, 2);
}
