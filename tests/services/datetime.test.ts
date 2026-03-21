import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getCurrentDate } from "../../src/services/datetime.js";

// Fix time to 2026-02-15T14:30:45.000Z for deterministic tests
const FIXED_NOW = new Date("2026-02-15T14:30:45.000Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("services/datetime getCurrentDate", () => {
  it("returns ISO format by default", () => {
    const result = getCurrentDate();
    expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns US format", () => {
    const result = getCurrentDate("us");
    expect(result.date).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  it("returns EU format", () => {
    const result = getCurrentDate("eu");
    expect(result.date).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  it("returns custom format", () => {
    const result = getCurrentDate("custom", "DD-MM-YYYY");
    expect(result.date).toMatch(/^\d{2}-\d{2}-\d{4}$/);
  });
});
