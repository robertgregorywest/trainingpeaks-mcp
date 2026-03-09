import { describe, it, expect } from "vitest";
import { computeStepCompliance } from "../../src/api/compliance.js";
import { parsePlanSteps } from "../../src/api/fit.js";
import type { PlanStep } from "../../src/types.js";

describe("parsePlanSteps", () => {
  it("should return empty array for missing workout step messages", () => {
    expect(parsePlanSteps({})).toEqual([]);
    expect(parsePlanSteps({ workoutStepMesgs: [] })).toEqual([]);
  });

  it("should parse basic workout steps and decode power offset", () => {
    const messages = {
      workoutStepMesgs: [
        {
          messageIndex: 0,
          wktStepName: "Warmup",
          intensity: "warmup",
          durationType: "time",
          durationTime: 600,
          targetType: "power",
          targetValue: 0,
          customTargetValueLow: 1100,
          customTargetValueHigh: 1150,
        },
        {
          messageIndex: 1,
          wktStepName: "Main Set",
          intensity: "active",
          durationType: "time",
          durationTime: 1200,
          targetType: "power",
          targetValue: 0,
          customTargetValueLow: 1250,
          customTargetValueHigh: 1280,
        },
      ],
    };

    const steps = parsePlanSteps(messages);
    expect(steps).toHaveLength(2);

    expect(steps[0]).toEqual({
      stepIndex: 0,
      name: "Warmup",
      intensity: "warmup",
      durationType: "time",
      durationValue: 600,
      targetType: "power",
      targetLow: 100,
      targetHigh: 150,
      targetValue: 0,
    });

    expect(steps[1]).toEqual({
      stepIndex: 1,
      name: "Main Set",
      intensity: "active",
      durationType: "time",
      durationValue: 1200,
      targetType: "power",
      targetLow: 250,
      targetHigh: 280,
      targetValue: 0,
    });
  });

  it("should expand repeat steps", () => {
    const messages = {
      workoutStepMesgs: [
        {
          messageIndex: 0,
          intensity: "active",
          durationType: "time",
          durationTime: 300,
          targetType: "power",
          customTargetValueLow: 1250,
          customTargetValueHigh: 1280,
        },
        {
          messageIndex: 1,
          intensity: "rest",
          durationType: "time",
          durationTime: 120,
          targetType: "open",
        },
        {
          // Repeat marker: repeat 2 steps, 3 times total
          messageIndex: 2,
          repeatSteps: 2,
          repeatTimes: 3,
        },
      ],
    };

    const steps = parsePlanSteps(messages);
    // First iteration: 2 steps, then 2 more iterations from repeat = 6 total
    expect(steps).toHaveLength(6);
    expect(steps[0].intensity).toBe("active");
    expect(steps[1].intensity).toBe("rest");
    expect(steps[2].intensity).toBe("active");
    expect(steps[3].intensity).toBe("rest");
    expect(steps[4].intensity).toBe("active");
    expect(steps[5].intensity).toBe("rest");
    // Step indices should be sequential
    expect(steps.map((s) => s.stepIndex)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("should handle distance-based duration", () => {
    const messages = {
      workoutStepMesgs: [
        {
          messageIndex: 0,
          intensity: "active",
          durationType: "distance",
          durationDistance: 5000,
          targetType: "heartRate",
          customTargetValueLow: 140,
          customTargetValueHigh: 155,
        },
      ],
    };

    const steps = parsePlanSteps(messages);
    expect(steps[0].durationType).toBe("distance");
    expect(steps[0].durationValue).toBe(5000);
    expect(steps[0].targetType).toBe("heartRate");
  });

  it("should handle open duration and target", () => {
    const messages = {
      workoutStepMesgs: [
        {
          messageIndex: 0,
          intensity: "cooldown",
          durationType: "open",
          targetType: "open",
        },
      ],
    };

    const steps = parsePlanSteps(messages);
    expect(steps[0].durationType).toBe("open");
    expect(steps[0].targetType).toBe("open");
    expect(steps[0].durationValue).toBeUndefined();
  });
});

describe("computeStepCompliance", () => {
  const baseStep: PlanStep = {
    stepIndex: 0,
    intensity: "active",
    durationType: "time",
    durationValue: 1200,
    targetType: "power",
    targetLow: 250,
    targetHigh: 280,
  };

  it("should rate on-target when actual is within range", () => {
    const result = computeStepCompliance(baseStep, {
      totalElapsedTime: 1200,
      avgPower: 265,
    });

    expect(result.rating).toBe("on-target");
    expect(result.compliancePercent).toBe(100);
    expect(result.actualValue).toBe(265);
    expect(result.actualDuration).toBe(1200);
  });

  it("should rate under when actual is below range", () => {
    const result = computeStepCompliance(baseStep, {
      totalElapsedTime: 1200,
      avgPower: 230,
    });

    expect(result.rating).toBe("under");
    expect(result.compliancePercent!).toBeLessThan(100);
    expect(result.actualValue).toBe(230);
  });

  it("should rate over when actual is above range", () => {
    const result = computeStepCompliance(baseStep, {
      totalElapsedTime: 1200,
      avgPower: 300,
    });

    expect(result.rating).toBe("over");
    expect(result.compliancePercent!).toBeLessThan(100);
    expect(result.actualValue).toBe(300);
  });

  it("should handle heart rate target type", () => {
    const hrStep: PlanStep = {
      stepIndex: 0,
      intensity: "active",
      durationType: "time",
      durationValue: 600,
      targetType: "heartRate",
      targetLow: 140,
      targetHigh: 155,
    };

    const result = computeStepCompliance(hrStep, {
      totalElapsedTime: 600,
      avgHeartRate: 148,
    });

    expect(result.rating).toBe("on-target");
    expect(result.compliancePercent).toBe(100);
    expect(result.actualValue).toBe(148);
  });

  it("should handle step with open target type", () => {
    const openStep: PlanStep = {
      stepIndex: 0,
      intensity: "rest",
      durationType: "time",
      durationValue: 120,
      targetType: "open",
    };

    const result = computeStepCompliance(openStep, {
      totalElapsedTime: 130,
      avgPower: 80,
    });

    expect(result.rating).toBeUndefined();
    expect(result.compliancePercent).toBeUndefined();
    expect(result.actualDuration).toBe(130);
  });

  it("should handle missing actual value", () => {
    const result = computeStepCompliance(baseStep, {
      totalElapsedTime: 1200,
    });

    expect(result.rating).toBeUndefined();
    expect(result.compliancePercent).toBeUndefined();
    expect(result.targetType).toBe("power");
  });
});
