import type { Track } from './types';

type BeatCallback = (time: number, intensity: number) => void;

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private lowpassFilter: BiquadFilterNode | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private bpm = 120;
  private startTime = 0;
  private pausedTime = 0;
  private isPlaying = false;
  private beatCallbacks: BeatCallback[] = [];
  private currentTrack: Track | null = null;
  private soundEnabled = true;

  private frequencyData: Uint8Array<ArrayBuffer> | null = null;
  private energyHistory: number[] = [];
  private historySize = 43;
  private lastBeatDetectedTime = -1;
  private minBeatInterval = 0.25;
  private beatSensitivity = 1.3;
  private detectedBeats: number[] = [];
  private beatCount = 0;

  private lastFrameLowEnergy = 0;
  private energyDiffs: number[] = [];
  private diffThreshold = 15;

  async loadTrack(track: Track): Promise<void> {
    this.currentTrack = track;
    this.bpm = track.bpm;
    this.minBeatInterval = 60 / (this.bpm * 2);
    this.detectedBeats = [];
    this.beatCount = 0;
    this.lastBeatDetectedTime = -1;
    this.energyHistory = [];

    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.6;

      this.lowpassFilter = this.audioContext.createBiquadFilter();
      this.lowpassFilter.type = 'lowpass';
      this.lowpassFilter.frequency.value = 200;

      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 0.3;

      this.lowpassFilter.connect(this.analyser);
      this.analyser.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);

      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>;
    }

    this.audioBuffer = this.generateSyntheticTrack(track);
    this.analyzeOfflineBPM(this.audioBuffer);
  }

  private generateSyntheticTrack(track: Track): AudioBuffer {
    if (!this.audioContext) throw new Error('AudioContext not initialized');

    const sampleRate = this.audioContext.sampleRate;
    const duration = track.duration;
    const buffer = this.audioContext.createBuffer(2, sampleRate * duration, sampleRate);

    const leftChannel = buffer.getChannelData(0);
    const rightChannel = buffer.getChannelData(1);

    const beatFreq = track.bpm / 60;

    for (let i = 0; i < buffer.length; i++) {
      const time = i / sampleRate;
      const beatPhase = (time * beatFreq) % 1;

      const kickEnv = Math.exp(-beatPhase * 12) * 0.8;
      const kickFreq = 80 + beatPhase * -40;
      const kick = Math.sin(2 * Math.PI * kickFreq * time) * kickEnv;

      const snareEnv = Math.exp(-((beatPhase - 0.5) ** 2) * 50) * 0.3;
      const snare = (Math.random() * 2 - 1) * snareEnv;

      const bassNote = Math.floor(time * beatFreq) % 4;
      const bassFreqs = [55, 65.41, 73.42, 82.41];
      const bass = Math.sin(2 * Math.PI * bassFreqs[bassNote] * time) * 0.2;

      const chordFreqs = [261.63, 329.63, 392.0, 523.25];
      let chord = 0;
      chordFreqs.forEach((freq) => {
        chord += Math.sin(2 * Math.PI * freq * time) * 0.03;
      });

      const hihatPhase = (time * beatFreq * 2) % 1;
      const hihatEnv = Math.exp(-hihatPhase * 30) * 0.15;
      const hihat = (Math.random() * 2 - 1) * hihatEnv;

      let sample = kick + snare + bass + chord + hihat;
      sample = Math.max(-1, Math.min(1, sample * 0.7));

      leftChannel[i] = sample;
      rightChannel[i] = sample;
    }

    return buffer;
  }

  private analyzeOfflineBPM(buffer: AudioBuffer): void {
    const sampleRate = buffer.sampleRate;
    const channelData = buffer.getChannelData(0);
    const windowSize = Math.floor(sampleRate * 0.02);
    const hopSize = Math.floor(windowSize / 2);
    const energies: number[] = [];

    for (let i = 0; i < channelData.length - windowSize; i += hopSize) {
      let sum = 0;
      for (let j = 0; j < windowSize; j++) {
        sum += Math.abs(channelData[i + j]);
      }
      energies.push(sum / windowSize);
    }

    let beatCount = 0;
    let lastBeatIdx = -10;
    const minBeatHop = Math.floor(60 / 200 / (hopSize / sampleRate));

    for (let i = 3; i < energies.length - 3; i++) {
      const localAvg = (energies[i - 1] + energies[i - 2] + energies[i - 3] +
                       energies[i + 1] + energies[i + 2] + energies[i + 3]) / 6;
      if (energies[i] > localAvg * 1.4 && i - lastBeatIdx > minBeatHop) {
        beatCount++;
        lastBeatIdx = i;
      }
    }

    const duration = buffer.duration;
    const detectedBPM = (beatCount / duration) * 60;
    if (detectedBPM > 60 && detectedBPM < 240) {
      this.bpm = Math.round(detectedBPM);
      this.minBeatInterval = 60 / (this.bpm * 1.5);
    }
  }

  start(): void {
    if (!this.audioContext || !this.audioBuffer || !this.lowpassFilter || !this.analyser || !this.gainNode) return;

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    this.source = this.audioContext.createBufferSource();
    this.source.buffer = this.audioBuffer;
    this.source.connect(this.lowpassFilter);
    this.source.connect(this.analyser);

    this.source.onended = () => {
      if (this.isPlaying) {
        this.isPlaying = false;
      }
    };

    this.source.start(0, this.pausedTime);
    this.startTime = this.audioContext.currentTime - this.pausedTime;
    this.isPlaying = true;
    this.lastBeatDetectedTime = this.pausedTime;
    this.energyHistory = [];
  }

  pause(): void {
    if (!this.audioContext || !this.source || !this.isPlaying) return;

    this.pausedTime = this.audioContext.currentTime - this.startTime;
    this.source.stop();
    this.source.disconnect();
    this.source = null;
    this.isPlaying = false;
  }

  stop(): void {
    if (this.source) {
      try {
        this.source.stop();
        this.source.disconnect();
      } catch (e) {
        // ignore
      }
      this.source = null;
    }
    this.isPlaying = false;
    this.pausedTime = 0;
    this.detectedBeats = [];
    this.beatCount = 0;
    this.lastBeatDetectedTime = -1;
    this.energyHistory = [];
  }

  getBPM(): number {
    return this.bpm;
  }

  getCurrentTime(): number {
    if (!this.audioContext) return 0;
    if (this.isPlaying) {
      return this.audioContext.currentTime - this.startTime;
    }
    return this.pausedTime;
  }

  getDuration(): number {
    return this.currentTrack?.duration || 0;
  }

  isPlayingState(): boolean {
    return this.isPlaying;
  }

  onBeat(callback: BeatCallback): void {
    this.beatCallbacks.push(callback);
  }

  setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    if (this.gainNode) {
      this.gainNode.gain.value = enabled ? 0.3 : 0;
    }
  }

  isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  update(): void {
    if (!this.isPlaying || !this.analyser || !this.frequencyData) return;

    const currentTime = this.getCurrentTime();

    this.analyser.getByteFrequencyData(this.frequencyData);

    const lowFreqEnergy = this.calculateBandEnergy(0, 20);
    const midFreqEnergy = this.calculateBandEnergy(20, 80);

    const totalEnergy = lowFreqEnergy * 2 + midFreqEnergy;

    this.energyHistory.push(totalEnergy);
    if (this.energyHistory.length > this.historySize) {
      this.energyHistory.shift();
    }

    const avgEnergy = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length;
    const variance = this.energyHistory.reduce((sum, val) => sum + (val - avgEnergy) ** 2, 0) / this.energyHistory.length;
    const stdDev = Math.sqrt(variance);

    const energyDiff = totalEnergy - this.lastFrameLowEnergy;
    this.lastFrameLowEnergy = totalEnergy;

    this.energyDiffs.push(energyDiff);
    if (this.energyDiffs.length > 10) {
      this.energyDiffs.shift();
    }

    const timeSinceLastBeat = currentTime - this.lastBeatDetectedTime;

    const beatThreshold = avgEnergy + stdDev * this.beatSensitivity;

    if (totalEnergy > beatThreshold &&
        energyDiff > this.diffThreshold &&
        timeSinceLastBeat > this.minBeatInterval &&
        this.energyHistory.length >= 10) {

      this.lastBeatDetectedTime = currentTime;
      this.beatCount++;
      this.detectedBeats.push(currentTime);

      const intensity = Math.min(1, totalEnergy / (beatThreshold * 1.5));

      this.beatCallbacks.forEach(cb => cb(currentTime, intensity));
    }
  }

  private calculateBandEnergy(startBin: number, endBin: number): number {
    if (!this.frequencyData) return 0;

    const start = Math.max(0, startBin);
    const end = Math.min(this.frequencyData.length, endBin);

    let sum = 0;
    for (let i = start; i < end; i++) {
      sum += this.frequencyData[i];
    }

    return sum / (end - start);
  }

  getBeatIntensity(): number {
    if (!this.analyser || !this.frequencyData) return 0;
    return this.calculateBandEnergy(0, 50) / 255;
  }

  getLowFrequencyEnergy(): number {
    if (!this.frequencyData) return 0;
    return this.calculateBandEnergy(0, 15);
  }

  getBeatCount(): number {
    return this.beatCount;
  }
}
