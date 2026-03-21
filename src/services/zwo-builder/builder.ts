import type { PowerSpec, Segment, ZwoWorkoutInput } from "./types.js";

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function toFtpFraction(spec: PowerSpec, ftp?: number): number {
  if ("ftpPercent" in spec) {
    return Math.round((spec.ftpPercent / 100) * 100) / 100;
  }
  if (ftp == null) {
    throw new Error(
      "ftp is required when specifying power in watts. Provide ftp at the top level.",
    );
  }
  return Math.round((spec.watts / ftp) * 100) / 100;
}

function cadenceAttr(cadence?: number): string {
  return cadence != null ? ` Cadence="${cadence}"` : "";
}

function buildSegmentXml(seg: Segment, ftp?: number): string {
  switch (seg.type) {
    case "warmup": {
      const low = toFtpFraction(seg.powerStart ?? { ftpPercent: 25 }, ftp);
      const high = toFtpFraction(seg.powerEnd ?? { ftpPercent: 75 }, ftp);
      return `        <Warmup Duration="${seg.duration}" PowerLow="${low}" PowerHigh="${high}"${cadenceAttr(seg.cadence)} />`;
    }
    case "cooldown": {
      const low = toFtpFraction(seg.powerStart ?? { ftpPercent: 75 }, ftp);
      const high = toFtpFraction(seg.powerEnd ?? { ftpPercent: 25 }, ftp);
      return `        <Cooldown Duration="${seg.duration}" PowerLow="${high}" PowerHigh="${low}"${cadenceAttr(seg.cadence)} />`;
    }
    case "steady": {
      const power = toFtpFraction(seg.power, ftp);
      return `        <SteadyState Duration="${seg.duration}" Power="${power}"${cadenceAttr(seg.cadence)} />`;
    }
    case "intervals": {
      const onPower = toFtpFraction(seg.onPower, ftp);
      const offPower = toFtpFraction(seg.offPower, ftp);
      let attrs = ` Repeat="${seg.repeat}" OnDuration="${seg.onDuration}" OnPower="${onPower}" OffDuration="${seg.offDuration}" OffPower="${offPower}"`;
      if (seg.onCadence != null) attrs += ` Cadence="${seg.onCadence}"`;
      if (seg.offCadence != null)
        attrs += ` CadenceResting="${seg.offCadence}"`;
      return `        <IntervalsT${attrs} />`;
    }
    case "ramp": {
      const low = toFtpFraction(seg.powerStart, ftp);
      const high = toFtpFraction(seg.powerEnd, ftp);
      return `        <Ramp Duration="${seg.duration}" PowerLow="${low}" PowerHigh="${high}"${cadenceAttr(seg.cadence)} />`;
    }
    case "freeride": {
      return `        <FreeRide Duration="${seg.duration}"${cadenceAttr(seg.cadence)} />`;
    }
  }
}

export function buildZwoXml(input: ZwoWorkoutInput): string {
  const author = input.author ?? "TrainingPeaks MCP";
  const lines = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<workout_file>`,
    `    <author>${escapeXml(author)}</author>`,
    `    <name>${escapeXml(input.name)}</name>`,
  ];

  if (input.description) {
    lines.push(
      `    <description>${escapeXml(input.description)}</description>`,
    );
  }

  lines.push(`    <sportType>bike</sportType>`);
  lines.push(`    <workout>`);

  for (const seg of input.segments) {
    lines.push(buildSegmentXml(seg, input.ftp));
  }

  lines.push(`    </workout>`);
  lines.push(`</workout_file>`);

  return lines.join("\n");
}
