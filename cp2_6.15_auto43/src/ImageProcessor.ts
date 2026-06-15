/// <reference lib="webworker" />

import GIF from 'gif.js';

export interface FaceRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  leftEye: { x: number; y: number; width: number; height: number };
  rightEye: { x: number; y: number; width: number; height: number };
  leftBrow: { x: number; y: number; width: number; height: number };
  rightBrow: { x: number; y: number; width: number; height: number };
  nose: { x: number; y: number; width: number; height: number };
  mouth: { x: number; y: number; width: number; height: number };
}

export type EmotionType = 'happy' | 'surprised' | 'sad' | 'angry' | 'funny';

export interface TransformParams {
  intensity?: number;
  glassesColor?: string;
}

export interface WorkerMessage {
  type: 'crop' | 'transform' | 'exportGIF' | 'exportPNG';
  imageData?: ImageData;
  width?: number;
  height?: number;
  emotion?: EmotionType;
  params?: TransformParams;
  frames?: ImageData[];
}

export interface WorkerResponse {
  type: 'cropComplete' | 'transformComplete' | 'gifComplete' | 'pngComplete' | 'error' | 'progress';
  imageData?: ImageData;
  blob?: Blob;
  error?: string;
  progress?: number;
  faceRegion?: FaceRegion;
}

const ctx: Worker = self as unknown as Worker;

const offscreenCanvas = new OffscreenCanvas(200, 200);
const offscreenCtx = offscreenCanvas.getContext('2d', { willReadFrequently: true })!;

function rgbToYCrCb(r: number, g: number, b: number): { y: number; cr: number; cb: number } {
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  const cr = (r - y) * 0.713 + 128;
  const cb = (b - y) * 0.564 + 128;
  return { y, cr, cb };
}

function isSkinPixel(r: number, g: number, b: number): boolean {
  const { cr, cb } = rgbToYCrCb(r, g, b);
  return cr >= 133 && cr <= 173 && cb >= 77 && cb <= 127;
}

interface Point {
  x: number;
  y: number;
}

function findLargestConnectedRegion(skinMask: boolean[][], width: number, height: number): { points: Point[]; bbox: { x: number; y: number; width: number; height: number } } | null {
  const visited = Array.from({ length: height }, () => Array(width).fill(false));
  let largestRegion: Point[] = [];

  const directions = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1], [0, 1],
    [1, -1], [1, 0], [1, 1]
  ];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (skinMask[y][x] && !visited[y][x]) {
        const queue: Point[] = [{ x, y }];
        const region: Point[] = [];
        visited[y][x] = true;

        while (queue.length > 0) {
          const current = queue.shift()!;
          region.push(current);

          for (const [dy, dx] of directions) {
            const ny = current.y + dy;
            const nx = current.x + dx;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height && skinMask[ny][nx] && !visited[ny][nx]) {
              visited[ny][nx] = true;
              queue.push({ x: nx, y: ny });
            }
          }
        }

        if (region.length > largestRegion.length) {
          largestRegion = region;
        }
      }
    }
  }

  if (largestRegion.length < 50) return null;

  let minX = width, minY = height, maxX = 0, maxY = 0;
  for (const p of largestRegion) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }

  return {
    points: largestRegion,
    bbox: {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1
    }
  };
}

