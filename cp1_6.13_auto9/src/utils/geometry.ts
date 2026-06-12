import type { SnapResult, Point, Rect, Wall, Rotation } from '@/types';

export function getRotatedRect(wall: Wall): Rect {
  if (wall.rotation === 90 || wall.rotation === 270) {
    return {
      x: wall.x,
      y: wall.y,
      width: wall.height,
      height: wall.width,
    };
  }
  return {
    x: wall.x,
    y: wall.y,
    width: wall.width,
    height: wall.height,
  };
}

export function getEdges(rect: Rect): { left: number; right: number; top: number; bottom: number } {
  return {
    left: rect.x,
    right: rect.x + rect.width,
    top: rect.y,
    bottom: rect.y + rect.height,
  };
}

export function snapToWalls(
  currentX: number,
  currentY: number,
  currentWidth: number,
  currentHeight: number,
  walls: Wall[],
  currentId: string,
  threshold: number = 15
): SnapResult {
  const currentEdges = getEdges({ x: currentX, y: currentY, width: currentWidth, height: currentHeight });
  let snappedX = currentX;
  let snappedY = currentY;
  let snapAxis: SnapResult['snapAxis'] = null;
  let minXDist = threshold;
  let minYDist = threshold;

  for (const wall of walls) {
    if (wall.id === currentId) continue;
    const rotated = getRotatedRect(wall);
    const edges = getEdges(rotated);

    const xPairs: [number, number][] = [
      [currentEdges.left, edges.left],
      [currentEdges.left, edges.right],
      [currentEdges.right, edges.left],
      [currentEdges.right, edges.right],
    ];

    for (const [a, b] of xPairs) {
      const dist = Math.abs(a - b);
      if (dist < minXDist) {
        minXDist = dist;
        const diff = b - a;
        snappedX = currentX + diff;
        snapAxis = snapAxis === 'y' ? 'both' : 'x';
      }
    }

    const yPairs: [number, number][] = [
      [currentEdges.top, edges.top],
      [currentEdges.top, edges.bottom],
      [currentEdges.bottom, edges.top],
      [currentEdges.bottom, edges.bottom],
    ];

    for (const [a, b] of yPairs) {
      const dist = Math.abs(a - b);
      if (dist < minYDist) {
        minYDist = dist;
        const diff = b - a;
        snappedY = currentY + diff;
        snapAxis = snapAxis === 'x' ? 'both' : 'y';
      }
    }
  }

  return {
    snapped: snapAxis !== null,
    x: snappedX,
    y: snappedY,
    snapAxis,
  };
}

export function pointInRect(point: Point, rect: Rect): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export function screenToCanvas(
  screenX: number,
  screenY: number,
  canvasRect: DOMRect,
  zoom: number
): Point {
  return {
    x: (screenX - canvasRect.left) / zoom,
    y: (screenY - canvasRect.top) / zoom,
  };
}

export function nextRotation(current: Rotation): Rotation {
  const map: Record<Rotation, Rotation> = {
    0: 90,
    90: 180,
    180: 270,
    270: 0,
  };
  return map[current];
}

export function cmToPx(cm: number): number {
  return cm * 2;
}
