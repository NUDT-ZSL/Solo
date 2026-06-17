import {
  format,
  startOfToday,
  startOfWeek,
  startOfMonth,
  isWithinInterval,
  parseISO,
  eachDayOfInterval
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { LogEntry, FilterState } from '../types';

export const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'yyyy-MM-dd', { locale: zhCN });
};

export const formatDateTime = (date: Date): string => {
  return format(date, 'yyyy-MM-dd HH:mm:ss', { locale: zhCN });
};

export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

export const getDateRange = (filter: FilterState): { start: Date; end: Date } => {
  const now = new Date();
  switch (filter.dateRange) {
    case 'today':
      return { start: startOfToday(), end: now };
    case 'week':
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: now };
    case 'month':
      return { start: startOfMonth(now), end: now };
    case 'custom':
      if (filter.customStart && filter.customEnd) {
        return {
          start: parseISO(filter.customStart),
          end: new Date(parseISO(filter.customEnd).getTime() + 86400000 - 1)
        };
      }
      return { start: startOfToday(), end: now };
    default:
      return { start: startOfToday(), end: now };
  }
};

export const filterByRange = (
  logs: LogEntry[],
  filter: FilterState
): LogEntry[] => {
  const { start, end } = getDateRange(filter);
  
  return logs.filter(log => {
    const logDate = parseISO(log.date);
    const inRange = isWithinInterval(logDate, { start, end });
    const tagMatch = !filter.tag || log.tag === filter.tag;
    return inRange && tagMatch;
  });
};

export const getDaysInRange = (filter: FilterState): string[] => {
  const { start, end } = getDateRange(filter);
  const days = eachDayOfInterval({ start, end: new Date(Math.min(end.getTime(), Date.now())) });
  return days.map(d => formatDate(d));
};
