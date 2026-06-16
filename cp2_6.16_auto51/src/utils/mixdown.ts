import type { AudioTrack } from '../audio/AudioEngine';

function encodeWAV(
  samplesLeft: Float32Array,
  samplesRight: Float32Array,
  sampleRate: number
): ArrayBuffer {
  const numChannels = 2;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);

  const numSamples = samplesLeft.length;
  const dataSize = numSamples * numChannels * (bitsPerSample / 8);
  const bufferSize = 44 + dataSize;

  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);

  let offset = 0;

  function writeString(str: string): void {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
    offset += str.length;
  }

  function writeUint32(value: number): void {
    view.setUint32(offset, value, true);
    offset += 4;
  }

  function writeUint16(value: number): void {
    view.setUint16(offset, value, true);
    offset += 2;
  }

  writeString('RIFF');
  writeUint32(36 + dataSize);
  writeString('WAVE');
  writeString('fmt ');
  writeUint32(16);
  writeUint16(1);
  writeUint16(numChannels);
  writeUint32(sampleRate);
  writeUint32(byteRate);
  writeUint16(blockAlign);
  writeUint16(bitsPerSample);
  writeString('data');
  writeUint32(dataSize);

  const pcmLeft = new Int16Array(numSamples);
  const pcmRight = new Int16Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    let s1 = Math.max(-1, Math.min(1, samplesLeft[i]));
    let s2 = Math.max(-1, Math.min(1, samplesRight[i]));

    s1 = s1 < 0 ? s1 * 0x8000 : s1 * 0x7FFF;
    s2 = s2 < 0 ? s2 * 0x8000 : s2 * 0x7FFF;

    pcmLeft[i] = Math.round(s1);
    pcmRight[i] = Math.round(s2);
  }

  for (let i = 0; i < numSamples; i++) {
    view.setInt16(offset, pcmLeft[i], true);
    offset += 2;
    view.setInt16(offset, pcmRight[i], true);
    offset += 2;
  }

  return buffer;
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
  const totalSamples = Math.floor(sampleRate * duration);

  const mixedLeft = new Float32Array(totalSamples);
  const mixedRight = new Float32Array(totalSamples);

  const hasSolo = tracks.some(t => t.state.solo);

  for (const track of tracks) {
    if (!track.buffer || !track.state.playing) continue;

    let trackGain = track.state.volume;
    if (track.state.muted) trackGain = 0;
    if (hasSolo && !track.state.solo) trackGain = 0;

    if (trackGain === 0) continue;

    const trackLeft = track.buffer.getChannelData(0);
    const trackRight = track.buffer.numberOfChannels > 1
      ? track.buffer.getChannelData(1)
      : trackLeft;

    const bufferLength = track.buffer.length;
    const pan = track.state.pan;

    let leftGain: number;
    let rightGain: number;

    if (pan <= 0) {
      leftGain = 1;
      rightGain = 1 + pan;
    } else {
      leftGain = 1 - pan;
      rightGain = 1;
    }

    const finalLeftGain = trackGain * leftGain;
    const finalRightGain = trackGain * rightGain;

    for (let i = 0; i < totalSamples; i++) {
      const bufferIndex = i % bufferLength;

      mixedLeft[i] += trackLeft[bufferIndex] * finalLeftGain;
      mixedRight[i] += trackRight[bufferIndex] * finalRightGain;
    }
  }

  let peak = 0;
  for (let i = 0; i < totalSamples; i++) {
    const absL = Math.abs(mixedLeft[i] * masterVolume);
    const absR = Math.abs(mixedRight[i] * masterVolume);
    if (absL > peak) peak = absL;
    if (absR > peak) peak = absR;
  }

  const normalize = peak > 1 ? 1 / peak : 1;

  for (let i = 0; i < totalSamples; i++) {
    mixedLeft[i] = mixedLeft[i] * masterVolume * normalize;
    mixedRight[i] = mixedRight[i] * masterVolume * normalize;
  }

  const wavBuffer = encodeWAV(mixedLeft, mixedRight, sampleRate);
  return new Blob([wavBuffer], { type: 'audio/wav' });
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
  link.rel = 'noopener';
  document.body.appendChild(link);

  const clickHandler = () => {
    setTimeout(() => {
      URL.revokeObjectURL(url);
      if (link.parentNode) {
        document.body.removeChild(link);
      }
    }, 1500);
  };

  link.addEventListener('click', clickHandler, { once: true });
  link.click();
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

  return new Promise((resolve, reject) => {
    try {
      const blob = mixdownToWav(tracks, {
        sampleRate,
        duration,
        masterVolume
      });

      const fileName = generateFileName();
      resolve({ blob, fileName });
    } catch (err) {
      reject(err);
    }
  });
}
