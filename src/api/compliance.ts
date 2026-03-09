import type { TrainingPeaksClient } from "../index.js";
import type {
  ComplianceResult,
  ComplianceStep,
  ComplianceSummary,
  PlanStep,
} from "../types.js";
import { decodeFitBuffer, parsePlanSteps } from "./fit.js";

export async function assessComplianceForWorkout(
  client: TrainingPeaksClient,
  workoutId: number,
): Promise<ComplianceResult> {
  const warnings: string[] = [];

  // Fetch workout summary + plan FIT + activity FIT in parallel
  const [workout, planBuffer, activityBuffer] = await Promise.all([
    client.getWorkout(workoutId),
    client.downloadPlanFitFile(workoutId),
    client.downloadActivityFile(workoutId),
  ]);

  // Build summary from WorkoutSummary planned/actual fields
  const summary: ComplianceSummary = {
    tssPlanned: workout.tssPlanned,
    tssActual: workout.tssActual,
    ifPlanned: workout.ifPlanned,
    ifActual: workout.ifActual,
    durationPlanned: workout.totalTimePlanned,
    durationActual: workout.totalTime,
    distancePlanned: workout.totalDistancePlanned,
    distanceActual: workout.totalDistance,
  };

  // Parse plan steps if plan FIT available
  let planSteps: PlanStep[] = [];
  if (planBuffer) {
    try {
      const planMessages = await decodeFitBuffer(planBuffer);
      planSteps = parsePlanSteps(planMessages);
    } catch (err) {
      warnings.push(`Failed to parse plan FIT: ${(err as Error).message}`);
    }
  } else {
    warnings.push("No plan FIT file available — summary-only compliance");
  }

  // Parse activity laps if activity FIT available
  interface ActivityLap {
    totalElapsedTime?: number;
    avgPower?: number;
    avgHeartRate?: number;
    avgCadence?: number;
  }

  let activityLaps: ActivityLap[] = [];
  if (activityBuffer) {
    try {
      const activityMessages = await decodeFitBuffer(activityBuffer);
      activityLaps = (activityMessages.lapMesgs ?? []).map((lap) => ({
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
    } catch (err) {
      warnings.push(`Failed to parse activity FIT: ${(err as Error).message}`);
    }
  } else {
    warnings.push("No activity file available");
  }

  // Match steps to laps and compute per-step compliance
  const steps = matchStepsToLaps(planSteps, activityLaps, warnings);

  // Compute overall compliance
  const stepsPlanned = planSteps.length;
  const stepsCompleted = Math.min(activityLaps.length, stepsPlanned);

  const powerSteps = steps.filter((s) => s.compliancePercent != null);
  const powerComplianceAvg =
    powerSteps.length > 0
      ? Math.round(
          powerSteps.reduce((sum, s) => sum + s.compliancePercent!, 0) /
            powerSteps.length,
        )
      : undefined;

  const durationSteps = steps.filter(
    (s) => s.plannedDuration != null && s.actualDuration != null,
  );
  const durationComplianceAvg =
    durationSteps.length > 0
      ? Math.round(
          durationSteps.reduce((sum, s) => {
            const planned = s.plannedDuration!;
            const actual = s.actualDuration!;
            return (
              sum + (planned > 0 ? Math.round((actual / planned) * 100) : 100)
            );
          }, 0) / durationSteps.length,
        )
      : undefined;

  return {
    workoutId,
    title: workout.title,
    date: workout.workoutDay,
    planAvailable: planBuffer != null && planSteps.length > 0,
    summary,
    steps,
    overallCompliance: {
      stepsCompleted,
      stepsPlanned,
      powerComplianceAvg,
      durationComplianceAvg,
    },
    warnings,
  };
}

interface LapData {
  totalElapsedTime?: number;
  avgPower?: number;
  avgHeartRate?: number;
  avgCadence?: number;
}

function matchStepsToLaps(
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
