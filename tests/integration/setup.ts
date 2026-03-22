/**
 * Shared helpers for integration tests.
 *
 * Provides date utilities and a client factory so each test file
 * creates exactly one authenticated client with minimal boilerplate.
 */
import "dotenv/config";
import { TrainingPeaksClient } from "../../src/index.js";

/** Today's date in YYYY-MM-DD format. */
export const today = new Date().toISOString().split("T")[0];

/** Date N days ago in YYYY-MM-DD format. */
export const daysAgo = (n: number) =>
  new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

/**
 * Creates a new client and warms up auth.
 * Each test file should call this in `beforeAll` and `client.close()` in `afterAll`.
 */
export async function createClient(): Promise<TrainingPeaksClient> {
  const client = new TrainingPeaksClient();
  await client.getAthleteId(); // warm up auth
  return client;
}
