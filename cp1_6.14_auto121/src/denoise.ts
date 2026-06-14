export interface DenoiseParams {
  intensity: number;
  enhanceEdges: boolean;
}

const STRENGTH_PROFILES: ReadonlyArray<{
  kernelSize: number;
  sigma: number;
}> = [
  { kernelSize: 3, sigma: 0.8 },
  { kernelSize: 3, sigma: 1.4 },
  { kernelSize: 5, sigma: 1.5 },
  { kernelSize: 5, sigma: 2.5 },
  { kernelSize: 7, sigma: 3.0 },
];

function createGaussianKernel(size: number, sigma: number): Float64Array {
  const radius = Math.floor(size / 2);
  const kernel = new Float64Array(size);
  let sum = 0;

  for (let i = 0; i < size; i++) {
    const x = i - radius;
    const value = Math.exp(-(x * x) / (2 * sigma * sigma));
    kernel[i] = value;
    sum += value;
  }

  for (let i = 0; i < size; i++) {
    kernel[i] /= sum;
  }

  return kernel;
}

function gaussianBlur(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  strength: number
): Uint8ClampedArray {
  const level = Math.min(Math.max(Math.floor(strength), 0), STRENGTH_PROFILES.length - 1);
  const { kernelSize, sigma } = STRENGTH_PROFILES[level];
  const radius = Math.floor(kernelSize / 2);
  const kernel = createGaussianKernel(kernelSize, sigma);
  const result = new Uint8ClampedArray(data.length);
  const temp = new Uint8ClampedArray(data.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0;

      for (let k = 0; k < kernelSize; k++) {
        const px = Math.min(Math.max(x + k - radius, 0), width - 1);
        const idx = (y * width + px) * 4;
        const weight = kernel[k];
        r += data[idx] * weight;
        g += data[idx + 1] * weight;
        b += data[idx + 2] * weight;
        a += data[idx + 3] * weight;
      }

      const idx = (y * width + x) * 4;
      temp[idx] = r;
      temp[idx + 1] = g;
      temp[idx + 2] = b;
      temp[idx + 3] = a;
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0;

      for (let k = 0; k < kernelSize; k++) {
        const py = Math.min(Math.max(y + k - radius, 0), height - 1);
        const idx = (py * width + x) * 4;
        const weight = kernel[k];
        r += temp[idx] * weight;
        g += temp[idx + 1] * weight;
        b += temp[idx + 2] * weight;
        a += temp[idx + 3] * weight;
      }

      const idx = (y * width + x) * 4;
      result[idx] = r;
      result[idx + 1] = g;
      result[idx + 2] = b;
      result[idx + 3] = a;
    }
  }

  return result;
}

function edgeEnhance(
  original: Uint8ClampedArray,
  blurred: Uint8ClampedArray,
  width: number,
  height: number,
  strength: number
): Uint8ClampedArray {
  const pixelCount = width * height;
  const edgeR = new Float32Array(pixelCount);
  const edgeG = new Float32Array(pixelCount);
  const edgeB = new Float32Array(pixelCount);

  const gxK = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const gyK = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gxR = 0, gxG = 0, gxB = 0;
      let gyR = 0, gyG = 0, gyB = 0;

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const ki = (ky + 1) * 3 + (kx + 1);
          const idx = ((y + ky) * width + (x + kx)) * 4;

          gxR += original[idx] * gxK[ki];
          gxG += original[idx + 1] * gxK[ki];
          gxB += original[idx + 2] * gxK[ki];

          gyR += original[idx] * gyK[ki];
          gyG += original[idx + 1] * gyK[ki];
          gyB += original[idx + 2] * gyK[ki];
        }
      }

      const pi = y * width + x;
      edgeR[pi] = Math.sqrt(gxR * gxR + gyR * gyR);
      edgeG[pi] = Math.sqrt(gxG * gxG + gyG * gyG);
      edgeB[pi] = Math.sqrt(gxB * gxB + gyB * gyB);
    }
  }

  let maxR = 0, maxG = 0, maxB = 0;
  for (let i = 0; i < pixelCount; i++) {
    if (edgeR[i] > maxR) maxR = edgeR[i];
    if (edgeG[i] > maxG) maxG = edgeG[i];
    if (edgeB[i] > maxB) maxB = edgeB[i];
  }

  const blendScale = 1.2 + strength * 0.3;

  const result = new Uint8ClampedArray(blurred.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pi = y * width + x;
      const idx = pi * 4;

      const normR = maxR > 0 ? edgeR[pi] / maxR : 0;
      const normG = maxG > 0 ? edgeG[pi] / maxG : 0;
      const normB = maxB > 0 ? edgeB[pi] / maxB : 0;

      const bR = Math.min(normR * blendScale, 1);
      const bG = Math.min(normG * blendScale, 1);
      const bB = Math.min(normB * blendScale, 1);

      result[idx] = blurred[idx] * (1 - bR) + original[idx] * bR;
      result[idx + 1] = blurred[idx + 1] * (1 - bG) + original[idx + 1] * bG;
      result[idx + 2] = blurred[idx + 2] * (1 - bB) + original[idx + 2] * bB;
      result[idx + 3] = blurred[idx + 3];
    }
  }

  return result;
}

export function denoiseImage(
  imageData: ImageData,
  params: DenoiseParams
): ImageData {
  const { data, width, height } = imageData;
  const strength = Math.min(Math.max(Math.floor(params.intensity), 0), STRENGTH_PROFILES.length - 1);

  const blurred = gaussianBlur(data, width, height, strength);

  if (!params.enhanceEdges) {
    return new ImageData(blurred, width, height);
  }

  const enhanced = edgeEnhance(data, blurred, width, height, strength);
  return new ImageData(enhanced, width, height);
}
