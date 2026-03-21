import * as fs from "node:fs/promises";
import type { PlanStep } from "../../types.js";

export interface FitMessages {
  fileIdMesgs?: Record<string, unknown>[];
  sessionMesgs?: Record<string, unknown>[];
  lapMesgs?: Record<string, unknown>[];
  recordMesgs?: Record<string, unknown>[];
  workoutMesgs?: Record<string, unknown>[];
  workoutStepMesgs?: Record<string, unknown>[];
  [key: string]: unknown;
}

export async function decodeFitBuffer(buffer: Buffer): Promise<FitMessages> {
  const { Decoder, Stream } = await import("@garmin/fitsdk");
  const stream = Stream.fromBuffer(buffer);
  const decoder = new Decoder(stream);

  if (!decoder.isFIT()) {
    throw new Error("Not a valid FIT file");
  }

  if (!decoder.checkIntegrity()) {
    throw new Error("FIT file integrity check failed");
  }

  const { messages } = decoder.read();
  return messages as FitMessages;
}

export function extractPowerStream(
  recordMesgs: Record<string, unknown>[],
): number[] {
  return recordMesgs.map((r) => (typeof r.power === "number" ? r.power : 0));
}

export function extractHrStream(
  recordMesgs: Record<string, unknown>[],
): number[] {
  return recordMesgs.map((r) =>
    typeof r.heartRate === "number" ? r.heartRate : 0,
  );
}

export interface ParsedFitFile {
  fileId?: Record<string, unknown>;
  sessions?: Record<string, unknown>[];
  laps?: Record<string, unknown>[];
  recordCount?: number;
  recordSummary?: {
    firstRecord: Record<string, unknown>;
    lastRecord: Record<string, unknown>;
  };
}

export async function parseFitFile(filePath: string): Promise<ParsedFitFile> {
  const buffer = await fs.readFile(filePath);
  const messages = await decodeFitBuffer(buffer);

  const result: ParsedFitFile = {};

  const fileIdMesgs = messages.fileIdMesgs;
  if (fileIdMesgs && fileIdMesgs.length > 0) {
    result.fileId = fileIdMesgs[0];
  }

  const sessionMesgs = messages.sessionMesgs;
  if (sessionMesgs && sessionMesgs.length > 0) {
    result.sessions = sessionMesgs.map((session: Record<string, unknown>) => ({
      sport: session.sport,
      subSport: session.subSport,
      startTime: session.startTime,
      totalElapsedTime: session.totalElapsedTime,
      totalTimerTime: session.totalTimerTime,
      totalDistance: session.totalDistance,
      totalCalories: session.totalCalories,
      avgSpeed: session.avgSpeed,
      maxSpeed: session.maxSpeed,
      avgHeartRate: session.avgHeartRate,
      maxHeartRate: session.maxHeartRate,
      avgPower: session.avgPower,
      maxPower: session.maxPower,
      normalizedPower: session.normalizedPower,
      avgCadence: session.avgCadence,
      maxCadence: session.maxCadence,
      totalAscent: session.totalAscent,
      totalDescent: session.totalDescent,
    }));
  }

  const lapMesgs = messages.lapMesgs;
  if (lapMesgs && lapMesgs.length > 0) {
    result.laps = lapMesgs.map((lap: Record<string, unknown>) => ({
      startTime: lap.startTime,
      totalElapsedTime: lap.totalElapsedTime,
      totalDistance: lap.totalDistance,
      avgSpeed: lap.avgSpeed,
      maxSpeed: lap.maxSpeed,
      avgHeartRate: lap.avgHeartRate,
      maxHeartRate: lap.maxHeartRate,
      avgPower: lap.avgPower,
      maxPower: lap.maxPower,
      avgCadence: lap.avgCadence,
    }));
  }

  const recordMesgs = messages.recordMesgs;
  if (recordMesgs && recordMesgs.length > 0) {
    result.recordCount = recordMesgs.length;
    result.recordSummary = {
      firstRecord: recordMesgs[0],
      lastRecord: recordMesgs[recordMesgs.length - 1],
    };
  }

  return result;
}

// --- Plan FIT parsing ---

const INTENSITY_MAP: Record<string, PlanStep["intensity"]> = {
  active: "active",
  rest: "rest",
  warmup: "warmup",
  cooldown: "cooldown",
  recover: "recover",
};

const DURATION_TYPE_MAP: Record<string, PlanStep["durationType"]> = {
  time: "time",
  distance: "distance",
  open: "open",
};

const TARGET_TYPE_MAP: Record<string, PlanStep["targetType"]> = {
  power: "power",
  heartRate: "heartRate",
  heart_rate: "heartRate",
  cadence: "cadence",
  speed: "speed",
  open: "open",
};

function normaliseEnum(val: unknown): string {
  if (typeof val === "string") return val.toLowerCase().replace(/[_\s]/g, "");
  if (typeof val === "number") return String(val);
  return "";
}

function mapIntensity(val: unknown): PlanStep["intensity"] {
  const key = normaliseEnum(val);
  for (const [k, v] of Object.entries(INTENSITY_MAP)) {
    if (key === k.toLowerCase()) return v;
  }
  return "unknown";
}

function mapDurationType(val: unknown): PlanStep["durationType"] {
  const key = normaliseEnum(val);
  for (const [k, v] of Object.entries(DURATION_TYPE_MAP)) {
    if (key === k.toLowerCase()) return v;
  }
  return "unknown";
}

