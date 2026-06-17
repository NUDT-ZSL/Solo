export const getMonthFirstDayWeekday = (year: number, month: number): number => {
  return new Date(year, month, 1).getDay();
};

export const getMonthDaysCount = (year: number, month: number): number => {
  return new Date(year, month + 1, 0).getDate();
};

export const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseDate = (dateStr: string): Date => {
  return new Date(dateStr);
};

export const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

export const isSameMonth = (date1: Date, date2: Date): boolean => {
  return date1.getFullYear() === date2.getFullYear() && date1.getMonth() === date2.getMonth();
};

export const getPreviousMonth = (year: number, month: number): { year: number; month: number } => {
  if (month === 0) {
    return { year: year - 1, month: 11 };
  }
  return { year, month: month - 1 };
};

export const getNextMonth = (year: number, month: number): { year: number; month: number } => {
  if (month === 11) {
    return { year: year + 1, month: 0 };
  }
  return { year, month: month + 1 };
};

export const getMonthName = (month: number): string => {
  const months = [
    '一月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '十一月', '十二月',
  ];
  return months[month];
};

export const getWeekdayNames = (): string[] => {
  return ['日', '一', '二', '三', '四', '五', '六'];
};

export const getCountdown = (endDateStr: string): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  totalSeconds: number;
} => {
  const endDate = new Date(endDateStr);
  endDate.setHours(23, 59, 59, 999);
  const now = new Date();
  const diff = endDate.getTime() - now.getTime();

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true, totalSeconds: 0 };
  }

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds, isExpired: false, totalSeconds };
};

export const formatDateTime = (dateStr: string, timeStr?: string): string => {
  const date = parseDate(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  if (timeStr) {
    return `${month}月${day}日 ${timeStr}`;
  }
  return `${month}月${day}日`;
};

export const isDateWithin24Hours = (dateStr: string): boolean => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  return diff > 0 && diff <= 24 * 60 * 60 * 1000;
};
