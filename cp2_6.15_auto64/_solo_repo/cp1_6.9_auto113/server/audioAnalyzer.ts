export interface DifferenceRegion {
  startTime: number;
  endTime: number;
  avgScore: number;
  description: string;
}

export interface CompareResult {
  score: number;
  alignmentPath: [number, number][];
  frameScores: number[];
  differenceRegions: DifferenceRegion[];
  alignedWaveformA: number[];
  alignedWaveformB: number[];
  differenceMask: number[];
}

export interface AudioFeatures {
  decoded: Float32Array;
  sampleRate: number;
  duration: number;
  waveformData: number[];
  spectrumData: number[];
}

export interface ParsedAudio {
  pcm: Float32Array;
  sampleRate: number;
  channels: number;
  isParsed: boolean;
  format: string;
}

const WAVEFORM_POINTS = 512;
const SPECTRUM_DIM = 128;
const DTW_WINDOW_RATIO = 0.2;

function parseWAVBuffer(buffer: Buffer): ParsedAudio {
  try {
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

    if (buffer.length < 44) throw new Error('Buffer too small for WAV');

    const riffId = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
    if (riffId !== 'RIFF') throw new Error('Not a RIFF file');

    const waveId = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));
    if (waveId !== 'WAVE') throw new Error('Not a WAVE file');

    let offset = 12;
    let fmtFound = false;
    let dataFound = false;
    let audioFormat = 1;
    let numChannels = 1;
    let sampleRate = 44100;
    let bitsPerSample = 16;
    let dataOffset = 0;
    let dataLength = 0;

    while (offset < buffer.length - 8) {
      const chunkId = String.fromCharCode(
        view.getUint8(offset), view.getUint8(offset + 1),
        view.getUint8(offset + 2), view.getUint8(offset + 3)
      );
      const chunkSize = view.getUint32(offset + 4, true);

      if (chunkId === 'fmt ') {
        audioFormat = view.getUint16(offset + 8, true);
        numChannels = view.getUint16(offset + 10, true);
        sampleRate = view.getUint32(offset + 12, true);
        bitsPerSample = view.getUint16(offset + 22, true);
        fmtFound = true;
      } else if (chunkId === 'data') {
        dataOffset = offset + 8;
        dataLength = chunkSize;
        dataFound = true;
        break;
      }

      offset += 8 + chunkSize + (chunkSize % 2);
    }

    if (!fmtFound || !dataFound) throw new Error('Invalid WAV structure');

    const bytesPerSample = bitsPerSample / 8;
    const totalSamples = Math.floor(dataLength / bytesPerSample / numChannels);
    const pcm = new Float32Array(totalSamples);

    const normalizeInt = (val: number, bits: number): number => {
      const max = (1 << (bits - 1)) - 1;
      return Math.max(-1, Math.min(1, val / max));
    };

    for (let i = 0; i < totalSamples; i++) {
      let mixed = 0;
      for (let ch = 0; ch < numChannels; ch++) {
        const sampleOffset = dataOffset + (i * numChannels + ch) * bytesPerSample;
        let sample = 0;
        switch (bitsPerSample) {
          case 8:
            sample = (view.getUint8(sampleOffset) - 128) / 128;
            break;
          case 16:
            sample = normalizeInt(view.getInt16(sampleOffset, true), 16);
            break;
          case 24: {
            const b0 = view.getUint8(sampleOffset);
            const b1 = view.getUint8(sampleOffset + 1);
            const b2 = view.getInt8(sampleOffset + 2);
            sample = ((b2 << 16) | (b1 << 8) | b0) / 8388608;
            break;
          }
          case 32:
            sample = view.getInt32(sampleOffset, true) / 2147483648;
            break;
          default:
            sample = 0;
        }
        mixed += sample;
      }
      pcm[i] = mixed / numChannels;
    }

    return { pcm, sampleRate, channels: numChannels, isParsed: true, format: 'wav' };
  } catch (err) {
    return fallbackParse(buffer);
  }
}

function fallbackParse(buffer: Buffer): ParsedAudio {
  const sampleRate = 22050;
  const step = Math.max(1, Math.floor(buffer.length / (60 * sampleRate)));
  const length = Math.floor(buffer.length / step);
  const pcm = new Float32Array(length);

  let seed = 0x9e3779b1;
  for (let i = 0; i < length; i++) {
    const b = buffer[i * step];
    seed = (seed * 1103515245 + 12345 + b) >>> 0;
    const hashVal = ((seed & 0x7fffffff) / 0x7fffffff) * 2 - 1;
    const wave = ((b - 128) / 128) * 0.6 + hashVal * 0.4;
    pcm[i] = Math.max(-1, Math.min(1, wave));
  }

  return { pcm, sampleRate, channels: 1, isParsed: false, format: 'fallback' };
}