function detectFace(imageData: ImageData): FaceRegion | null {
  const { data, width, height } = imageData;
  const skinMask: boolean[][] = Array.from({ length: height }, () => Array(width).fill(false));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      skinMask[y][x] = isSkinPixel(data[i], data[i + 1], data[i + 2]);
    }
  }

  const result = findLargestConnectedRegion(skinMask, width, height);
  if (!result) return null;

  const { bbox } = result;

  const faceWidth = bbox.width;
  const faceHeight = bbox.height;
  const faceX = bbox.x;
  const faceY = bbox.y;

  const eyeY = faceY + faceHeight * 0.35;
  const eyeHeight = faceHeight * 0.12;
  const eyeWidth = faceWidth * 0.22;
  const eyeYOffset = faceHeight * 0.05;

  const browY = eyeY - eyeHeight * 0.8;
  const browHeight = faceHeight * 0.06;
  const browWidth = faceWidth * 0.25;

  return {
    x: faceX,
    y: faceY,
    width: faceWidth,
    height: faceHeight,
    leftEye: {
      x: faceX + faceWidth * 0.15,
      y: eyeY - eyeHeight / 2 + eyeYOffset,
      width: eyeWidth,
      height: eyeHeight
    },
    rightEye: {
      x: faceX + faceWidth * 0.63,
      y: eyeY - eyeHeight / 2 + eyeYOffset,
      width: eyeWidth,
      height: eyeHeight
    },
    leftBrow: {
      x: faceX + faceWidth * 0.12,
      y: browY,
      width: browWidth,
      height: browHeight
    },
    rightBrow: {
      x: faceX + faceWidth * 0.63,
      y: browY,
      width: browWidth,
      height: browHeight
    },
    nose: {
      x: faceX + faceWidth * 0.4,
      y: faceY + faceHeight * 0.45,
      width: faceWidth * 0.2,
      height: faceHeight * 0.25
    },
    mouth: {
      x: faceX + faceWidth * 0.25,
      y: faceY + faceHeight * 0.7,
      width: faceWidth * 0.5,
      height: faceHeight * 0.15
    }
  };
}

function cropImage(imageData: ImageData, faceRegion: FaceRegion | null, targetSize: number = 200): ImageData {
  const { width, height } = imageData;
  let cropX: number, cropY: number, cropSize: number;

  if (faceRegion) {
    const centerX = faceRegion.x + faceRegion.width / 2;
    const centerY = faceRegion.y + faceRegion.height / 2;
    cropSize = Math.max(faceRegion.width, faceRegion.height) * 1.4;
    cropX = centerX - cropSize / 2;
    cropY = centerY - cropSize / 2;
  } else {
    cropSize = Math.min(width, height);
    cropX = (width - cropSize) / 2;
    cropY = (height - cropSize) / 2;
  }

  cropX = Math.max(0, Math.min(cropX, width - cropSize));
  cropY = Math.max(0, Math.min(cropY, height - cropSize));
  cropSize = Math.min(cropSize, width - cropX, height - cropY);

  const sourceCanvas = new OffscreenCanvas(width, height);
  const sourceCtx = sourceCanvas.getContext('2d')!;
  sourceCtx.putImageData(imageData, 0, 0);

  offscreenCanvas.width = targetSize;
  offscreenCanvas.height = targetSize;
  offscreenCtx.clearRect(0, 0, targetSize, targetSize);
  offscreenCtx.drawImage(
    sourceCanvas,
    cropX, cropY, cropSize, cropSize,
    0, 0, targetSize, targetSize
  );

  return offscreenCtx.getImageData(0, 0, targetSize, targetSize);
}

function cubicBezier(t: number, p1: number, p2: number, p3: number, p4: number): number {
  const mt = 1 - t;
  return mt * mt * mt * p1 + 3 * mt * mt * t * p2 + 3 * mt * t * t * p3 + t * t * t * p4;
}

function easeInOutCubic(t: number): number {
  return cubicBezier(t, 0, 0.25, 0.25, 1);
}

function createGrid(faceRegion: FaceRegion, cols: number = 10, rows: number = 10): { x: number; y: number }[][] {
  const grid: { x: number; y: number }[][] = [];
  const startX = faceRegion.x;
  const startY = faceRegion.y;
  const stepX = faceRegion.width / (cols - 1);
  const stepY = faceRegion.height / (rows - 1);

  for (let row = 0; row < rows; row++) {
    grid[row] = [];
    for (let col = 0; col < cols; col++) {
      grid[row][col] = {
        x: startX + col * stepX,
        y: startY + row * stepY
      };
    }
  }
  return grid;
}

