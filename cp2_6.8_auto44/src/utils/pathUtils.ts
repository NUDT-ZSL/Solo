import { parseSVG } from 'svg-path-parser';
import { PathPoint, PathCommandType } from '../types';

export function parsePathData(d: string): PathPoint[] {
  try {
    const commands = parseSVG(d);
    const points: PathPoint[] = [];
    let currentX = 0;
    let currentY = 0;

    for (const cmd of commands) {
      const command = cmd.command as PathCommandType;
      
      if (cmd.relative) {
        switch (command.toLowerCase()) {
          case 'm':
            currentX += (cmd as any).x ?? 0;
            currentY += (cmd as any).y ?? 0;
            break;
          case 'l':
            currentX += (cmd as any).x ?? 0;
            currentY += (cmd as any).y ?? 0;
            break;
          case 'c':
            points.push({
              x: currentX + ((cmd as any).x2 ?? 0),
              y: currentY + ((cmd as any).y2 ?? 0),
              command: 'C',
              x1: currentX + ((cmd as any).x1 ?? 0),
              y1: currentY + ((cmd as any).y1 ?? 0),
              x2: currentX + ((cmd as any).x2 ?? 0),
              y2: currentY + ((cmd as any).y2 ?? 0)
            });
            currentX += (cmd as any).x ?? 0;
            currentY += (cmd as any).y ?? 0;
            points.push({
              x: currentX,
              y: currentY,
              command: 'L'
            });
            continue;
          case 'q':
            points.push({
              x: currentX + ((cmd as any).x ?? 0),
              y: currentY + ((cmd as any).y ?? 0),
              command: 'Q',
              x1: currentX + ((cmd as any).x1 ?? 0),
              y1: currentY + ((cmd as any).y1 ?? 0)
            });
            currentX += (cmd as any).x ?? 0;
            currentY += (cmd as any).y ?? 0;
            continue;
          case 'z':
            if (points.length > 0) {
              const first = points[0];
              points.push({
                x: first.x,
                y: first.y,
                command: 'Z'
              });
              currentX = first.x;
              currentY = first.y;
            }
            continue;
        }
      } else {
        switch (command) {
          case 'M':
            currentX = (cmd as any).x ?? 0;
            currentY = (cmd as any).y ?? 0;
            break;
          case 'L':
            currentX = (cmd as any).x ?? 0;
            currentY = (cmd as any).y ?? 0;
            break;
          case 'C':
            points.push({
              x: (cmd as any).x2 ?? 0,
              y: (cmd as any).y2 ?? 0,
              command: 'C',
              x1: (cmd as any).x1 ?? 0,
              y1: (cmd as any).y1 ?? 0,
              x2: (cmd as any).x2 ?? 0,
              y2: (cmd as any).y2 ?? 0
            });
            currentX = (cmd as any).x ?? 0;
            currentY = (cmd as any).y ?? 0;
            points.push({
              x: currentX,
              y: currentY,
              command: 'L'
            });
            continue;
          case 'Q':
            currentX = (cmd as any).x ?? 0;
            currentY = (cmd as any).y ?? 0;
            points.push({
              x: currentX,
              y: currentY,
              command: 'Q',
              x1: (cmd as any).x1 ?? 0,
              y1: (cmd as any).y1 ?? 0
            });
            continue;
          case 'Z':
            if (points.length > 0) {
              const first = points[0];
              points.push({
                x: first.x,
                y: first.y,
                command: 'Z'
              });
              currentX = first.x;
              currentY = first.y;
            }
            continue;
        }
      }
      
      points.push({
        x: currentX,
        y: currentY,
        command: (cmd.relative ? command.toUpperCase() : command) as PathCommandType
      });
    }

    if (points.length === 0) {
      return [];
    }

    const firstCmd = points[0];
    if (firstCmd.command !== 'M') {
      points.unshift({
        x: firstCmd.x,
        y: firstCmd.y,
        command: 'M'
      });
    }

    return points;
  } catch (e) {
    console.error('Failed to parse path data:', e);
    return [];
  }
}

