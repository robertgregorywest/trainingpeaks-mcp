import * as fs from "node:fs/promises";

export interface FitMessages {
  fileIdMesgs?: Record<string, unknown>[];
  sessionMesgs?: Record<string, unknown>[];
  lapMesgs?: Record<string, unknown>[];
  recordMesgs?: Record<string, unknown>[];
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