function transformGrid(
  grid: { x: number; y: number }[][],
  faceRegion: FaceRegion,
  emotion: EmotionType,
  params: TransformParams,
  progress: number
): { x: number; y: number }[][] {
  const intensity = (params.intensity ?? 1) * progress;
  const transformed = grid.map(row => row.map(p => ({ ...p })));
  const rows = grid.length;
  const cols = grid[0].length;

  const centerCol = (cols - 1) / 2;
  const eyeRow = Math.floor(rows * 0.35);
  const browRow = Math.floor(rows * 0.25);
  const mouthRow = Math.floor(rows * 0.75);

  switch (emotion) {
    case 'happy': {
      const mouthUp = faceRegion.height * 0.2 * intensity;
      for (let col = 0; col < cols; col++) {
        if (col >= Math.floor(cols * 0.25) && col <= Math.floor(cols * 0.75)) {
          const t = (col - cols * 0.25) / (cols * 0.5);
          const curve = Math.sin(t * Math.PI) * mouthUp;
          for (let row = mouthRow; row < rows; row++) {
            const rowFactor = 1 - (row - mouthRow) / (rows - mouthRow);
            transformed[row][col].y -= curve * rowFactor;
          }
        }
      }
      const eyeSquint = intensity * 0.15;
      for (let col = 0; col < cols; col++) {
        const distFromCenter = Math.abs(col - centerCol) / (cols / 2);
        if (distFromCenter > 0.2 && distFromCenter < 0.8) {
          const factor = 1 - Math.abs(distFromCenter - 0.5) * 2;
          transformed[eyeRow][col].y += faceRegion.height * eyeSquint * factor;
          transformed[eyeRow - 1][col].y -= faceRegion.height * eyeSquint * factor * 0.5;
        }
      }
      break;
    }
    case 'surprised': {
      const browUp = faceRegion.height * 0.25 * intensity;
      for (let row = 0; row <= browRow + 2; row++) {
        for (let col = 0; col < cols; col++) {
          const distFromBrow = (browRow + 2 - row) / (browRow + 3);
          transformed[row][col].y -= browUp * distFromBrow;
        }
      }
      const mouthOpen = faceRegion.height * 0.3 * intensity;
      for (let row = mouthRow; row < rows; row++) {
        for (let col = Math.floor(cols * 0.3); col <= Math.floor(cols * 0.7); col++) {
          const colFactor = 1 - Math.abs(col - centerCol) / (cols * 0.4);
          if (colFactor > 0) {
            const rowFactor = (row - mouthRow) / (rows - mouthRow);
            transformed[row][col].y += mouthOpen * colFactor * rowFactor;
            transformed[row][col].x += (col - centerCol) * faceRegion.width * 0.002 * intensity * colFactor;
          }
        }
      }
      break;
    }
    case 'sad': {
      const mouthDown = faceRegion.height * 0.15 * intensity;
      for (let col = 0; col < cols; col++) {
        if (col >= Math.floor(cols * 0.2) && col <= Math.floor(cols * 0.8)) {
          const t = (col - cols * 0.2) / (cols * 0.6);
          const curve = Math.sin(t * Math.PI + Math.PI) * mouthDown;
          for (let row = mouthRow; row < rows; row++) {
            const rowFactor = 1 - (row - mouthRow) / (rows - mouthRow);
            transformed[row][col].y -= curve * rowFactor;
          }
        }
      }
      const eyeClose = intensity * 0.12;
      for (let col = 0; col < cols; col++) {
        const distFromCenter = Math.abs(col - centerCol) / (cols / 2);
        if (distFromCenter > 0.2 && distFromCenter < 0.8) {
          const factor = 1 - Math.abs(distFromCenter - 0.5) * 2;
          transformed[eyeRow][col].y += faceRegion.height * eyeClose * factor;
        }
      }
      const innerBrowUp = faceRegion.height * 0.1 * intensity;
      for (let col = Math.floor(cols * 0.35); col <= Math.floor(cols * 0.65); col++) {
        const factor = 1 - Math.abs(col - centerCol) / (cols * 0.3);
        if (factor > 0) {
          for (let row = 0; row <= browRow; row++) {
            transformed[row][col].y -= innerBrowUp * factor;
          }
        }
      }
      break;
    }
    case 'angry': {
      const browDown = faceRegion.height * 0.2 * intensity;
      for (let row = 0; row <= browRow + 2; row++) {
        for (let col = 0; col < cols; col++) {
          const isInner = col >= Math.floor(cols * 0.35) && col <= Math.floor(cols * 0.65);
          const factor = isInner ? 1.5 : 0.8;
          const distFromBrow = (browRow + 2 - row) / (browRow + 3);
          transformed[row][col].y += browDown * factor * distFromBrow;
          if (isInner) {
            transformed[row][col].x += (col < centerCol ? -1 : 1) * faceRegion.width * 0.02 * intensity * distFromBrow;
          }
        }
      }
      const mouthTighten = faceRegion.width * 0.15 * intensity;
      for (let row = mouthRow; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          if (col < Math.floor(cols * 0.3)) {
            transformed[row][col].x += mouthTighten * (1 - col / (cols * 0.3));
          } else if (col > Math.floor(cols * 0.7)) {
            transformed[row][col].x -= mouthTighten * ((col - cols * 0.7) / (cols * 0.3));
          }
        }
      }
      break;
    }
    case 'funny':
      break;
  }

  return transformed;
}

