import { describe, it, expect } from "vitest";
import { buildZwoWorkout } from "../../src/mcp/tools/zwo.js";

function decodeXml(result: string): string {
  const match = result.match(/XML \(base64-encoded\): (.+)/);
  if (!match) throw new Error("No base64 XML found in result");
  return Buffer.from(match[1], "base64").toString("utf-8");
}

describe("zwo tool handler", () => {
  it("returns filename and base64-encoded XML", async () => {
    const result = await buildZwoWorkout({
      name: "Sweet Spot",
      ftp: 250,
      segments: [
        { type: "warmup", duration: 600 },
        { type: "steady", duration: 1200, power: { watts: 225 } },
        { type: "cooldown", duration: 300 },
      ],
    });

    expect(result).toContain("Filename: Sweet_Spot.zwo");
    expect(result).toContain("XML (base64-encoded):");

    const xml = decodeXml(result);
    expect(xml).toContain("<workout_file>");
    expect(xml).toContain('Power="0.9"');
    expect(xml).toContain("<name>Sweet Spot</name>");
  });

  it("sanitizes filename from workout name", async () => {
    const result = await buildZwoWorkout({
      name: "5x5 VO2max <hard>",
      segments: [{ type: "steady", duration: 300, power: { ftpPercent: 100 } }],
    });

    expect(result).toContain("Filename: 5x5_VO2max_hard.zwo");
  });

  it("produces valid XML for a typical interval session", async () => {
    const result = await buildZwoWorkout({
      name: "4x4 Threshold",
      ftp: 280,
      segments: [
        { type: "warmup", duration: 600 },
        {
          type: "intervals",
          repeat: 4,
          onDuration: 240,
          onPower: { watts: 280 },
          offDuration: 120,
          offPower: { watts: 140 },
        },
        { type: "cooldown", duration: 300 },
      ],
    });

    const xml = decodeXml(result);
    expect(xml).toContain('<IntervalsT Repeat="4"');
    expect(xml).toContain('OnPower="1"');
    expect(xml).toContain('OffPower="0.5"');
  });
});
