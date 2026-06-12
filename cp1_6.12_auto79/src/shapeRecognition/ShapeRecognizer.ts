import {
  Point,
  BoundingBox,
  NodeType,
  RecognitionResult,
} from '../types';

const RESAMPLE_COUNT = 64;
const ANGLE_THRESHOLD = 30;
const CORNER_MIN_DISTANCE_RATIO = 0.05;
const CLOSED_THRESHOLD = 0.08;
const MIN_PATH_LENGTH = 30;
const MIN_CORNER_COUNT_RECT = 4;
const STRAIGHTNESS_THRESHOLD = 0.85;
const DIAMOND_CORNER_TOLERANCE = 0.25;
const ROUNDED_ANGLE_SMOOTHNESS = 0.6;

function distance(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function pathLength(points: Point[]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    len += distance(points[i - 1], points[i]);
  }
  return len;
}

function resample(points: Point[], count: number): Point[] {
  if (points.length === 0) return [];
  const totalLen = pathLength(points);
  if (totalLen === 0) return [points[0]];

  const interval = totalLen / (count - 1);
  const resampled: Point[] = [{ ...points[0] }];
  let accumulated = 0;

  for (let i = 1; i < points.length; i++) {
    const d = distance(points[i - 1], points[i]);
    if (accumulated + d >= interval) {
      const ratio = (interval - accumulated) / d;
      const nx = points[i - 1].x + ratio * (points[i].x - points[i - 1].x);
      const ny = points[i - 1].y + ratio * (points[i].y - points[i - 1].y);
      resampled.push({ x: nx, y: ny });
      points.splice(i, 0, { x: nx, y: ny });
      accumulated = 0;
    } else {
      accumulated += d;
    }
    if (resampled.length >= count) break;
  }

  while (resampled.length < count) {
    resampled.push({ ...points[points.length - 1] });
  }

  return resampled;
}

