export type ElementType = 'fire' | 'thunder' | 'wind' | 'earth';

export interface Point {
  x: number;
  y: number;
}

export interface RuneFeatures {
  closedness: number;
  straightness: number;
  waviness: number;
  spiralness: number;
  crossings: number;
  totalLength: number;
  boundingBox: { width: number; height: number; area: number };
  directionChanges: number;
  rotations: number;
}

export interface RuneResult {
  element: ElementType | null;
  confidence: number;
  features: RuneFeatures;
}

const ELEMENT_NAMES: Record<ElementType, string> = {
  fire: '火',
  thunder: '雷',
  wind: '风',
  earth: '土'
};

export function getElementName(element: ElementType): string {
  return ELEMENT_NAMES[element];
}

export function getElementColor(element: ElementType): { start: string; end: string } {
  const colors: Record<ElementType, { start: string; end: string }> = {
    fire: { start: '#FF4500', end: '#FFD700' },
    thunder: { start: '#8A2BE2', end: '#FF00FF' },
    wind: { start: '#00CED1', end: '#7FFF00' },
    earth: { start: '#8B4513', end: '#DEB887' }
  };
  return colors[element];
}

export function getElementEmoji(element: ElementType): string {
  const emojis: Record<ElementType, string> = {
    fire: '🔥',
    thunder: '⚡',
    wind: '🌀',
    earth: '🪨'
  };
  return emojis[element];
}

function distance(p1: Point, p2: Point): number {
  return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
}

function normalizePoints(points: Point[]): Point[] {
  if (points.length < 2) return points;

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
  const scale = Math.max(width, height);

  return points.map(p => ({
    x: (p.x - minX) / scale,
    y: (p.y - minY) / scale
  }));
}

function downsample(points: Point[], targetCount: number = 64): Point[] {
  if (points.length <= targetCount) return points;

  const result: Point[] = [];
  const step = points.length / targetCount;

  for (let i = 0; i < targetCount; i++) {
    const index = Math.min(Math.floor(i * step), points.length - 1);
    result.push(points[index]);
  }

  return result;
}

function smoothPoints(points: Point[], iterations: number = 2): Point[] {
  let result = [...points];

  for (let iter = 0; iter < iterations; iter++) {
    const smoothed: Point[] = [result[0]];
    for (let i = 1; i < result.length - 1; i++) {
      smoothed.push({
        x: (result[i - 1].x + result[i].x * 2 + result[i + 1].x) / 4,
        y: (result[i - 1].y + result[i].y * 2 + result[i + 1].y) / 4
      });
    }
    smoothed.push(result[result.length - 1]);
    result = smoothed;
  }

  return result;
}

function totalPathLength(points: Point[]): number {
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    length += distance(points[i - 1], points[i]);
  }
  return length;
}

function calculateClosedness(points: Point[]): number {
  if (points.length < 3) return 0;
  const startEndDist = distance(points[0], points[points.length - 1]);
  const pathLength = totalPathLength(points);
  if (pathLength === 0) return 0;
  return Math.max(0, 1 - startEndDist / (pathLength * 0.25));
}

function calculateStraightness(points: Point[]): number {
  if (points.length < 2) return 0;
  const directDist = distance(points[0], points[points.length - 1]);
  const pathLength = totalPathLength(points);
  if (pathLength === 0) return 0;
  return directDist / pathLength;
}

function calculateDirectionChanges(points: Point[]): number {
  if (points.length < 3) return 0;

  let changes = 0;
  let prevAngle = Math.atan2(points[1].y - points[0].y, points[1].x - points[0].x);

  for (let i = 2; i < points.length; i++) {
    const angle = Math.atan2(points[i].y - points[i - 1].y, points[i].x - points[i - 1].x);
    let diff = angle - prevAngle;

    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    if (Math.abs(diff) > Math.PI / 6) {
      changes++;
    }

    prevAngle = angle;
  }

  return changes;
}

function calculateWaviness(points: Point[]): number {
  const dirChanges = calculateDirectionChanges(points);
  const normalized = dirChanges / 20;
  return Math.min(1, normalized);
}

function calculateRotations(points: Point[]): number {
  if (points.length < 3) return 0;

  let totalAngle = 0;
  let prevAngle = Math.atan2(points[1].y - points[0].y, points[1].x - points[0].x);

  for (let i = 2; i < points.length; i++) {
    const angle = Math.atan2(points[i].y - points[i - 1].y, points[i].x - points[i - 1].x);
    let diff = angle - prevAngle;

    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    totalAngle += diff;
    prevAngle = angle;
  }

  return Math.abs(totalAngle) / (Math.PI * 2);
}

function calculateSpiralness(points: Point[]): number {
  if (points.length < 5) return 0;

  const rotations = calculateRotations(points);

  let minRadius = Infinity;
  let maxRadius = 0;

  const centerX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
  const centerY = points.reduce((sum, p) => sum + p.y, 0) / points.length;

  for (const p of points) {
    const r = distance(p, { x: centerX, y: centerY });
    minRadius = Math.min(minRadius, r);
    maxRadius = Math.max(maxRadius, r);
  }

  const radiusExpansion = maxRadius > 0 ? (maxRadius - minRadius) / maxRadius : 0;

  if (rotations < 0.5) return 0;

  return Math.min(1, rotations * 0.5 + radiusExpansion * 0.5);
}

