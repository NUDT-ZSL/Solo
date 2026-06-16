import type { SequenceParams, KspacePoint, ProtonData, ImageData } from '../types';

const PROTON_COUNT = 100;
const IMAGE_SIZE = 128;
const ELLIPSOID_A = 1.2;
const ELLIPSOID_B = 0.8;
const ELLIPSOID_C = 0.8;

function lerpColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

export function generateProtons(): ProtonData[] {
  const protons: ProtonData[] = [];
  for (let i = 0; i < PROTON_COUNT; i++) {
    let x: number, y: number, z: number;
    do {
      x = (Math.random() - 0.5) * 2 * ELLIPSOID_A;
      y = (Math.random() - 0.5) * 2 * ELLIPSOID_B;
      z = (Math.random() - 0.5) * 2 * ELLIPSOID_C;
    } while (
      (x * x) / (ELLIPSOID_A * ELLIPSOID_A) +
        (y * y) / (ELLIPSOID_B * ELLIPSOID_B) +
        (z * z) / (ELLIPSOID_C * ELLIPSOID_C) >
      1
    );

    const frequency = x * 2 + y * 1.5;
    const colorT = (x / ELLIPSOID_A + 1) / 2;
    const color = lerpColor('#ff6b6b', '#4ecdc4', colorT);

    protons.push({
      x,
      y,
      z,
      phase: Math.random() * Math.PI * 2,
      frequency,
      color,
    });
  }
  return protons;
}

export function updateProtonPhases(
  protons: ProtonData[],
  time: number,
  params: SequenceParams
): ProtonData[] {
  const { flipAngle } = params;
  const flipRad = (flipAngle * Math.PI) / 180;
  const flipFactor = Math.sin(flipRad);

  return protons.map((p) => ({
    ...p,
    phase: (p.phase + p.frequency * time * 0.001 * flipFactor) % (Math.PI * 2),
  }));
}

function fft2(data: Float32Array, width: number, height: number, inverse: boolean): void {
  const real = new Float32Array(width * height);
  const imag = new Float32Array(width * height);

  for (let i = 0; i < width * height; i++) {
    real[i] = data[i * 2];
    imag[i] = data[i * 2 + 1];
  }

  for (let y = 0; y < height; y++) {
    const rowReal = new Float32Array(width);
    const rowImag = new Float32Array(width);
    for (let x = 0; x < width; x++) {
      rowReal[x] = real[y * width + x];
      rowImag[x] = imag[y * width + x];
    }
    fft1D(rowReal, rowImag, inverse);
    for (let x = 0; x < width; x++) {
      real[y * width + x] = rowReal[x];
      imag[y * width + x] = rowImag[x];
    }
  }

  for (let x = 0; x < width; x++) {
    const colReal = new Float32Array(height);
    const colImag = new Float32Array(height);
    for (let y = 0; y < height; y++) {
      colReal[y] = real[y * width + x];
      colImag[y] = imag[y * width + x];
    }
    fft1D(colReal, colImag, inverse);
    for (let y = 0; y < height; y++) {
      real[y * width + x] = colReal[y];
      imag[y * width + x] = colImag[y];
    }
  }

  const scale = inverse ? 1 / (width * height) : 1;
  for (let i = 0; i < width * height; i++) {
    data[i * 2] = real[i] * scale;
    data[i * 2 + 1] = imag[i] * scale;
  }
}

function fft1D(real: Float32Array, imag: Float32Array, inverse: boolean): void {
  const n = real.length;
  if (n <= 1) return;

  const log2n = Math.log2(n);
  for (let i = 0; i < n; i++) {
    const j = reverseBits(i, log2n);
    if (i < j) {
      let temp = real[i];
      real[i] = real[j];
      real[j] = temp;
      temp = imag[i];
      imag[i] = imag[j];
      imag[j] = temp;
    }
  }

  for (let size = 2; size <= n; size *= 2) {
    const halfSize = size / 2;
    const angleStep = (inverse ? 2 : -2) * Math.PI / size;
    const wReal0 = Math.cos(angleStep);
    const wImag0 = Math.sin(angleStep);

    for (let i = 0; i < n; i += size) {
      let wReal = 1;
      let wImag = 0;

      for (let j = 0; j < halfSize; j++) {
        const evenReal = real[i + j];
        const evenImag = imag[i + j];
        const oddReal = wReal * real[i + j + halfSize] - wImag * imag[i + j + halfSize];
        const oddImag = wReal * imag[i + j + halfSize] + wImag * real[i + j + halfSize];

        real[i + j] = evenReal + oddReal;
        imag[i + j] = evenImag + oddImag;
        real[i + j + halfSize] = evenReal - oddReal;
        imag[i + j + halfSize] = evenImag - oddImag;

        const newWReal = wReal * wReal0 - wImag * wImag0;
        const newWImag = wReal * wImag0 + wImag * wReal0;
        wReal = newWReal;
        wImag = newWImag;
      }
    }
  }
}

function reverseBits(x: number, bits: number): number {
  let result = 0;
  for (let i = 0; i < bits; i++) {
    result = (result << 1) | (x & 1);
    x >>= 1;
  }
  return result;
}

