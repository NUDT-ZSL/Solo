export function getUserColorById(userId: string): string {
  if (!userId) return '#4da6ff';
  const lastChar = userId.charAt(userId.length - 1).toLowerCase();
  const charCode = lastChar.charCodeAt(0);
  const num = charCode % 10;
  return num < 5 ? '#0000FF' : '#FFA500';
}

export function hashStringToIndex(str: string, max: number): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash) % max;
}
