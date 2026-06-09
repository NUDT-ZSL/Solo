import { ArtParameters, PatternMode } from '../types';

interface CellContext {
  row: number;
  col: number;
  gridSize: number;
  cellSize: number;
  params: ArtParameters;
}

export const generateWavePath = (ctx: CellContext): string => {
  const { row, col, cellSize, params } = ctx;
  const { amplitude, frequency, phase, scale } = params;
  const cx = cellSize / 2;
  const cy = cellSize / 2;
  const r = (cellSize * 0.35 * scale);
  const waveOffset = Math.sin((row + col) * frequency * 0.5 + phase * Math.PI / 180) * (amplitude * 0.01 * cellSize * 0.2);
  
  const points: string[] = [];
  const segments = 48;
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    const wave = Math.sin(t * frequency + phase * Math.PI / 180) * waveOffset;
    const radius = r + wave;
    const x = cx + Math.cos(t) * radius;
    const y = cy + Math.sin(t) * radius;
    points.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`);
  }
  points.push('Z');
  return points.join(' ');
};

export const generateSpiralPath = (ctx: CellContext): string => {
  const { row, col, cellSize, params } = ctx;
  const { amplitude, frequency, phase, scale } = params;
  const cx = cellSize / 2;
  const cy = cellSize / 2;
  const baseR = cellSize * 0.05 * scale;
  const maxR = cellSize * 0.4 * scale;
  const turns = 2.5 + frequency * 0.5;
  const offset = (row + col) * 0.2 + phase * Math.PI / 180;
  const ampFactor = amplitude * 0.01;
  
  const points: string[] = [];
  const segments = 120;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = t * turns * Math.PI * 2 + offset;
    const progress = t * t;
    const r = baseR + (maxR - baseR) * progress;
    const wobble = Math.sin(t * Math.PI * 4 + phase * Math.PI / 180) * ampFactor * cellSize * 0.05;
    const x = cx + Math.cos(angle) * (r + wobble);
    const y = cy + Math.sin(angle) * (r + wobble);
    points.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return points.join(' ');
};

export const generateFractalPaths = (ctx: CellContext): { paths: string[]; circles: { cx: number; cy: number; r: number }[] } => {
  const { row, col, cellSize } = ctx;
  const { amplitude, frequency, phase, scale } = ctx.params;
  const cx = cellSize / 2;
  const cy = cellSize / 2;
  const depth = 3 + Math.floor(frequency * 0.5);
  const angleSpread = 25 + amplitude * 0.3;
  const lengthRatio = 0.65 + scale * 0.05;
  const rotationOffset = ((row * 7 + col * 13 + phase) % 360) * Math.PI / 180;
  
  const paths: string[] = [];
  const circles: { cx: number; cy: number; r: number }[] = [];
  
  const drawBranch = (
    startX: number,
    startY: number,
    angle: number,
    length: number,
    currentDepth: number
  ) => {
    if (currentDepth <= 0 || length < 2) return;
    
    const endX = startX + Math.cos(angle) * length;
    const endY = startY + Math.sin(angle) * length;
    paths.push(`M${startX.toFixed(2)},${startY.toFixed(2)} L${endX.toFixed(2)},${endY.toFixed(2)}`);
    
    if (currentDepth === 1) {
      circles.push({ cx: endX, cy: endY, r: Math.max(1.5, length * 0.1) });
    }
    
    const leftAngle = angle - angleSpread * Math.PI / 180;
    const rightAngle = angle + angleSpread * Math.PI / 180;
    const newLength = length * lengthRatio;
    
    drawBranch(endX, endY, leftAngle, newLength, currentDepth - 1);
    drawBranch(endX, endY, rightAngle, newLength, currentDepth - 1);
  };
  
  const trunkLength = cellSize * 0.28 * scale;
  const trunkAngle = -Math.PI / 2 + rotationOffset * 0.2;
  drawBranch(cx, cy + trunkLength * 0.3, trunkAngle, trunkLength, depth);
  
  return { paths, circles };
};

export const generateCellContent = (
  mode: PatternMode,
  ctx: CellContext
) => {
  switch (mode) {
    case 'wave':
      return { type: 'wave' as const, path: generateWavePath(ctx) };
    case 'spiral':
      return { type: 'spiral' as const, path: generateSpiralPath(ctx) };
    case 'fractal':
      return { type: 'fractal' as const, ...generateFractalPaths(ctx) };
  }
};
