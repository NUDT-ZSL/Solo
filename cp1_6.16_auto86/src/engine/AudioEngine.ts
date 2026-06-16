import { AudioClip, SAMPLE_RATE, MAX_DURATION, WaveformData } from '../types';

export function extractPeaks(pcmData: Float32Array, samplesPerPixel: number): Float32Array {
  const resultLength = Math.ceil(pcmData.length / samplesPerPixel);
  const peaks = new Float32Array(resultLength);
  for (let i = 0; i < resultLength; i++) {
    const start = i * samplesPerPixel;
    const end = Math.min(start + samplesPerPixel, pcmData.length);
    let max = 0;
    for (let j = start; j < end; j++) {
      const abs = Math.abs(pcmData[j]);
      if (abs > max) max = abs;
    }
    peaks[i] = max;
  }
  return peaks;
}

export function generateWaveformData(pcmData: Float32Array, sampleRate: number, targetWidth: number): WaveformData {
  const duration = pcmData.length / sampleRate;
  const samplesPerPixel = Math.max(1, Math.floor(pcmData.length / targetWidth));
  const peaks = extractPeaks(pcmData, samplesPerPixel);
  return { peaks, sampleRate, duration };
}

export function computeVolumeGain(volume: number): number {
  return volume / 100;
}

export function generateFadeInCurve(length: number, duration: number, fadeInSec: number, mode: 'linear' | 'exponential' = 'linear'): Float32Array {
  const curve = new Float32Array(length);
  const fadeInSamples = Math.min(Math.floor(fadeInSec * SAMPLE_RATE), length);
  for (let i = 0; i < length; i++) {
    if (i < fadeInSamples && fadeInSamples > 0) {
      const t = i / fadeInSamples;
      curve[i] = mode === 'linear' ? t : Math.pow(t, 2);
    } else {
      curve[i] = 1.0;
    }
  }
  return curve;
}

export function generateFadeOutCurve(length: number, duration: number, fadeOutSec: number, mode: 'linear' | 'exponential' = 'linear'): Float32Array {
  const curve = new Float32Array(length);
  const fadeOutSamples = Math.min(Math.floor(fadeOutSec * SAMPLE_RATE), length);
  for (let i = 0; i < length; i++) {
    const fromEnd = length - 1 - i;
    if (fromEnd < fadeOutSamples && fadeOutSamples > 0) {
      const t = fromEnd / fadeOutSamples;
      curve[i] = mode === 'linear' ? t : Math.pow(t, 2);
    } else {
      curve[i] = 1.0;
    }
  }
  return curve;
}

export function applyClipProcessing(clip: AudioClip): Float32Array {
  const trimStartSample = Math.floor(clip.trimStart * clip.sampleRate);
  const trimEndSample = Math.floor(clip.trimEnd * clip.sampleRate);
  const actualEnd = Math.min(trimEndSample, clip.pcmData.length);
  const trimmedLength = Math.max(0, actualEnd - trimStartSample);
  if (trimmedLength === 0) return new Float32Array(0);

  const trimmed = clip.pcmData.slice(trimStartSample, actualEnd);
  const gain = computeVolumeGain(clip.volume);
  const fadeInCurve = generateFadeInCurve(trimmedLength, clip.duration, clip.fadeIn);
  const fadeOutCurve = generateFadeOutCurve(trimmedLength, clip.duration, clip.fadeOut);

  const processed = new Float32Array(trimmedLength);
  for (let i = 0; i < trimmedLength; i++) {
    processed[i] = trimmed[i] * gain * fadeInCurve[i] * fadeOutCurve[i];
  }
  return processed;
}

