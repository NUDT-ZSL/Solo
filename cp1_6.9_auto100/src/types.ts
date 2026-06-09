export interface SkillNode {
  id: string;
  name: string;
  description: string;
  proficiency: number;
  color: string;
  hue: number;
  category: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  parentId?: string | null;
}

export interface SkillLink {
  id: string;
  source: string | SkillNode;
  target: string | SkillNode;
  type: 'dependency' | 'enhancement' | 'manual';
}

export interface SkillsData {
  nodes: SkillNode[];
  links: SkillLink[];
}

export interface HoveredNode {
  node: SkillNode;
  x: number;
  y: number;
}

export const hslToHex = (h: number, s: number, l: number): string => {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

export const getNodeRadius = (proficiency: number): number => {
  return 20 + (proficiency / 100) * 40;
};

export const getProgressRingWidth = (proficiency: number): number => {
  return 3 + (proficiency / 100) * 5;
};