function applyGridWarp(
  imageData: ImageData,
  originalGrid: { x: number; y: number }[][],
  transformedGrid: { x: number; y: number }[][]
): ImageData {
  const { width, height, data } = imageData;
  const result = new ImageData(width, height);
  const resultData = result.data;

  for (let i = 0; i < data.length; i++) {
    resultData[i] = data[i];
  }

  const rows = originalGrid.length;
  const cols = originalGrid[0].length;

  for (let row = 0; row < rows - 1; row++) {
    for (let col = 0; col < cols - 1; col++) {
      const srcQuad = [
        originalGrid[row][col],
        originalGrid[row][col + 1],
        originalGrid[row + 1][col + 1],
        originalGrid[row + 1][col]
      ];
      const dstQuad = [
        transformedGrid[row][col],
        transformedGrid[row][col + 1],
        transformedGrid[row + 1][col + 1],
        transformedGrid[row + 1][col]
      ];
      warpQuadrilateral(imageData, result, srcQuad, dstQuad);
    }
  }

  return result;
}

function warpQuadrilateral(
  srcImage: ImageData,
  dstImage: ImageData,
  srcQuad: { x: number; y: number }[],
  dstQuad: { x: number; y: number }[]
) {
  const { width, height, data: srcData } = srcImage;
  const dstData = dstImage.data;

  let minX = Math.floor(Math.min(...dstQuad.map(p => p.x)));
  let maxX = Math.ceil(Math.max(...dstQuad.map(p => p.x)));
  let minY = Math.floor(Math.min(...dstQuad.map(p => p.y)));
  let maxY = Math.ceil(Math.max(...dstQuad.map(p => p.y)));

  minX = Math.max(0, minX);
  maxX = Math.min(width - 1, maxX);
  minY = Math.max(0, minY);
  maxY = Math.min(height - 1, maxY);

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const bary = getBarycentricCoordinates(dstQuad[0], dstQuad[1], dstQuad[2], { x, y });
      if (bary && bary.u >= 0 && bary.v >= 0 && bary.u + bary.v <= 1) {
        const srcX = srcQuad[0].x + bary.u * (srcQuad[1].x - srcQuad[0].x) + bary.v * (srcQuad[2].x - srcQuad[0].x);
        const srcY = srcQuad[0].y + bary.u * (srcQuad[1].y - srcQuad[0].y) + bary.v * (srcQuad[2].y - srcQuad[0].y);
        sampleAndSet(srcData, dstData, width, height, srcX, srcY, x, y);
        continue;
      }

      const bary2 = getBarycentricCoordinates(dstQuad[0], dstQuad[2], dstQuad[3], { x, y });
      if (bary2 && bary2.u >= 0 && bary2.v >= 0 && bary2.u + bary2.v <= 1) {
        const srcX = srcQuad[0].x + bary2.u * (srcQuad[2].x - srcQuad[0].x) + bary2.v * (srcQuad[3].x - srcQuad[0].x);
        const srcY = srcQuad[0].y + bary2.u * (srcQuad[2].y - srcQuad[0].y) + bary2.v * (srcQuad[3].y - srcQuad[0].y);
        sampleAndSet(srcData, dstData, width, height, srcX, srcY, x, y);
      }
    }
  }
}

