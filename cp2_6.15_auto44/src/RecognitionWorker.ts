export interface StrokePoint {
  x: number;
  y: number;
  timestamp: number;
}

export interface Stroke {
  points: StrokePoint[];
}

interface WorkerMessage {
  type: 'recognize';
  strokes: Stroke[];
  useOnline?: boolean;
  apiEndpoint?: string;
}

interface WorkerResponse {
  type: 'result';
  latex: string;
  source: 'local' | 'online';
}

interface StrokeFeatures {
  numPoints: number;
  pathLength: number;
  startPoint: StrokePoint;
  endPoint: StrokePoint;
  bbox: { minX: number; maxX: number; minY: number; maxY: number };
  width: number;
  height: number;
  aspectRatio: number;
  directionHistogram: number[];
  dominantDirection: number;
  curvature: number;
  isClosed: boolean;
  horizontalSegments: number;
  verticalSegments: number;
}

interface GlobalFeatures {
  numStrokes: number;
  totalPoints: number;
  totalPathLength: number;
  bbox: { minX: number; maxX: number; minY: number; maxY: number };
  width: number;
  height: number;
  aspectRatio: number;
  strokeFeatures: StrokeFeatures[];
  avgStrokeWidth: number;
  avgStrokeHeight: number;
}

function computeStrokeFeatures(stroke: Stroke): StrokeFeatures {
  const points = stroke.points;
  const numPoints = points.length;

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  let pathLength = 0;
  let curvature = 0;

  const dirBins = 8;
  const directionHistogram = new Array(dirBins).fill(0);

  for (let i = 0; i < points.length; i++) {
    minX = Math.min(minX, points[i].x);
    maxX = Math.max(maxX, points[i].x);
    minY = Math.min(minY, points[i].y);
    maxY = Math.max(maxY, points[i].y);
  }

  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    const segLen = Math.sqrt(dx * dx + dy * dy);
    pathLength += segLen;

    let angle = Math.atan2(dy, dx);
    if (angle < 0) angle += Math.PI * 2;
    const binIdx = Math.floor((angle / (Math.PI * 2)) * dirBins) % dirBins;
    directionHistogram[binIdx] += segLen;
  }

  for (let i = 2; i < points.length; i++) {
    const v1x = points[i - 1].x - points[i - 2].x;
    const v1y = points[i - 1].y - points[i - 2].y;
    const v2x = points[i].x - points[i - 1].x;
    const v2y = points[i].y - points[i - 1].y;
    const cross = v1x * v2y - v1y * v2x;
    const dot = v1x * v2x + v1y * v2y;
    curvature += Math.abs(Math.atan2(cross, dot));
  }

  let dominantDir = 0;
  let maxBinVal = 0;
  for (let i = 0; i < dirBins; i++) {
    if (directionHistogram[i] > maxBinVal) {
      maxBinVal = directionHistogram[i];
      dominantDir = i;
    }
  }

  const start = points[0];
  const end = points[points.length - 1];
  const closureDist = Math.sqrt((start.x - end.x) ** 2 + (start.y - end.y) ** 2);
  const isClosed = pathLength > 20 && closureDist < pathLength * 0.15;

  const width = maxX - minX;
  const height = maxY - minY;

  const horizontalSegments = directionHistogram[0] + directionHistogram[dirBins / 2];
  const verticalSegments = directionHistogram[dirBins / 4] + directionHistogram[(dirBins * 3) / 4];

  return {
    numPoints,
    pathLength,
    startPoint: start,
    endPoint: end,
    bbox: { minX, maxX, minY, maxY },
    width,
    height,
    aspectRatio: height > 0 ? width / height : 1,
    directionHistogram,
    dominantDirection: dominantDir,
    curvature,
    isClosed,
    horizontalSegments,
    verticalSegments
  };
}

function computeGlobalFeatures(strokes: Stroke[]): GlobalFeatures {
  const strokeFeatures = strokes.map(s => computeStrokeFeatures(s));

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  let totalPoints = 0;
  let totalPathLength = 0;
  let totalWidth = 0;
  let totalHeight = 0;

  strokeFeatures.forEach(sf => {
    minX = Math.min(minX, sf.bbox.minX);
    maxX = Math.max(maxX, sf.bbox.maxX);
    minY = Math.min(minY, sf.bbox.minY);
    maxY = Math.max(maxY, sf.bbox.maxY);
    totalPoints += sf.numPoints;
    totalPathLength += sf.pathLength;
    totalWidth += sf.width;
    totalHeight += sf.height;
  });

  return {
    numStrokes: strokes.length,
    totalPoints,
    totalPathLength,
    bbox: { minX, maxX, minY, maxY },
    width: maxX - minX,
    height: maxY - minY,
    aspectRatio: (maxY - minY) > 0 ? (maxX - minX) / (maxY - minY) : 1,
    strokeFeatures,
    avgStrokeWidth: strokes.length > 0 ? totalWidth / strokes.length : 0,
    avgStrokeHeight: strokes.length > 0 ? totalHeight / strokes.length : 0
  };
}

