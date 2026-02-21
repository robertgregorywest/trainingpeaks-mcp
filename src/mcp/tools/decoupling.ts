import { z } from 'zod';
import type { TrainingPeaksClient } from '../../index.js';
import type { AerobicDecouplingResult } from '../../types.js';
import { decodeFitBuffer } from './fit-utils.js';

export const getAerobicDecouplingSchema = z.object({
  workoutId: z.number().describe('The workout ID'),
});

export interface ComputeDecouplingResult {
  firstHalf: { avgPower: number; avgHR: number; hrPowerRatio: number };
  secondHalf: { avgPower: number; avgHR: number; hrPowerRatio: number };
  decouplingPercent: number;
  interpretation: string;
}

export function computeAerobicDecoupling(
  powerStream: number[],
  hrStream: number[]
): ComputeDecouplingResult {
  // Filter out records where both power=0 AND hr=0 (stopped/paused)
  const filtered: { power: number; hr: number }[] = [];
  for (let i = 0; i < powerStream.length; i++) {
    const p = powerStream[i] ?? 0;
    const h = hrStream[i] ?? 0;
    if (p !== 0 || h !== 0) {
      filtered.push({ power: p, hr: h });
    }
  }

  if (filtered.length === 0) {
    throw new Error('No valid records after filtering zeros');
  }

  const hasPower = filtered.some((r) => r.power > 0);
  if (!hasPower) {
    throw new Error('No power data found in workout records');
  }

  const hasHR = filtered.some((r) => r.hr > 0);
  if (!hasHR) {
    throw new Error('No heart rate data found in workout records');
  }

  const mid = Math.floor(filtered.length / 2);
  const firstHalfRecords = filtered.slice(0, mid);
  const secondHalfRecords = filtered.slice(mid);

  const avg = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;

  const firstAvgPower = avg(firstHalfRecords.map((r) => r.power));
  const firstAvgHR = avg(firstHalfRecords.map((r) => r.hr));
  const secondAvgPower = avg(secondHalfRecords.map((r) => r.power));
  const secondAvgHR = avg(secondHalfRecords.map((r) => r.hr));

  const ratio1 = firstAvgHR / firstAvgPower;
  const ratio2 = secondAvgHR / secondAvgPower;
  const decouplingPercent = ((ratio2 - ratio1) / ratio1) * 100;

  const roundedDecoupling = Math.round(decouplingPercent * 100) / 100;
  const abs = Math.abs(roundedDecoupling);

  let interpretation: string;
  if (abs < 5) {
    interpretation = 'Good aerobic fitness — minimal cardiac drift';
  } else if (abs < 10) {
    interpretation = 'Moderate decoupling — aerobic endurance developing';
  } else {
    interpretation = 'High decoupling — aerobic base needs work';
  }

  return {
    firstHalf: {
      avgPower: Math.round(firstAvgPower),
      avgHR: Math.round(firstAvgHR),
      hrPowerRatio: Math.round(ratio1 * 10000) / 10000,
    },
    secondHalf: {
      avgPower: Math.round(secondAvgPower),
      avgHR: Math.round(secondAvgHR),
      hrPowerRatio: Math.round(ratio2 * 10000) / 10000,
    },
    decouplingPercent: roundedDecoupling,
    interpretation,
  };
}

export async function getAerobicDecoupling(
  client: TrainingPeaksClient,
  args: z.infer<typeof getAerobicDecouplingSchema>
): Promise<string> {
  const workout = await client.getWorkout(args.workoutId);
  const buffer = await client.downloadActivityFile(args.workoutId);

  if (!buffer) {
    throw new Error(`No activity file available for workout ${args.workoutId}`);
  }

  const messages = await decodeFitBuffer(buffer);
  const recordMesgs = messages.recordMesgs;

  if (!recordMesgs || recordMesgs.length === 0) {
    throw new Error('No record data found in FIT file');
  }

  const powerStream: number[] = recordMesgs.map((r: Record<string, unknown>) =>
    typeof r.power === 'number' ? r.power : 0
  );

  const hrStream: number[] = recordMesgs.map((r: Record<string, unknown>) =>
    typeof r.heartRate === 'number' ? r.heartRate : 0
  );

  const decoupling = computeAerobicDecoupling(powerStream, hrStream);

  const result: AerobicDecouplingResult = {
    workoutId: args.workoutId,
    workoutDate: workout.workoutDay,
    workoutTitle: workout.title,
    totalRecords: recordMesgs.length,
    ...decoupling,
  };

  return JSON.stringify(result, null, 2);
}