export function parseAudioBuffer(buffer: Buffer, mimeType?: string): ParsedAudio {
  const mime = (mimeType || '').toLowerCase();
  const isWav = mime.includes('wav') || mime.includes('wave');

  if (isWav) {
    const parsed = parseWAVBuffer(buffer);
    if (parsed.isParsed) return parsed;
  }

  const wavCheck = parseWAVBuffer(buffer);
  if (wavCheck.isParsed) return wavCheck;

  return fallbackParse(buffer);
}

export function extractWaveform(pcm: Float32Array, points: number = WAVEFORM_POINTS): number[] {
  const result = new Array<number>(points);
  if (pcm.length === 0) return new Array(points).fill(0);

  const samplesPerPoint = pcm.length / points;
  let maxAmp = 0;

  for (let i = 0; i < points; i++) {
    const start = Math.floor(i * samplesPerPoint);
    const end = Math.floor((i + 1) * samplesPerPoint);
    let peak = 0;
    for (let j = start; j < end; j++) {
      const abs = Math.abs(pcm[j] || 0);
      if (abs > peak) peak = abs;
    }
    result[i] = peak;
    if (peak > maxAmp) maxAmp = peak;
  }

  if (maxAmp > 0) {
    for (let i = 0; i < points; i++) result[i] = result[i] / maxAmp;
  }

  return result;
}

export function computeFFT(signal: Float32Array): Float32Array {
  const n = signal.length;
  if (n === 0) return new Float32Array(0);

  if ((n & (n - 1)) !== 0) {
    let padded = 1;
    while (padded < n) padded <<= 1;
    const sig = new Float32Array(padded);
    sig.set(signal);
    return computeFFT(sig);
  }

  if (n === 1) return new Float32Array([Math.abs(signal[0])]);

  const half = n / 2;
  const even = new Float32Array(half);
  const odd = new Float32Array(half);
  for (let i = 0; i < half; i++) {
    even[i] = signal[2 * i];
    odd[i] = signal[2 * i + 1];
  }

  const evenMag = computeFFT(even);
  const oddMag = computeFFT(odd);

  const result = new Float32Array(n);
  for (let k = 0; k < half; k++) {
    const angle = (-2 * Math.PI * k) / n;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const tReal = oddMag[k] * cos - oddMag[k] * sin * 0;
    const tImag = oddMag[k] * sin + oddMag[k] * cos * 0;
    const re = evenMag[k] + tReal;
    const im = evenMag[k] * 0 + tImag;
    result[k] = Math.sqrt(re * re + im * im);
    result[k + half] = Math.sqrt(
      Math.abs(evenMag[k] - tReal) ** 2 + Math.abs(0 - tImag) ** 2
    );
  }

  return result;
}

function hanningWindow(n: number): Float32Array {
  const w = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)));
  }
  return w;
}

export function extractSpectrum(
  pcm: Float32Array,
  dim: number = SPECTRUM_DIM,
  fftSize: number = 512
): number[] {
  const result = new Array<number>(dim).fill(0);
  if (pcm.length === 0) return result;

  const window = hanningWindow(fftSize);
  const hop = Math.floor(fftSize / 2);
  let frames = 0;
  const frameChunk = new Float32Array(fftSize);

  for (let start = 0; start + fftSize <= pcm.length; start += hop) {
    for (let i = 0; i < fftSize; i++) {
      frameChunk[i] = (pcm[start + i] || 0) * window[i];
    }
    const magnitudes = computeFFT(frameChunk);
    const useful = Math.min(magnitudes.length, fftSize / 2);
    const binsPerDim = useful / dim;

    for (let d = 0; d < dim; d++) {
      let sum = 0;
      const s = Math.floor(d * binsPerDim);
      const e = Math.floor((d + 1) * binsPerDim);
      for (let k = s; k < e; k++) sum += magnitudes[k] || 0;
      const avg = e > s ? sum / (e - s) : 0;
      result[d] += Math.log1p(avg);
    }
    frames++;
  }

  if (frames > 0) {
    for (let d = 0; d < dim; d++) result[d] = result[d] / frames;
    let norm = 0;
    for (let d = 0; d < dim; d++) norm += result[d] * result[d];
    norm = Math.sqrt(norm) || 1;
    for (let d = 0; d < dim; d++) result[d] = result[d] / norm;
  }

  return result;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  if (denom === 0) return 0;
  return Math.max(0, Math.min(1, dot / denom));
}

