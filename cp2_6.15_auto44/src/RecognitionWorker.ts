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
}

interface WorkerResponse {
  type: 'result';
  latex: string;
}

function patternMatch(strokes: Stroke[]): string {
  if (strokes.length === 0) return '';

  const allPoints: StrokePoint[] = [];
  strokes.forEach(s => allPoints.push(...s.points));

  if (allPoints.length < 3) return '';

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  allPoints.forEach(p => {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  });

  const width = maxX - minX;
  const height = maxY - minY;
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  const strokeCount = strokes.length;
  const aspectRatio = height > 0 ? width / height : 1;

  if (strokeCount === 1) {
    const firstStroke = strokes[0].points;
    const startPoint = firstStroke[0];
    const endPoint = firstStroke[firstStroke.length - 1];
    const dx = endPoint.x - startPoint.x;
    const dy = endPoint.y - startPoint.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 50 && Math.abs(dy) < dist * 0.2) {
      return '-';
    }

    if (aspectRatio > 1.5 && height < width * 0.4) {
      return '-';
    }

    if (aspectRatio < 0.7 && width > 0) {
      let crossCount = 0;
      for (let i = 1; i < firstStroke.length; i++) {
        if (firstStroke[i].x < centerX && firstStroke[i - 1].x >= centerX) crossCount++;
        if (firstStroke[i].x > centerX && firstStroke[i - 1].x <= centerX) crossCount++;
      }
      if (crossCount >= 2) return 'x';
      return '|';
    }

    let totalAngleChange = 0;
    for (let i = 2; i < firstStroke.length; i++) {
      const v1x = firstStroke[i - 1].x - firstStroke[i - 2].x;
      const v1y = firstStroke[i - 1].y - firstStroke[i - 2].y;
      const v2x = firstStroke[i].x - firstStroke[i - 1].x;
      const v2y = firstStroke[i].y - firstStroke[i - 1].y;
      const cross = v1x * v2y - v1y * v2x;
      const dot = v1x * v2x + v1y * v2y;
      totalAngleChange += Math.atan2(Math.abs(cross), dot);
    }

    if (totalAngleChange > Math.PI * 1.2) {
      if (startPoint.y < endPoint.y - 10) return '6';
      if (startPoint.y > endPoint.y + 10) return '9';
      return '0';
    }
    if (totalAngleChange > Math.PI * 0.5) {
      return 'c';
    }
  }

  if (strokeCount === 2) {
    const s1 = strokes[0].points;
    const s2 = strokes[1].points;

    const s1horiz = s1.length > 2 && Math.abs(s1[s1.length - 1].y - s1[0].y) < 30;
    const s2horiz = s2.length > 2 && Math.abs(s2[s2.length - 1].y - s2[0].y) < 30;

    if (s1horiz && s2horiz) {
      const gap = Math.abs(s1[0].y - s2[0].y);
      if (gap > 20) return '=';
    }

    const s1vert = s1.length > 2 && Math.abs(s1[s1.length - 1].x - s1[0].x) < 20;
    if (s1horiz && s2vert) return 'T';
    if (s1vert && s2horiz) {
      const crossY = Math.abs(s2[0].y - s1[0].y);
      if (crossY > 10) return '+';
      return '7';
    }

    const s1Start = s1[0], s1End = s1[s1.length - 1];
    const s2Start = s2[0], s2End = s2[s2.length - 1];
    const allX = [s1Start.x, s1End.x, s2Start.x, s2End.x];
    const allY = [s1Start.y, s1End.y, s2Start.y, s2End.y];
    const cx = (Math.min(...allX) + Math.max(...allX)) / 2;
    const cy = (Math.min(...allY) + Math.max(...allY)) / 2;
    const nearCenter = (p: StrokePoint) => Math.abs(p.x - cx) < 30 && Math.abs(p.y - cy) < 30;
    if ((nearCenter(s1Start) || nearCenter(s1End)) && (nearCenter(s2Start) || nearCenter(s2End))) {
      return 'x';
    }

    return 'x';
  }

  if (strokeCount === 3) {
    const hasHorizontal = strokes.some(s => {
      if (s.points.length < 2) return false;
      return Math.abs(s.points[s.points.length - 1].y - s.points[0].y) < 25;
    });
    if (hasHorizontal) return '\\div';
  }

  if (strokeCount >= 3) {
    return '\\sum';
  }

  return '?';
}

function simulateRecognition(strokes: Stroke[]): string {
  if (strokes.length === 0) return '';
  return patternMatch(strokes);
}

const ctx: Worker = self as unknown as Worker;

ctx.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const { type, strokes } = e.data;
  if (type === 'recognize') {
    const delay = 150 + Math.random() * 250;
    setTimeout(() => {
      const latex = simulateRecognition(strokes);
      const response: WorkerResponse = { type: 'result', latex };
      ctx.postMessage(response);
    }, delay);
  }
};

export default {} as Worker;
