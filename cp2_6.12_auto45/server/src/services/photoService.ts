import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import type { FaceBox, Photo, Comment } from '../types';

const photos: Photo[] = [];

export interface AnalysisResult {
  score: number;
  faceBox: FaceBox;
}

function isSkinPixel(r: number, g: number, b: number): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max < 60 || min > 240) return false;
  const saturation = max === 0 ? 0 : (max - min) / max;
  if (saturation < 0.08 || saturation > 0.75) return false;
  const brightness = (r + g + b) / 3;
  if (brightness < 50 || brightness > 230) return false;
  return r > 80 && g > 30 && b > 15 && r > g && r > b && (r - g) > 10;
}

function countSkinPixels(data: Buffer, width: number, height: number): number {
  let count = 0;
  const step = 4;
  for (let i = 0; i < data.length; i += step) {
    if (isSkinPixel(data[i], data[i + 1], data[i + 2])) {
      count++;
    }
  }
  return count;
}

function findSkinRegion(
  data: Buffer,
  width: number,
  height: number
): { cx: number; cy: number; skinRatio: number } {
  let sumX = 0;
  let sumY = 0;
  let count = 0;
  const step = 4;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * step;
      if (isSkinPixel(data[idx], data[idx + 1], data[idx + 2])) {
        sumX += x;
        sumY += y;
        count++;
      }
    }
  }

  const totalPixels = width * height;
  const skinRatio = count / totalPixels;

  if (count === 0) {
    return { cx: Math.floor(width / 2), cy: Math.floor(height / 3), skinRatio: 0 };
  }

  return {
    cx: Math.floor(sumX / count),
    cy: Math.floor(sumY / count),
    skinRatio,
  };
}

function analyzeSymmetry(
  data: Buffer,
  width: number,
  height: number,
  cx: number,
  cy: number
): number {
  const faceRadius = Math.min(width, height) * 0.2;
  const step = 4;
  let leftBright = 0;
  let rightBright = 0;
  let leftCount = 0;
  let rightCount = 0;

  for (let dy = -faceRadius; dy <= faceRadius; dy += 2) {
    for (let dx = 1; dx <= faceRadius; dx += 2) {
      const lx = Math.floor(cx - dx);
      const rx = Math.floor(cx + dx);
      const y = Math.floor(cy + dy);

      if (lx >= 0 && rx < width && y >= 0 && y < height) {
        const leftIdx = (y * width + lx) * step;
        const rightIdx = (y * width + rx) * step;

        const lb = (data[leftIdx] + data[leftIdx + 1] + data[leftIdx + 2]) / 3;
        const rb = (data[rightIdx] + data[rightIdx + 1] + data[rightIdx + 2]) / 3;

        leftBright += lb;
        rightBright += rb;
        leftCount++;
        rightCount++;
      }
    }
  }

  if (leftCount === 0 || rightCount === 0) return 0.5;

  const avgLeft = leftBright / leftCount;
  const avgRight = rightBright / rightCount;
  const maxAvg = Math.max(avgLeft, avgRight, 1);
  return 1 - Math.abs(avgLeft - avgRight) / maxAvg;
}

function analyzeMouthBrightness(
  data: Buffer,
  width: number,
  height: number,
  cx: number,
  cy: number
): number {
  const faceHeight = Math.min(width, height) * 0.35;
  const mouthTop = Math.floor(cy + faceHeight * 0.3);
  const mouthBottom = Math.floor(cy + faceHeight * 0.6);
  const mouthLeft = Math.floor(cx - faceHeight * 0.25);
  const mouthRight = Math.floor(cx + faceHeight * 0.25);

  let brightPixels = 0;
  let totalPixels = 0;
  const step = 4;

  for (let y = Math.max(0, mouthTop); y < Math.min(height, mouthBottom); y += 2) {
    for (let x = Math.max(0, mouthLeft); x < Math.min(width, mouthRight); x += 2) {
      const idx = (y * width + x) * step;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const brightness = (r + g + b) / 3;
      const isSkin = isSkinPixel(r, g, b);

      if (!isSkin) {
        totalPixels++;
        if (brightness > 140) {
          brightPixels++;
        }
      }
    }
  }

  if (totalPixels === 0) return 0.5;
  return brightPixels / totalPixels;
}

export const analyzePhoto = async (
  imagePath: string,
  imageWidth: number,
  imageHeight: number
): Promise<AnalysisResult> => {
  try {
    const resized = await sharp(imagePath)
      .resize(200, 200, { fit: 'cover' })
      .raw()
      .toBuffer();

    const smallW = 200;
    const smallH = 200;

    const skinCount = countSkinPixels(resized, smallW, smallH);
    const totalPixels = smallW * smallH;
    const skinRatio = skinCount / totalPixels;

    const { cx, cy } = findSkinRegion(resized, smallW, smallH);

    const symmetry = analyzeSymmetry(resized, smallW, smallH, cx, cy);

    const mouthBrightness = analyzeMouthBrightness(resized, smallW, smallH, cx, cy);

    let faceDetected = skinRatio > 0.05 && skinRatio < 0.7;

    let score: number;
    if (!faceDetected) {
      score = Math.floor(20 + Math.random() * 30);
    } else {
      const skinScore = Math.min(skinRatio / 0.35, 1) * 25;
      const symScore = symmetry * 35;
      const mouthScore = mouthBrightness * 40;
      const rawScore = skinScore + symScore + mouthScore;
      const noise = (Math.random() - 0.5) * 10;
      score = Math.max(0, Math.min(100, Math.floor(rawScore + noise + 15)));
    }

    const faceBoxScale = imageWidth / smallW;
    const faceSize = Math.min(imageWidth, imageHeight) * 0.3;

    const faceBox: FaceBox = faceDetected
      ? {
          x: Math.max(0, Math.floor(cx * faceBoxScale - faceSize / 2)),
          y: Math.max(0, Math.floor(cy * faceBoxScale - faceSize * 0.4)),
          width: Math.floor(faceSize),
          height: Math.floor(faceSize * 1.2),
        }
      : {
          x: 0,
          y: 0,
          width: 0,
          height: 0,
        };

    return {
      score,
      faceBox: faceDetected ? faceBox : { x: 0, y: 0, width: 0, height: 0 },
    };
  } catch (err) {
    return {
      score: Math.floor(30 + Math.random() * 40),
      faceBox: { x: 0, y: 0, width: 0, height: 0 },
    };
  }
};

export const addPhoto = (photo: Photo): void => {
  photos.push(photo);
};

export const getAllPhotos = (): Photo[] => {
  return [...photos].sort((a, b) => b.uploadedAt - a.uploadedAt);
};

export const getPhotoById = (id: string): Photo | undefined => {
  return photos.find((p) => p.id === id);
};

export const getTopPhotos = (limit: number = 10): Photo[] => {
  return [...photos]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
};

export const addCommentToPhoto = (photoId: string, content: string): Comment | null => {
  const photo = photos.find((p) => p.id === photoId);
  if (!photo) return null;
  const comment: Comment = {
    id: uuidv4(),
    content,
    createdAt: Date.now(),
  };
  photo.comments.unshift(comment);
  return comment;
};

export const getPhotosPaginated = (limit: number, offset: number): Photo[] => {
  const sorted = [...photos].sort((a, b) => b.uploadedAt - a.uploadedAt);
  return sorted.slice(offset, offset + limit);
};
