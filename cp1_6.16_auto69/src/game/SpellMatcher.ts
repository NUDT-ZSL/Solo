export type SpellType = 'fireball' | 'iceSpike' | 'thunder' | 'shield' | 'heal' | 'haste';

export interface Point {
  x: number;
  y: number;
}

export interface SpellInfo {
  type: SpellType;
  name: string;
  shape: string;
  color: string;
  damage: number;
  description: string;
}

export const SPELLS: Record<SpellType, SpellInfo> = {
  fireball: {
    type: 'fireball',
    name: '火球术',
    shape: '圆形',
    color: '#FF4500',
    damage: 12,
    description: '发射一枚灼热的火球，造成12点伤害'
  },
  iceSpike: {
    type: 'iceSpike',
    name: '冰锥术',
    shape: '三角形',
    color: '#00BFFF',
    damage: 8,
    description: '召唤锋利的冰锥，造成8点伤害并减速敌人'
  },
  thunder: {
    type: 'thunder',
    name: '雷电术',
    shape: '闪电形',
    color: '#FFFFFF',
    damage: 15,
    description: '召唤天降雷霆，造成15点伤害'
  },
  shield: {
    type: 'shield',
    name: '护盾术',
    shape: '六边形',
    color: '#87CEEB',
    damage: 0,
    description: '生成魔法护盾，下次受击伤害减半'
  },
  heal: {
    type: 'heal',
    name: '治疗术',
    shape: '十字形',
    color: '#2ECC71',
    damage: -8,
    description: '恢复8点生命值'
  },
  haste: {
    type: 'haste',
    name: '加速术',
    shape: '螺旋形',
    color: '#FFD700',
    damage: 0,
    description: '提升绘制速度20%，持续1秒'
  }
};

const MATCH_THRESHOLD = 0.8;
const MIN_POINTS = 30;

export function normalizePath(points: Point[]): Point[] {
  if (points.length === 0) return [];
  
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;
  
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  
  const width = maxX - minX || 1;
  const height = maxY - minY || 1;
  const size = Math.max(width, height);
  
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  
  const scale = 200 / size;
  
  return points.map(p => ({
    x: (p.x - centerX) * scale,
    y: (p.y - centerY) * scale
  }));
}

export function resamplePath(points: Point[], numPoints: number = 100): Point[] {
  if (points.length < 2) return points;
  
  let totalLength = 0;
  const lengths: number[] = [0];
  
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    totalLength += Math.sqrt(dx * dx + dy * dy);
    lengths.push(totalLength);
  }
  
  if (totalLength === 0) return points.slice(0, numPoints);
  
  const result: Point[] = [];
  const step = totalLength / (numPoints - 1);
  
  for (let i = 0; i < numPoints; i++) {
    const targetDist = step * i;
    let idx = 0;
    
    while (idx < lengths.length - 1 && lengths[idx + 1] < targetDist) {
      idx++;
    }
    
    if (idx >= lengths.length - 1) {
      result.push({ ...points[points.length - 1] });
    } else {
      const segLen = lengths[idx + 1] - lengths[idx];
      const t = segLen > 0 ? (targetDist - lengths[idx]) / segLen : 0;
      result.push({
        x: points[idx].x + (points[idx + 1].x - points[idx].x) * t,
        y: points[idx].y + (points[idx + 1].y - points[idx].y) * t
      });
    }
  }
  
  return result;
}

function matchCircle(points: Point[]): number {
  if (points.length < MIN_POINTS) return 0;
  
  let sumX = 0, sumY = 0;
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
  }
  const centerX = sumX / points.length;
  const centerY = sumY / points.length;
  
  const distances = points.map(p => 
    Math.sqrt((p.x - centerX) ** 2 + (p.y - centerY) ** 2)
  );
  
  const avgRadius = distances.reduce((a, b) => a + b, 0) / distances.length;
  if (avgRadius < 10) return 0;
  
  const variance = distances.reduce((sum, d) => sum + (d - avgRadius) ** 2, 0) / distances.length;
  const stdDev = Math.sqrt(variance);
  const relativeDev = stdDev / avgRadius;
  
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  const closureDist = Math.sqrt((firstPoint.x - lastPoint.x) ** 2 + (firstPoint.y - lastPoint.y) ** 2);
  const closureRatio = 1 - Math.min(closureDist / avgRadius, 1);
  
  const radiusScore = Math.max(0, 1 - relativeDev * 2);
  const closureScore = closureRatio;
  
  return Math.min(1, radiusScore * 0.7 + closureScore * 0.3);
}

