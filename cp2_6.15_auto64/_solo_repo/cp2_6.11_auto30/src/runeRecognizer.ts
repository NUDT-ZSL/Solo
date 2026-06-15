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

function filterIsolatedPoints(points: Point[], threshold: number = 8): Point[] {
  if (points.length < 3) return points;

  const result: Point[] = [];

  for (let i = 0; i < points.length; i++) {
    let hasNeighbor = false;

    for (let j = 0; j < points.length; j++) {
      if (i === j) continue;
      if (distance(points[i], points[j]) < threshold) {
        hasNeighbor = true;
        break;
      }
    }

    if (hasNeighbor || i === 0 || i === points.length - 1) {
      result.push(points[i]);
    }
  }

  return result.length >= 3 ? result : points;
}

function filterShortSegments(points: Point[], minSegmentLength: number = 5): Point[] {
  if (points.length < 3) return points;

  const result: Point[] = [points[0]];
  let accumulatedDist = 0;

  for (let i = 1; i < points.length; i++) {
    const d = distance(points[i - 1], points[i]);
    accumulatedDist += d;

    if (accumulatedDist >= minSegmentLength || i === points.length - 1) {
      result.push(points[i]);
      accumulatedDist = 0;
    }
  }

  return result.length >= 3 ? result : points;
}

function resamplePoints(points: Point[], targetSpacing: number = 5): Point[] {
  if (points.length < 2) return points;

  const result: Point[] = [points[0]];
  let currentDist = 0;

  for (let i = 1; i < points.length; i++) {
    const segDist = distance(points[i - 1], points[i]);

    if (currentDist + segDist >= targetSpacing) {
      const remaining = targetSpacing - currentDist;
      const t = remaining / segDist;
      const newPoint: Point = {
        x: points[i - 1].x + (points[i].x - points[i - 1].x) * t,
        y: points[i - 1].y + (points[i].y - points[i - 1].y) * t
      };
      result.push(newPoint);
      points.splice(i, 0, newPoint);
      currentDist = 0;
    } else {
      currentDist += segDist;
    }
  }

  return result;
}

