import { Readable } from "stream";

export const SAMPLE_RATE = 22050;
export const BITS_PER_SAMPLE = 16;
export const NUM_CHANNELS = 1;
export const BYTES_PER_SAMPLE = BITS_PER_SAMPLE / 8;
export const BYTES_PER_SECOND = SAMPLE_RATE * NUM_CHANNELS * BYTES_PER_SAMPLE;

export function getTotalDataSize(durationSeconds: number): number {
  return Math.floor(SAMPLE_RATE * durationSeconds) * NUM_CHANNELS * BYTES_PER_SAMPLE;
}

export function getTotalWavSize(durationSeconds: number): number {
  return 44 + getTotalDataSize(durationSeconds);
}

export function createWavHeaderBuffer(dataSize: number): Buffer {
  const buffer = Buffer.alloc(44);
  const chunkSize = 36 + dataSize;

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(chunkSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(NUM_CHANNELS, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * NUM_CHANNELS * BYTES_PER_SAMPLE, 28);
  buffer.writeUInt16LE(NUM_CHANNELS * BYTES_PER_SAMPLE, 32);
  buffer.writeUInt16LE(BITS_PER_SAMPLE, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  return buffer;
}

function generateSampleValue(time: number, seed: number): number {
  const baseFreq = 180 + (seed % 80);
  const vibrato = Math.sin(2 * Math.PI * 4 * time) * 8;
  const freq = baseFreq + vibrato;

  const modulationFreq = 3 + (seed % 2) * 1.5;
  const modulation = (Math.sin(2 * Math.PI * modulationFreq * time) + 1) / 2;
  const envelope = 0.3 + modulation * 0.5;

  const harmonic1 = Math.sin(2 * Math.PI * freq * time) * 0.5;
  const harmonic2 = Math.sin(2 * Math.PI * freq * 2 * time) * 0.25;
  const harmonic3 = Math.sin(2 * Math.PI * freq * 3 * time) * 0.1;

  const noise = (Math.sin(time * 12345.678) * 0.5 + 0.5 - 0.5) * 0.05;

  const sample = (harmonic1 + harmonic2 + harmonic3 + noise) * envelope * 0.6;
  return Math.max(-1, Math.min(1, sample));
}

export function getSeedFromPodcastId(podcastId: string): number {
  let hash = 0;
  for (let i = 0; i < podcastId.length; i++) {
    const char = podcastId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash) % 1000;
}

export function parseRangeHeader(
  rangeHeader: string | undefined,
  totalSize: number
): { start: number; end: number } | null {
  if (!rangeHeader) return null;

  const match = rangeHeader.match(/^bytes=(\d*)-(\d*)$/);
  if (!match) return null;

  const startStr = match[1];
  const endStr = match[2];

  let start: number;
  let end: number;

  if (startStr === "" && endStr !== "") {
    const suffixLength = parseInt(endStr, 10);
    if (suffixLength <= 0) return null;
    start = Math.max(0, totalSize - suffixLength);
    end = totalSize - 1;
  } else if (startStr !== "" && endStr === "") {
    start = parseInt(startStr, 10);
    end = totalSize - 1;
  } else if (startStr !== "" && endStr !== "") {
    start = parseInt(startStr, 10);
    end = parseInt(endStr, 10);
  } else {
    return null;
  }

  if (isNaN(start) || isNaN(end) || start > end || start >= totalSize || end < 0) {
    return null;
  }

  end = Math.min(end, totalSize - 1);
  start = Math.max(0, start);
  return { start, end };
}

export function createWavReadableStream(
  durationSeconds: number,
  startByte: number,
  endByte: number,
  seed: number
): Readable {
  const totalDataSize = getTotalDataSize(durationSeconds);
  const totalWavSize = 44 + totalDataSize;

  let position = startByte;

  const headerBuffer = createWavHeaderBuffer(totalDataSize);

  const dataStartSample = Math.max(0, Math.floor((startByte - 44) / BYTES_PER_SAMPLE));
  let sampleCursor = dataStartSample;

  if (startByte < 44 && startByte > 0) {
    sampleCursor = 0;
  }

  const CHUNK_SAMPLES = SAMPLE_RATE * 0.5;

  const readable = new Readable({
    read() {
      if (position > endByte) {
        this.push(null);
        return;
      }

      const remainingBytes = endByte - position + 1;
      if (remainingBytes <= 0) {
        this.push(null);
        return;
      }

      const chunkSize = Math.min(CHUNK_SAMPLES * BYTES_PER_SAMPLE, remainingBytes);

      if (position < 44) {
        const headerEnd = Math.min(43, endByte);
        const headerSlice = headerBuffer.slice(position, headerEnd + 1);
        position = headerEnd + 1;
        this.push(headerSlice);
        return;
      }

      const samplesNeeded = Math.ceil(chunkSize / BYTES_PER_SAMPLE);
      const totalSamples = Math.floor(SAMPLE_RATE * durationSeconds);
      const samplesToGenerate = Math.min(samplesNeeded, totalSamples - sampleCursor);

      if (samplesToGenerate <= 0) {
        this.push(null);
        return;
      }

      const buffer = Buffer.alloc(samplesToGenerate * BYTES_PER_SAMPLE);

      for (let i = 0; i < samplesToGenerate; i++) {
        const time = (sampleCursor + i) / SAMPLE_RATE;
        const sample = generateSampleValue(time, seed);
        const intSample = Math.floor(sample * 32767);
        buffer.writeInt16LE(intSample, i * BYTES_PER_SAMPLE);
      }

      sampleCursor += samplesToGenerate;
      position += samplesToGenerate * BYTES_PER_SAMPLE;

      this.push(buffer);
    },
  });

  return readable;
}

export function createFullWavStream(durationSeconds: number, seed: number): Readable {
  const totalSize = getTotalWavSize(durationSeconds);
  return createWavReadableStream(durationSeconds, 0, totalSize - 1, seed);
}
