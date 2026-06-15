export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  id: string;
  playerId: string;
  type: 'freehand' | 'line' | 'curve' | 'polygon';
  color: string;
  width: number;
  points: Point[];
  timestamp: number;
}

function srgbToLinear(c: number): number {
  c = c / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function rgbToXyz(r: number, g: number, b: number): [number, number, number] {
  const R = srgbToLinear(r);
  const G = srgbToLinear(g);
  const B = srgbToLinear(b);
  const x = R * 0.4124 + G * 0.3576 + B * 0.1805;
  const y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  const z = R * 0.0193 + G * 0.1192 + B * 0.9505;
  return [x * 100, y * 100, z * 100];
}

function fLab(t: number): number {
  const delta = 6 / 29;
  return t > delta * delta * delta ? Math.cbrt(t) : t / (3 * delta * delta) + 4 / 29;
}

export function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  const [x, y, z] = rgbToXyz(r, g, b);
  const xn = 95.047;
  const yn = 100.0;
  const zn = 108.883;
  const fx = fLab(x / xn);
  const fy = fLab(y / yn);
  const fz = fLab(z / zn);
  const L = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const bb = 200 * (fy - fz);
  return [L, a, bb];
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return [r, g, b];
}

export function labDistance(hex1: string, hex2: string): number {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  const [L1, a1, bb1] = rgbToLab(r1, g1, b1);
  const [L2, a2, bb2] = rgbToLab(r2, g2, b2);
  return Math.sqrt(
    (L1 - L2) ** 2 + (a1 - a2) ** 2 + (bb1 - bb2) ** 2
  );
}

export function colorMatchScore(hex1: string, hex2: string): number {
  const dist = labDistance(hex1, hex2);
  const maxDist = 150;
  const normalized = Math.max(0, 1 - dist / maxDist);
  return Math.round(normalized * 100);
}

function getStrokeBounds(stroke: Stroke): { minX: number; minY: number; maxX: number; maxY: number } {
  if (stroke.points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of stroke.points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

function inflateBounds(
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  amount: number
) {
  return {
    minX: bounds.minX - amount,
    minY: bounds.minY - amount,
    maxX: bounds.maxX + amount,
    maxY: bounds.maxY + amount,
  };
}

function rectIoU(
  a: { minX: number; minY: number; maxX: number; maxY: number },
  b: { minX: number; minY: number; maxX: number; maxY: number }
): number {
  const interMinX = Math.max(a.minX, b.minX);
  const interMinY = Math.max(a.minY, b.minY);
  const interMaxX = Math.min(a.maxX, b.maxX);
  const interMaxY = Math.min(a.maxY, b.maxY);
  const interW = Math.max(0, interMaxX - interMinX);
  const interH = Math.max(0, interMaxY - interMinY);
  const interArea = interW * interH;
  const areaA = (a.maxX - a.minX) * (a.maxY - a.minY);
  const areaB = (b.maxX - b.minX) * (b.maxY - b.minY);
  const unionArea = areaA + areaB - interArea;
  if (unionArea <= 0) return 0;
  return interArea / unionArea;
}

export function shapeOverlapScore(prev: Stroke | null, curr: Stroke): number {
  if (!prev || prev.points.length === 0 || curr.points.length === 0) {
    return 50;
  }
  const inflateAmount = Math.max(prev.width, curr.width) * 4;
  const boundsA = inflateBounds(getStrokeBounds(prev), inflateAmount);
  const boundsB = inflateBounds(getStrokeBounds(curr), inflateAmount);
  const iou = rectIoU(boundsA, boundsB);

  let angleSimilarity = 0.5;
  if (prev.points.length >= 2 && curr.points.length >= 2) {
    const pa = prev.points[0];
    const pb = prev.points[prev.points.length - 1];
    const ca = curr.points[0];
    const cb = curr.points[curr.points.length - 1];
    const v1x = pb.x - pa.x;
    const v1y = pb.y - pa.y;
    const v2x = cb.x - ca.x;
    const v2y = cb.y - ca.y;
    const m1 = Math.sqrt(v1x * v1x + v1y * v1y);
    const m2 = Math.sqrt(v2x * v2x + v2y * v2y);
    if (m1 > 0 && m2 > 0) {
      const dot = (v1x * v2x + v1y * v2y) / (m1 * m2);
      angleSimilarity = (Math.max(-1, Math.min(1, dot)) + 1) / 2;
    }
  }

  const combined = iou * 0.7 + angleSimilarity * 0.3;
  return Math.round(combined * 100);
}

export function calculateStyleMatch(prevStroke: Stroke | null, currentStroke: Stroke): number {
  if (!prevStroke) {
    return 75;
  }
  const colorScore = colorMatchScore(prevStroke.color, currentStroke.color);
  const shapeScore = shapeOverlapScore(prevStroke, currentStroke);
  const total = colorScore * 0.4 + shapeScore * 0.6;
  return Math.round(Math.max(0, Math.min(100, total)));
}

const narrativeTemplates = [
  [
    '第一道笔触落下，仿佛在空白的宇宙中点燃了第一颗星。',
    '一笔落下，故事的序章就此开启。',
    '画布苏醒了，从这一抹颜色开始。',
  ],
  [
    '紧随其后的笔触，像是回声在山谷间荡漾。',
    '回应上一笔的低语，新的形状悄悄生长。',
    '两种色彩在画布上相遇，像久别重逢的老友。',
  ],
  [
    '画面开始诉说属于它自己的语言。',
    '抽象的形状在虚空中编织出隐约的叙事。',
    '线条与色块交错，一个梦境正在成形。',
  ],
  [
    '一笔接一笔，合奏出一曲视觉的乐章。',
    '每位玩家的笔触都是一个声部，和谐地交织。',
    '画布上的对话越来越热烈。',
  ],
  [
    '作品逐渐丰满，像一朵花在时间中绽放。',
    '集体的想象力汇聚成一幅超越个人的图景。',
    '最后的笔触落下，这幅画获得了它的灵魂。',
  ],
];

export function generateNarrative(strokeIndex: number, score: number, nickname: string): string {
  const tier = score >= 80 ? 0 : score >= 60 ? 1 : 2;
  const stage = Math.min(
    Math.floor(strokeIndex / 3),
    narrativeTemplates.length - 1
  );
  const templates = narrativeTemplates[stage];
  const base = templates[strokeIndex % templates.length];
  const comments = [
    '',
    `${nickname}的落笔精准而优雅。`,
    `${nickname}跟上了节奏。`,
    `${nickname}带来了意想不到的转折。`,
    `${nickname}为这幅画注入了新的生命力。`,
  ];
  const qualityDesc = tier === 0 ? '完美呼应' : tier === 1 ? '衔接流畅' : '大胆跳跃';
  return `${base} ${comments[(strokeIndex + nickname.length) % comments.length]}（风格匹配度：${score}分 · ${qualityDesc}）`;
}