function normalizeStrokeDirection(points: Point[]): Point[] {
  if (points.length < 3) return points;

  let totalAngle = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const v1x = points[i].x - points[i - 1].x;
    const v1y = points[i].y - points[i - 1].y;
    const v2x = points[i + 1].x - points[i].x;
    const v2y = points[i + 1].y - points[i].y;

    const cross = v1x * v2y - v1y * v2x;
    totalAngle += cross;
  }

  if (totalAngle < 0) {
    return [...points].reverse();
  }

  return points;
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
  const offsetX = (scale - width) / 2;
  const offsetY = (scale - height) / 2;

  return points.map(p => ({
    x: (p.x - minX + offsetX) / scale,
    y: (p.y - minY + offsetY) / scale
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

function smoothPoints(points: Point[], iterations: number = 3): Point[] {
  let result = [...points];

  for (let iter = 0; iter < iterations; iter++) {
    if (result.length < 3) break;

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

function preprocessPoints(points: Point[]): Point[] {
  let processed = [...points];

  processed = filterIsolatedPoints(processed, 10);
  processed = filterShortSegments(processed, 4);
  processed = resamplePoints(processed, 6);
  processed = normalizeStrokeDirection(processed);
  processed = downsample(processed, 64);
  processed = normalizePoints(processed);
  processed = smoothPoints(processed, 3);

  return processed;
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
  return Math.max(0, 1 - startEndDist / (pathLength * 0.3));
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

    if (Math.abs(diff) > Math.PI / 8) {
      changes++;
    }

    prevAngle = angle;
  }

  return changes;
}

function calculateWaviness(points: Point[]): number {
  const dirChanges = calculateDirectionChanges(points);
  const normalized = dirChanges / 15;
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

  if (rotations < 0.4) return 0;

  return Math.min(1, rotations * 0.4 + radiusExpansion * 0.6);
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
  const step = Math.max(1, Math.floor(points.length / 25));

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
  const processed = preprocessPoints(points);

  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;
  for (const p of processed) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  const width = maxX - minX;
  const height = maxY - minY;

  return {
    closedness: calculateClosedness(processed),
    straightness: calculateStraightness(processed),
    waviness: calculateWaviness(processed),
    spiralness: calculateSpiralness(processed),
    crossings: countCrossings(processed),
    totalLength: totalPathLength(processed),
    boundingBox: { width, height, area: width * height },
    directionChanges: calculateDirectionChanges(processed),
    rotations: calculateRotations(processed)
  };
}

function scoreFire(features: RuneFeatures): number {
  let score = 0;

  if (features.closedness > 0.5) {
    score += features.closedness * 45;
  }

  if (features.straightness > 0.25 && features.straightness < 0.75) {
    score += (1 - Math.abs(features.straightness - 0.5) * 2.5) * 30;
  }

  if (features.rotations > 0.2 && features.rotations < 2) {
    score += Math.min(25, features.rotations * 15);
  }

  if (features.directionChanges > 1 && features.directionChanges < 12) {
    score += Math.min(15, features.directionChanges * 2);
  }

  return score;
}

function scoreThunder(features: RuneFeatures): number {
  let score = 0;

  if (features.waviness > 0.3) {
    score += features.waviness * 55;
  }

  if (features.straightness < 0.55) {
    score += (1 - features.straightness) * 25;
  }

  if (features.directionChanges > 5) {
    score += Math.min(35, features.directionChanges * 2.5);
  }

  if (features.closedness < 0.45) {
    score += 15;
  }

  return score;
}

function scoreWind(features: RuneFeatures): number {
  let score = 0;

  if (features.spiralness > 0.25) {
    score += features.spiralness * 60;
  }

  if (features.rotations > 0.8) {
    score += Math.min(30, features.rotations * 12);
  }

  if (features.closedness < 0.55) {
    score += 15;
  }

  if (features.boundingBox.area > 0.25) {
    score += Math.min(15, features.boundingBox.area * 20);
  }

  return score;
}

function scoreEarth(features: RuneFeatures): number {
  let score = 0;

  if (features.crossings > 0) {
    score += Math.min(45, features.crossings * 10);
  }

  if (features.closedness > 0.35) {
    score += features.closedness * 30;
  }

  if (features.directionChanges > 3) {
    score += Math.min(25, features.directionChanges * 2.5);
  }

  if (features.rotations > 0.4) {
    score += Math.min(20, features.rotations * 15);
  }

  return score;
}

export function recognizeRune(points: Point[]): RuneResult {
  if (points.length < 8) {
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
  let secondScore = 0;

  for (const [, score] of Object.entries(scores)) {
    if (score > bestScore) {
      secondScore = bestScore;
      bestScore = score;
    } else if (score > secondScore) {
      secondScore = score;
    }
  }

  for (const [element, score] of Object.entries(scores)) {
    if (score === bestScore) {
      bestElement = element as ElementType;
      break;
    }
  }

  const confidence = Math.min(1, bestScore / 75);
  const margin = bestScore - secondScore;

  if (confidence < 0.25 || margin < 10) {
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

export type ComboType = 'fire-wind' | 'thunder-earth' | 'fire-thunder' | 'fire-earth' | 'thunder-wind' | 'wind-earth';

export function getComboType(elements: ElementType[]): ComboType | null {
  if (elements.length < 2) return null;
  const sorted = [...elements].sort();
  return sorted.join('-') as ComboType;
}

export function getCombinedElement(elements: ElementType[]): { name: string; elements: ElementType[]; comboType: ComboType } | null {
  if (elements.length < 2) return null;

  const sorted = [...elements].sort().join('+');
  const comboType = getComboType(elements);

  const combos: Record<string, string> = {
    'fire+wind': '爆燃火焰漩涡',
    'thunder+earth': '晶体电网',
    'fire+thunder': '雷火风暴',
    'fire+earth': '熔岩喷发',
    'thunder+wind': '电磁风暴',
    'wind+earth': '沙尘暴'
  };

  const name = combos[sorted];
  if (name && comboType) {
    return { name, elements: [...elements], comboType };
  }

  return null;
}
