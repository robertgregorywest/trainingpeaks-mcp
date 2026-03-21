import type {
  WorkoutSummary,
  WorkoutDetail,
  GetWorkoutsOptions,
} from "../../types.js";

export interface IWorkoutDataProvider {
  getWorkout(id: number): Promise<WorkoutSummary>;
  getWorkouts(
    start: string,
    end: string,
    opts?: GetWorkoutsOptions,
  ): Promise<WorkoutSummary[]>;
  getWorkoutDetails(id: number): Promise<WorkoutDetail>;
  downloadActivityFile(id: number): Promise<Buffer | null>;
  downloadPlanFitFile(id: number): Promise<Buffer | null>;
}
