import { z } from "zod";
import { getCurrentDate as getCurrentDateApi } from "../../services/datetime.js";

export const getCurrentDateSchema = z.object({
  format: z
    .enum(["iso", "us", "eu", "custom"])
    .optional()
    .default("iso")
    .describe("Output format (default: iso)"),
  customFormat: z
    .string()
    .optional()
    .describe("Custom format string using YYYY, MM, DD placeholders"),
});

export async function getCurrentDate(
  args: z.infer<typeof getCurrentDateSchema>,
): Promise<string> {
  const result = getCurrentDateApi(args.format, args.customFormat);
  return JSON.stringify(result);
}
