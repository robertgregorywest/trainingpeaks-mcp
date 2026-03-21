import type { PlanStep, ComplianceStep } from "../../types.js";

interface LapData {
  totalElapsedTime?: number;
  avgPower?: number;
  avgHeartRate?: number;
  avgCadence?: number;
}

export function matchStepsToLaps(
  planSteps: PlanStep[],
  laps: LapData[],
  warnings: string[],
): ComplianceStep[] {
  if (planSteps.length === 0) return [];

  if (laps.length === 0) {
    warnings.push("No activity laps to match against plan steps");
    return planSteps.map((step) => ({
      stepIndex: step.stepIndex,
      intensity: step.intensity,
      plannedDuration: step.durationValue,
      targetType: step.targetType !== "unknown" ? step.targetType : undefined,
      targetLow: step.targetLow,
      targetHigh: step.targetHigh,
    }));
  }

  if (laps.length !== planSteps.length) {
    warnings.push(
      `Lap count (${laps.length}) differs from plan step count (${planSteps.length}) — using sequential matching`,
    );
  }

  const results: ComplianceStep[] = [];
  const count = Math.min(planSteps.length, laps.length);

  for (let i = 0; i < count; i++) {
    const step = planSteps[i];
    const lap = laps[i];
    results.push(computeStepCompliance(step, lap));
  }

  // Remaining plan steps without matching laps
  for (let i = count; i < planSteps.length; i++) {
    const step = planSteps[i];
    results.push({
      stepIndex: step.stepIndex,
      intensity: step.intensity,
      plannedDuration: step.durationValue,
      targetType: step.targetType !== "unknown" ? step.targetType : undefined,
      targetLow: step.targetLow,
      targetHigh: step.targetHigh,
    });
  }

  return results;
}

export function computeStepCompliance(
  step: PlanStep,
  lap: LapData,
): ComplianceStep {
  const result: ComplianceStep = {
    stepIndex: step.stepIndex,
    intensity: step.intensity,
    plannedDuration: step.durationValue,
    actualDuration: lap.totalElapsedTime,
  };

  // Determine actual value based on target type
  const targetType = step.targetType;
  if (
    targetType === "power" ||
    targetType === "heartRate" ||
    targetType === "cadence"
  ) {
    result.targetType = targetType;
    result.targetLow = step.targetLow;
    result.targetHigh = step.targetHigh;

    let actualValue: number | undefined;
    if (targetType === "power") actualValue = lap.avgPower;
    else if (targetType === "heartRate") actualValue = lap.avgHeartRate;
    else if (targetType === "cadence") actualValue = lap.avgCadence;

    if (actualValue != null) {
      result.actualValue = Math.round(actualValue);

      if (step.targetLow != null && step.targetHigh != null) {
        const midpoint = (step.targetLow + step.targetHigh) / 2;
        const range = step.targetHigh - step.targetLow;

        if (actualValue < step.targetLow) {
          result.rating = "under";
          // How far under — 100% = at target low, decreasing below
          result.compliancePercent =
            range > 0
              ? Math.round(
                  Math.max(
                    0,
                    100 - ((step.targetLow - actualValue) / (range / 2)) * 100,
                  ),
                )
              : Math.round((actualValue / midpoint) * 100);
        } else if (actualValue > step.targetHigh) {
          result.rating = "over";
          result.compliancePercent =
            range > 0
              ? Math.round(
                  Math.max(
                    0,
                    100 - ((actualValue - step.targetHigh) / (range / 2)) * 100,
                  ),
                )
              : Math.round((midpoint / actualValue) * 100);
        } else {
          result.rating = "on-target";
          result.compliancePercent = 100;
        }
      }
    }
  }

  return result;
}