export function mixClips(clips: AudioClip[], totalDurationSec: number): Float32Array {
  const totalSamples = Math.min(Math.floor(totalDurationSec * SAMPLE_RATE), MAX_DURATION * SAMPLE_RATE);
  const mixBuffer = new Float64Array(totalSamples);

  for (const clip of clips) {
    const processed = applyClipProcessing(clip);
    const startOffset = Math.floor(clip.startTime * SAMPLE_RATE);
    const copyLength = Math.min(processed.length, totalSamples - startOffset);
    if (startOffset < 0 || copyLength <= 0) continue;

    const resampled = resampleIfNeeded(processed, clip.sampleRate, SAMPLE_RATE);
    const resampledCopyLength = Math.min(resampled.length, totalSamples - startOffset);

    for (let i = 0; i < resampledCopyLength; i++) {
      mixBuffer[startOffset + i] += resampled[i];
    }
  }

  let peak = 0;
  for (let i = 0; i < totalSamples; i++) {
    const abs = Math.abs(mixBuffer[i]);
    if (abs > peak) peak = abs;
  }

  const normalized = new Float32Array(totalSamples);
  if (peak > 1.0) {
    const scale = 0.95 / peak;
    for (let i = 0; i < totalSamples; i++) {
      normalized[i] = mixBuffer[i] * scale;
    }
  } else {
    for (let i = 0; i < totalSamples; i++) {
      normalized[i] = mixBuffer[i];
    }
  }

  return normalized;
}

export function resampleIfNeeded(data: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) return data;
  const ratio = toRate / fromRate;
  const newLength = Math.floor(data.length * ratio);
  const result = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const srcIdx = i / ratio;
    const idx0 = Math.floor(srcIdx);
    const idx1 = Math.min(idx0 + 1, data.length - 1);
    const frac = srcIdx - idx0;
    result[i] = data[idx0] * (1 - frac) + data[idx1] * frac;
  }
  return result;
}

export function float32ToWav(pcmData: Float32Array, sampleRate: number, channels: number = 2): ArrayBuffer {
  const numSamples = pcmData.length;
  const bytesPerSample = 2;
  const blockAlign = channels * bytesPerSample;
  const dataSize = numSamples * blockAlign;
  const headerSize = 44;
  const buffer = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const sample = Math.max(-1, Math.min(1, pcmData[i]));
    const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    const intVal = Math.round(intSample);
    for (let ch = 0; ch < channels; ch++) {
      view.setInt16(offset, intVal, true);
      offset += 2;
    }
  }

  return buffer;
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

export async function exportMix(
  clips: AudioClip[],
  onProgress: (pct: number) => void
): Promise<ArrayBuffer> {
  const totalDuration = clips.reduce((max, c) => {
    const end = c.startTime + (c.trimEnd - c.trimStart);
    return end > max ? end : max;
  }, 0);
  const clampedDuration = Math.min(totalDuration, MAX_DURATION);

  const totalSteps = clips.length + 2;
  let step = 0;

  onProgress((step / totalSteps) * 100);

  await new Promise<void>((r) => setTimeout(r, 50));
  step++;

  const mixed = mixClips(clips, clampedDuration);
  onProgress((step / totalSteps) * 100);

  await new Promise<void>((r) => setTimeout(r, 50));
  step++;

  const wavBuffer = float32ToWav(mixed, SAMPLE_RATE, 2);
  onProgress(100);

  return wavBuffer;
}

export function decodeAudioFile(arrayBuffer: ArrayBuffer): Promise<{ pcmData: Float32Array; sampleRate: number; channels: number; duration: number }> {
  return new Promise((resolve, reject) => {
    const audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
    audioContext.decodeAudioData(arrayBuffer).then((audioBuffer) => {
      const channels = audioBuffer.numberOfChannels;
      const length = audioBuffer.length;
      const sampleRate = audioBuffer.sampleRate;
      const pcmData = new Float32Array(length);

      if (channels === 1) {
        pcmData.set(audioBuffer.getChannelData(0));
      } else {
        for (let i = 0; i < length; i++) {
          let sum = 0;
          for (let ch = 0; ch < channels; ch++) {
            sum += audioBuffer.getChannelData(ch)[i];
          }
          pcmData[i] = sum / channels;
        }
      }

      const duration = length / sampleRate;
      audioContext.close();
      resolve({ pcmData, sampleRate, duration, channels });
    }).catch(reject);
  });
}
