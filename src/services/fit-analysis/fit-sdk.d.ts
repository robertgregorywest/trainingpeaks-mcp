declare module "@garmin/fitsdk" {
  export class Stream {
    static fromBuffer(buffer: Buffer): Stream;
  }

  export class Decoder {
    constructor(stream: Stream);
    isFIT(): boolean;
    checkIntegrity(): boolean;
    read(): {
      messages: {
        fileIdMesgs?: Record<string, unknown>[];
        sessionMesgs?: Record<string, unknown>[];
        lapMesgs?: Record<string, unknown>[];
        recordMesgs?: Record<string, unknown>[];
        workoutMesgs?: Record<string, unknown>[];
        workoutStepMesgs?: Record<string, unknown>[];
        [key: string]: unknown;
      };
      errors: unknown[];
    };
  }
}
