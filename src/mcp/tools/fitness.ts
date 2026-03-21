import { z } from "zod";
import type { ITrainingPeaksClient } from "../../index.js";

export const getFitnessDataSchema = z.object({
  startDate: z.string().describe("Start date in YYYY-MM-DD format"),
  endDate: z.string().describe("End date in YYYY-MM-DD format"),
});

export const getCurrentFitnessSchema = z.object({});

export async function getFitnessData(
  client: ITrainingPeaksClient,
  args: z.infer<typeof getFitnessDataSchema>,
): Promise<string> {
  const fitness = await client.getFitnessData(args.startDate, args.endDate);
  return JSON.stringify(fitness, null, 2);
}

export async function getCurrentFitness(
  client: ITrainingPeaksClient,
): Promise<string> {
  const fitness = await client.getCurrentFitness();
  return JSON.stringify(fitness, null, 2);
}
