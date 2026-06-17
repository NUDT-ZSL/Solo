export interface ColorNode {
  id: string;
  color: string;
  position: number;
}

export type GradientType = 'linear' | 'radial';

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function randomColor(): string {
  const hex = Math.floor(Math.random() * 16777215).toString(16);
  return '#' + hex.padStart(6, '0');
}

export function buildGradientCSS(
  nodes: ColorNode[],
  angle: number,
  type: GradientType
): string {
  const sorted = [...nodes].sort((a, b) => a.position - b.position);
  const stops = sorted.map((n) => `${n.color} ${n.position}%`).join(', ');
  if (type === 'linear') {
    return `linear-gradient(${angle}deg, ${stops})`;
  }
  return `radial-gradient(circle ${angle}% at center, ${stops})`;
}
