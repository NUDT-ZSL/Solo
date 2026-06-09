export interface Point {
  x: number;
  y: number;
}

export interface PuzzlePiece {
  id: number;
  row: number;
  col: number;
  correctX: number;
  correctY: number;
  currentX: number;
  currentY: number;
  rotation: number;
  targetRotation: number;
  isPlaced: boolean;
  shapePath: Point[];
  sourceX: number;
  sourceY: number;
  pieceWidth: number;
  pieceHeight: number;
  avgColor: string;
  snapProgress: number;
  glowIntensity: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  life: number;
  maxLife: number;
  type: 'match' | 'firework' | 'spark' | 'ring';
  gravity?: number;
  explodeTime?: number;
}

const GRID_SIZE = 3;
const TOTAL_PIECES = GRID_SIZE * GRID_SIZE;
const JIGGLE_AMOUNT = 0.15;

function generateSmoothShape(
  baseX: number,
  baseY: number,
  width: number,
  height: number,
  row: number,
  col: number,
  edgePatterns: Map<string, { tabType: number; seed: number }>
): Point[] {
  const points: Point[] = [];
  const controlSteps = 12;

  const getTabParams = (key: string, isEdge: boolean): { tabType: number; seed: number } => {
    if (edgePatterns.has(key)) {
      return edgePatterns.get(key)!;
    }
    const params = {
      tabType: isEdge ? 0 : (Math.random() > 0.35 ? (Math.random() > 0.5 ? 1 : -1) : 0),
      seed: Math.random()
    };
    edgePatterns.set(key, params);
    return params;
  };

  const getEdgePoints = (
    start: Point,
    end: Point,
    isHorizontal: boolean,
    tabParams: { tabType: number; seed: number }
  ): Point[] => {
    const edgePoints: Point[] = [];
    const { tabType, seed } = tabParams;
    const tabSize = isHorizontal ? height * 0.22 : width * 0.22;
    const rng = (n: number) => {
      const x = Math.sin(seed * 9999 + n * 123.456) * 10000;
      return x - Math.floor(x);
    };

    for (let i = 0; i <= controlSteps; i++) {
      const t = i / controlSteps;
      if (isHorizontal) {
        const x = start.x + (end.x - start.x) * t;
        let y = start.y;

        if (tabType !== 0 && t > 0.25 && t < 0.75) {
          const localT = (t - 0.25) / 0.5;
          const envelope = Math.sin(localT * Math.PI);
          const tabCurve = Math.sin(localT * Math.PI) * envelope;
          y -= tabType * tabSize * tabCurve;

          const wobble = Math.sin(localT * Math.PI * 3 + seed * 10) * tabSize * 0.08;
          y += wobble * envelope;
        }

        const microJitter = (rng(i) - 0.5) * 2;
        y += microJitter * (isHorizontal ? height : width) * JIGGLE_AMOUNT * 0.02;

        edgePoints.push({ x, y });
      } else {
        let x = start.x;
        const y = start.y + (end.y - start.y) * t;

        if (tabType !== 0 && t > 0.25 && t < 0.75) {
          const localT = (t - 0.25) / 0.5;
          const envelope = Math.sin(localT * Math.PI);
          const tabCurve = Math.sin(localT * Math.PI) * envelope;
          x -= tabType * tabSize * tabCurve;

          const wobble = Math.sin(localT * Math.PI * 3 + seed * 10) * tabSize * 0.08;
          x += wobble * envelope;
        }

        const microJitter = (rng(i) - 0.5) * 2;
        x += microJitter * (isHorizontal ? height : width) * JIGGLE_AMOUNT * 0.02;

        edgePoints.push({ x, y });
      }
    }

    return edgePoints;
  };

  const topLeft: Point = { x: baseX, y: baseY };
  const topRight: Point = { x: baseX + width, y: baseY };
  const bottomRight: Point = { x: baseX + width, y: baseY + height };
  const bottomLeft: Point = { x: baseX, y: baseY + height };

  const topParams = getTabParams(`h-${row}-${col}`, row === 0);
  const topEdge = getEdgePoints(topLeft, topRight, true, topParams);

  const rightParams = getTabParams(`v-${row}-${col + 1}`, col === GRID_SIZE - 1);
  const rightEdge = getEdgePoints(topRight, bottomRight, false, rightParams);

  const bottomKey = `h-${row + 1}-${col}`;
  let bottomParams: { tabType: number; seed: number };
  if (edgePatterns.has(bottomKey)) {
    const bp = edgePatterns.get(bottomKey)!;
    bottomParams = { tabType: -bp.tabType, seed: bp.seed };
  } else {
    bottomParams = getTabParams(bottomKey, row === GRID_SIZE - 1);
  }
  const bottomEdge = getEdgePoints(bottomRight, bottomLeft, true, bottomParams).reverse();

  const leftKey = `v-${row}-${col}`;
  let leftParams: { tabType: number; seed: number };
  if (edgePatterns.has(leftKey)) {
    const lp = edgePatterns.get(leftKey)!;
    leftParams = { tabType: -lp.tabType, seed: lp.seed };
  } else {
    leftParams = getTabParams(leftKey, col === 0);
  }
  const leftEdge = getEdgePoints(bottomLeft, topLeft, false, leftParams).reverse();

  points.push(...topEdge);
  points.push(...rightEdge.slice(1));
  points.push(...bottomEdge.slice(1));
  points.push(...leftEdge.slice(1));

  return points;
}