function getBarycentricCoordinates(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number },
  p: { x: number; y: number }
): { u: number; v: number } | null {
  const v0x = b.x - a.x, v0y = b.y - a.y;
  const v1x = c.x - a.x, v1y = c.y - a.y;
  const v2x = p.x - a.x, v2y = p.y - a.y;

  const denom = v0x * v1y - v1x * v0y;
  if (Math.abs(denom) < 0.0001) return null;

  const u = (v2x * v1y - v1x * v2y) / denom;
  const v = (v0x * v2y - v2x * v0y) / denom;

  return { u, v };
}

function sampleAndSet(
  srcData: Uint8ClampedArray,
  dstData: Uint8ClampedArray,
  width: number,
  height: number,
  srcX: number,
  srcY: number,
  dstX: number,
  dstY: number
) {
  if (srcX < 0 || srcX >= width - 1 || srcY < 0 || srcY >= height - 1) return;

  const x0 = Math.floor(srcX);
  const y0 = Math.floor(srcY);
  const x1 = x0 + 1;
  const y1 = y0 + 1;
  const fx = srcX - x0;
  const fy = srcY - y0;

  const i00 = (y0 * width + x0) * 4;
  const i10 = (y0 * width + x1) * 4;
  const i01 = (y1 * width + x0) * 4;
  const i11 = (y1 * width + x1) * 4;

  const dstIdx = (dstY * width + dstX) * 4;

  for (let c = 0; c < 4; c++) {
    const v00 = srcData[i00 + c];
    const v10 = srcData[i10 + c];
    const v01 = srcData[i01 + c];
    const v11 = srcData[i11 + c];

    const top = v00 * (1 - fx) + v10 * fx;
    const bottom = v01 * (1 - fx) + v11 * fx;
    dstData[dstIdx + c] = Math.round(top * (1 - fy) + bottom * fy);
  }
}

