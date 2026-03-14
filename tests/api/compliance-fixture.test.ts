import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { decodeFitBuffer, parsePlanSteps } from "../../src/api/fit.js";
import { computeStepCompliance } from "../../src/api/compliance.js";

const fixturesDir = path.resolve(__dirname, "../fixtures");

const planBuffer = fs.readFileSync(
  path.join(fixturesDir, "2026-03-11-plan.fit"),
);
const activityBuffer = fs.readFileSync(
  path.join(fixturesDir, "2026-03-11-activity.fit"),
);
const workoutSummary = JSON.parse(
  fs.readFileSync(path.join(fixturesDir, "2026-03-11-workout.json"), "utf-8"),
);

describe("compliance with real FIT fixtures (2026-03-11 VO2max intervals)", () => {
  it("should decode plan FIT and parse plan steps", async () => {
    const messages = await decodeFitBuffer(planBuffer);
    expect(messages.workoutStepMesgs).toBeDefined();

    // Raw messages: 12 entries (steps 0-8, repeat marker at 9, cooldown 10-11)
    expect(messages.workoutStepMesgs!).toHaveLength(12);
  });

  it("should decode activity FIT and extract 18 laps", async () => {
    const messages = await decodeFitBuffer(activityBuffer);
    expect(messages.lapMesgs).toBeDefined();
    expect(messages.lapMesgs!).toHaveLength(18);
  });

  it("should expand repeat steps to match activity lap count", async () => {
    const planMessages = await decodeFitBuffer(planBuffer);
    const planSteps = parsePlanSteps(planMessages);

    // The workout structure is:
    //   0: Easy 5min warmup
    //   1: Z2 5min
    //   2: Tempo 2min
    //   3-4: Burst 30s + Recovery 3min
    //   5-6: Burst 30s + Recovery 3min
    //   7-8: Hard 2min + Easy 2min (first of 5 repetitions)
    //   repeat marker: repeat steps 7-8 for 5 total iterations
    //   10: Cool down 10min
    //   11: Open cooldown
    //
    // After expansion: 7 + 10 (5×2) + 2 cooldown = 19 steps
    // Activity has 18 laps because the two cooldown steps merge into one lap.
    expect(planSteps).toHaveLength(19);

    // No leaked repeat markers — every step should have a known intensity
    for (const step of planSteps) {
      expect(step.intensity).not.toBe("unknown");
    }

    // Verify the 5× Hard/Easy repetition block (indices 7-16)
    for (let rep = 0; rep < 5; rep++) {
      const hard = planSteps[7 + rep * 2];
      const easy = planSteps[8 + rep * 2];
      expect(hard.name).toBe("Hard");
      expect(hard.targetLow).toBe(350);
      expect(hard.targetHigh).toBe(378);
      expect(easy.name).toBe("Easy");
      expect(easy.intensity).toBe("rest");
    }

    // Cooldown steps at the end
    expect(planSteps[17].intensity).toBe("cooldown");
    expect(planSteps[17].name).toBe("Cool down");
    expect(planSteps[18].intensity).toBe("cooldown");
    expect(planSteps[18].durationType).toBe("open");
  });

  it("should compute per-step compliance against activity laps", async () => {
    const planMessages = await decodeFitBuffer(planBuffer);
    const activityMessages = await decodeFitBuffer(activityBuffer);

    const planSteps = parsePlanSteps(planMessages);
    const laps = activityMessages.lapMesgs!.map((lap) => ({
      totalElapsedTime:
        typeof lap.totalElapsedTime === "number"
          ? lap.totalElapsedTime
          : undefined,
      avgPower: typeof lap.avgPower === "number" ? lap.avgPower : undefined,
      avgHeartRate:
        typeof lap.avgHeartRate === "number" ? lap.avgHeartRate : undefined,
      avgCadence:
        typeof lap.avgCadence === "number" ? lap.avgCadence : undefined,
    }));

    // 19 plan steps vs 18 laps — the two cooldown steps merge into one lap
    expect(planSteps).toHaveLength(19);
    expect(laps).toHaveLength(18);

    const count = Math.min(planSteps.length, laps.length);
    const results = [];
    for (let idx = 0; idx < count; idx++) {
      results.push(computeStepCompliance(planSteps[idx], laps[idx]));
    }

    // Every step should have a valid stepIndex and known intensity
    for (const r of results) {
      expect(r.stepIndex).toBeGreaterThanOrEqual(0);
      expect(r.intensity).not.toBe("unknown");
    }

    // Steps with power targets and actual values should have ratings
    const ratedSteps = results.filter(
      (r) => r.targetType === "power" && r.actualValue != null,
    );
    expect(ratedSteps.length).toBeGreaterThan(0);
    for (const r of ratedSteps) {
      expect(["under", "on-target", "over"]).toContain(r.rating);
      expect(r.compliancePercent).toBeGreaterThanOrEqual(0);
      expect(r.compliancePercent).toBeLessThanOrEqual(100);
    }

    // The Hard interval steps (350-378W target) should now be correctly matched
    const hardSteps = results.filter(
      (r) => r.targetLow === 350 && r.actualValue != null,
    );
    expect(hardSteps.length).toBe(5);

    // First hard step (lap 7, actual 364W) is on-target
    expect(hardSteps[0].rating).toBe("on-target");
    expect(hardSteps[0].compliancePercent).toBe(100);

    // All hard steps should have a rating
    for (const r of hardSteps) {
      expect(r.rating).toBeDefined();
      expect(r.compliancePercent).toBeDefined();
    }
  });
});
