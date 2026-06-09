import { ClimateData, TreeStructure, Branch, Leaf } from '../types';

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
};

const rgbToHex = (r: number, g: number, b: number): string => {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const mixColors = (color1: string, color2: string, t: number): string => {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  return rgbToHex(lerp(c1.r, c2.r, t), lerp(c1.g, c2.g, t), lerp(c1.b, c2.b, t));
};

const generateBranches = (
  x: number,
  y: number,
  length: number,
  angle: number,
  thickness: number,
  branchAngleBase: number,
  depth: number,
  maxDepth: number,
  branches: Branch[]
): void => {
  if (depth > maxDepth || length < 5) return;

  const endX = x + Math.sin(angle) * length;
  const endY = y - Math.cos(angle) * length;

  branches.push({
    startX: x,
    startY: y,
    endX,
    endY,
    thickness: Math.max(1, thickness),
    depth,
  });

  const angleSpread = (branchAngleBase * Math.PI) / 180;
  const newLength = length * 0.7;
  const newThickness = thickness * 0.7;

  generateBranches(endX, endY, newLength, angle - angleSpread, newThickness, branchAngleBase, depth + 1, maxDepth, branches);
  generateBranches(endX, endY, newLength, angle + angleSpread, newThickness, branchAngleBase, depth + 1, maxDepth, branches);
};

export const generateTree = (climate: ClimateData): TreeStructure => {
  const { temperature, humidity, windSpeed, light } = climate;

  const tempT = Math.max(0, Math.min(1, (temperature + 10) / 55));
  const trunkThickness = lerp(5, 20, tempT);

  const humT = Math.max(0, Math.min(1, humidity / 100));
  const branchAngle = lerp(20, -60, humT);

  const windT = Math.max(0, Math.min(1, windSpeed / 30));
  const leafCount = Math.round(lerp(80, 10, windT));

  const lightT = Math.max(0, Math.min(1, light / 100000));
  const leafColor = mixColors('#2D5A27', '#8FCF4E', lightT);

  const branches: Branch[] = [];
  generateBranches(200, 380, 100, 0, trunkThickness, Math.abs(branchAngle) + 15, 0, 5, branches);

  const leaves: Leaf[] = [];
  const tipBranches = branches.filter((b) => b.depth >= 3);

  for (let i = 0; i < leafCount; i++) {
    const branch = tipBranches.length > 0
      ? tipBranches[Math.floor(Math.random() * tipBranches.length)]
      : branches[branches.length - 1];
    if (!branch) continue;
    const t = Math.random();
    const lx = lerp(branch.startX, branch.endX, t) + (Math.random() - 0.5) * 20;
    const ly = lerp(branch.startY, branch.endY, t) + (Math.random() - 0.5) * 20;
    const radius = lerp(3, 5, Math.random());
    const colorVar = mixColors(leafColor, '#FFFFFF', Math.random() * 0.15);
    leaves.push({ x: lx, y: ly, radius, color: colorVar });
  }

  const leafRgb = hexToRgb(leafColor);
  const avgLeafColor = rgbToHex(
    lerp(leafRgb.r, 255, 0.1),
    lerp(leafRgb.g, 255, 0.1),
    lerp(leafRgb.b, 255, 0.1)
  );

  return {
    trunkThickness,
    branchAngle,
    leafCount,
    leafColor,
    avgLeafColor,
    branches,
    leaves,
  };
};

export const formatDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const easeInOut = (t: number): number => {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
};
