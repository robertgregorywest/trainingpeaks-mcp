import { z } from "zod";
import type { TrainingPeaksClient } from "../../index.js";

export const getAerobicDecouplingSchema = z.object({
  workoutId: z.number().describe("The workout ID"),
});

export async function getAerobicDecoupling(
  client: TrainingPeaksClient,
  args: z.infer<typeof getAerobicDecouplingSchema>,
): Promise<string> {
  const result = await client.getAerobicDecoupling(args.workoutId);
  return JSON.stringify(result, null, 2);
}
