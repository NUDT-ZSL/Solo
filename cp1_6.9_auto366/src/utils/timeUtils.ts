export function formatRemainingTime(targetDateStr: string): string {
  const target = new Date(targetDateStr).getTime();
  const now = Date.now();
  const diff = target - now;

  if (diff <= 0) {
    return '已解锁';
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}天`);
  if (hours > 0) parts.push(`${hours}小时`);
  if (minutes > 0 && days === 0) parts.push(`${minutes}分`);
  if (parts.length === 0) parts.push('不到1分钟');

  return parts.join('');
}

export function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${h}:${min}`;
}

export function isUnlocked(targetDateStr: string): boolean {
  return new Date(targetDateStr).getTime() <= Date.now();
}

export function calculateDotSize(contentLength: number): number {
  const minSize = 50;
  const maxSize = 120;
  const maxLength = 2000;
  const ratio = Math.min(contentLength / maxLength, 1);
  return Math.round(minSize + (maxSize - minSize) * ratio);
}

export function getDateTimeInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}T${h}:${min}`;
}

export function getMinUnlockDateTime(): Date {
  const min = new Date();
  min.setMinutes(min.getMinutes() + 60);
  return min;
}

export function getMaxUnlockDateTime(): Date {
  const max = new Date();
  max.setDate(max.getDate() + 365);
  return max;
}

export function validateUnlockTime(unlockAt: string): { valid: boolean; message?: string } {
  const unlock = new Date(unlockAt).getTime();
  const now = Date.now();
  const min = now + 60 * 60 * 1000;
  const max = now + 365 * 24 * 60 * 60 * 1000;

  if (isNaN(unlock)) {
    return { valid: false, message: '请选择有效的解锁时间' };
  }
  if (unlock < min) {
    return { valid: false, message: '解锁时间不能早于1小时后' };
  }
  if (unlock > max) {
    return { valid: false, message: '解锁时间不能晚于365天后' };
  }
  return { valid: true };
}