export function extractAverageColor(
  _ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  sourceX: number,
  sourceY: number,
  sourceWidth: number,
  sourceHeight: number
): string {
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d')!;
  const sampleSize = 32;
  tempCanvas.width = sampleSize;
  tempCanvas.height = sampleSize;

  tempCtx.drawImage(
    image,
    sourceX, sourceY, sourceWidth, sourceHeight,
    0, 0, sampleSize, sampleSize
  );

  const imageData = tempCtx.getImageData(0, 0, sampleSize, sampleSize);
  const data = imageData.data;

  let r = 0, g = 0, b = 0, count = 0;
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha > 128) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count++;
    }
  }

  if (count === 0) return '#ffffff';
  r = Math.round(r / count);
  g = Math.round(g / count);
  b = Math.round(b / count);

  return `rgb(${r}, ${g}, ${b})`;
}

function getRandomEdgePosition(
  canvasWidth: number,
  canvasHeight: number,
  pieceWidth: number,
  pieceHeight: number,
  puzzleAreaX: number,
  puzzleAreaY: number,
  puzzleAreaW: number,
  puzzleAreaH: number,
  existingPositions: { x: number; y: number }[],
  index: number
): { x: number; y: number } {
  const margin = 20;
  const padding = pieceWidth * 0.3;
  let attempts = 0;
  const maxAttempts = 100;

  while (attempts < maxAttempts) {
    attempts++;
    let x: number, y: number;
    const side = index % 4;

    switch (side) {
      case 0:
        x = puzzleAreaX - pieceWidth - padding - Math.random() * (puzzleAreaX - margin - pieceWidth);
        y = margin + Math.random() * (canvasHeight - margin * 2 - pieceHeight);
        break;
      case 1:
        x = puzzleAreaX + puzzleAreaW + padding + Math.random() * (canvasWidth - puzzleAreaX - puzzleAreaW - padding - margin - pieceWidth);
        y = margin + Math.random() * (canvasHeight - margin * 2 - pieceHeight);
        break;
      case 2:
        x = margin + Math.random() * (canvasWidth - margin * 2 - pieceWidth);
        y = puzzleAreaY - pieceHeight - padding - Math.random() * (puzzleAreaY - margin - pieceHeight);
        if (y < margin) y = margin + Math.random() * (puzzleAreaY * 0.5);
        break;
      default:
        x = margin + Math.random() * (canvasWidth - margin * 2 - pieceWidth);
        y = puzzleAreaY + puzzleAreaH + padding + Math.random() * (canvasHeight - puzzleAreaY - puzzleAreaH - padding - margin - pieceHeight);
        if (y + pieceHeight > canvasHeight - margin) y = canvasHeight - margin - pieceHeight - Math.random() * (canvasHeight - puzzleAreaY - puzzleAreaH) * 0.5;
        break;
    }

    x = Math.max(margin, Math.min(canvasWidth - pieceWidth - margin, x));
    y = Math.max(margin, Math.min(canvasHeight - pieceHeight - margin, y));

    const centerX = x + pieceWidth / 2;
    const centerY = y + pieceHeight / 2;
    const puzzleCenterX = puzzleAreaX + puzzleAreaW / 2;
    const puzzleCenterY = puzzleAreaY + puzzleAreaH / 2;
    const distToPuzzleCenter = Math.hypot(centerX - puzzleCenterX, centerY - puzzleCenterY);

    let tooClose = false;
    for (const pos of existingPositions) {
      const dist = Math.hypot(
        (x + pieceWidth / 2) - (pos.x + pieceWidth / 2),
        (y + pieceHeight / 2) - (pos.y + pieceHeight / 2)
      );
      if (dist < Math.max(pieceWidth, pieceHeight) * 0.6) {
        tooClose = true;
        break;
      }
    }

    if (!tooClose && distToPuzzleCenter > Math.max(puzzleAreaW, puzzleAreaH) * 0.4) {
      return { x, y };
    }
  }

  const side = index % 4;
  switch (side) {
    case 0: return { x: margin, y: margin + (index * 37) % (canvasHeight - pieceHeight - margin * 2) };
    case 1: return { x: canvasWidth - pieceWidth - margin, y: margin + (index * 53) % (canvasHeight - pieceHeight - margin * 2) };
    case 2: return { x: margin + (index * 41) % (canvasWidth - pieceWidth - margin * 2), y: margin };
    default: return { x: margin + (index * 67) % (canvasWidth - pieceWidth - margin * 2), y: canvasHeight - pieceHeight - margin };
  }
}

