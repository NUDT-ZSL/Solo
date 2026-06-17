export function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export function isSameDay(dateStr: string, year: number, month: number, day: number): boolean {
  const d = new Date(dateStr + 'T00:00:00');
  return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
}

export function getCountdown(endDateStr: string, endTime: string, now?: Date): string {
  const end = new Date(`${endDateStr}T${endTime || '23:59:59'}`);
  const nowTime = now || new Date();
  const diff = end.getTime() - nowTime.getTime();
  if (diff <= 0) return '已到期';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  if (days > 0) return `${days}天 ${hours}时 ${minutes}分 ${seconds}秒`;
  return `${hours}时 ${minutes}分 ${seconds}秒`;
}
