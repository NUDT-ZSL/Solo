import type { RecordingNote, InstrumentType } from '../types';

const SAMPLE_RATE = 44100;
const BITS_PER_SAMPLE = 16;
const CHANNELS = 1;

function renderNoteAudio(
  frequency: number,
  volume: number,
  instrument: InstrumentType,
  startSample: number,
  totalSamples: number
): Float32Array {
  const durationSec = 1.5;
  const noteSamples = Math.min(
    Math.floor(durationSec * SAMPLE_RATE),
    totalSamples - startSample
  );
  const output = new Float32Array(totalSamples);
  if (noteSamples <= 0) return output;

  for (let i = 0; i < noteSamples; i++) {
    const t = i / SAMPLE_RATE;
    const progress = i / noteSamples;

    let envelope: number;
    if (progress < 0.01) {
      envelope = progress / 0.01;
    } else if (progress < 0.1) {
      envelope = 1 - (progress - 0.01) / 0.09 * 0.3;
    } else {
      envelope = 0.7 * Math.pow(1 - (progress - 0.1) / 0.9, 2);
    }

    let sample = 0;
    const v = Math.max(0.001, volume) * envelope;

    if (instrument === 'piano') {
      sample =
        0.6 * Math.sin(2 * Math.PI * frequency * t) +
        0.18 * Math.sin(2 * Math.PI * frequency * 2 * t) +
        0.1 * Math.sin(2 * Math.PI * frequency * 3 * t);
      sample *= v;
    } else if (instrument === 'strings') {
      const s1 = Math.sin(2 * Math.PI * frequency * t);
      const s2 = Math.sin(2 * Math.PI * frequency * 2 * t) * 0.5;
      const s3 = Math.sin(2 * Math.PI * frequency * 3 * t) * 0.25;
      const s4 = Math.sin(2 * Math.PI * frequency * 4 * t) * 0.125;
      const saw = (2 / Math.PI) * Math.atan(Math.tan(Math.PI * frequency * t));
      sample = ((s1 + s2 + s3 + s4) * 0.5 + saw * 0.3) * v;
    } else {
      const lfo = Math.sin(2 * Math.PI * 5 * t) * 30;
      const modulatedFreq = frequency + lfo;
      const square = Math.sign(Math.sin(2 * Math.PI * modulatedFreq * t));
      const low = Math.sin(2 * Math.PI * modulatedFreq * t);
      sample = (square * 0.5 + low * 0.4) * v * 0.5;
    }

    const idx = startSample + i;
    if (idx < totalSamples) {
      output[idx] += sample;
    }
  }

  return output;
}

export function exportToWAV(notes: RecordingNote[]): Blob {
  if (notes.length === 0) {
    return encodeWAV(new Float32Array(0));
  }

  const sorted = [...notes].sort((a, b) => a.relativeTime - b.relativeTime);
  const maxTime = sorted[sorted.length - 1].relativeTime + 2;
  const totalSamples = Math.floor(maxTime * SAMPLE_RATE);

  const mix = new Float32Array(totalSamples);
  const tempBuffers = notes.map(n => {
    const startSample = Math.floor(n.relativeTime * SAMPLE_RATE);
    return renderNoteAudio(
      n.frequency,
      Math.max(0, Math.min(1, n.volume)),
      n.instrument,
      startSample,
      totalSamples
    );
  });

  let peak = 0;
  for (let i = 0; i < totalSamples; i++) {
    let s = 0;
    for (const buf of tempBuffers) {
      s += buf[i];
    }
    mix[i] = s;
    if (Math.abs(s) > peak) peak = Math.abs(s);
  }

  if (peak > 1) {
    for (let i = 0; i < totalSamples; i++) {
      mix[i] /= peak;
    }
  }

  return encodeWAV(mix);
}

function encodeWAV(samples: Float32Array): Blob {
  const dataLength = samples.length * CHANNELS * (BITS_PER_SAMPLE / 8);
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, CHANNELS, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * CHANNELS * (BITS_PER_SAMPLE / 8), true);
  view.setUint16(32, CHANNELS * (BITS_PER_SAMPLE / 8), true);
  view.setUint16(34, BITS_PER_SAMPLE, true);
  writeStr(36, 'data');
  view.setUint32(40, dataLength, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([view], { type: 'audio/wav' });
}

export function downloadWAV(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