function matchTriangle(points: Point[]): number {
  if (points.length < MIN_POINTS) return 0;
  
  const corners = findCorners(points, 3);
  if (corners.length < 3) return 0;
  
  const angles: number[] = [];
  for (let i = 0; i < 3; i++) {
    const p1 = corners[i];
    const p2 = corners[(i + 1) % 3];
    const p3 = corners[(i + 2) % 3];
    const angle = calculateAngle(p1, p2, p3);
    angles.push(angle);
  }
  
  angles.sort((a, b) => a - b);
  const angleSum = angles.reduce((a, b) => a + b, 0);
  const angleSumError = Math.abs(angleSum - Math.PI);
  const angleSumScore = Math.max(0, 1 - angleSumError * 2);
  
  const sideLengths: number[] = [];
  for (let i = 0; i < 3; i++) {
    const p1 = corners[i];
    const p2 = corners[(i + 1) % 3];
    sideLengths.push(Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2));
  }
  sideLengths.sort((a, b) => a - b);
  const sideRatio = sideLengths[0] / sideLengths[2];
  const sideScore = sideRatio;
  
  const inlierScore = calculateInlierRatio(points, corners);
  
  return Math.min(1, angleSumScore * 0.4 + sideScore * 0.3 + inlierScore * 0.3);
}

function matchLightning(points: Point[]): number {
  if (points.length < MIN_POINTS) return 0;
  
  let directionChanges = 0;
  let prevDx = 0;
  
  for (let i = 2; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    if (prevDx !== 0 && dx !== 0 && Math.sign(dx) !== Math.sign(prevDx)) {
      directionChanges++;
    }
    if (Math.abs(dx) > 1) prevDx = dx;
  }
  
  const zigzagScore = Math.min(1, directionChanges / 4);
  
  let minY = Infinity, maxY = -Infinity;
  let minX = Infinity, maxX = -Infinity;
  for (const p of points) {
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
  }
  
  const height = maxY - minY;
  const width = maxX - minX;
  const aspectRatio = height / (width || 1);
  const verticalScore = Math.min(1, aspectRatio / 2);
  
  return Math.min(1, zigzagScore * 0.6 + verticalScore * 0.4);
}

function matchHexagon(points: Point[]): number {
  if (points.length < MIN_POINTS) return 0;
  
  const corners = findCorners(points, 6);
  if (corners.length < 5) return 0;
  
  let sumX = 0, sumY = 0;
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
  }
  const centerX = sumX / points.length;
  const centerY = sumY / points.length;
  
  const distances = corners.map(p => 
    Math.sqrt((p.x - centerX) ** 2 + (p.y - centerY) ** 2)
  );
  const avgDist = distances.reduce((a, b) => a + b, 0) / distances.length;
  if (avgDist < 10) return 0;
  
  const variance = distances.reduce((sum, d) => sum + (d - avgDist) ** 2, 0) / distances.length;
  const radiusUniformity = 1 - Math.min(1, Math.sqrt(variance) / avgDist);
  
  const angles: number[] = [];
  for (const c of corners) {
    angles.push(Math.atan2(c.y - centerY, c.x - centerX));
  }
  angles.sort((a, b) => a - b);
  
  let angleDiffSum = 0;
  const expectedAngle = (Math.PI * 2) / 6;
  for (let i = 0; i < angles.length - 1; i++) {
    angleDiffSum += Math.abs(angles[i + 1] - angles[i] - expectedAngle);
  }
  const angleUniformity = 1 - Math.min(1, angleDiffSum / (Math.PI * 2));
  
  const inlierScore = calculateInlierRatio(points, corners);
  
  return Math.min(1, radiusUniformity * 0.4 + angleUniformity * 0.3 + inlierScore * 0.3);
}

function matchCross(points: Point[]): number {
  if (points.length < MIN_POINTS) return 0;
  
  const horizontalPoints: Point[] = [];
  const verticalPoints: Point[] = [];
  
  let sumY = 0, sumX = 0;
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
  }
  const centerY = sumY / points.length;
  const centerX = sumX / points.length;
  
  const threshold = 30;
  
  for (const p of points) {
    if (Math.abs(p.y - centerY) < threshold) {
      horizontalPoints.push(p);
    }
    if (Math.abs(p.x - centerX) < threshold) {
      verticalPoints.push(p);
    }
  }
  
  const horizontalRatio = horizontalPoints.length / points.length;
  const verticalRatio = verticalPoints.length / points.length;
  
  const crossScore = Math.min(1, (horizontalRatio + verticalRatio) * 0.8);
  
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  
  const width = maxX - minX;
  const height = maxY - minY;
  const aspectRatio = Math.min(width, height) / (Math.max(width, height) || 1);
  const proportionScore = aspectRatio;
  
  return Math.min(1, crossScore * 0.6 + proportionScore * 0.4);
}

