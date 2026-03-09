import { z } from "zod";
import type { TrainingPeaksClient } from "../../index.js";

export const assessComplianceSchema = z.object({
  workoutId: z.number().describe("The workout ID to assess compliance for"),
});

export async function assessCompliance(
  client: TrainingPeaksClient,
  args: z.infer<typeof assessComplianceSchema>,
): Promise<string> {
  const result = await client.assessCompliance(args.workoutId);
  return JSON.stringify(result, null, 2);
}