function lineIntersects(
  p1: Point, p2: Point,
  p3: Point, p4: Point
): boolean {
  const d1 = direction(p3, p4, p1);
  const d2 = direction(p3, p4, p2);
  const d3 = direction(p1, p2, p3);
  const d4 = direction(p1, p2, p4);

  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
      ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true;
  }

  return false;
}

function direction(p1: Point, p2: Point, p3: Point): number {
  return (p3.x - p1.x) * (p2.y - p1.y) - (p2.x - p1.x) * (p3.y - p1.y);
}

function countCrossings(points: Point[]): number {
  if (points.length < 4) return 0;

  let crossings = 0;
  const step = Math.max(1, Math.floor(points.length / 30));

  for (let i = 0; i < points.length - step - 1; i += step) {
    for (let j = i + step * 2; j < points.length - step; j += step) {
      if (lineIntersects(points[i], points[i + step], points[j], points[j + step])) {
        crossings++;
      }
    }
  }

  return crossings;
}

function extractFeatures(points: Point[]): RuneFeatures {
  const downsampled = downsample(points, 64);
  const normalized = normalizePoints(downsampled);
  const smoothed = smoothPoints(normalized, 2);

  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;
  for (const p of smoothed) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  const width = maxX - minX;
  const height = maxY - minY;

  return {
    closedness: calculateClosedness(smoothed),
    straightness: calculateStraightness(smoothed),
    waviness: calculateWaviness(smoothed),
    spiralness: calculateSpiralness(smoothed),
    crossings: countCrossings(smoothed),
    totalLength: totalPathLength(smoothed),
    boundingBox: { width, height, area: width * height },
    directionChanges: calculateDirectionChanges(smoothed),
    rotations: calculateRotations(smoothed)
  };
}

function scoreFire(features: RuneFeatures): number {
  let score = 0;

  if (features.closedness > 0.6) {
    score += features.closedness * 40;
  }

  if (features.straightness > 0.3 && features.straightness < 0.7) {
    score += (1 - Math.abs(features.straightness - 0.5) * 2) * 25;
  }

  if (features.rotations > 0.3 && features.rotations < 1.5) {
    score += 20;
  }

  if (features.directionChanges > 2 && features.directionChanges < 10) {
    score += 15;
  }

  return score;
}

function scoreThunder(features: RuneFeatures): number {
  let score = 0;

  if (features.waviness > 0.4) {
    score += features.waviness * 50;
  }

  if (features.straightness < 0.5) {
    score += (1 - features.straightness) * 20;
  }

  if (features.directionChanges > 6) {
    score += Math.min(30, features.directionChanges * 2);
  }

  if (features.closedness < 0.4) {
    score += 15;
  }

  return score;
}

function scoreWind(features: RuneFeatures): number {
  let score = 0;

  if (features.spiralness > 0.3) {
    score += features.spiralness * 55;
  }

  if (features.rotations > 1) {
    score += Math.min(25, features.rotations * 10);
  }

  if (features.closedness < 0.5) {
    score += 10;
  }

  if (features.boundingBox.area > 0.3) {
    score += 10;
  }

  return score;
}

function scoreEarth(features: RuneFeatures): number {
  let score = 0;

  if (features.crossings > 0) {
    score += Math.min(40, features.crossings * 8);
  }

  if (features.closedness > 0.4) {
    score += features.closedness * 25;
  }

  if (features.directionChanges > 4) {
    score += Math.min(20, features.directionChanges * 2);
  }

  if (features.rotations > 0.5) {
    score += 15;
  }

  return score;
}

export function recognizeRune(points: Point[]): RuneResult {
  if (points.length < 5) {
    return {
      element: null,
      confidence: 0,
      features: {} as RuneFeatures
    };
  }

  const features = extractFeatures(points);

  const scores: Record<ElementType, number> = {
    fire: scoreFire(features),
    thunder: scoreThunder(features),
    wind: scoreWind(features),
    earth: scoreEarth(features)
  };

  let bestElement: ElementType | null = null;
  let bestScore = 0;

  for (const [element, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestElement = element as ElementType;
    }
  }

  const confidence = Math.min(1, bestScore / 70);

  if (confidence < 0.3) {
    return {
      element: null,
      confidence,
      features
    };
  }

  return {
    element: bestElement,
    confidence,
    features
  };
}

export function getCombinedElement(elements: ElementType[]): { name: string; elements: ElementType[] } | null {
  if (elements.length < 2) return null;

  const sorted = [...elements].sort().join('+');

  const combos: Record<string, string> = {
    'fire+wind': '爆燃火焰漩涡',
    'thunder+earth': '晶体电网',
    'fire+thunder': '雷火风暴',
    'fire+earth': '熔岩喷发',
    'thunder+wind': '电磁风暴',
    'wind+earth': '沙尘暴'
  };

  const name = combos[sorted];
  if (name) {
    return { name, elements: [...elements] };
  }

  return null;
}
