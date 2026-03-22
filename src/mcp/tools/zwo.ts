import { z } from "zod";
import { buildZwoXml } from "../../services/zwo-builder/index.js";

const powerSpec = z
  .union([
    z.object({
      watts: z.number().describe("Absolute power in watts"),
    }),
    z.object({
      ftpPercent: z
        .number()
        .describe("Power as percentage of FTP, e.g. 75 for 75% FTP"),
    }),
  ])
  .describe("Power target — specify either { watts } or { ftpPercent }");

const segmentSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("warmup"),
    duration: z.number().describe("Duration in seconds"),
    powerStart: powerSpec
      .optional()
      .describe("Starting power (defaults to 25% FTP)"),
    powerEnd: powerSpec
      .optional()
      .describe("Ending power (defaults to 75% FTP)"),
  }),
  z.object({
    type: z.literal("cooldown"),
    duration: z.number().describe("Duration in seconds"),
    powerStart: powerSpec
      .optional()
      .describe("Starting power (defaults to 75% FTP)"),
    powerEnd: powerSpec
      .optional()
      .describe("Ending power (defaults to 25% FTP)"),
  }),
  z.object({
    type: z.literal("steady"),
    duration: z.number().describe("Duration in seconds"),
    power: powerSpec.describe("Constant power target"),
  }),
  z.object({
    type: z.literal("intervals"),
    repeat: z.number().min(1).describe("Number of interval repeats"),
    onDuration: z.number().describe("Work interval duration in seconds"),
    onPower: powerSpec.describe("Work interval power target"),
    offDuration: z.number().describe("Rest interval duration in seconds"),
    offPower: powerSpec.describe("Rest interval power target"),
  }),
  z.object({
    type: z.literal("ramp"),
    duration: z.number().describe("Duration in seconds"),
    powerStart: powerSpec.describe("Starting power"),
    powerEnd: powerSpec.describe("Ending power"),
  }),
  z.object({
    type: z.literal("freeride"),
    duration: z.number().describe("Duration in seconds"),
  }),
]);

export const buildZwoSchema = z.object({
  name: z.string().describe("Workout name"),
  author: z
    .string()
    .optional()
    .describe("Author name (default: TrainingPeaks MCP)"),
  description: z.string().optional().describe("Workout description"),
  ftp: z
    .number()
    .optional()
    .describe(
      "FTP in watts. Required when any segment specifies power in watts (for conversion to FTP fraction). Not needed if all segments use ftpPercent.",
    ),
  segments: z
    .array(segmentSchema)
    .min(1)
    .describe(
      "Ordered workout segments. Types: warmup (ramp up), cooldown (ramp down), steady (constant power), intervals (repeated on/off), ramp (power change), freeride (no target).",
    ),
});

function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\s-_]/g, "")
    .replace(/\s+/g, "_")
    .substring(0, 80);
}

export async function buildZwoWorkout(
  args: z.infer<typeof buildZwoSchema>,
): Promise<string> {
  const xml = buildZwoXml(args);
  const fileName = `${sanitizeFileName(args.name)}.zwo`;
  const xmlBase64 = Buffer.from(xml, "utf-8").toString("base64");
  return `Filename: ${fileName}\nXML (base64-encoded): ${xmlBase64}\n\nDecode the base64 above to get the ZWO XML. Present the decoded XML to the user in a code block.`;
}
