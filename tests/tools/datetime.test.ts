import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getCurrentDatetime,
  getCurrentDate,
  getCurrentTime,
} from '../../src/mcp/tools/datetime.js';

// Fix time to 2026-02-15T14:30:45.000Z for deterministic tests
const FIXED_NOW = new Date('2026-02-15T14:30:45.000Z');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('get_current_datetime', () => {
  it('returns ISO format by default', async () => {
    const result = JSON.parse(await getCurrentDatetime({ format: 'iso' }));
    expect(result.datetime).toBe('2026-02-15T14:30:45.000Z');
    expect(result.timezone).toBe('local');
  });

  it('returns unix timestamp', async () => {
    const result = JSON.parse(await getCurrentDatetime({ format: 'unix' }));
    expect(result.datetime).toBe(String(Math.floor(FIXED_NOW.getTime() / 1000)));
  });

  it('returns human-readable format', async () => {
    const result = JSON.parse(await getCurrentDatetime({ format: 'human' }));
    expect(result.datetime).toContain('2026');
  });

  it('returns custom format', async () => {
    const result = JSON.parse(
      await getCurrentDatetime({ format: 'custom', customFormat: 'YYYY/MM/DD HH:mm:ss' })
    );
    expect(result.datetime).toMatch(/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}$/);
  });

  it('respects timezone parameter', async () => {
    const result = JSON.parse(
      await getCurrentDatetime({ format: 'human', timezone: 'America/New_York' })
    );
    expect(result.timezone).toBe('America/New_York');
    expect(result.datetime).toContain('2026');
  });
});

describe('get_current_date', () => {
  it('returns ISO format by default', async () => {
    const result = JSON.parse(await getCurrentDate({ format: 'iso' }));
    expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns US format', async () => {
    const result = JSON.parse(await getCurrentDate({ format: 'us' }));
    expect(result.date).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  it('returns EU format', async () => {
    const result = JSON.parse(await getCurrentDate({ format: 'eu' }));
    expect(result.date).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  it('returns custom format', async () => {
    const result = JSON.parse(
      await getCurrentDate({ format: 'custom', customFormat: 'DD-MM-YYYY' })
    );
    expect(result.date).toMatch(/^\d{2}-\d{2}-\d{4}$/);
  });
});

describe('get_current_time', () => {
  it('returns 24h format by default', async () => {
    const result = JSON.parse(await getCurrentTime({ format: '24h', showSeconds: true }));
    expect(result.time).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });

  it('returns 12h format', async () => {
    const result = JSON.parse(await getCurrentTime({ format: '12h', showSeconds: true }));
    expect(result.time).toMatch(/^\d{1,2}:\d{2}:\d{2} (AM|PM)$/);
  });

  it('hides seconds when showSeconds is false', async () => {
    const result = JSON.parse(await getCurrentTime({ format: '24h', showSeconds: false }));
    expect(result.time).toMatch(/^\d{2}:\d{2}$/);
  });

  it('hides seconds in 12h format', async () => {
    const result = JSON.parse(await getCurrentTime({ format: '12h', showSeconds: false }));
    expect(result.time).toMatch(/^\d{1,2}:\d{2} (AM|PM)$/);
  });

  it('returns custom format', async () => {
    const result = JSON.parse(
      await getCurrentTime({ format: 'custom', customFormat: 'HH-mm-ss', showSeconds: true })
    );
    expect(result.time).toMatch(/^\d{2}-\d{2}-\d{2}$/);
  });
});