function drawGlasses(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, faceRegion: FaceRegion, color: string, intensity: number) {
  const { leftEye, rightEye } = faceRegion;
  const rotation = (15 * Math.PI / 180) * intensity;

  ctx.save();

  const cx = (leftEye.x + leftEye.width / 2 + rightEye.x + rightEye.width / 2) / 2;
  const cy = (leftEye.y + leftEye.height / 2 + rightEye.y + rightEye.height / 2) / 2;
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  ctx.translate(-cx, -cy);

  const lensRadius = Math.max(leftEye.width, rightEye.width) * 0.6;
  const bridgeWidth = Math.abs(rightEye.x - leftEye.x - leftEye.width) * 0.8;
  const bridgeY = cy;

  ctx.strokeStyle = color;
  ctx.lineWidth = 3 * intensity;
  ctx.fillStyle = `${color}40`;

  ctx.beginPath();
  ctx.arc(leftEye.x + leftEye.width / 2, leftEye.y + leftEye.height / 2, lensRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(rightEye.x + rightEye.width / 2, rightEye.y + rightEye.height / 2, lensRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(leftEye.x + leftEye.width / 2 + lensRadius, bridgeY);
  ctx.lineTo(rightEye.x + rightEye.width / 2 - lensRadius, bridgeY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(leftEye.x + leftEye.width / 2 - lensRadius, leftEye.y + leftEye.height / 2);
  ctx.lineTo(leftEye.x + leftEye.width / 2 - lensRadius - 20 * intensity, leftEye.y + leftEye.height / 2 - 5 * intensity);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(rightEye.x + rightEye.width / 2 + lensRadius, rightEye.y + rightEye.height / 2);
  ctx.lineTo(rightEye.x + rightEye.width / 2 + lensRadius + 20 * intensity, rightEye.y + rightEye.height / 2 - 5 * intensity);
  ctx.stroke();

  ctx.restore();
}

function drawBlush(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, faceRegion: FaceRegion, intensity: number) {
  const { leftEye, rightEye, mouth } = faceRegion;

  const blushY = (leftEye.y + leftEye.height + mouth.y) / 2;
  const blushRadius = faceRegion.width * 0.12;

  const gradient1 = ctx.createRadialGradient(
    leftEye.x + leftEye.width * 0.3, blushY, 0,
    leftEye.x + leftEye.width * 0.3, blushY, blushRadius
  );
  gradient1.addColorStop(0, `rgba(255, 100, 100, ${0.5 * intensity})`);
  gradient1.addColorStop(1, 'rgba(255, 100, 100, 0)');

  ctx.fillStyle = gradient1;
  ctx.beginPath();
  ctx.arc(leftEye.x + leftEye.width * 0.3, blushY, blushRadius, 0, Math.PI * 2);
  ctx.fill();

  const gradient2 = ctx.createRadialGradient(
    rightEye.x + rightEye.width * 0.7, blushY, 0,
    rightEye.x + rightEye.width * 0.7, blushY, blushRadius
  );
  gradient2.addColorStop(0, `rgba(255, 100, 100, ${0.5 * intensity})`);
  gradient2.addColorStop(1, 'rgba(255, 100, 100, 0)');

  ctx.fillStyle = gradient2;
  ctx.beginPath();
  ctx.arc(rightEye.x + rightEye.width * 0.7, blushY, blushRadius, 0, Math.PI * 2);
  ctx.fill();
}

function transformImage(
  imageData: ImageData,
  emotion: EmotionType,
  params: TransformParams = {},
  progress: number = 1
): { imageData: ImageData; faceRegion: FaceRegion | null } {
  const faceRegion = detectFace(imageData);

  if (!faceRegion) {
    return { imageData, faceRegion: null };
  }

  const originalGrid = createGrid(faceRegion);
  const transformedGrid = transformGrid(originalGrid, faceRegion, emotion, params, progress);

  let result = applyGridWarp(imageData, originalGrid, transformedGrid);

  if (emotion === 'funny') {
    const tempCanvas = new OffscreenCanvas(imageData.width, imageData.height);
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.putImageData(result, 0, 0);

    const color = params.glassesColor || `hsl(${Math.random() * 360}, 70%, 50%)`;
    drawGlasses(tempCtx, faceRegion, color, progress);
    drawBlush(tempCtx, faceRegion, progress);

    result = tempCtx.getImageData(0, 0, imageData.width, imageData.height);
  }

  return { imageData: result, faceRegion };
}

function generateAnimationFrames(
  imageData: ImageData,
  emotion: EmotionType,
  params: TransformParams = {},
  duration: number = 0.4,
  fps: number = 8
): ImageData[] {
  const frameCount = Math.ceil(duration * fps);
  const frames: ImageData[] = [];

  for (let i = 0; i <= frameCount; i++) {
    const t = i / frameCount;
    const easedT = easeInOutCubic(t);
    const { imageData: transformed } = transformImage(imageData, emotion, params, easedT);
    frames.push(transformed);
  }

  return frames;
}

async function exportGIF(frames: ImageData[]): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const gif = new GIF({
      workers: 2,
      quality: 10,
      width: 200,
      height: 200,
      repeat: 3,
      workerScript: '/gif.worker.js'
    });

    const displayFrames: ImageData[] = [];
    if (frames.length >= 2) {
      displayFrames.push(frames[0]);
      displayFrames.push(frames[Math.floor(frames.length / 2)]);
      displayFrames.push(frames[0]);
    } else {
      displayFrames.push(...frames);
    }

    const delay = 1000 / 8;
    for (const frame of displayFrames) {
      const canvas = new OffscreenCanvas(frame.width, frame.height);
      const ctx = canvas.getContext('2d')!;
      ctx.putImageData(frame, 0, 0);
      gif.addFrame(ctx as unknown as CanvasRenderingContext2D, { delay, copy: true });
    }

    gif.on('progress', (p: number) => {
      ctx.postMessage({ type: 'progress', progress: p } as WorkerResponse);
    });

    gif.on('finished', (blob: Blob) => {
      resolve(blob);
    });

    gif.on('error', (error: Error) => {
      reject(error);
    });

    gif.render();
  });
}

