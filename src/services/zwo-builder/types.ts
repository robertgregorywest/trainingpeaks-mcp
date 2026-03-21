export type PowerSpec = { watts: number } | { ftpPercent: number };

export interface WarmupSegment {
  type: "warmup";
  duration: number;
  powerStart?: PowerSpec;
  powerEnd?: PowerSpec;
  cadence?: number;
}

export interface CooldownSegment {
  type: "cooldown";
  duration: number;
  powerStart?: PowerSpec;
  powerEnd?: PowerSpec;
  cadence?: number;
}

export interface SteadySegment {
  type: "steady";
  duration: number;
  power: PowerSpec;
  cadence?: number;
}

export interface IntervalsSegment {
  type: "intervals";
  repeat: number;
  onDuration: number;
  onPower: PowerSpec;
  offDuration: number;
  offPower: PowerSpec;
  onCadence?: number;
  offCadence?: number;
}

export interface RampSegment {
  type: "ramp";
  duration: number;
  powerStart: PowerSpec;
  powerEnd: PowerSpec;
  cadence?: number;
}

export interface FreeRideSegment {
  type: "freeride";
  duration: number;
  cadence?: number;
}

export type Segment =
  | WarmupSegment
  | CooldownSegment
  | SteadySegment
  | IntervalsSegment
  | RampSegment
  | FreeRideSegment;

export interface ZwoWorkoutInput {
  name: string;
  author?: string;
  description?: string;
  ftp?: number;
  segments: Segment[];
}