export async function generatePuzzlePieces(
  image: HTMLImageElement,
  canvasWidth: number,
  canvasHeight: number,
  puzzleAreaX: number,
  puzzleAreaY: number,
  puzzleAreaW: number,
  puzzleAreaH: number
): Promise<PuzzlePiece[]> {
  const pieces: PuzzlePiece[] = [];
  const edgePatterns = new Map<string, { tabType: number; seed: number }>();

  const pieceWidth = puzzleAreaW / GRID_SIZE;
  const pieceHeight = puzzleAreaH / GRID_SIZE;

  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d')!;

  const positions: { x: number; y: number }[] = [];
  const indices = Array.from({ length: TOTAL_PIECES }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  for (let idx = 0; idx < TOTAL_PIECES; idx++) {
    const i = indices[idx];
    const row = Math.floor(i / GRID_SIZE);
    const col = i % GRID_SIZE;

    const correctX = puzzleAreaX + col * pieceWidth;
    const correctY = puzzleAreaY + row * pieceHeight;

    const shapePath = generateSmoothShape(
      0, 0,
      pieceWidth, pieceHeight,
      row, col,
      edgePatterns
    );

    const randPos = getRandomEdgePosition(
      canvasWidth, canvasHeight,
      pieceWidth, pieceHeight,
      puzzleAreaX, puzzleAreaY, puzzleAreaW, puzzleAreaH,
      positions,
      idx
    );
    positions.push(randPos);

    const sourceX = col * (image.width / GRID_SIZE);
    const sourceY = row * (image.height / GRID_SIZE);
    const sourceW = image.width / GRID_SIZE;
    const sourceH = image.height / GRID_SIZE;

    const avgColor = extractAverageColor(tempCtx, image, sourceX, sourceY, sourceW, sourceH);

    const rotation = (Math.random() - 0.5) * 60 * (Math.PI / 180);

    pieces.push({
      id: i,
      row,
      col,
      correctX,
      correctY,
      currentX: randPos.x,
      currentY: randPos.y,
      rotation,
      targetRotation: rotation,
      isPlaced: false,
      shapePath,
      sourceX,
      sourceY,
      pieceWidth,
      pieceHeight,
      avgColor,
      snapProgress: 0,
      glowIntensity: 0
    });
  }

  pieces.sort((a, b) => a.id - b.id);
  return pieces;
}

export function buildPath(ctx: CanvasRenderingContext2D, points: Point[]): void {
  if (points.length < 2) return;

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx = (prev.x + curr.x) / 2;
    const cpy = (prev.y + curr.y) / 2;
    ctx.quadraticCurveTo(prev.x, prev.y, cpx, cpy);
  }

  const last = points[points.length - 1];
  const first = points[0];
  const cpx = (last.x + first.x) / 2;
  const cpy = (last.y + first.y) / 2;
  ctx.quadraticCurveTo(last.x, last.y, cpx, cpy);
  ctx.closePath();
}