function angleDiff(a1: number, a2: number): number {
  let diff = Math.abs(a1 - a2);
  if (diff > Math.PI) diff = Math.PI * 2 - diff;
  return diff;
}

function recognizeDigit(features: GlobalFeatures): string | null {
  if (features.numStrokes !== 1) return null;
  const sf = features.strokeFeatures[0];
  const { width, height, aspectRatio, curvature, isClosed, startPoint, endPoint, pathLength } = sf;

  if (pathLength < 15) return null;

  if (isClosed && curvature > Math.PI * 1.5 && aspectRatio > 0.6 && aspectRatio < 1.6) {
    return '0';
  }

  if (aspectRatio > 1.5 && height < 25) {
    return '-';
  }

  if (aspectRatio < 0.6 && width > 5) {
    const hasLeftRightCross = sf.directionHistogram[0] > pathLength * 0.15 && sf.directionHistogram[4] > pathLength * 0.15;
    if (hasLeftRightCross && curvature > Math.PI * 0.8) return 'x';
    return '1';
  }

  if (curvature > Math.PI * 2.2) {
    if (startPoint.y < endPoint.y - height * 0.25) return '6';
    if (startPoint.y > endPoint.y + height * 0.25) return '9';
    if (isClosed) return '0';
    return '8';
  }

  if (curvature > Math.PI * 1.2 && curvature < Math.PI * 2.2) {
    const startTop = startPoint.y < sf.bbox.minY + height * 0.3;
    const endBottom = endPoint.y > sf.bbox.maxY - height * 0.3;
    if (startTop && endBottom) return '2';
    if (!startTop && endBottom && !isClosed) return '5';
    if (startPoint.x < sf.bbox.minX + width * 0.3 && endPoint.x > sf.bbox.maxX - width * 0.3) return '3';
    return 'c';
  }

  if (curvature < Math.PI * 0.8) {
    const dx = endPoint.x - startPoint.x;
    const dy = endPoint.y - startPoint.y;
    const angle = Math.atan2(dy, dx);
    if (Math.abs(angle) < Math.PI * 0.15) return '-';
    if (Math.abs(angle - Math.PI) < Math.PI * 0.15) return '-';
    if (Math.abs(angle - Math.PI / 2) < Math.PI * 0.2) return '1';
    if (Math.abs(angle + Math.PI / 2) < Math.PI * 0.2) return '1';
    if (angle < -Math.PI / 4 && angle > -Math.PI * 0.75) return '/';
  }

  return null;
}

