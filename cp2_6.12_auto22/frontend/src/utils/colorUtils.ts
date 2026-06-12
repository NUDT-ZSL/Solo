const PALETTE = [
  '#4da6ff',
  '#FFA500',
  '#10b981',
  '#f472b6',
  '#a78bfa',
  '#fbbf24',
  '#34d399',
  '#f87171',
  '#60a5fa',
  '#fb923c',
  '#c084fc',
  '#2dd4bf',
];

export function getUserColorById(userId: string): string {
  if (!userId) return PALETTE[0];
  return PALETTE[hashStringToIndex(userId, PALETTE.length)];
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
