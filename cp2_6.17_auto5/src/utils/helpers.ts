import dayjs from 'dayjs';

export function formatCountdown(endTime: string): string {
  const now = dayjs();
  const end = dayjs(endTime);
  const diff = end.diff(now);

  if (diff <= 0) {
    return '已过期';
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}天`);
  if (hours > 0 || days > 0) parts.push(`${hours}时`);
  if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes}分`);
  parts.push(`${seconds}秒`);

  return parts.join('');
}

export function getAlertEmoji(type: string): string {
  const emojiMap: Record<string, string> = {
    thunderstorm: '⛈️',
    typhoon: '🌀',
    rainstorm: '🌧️',
    high_temperature: '☀️',
    cold_wave: '❄️',
  };
  return emojiMap[type] || '⚠️';
}

export function isExpired(endTime: string): boolean {
  return dayjs(endTime).isBefore(dayjs());
}

export function isWithin24Hours(time: string): boolean {
  const now = dayjs();
  const targetTime = dayjs(time);
  return now.diff(targetTime, 'hour') < 24;
}
