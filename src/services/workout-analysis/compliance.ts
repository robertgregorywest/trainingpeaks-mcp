import type { IWorkoutDataProvider } from "./types.js";
import type {
  ComplianceResult,
  ComplianceSummary,
  PlanStep,
} from "../../types.js";
import {
  decodeFitBuffer,
  parsePlanSteps,
  matchStepsToLaps,
} from "../fit-analysis/index.js";

export async function assessComplianceForWorkout(
  provider: IWorkoutDataProvider,
  workoutId: number,
): Promise<ComplianceResult> {
  const warnings: string[] = [];

  // Fetch workout summary + plan FIT + activity FIT in parallel
  const [workout, planBuffer, activityBuffer] = await Promise.all([
    provider.getWorkout(workoutId),
    provider.downloadPlanFitFile(workoutId),
    provider.downloadActivityFile(workoutId),
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