export function dtwAlign(
  waveformA: number[],
  waveformB: number[]
): { distance: number; path: [number, number][] } {
  const n = waveformA.length;
  const m = waveformB.length;

  if (n === 0 || m === 0) {
    return { distance: Infinity, path: [] };
  }

  const maxLen = Math.max(n, m);
  const window = Math.max(5, Math.floor(maxLen * DTW_WINDOW_RATIO));

  const INF = Number.POSITIVE_INFINITY;
  const dtw: Float32Array = new Float32Array((n + 1) * (m + 1));
  for (let i = 0; i < dtw.length; i++) dtw[i] = INF;
  dtw[0] = 0;

  const idx = (i: number, j: number) => i * (m + 1) + j;

  for (let i = 1; i <= n; i++) {
    const jStart = Math.max(1, i - window);
    const jEnd = Math.min(m, i + window);
    for (let j = jStart; j <= jEnd; j++) {
      if (Math.abs(i - j) > window) continue;
      const diff = waveformA[i - 1] - waveformB[j - 1];
      const cost = diff * diff;
      const prev = Math.min(
        dtw[idx(i - 1, j)],
        dtw[idx(i, j - 1)],
        dtw[idx(i - 1, j - 1)]
      );
      dtw[idx(i, j)] = cost + prev;
    }
  }

  const path: [number, number][] = [];
  let i = n, j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const v0 = dtw[idx(i - 1, j - 1)];
      const v1 = dtw[idx(i - 1, j)];
      const v2 = dtw[idx(i, j - 1)];
      const min = Math.min(v0, v1, v2);
      path.push([i - 1, j - 1]);
      if (min === v0) { i--; j--; }
      else if (min === v1) { i--; }
      else { j--; }
    } else if (i > 0) {
      path.push([i - 1, j > 0 ? j - 1 : 0]);
      i--;
    } else if (j > 0) {
      path.push([i > 0 ? i - 1 : 0, j - 1]);
      j--;
    }
  }

  path.reverse();
  const distance = dtw[idx(n, m)] / path.length;
  return { distance, path };
}

export function computeFrameScores(
  waveformA: number[],
  waveformB: number[],
  path: [number, number][]
): { frameScores: number[]; alignedA: number[]; alignedB: number[] } {
  const len = path.length;
  const frameScores = new Array<number>(len);
  const alignedA = new Array<number>(len);
  const alignedB = new Array<number>(len);

  for (let k = 0; k < len; k++) {
    const [i, j] = path[k];
    const a = waveformA[i] || 0;
    const b = waveformB[j] || 0;
    alignedA[k] = a;
    alignedB[k] = b;
    const diff = Math.abs(a - b);
    const score = Math.max(0, 1 - diff * 1.8);
    frameScores[k] = score;
  }

  return { frameScores, alignedA, alignedB };
}

export function detectDifferenceRegions(
  frameScores: number[],
  sampleRate: number,
  duration: number,
  threshold: number = 0.6
): DifferenceRegion[] {
  const regions: DifferenceRegion[] = [];
  if (frameScores.length === 0 || duration === 0) return regions;

  const framesPerSec = frameScores.length / duration;
  const minFrames = Math.max(3, Math.floor(framesPerSec * 0.1));

  let startIdx = -1;
  let sum = 0;
  let count = 0;

  for (let i = 0; i < frameScores.length; i++) {
    if (frameScores[i] < threshold) {
      if (startIdx === -1) {
        startIdx = i;
        sum = 0;
        count = 0;
      }
      sum += frameScores[i];
      count++;
    } else {
      if (startIdx !== -1 && count >= minFrames) {
        regions.push({
          startTime: startIdx / framesPerSec,
          endTime: i / framesPerSec,
          avgScore: count > 0 ? sum / count : 0,
          description: '该区间发音差异较大，建议重点练习'
        });
      }
      startIdx = -1;
    }
  }

  if (startIdx !== -1 && count >= minFrames) {
    regions.push({
      startTime: startIdx / framesPerSec,
      endTime: frameScores.length / framesPerSec,
      avgScore: count > 0 ? sum / count : 0,
      description: '该区间发音差异较大，建议重点练习'
    });
  }

  return regions;
}