export function createMatchParticles(
  x: number,
  y: number,
  color: string,
  count: number = 40
): Particle[] {
  const particles: Particle[] = [];
  const baseCount = Math.min(count, 50);

  for (let i = 0; i < baseCount; i++) {
    const angle = (Math.PI * 2 * i) / baseCount + Math.random() * 0.5;
    const speed = (15 + Math.random() * 10) * (0.03 + Math.random() * 0.02);
    const life = 1 + Math.random() * 1;

    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed * 60,
      vy: Math.sin(angle) * speed * 60,
      radius: 2 + Math.random() * 2,
      color,
      life,
      maxLife: life,
      type: 'match'
    });
  }

  return particles;
}

export function createFireworkParticles(
  centerX: number,
  centerY: number,
  ringRadius: number
): Particle[] {
  const particles: Particle[] = [];
  const fireworkCount = 80;
  const colors = [
    '#ff6b6b', '#ffd93d', '#ff9f43', '#feca57',
    '#48dbfb', '#0abde3', '#5f27cd', '#341f97',
    '#ff6b9d', '#c8d6e5', '#1dd1a1', '#10ac84'
  ];

  for (let i = 0; i < fireworkCount; i++) {
    const angle = (Math.PI * 2 * i) / fireworkCount + Math.random() * 0.3;
    const launchSpeed = 8 + Math.random() * 6;
    const life = 1.8 + Math.random() * 0.8;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const startX = centerX + Math.cos(angle) * ringRadius * (0.8 + Math.random() * 0.4);
    const startY = centerY + Math.sin(angle) * ringRadius * (0.8 + Math.random() * 0.4);

    particles.push({
      x: startX,
      y: startY,
      vx: Math.cos(angle) * launchSpeed * 0.5 - (startX - centerX) * 0.02,
      vy: -Math.abs(Math.sin(angle) * launchSpeed) * 0.8 - 8,
      radius: 3 + Math.random() * 2,
      color,
      life,
      maxLife: life,
      type: 'firework',
      gravity: 0.15,
      explodeTime: 0.5 + Math.random() * 0.2
    });
  }

  return particles;
}

export function createSparkParticles(
  x: number,
  y: number,
  color: string
): Particle[] {
  const particles: Particle[] = [];
  const count = 12 + Math.floor(Math.random() * 8);

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 4;
    const life = 0.4 + Math.random() * 0.4;

    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1,
      radius: 1 + Math.random() * 1.5,
      color,
      life,
      maxLife: life,
      type: 'spark'
    });
  }

  return particles;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 255, g: 255, b: 255 };
}

export function rgbStringToRgb(rgb: string): { r: number; g: number; b: number } {
  const match = rgb.match(/\d+/g);
  if (match && match.length >= 3) {
    return {
      r: parseInt(match[0]),
      g: parseInt(match[1]),
      b: parseInt(match[2])
    };
  }
  return { r: 255, g: 255, b: 255 };
}