async function exportPNG(imageData: ImageData): Promise<Blob> {
  const canvas = new OffscreenCanvas(imageData.width, imageData.height);
  const ctx = canvas.getContext('2d')!;
  ctx.putImageData(imageData, 0, 0);
  return canvas.convertToBlob({ type: 'image/png' });
}

ctx.addEventListener('message', async (e: MessageEvent<WorkerMessage>) => {
  const { type } = e.data;

  try {
    switch (type) {
      case 'crop': {
        const { imageData, width, height } = e.data;
        if (!imageData) throw new Error('缺少imageData');

        const imgData = new ImageData(
          new Uint8ClampedArray(imageData.data),
          imageData.width || width!,
          imageData.height || height!
        );

        const faceRegion = detectFace(imgData);
        const cropped = cropImage(imgData, faceRegion);

        ctx.postMessage({
          type: 'cropComplete',
          imageData: cropped,
          faceRegion
        } as WorkerResponse);
        break;
      }

      case 'transform': {
        const { imageData, emotion, params } = e.data;
        if (!imageData || !emotion) throw new Error('缺少必要参数');

        const imgData = new ImageData(
          new Uint8ClampedArray(imageData.data),
          imageData.width,
          imageData.height
        );

        const { imageData: transformed, faceRegion } = transformImage(imgData, emotion, params);

        ctx.postMessage({
          type: 'transformComplete',
          imageData: transformed,
          faceRegion
        } as WorkerResponse);
        break;
      }

      case 'exportGIF': {
        const { frames } = e.data;
        if (!frames || frames.length === 0) throw new Error('缺少frames');

        const imgFrames = frames.map(f => new ImageData(
          new Uint8ClampedArray(f.data),
          f.width,
          f.height
        ));

        const blob = await exportGIF(imgFrames);
        const arrayBuffer = await blob.arrayBuffer();

        ctx.postMessage({
          type: 'gifComplete',
          blob: arrayBuffer
        } as unknown as WorkerResponse, [arrayBuffer]);
        break;
      }

      case 'exportPNG': {
        const { imageData } = e.data;
        if (!imageData) throw new Error('缺少imageData');

        const imgData = new ImageData(
          new Uint8ClampedArray(imageData.data),
          imageData.width,
          imageData.height
        );

        const blob = await exportPNG(imgData);
        const arrayBuffer = await blob.arrayBuffer();

        ctx.postMessage({
          type: 'pngComplete',
          blob: arrayBuffer
        } as unknown as WorkerResponse, [arrayBuffer]);
        break;
      }

      default:
        throw new Error(`未知的消息类型: ${type}`);
    }
  } catch (error) {
    ctx.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : String(error)
    } as WorkerResponse);
  }
});
