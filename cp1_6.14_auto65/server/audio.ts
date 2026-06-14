const SAMPLE_RATE = 22050;
const BITS_PER_SAMPLE = 16;
const NUM_CHANNELS = 1;
const BYTES_PER_SAMPLE = BITS_PER_SAMPLE / 8;

function createWavHeader(dataSize: number): Buffer {
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

function generateAudioSample(time: number, seed: number): number {
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

export function getAudioDurationSamples(durationSeconds: number): number {
  return Math.floor(SAMPLE_RATE * durationSeconds);
}

export function getTotalAudioSize(durationSeconds: number): number {
  const dataSize = getAudioDurationSamples(durationSeconds) * NUM_CHANNELS * BYTES_PER_SAMPLE;
  return 44 + dataSize;
}

export function generateWavChunk(
  durationSeconds: number,
  startSample: number,
  endSample: number,
  seed: number
): Buffer {
  const totalSamples = getAudioDurationSamples(durationSeconds);
  const actualEnd = Math.min(endSample, totalSamples);
  const numSamples = actualEnd - startSample;

  const buffer = Buffer.alloc(numSamples * BYTES_PER_SAMPLE);

  for (let i = 0; i < numSamples; i++) {
    const sampleIndex = startSample + i;
    const time = sampleIndex / SAMPLE_RATE;
    const sample = generateAudioSample(time, seed);
    const intSample = Math.floor(sample * 32767);
    buffer.writeInt16LE(intSample, i * BYTES_PER_SAMPLE);
  }

  return buffer;
}

export function generateFullWav(durationSeconds: number, seed: number): Buffer {
  const dataSize = getAudioDurationSamples(durationSeconds) * NUM_CHANNELS * BYTES_PER_SAMPLE;
  const header = createWavHeader(dataSize);
  const data = generateWavChunk(durationSeconds, 0, getAudioDurationSamples(durationSeconds), seed);
  return Buffer.concat([header, data]);
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
    start = Math.max(0, totalSize - suffixLength);
    end = totalSize - 1;
  } else if (startStr !== "" && endStr === "") {
    start = parseInt(startStr, 10);
    end = totalSize - 1;
  } else {
    start = parseInt(startStr, 10);
    end = parseInt(endStr, 10);
  }

  if (isNaN(start) || isNaN(end) || start > end || start >= totalSize) {
    return null;
  }

  end = Math.min(end, totalSize - 1);
  return { start, end };
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
