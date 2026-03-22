import { describe, it, expect } from "vitest";
import {
  buildZwoXml,
  toFtpFraction,
} from "../../../src/services/zwo-builder/index.js";
import type { ZwoWorkoutInput } from "../../../src/services/zwo-builder/index.js";

describe("toFtpFraction", () => {
  it("converts ftpPercent to 0-1 fraction", () => {
    expect(toFtpFraction({ ftpPercent: 75 })).toBe(0.75);
    expect(toFtpFraction({ ftpPercent: 100 })).toBe(1);
    expect(toFtpFraction({ ftpPercent: 120 })).toBe(1.2);
  });

  it("converts watts to FTP fraction", () => {
    expect(toFtpFraction({ watts: 200 }, 250)).toBe(0.8);
    expect(toFtpFraction({ watts: 250 }, 250)).toBe(1);
    expect(toFtpFraction({ watts: 300 }, 250)).toBe(1.2);
  });

  it("rounds to 2 decimal places", () => {
    expect(toFtpFraction({ watts: 233 }, 250)).toBe(0.93);
    expect(toFtpFraction({ ftpPercent: 33.333 })).toBe(0.33);
  });

  it("throws when watts used without ftp", () => {
    expect(() => toFtpFraction({ watts: 200 })).toThrow(/ftp is required/);
  });
});

describe("buildZwoXml", () => {
  const minimal: ZwoWorkoutInput = {
    name: "Test Workout",
    segments: [{ type: "steady", duration: 300, power: { ftpPercent: 75 } }],
  };

  it("produces valid XML structure", () => {
    const xml = buildZwoXml(minimal);
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain("<workout_file>");
    expect(xml).toContain("</workout_file>");
    expect(xml).toContain("<name>Test Workout</name>");
    expect(xml).toContain("<author>TrainingPeaks MCP</author>");
    expect(xml).toContain("<sportType>bike</sportType>");
    expect(xml).toContain("<workout>");
    expect(xml).toContain("</workout>");
  });

  it("includes description when provided", () => {
    const xml = buildZwoXml({ ...minimal, description: "A test" });
    expect(xml).toContain("<description>A test</description>");
  });

  it("omits description when not provided", () => {
    const xml = buildZwoXml(minimal);
    expect(xml).not.toContain("<description>");
  });

  it("uses custom author", () => {
    const xml = buildZwoXml({ ...minimal, author: "Coach Bob" });
    expect(xml).toContain("<author>Coach Bob</author>");
  });

  it("escapes XML special characters in name and description", () => {
    const xml = buildZwoXml({
      ...minimal,
      name: "5x5 <hard> & fast",
      description: "Intervals & ramps > threshold",
    });
    expect(xml).toContain("<name>5x5 &lt;hard&gt; &amp; fast</name>");
    expect(xml).toContain(
      "<description>Intervals &amp; ramps &gt; threshold</description>",
    );
  });

  describe("segment types", () => {
    it("warmup with defaults", () => {
      const xml = buildZwoXml({
        name: "WU",
        segments: [{ type: "warmup", duration: 600 }],
      });
      expect(xml).toContain(
        '<Warmup Duration="600" PowerLow="0.25" PowerHigh="0.75" />',
      );
    });

    it("warmup with explicit power in watts", () => {
      const xml = buildZwoXml({
        name: "WU",
        ftp: 250,
        segments: [
          {
            type: "warmup",
            duration: 600,
            powerStart: { watts: 125 },
            powerEnd: { watts: 200 },
          },
        ],
      });
      expect(xml).toContain(
        '<Warmup Duration="600" PowerLow="0.5" PowerHigh="0.8" />',
      );
    });

    it("cooldown with defaults", () => {
      const xml = buildZwoXml({
        name: "CD",
        segments: [{ type: "cooldown", duration: 300 }],
      });
      expect(xml).toContain(
        '<Cooldown Duration="300" PowerLow="0.25" PowerHigh="0.75" />',
      );
    });

    it("cooldown with explicit power ramps down", () => {
      const xml = buildZwoXml({
        name: "CD",
        segments: [
          {
            type: "cooldown",
            duration: 300,
            powerStart: { ftpPercent: 80 },
            powerEnd: { ftpPercent: 40 },
          },
        ],
      });
      // PowerLow = end (lower), PowerHigh = start (higher)
      expect(xml).toContain(
        '<Cooldown Duration="300" PowerLow="0.4" PowerHigh="0.8" />',
      );
    });

    it("steady state", () => {
      const xml = buildZwoXml({
        name: "SS",
        ftp: 250,
        segments: [{ type: "steady", duration: 1200, power: { watts: 200 } }],
      });
      expect(xml).toContain('<SteadyState Duration="1200" Power="0.8" />');
    });

    it("intervals", () => {
      const xml = buildZwoXml({
        name: "INT",
        ftp: 250,
        segments: [
          {
            type: "intervals",
            repeat: 5,
            onDuration: 120,
            onPower: { watts: 275 },
            offDuration: 60,
            offPower: { watts: 125 },
          },
        ],
      });
      expect(xml).toContain(
        '<IntervalsT Repeat="5" OnDuration="120" OnPower="1.1" OffDuration="60" OffPower="0.5" />',
      );
    });

    it("ramp", () => {
      const xml = buildZwoXml({
        name: "R",
        segments: [
          {
            type: "ramp",
            duration: 300,
            powerStart: { ftpPercent: 60 },
            powerEnd: { ftpPercent: 100 },
          },
        ],
      });
      expect(xml).toContain(
        '<Ramp Duration="300" PowerLow="0.6" PowerHigh="1" />',
      );
    });

    it("freeride", () => {
      const xml = buildZwoXml({
        name: "FR",
        segments: [{ type: "freeride", duration: 600 }],
      });
      expect(xml).toContain('<FreeRide Duration="600" />');
    });
  });

  it("builds a complete interval workout", () => {
    const xml = buildZwoXml({
      name: "5x5 VO2max",
      description: "Classic VO2max intervals",
      ftp: 250,
      segments: [
        { type: "warmup", duration: 600 },
        {
          type: "intervals",
          repeat: 5,
          onDuration: 300,
          onPower: { watts: 300 },
          offDuration: 300,
          offPower: { watts: 125 },
        },
        { type: "cooldown", duration: 300 },
      ],
    });

    expect(xml).toContain("<name>5x5 VO2max</name>");
    expect(xml).toContain('OnPower="1.2"');
    expect(xml).toContain('OffPower="0.5"');
    expect(xml).toContain('Repeat="5"');
    expect(xml).toContain("<Warmup");
    expect(xml).toContain("<Cooldown");
  });

  it("throws when watts used without ftp", () => {
    expect(() =>
      buildZwoXml({
        name: "Bad",
        segments: [{ type: "steady", duration: 300, power: { watts: 200 } }],
      }),
    ).toThrow(/ftp is required/);
  });
});
