export interface AudioPeakData {
  peaks: number[];
  duration: number;
  sampleRate: number;
}

export interface AudioAnalysisResult {
  peaks: number[];
  duration: number;
  sampleRate: number;
  frequencyData: Uint8Array;
}

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private isPlaying = false;
  private startTime = 0;
  private pauseTime = 0;
  private lastFrequencyData: Uint8Array = new Uint8Array(128);

  constructor() {
    this.initAudioContext();
  }

  private initAudioContext(): void {
    if (typeof window === 'undefined') return;

    try {
      const AudioContextConstructor = window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

      if (!AudioContextConstructor) {
        console.warn('Web Audio API is not supported in this browser');
        return;
      }

      if (!this.audioContext) {
        this.audioContext = new AudioContextConstructor();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.8;
        this.gainNode = this.audioContext.createGain();
        this.analyser.connect(this.gainNode);
        this.gainNode.connect(this.audioContext.destination);
        console.log('AudioEngine initialized successfully');
      }
    } catch (error) {
      console.error('Failed to initialize AudioContext:', error);
    }
  }

  public async decodeAudio(arrayBuffer: ArrayBuffer): Promise<AudioPeakData> {
    if (!this.audioContext) {
      this.initAudioContext();
    }

    if (!this.audioContext) {
      throw new Error('AudioContext not available. Your browser may not support Web Audio API.');
    }

    try {
      const bufferCopy = arrayBuffer.slice(0);

      const buffer = await this.audioContext.decodeAudioData(
        bufferCopy,
        (decodedBuffer) => decodedBuffer,
        (error) => {
          console.error('decodeAudioData error:', error);
          throw new Error('Failed to decode audio data');
        }
      );

      if (!buffer) {
        throw new Error('Decoded audio buffer is empty');
      }

      const numberOfChannels = buffer.numberOfChannels;
      let channelData: Float32Array;

      if (numberOfChannels >= 1) {
        channelData = buffer.getChannelData(0);
        if (numberOfChannels > 1) {
          const channelData2 = buffer.getChannelData(1);
          for (let i = 0; i < channelData.length; i++) {
            channelData[i] = (channelData[i] + channelData2[i]) / 2;
          }
        }
      } else {
        throw new Error('Audio buffer has no channels');
      }

      const sampleRate = buffer.sampleRate;
      const duration = buffer.duration;

      if (!channelData || channelData.length === 0) {
        throw new Error('Failed to extract channel data from audio');
      }

      const peaks = this.extractPeaks(channelData, 1000);

      console.log(`Audio decoded: ${duration.toFixed(2)}s, ${sampleRate}Hz, ${peaks.length} peaks`);

      return { peaks, duration, sampleRate };
    } catch (error) {
      console.error('decodeAudio failed:', error);
      throw error;
    }
  }

  private extractPeaks(channelData: Float32Array, numPeaks: number): number[] {
    if (!channelData || channelData.length === 0) {
      return new Array(numPeaks).fill(0.5);
    }

    const peaks: number[] = [];
    const blockSize = Math.max(1, Math.floor(channelData.length / numPeaks));

    for (let i = 0; i < numPeaks; i++) {
      const start = i * blockSize;
      const end = Math.min(start + blockSize, channelData.length);
      let max = 0;
      let sum = 0;
      let count = 0;

      for (let j = start; j < end; j++) {
        const sample = channelData[j];
        if (typeof sample === 'number' && !isNaN(sample)) {
          const abs = Math.abs(sample);
          if (abs > max) max = abs;
          sum += abs;
          count++;
        }
      }

      const avg = count > 0 ? sum / count : 0;
      const normalizedPeak = Math.min(1, (max * 0.7 + avg * 0.3));
      peaks.push(Math.max(0.05, normalizedPeak));
    }

    return peaks;
  }

  public calculateFadeCurve(
    duration: number,
    fadeIn: number,
    fadeOut: number,
    sampleRate: number
  ): number[] {
    if (duration <= 0 || sampleRate <= 0) {
      return [];
    }

    const totalSamples = Math.max(1, Math.floor(duration * sampleRate));
    const fadeInSamples = Math.max(0, Math.floor(fadeIn * sampleRate));
    const fadeOutSamples = Math.max(0, Math.floor(fadeOut * sampleRate));
    const curve: number[] = new Array(totalSamples);

    for (let i = 0; i < totalSamples; i++) {
      let gain = 1;

      if (fadeInSamples > 0 && i < fadeInSamples) {
        gain = i / fadeInSamples;
        gain = this.applyEasing(gain);
      } else if (fadeOutSamples > 0 && i > totalSamples - fadeOutSamples) {
        const fadeOutPos = totalSamples - i;
        gain = fadeOutPos / fadeOutSamples;
        gain = this.applyEasing(gain);
      }

      curve[i] = Math.max(0, Math.min(1, gain));
    }

    return curve;
  }

  private applyEasing(t: number): number {
    const clampedT = Math.max(0, Math.min(1, t));
    return clampedT < 0.5
      ? 2 * clampedT * clampedT
      : 1 - Math.pow(-2 * clampedT + 2, 2) / 2;
  }

  public timestampToPosition(timestamp: number, totalDuration: number): number {
    if (totalDuration <= 0) return 0;
    return Math.min(Math.max(timestamp / totalDuration, 0), 1) * 100;
  }

  public positionToTimestamp(position: number, totalDuration: number): number {
    return Math.max(0, (position / 100) * totalDuration);
  }

  public getFrequencyData(): Uint8Array {
    if (!this.analyser) {
      return this.lastFrequencyData;
    }

    try {
      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      this.analyser.getByteFrequencyData(dataArray);

      let hasData = false;
      for (let i = 0; i < dataArray.length; i++) {
        if (dataArray[i] > 0) {
          hasData = true;
          break;
        }
      }

      if (hasData) {
        this.lastFrequencyData = dataArray;
      }

      return this.lastFrequencyData;
    } catch (error) {
      console.error('getFrequencyData error:', error);
      return this.lastFrequencyData;
    }
  }

  public async loadAudio(url: string): Promise<void> {
    if (!this.audioContext) {
      this.initAudioContext();
    }

    if (!this.audioContext) {
      throw new Error('AudioContext not available');
    }

    try {
      console.log(`Loading audio from: ${url}`);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

      console.log(`Audio loaded: ${this.audioBuffer.duration.toFixed(2)}s`);
    } catch (error) {
      console.error('loadAudio failed:', error);
      throw error;
    }
  }

  public play(offset: number = 0): void {
    if (!this.audioContext || !this.audioBuffer || !this.analyser || !this.gainNode) {
      console.warn('Cannot play: audio engine not fully initialized');
      return;
    }

    if (this.isPlaying) {
      this.stop();
    }

    try {
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      this.source = this.audioContext.createBufferSource();
      this.source.buffer = this.audioBuffer;
      this.source.connect(this.analyser);

      const startOffset = this.pauseTime > 0 ? this.pauseTime : Math.max(0, offset);
      this.source.start(0, startOffset);
      this.startTime = this.audioContext.currentTime - startOffset;
      this.isPlaying = true;

      this.source.onended = () => {
        if (this.isPlaying) {
          this.isPlaying = false;
          this.pauseTime = 0;
        }
      };

      console.log(`Playing from ${startOffset.toFixed(2)}s`);
    } catch (error) {
      console.error('Playback error:', error);
      this.isPlaying = false;
    }
  }

  public pause(): void {
    if (!this.isPlaying || !this.audioContext || !this.source) {
      return;
    }

    try {
      this.pauseTime = this.audioContext.currentTime - this.startTime;
      this.source.stop();
      this.isPlaying = false;
      console.log(`Paused at ${this.pauseTime.toFixed(2)}s`);
    } catch (error) {
      console.error('Pause error:', error);
    }
  }

  public stop(): void {
    if (this.source) {
      try {
        this.source.stop();
      } catch (e) {
        // Already stopped
      }
      try {
        this.source.disconnect();
      } catch (e) {
        // Ignore disconnect errors
      }
      this.source = null;
    }
    this.isPlaying = false;
    this.pauseTime = 0;
  }

  public getCurrentTime(): number {
    if (!this.audioContext) return this.pauseTime;
    if (this.isPlaying) {
      return Math.max(0, this.audioContext.currentTime - this.startTime);
    }
    return this.pauseTime;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getDuration(): number {
    return this.audioBuffer?.duration || 0;
  }

  public applyFadeGain(fadeIn: number, fadeOut: number, currentTime: number, duration: number): void {
    if (!this.gainNode || !this.audioContext) return;

    try {
      let gain = 1;

      if (currentTime < fadeIn && fadeIn > 0) {
        gain = currentTime / fadeIn;
        gain = this.applyEasing(gain);
      } else if (currentTime > duration - fadeOut && fadeOut > 0) {
        const remaining = duration - currentTime;
        gain = remaining / fadeOut;
        gain = this.applyEasing(gain);
      }

      const clampedGain = Math.max(0, Math.min(1, gain));
      this.gainNode.gain.setTargetAtTime(clampedGain, this.audioContext.currentTime, 0.01);
    } catch (error) {
      console.error('applyFadeGain error:', error);
    }
  }

  public async analyzeAudioBuffer(arrayBuffer: ArrayBuffer): Promise<AudioAnalysisResult> {
    const peakData = await this.decodeAudio(arrayBuffer);
    return {
      ...peakData,
      frequencyData: this.getFrequencyData()
    };
  }

  public getWaveformData(numBars: number = 64): number[] {
    const freqData = this.getFrequencyData();
    const step = Math.floor(freqData.length / numBars);
    const waveform: number[] = [];

    for (let i = 0; i < numBars; i++) {
      let sum = 0;
      for (let j = 0; j < step; j++) {
        sum += freqData[i * step + j] || 0;
      }
      waveform.push(sum / step / 255);
    }

    return waveform;
  }

  public destroy(): void {
    this.stop();
    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch (e) {
        // Ignore close errors
      }
      this.audioContext = null;
    }
    this.analyser = null;
    this.gainNode = null;
    this.audioBuffer = null;
    console.log('AudioEngine destroyed');
  }
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function getAverageFrequency(frequencyData: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < frequencyData.length; i++) {
    sum += frequencyData[i];
  }
  return sum / frequencyData.length;
}

export function frequencyToColor(frequency: number, maxFrequency: number = 255): string {
  const ratio = frequency / maxFrequency;
  const hue = 200 + ratio * 160;
  return `hsl(${hue}, 80%, 50%)`;
}
