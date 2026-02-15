import { z } from 'zod';

function applyCustomFormat(date: Date, format: string, timezone?: string): string {
  const resolvedDate = timezone
    ? new Date(date.toLocaleString('en-US', { timeZone: timezone }))
    : date;

  return format
    .replace('YYYY', String(resolvedDate.getFullYear()))
    .replace('MM', String(resolvedDate.getMonth() + 1).padStart(2, '0'))
    .replace('DD', String(resolvedDate.getDate()).padStart(2, '0'))
    .replace('HH', String(resolvedDate.getHours()).padStart(2, '0'))
    .replace('mm', String(resolvedDate.getMinutes()).padStart(2, '0'))
    .replace('ss', String(resolvedDate.getSeconds()).padStart(2, '0'));
}

// get_current_datetime

export const getCurrentDatetimeSchema = z.object({
  format: z
    .enum(['iso', 'unix', 'human', 'custom'])
    .optional()
    .default('iso')
    .describe('Output format (default: iso)'),
  timezone: z
    .string()
    .optional()
    .describe('IANA timezone (e.g. America/New_York)'),
  customFormat: z
    .string()
    .optional()
    .describe('Custom format string using YYYY, MM, DD, HH, mm, ss placeholders'),
});

export async function getCurrentDatetime(
  args: z.infer<typeof getCurrentDatetimeSchema>
): Promise<string> {
  const now = new Date();

  let result: string;
  switch (args.format) {
    case 'unix':
      result = String(Math.floor(now.getTime() / 1000));
      break;
    case 'human':
      result = now.toLocaleString('en-US', {
        dateStyle: 'full',
        timeStyle: 'long',
        ...(args.timezone ? { timeZone: args.timezone } : {}),
      });
      break;
    case 'custom':
      result = applyCustomFormat(now, args.customFormat ?? 'YYYY-MM-DD HH:mm:ss', args.timezone);
      break;
    default:
      result = args.timezone
        ? new Date(now.toLocaleString('en-US', { timeZone: args.timezone })).toISOString()
        : now.toISOString();
      break;
  }

  return JSON.stringify({ datetime: result, timezone: args.timezone ?? 'local' });
}

// get_current_date

export const getCurrentDateSchema = z.object({
  format: z
    .enum(['iso', 'us', 'eu', 'custom'])
    .optional()
    .default('iso')
    .describe('Output format (default: iso)'),
  customFormat: z
    .string()
    .optional()
    .describe('Custom format string using YYYY, MM, DD placeholders'),
});

export async function getCurrentDate(
  args: z.infer<typeof getCurrentDateSchema>
): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  let result: string;
  switch (args.format) {
    case 'us':
      result = `${month}/${day}/${year}`;
      break;
    case 'eu':
      result = `${day}/${month}/${year}`;
      break;
    case 'custom':
      result = applyCustomFormat(now, args.customFormat ?? 'YYYY-MM-DD');
      break;
    default:
      result = `${year}-${month}-${day}`;
      break;
  }

  return JSON.stringify({ date: result });
}

// get_current_time

export const getCurrentTimeSchema = z.object({
  format: z
    .enum(['24h', '12h', 'custom'])
    .optional()
    .default('24h')
    .describe('Output format (default: 24h)'),
  showSeconds: z
    .boolean()
    .optional()
    .default(true)
    .describe('Include seconds (default: true)'),
  customFormat: z
    .string()
    .optional()
    .describe('Custom format string using HH, mm, ss placeholders'),
});

export async function getCurrentTime(
  args: z.infer<typeof getCurrentTimeSchema>
): Promise<string> {
  const now = new Date();
  const hours24 = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  let result: string;
  switch (args.format) {
    case '12h': {
      const period = hours24 >= 12 ? 'PM' : 'AM';
      const hours12 = hours24 % 12 || 12;
      result = args.showSeconds
        ? `${hours12}:${minutes}:${seconds} ${period}`
        : `${hours12}:${minutes} ${period}`;
      break;
    }
    case 'custom':
      result = applyCustomFormat(now, args.customFormat ?? 'HH:mm:ss');
      break;
    default:
      result = args.showSeconds
        ? `${String(hours24).padStart(2, '0')}:${minutes}:${seconds}`
        : `${String(hours24).padStart(2, '0')}:${minutes}`;
      break;
  }

  return JSON.stringify({ time: result });
}
