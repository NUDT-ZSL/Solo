export const hslToHex = (h: number, s: number, l: number): string => {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

export const getCategoryColor = (category: string, index: number, total: number): string => {
  const hue = (index * 360) / Math.max(total, 1);
  return hslToHex(hue, 80, 60);
};

export const getCategoryColorHsl = (index: number, total: number): string => {
  const hue = (index * 360) / Math.max(total, 1);
  return `hsl(${hue}, 80%, 60%)`;
};

export const PRESET_COLORS = [
  '#EF4444',
  '#F97316',
  '#EAB308',
  '#22C55E',
  '#3B82F6',
  '#A855F7',
];