function matchSpiral(points: Point[]): number {
  if (points.length < MIN_POINTS) return 0;
  
  let sumX = 0, sumY = 0;
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
  }
  const centerX = sumX / points.length;
  const centerY = sumY / points.length;
  
  const distances = points.map(p => 
    Math.sqrt((p.x - centerX) ** 2 + (p.y - centerY) ** 2)
  );
  
  let increasingCount = 0;
  for (let i = 1; i < distances.length; i++) {
    if (distances[i] > distances[i - 1]) {
      increasingCount++;
    }
  }
  const increasingRatio = increasingCount / (distances.length - 1);
  const spiralTrend = Math.abs(increasingRatio - 0.5) * 2;
  
  let angleChanges = 0;
  let prevAngle = 0;
  for (let i = 1; i < points.length; i++) {
    const angle = Math.atan2(points[i].y - centerY, points[i].x - centerX);
    if (i > 1) {
      let diff = angle - prevAngle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      angleChanges += Math.abs(diff);
    }
    prevAngle = angle;
  }
  
  const rotationScore = Math.min(1, angleChanges / (Math.PI * 4));
  
  const firstDist = distances[0];
  const lastDist = distances[distances.length - 1];
  const expansionRatio = Math.abs(lastDist - firstDist) / (Math.max(firstDist, lastDist) || 1);
  
  return Math.min(1, rotationScore * 0.5 + spiralTrend * 0.3 + expansionRatio * 0.2);
}

function findCorners(points: Point[], expectedCorners: number): Point[] {
  if (points.length < expectedCorners) return points;
  
  const angles: { index: number; angle: number }[] = [];
  const window = Math.max(3, Math.floor(points.length / 20));
  
  for (let i = window; i < points.length - window; i++) {
    const p1 = points[i - window];
    const p2 = points[i];
    const p3 = points[i + window];
    
    const angle = calculateAngle(p1, p2, p3);
    angles.push({ index: i, angle });
  }
  
  angles.sort((a, b) => a.angle - b.angle);
  
  const corners: Point[] = [];
  const minDistance = Math.floor(points.length / (expectedCorners * 2));
  
  for (const a of angles) {
    let tooClose = false;
    for (const existing of corners) {
      const existingIdx = points.findIndex(p => p.x === existing.x && p.y === existing.y);
      if (Math.abs(a.index - existingIdx) < minDistance) {
        tooClose = true;
        break;
      }
    }
    if (!tooClose && a.angle < Math.PI * 0.8) {
      corners.push(points[a.index]);
      if (corners.length >= expectedCorners) break;
    }
  }
  
  return corners;
}

function calculateAngle(p1: Point, vertex: Point, p2: Point): number {
  const v1 = { x: p1.x - vertex.x, y: p1.y - vertex.y };
  const v2 = { x: p2.x - vertex.x, y: p2.y - vertex.y };
  
  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.sqrt(v1.x ** 2 + v1.y ** 2);
  const mag2 = Math.sqrt(v2.x ** 2 + v2.y ** 2);
  
  if (mag1 === 0 || mag2 === 0) return Math.PI;
  
  const cosAngle = dot / (mag1 * mag2);
  return Math.acos(Math.max(-1, Math.min(1, cosAngle)));
}

function calculateInlierRatio(points: Point[], shapePoints: Point[]): number {
  if (shapePoints.length < 2) return 0;
  
  let inliers = 0;
  const threshold = 20;
  
  for (const p of points) {
    let minDist = Infinity;
    
    for (let i = 0; i < shapePoints.length; i++) {
      const p1 = shapePoints[i];
      const p2 = shapePoints[(i + 1) % shapePoints.length];
      const dist = pointToSegmentDistance(p, p1, p2);
      minDist = Math.min(minDist, dist);
    }
    
    if (minDist < threshold) inliers++;
  }
  
  return inliers / points.length;
}

function pointToSegmentDistance(point: Point, segStart: Point, segEnd: Point): number {
  const dx = segEnd.x - segStart.x;
  const dy = segEnd.y - segStart.y;
  const lenSq = dx * dx + dy * dy;
  
  if (lenSq === 0) {
    return Math.sqrt((point.x - segStart.x) ** 2 + (point.y - segStart.y) ** 2);
  }
  
  let t = ((point.x - segStart.x) * dx + (point.y - segStart.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  
  const projX = segStart.x + t * dx;
  const projY = segStart.y + t * dy;
  
  return Math.sqrt((point.x - projX) ** 2 + (point.y - projY) ** 2);
}

export function matchSpell(points: Point[]): { spell: SpellType | null; confidence: number } {
  if (points.length < MIN_POINTS) {
    return { spell: null, confidence: 0 };
  }
  
  const normalized = normalizePath(points);
  const resampled = resamplePath(normalized, 80);
  
  const matchers: Record<SpellType, (p: Point[]) => number> = {
    fireball: matchCircle,
    iceSpike: matchTriangle,
    thunder: matchLightning,
    shield: matchHexagon,
    heal: matchCross,
    haste: matchSpiral
  };
  
  let bestSpell: SpellType | null = null;
  let bestConfidence = 0;
  
  for (const [spell, matcher] of Object.entries(matchers)) {
    const confidence = matcher(resampled);
    if (confidence > bestConfidence) {
      bestConfidence = confidence;
      bestSpell = spell as SpellType;
    }
  }
  
  if (bestConfidence < MATCH_THRESHOLD) {
    return { spell: null, confidence: bestConfidence };
  }
  
  return { spell: bestSpell, confidence: bestConfidence };
}
