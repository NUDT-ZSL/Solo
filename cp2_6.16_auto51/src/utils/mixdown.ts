import type { AudioTrack } from '../audio/AudioEngine';

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

function writeWavHeader(
  view: DataView,
  sampleRate: number,
  bitsPerSample: number,
  numChannels: number,
  dataLength: number
): void {
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const chunkSize = 36 + dataLength;

  writeString(view, 0, 'RIFF');
  view.setUint32(4, chunkSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);
}

function floatTo16BitPCM(
  view: DataView,
  offset: number,
  left: Float32Array,
  right: Float32Array,
  length: number
): void {
  for (let i = 0; i < length; i++) {
    const leftSample = Math.max(-1, Math.min(1, left[i]));
    const rightSample = Math.max(-1, Math.min(1, right[i]));

    const leftInt = Math.round(leftSample * 32767);
    const rightInt = Math.round(rightSample * 32767);

    view.setInt16(offset + i * 4, leftInt, true);
    view.setInt16(offset + i * 4 + 2, rightInt, true);
  }
}

export interface MixdownOptions {
  sampleRate: number;
  duration: number;
  masterVolume: number;
}

export function mixdownToWav(
  tracks: AudioTrack[],
  options: MixdownOptions
): Blob {
  const { sampleRate, duration, masterVolume } = options;
  const numChannels = 2;
  const bitsPerSample = 16;
  const totalSamples = Math.floor(sampleRate * duration);

  const mixedLeft = new Float32Array(totalSamples);
  const mixedRight = new Float32Array(totalSamples);

  const hasSolo = tracks.some(t => t.state.solo);

  for (const track of tracks) {
    if (!track.buffer || !track.state.playing) continue;

    let trackGain = track.state.volume;
    if (track.state.muted) trackGain = 0;
    if (hasSolo && !track.state.solo) trackGain = 0;

    const trackLeft = track.buffer.getChannelData(0);
    const trackRight = track.buffer.numberOfChannels > 1
      ? track.buffer.getChannelData(1)
      : trackLeft;

    const bufferLength = track.buffer.length;
    const pan = track.state.pan;
    const panLeft = Math.max(0, Math.min(1, pan <= 0 ? 1 : 1 - pan * 0.7));
    const panRight = Math.max(0, Math.min(1, pan >= 0 ? 1 : 1 + pan * 0.7));

    for (let i = 0; i < totalSamples; i++) {
      const bufferIndex = i % bufferLength;

      mixedLeft[i] += trackLeft[bufferIndex] * trackGain * panLeft;
      mixedRight[i] += trackRight[bufferIndex] * trackGain * panRight;
    }
  }

  for (let i = 0; i < totalSamples; i++) {
    mixedLeft[i] *= masterVolume;
    mixedRight[i] *= masterVolume;

    mixedLeft[i] = Math.max(-1, Math.min(1, mixedLeft[i]));
    mixedRight[i] = Math.max(-1, Math.min(1, mixedRight[i]));
  }

  const dataLength = totalSamples * numChannels * (bitsPerSample / 8);
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  writeWavHeader(view, sampleRate, bitsPerSample, numChannels, dataLength);
  floatTo16BitPCM(view, 44, mixedLeft, mixedRight, totalSamples);

  return new Blob([buffer], { type: 'audio/wav' });
}

export function generateFileName(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return `master_mix_${year}${month}${day}_${hours}${minutes}${seconds}.wav`;
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

export interface MixdownResult {
  blob: Blob;
  fileName: string;
}

export async function performMixdown(
  tracks: AudioTrack[],
  sampleRate: number,
  masterVolume: number
): Promise<MixdownResult> {
  const playingTracks = tracks.filter(t => t.state.playing && t.buffer);
  const duration = playingTracks.length > 0
    ? Math.max(...playingTracks.map(t => t.buffer?.duration ?? 0))
    : 8;

  const blob = mixdownToWav(tracks, {
    sampleRate,
    duration,
    masterVolume
  });

  const fileName = generateFileName();

  return { blob, fileName };
}