function computeBoundingBox(points: Point[]): BoundingBox {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return {
    minX, minY, maxX, maxY,
    width: maxX - minX,
    height: maxY - minY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
}

function angleBetween(a: Point, b: Point, c: Point): number {
  const v1 = { x: a.x - b.x, y: a.y - b.y };
  const v2 = { x: c.x - b.x, y: c.y - b.y };
  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.sqrt(v1.x ** 2 + v1.y ** 2);
  const mag2 = Math.sqrt(v2.x ** 2 + v2.y ** 2);
  if (mag1 === 0 || mag2 === 0) return 0;
  const cos = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return Math.acos(cos) * (180 / Math.PI);
}

function detectCorners(points: Point[], bbox: BoundingBox): { index: number; angle: number }[] {
  const corners: { index: number; angle: number }[] = [];
  const diagonal = Math.sqrt(bbox.width ** 2 + bbox.height ** 2);
  const minDist = diagonal * CORNER_MIN_DISTANCE_RATIO;
  const step = Math.max(1, Math.floor(points.length / 32));

  for (let i = step; i < points.length - step; i += step) {
    const prev = points[Math.max(0, i - step)];
    const curr = points[i];
    const next = points[Math.min(points.length - 1, i + step)];
    const angle = angleBetween(prev, curr, next);

    if (angle < (180 - ANGLE_THRESHOLD)) {
      const tooClose = corners.some(
        c => distance(points[c.index], curr) < minDist
      );
      if (!tooClose) {
        corners.push({ index: i, angle });
      }
    }
  }

  corners.sort((a, b) => a.angle - b.angle);
  return corners;
}

function isClosed(points: Point[], totalLen: number): boolean {
  if (points.length < 3) return false;
  const firstLast = distance(points[0], points[points.length - 1]);
  return firstLast / totalLen < CLOSED_THRESHOLD;
}

function computeStraightness(points: Point[], bbox: BoundingBox): number {
  if (points.length < 3) return 1;
  const first = points[0];
  const last = points[points.length - 1];
  const directDist = distance(first, last);
  if (directDist === 0) return 0;
  const totalLen = pathLength(points);
  return directDist / totalLen;
}

function computeAspectRatio(bbox: BoundingBox): number {
  if (bbox.height === 0) return Infinity;
  return bbox.width / bbox.height;
}

function isDiamondLike(corners: { index: number; angle: number }[], points: Point[], bbox: BoundingBox): boolean {
  if (corners.length < 4) return false;
  const top4 = corners.slice(0, 4);
  const center = { x: bbox.centerX, y: bbox.centerY };
  const halfDiag = Math.sqrt(bbox.width ** 2 + bbox.height ** 2) / 2;

  let onDiagonals = 0;
  for (const c of top4) {
    const p = points[c.index];
    const d = distance(p, center);
    if (d > halfDiag * (1 - DIAMOND_CORNER_TOLERANCE) &&
        d < halfDiag * (1 + DIAMOND_CORNER_TOLERANCE)) {
      onDiagonals++;
    }
  }

  const hasTop = top4.some(c => points[c.index].y < bbox.centerY - bbox.height * 0.2);
  const hasBottom = top4.some(c => points[c.index].y > bbox.centerY + bbox.height * 0.2);
  const hasLeft = top4.some(c => points[c.index].x < bbox.centerX - bbox.width * 0.2);
  const hasRight = top4.some(c => points[c.index].x > bbox.centerX + bbox.width * 0.2);

  return onDiagonals >= 2 && hasTop && hasBottom && hasLeft && hasRight;
}

function isRoundedRectangle(
  corners: { index: number; angle: number }[],
  points: Point[],
  bbox: BoundingBox
): boolean {
  const smoothCorners = corners.filter(c => c.angle > (180 - ANGLE_THRESHOLD) * (1 - ROUNDED_ANGLE_SMOOTHNESS));
  const sharpCorners = corners.filter(c => c.angle <= (180 - ANGLE_THRESHOLD) * (1 - ROUNDED_ANGLE_SMOOTHNESS));

  const hasWideAngles = smoothCorners.length >= 3;
  const hasSomeSharp = sharpCorners.length <= 4;

  if (hasWideAngles && hasSomeSharp) {
    const edgeCount = detectEdgeDirections(points, bbox);
    return edgeCount >= 3;
  }

  return false;
}

function detectEdgeDirections(points: Point[], bbox: BoundingBox): number {
  const directions = new Set<string>();
  const step = Math.max(1, Math.floor(points.length / 16));

  for (let i = step; i < points.length; i += step) {
    const dx = points[i].x - points[i - step].x;
    const dy = points[i].y - points[i - step].y;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    if (angle >= -22.5 && angle < 22.5) directions.add('right');
    else if (angle >= 67.5 && angle < 112.5) directions.add('down');
    else if (angle >= 157.5 || angle < -157.5) directions.add('left');
    else if (angle >= -112.5 && angle < -67.5) directions.add('up');
  }

  return directions.size;
}

function hasArrowHead(points: Point[]): boolean {
  if (points.length < 6) return false;
  const end = points.length;
  const tailLen = Math.min(8, Math.floor(end * 0.15));
  const tip = points[end - 1];
  const before = points[end - tailLen];
  const baseAngle = Math.atan2(tip.y - before.y, tip.x - before.x) * (180 / Math.PI);

  for (let i = end - tailLen - 1; i >= Math.max(0, end - tailLen * 3); i--) {
    const angle = Math.atan2(tip.y - points[i].y, tip.x - points[i].x) * (180 / Math.PI);
    const diff = Math.abs(angle - baseAngle);
    if (diff > 20 && diff < 160) return true;
  }
  return false;
}

export function recognize(rawPoints: Point[]): RecognitionResult {
  if (rawPoints.length < 3) {
    return { type: 'unknown', confidence: 0 };
  }

  const totalLen = pathLength(rawPoints);
  if (totalLen < MIN_PATH_LENGTH) {
    return { type: 'unknown', confidence: 0 };
  }

  const points = resample([...rawPoints.map(p => ({ ...p }))], RESAMPLE_COUNT);
  const bbox = computeBoundingBox(points);
  const closed = isClosed(rawPoints, totalLen);
  const aspectRatio = computeAspectRatio(bbox);
  const corners = detectCorners(points, bbox);

  if (!closed) {
    const straightness = computeStraightness(rawPoints, bbox);
    const arrowDetected = hasArrowHead(rawPoints);

    if (straightness > 0.6 || arrowDetected) {
      const confidence = arrowDetected
        ? Math.min(0.95, 0.7 + straightness * 0.25)
        : Math.min(0.9, 0.5 + straightness * 0.4);

      return {
        type: 'connection',
        confidence,
        sourceAnchor: { ...rawPoints[0] },
        targetAnchor: { ...rawPoints[rawPoints.length - 1] },
        startPoint: { ...rawPoints[0] },
        endPoint: { ...rawPoints[rawPoints.length - 1] },
      };
    }
  }

  if (closed) {
    const isDiamond = isDiamondLike(corners, points, bbox);
    if (isDiamond) {
      const confidence = Math.min(0.95, 0.75 + (corners.length === 4 ? 0.15 : 0.05));
      return {
        type: 'node',
        nodeType: 'diamond',
        confidence,
        position: { x: bbox.centerX, y: bbox.centerY },
        size: { width: bbox.width, height: bbox.height },
      };
    }

    const isRounded = isRoundedRectangle(corners, points, bbox);
    if (isRounded && corners.length >= 6) {
      return {
        type: 'node',
        nodeType: 'rounded-rectangle',
        confidence: Math.min(0.92, 0.7 + (corners.length >= 8 ? 0.2 : 0.1)),
        position: { x: bbox.centerX, y: bbox.centerY },
        size: { width: bbox.width, height: bbox.height },
        cornerRadius: Math.min(bbox.width, bbox.height) * 0.2,
      };
    }

    if (corners.length >= MIN_CORNER_COUNT_RECT && aspectRatio > 0.2 && aspectRatio < 5) {
      const edgeDirs = detectEdgeDirections(points, bbox);
      const confidence = Math.min(0.95, 0.65 + edgeDirs * 0.075);

      return {
        type: 'node',
        nodeType: 'rectangle',
        confidence,
        position: { x: bbox.centerX, y: bbox.centerY },
        size: { width: bbox.width, height: bbox.height },
      };
    }

    if (corners.length >= 3 && aspectRatio > 0.3 && aspectRatio < 3) {
      return {
        type: 'node',
        nodeType: 'rectangle',
        confidence: 0.7,
        position: { x: bbox.centerX, y: bbox.centerY },
        size: { width: bbox.width, height: bbox.height },
      };
    }
  }

  return {
    type: 'node',
    nodeType: 'rectangle',
    confidence: 0.5,
    position: { x: bbox.centerX, y: bbox.centerY },
    size: { width: Math.max(bbox.width, 60), height: Math.max(bbox.height, 40) },
  };
}

export function generateStandardPath(
  nodeType: NodeType,
  position: Point,
  size: { width: number; height: number },
  cornerRadius?: number
): Point[] {
  const hw = size.width / 2;
  const hh = size.height / 2;
  const cx = position.x;
  const cy = position.y;

  switch (nodeType) {
    case 'rectangle': {
      const pts: Point[] = [];
      const steps = 4;
      const corners = [
        { x: cx - hw, y: cy - hh },
        { x: cx + hw, y: cy - hh },
        { x: cx + hw, y: cy + hh },
        { x: cx - hw, y: cy + hh },
      ];
      for (let i = 0; i < 4; i++) {
        const next = (i + 1) % 4;
        for (let s = 0; s < steps; s++) {
          const t = s / steps;
          pts.push({
            x: corners[i].x + t * (corners[next].x - corners[i].x),
            y: corners[i].y + t * (corners[next].y - corners[i].y),
          });
        }
      }
      return pts;
    }
    case 'diamond': {
      const pts: Point[] = [];
      const corners = [
        { x: cx, y: cy - hh },
        { x: cx + hw, y: cy },
        { x: cx, y: cy + hh },
        { x: cx - hw, y: cy },
      ];
      const steps = 4;
      for (let i = 0; i < 4; i++) {
        const next = (i + 1) % 4;
        for (let s = 0; s < steps; s++) {
          const t = s / steps;
          pts.push({
            x: corners[i].x + t * (corners[next].x - corners[i].x),
            y: corners[i].y + t * (corners[next].y - corners[i].y),
          });
        }
      }
      return pts;
    }
    case 'rounded-rectangle': {
      const r = cornerRadius || Math.min(hw, hh) * 0.3;
      const pts: Point[] = [];
      const arcSteps = 4;
      const lineSteps = 3;

      const cornersDef = [
        { cx: cx + hw - r, cy: cy - hh + r, startAngle: -Math.PI / 2, endAngle: 0 },
        { cx: cx + hw - r, cy: cy + hh - r, startAngle: 0, endAngle: Math.PI / 2 },
        { cx: cx - hw + r, cy: cy + hh - r, startAngle: Math.PI / 2, endAngle: Math.PI },
        { cx: cx - hw + r, cy: cy - hh + r, startAngle: Math.PI, endAngle: Math.PI * 1.5 },
      ];

      const lineSegments = [
        { from: { x: cx + hw - r, y: cy - hh }, to: { x: cx - hw + r, y: cy - hh } },
        { from: { x: cx + hw, y: cy - hh + r }, to: { x: cx + hw, y: cy + hh - r } },
        { from: { x: cx - hw + r, y: cy + hh }, to: { x: cx + hw - r, y: cy + hh } },
        { from: { x: cx - hw, y: cy + hh - r }, to: { x: cx - hw, y: cy - hh + r } },
      ];

      for (let i = 0; i < 4; i++) {
        const seg = lineSegments[i];
        for (let s = 0; s < lineSteps; s++) {
          const t = s / lineSteps;
          pts.push({
            x: seg.from.x + t * (seg.to.x - seg.from.x),
            y: seg.from.y + t * (seg.to.y - seg.from.y),
          });
        }
        const arc = cornersDef[i];
        for (let s = 0; s < arcSteps; s++) {
          const t = s / arcSteps;
          const angle = arc.startAngle + t * (arc.endAngle - arc.startAngle);
          pts.push({
            x: arc.cx + r * Math.cos(angle),
            y: arc.cy + r * Math.sin(angle),
          });
        }
      }
      return pts;
    }
  }
}

export function interpolatePaths(
  from: Point[],
  to: Point[],
  t: number
): Point[] {
  const maxLen = Math.max(from.length, to.length);
  const result: Point[] = [];

  for (let i = 0; i < maxLen; i++) {
    const fi = Math.min(i, from.length - 1);
    const ti = Math.min(i, to.length - 1);
    result.push({
      x: from[fi].x + t * (to[ti].x - from[fi].x),
      y: from[fi].y + t * (to[fi].y - from[fi].y),
    });
  }

  return result;
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