function generatePhantom(size: number): Float32Array {
  const phantom = new Float32Array(size * size);
  const centerX = size / 2;
  const centerY = size / 2;
  const radiusA = size * 0.42;
  const radiusB = size * 0.3;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - centerX) / radiusA;
      const dy = (y - centerY) / radiusB;
      const dist = dx * dx + dy * dy;

      let val = 0;
      if (dist <= 1) {
        val = 0.7 + 0.3 * (1 - dist);
      }

      const dx2 = (x - centerX + size * 0.1) / (size * 0.08);
      const dy2 = (y - centerY - size * 0.05) / (size * 0.1);
      if (dx2 * dx2 + dy2 * dy2 <= 1) {
        val = Math.max(val, 0.9);
      }

      const dx3 = (x - centerX - size * 0.08) / (size * 0.06);
      const dy3 = (y - centerY + size * 0.08) / (size * 0.07);
      if (dx3 * dx3 + dy3 * dy3 <= 1) {
        val = Math.max(val, 0.5);
      }

      phantom[y * size + x] = val;
    }
  }

  return phantom;
}

export function computeKspace(
  protons: ProtonData[],
  params: SequenceParams
): Float32Array {
  const size = IMAGE_SIZE;
  const phantom = generatePhantom(size);

  const kspace = new Float32Array(size * size * 2);
  for (let i = 0; i < size * size; i++) {
    kspace[i * 2] = phantom[i];
    kspace[i * 2 + 1] = 0;
  }

  fft2(kspace, size, size, false);

  const { TR, TE, flipAngle } = params;
  const flipRad = (flipAngle * Math.PI) / 180;
  const T1 = 500;
  const T2 = 80;

  const E1 = Math.exp(-TR / T1);
  const E2 = Math.exp(-TE / T2);
  const signalFactor = Math.sin(flipRad) * (1 - E1) * E2 / (1 - Math.cos(flipRad) * E1);

  for (let i = 0; i < size * size; i++) {
    kspace[i * 2] *= signalFactor;
    kspace[i * 2 + 1] *= signalFactor;
  }

  return kspace;
}

export function kspaceToTrajectory(kspace: Float32Array, size: number): KspacePoint[] {
  const points: KspacePoint[] = [];
  const totalPoints = size * size;

  for (let i = 0; i < totalPoints; i++) {
    const x = i % size;
    const y = Math.floor(i / size);
    const real = kspace[i * 2];
    const imag = kspace[i * 2 + 1];
    const value = Math.sqrt(real * real + imag * imag);
    const phase = Math.atan2(imag, real);

    points.push({
      x: x / size - 0.5,
      y: y / size - 0.5,
      value,
      phase,
    });
  }

  return points;
}

export function reconstructImage(
  kspace: Float32Array,
  params: SequenceParams
): ImageData {
  const size = IMAGE_SIZE;
  const data = new Float32Array(kspace);

  fft2(data, size, size, true);

  const pixels = new Uint8ClampedArray(size * size);
  const magnitude = new Float32Array(size * size);

  let maxVal = 0;
  for (let i = 0; i < size * size; i++) {
    const real = data[i * 2];
    const imag = data[i * 2 + 1];
    magnitude[i] = Math.sqrt(real * real + imag * imag);
    if (magnitude[i] > maxVal) maxVal = magnitude[i];
  }

  const { TR, TE } = params;
  const contrastExp = TR > 600 ? 0.7 : 0.9;
  const noiseLevel = TE > 60 ? 0.06 : 0.02;

  if (maxVal === 0) {
    return { width: size, height: size, pixels };
  }

  for (let i = 0; i < size * size; i++) {
    let val = magnitude[i] / maxVal;
    val = Math.pow(val, contrastExp);
    val += (Math.random() - 0.5) * noiseLevel;
    val = Math.max(0, Math.min(1, val));
    pixels[i] = Math.round(val * 255);
  }

  return { width: size, height: size, pixels };
}

export function generateKspaceTrajectoryPoints(
  phase: number,
  params: SequenceParams
): KspacePoint[] {
  const points: KspacePoint[] = [];
  const linesCount = 24;
  const pointsPerLine = 32;
  const totalProgress = (phase * 0.3) % 1;

  for (let line = 0; line < linesCount; line++) {
    const lineStart = line / linesCount;
    const lineProgress = (totalProgress - lineStart) * linesCount;

    if (lineProgress <= 0) continue;

    const numPoints = Math.min(pointsPerLine, Math.floor(lineProgress * pointsPerLine));
    const ky = (line / linesCount - 0.5) * 2;
    const t = line / linesCount;

    for (let p = 0; p < numPoints; p++) {
      const kx = ((p / (pointsPerLine - 1)) - 0.5) * 2;
      const value = 1 - Math.abs(p / (pointsPerLine - 1) - 0.5) * 2;

      points.push({
        x: kx,
        y: ky,
        value,
        phase: t * Math.PI * 2,
      });
    }
  }

  return points;
}
