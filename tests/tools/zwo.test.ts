import { describe, it, expect } from "vitest";
import { buildZwoWorkout } from "../../src/mcp/tools/zwo.js";

describe("zwo tool handler", () => {
  it("returns JSON with xml and fileName", async () => {
    const result = JSON.parse(
      await buildZwoWorkout({
        name: "Sweet Spot",
        ftp: 250,
        segments: [
          { type: "warmup", duration: 600 },
          { type: "steady", duration: 1200, power: { watts: 225 } },
          { type: "cooldown", duration: 300 },
        ],
      }),
    );

    expect(result).toHaveProperty("xml");
    expect(result).toHaveProperty("fileName");
    expect(result.fileName).toBe("Sweet_Spot.zwo");
    expect(result.xml).toContain("<workout_file>");
    expect(result.xml).toContain('Power="0.9"');
  });

  it("sanitizes filename from workout name", async () => {
    const result = JSON.parse(
      await buildZwoWorkout({
        name: "5x5 VO2max <hard>",
        segments: [
          { type: "steady", duration: 300, power: { ftpPercent: 100 } },
        ],
      }),
    );

    expect(result.fileName).toBe("5x5_VO2max_hard.zwo");
  });

  it("produces valid XML for a typical interval session", async () => {
    const result = JSON.parse(
      await buildZwoWorkout({
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
      }),
    );

    expect(result.xml).toContain('<IntervalsT Repeat="4"');
    expect(result.xml).toContain('OnPower="1"');
    expect(result.xml).toContain('OffPower="0.5"');
  });
});
