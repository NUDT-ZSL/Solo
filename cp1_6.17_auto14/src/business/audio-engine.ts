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

const FALLBACK_PEAK_COUNT = 1000;
const FALLBACK_FREQ_COUNT = 128;

function generateFallbackPeaks(count: number): number[] {
  const peaks: number[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / count;
    const wave1 = Math.sin(t * Math.PI * 8) * 0.3;
    const wave2 = Math.sin(t * Math.PI * 20) * 0.2;
    const noise = (Math.random() - 0.5) * 0.2;
    peaks.push(Math.max(0.05, Math.min(1, 0.5 + wave1 + wave2 + noise)));
  }
  return peaks;
}

function generateFallbackFrequencyData(count: number, intensity: number = 0.3): Uint8Array {
  const data = new Uint8Array(count);
  for (let i = 0; i < count; i++) {
    const t = i / count;
    const base = Math.sin(t * Math.PI) * 200 * intensity;
    const noise = Math.random() * 50 * intensity;
    data[i] = Math.min(255, Math.max(0, Math.floor(base + noise)));
  }
  return data;
}

function decodeAudioDataFallback(
  ctx: AudioContext,
  arrayBuffer: ArrayBuffer
): Promise<AudioBuffer> {
  return new Promise((resolve, reject) => {
    try {
      ctx.decodeAudioData(
        arrayBuffer.slice(0),
        (buffer) => resolve(buffer),
        (err) => {
          console.warn('Legacy decodeAudioData callback failed, trying promise:', err);
          ctx.decodeAudioData(arrayBuffer.slice(0))
            .then(resolve)
            .catch(reject);
        }
      );
    } catch (err) {
      reject(err);
    }
  });
}

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private htmlAudioElement: HTMLAudioElement | null = null;
  private isPlaying = false;
  private startTime = 0;
  private pauseTime = 0;
  private lastFrequencyData: Uint8Array = generateFallbackFrequencyData(FALLBACK_FREQ_COUNT, 0);
  private supportsWebAudio = true;
  private needsUserInteraction = false;
  private frequencyAnimationFrame = 0;
  private simulatedTime = 0;

  constructor() {
    this.initAudioContext();
  }

  private initAudioContext(): void {
    if (typeof window === 'undefined') {
      this.supportsWebAudio = false;
      return;
    }

    try {
      const AudioContextConstructor =
        (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

      if (!AudioContextConstructor) {
        console.warn('Web Audio API is not supported in this browser, using fallback mode');
        this.supportsWebAudio = false;
        return;
      }

      this.audioContext = new AudioContextConstructor();

      if (this.audioContext.state === 'suspended') {
        this.needsUserInteraction = true;
        console.log('AudioContext suspended, waiting for user interaction');
      }

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;

      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 1;

      this.analyser.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);

      this.startFrequencySimulation();
      console.log('AudioEngine initialized successfully (supportsWebAudio: true)');
    } catch (error) {
      console.error('Failed to initialize AudioContext, using fallback mode:', error);
      this.supportsWebAudio = false;
      this.audioContext = null;
      this.analyser = null;
      this.gainNode = null;
    }
  }

  private startFrequencySimulation(): void {
    if (this.frequencyAnimationFrame) {
      cancelAnimationFrame(this.frequencyAnimationFrame);
    }

    const animate = () => {
      if (this.isPlaying && this.supportsWebAudio && this.analyser) {
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
        } catch (e) {
          this.simulateFrequency();
        }
      } else if (this.isPlaying && !this.supportsWebAudio) {
        this.simulateFrequency();
      }
      this.frequencyAnimationFrame = requestAnimationFrame(animate);
    };

    this.frequencyAnimationFrame = requestAnimationFrame(animate);
  }

  private simulateFrequency(): void {
    this.simulatedTime += 0.016;
    const intensity = 0.4 + Math.sin(this.simulatedTime * 2) * 0.2 + Math.random() * 0.1;
    this.lastFrequencyData = generateFallbackFrequencyData(FALLBACK_FREQ_COUNT, intensity);
  }

  public async resumeOnUserInteraction(): Promise<void> {
    if (!this.audioContext || !this.needsUserInteraction) return;

    try {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
        this.needsUserInteraction = false;
        console.log('AudioContext resumed successfully');
      }
    } catch (error) {
      console.error('Failed to resume AudioContext:', error);
    }
  }

  public async decodeAudio(arrayBuffer: ArrayBuffer): Promise<AudioPeakData> {
    if (!this.supportsWebAudio || !this.audioContext) {
      console.log('Web Audio not supported, using fallback peak data');
      return {
        peaks: generateFallbackPeaks(FALLBACK_PEAK_COUNT),
        duration: 180,
        sampleRate: 44100
      };
    }

    try {
      if (this.audioContext.state === 'suspended') {
        await this.resumeOnUserInteraction();
      }

      const buffer = await decodeAudioDataFallback(this.audioContext, arrayBuffer);

      if (!buffer) {
        throw new Error('Decoded audio buffer is empty');
      }

      const numberOfChannels = buffer.numberOfChannels;
      let channelData: Float32Array | null = null;

      try {
        if (numberOfChannels >= 1) {
          const monoData = buffer.getChannelData(0);
          channelData = new Float32Array(monoData.length);

          if (numberOfChannels > 1) {
            const rightData = buffer.getChannelData(1);
            for (let i = 0; i < monoData.length; i++) {
              channelData[i] = (monoData[i] + rightData[i]) / 2;
            }
          } else {
            channelData.set(monoData);
          }
        }
      } catch (channelErr) {
        console.warn('getChannelData failed, using fallback peaks:', channelErr);
        return {
          peaks: generateFallbackPeaks(FALLBACK_PEAK_COUNT),
          duration: buffer.duration || 180,
          sampleRate: buffer.sampleRate || 44100
        };
      }

      const sampleRate = buffer.sampleRate;
      const duration = buffer.duration;

      if (!channelData || channelData.length === 0) {
        return {
          peaks: generateFallbackPeaks(FALLBACK_PEAK_COUNT),
          duration,
          sampleRate
        };
      }

      const peaks = this.extractPeaks(channelData, FALLBACK_PEAK_COUNT);

      return { peaks, duration, sampleRate };
    } catch (error) {
      console.error('decodeAudio failed, using fallback:', error);
      return {
        peaks: generateFallbackPeaks(FALLBACK_PEAK_COUNT),
        duration: 180,
        sampleRate: 44100
      };
    }
  }

  private extractPeaks(channelData: Float32Array, numPeaks: number): number[] {
    if (!channelData || channelData.length === 0) {
      return generateFallbackPeaks(numPeaks);
    }

    try {
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
          if (typeof sample === 'number' && !isNaN(sample) && isFinite(sample)) {
            const abs = Math.abs(sample);
            if (abs > max) max = abs;
            sum += abs;
            count++;
          }
        }

        if (count > 0) {
          const avg = sum / count;
          const normalizedPeak = Math.min(1, (max * 0.7 + avg * 0.3));
          peaks.push(Math.max(0.05, normalizedPeak));
        } else {
          peaks.push(0.1);
        }
      }

      return peaks;
    } catch (err) {
      console.warn('extractPeaks failed, using fallback:', err);
      return generateFallbackPeaks(numPeaks);
    }
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

    try {
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
    } catch (err) {
      console.warn('calculateFadeCurve failed:', err);
      return [];
    }
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
    if (!this.supportsWebAudio || !this.analyser) {
      if (this.isPlaying) {
        this.simulateFrequency();
      }
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
      console.warn('getFrequencyData error, using fallback:', error);
      return this.lastFrequencyData;
    }
  }

  public async loadAudio(url: string): Promise<void> {
    if (this.needsUserInteraction && this.audioContext) {
      try {
        await this.resumeOnUserInteraction();
      } catch (e) {
        // Continue even if resume fails
      }
    }

    if (!this.supportsWebAudio || !this.audioContext) {
      try {
        if (!this.htmlAudioElement) {
          this.htmlAudioElement = new Audio();
          this.htmlAudioElement.crossOrigin = 'anonymous';
        }
        this.htmlAudioElement.src = url;
        await this.htmlAudioElement.load();
        console.log('Fallback audio loaded via HTMLAudioElement');
        return;
      } catch (fallbackErr) {
        console.warn('Fallback audio load also failed:', fallbackErr);
      }
      throw new Error('Audio loading not supported in this environment');
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      this.audioBuffer = await decodeAudioDataFallback(this.audioContext, arrayBuffer);
    } catch (error) {
      console.error('Web Audio load failed, trying HTMLAudio fallback:', error);
      try {
        if (!this.htmlAudioElement) {
          this.htmlAudioElement = new Audio();
          this.htmlAudioElement.crossOrigin = 'anonymous';
        }
        this.htmlAudioElement.src = url;
        await this.htmlAudioElement.load();
      } catch (fallbackErr) {
        throw fallbackErr instanceof Error ? fallbackErr : new Error('Failed to load audio');
      }
    }
  }

  public play(offset: number = 0): void {
    if (!this.supportsWebAudio || !this.audioContext || !this.audioBuffer || !this.analyser || !this.gainNode) {
      if (this.htmlAudioElement) {
        try {
          this.htmlAudioElement.currentTime = this.pauseTime > 0 ? this.pauseTime : Math.max(0, offset);
          this.htmlAudioElement.play().then(() => {
            this.isPlaying = true;
            this.startTime = performance.now() / 1000 - (this.pauseTime > 0 ? this.pauseTime : offset);
          }).catch(err => {
            console.warn('HTML audio play failed:', err);
          });
        } catch (e) {
          console.warn('Fallback play failed:', e);
          this.isPlaying = true;
          this.pauseTime = 0;
        }
      } else {
        this.isPlaying = true;
        this.pauseTime = 0;
        this.startTime = performance.now() / 1000 - Math.max(0, offset);
      }
      return;
    }

    if (this.isPlaying) {
      this.stop();
    }

    try {
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
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
    } catch (error) {
      console.error('Playback error:', error);
      this.isPlaying = true;
      this.startTime = performance.now() / 1000 - Math.max(0, offset);
    }
  }

  public pause(): void {
    if (!this.isPlaying) return;

    if (!this.supportsWebAudio || !this.audioContext || !this.source) {
      if (this.htmlAudioElement) {
        try {
          this.pauseTime = this.htmlAudioElement.currentTime;
          this.htmlAudioElement.pause();
        } catch (e) {
          this.pauseTime = this.getCurrentTime();
        }
      } else {
        this.pauseTime = this.getCurrentTime();
      }
      this.isPlaying = false;
      return;
    }

    try {
      this.pauseTime = this.audioContext.currentTime - this.startTime;
      this.source.stop();
      this.isPlaying = false;
    } catch (error) {
      console.warn('Pause error:', error);
      this.pauseTime = this.getCurrentTime();
      this.isPlaying = false;
    }
  }

  public stop(): void {
    if (this.source) {
      try {
        this.source.onended = null;
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
    if (this.htmlAudioElement) {
      try {
        this.htmlAudioElement.pause();
        this.htmlAudioElement.currentTime = 0;
      } catch (e) {
        // Ignore
      }
    }
    this.isPlaying = false;
    this.pauseTime = 0;
  }

  public getCurrentTime(): number {
    if (!this.supportsWebAudio || !this.audioContext) {
      if (this.htmlAudioElement) {
        return this.htmlAudioElement.currentTime || this.pauseTime;
      }
      if (this.isPlaying) {
        return Math.max(0, performance.now() / 1000 - this.startTime);
      }
      return this.pauseTime;
    }

    if (this.isPlaying) {
      return Math.max(0, this.audioContext.currentTime - this.startTime);
    }
    return this.pauseTime;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getDuration(): number {
    if (this.audioBuffer) {
      return this.audioBuffer.duration || 0;
    }
    if (this.htmlAudioElement) {
      return this.htmlAudioElement.duration || 0;
    }
    return 0;
  }

  public applyFadeGain(fadeIn: number, fadeOut: number, currentTime: number, duration: number): void {
    if (!this.supportsWebAudio || !this.gainNode || !this.audioContext) {
      if (this.htmlAudioElement) {
        let volume = 1;
        if (currentTime < fadeIn && fadeIn > 0) {
          volume = currentTime / fadeIn;
          volume = this.applyEasing(volume);
        } else if (currentTime > duration - fadeOut && fadeOut > 0) {
          const remaining = duration - currentTime;
          volume = remaining / fadeOut;
          volume = this.applyEasing(volume);
        }
        try {
          this.htmlAudioElement.volume = Math.max(0, Math.min(1, volume));
        } catch (e) {
          // Ignore
        }
      }
      return;
    }

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
      // Ignore fade errors
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
    try {
      const freqData = this.getFrequencyData();
      const step = Math.floor(freqData.length / numBars);
      const waveform: number[] = [];

      for (let i = 0; i < numBars; i++) {
        let sum = 0;
        for (let j = 0; j < step; j++) {
          sum += freqData[i * step + j] || 0;
        }
        waveform.push(Math.min(1, sum / step / 255));
      }

      return waveform;
    } catch (err) {
      const fallback: number[] = [];
      for (let i = 0; i < numBars; i++) {
        fallback.push(0.3 + Math.random() * 0.3);
      }
      return fallback;
    }
  }

  public getSupportsWebAudio(): boolean {
    return this.supportsWebAudio;
  }

  public destroy(): void {
    this.stop();
    if (this.frequencyAnimationFrame) {
      cancelAnimationFrame(this.frequencyAnimationFrame);
    }
    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch (e) {
        // Ignore close errors
      }
      this.audioContext = null;
    }
    if (this.htmlAudioElement) {
      try {
        this.htmlAudioElement.pause();
        this.htmlAudioElement.src = '';
      } catch (e) {
        // Ignore
      }
      this.htmlAudioElement = null;
    }
    this.analyser = null;
    this.gainNode = null;
    this.audioBuffer = null;
  }
}

export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) seconds = 0;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function getAverageFrequency(frequencyData: Uint8Array): number {
  if (!frequencyData || frequencyData.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < frequencyData.length; i++) {
    sum += frequencyData[i];
  }
  return sum / frequencyData.length;
}

export function frequencyToColor(frequency: number, maxFrequency: number = 255): string {
  const safeFreq = Math.max(0, Math.min(maxFrequency, frequency));
  const ratio = safeFreq / maxFrequency;
  const hue = 200 + ratio * 160;
  return `hsl(${hue}, 80%, 50%)`;
}
