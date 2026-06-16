import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

export const TIMEZONE_OPTIONS = [
  'UTC-12', 'UTC-11', 'UTC-10', 'UTC-9', 'UTC-8', 'UTC-7', 'UTC-6',
  'UTC-5', 'UTC-4', 'UTC-3', 'UTC-2', 'UTC-1', 'UTC+0',
  'UTC+1', 'UTC+2', 'UTC+3', 'UTC+4', 'UTC+5', 'UTC+6',
  'UTC+7', 'UTC+8', 'UTC+9', 'UTC+10', 'UTC+11', 'UTC+12'
];

export const TIMEZONE_ABBREVIATIONS: Record<string, string> = {
  'UTC-12': 'UTC-12',
  'UTC-11': 'UTC-11',
  'UTC-10': 'HST',
  'UTC-9': 'AKST',
  'UTC-8': 'PST',
  'UTC-7': 'MST',
  'UTC-6': 'CST',
  'UTC-5': 'EST',
  'UTC-4': 'AST',
  'UTC-3': 'BRT',
  'UTC-2': 'UTC-2',
  'UTC-1': 'UTC-1',
  'UTC+0': 'GMT',
  'UTC+1': 'CET',
  'UTC+2': 'EET',
  'UTC+3': 'MSK',
  'UTC+4': 'GST',
  'UTC+5': 'PKT',
  'UTC+6': 'BST',
  'UTC+7': 'ICT',
  'UTC+8': 'CST',
  'UTC+9': 'JST',
  'UTC+10': 'AEST',
  'UTC+11': 'UTC+11',
  'UTC+12': 'NZST'
};

export function parseTimezoneOffset(tz: string): number {
  const match = tz.match(/UTC([+-])(\d{1,2})/);
  if (!match) return 0;
  const sign = match[1] === '+' ? 1 : -1;
  const hours = parseInt(match[2], 10);
  return sign * hours;
}

export function minuteToTimeString(minute: number): string {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function timeStringToMinute(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function convertTimeToTimezone(
  time: string,
  fromTz: string,
  toTz: string
): string {
  const fromOffset = parseTimezoneOffset(fromTz);
  const toOffset = parseTimezoneOffset(toTz);
  const diffMinutes = (toOffset - fromOffset) * 60;
  let totalMinutes = timeStringToMinute(time) + diffMinutes;
  if (totalMinutes < 0) totalMinutes += 24 * 60;
  if (totalMinutes >= 24 * 60) totalMinutes -= 24 * 60;
  return minuteToTimeString(totalMinutes);
}

export function getTimezoneAbbr(tz: string): string {
  return TIMEZONE_ABBREVIATIONS[tz] || tz;
}

export const DAYS = ['周一', '周二', '周三', '周四', '周五'];
export const DAY_FULL = ['星期一', '星期二', '星期三', '星期四', '星期五'];