export function pointsToPathData(points: PathPoint[]): string {
  if (points.length === 0) return '';

  const parts: string[] = [];
  let lastCmd = '';

  for (const point of points) {
    const cmd = point.command;

    switch (cmd) {
      case 'M':
        parts.push(`M ${point.x.toFixed(2)} ${point.y.toFixed(2)}`);
        break;
      case 'L':
        if (lastCmd === 'M') {
          parts.push(`L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`);
        } else {
          parts.push(`${point.x.toFixed(2)} ${point.y.toFixed(2)}`);
        }
        break;
      case 'C':
        parts.push(
          `C ${point.x1?.toFixed(2) ?? point.x} ${point.y1?.toFixed(2) ?? point.y}, ` +
          `${point.x2?.toFixed(2) ?? point.x} ${point.y2?.toFixed(2) ?? point.y}, ` +
          `${point.x.toFixed(2)} ${point.y.toFixed(2)}`
        );
        break;
      case 'Q':
        parts.push(
          `Q ${point.x1?.toFixed(2) ?? point.x} ${point.y1?.toFixed(2) ?? point.y}, ` +
          `${point.x.toFixed(2)} ${point.y.toFixed(2)}`
        );
        break;
      case 'Z':
        parts.push('Z');
        break;
    }

    lastCmd = cmd;
  }

  return parts.join(' ');
}

export function calculatePathLength(points: PathPoint[]): number {
  if (points.length < 2) return 0;

  let length = 0;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];

    if (curr.command === 'C') {
      length += bezierCubicLength(prev.x, prev.y, curr.x1!, curr.y1!, curr.x2!, curr.y2!, curr.x, curr.y);
    } else if (curr.command === 'Q') {
      length += bezierQuadraticLength(prev.x, prev.y, curr.x1!, curr.y1!, curr.x, curr.y);
    } else if (curr.command === 'L' || curr.command === 'Z') {
      length += Math.sqrt((curr.x - prev.x) ** 2 + (curr.y - prev.y) ** 2);
    }
  }

  return length;
}

function bezierLinearLength(x0: number, y0: number, x1: number, y1: number): number {
  return Math.sqrt((x1 - x0) ** 2 + (y1 - y0) ** 2);
}

function bezierQuadraticLength(
  x0: number, y0: number,
  x1: number, y1: number,
  x2: number, y2: number,
  steps: number = 20
): number {
  let length = 0;
  let prevX = x0;
  let prevY = y0;

  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const t2 = t * t;
    const mt = 1 - t;
    const mt2 = mt * mt;
    const x = mt2 * x0 + 2 * mt * t * x1 + t2 * x2;
    const y = mt2 * y0 + 2 * mt * t * y1 + t2 * y2;
    length += bezierLinearLength(prevX, prevY, x, y);
    prevX = x;
    prevY = y;
  }

  return length;
}

function bezierCubicLength(
  x0: number, y0: number,
  x1: number, y1: number,
  x2: number, y2: number,
  x3: number, y3: number,
  steps: number = 30
): number {
  let length = 0;
  let prevX = x0;
  let prevY = y0;

  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const t2 = t * t;
    const t3 = t2 * t;
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    const x = mt3 * x0 + 3 * mt2 * t * x1 + 3 * mt * t2 * x2 + t3 * x3;
    const y = mt3 * y0 + 3 * mt2 * t * y1 + 3 * mt * t2 * y2 + t3 * y3;
    length += bezierLinearLength(prevX, prevY, x, y);
    prevX = x;
    prevY = y;
  }

  return length;
}

export function interpolatePaths(
  source: PathPoint[],
  target: PathPoint[],
  t: number
): PathPoint[] {
  if (source.length !== target.length) {
    return source;
  }

  return source.map((point, i) => {
    const targetPoint = target[i];
    return {
      ...point,
      x: point.x + (targetPoint.x - point.x) * t,
      y: point.y + (targetPoint.y - point.y) * t,
      x1: point.x1 !== undefined && targetPoint.x1 !== undefined
        ? point.x1 + (targetPoint.x1 - point.x1) * t
        : point.x1,
      y1: point.y1 !== undefined && targetPoint.y1 !== undefined
        ? point.y1 + (targetPoint.y1 - point.y1) * t
        : point.y1,
      x2: point.x2 !== undefined && targetPoint.x2 !== undefined
        ? point.x2 + (targetPoint.x2 - point.x2) * t
        : point.x2,
      y2: point.y2 !== undefined && targetPoint.y2 !== undefined
        ? point.y2 + (targetPoint.y2 - point.y2) * t
        : point.y2
    };
  });
}

export function generateSVGString(points: PathPoint[], width: number = 800, height: number = 600): string {
  const pathData = pointsToPathData(points);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <path d="${pathData}" fill="none" stroke="#e94560" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

export function getDefaultPath(): PathPoint[] {
  return parsePathData('M 100 300 C 100 100, 300 100, 400 300 C 500 500, 700 500, 700 300 L 400 450 Z');
}

export function getMorphTargetPath(): PathPoint[] {
  return parsePathData('M 100 300 C 100 500, 300 500, 400 300 C 500 100, 700 100, 700 300 L 400 150 Z');
}
