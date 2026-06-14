export interface DenoiseParams {
  intensity: number;
  enhanceEdges: boolean;
}

function createGaussianKernel(radius: number, sigma: number): number[] {
  const size = radius * 2 + 1;
  const kernel: number[] = [];
  let sum = 0;

  for (let i = 0; i < size; i++) {
    const x = i - radius;
    const value = Math.exp(-(x * x) / (2 * sigma * sigma));
    kernel.push(value);
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
  radius: number,
  sigma: number
): Uint8ClampedArray {
  const kernel = createGaussianKernel(radius, sigma);
  const size = radius * 2 + 1;
  const result = new Uint8ClampedArray(data.length);
  const temp = new Uint8ClampedArray(data.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0;

      for (let k = 0; k < size; k++) {
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

      for (let k = 0; k < size; k++) {
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

function sobelEdgeDetect(
  data: Uint8ClampedArray,
  width: number,
  height: number
): Uint8ClampedArray {
  const result = new Uint8ClampedArray(data.length);

  const gxKernel = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const gyKernel = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gxR = 0, gxG = 0, gxB = 0;
      let gyR = 0, gyG = 0, gyB = 0;

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const kidx = (ky + 1) * 3 + (kx + 1);
          const idx = ((y + ky) * width + (x + kx)) * 4;

          gxR += data[idx] * gxKernel[kidx];
          gxG += data[idx + 1] * gxKernel[kidx];
          gxB += data[idx + 2] * gxKernel[kidx];

          gyR += data[idx] * gyKernel[kidx];
          gyG += data[idx + 1] * gyKernel[kidx];
          gyB += data[idx + 2] * gyKernel[kidx];
        }
      }

      const idx = (y * width + x) * 4;
      result[idx] = Math.sqrt(gxR * gxR + gyR * gyR);
      result[idx + 1] = Math.sqrt(gxG * gxG + gyG * gyG);
      result[idx + 2] = Math.sqrt(gxB * gxB + gyB * gyB);
      result[idx + 3] = 255;
    }
  }

  return result;
}

const intensityLevels = [
  { radius: 1, sigma: 0.5 },
  { radius: 1, sigma: 1.0 },
  { radius: 2, sigma: 1.2 },
  { radius: 2, sigma: 1.8 },
  { radius: 3, sigma: 2.5 },
];

export function denoiseImage(
  imageData: ImageData,
  params: DenoiseParams
): ImageData {
  const { data, width, height } = imageData;
  const level = Math.min(Math.max(Math.floor(params.intensity), 0), intensityLevels.length - 1);
  const { radius, sigma } = intensityLevels[level];

  const blurred = gaussianBlur(data, width, height, radius, sigma);
  let resultData = blurred;

  if (params.enhanceEdges) {
    const edges = sobelEdgeDetect(data, width, height);
    resultData = new Uint8ClampedArray(blurred.length);

    for (let i = 0; i < blurred.length; i += 4) {
      const edgeStrength = (edges[i] + edges[i + 1] + edges[i + 2]) / 3 / 255;
      const blendFactor = Math.min(edgeStrength * 1.5, 1);

      resultData[i] = blurred[i] * (1 - blendFactor) + data[i] * blendFactor;
      resultData[i + 1] = blurred[i + 1] * (1 - blendFactor) + data[i + 1] * blendFactor;
      resultData[i + 2] = blurred[i + 2] * (1 - blendFactor) + data[i + 2] * blendFactor;
      resultData[i + 3] = blurred[i + 3];
    }
  }

  return new ImageData(resultData, width, height);
}