function recognizeTwoStrokes(features: GlobalFeatures): string | null {
  if (features.numStrokes !== 2) return null;
  const s1 = features.strokeFeatures[0];
  const s2 = features.strokeFeatures[1];

  const s1horiz = s1.aspectRatio > 2.0 && s1.height < 20;
  const s2horiz = s2.aspectRatio > 2.0 && s2.height < 20;
  const s1vert = s1.aspectRatio < 0.5 && s1.width < 20;
  const s2vert = s2.aspectRatio < 0.5 && s2.width < 20;

  if (s1horiz && s2horiz) {
    const avgGap = Math.abs(s1.bbox.minY - s2.bbox.minY);
    if (avgGap > 15 && avgGap < 80) return '=';
  }

  if ((s1horiz && s2vert) || (s2horiz && s1vert)) {
    const horiz = s1horiz ? s1 : s2;
    const vert = s1vert ? s1 : s2;
    const horizCenterY = (horiz.bbox.minY + horiz.bbox.maxY) / 2;
    const vertCenterY = (vert.bbox.minY + vert.bbox.maxY) / 2;
    const horizCenterX = (horiz.bbox.minX + horiz.bbox.maxX) / 2;
    const vertCenterX = (vert.bbox.minX + vert.bbox.maxX) / 2;

    if (Math.abs(horizCenterX - vertCenterX) < features.width * 0.3) {
      if (horiz.bbox.minY < vertCenterY) return 'T';
      if (Math.abs(horizCenterY - vertCenterY) < features.height * 0.3) return '+';
      return '7';
    }
  }

  const s1Start = s1.startPoint;
  const s1End = s1.endPoint;
  const s2Start = s2.startPoint;
  const s2End = s2.endPoint;

  const allX = [s1Start.x, s1End.x, s2Start.x, s2End.x, s1.bbox.minX, s1.bbox.maxX, s2.bbox.minX, s2.bbox.maxX];
  const allY = [s1Start.y, s1End.y, s2Start.y, s2End.y, s1.bbox.minY, s1.bbox.maxY, s2.bbox.minY, s2.bbox.maxY];
  const cx = (Math.min(...allX) + Math.max(...allX)) / 2;
  const cy = (Math.min(...allY) + Math.max(...allY)) / 2;

  const bothCrossCenter =
    (s1.bbox.minX < cx && s1.bbox.maxX > cx && s1.bbox.minY < cy && s1.bbox.maxY > cy) &&
    (s2.bbox.minX < cx && s2.bbox.maxX > cx && s2.bbox.minY < cy && s2.bbox.maxY > cy);

  if (bothCrossCenter && Math.abs(s1.aspectRatio - s2.aspectRatio) < 1) {
    return 'x';
  }

  const hasCross = (a: StrokeFeatures, b: StrokeFeatures) => {
    const aMidX = (a.bbox.minX + a.bbox.maxX) / 2;
    const aMidY = (a.bbox.minY + a.bbox.maxY) / 2;
    return b.bbox.minX < aMidX && b.bbox.maxX > aMidX && b.bbox.minY < aMidY && b.bbox.maxY > aMidY;
  };

  if (hasCross(s1, s2) || hasCross(s2, s1)) {
    return 'x';
  }

  if (s1.isClosed || s2.isClosed) {
    return '6';
  }

  return null;
}

function recognizeMultiStrokes(features: GlobalFeatures): string | null {
  if (features.numStrokes < 3) return null;
  const { numStrokes, strokeFeatures } = features;

  const horizontalCount = strokeFeatures.filter(s => s.aspectRatio > 2.0 && s.height < 25).length;
  const verticalCount = strokeFeatures.filter(s => s.aspectRatio < 0.6 && s.width < 25).length;

  if (numStrokes === 3 && horizontalCount >= 1 && verticalCount >= 1) {
    return '\\div';
  }

  if (numStrokes === 3 && horizontalCount >= 2) {
    return '\\equiv';
  }

  if (numStrokes >= 3 && features.aspectRatio < 0.8) {
    return '\\sum';
  }

  if (numStrokes >= 4) {
    return '\\int';
  }

  return null;
}

function classify(strokes: Stroke[]): string {
  if (strokes.length === 0) return '';

  const features = computeGlobalFeatures(strokes);

  if (features.totalPoints < 3) return '';

  let result = recognizeDigit(features);
  if (result) return result;

  result = recognizeTwoStrokes(features);
  if (result) return result;

  result = recognizeMultiStrokes(features);
  if (result) return result;

  if (features.numStrokes === 1) {
    const sf = features.strokeFeatures[0];
    if (sf.aspectRatio > 1.3) return '-';
    if (sf.aspectRatio < 0.7) return '|';
    return '/';
  }

  return '?';
}

async function callOnlineAPI(strokes: Stroke[], endpoint: string): Promise<string> {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ strokes })
    });
    if (response.ok) {
      const data = await response.json();
      return data.latex || data.result || '';
    }
  } catch {
    // ignore
  }
  return '';
}

const ctx: Worker = self as unknown as Worker;

ctx.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { type, strokes, useOnline, apiEndpoint } = e.data;
  if (type === 'recognize') {
    if (useOnline && apiEndpoint) {
      const onlineResult = await callOnlineAPI(strokes, apiEndpoint);
      if (onlineResult) {
        const response: WorkerResponse = { type: 'result', latex: onlineResult, source: 'online' };
        ctx.postMessage(response);
        return;
      }
    }

    const delay = 120 + Math.random() * 180;
    setTimeout(() => {
      const latex = classify(strokes);
      const response: WorkerResponse = { type: 'result', latex, source: 'local' };
      ctx.postMessage(response);
    }, delay);
  }
};

export default {} as Worker;
