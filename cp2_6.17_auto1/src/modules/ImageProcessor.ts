import type { ImageFeatures } from '@/types';

export function extractDominantColor(imageData: ImageData): { r: number; g: number; b: number } {
  const { data, width, height } = imageData;
  let r = 0, g = 0, b = 0;
  const pixelCount = width * height;

  for (let i = 0; i < data.length; i += 4) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
  }

  return {
    r: Math.round(r / pixelCount),
    g: Math.round(g / pixelCount),
    b: Math.round(b / pixelCount),
  };
}

export function calculateTextureComplexity(imageData: ImageData): number {
  const { data, width, height } = imageData;
  const grayscale: number[] = [];

  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    grayscale.push(gray);
  }

  const differences: number[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;

      if (x < width - 1) {
        differences.push(Math.abs(grayscale[idx] - grayscale[idx + 1]));
      }

      if (y < height - 1) {
        differences.push(Math.abs(grayscale[idx] - grayscale[idx + width]));
      }
    }
  }

  const mean = differences.reduce((a, b) => a + b, 0) / differences.length;
  const variance = differences.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / differences.length;
  const stdDev = Math.sqrt(variance);

  return Math.round(stdDev * 100) / 100;
}

export async function extractFeatures(file: File): Promise<ImageFeatures> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas not supported'));
      return;
    }

    canvas.width = 100;
    canvas.height = 100;

    img.onload = () => {
      ctx.drawImage(img, 0, 0, 100, 100);
      const imageData = ctx.getImageData(0, 0, 100, 100);

      const dominantColor = extractDominantColor(imageData);
      const textureComplexity = calculateTextureComplexity(imageData);

      const { r, g, b } = dominantColor;
      let colorTemperature: 'warm' | 'cool' | 'neutral';

      if (r > 200 && g < 180) {
        colorTemperature = 'warm';
      } else if (b > 150 && b > r) {
        colorTemperature = 'cool';
      } else {
        colorTemperature = 'neutral';
      }

      let textureType: 'clear' | 'medium' | 'cloudy';
      if (textureComplexity > 50) {
        textureType = 'cloudy';
      } else if (textureComplexity >= 20) {
        textureType = 'medium';
      } else {
        textureType = 'clear';
      }

      URL.revokeObjectURL(img.src);

      resolve({
        dominantColor,
        textureComplexity,
        colorTemperature,
        textureType,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };

    img.src = URL.createObjectURL(file);
  });
}
