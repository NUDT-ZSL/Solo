import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import type { FaceBox, Photo } from './types';

export interface AnalysisResult {
  score: number;
  faceBox: FaceBox;
}

export const analyzePhoto = async (
  imagePath: string,
  imageWidth: number,
  imageHeight: number
): Promise<AnalysisResult> => {
  try {
    const { data } = await sharp(imagePath)
      .raw()
      .toBuffer({ resolveWithObject: true });

    const pixels: number[][][] = [];
    const channel = 3;

    for (let y = 0; y < imageHeight; y++) {
      pixels[y] = [];
      for (let x = 0; x < imageWidth; x++) {
        const idx = (y * imageWidth + x) * channel;
        pixels[y][x] = [data[idx], data[idx + 1],