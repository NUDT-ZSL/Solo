export interface MixTrackOptions {
  audioBuffer: AudioBuffer;
  gainDb: number;
  fadeInSec: number;
  fadeOutSec: number;
  isMuted: boolean;
  isSolo: boolean;
}

export interface MixOptions {
  tracks: MixTrackOptions[];
  masterGainDb?: number;
  targetSampleRate?: number;
  hasSoloTrack: boolean;
}

export class AudioMixer {
  private static sharedAudioContext: AudioContext | null = null;

  private static getAudioContext(sampleRate = 44100): AudioContext {
    if (AudioMixer.sharedAudioContext && AudioMixer.sharedAudioContext.sampleRate === sampleRate
        && AudioMixer.sharedAudioContext.state !== 'closed') {
      return AudioMixer.sharedAudioContext;
    }
    if (AudioMixer.sharedAudioContext && AudioMixer.sharedAudioContext.state !== 'closed') {
      void AudioMixer.sharedAudioContext.close();
    }
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    AudioMixer.sharedAudioContext = new AudioCtx({ sampleRate });
    return AudioMixer.sharedAudioContext;
  }

  public static async decodeAudio(blobOrUrl: Blob | string, sampleRate = 44100): Promise<AudioBuffer> {
    let arrayBuffer: ArrayBuffer;

    if (typeof blobOrUrl === 'string') {
      const response = await fetch(blobOrUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch audio: ${response.status}`);
      }
      arrayBuffer = await response.arrayBuffer();
    } else {
      arrayBuffer = await blobOrUrl.arrayBuffer();
    }

    const ctx = AudioMixer.getAudioContext(sampleRate);
    const copy = arrayBuffer.slice(0);
    try {
      return await ctx.decodeAudioData(copy);
    } catch (err) {
      try {
        const fallbackCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const buffer = await fallbackCtx.decodeAudioData(arrayBuffer.slice(0));
        await fallbackCtx.close();
        return buffer;
      } catch (err2) {
        throw new Error(`Audio decode failed: ${(err as Error).message || (err2 as Error).message}`);
      }
    }
  }

  public static dbToLinear(db: number): number {
    return Math.pow(10, db / 20);
  }

  public static applyGain(buffer: AudioBuffer, gainDb: number): AudioBuffer {
    const linearGain = AudioMixer.dbToLinear(gainDb);
    if (linearGain === 1) return buffer;

    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const length = buffer.length;
    const output = new AudioBuffer({ length, numberOfChannels: numChannels, sampleRate });

    for (let ch = 0; ch < numChannels; ch++) {
      const src = buffer.getChannelData(ch);
      const dst = output.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        dst[i] = src[i] * linearGain;
      }
    }

    return output;
  }

  public static applyFadeInOut(buffer: AudioBuffer, fadeInSec: number, fadeOutSec: number): AudioBuffer {
    const sampleRate = buffer.sampleRate;
    const fadeInSamples = Math.floor(fadeInSec * sampleRate);
    const fadeOutSamples = Math.floor(fadeOutSec * sampleRate);
    const totalSamples = buffer.length;

    if (fadeInSamples === 0 && fadeOutSamples === 0) return buffer;

    const numChannels = buffer.numberOfChannels;
    const output = new AudioBuffer({ length: totalSamples, numberOfChannels: numChannels, sampleRate });

    const fadeOutStart = totalSamples - fadeOutSamples;

    for (let ch = 0; ch < numChannels; ch++) {
      const src = buffer.getChannelData(ch);
      const dst = output.getChannelData(ch);

      for (let i = 0; i < totalSamples; i++) {
        let envelope = 1;

        if (i < fadeInSamples && fadeInSamples > 0) {
          envelope = i / fadeInSamples;
        }

        if (i >= fadeOutStart && fadeOutSamples > 0) {
          const fadeOutIdx = i - fadeOutStart;
          envelope = 1 - (fadeOutIdx / fadeOutSamples);
        }

        dst[i] = src[i] * envelope;
      }
    }

    return output;
  }

  public static resampleBuffer(buffer: AudioBuffer, targetSampleRate: number): AudioBuffer {
    if (buffer.sampleRate === targetSampleRate) return buffer;

    const numChannels = buffer.numberOfChannels;
    const duration = buffer.duration;
    const targetLength = Math.ceil(duration * targetSampleRate);
    const output = new AudioBuffer({ length: targetLength, numberOfChannels: numChannels, sampleRate: targetSampleRate });

    const ratio = buffer.length / targetLength;

    for (let ch = 0; ch < numChannels; ch++) {
      const src = buffer.getChannelData(ch);
      const dst = output.getChannelData(ch);

      for (let i = 0; i < targetLength; i++) {
        const srcIdx = i * ratio;
        const idx0 = Math.floor(srcIdx);
        const idx1 = Math.min(idx0 + 1, buffer.length - 1);
        const frac = srcIdx - idx0;
        dst[i] = src[idx0] * (1 - frac) + src[idx1] * frac;
      }
    }

    return output;
  }

  public static mixBuffers(options: MixOptions): AudioBuffer {
    const { tracks, masterGainDb = 0, targetSampleRate = 44100, hasSoloTrack } = options;

    if (tracks.length === 0) {
      return new AudioBuffer({ length: 1, numberOfChannels: 2, sampleRate: targetSampleRate });
    }

    const processedTracks: AudioBuffer[] = [];
    let maxLength = 0;

    for (const track of tracks) {
      const shouldPlay = hasSoloTrack ? (track.isSolo && !track.isMuted) : !track.isMuted;

      if (!shouldPlay || track.audioBuffer.length === 0) continue;

      let buf = AudioMixer.resampleBuffer(track.audioBuffer, targetSampleRate);
      buf = AudioMixer.applyGain(buf, track.gainDb);
      buf = AudioMixer.applyFadeInOut(buf, track.fadeInSec, track.fadeOutSec);

      if (buf.length > maxLength) maxLength = buf.length;

      processedTracks.push(buf);
    }

    if (processedTracks.length === 0) {
      return new AudioBuffer({ length: Math.max(1, maxLength), numberOfChannels: 2, sampleRate: targetSampleRate });
    }

    const numChannels = 2;
    const mixedBuffer = new AudioBuffer({ length: maxLength, numberOfChannels: numChannels, sampleRate: targetSampleRate });
    const leftOut = mixedBuffer.getChannelData(0);
    const rightOut = mixedBuffer.getChannelData(1);

    const masterLinear = AudioMixer.dbToLinear(masterGainDb);

    for (const trackBuf of processedTracks) {
      const trackChannels = trackBuf.numberOfChannels;
      const trackLen = trackBuf.length;

      if (trackChannels >= 2) {
        const tLeft = trackBuf.getChannelData(0);
        const tRight = trackBuf.getChannelData(1);
        for (let i = 0; i < trackLen; i++) {
          leftOut[i] += tLeft[i];
          rightOut[i] += tRight[i];
        }
      } else {
        const mono = trackBuf.getChannelData(0);
        for (let i = 0; i < trackLen; i++) {
          const s = mono[i];
          leftOut[i] += s;
          rightOut[i] += s;
        }
      }
    }

    for (let i = 0; i < maxLength; i++) {
      let l = leftOut[i] * masterLinear;
      let r = rightOut[i] * masterLinear;
      if (l > 1) l = 1;
      if (l < -1) l = -1;
      if (r > 1) r = 1;
      if (r < -1) r = -1;
      leftOut[i] = l;
      rightOut[i] = r;
    }

    return mixedBuffer;
  }

  public static encodeWAV(audioBuffer: AudioBuffer, isStereo = true, bitDepth = 16): ArrayBuffer {
    const numChannels = isStereo ? Math.min(2, audioBuffer.numberOfChannels) : 1;
    const sampleRate = audioBuffer.sampleRate;
    const numSamples = audioBuffer.length;
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = numSamples * blockAlign;
    const headerSize = 44;
    const totalSize = headerSize + dataSize;

    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);

    const writeString = (offset: number, str: string): void => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, totalSize - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    let offset = headerSize;

    if (numChannels === 2 && audioBuffer.numberOfChannels >= 2) {
      const left = audioBuffer.getChannelData(0);
      const right = audioBuffer.getChannelData(1);

      for (let i = 0; i < numSamples; i++) {
        const lSample = Math.max(-1, Math.min(1, left[i]));
        const rSample = Math.max(-1, Math.min(1, right[i]));

        if (bitDepth === 16) {
          view.setInt16(offset, Math.round(lSample * 0x7FFF), true);
          offset += 2;
          view.setInt16(offset, Math.round(rSample * 0x7FFF), true);
          offset += 2;
        } else if (bitDepth === 32) {
          view.setFloat32(offset, lSample, true);
          offset += 4;
          view.setFloat32(offset, rSample, true);
          offset += 4;
        }
      }
    } else {
      const mono = audioBuffer.numberOfChannels >= 1 ? audioBuffer.getChannelData(0) : new Float32Array(numSamples);

      for (let i = 0; i < numSamples; i++) {
        const sample = Math.max(-1, Math.min(1, mono[i]));

        if (bitDepth === 16) {
          const s = Math.round(sample * 0x7FFF);
          if (numChannels === 2) {
            view.setInt16(offset, s, true);
            offset += 2;
            view.setInt16(offset, s, true);
            offset += 2;
          } else {
            view.setInt16(offset, s, true);
            offset += 2;
          }
        } else if (bitDepth === 32) {
          if (numChannels === 2) {
            view.setFloat32(offset, sample, true);
            offset += 4;
            view.setFloat32(offset, sample, true);
            offset += 4;
          } else {
            view.setFloat32(offset, sample, true);
            offset += 4;
          }
        }
      }
    }

    return buffer;
  }

  public static downloadWAV(arrayBuffer: ArrayBuffer, filename = 'mixdown.wav'): void {
    const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 5000);
  }

  public static async processAndExport(options: {
    tracks: Array<{
      blobOrUrl: Blob | string | null;
      gainDb: number;
      fadeInSec: number;
      fadeOutSec: number;
      isMuted: boolean;
      isSolo: boolean;
    }>;
    masterGainDb?: number;
    targetSampleRate?: number;
    onProgress?: (percent: number) => void;
  }): Promise<void> {
    const { tracks, masterGainDb = 0, targetSampleRate = 44100, onProgress } = options;

    const validTracks = tracks.filter((t) => t.blobOrUrl !== null);
    const hasSoloTrack = tracks.some((t) => t.isSolo);
    const totalSteps = validTracks.length + 3;
    let step = 0;

    const processedOptions: MixTrackOptions[] = [];

    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      if (!track.blobOrUrl) {
        continue;
      }

      try {
        const audioBuffer = await AudioMixer.decodeAudio(track.blobOrUrl, targetSampleRate);
        processedOptions.push({
          audioBuffer,
          gainDb: track.gainDb,
          fadeInSec: track.fadeInSec,
          fadeOutSec: track.fadeOutSec,
          isMuted: track.isMuted,
          isSolo: track.isSolo,
        });
      } catch (err) {
        console.warn(`Track ${i + 1} decode failed, skipping:`, err);
      }

      step++;
      onProgress?.((step / totalSteps) * 100);
    }

    onProgress?.(((validTracks.length + 1) / totalSteps) * 100);

    const mixed = AudioMixer.mixBuffers({
      tracks: processedOptions,
      masterGainDb,
      targetSampleRate,
      hasSoloTrack,
    });

    onProgress?.(((validTracks.length + 2) / totalSteps) * 100);

    const wavBuffer = AudioMixer.encodeWAV(mixed, true, 16);

    onProgress?.(((validTracks.length + 3) / totalSteps) * 100);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    AudioMixer.downloadWAV(wavBuffer, `mixdown_${timestamp}.wav`);
  }
}
