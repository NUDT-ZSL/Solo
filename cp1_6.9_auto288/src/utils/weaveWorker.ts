import type {
  GridNode,
  WeaveSegment,
  WorkerAction,
  WorkerResult,
  GRID_ROWS,
  GRID_COLS,
  MAX_DRAG_DISTANCE,
  SEGMENT_THICKNESS
} from './types';

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360;
  s /= 100;
  l /= 100;
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function parseHsl(hsl: string): { h: number; s: number; l: number } | null {
  const m = hsl.match(/hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)/);
  if (!m) return null;
  return { h: parseFloat(m[1]), s: parseFloat(m[2]), l: parseFloat(m[3]) };
}

function lerpHsl(color1: string, color2: string, t: number): string {
  const c1 = parseHsl(color1);
  const c2 = parseHsl(color2);
  if (!c1 || !c2) return color1;
  const h = c1.h + (c2.h - c1.h) * t;
  const s = c1.s + (c2.s - c1.s) * t;
  const l = c1.l + (c2.l - c1.l) * t;
  return `hsl(${h}, ${s}%, ${l}%)`;
}

function nodeIndex(row: number, col: number, cols: number): number {
  return row * cols + col;
}

function getNode(nodes: GridNode[], row: number, col: number, rows: number, cols: number): GridNode | null {
  if (row < 0 || row >= rows || col < 0 || col >= cols) return null;
  return nodes[nodeIndex(row, col, cols)];
}

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function segmentExists(segments: WeaveSegment[], r1: number, c1: number, r2: number, c2: number): boolean {
  return segments.some(s =>
    (s.startRow === r1 && s.startCol === c1 && s.endRow === r2 && s.endCol === c2) ||
    (s.startRow === r2 && s.startCol === c2 && s.endRow === r1 && s.endCol === c1)
  );
}

function bresenhamLine(r0: number, c0: number, r1: number, c1: number): Array<{ row: number; col: number }> {
  const points: Array<{ row: number; col: number }> = [];
  let dr = Math.abs(r1 - r0);
  let dc = Math.abs(c1 - c0);
  let sr = r0 < r1 ? 1 : -1;
  let sc = c0 < c1 ? 1 : -1;
  let err = dr - dc;
  let r = r0;
  let c = c0;
  while (true) {
    points.push({ row: r, col: c });
    if (r === r1 && c === c1) break;
    const e2 = 2 * err;
    if (e2 > -dc) {
      err -= dc;
      r += sr;
    }
    if (e2 < dr) {
      err += dr;
      c += sc;
    }
  }
  return points;
}

function handleColorNode(
  row: number,
  col: number,
  color: string,
  nodes: GridNode[],
  segments: WeaveSegment[],
  rows: number,
  cols: number
): WorkerResult {
  const newNodes = nodes.map(n => ({ ...n }));
  const newSegments = segments.map(s => ({ ...s }));

  const targetIdx = nodeIndex(row, col, cols);
  if (newNodes[targetIdx].locked) {
    return { nodes: newNodes, segments: newSegments };
  }

  newNodes[targetIdx].color = color;
  newNodes[targetIdx].colorOpacity = 1;

  const neighbors: Array<[number, number]> = [
    [row - 1, col],
    [row + 1, col],
    [row, col - 1],
    [row, col + 1]
  ];

  for (const [nr, nc] of neighbors) {
    const nb = getNode(newNodes, nr, nc, rows, cols);
    if (nb && nb.color && !segmentExists(newSegments, row, col, nr, nc)) {
      newSegments.push({
        id: genId(),
        startRow: row,
        startCol: col,
        endRow: nr,
        endCol: nc,
        startColor: color,
        endColor: nb.color,
        thickness: SEGMENT_THICKNESS
      });
    }
  }

  return { nodes: newNodes, segments: newSegments };
}

function handleDragSegment(
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number,
  nodes: GridNode[],
  segments: WeaveSegment[],
  rows: number,
  cols: number,
  maxDist: number
): WorkerResult {
  const newNodes = nodes.map(n => ({ ...n }));
  const newSegments = segments.map(s => ({ ...s }));

  const dist = Math.abs(endRow - startRow) + Math.abs(endCol - startCol);
  if (dist === 0 || dist > maxDist) {
    return { nodes: newNodes, segments: newSegments };
  }

  const startIdx = nodeIndex(startRow, startCol, cols);
  const endIdx = nodeIndex(endRow, endCol, cols);
  if (newNodes[startIdx].locked || newNodes[endIdx].locked) {
    return { nodes: newNodes, segments: newSegments };
  }

  const startColor = newNodes[startIdx].color;
  if (!startColor) {
    return { nodes: newNodes, segments: newSegments };
  }

  if (!newNodes[endIdx].color) {
    newNodes[endIdx].color = startColor;
    newNodes[endIdx].colorOpacity = 1;
  }
  const endColor = newNodes[endIdx].color;

  if (!segmentExists(newSegments, startRow, startCol, endRow, endCol)) {
    newSegments.push({
      id: genId(),
      startRow,
      startCol,
      endRow,
      endCol,
      startColor,
      endColor,
      thickness: SEGMENT_THICKNESS
    });
  }

  const points = bresenhamLine(startRow, startCol, endRow, endCol);
  for (const p of points) {
    if ((p.row === startRow && p.col === startCol) || (p.row === endRow && p.col === endCol)) continue;
    const idx = nodeIndex(p.row, p.col, cols);
    if (newNodes[idx].locked) continue;
    if (!newNodes[idx].color) {
      newNodes[idx].color = startColor;
      newNodes[idx].colorOpacity = 0.6;
    }
  }

  const endpoints: Array<[number, number]> = [[startRow, startCol], [endRow, endCol]];
  for (const [er, ec] of endpoints) {
    const nbList: Array<[number, number]> = [
      [er - 1, ec],
      [er + 1, ec],
      [er, ec - 1],
      [er, ec + 1]
    ];
    for (const [nr, nc] of nbList) {
      const nb = getNode(newNodes, nr, nc, rows, cols);
      if (nb && nb.color && !segmentExists(newSegments, er, ec, nr, nc)) {
        const eColor = newNodes[nodeIndex(er, ec, cols)].color!;
        newSegments.push({
          id: genId(),
          startRow: er,
          startCol: ec,
          endRow: nr,
          endCol: nc,
          startColor: eColor,
          endColor: nb.color,
          thickness: SEGMENT_THICKNESS
        });
      }
    }
  }

  return { nodes: newNodes, segments: newSegments };
}

self.onmessage = (e: MessageEvent<WorkerAction & { rows: number; cols: number; maxDist: number; thickness: number }>) => {
  const action = e.data;
  const rows = action.rows;
  const cols = action.cols;

  let result: WorkerResult;
  if (action.type === 'colorNode') {
    result = handleColorNode(action.row, action.col, action.color, action.nodes, action.segments, rows, cols);
  } else {
    result = handleDragSegment(
      action.startRow,
      action.startCol,
      action.endRow,
      action.endCol,
      action.nodes,
      action.segments,
      rows,
      cols,
      action.maxDist
    );
  }
  (self as unknown as Worker).postMessage(result);
};

export {};
