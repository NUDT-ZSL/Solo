import type { FreqData } from './types';

const FFT_SIZE = 2048;
const SMOOTHING_TIME_CONSTANT = 0.8;

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private frequencyData: Uint8Array;
  private timeData: Uint8Array;
  private bpmHistory: number[] = [];
  private lastBeatTime: number = 0;
  private beatThreshold: number = 180;
  private beatIntervalSum: number = 0;
  private beatCount: number = 0;
  private onTrackEndedCallback: (() => void) | null = null;
  private currentTrackName: string = '';

  constructor() {
    this.frequencyData = new Uint8Array(FFT_SIZE);
    this.timeData = new Uint8Array(FFT_SIZE);
  }

  private ensureContext(): boolean {
    if (!this.audioContext) {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = FFT_SIZE;
        this.analyser.smoothingTimeConstant = SMOOTHING_TIME_CONSTANT;
        this.gainNode = this.audioContext.createGain();
        this.analyser.connect(this.gainNode);
        this.gainNode.connect(this.audioContext.destination);
      } catch (e) {
        console.error('Failed to create AudioContext:', e);
        return false;
      }
    }
    return true;
  }

  async loadFromFile(file: File): Promise<void> {
    if (!this.ensureContext()) return;
    this.currentTrackName = file.name.replace(/\.[^/.]+$/, '');
    const url = URL.createObjectURL(file);
    await this.loadAudioElement(url);
  }

  async loadFromUrl(url: string, name: string): Promise<void> {
    if (!this.ensureContext()) return;
    this.currentTrackName = name;
    await this.loadAudioElement(url);
  }

  generateDemoTrack(name: string, bpm: number): Promise<void> {
    return new Promise((resolve) => {
      if (!this.ensureContext()) {
        resolve();
        return;
      }
      this.currentTrackName = name;
      this.createSyntheticAudio(bpm);
      resolve();
    });
  }

  private createSyntheticAudio(bpm: number): void {
    if (!this.audioContext) return;
    const ctx = this.audioContext;
    const duration = 120;
    const sampleRate = ctx.sampleRate;
    const buffer = ctx.createBuffer(2, sampleRate * duration, sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      const beatInterval = 60 / bpm;
      
      for (let i = 0; i < data.length; i++) {
        const t = i / sampleRate;
        const beatPos = (t % beatInterval) / beatInterval;
        
        let sample = 0;
        
        if (beatPos < 0.1) {
          const envelope = Math.exp(-beatPos * 30);
          sample += Math.sin(2 * Math.PI * 60 * t) * 0.6 * envelope;
          sample += Math.sin(2 * Math.PI * 120 * t) * 0.3 * envelope;
        }
        
        const hihatInterval = beatInterval / 2;
        const hihatPos = (t % hihatInterval) / hihatInterval;
        if (hihatPos < 0.05) {
          const envelope = Math.exp(-hihatPos * 80);
          sample += (Math.random() * 2 - 1) * 0.2 * envelope;
        }
        
        const melodyFreq = [261.63, 329.63, 392.00, 523.25][Math.floor(t / beatInterval) % 4];
        sample += Math.sin(2 * Math.PI * melodyFreq * t) * 0.15 * Math.sin(2 * Math.PI * (1 / beatInterval) * t) * 0.5 + 0.5;
        
        data[i] = Math.max(-1, Math.min(1, sample));
      }
    }
    
    const blob = this.bufferToWave(buffer);
    const url = URL.createObjectURL(blob);
    this.loadAudioElement(url);
  }

  private bufferToWave(buffer: AudioBuffer): Blob {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1;
    const bitDepth = 16;
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const numberOfSamples = buffer.length;
    const byteRate = sampleRate * blockAlign;
    const dataSize = numberOfSamples * blockAlign;
    const bufferSize = 44 + dataSize;
    const arrayBuffer = new ArrayBuffer(bufferSize);
    const view = new DataView(arrayBuffer);
    
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);
    
    const channels: Float32Array[] = [];
    for (let i = 0; i < numChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }
    
    let offset = 44;
    for (let i = 0; i < numberOfSamples; i++) {
      for (let channel = 0; channel < numChannels; channel++) {
        let sample = Math.max(-1, Math.min(1, channels[channel][i]));
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(offset, sample, true);
        offset += 2;
      }
    }
    
    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  private async loadAudioElement(url: string): Promise<void> {
    if (!this.audioContext || !this.analyser) return;
    
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
    }
    
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    
    this.audioElement = new Audio();
    this.audioElement.src = url;
    this.audioElement.crossOrigin = 'anonymous';
    this.audioElement.loop = true;
    
    this.source = this.audioContext.createMediaElementSource(this.audioElement);
    this.source.connect(this.analyser);
    
    this.audioElement.addEventListener('ended', () => {
      if (this.onTrackEndedCallback) this.onTrackEndedCallback();
    });
    
    this.resetBPM();
    
    await this.audioElement.play().catch(() => {});
    this.audioElement.pause();
  }

  getFrequencyData(): FreqData {
    if (!this.analyser) {
      return {
        low: 0,
        mid: 0,
        high: 0,
        spectrum: new Uint8Array(FFT_SIZE),
        amplitude: 0
      };
    }

    this.analyser.getByteFrequencyData(this.frequencyData as Uint8Array<ArrayBuffer>);
    this.analyser.getByteTimeDomainData(this.timeData as Uint8Array<ArrayBuffer>);

    const binCount = this.frequencyData.length;
    const lowEnd = Math.floor(binCount * 0.1);
    const midEnd = Math.floor(binCount * 0.5);

    let lowSum = 0;
    let midSum = 0;
    let highSum = 0;

    for (let i = 0; i < lowEnd; i++) {
      lowSum += this.frequencyData[i];
    }
    for (let i = lowEnd; i < midEnd; i++) {
      midSum += this.frequencyData[i];
    }
    for (let i = midEnd; i < binCount; i++) {
      highSum += this.frequencyData[i];
    }

    const low = lowSum / lowEnd / 255;
    const mid = midSum / (midEnd - lowEnd) / 255;
    const high = highSum / (binCount - midEnd) / 255;

    let amplitudeSum = 0;
    for (let i = 0; i < this.timeData.length; i++) {
      amplitudeSum += Math.abs(this.timeData[i] - 128);
    }
    const amplitude = amplitudeSum / this.timeData.length / 128;

    this.detectBeat(low);

    return {
      low,
      mid,
      high,
      spectrum: new Uint8Array(this.frequencyData),
      amplitude
    };
  }

  private detectBeat(lowFreq: number): void {
    const now = performance.now();
    const lowValue = lowFreq * 255;
    
    if (lowValue > this.beatThreshold && now - this.lastBeatTime > 200) {
      const interval = now - this.lastBeatTime;
      if (this.lastBeatTime > 0) {
        this.beatIntervalSum += interval;
        this.beatCount++;
        const avgInterval = this.beatIntervalSum / this.beatCount;
        const currentBPM = Math.round(60000 / avgInterval);
        this.bpmHistory.push(currentBPM);
        if (this.bpmHistory.length > 20) {
          this.bpmHistory.shift();
        }
      }
      this.lastBeatTime = now;
    }
  }

  getBPM(): number {
    if (this.bpmHistory.length === 0) return 0;
    const sorted = [...this.bpmHistory].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    return median;
  }

  private resetBPM(): void {
    this.bpmHistory = [];
    this.lastBeatTime = 0;
    this.beatIntervalSum = 0;
    this.beatCount = 0;
  }

  async play(): Promise<void> {
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
    }
    await this.audioElement?.play().catch(() => {});
  }

  pause(): void {
    this.audioElement?.pause();
  }

  isPlaying(): boolean {
    return !!this.audioElement && !this.audioElement.paused;
  }

  setVolume(value: number): void {
    if (this.gainNode) {
      this.gainNode.gain.setTargetAtTime(Math.max(0, Math.min(1, value)), this.audioContext!.currentTime, 0.01);
    }
    if (this.audioElement) {
      this.audioElement.volume = Math.max(0, Math.min(1, value));
    }
  }

  getVolume(): number {
    return this.audioElement?.volume ?? 1;
  }

  setProgress(ratio: number): void {
    if (this.audioElement && this.audioElement.duration) {
      this.audioElement.currentTime = ratio * this.audioElement.duration;
    }
  }

  getProgress(): number {
    if (this.audioElement && this.audioElement.duration) {
      return this.audioElement.currentTime / this.audioElement.duration;
    }
    return 0;
  }

  getDuration(): number {
    return this.audioElement?.duration ?? 0;
  }

  getCurrentTime(): number {
    return this.audioElement?.currentTime ?? 0;
  }

  getTrackName(): string {
    return this.currentTrackName;
  }

  setOnTrackEnded(callback: () => void): void {
    this.onTrackEndedCallback = callback;
  }

  hasAudio(): boolean {
    return !!this.audioElement;
  }
}
