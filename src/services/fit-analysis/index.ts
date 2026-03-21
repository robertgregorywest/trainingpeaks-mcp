export {
  decodeFitBuffer,
  extractPowerStream,
  extractHrStream,
  parsePlanSteps,
  parseFitFile,
  type FitMessages,
  type ParsedFitFile,
} from "./decoder.js";

export { computeBestPower, formatDuration } from "./power.js";

export {
  computeAerobicDecoupling,
  type ComputeDecouplingResult,
} from "./decoupling.js";

export {
  parseLapsFromFit,
  filterLaps,
  buildSummary,
  type LapValue,
  type LapRow,
  type WorkoutSummaryResult,
  type FilterLapsOptions,
} from "./intervals.js";

export { computeStepCompliance, matchStepsToLaps } from "./compliance.js";
