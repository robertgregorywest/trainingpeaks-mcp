import type { IWorkoutDataProvider } from "./types.js";
import type { AerobicDecouplingResult } from "../../types.js";
import {
  decodeFitBuffer,
  extractPowerStream,
  extractHrStream,
  computeAerobicDecoupling,
} from "../fit-analysis/index.js";

export async function getAerobicDecouplingForWorkout(
  provider: IWorkoutDataProvider,
  workoutId: number,
): Promise<AerobicDecouplingResult> {
  const workout = await provider.getWorkout(workoutId);
  const buffer = await provider.downloadActivityFile(workoutId);
  if (!buffer) {
    throw new Error(`No activity file available for workout ${workoutId}`);
  }
  const messages = await decodeFitBuffer(buffer);
  const recordMesgs = messages.recordMesgs;
  if (!recordMesgs || recordMesgs.length === 0) {
    throw new Error("No record data found in FIT file");
  }
  const powerStream = extractPowerStream(recordMesgs);
  const hrStream = extractHrStream(recordMesgs);
  const decoupling = computeAerobicDecoupling(powerStream, hrStream);
  return {
    workoutId,
    workoutDate: workout.workoutDay,
    workoutTitle: workout.title,
    totalRecords: recordMesgs.length,
    ...decoupling,
  };
}