export function computeDifferenceMask(
  frameScores: number[],
  targetLength: number,
  threshold: number = 0.6
): number[] {
  const mask = new Array<number>(targetLength).fill(0);
  if (frameScores.length === 0) return mask;

  const scale = frameScores.length / targetLength;
  for (let i = 0; i < targetLength; i++) {
    const j = Math.floor(i * scale);
    const s = frameScores[Math.min(j, frameScores.length - 1)] || 0;
    mask[i] = s < threshold ? Math.pow(1 - s, 1.5) : 0;
  }
  return mask;
}

export function buildDifferenceMask(
  alignedA: number[],
  alignedB: number[],
  targetLength: number,
  threshold: number = 0.6
): number[] {
  const len = Math.min(alignedA.length, alignedB.length);
  const frameScores = new Array<number>(len);
  for (let k = 0; k < len; k++) {
    const diff = Math.abs(alignedA[k] - alignedB[k]);
    const s = Math.max(0, 1 - diff * 1.8);
    frameScores[k] = s;
  }
  return computeDifferenceMask(frameScores, targetLength, threshold);
}

export function computeFinalScore(
  avgFrameSim: number,
  spectrumSim: number,
  durationA: number,
  durationB: number
): number {
  const maxDur = Math.max(durationA, durationB, 0.001);
  const durationSim = 1 - Math.abs(durationA - durationB) / maxDur;
  const score01 = 0.6 * avgFrameSim + 0.25 * spectrumSim + 0.15 * Math.max(0, durationSim);
  const finalScore = Math.round(Math.max(0, Math.min(1, score01)) * 100);
  return finalScore;
}

export function extractFeatures(
  buffer: Buffer,
  mimeType?: string
): { features: AudioFeatures; parsed: ParsedAudio } {
  const parsed = parseAudioBuffer(buffer, mimeType);
  const decoded = parsed.pcm;
  const sampleRate = parsed.sampleRate;
  const duration = decoded.length / sampleRate;
  const waveformData = extractWaveform(decoded, WAVEFORM_POINTS);
  const spectrumData = extractSpectrum(decoded, SPECTRUM_DIM, 512);

  return {
    features: {
      decoded,
      sampleRate,
      duration,
      waveformData,
      spectrumData
    },
    parsed
  };
}

export function compareAudioFiles(
  featuresA: AudioFeatures,
  featuresB: AudioFeatures
): CompareResult {
  const waveformA = featuresA.waveformData;
  const waveformB = featuresB.waveformData;

  const { path } = dtwAlign(waveformA, waveformB);

  const { frameScores, alignedA, alignedB } = computeFrameScores(waveformA, waveformB, path);

  let avgFrameSim = 0;
  if (frameScores.length > 0) {
    for (let k = 0; k < frameScores.length; k++) avgFrameSim += frameScores[k];
    avgFrameSim /= frameScores.length;
  }

  const spectrumSim = cosineSimilarity(featuresA.spectrumData, featuresB.spectrumData);

  const maxDuration = Math.max(featuresA.duration, featuresB.duration);
  const differenceRegions = detectDifferenceRegions(
    frameScores,
    featuresA.sampleRate,
    maxDuration,
    0.6
  );

  const displayLength = Math.max(waveformA.length, waveformB.length, 512);
  const alignedWaveformA = resampleWaveform(alignedA, displayLength);
  const alignedWaveformB = resampleWaveform(alignedB, displayLength);
  const differenceMask = buildDifferenceMask(alignedA, alignedB, displayLength, 0.6);

  const score = computeFinalScore(avgFrameSim, spectrumSim, featuresA.duration, featuresB.duration);

  return {
    score,
    alignmentPath: path.slice(0, 1000),
    frameScores,
    differenceRegions,
    alignedWaveformA,
    alignedWaveformB,
    differenceMask
  };
}

function resampleWaveform(src: number[], targetLen: number): number[] {
  const dst = new Array<number>(targetLen);
  if (src.length === 0) return dst.fill(0);
  const scale = src.length / targetLen;
  for (let i = 0; i < targetLen; i++) {
    const j = Math.floor(i * scale);
    dst[i] = src[Math.min(j, src.length - 1)] || 0;
  }
  return dst;
}
