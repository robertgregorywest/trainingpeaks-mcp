import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getCurrentDate } from "../../src/mcp/tools/datetime.js";

const FIXED_NOW = new Date("2026-02-15T14:30:45.000Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("datetime tool handler", () => {
  it("returns JSON string with date from api/datetime", async () => {
    const result = JSON.parse(await getCurrentDate({ format: "iso" }));
    expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
