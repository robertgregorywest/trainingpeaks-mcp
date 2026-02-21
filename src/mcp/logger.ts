/**
 * Simple logger for MCP server requests and responses
 */

const COLORS = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
};

function timestamp(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

export function logRequest(method: string, params?: Record<string, unknown>): void {
  const ts = `${COLORS.dim}[${timestamp()}]${COLORS.reset}`;
  const arrow = `${COLORS.cyan}→${COLORS.reset}`;

  if (method === 'tools/call' && params?.name) {
    const args = params.arguments ? JSON.stringify(params.arguments) : '{}';
    console.error(`${ts} ${arrow} ${COLORS.cyan}${params.name}${COLORS.reset} ${COLORS.dim}${args}${COLORS.reset}`);
  } else {
    console.error(`${ts} ${arrow} ${COLORS.cyan}${method}${COLORS.reset}`);
  }
}

export function logResponse(toolName: string, data: unknown, durationMs: number): void {
  const ts = `${COLORS.dim}[${timestamp()}]${COLORS.reset}`;
  const arrow = `${COLORS.green}←${COLORS.reset}`;
  const duration = `${COLORS.dim}(${durationMs}ms)${COLORS.reset}`;

  const summary = summarizeResponse(toolName, data);
  console.error(`${ts} ${arrow} ${COLORS.green}${toolName}${COLORS.reset} ${summary} ${duration}`);
}

export function logError(toolName: string, error: Error, durationMs: number): void {
  const ts = `${COLORS.dim}[${timestamp()}]${COLORS.reset}`;
  const arrow = `${COLORS.yellow}✗${COLORS.reset}`;
  const duration = `${COLORS.dim}(${durationMs}ms)${COLORS.reset}`;

  console.error(`${ts} ${arrow} ${COLORS.yellow}${toolName}${COLORS.reset} Error: ${error.message} ${duration}`);
}

function summarizeResponse(toolName: string, data: unknown): string {
  if (typeof data !== 'string') {
    return COLORS.dim + 'OK' + COLORS.reset;
  }

  try {
    const parsed = JSON.parse(data);

    switch (toolName) {
      case 'get_user':
        return `${COLORS.magenta}${parsed.firstName} ${parsed.lastName}${COLORS.reset} (ID: ${parsed.athleteId})`;

      case 'get_athlete_id':
        return `ID: ${COLORS.magenta}${parsed.athleteId}${COLORS.reset}`;

      case 'get_workouts':
        if (Array.isArray(parsed)) {
          const types = [...new Set(parsed.map((w: { workoutType?: string }) => w.workoutType))].join(', ');
          return `${COLORS.magenta}${parsed.length} workouts${COLORS.reset}${types ? ` (${types})` : ''}`;
        }
        break;

      case 'get_workout':
      case 'get_workout_details':
        return `${COLORS.magenta}${parsed.title || 'Untitled'}${COLORS.reset} (${parsed.workoutType}, ${parsed.workoutDay})`;

      case 'get_current_fitness':
      case 'get_fitness_data':
        if (Array.isArray(parsed)) {
          return `${COLORS.magenta}${parsed.length} days${COLORS.reset}`;
        }
        return `CTL: ${COLORS.magenta}${parsed.ctl?.toFixed(1)}${COLORS.reset}, ATL: ${parsed.atl?.toFixed(1)}, TSB: ${parsed.tsb?.toFixed(1)}`;

      case 'get_peaks':
      case 'get_all_peaks':
        return `${COLORS.magenta}${parsed.peaks?.length || 0} peaks${COLORS.reset} (${parsed.sport})`;

      case 'get_workout_peaks':
        return `${COLORS.magenta}${parsed.peaks?.length || 0} peaks${COLORS.reset}`;

      case 'get_power_peaks':
      case 'get_running_peaks':
        if (Array.isArray(parsed)) {
          return `${COLORS.magenta}${parsed.length} peaks${COLORS.reset}`;
        }
        break;

      case 'parse_fit_file': {
        const sessions = parsed.sessions?.length || 0;
        const laps = parsed.laps?.length || 0;
        const records = parsed.recordCount || 0;
        return `${sessions} sessions, ${laps} laps, ${COLORS.magenta}${records} records${COLORS.reset}`;
      }
    }

    return COLORS.dim + 'OK' + COLORS.reset;
  } catch {
    return COLORS.dim + 'OK' + COLORS.reset;
  }
}