function mapTargetType(val: unknown): PlanStep["targetType"] {
  const key = normaliseEnum(val);
  for (const [k, v] of Object.entries(TARGET_TYPE_MAP)) {
    if (key === k.toLowerCase()) return v;
  }
  return "unknown";
}

function numOrUndef(val: unknown): number | undefined {
  return typeof val === "number" && isFinite(val) ? val : undefined;
}

export function parsePlanSteps(messages: FitMessages): PlanStep[] {
  const stepMesgs = messages.workoutStepMesgs;
  if (!stepMesgs || stepMesgs.length === 0) return [];

  const rawSteps = stepMesgs.map((msg) => ({
    messageIndex: typeof msg.messageIndex === "number" ? msg.messageIndex : 0,
    wktStepName: msg.wktStepName as string | undefined,
    intensity: msg.intensity,
    durationType: msg.durationType,
    durationValue: msg.durationValue,
    durationTime: msg.durationTime,
    durationDistance: msg.durationDistance,
    durationStep: msg.durationStep,
    targetType: msg.targetType,
    targetValue: msg.targetValue,
    customTargetValueLow: msg.customTargetValueLow,
    customTargetValueHigh: msg.customTargetValueHigh,
    customTargetLow: msg.customTargetLow,
    customTargetHigh: msg.customTargetHigh,
    repeatSteps: msg.repeatSteps,
    repeatTimes: msg.repeatTimes,
  }));

  // Expand repeat steps into a flat list
  const expanded: PlanStep[] = [];
  let stepIndex = 0;
  let i = 0;

  while (i < rawSteps.length) {
    const raw = rawSteps[i];
    const durType = normaliseEnum(raw.durationType);

    // Check if this is a repeat step.
    // Two FIT repeat formats:
    //   1. repeatTimes + repeatSteps (older/simple): repeat previous N steps M times total
    //   2. repeatUntilStepsCmplt + durationStep + repeatSteps: go back to durationStep,
    //      repeat that block for repeatSteps total iterations
    const repeatTimes = numOrUndef(raw.repeatTimes);
    const repeatSteps = numOrUndef(raw.repeatSteps);
    const durationStep = numOrUndef(raw.durationStep);

    if (repeatTimes != null && repeatSteps != null && repeatSteps > 0) {
      // Format 1: repeat the previous N steps
      const stepsToRepeat = rawSteps.slice(i - repeatSteps, i);
      // We already added the first iteration, so repeat (repeatTimes - 1) more
      for (let r = 0; r < repeatTimes - 1; r++) {
        for (const repStep of stepsToRepeat) {
          expanded.push(buildPlanStep(repStep, stepIndex++));
        }
      }
      i++;
      continue;
    }

    if (
      durType === "repeatuntilstepscmplt" &&
      durationStep != null &&
      repeatSteps != null &&
      repeatSteps > 0
    ) {
      // Format 2: repeat from durationStep (message index) through the step before this one
      const startIdx = rawSteps.findIndex(
        (s) => s.messageIndex === durationStep,
      );
      if (startIdx >= 0) {
        const stepsToRepeat = rawSteps.slice(startIdx, i);
        // First iteration already emitted, so repeat (repeatSteps - 1) more
        for (let r = 0; r < repeatSteps - 1; r++) {
          for (const repStep of stepsToRepeat) {
            expanded.push(buildPlanStep(repStep, stepIndex++));
          }
        }
      }
      i++;
      continue;
    }

    expanded.push(buildPlanStep(raw, stepIndex++));
    i++;
  }

  return expanded;
}

interface RawStepFields {
  wktStepName?: string;
  intensity: unknown;
  durationType: unknown;
  durationValue: unknown;
  durationTime: unknown;
  durationDistance: unknown;
  durationStep: unknown;
  targetType: unknown;
  targetValue: unknown;
  customTargetValueLow: unknown;
  customTargetValueHigh: unknown;
  customTargetLow: unknown;
  customTargetHigh: unknown;
  repeatSteps: unknown;
  repeatTimes: unknown;
}

function buildPlanStep(raw: RawStepFields, stepIndex: number): PlanStep {
  const durationType = mapDurationType(raw.durationType);
  let durationValue: number | undefined;
  if (durationType === "time") {
    // FIT SDK stores time in seconds (sometimes ms/1000)
    durationValue =
      numOrUndef(raw.durationTime) ?? numOrUndef(raw.durationValue);
  } else if (durationType === "distance") {
    durationValue =
      numOrUndef(raw.durationDistance) ?? numOrUndef(raw.durationValue);
  }

  let targetLow =
    numOrUndef(raw.customTargetValueLow) ?? numOrUndef(raw.customTargetLow);
  let targetHigh =
    numOrUndef(raw.customTargetValueHigh) ?? numOrUndef(raw.customTargetHigh);
  let targetValue = numOrUndef(raw.targetValue);

  // FIT SDK encodes power targets with a +1000 offset (e.g. 1200 = 200W)
  const targetType = mapTargetType(raw.targetType);
  if (targetType === "power") {
    if (targetLow != null && targetLow >= 1000) targetLow -= 1000;
    if (targetHigh != null && targetHigh >= 1000) targetHigh -= 1000;
    if (targetValue != null && targetValue >= 1000) targetValue -= 1000;
  }

  return {
    stepIndex,
    name: raw.wktStepName || undefined,
    intensity: mapIntensity(raw.intensity),
    durationType,
    durationValue,
    targetType,
    targetLow,
    targetHigh,
    targetValue,
  };
}
