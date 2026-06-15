export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) {
    return `${mins}分钟`;
  }
  if (mins === 0) {
    return `${hours}小时`;
  }
  return `${hours}小时${mins}分钟`;
}

export function getCategoryColor(category: string): string {
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 55%)`;
}

export function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
}

export function getDateString(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getWeekDates(baseDate?: Date): Date[] {
  const base = baseDate || new Date();
  const dates: Date[] = [];
  const totalDays = 49;
  for (let i = totalDays - 1; i >= 0; i--) {
    const date = new Date(base);
    date.setDate(base.getDate() - i);
    dates.push(date);
  }
  return dates;
}

export function getStatus(progress: number): 'not-started' | 'in-progress' | 'completed' {
  if (progress <= 0) {
    return 'not-started';
  }
  if (progress >= 100) {
    return 'completed';
  }
  return 'in-progress';
}
