export type ExportFormat = 'wav' | 'mp3';
export type SampleRate = 44100 | 48000;

export async function exportAudio(
  audioBuffer: AudioBuffer,
  format: ExportFormat,
  sampleRate: SampleRate,
  fileName: string = 'soundcanvas-export'
): Promise<void> {
  let blob: Blob;

  if (format === 'wav') {
    blob = encodeWAV(audioBuffer);
  } else if (format === 'mp3') {
    blob = await encodeMP3(audioBuffer, sampleRate);
  } else {
    throw new Error(`Unsupported format: ${format}`);
  }

  triggerDownload(blob, `${fileName}.${format}`);
}

function encodeWAV(audioBuffer: AudioBuffer): Blob {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const numSamples = audioBuffer.length;

  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  const channels: Float32Array[] = [];
  for (let i = 0; i < numChannels; i++) {
    channels.push(audioBuffer.getChannelData(i));
  }

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

async function encodeMP3(audioBuffer: AudioBuffer, targetSampleRate: SampleRate): Promise<Blob> {
  try {
    const lamejs = await import('lamejs');
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;

    const leftChannel = audioBuffer.getChannelData(0);
    const rightChannel = numChannels > 1 ? audioBuffer.getChannelData(1) : audioBuffer.getChannelData(0);

    const leftInt = floatToInt16(leftChannel);
    const rightInt = floatToInt16(rightChannel);

    const mp3encoder = new lamejs.Mp3Encoder(numChannels, targetSampleRate, 128);
    const mp3Data: Int8Array[] = [];

    const sampleBlockSize = 1152;
    for (let i = 0; i < leftInt.length; i += sampleBlockSize) {
      const leftChunk = leftInt.subarray(i, i + sampleBlockSize);
      const rightChunk = rightInt.subarray(i, i + sampleBlockSize);
      const mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
      if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
      }
    }

    const endBuf = mp3encoder.flush();
    if (endBuf.length > 0) {
      mp3Data.push(endBuf);
    }

    return new Blob(mp3Data, { type: 'audio/mp3' });
  } catch (e) {
    console.warn('lamejs not available, falling back to WAV export for MP3:', e);
    return encodeWAV(audioBuffer);
  }
}

function floatToInt16(buffer: Float32Array): Int16Array {
  const len = buffer.length;
  const result = new Int16Array(len);
  for (let i = 0; i < len; i++) {
    const val = Math.max(-1, Math.min(1, buffer[i]));
    result[i] = val < 0 ? val * 0x8000 : val * 0x7fff;
  }
  return result;
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

export async function audioBufferToWavBlob(audioBuffer: AudioBuffer): Promise<Blob> {
  return encodeWAV(audioBuffer);
}

export async function audioBufferToMp3Blob(audioBuffer: AudioBuffer, sampleRate: SampleRate): Promise<Blob> {
  return encodeMP3(audioBuffer, sampleRate);
}

export default {
  exportAudio,
  audioBufferToWavBlob,
  audioBufferToMp3Blob,
};
