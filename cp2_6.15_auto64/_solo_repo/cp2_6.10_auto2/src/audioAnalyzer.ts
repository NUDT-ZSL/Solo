import type { Track } from './types';

type BeatCallback = (time: number, intensity: number) => void;

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private bpm = 120;
  private startTime = 0;
  private pausedTime = 0;
  private isPlaying = false;
  private beatCallbacks: BeatCallback[] = [];
  private currentTrack: Track | null = null;
  private soundEnabled = true;

  private frequencyData: Uint8Array | null = null;
  private timeDataArray: Uint8Array | null = null;

  private energyHistory: number[] = [];
  private historySize = 43;
  private lastBeatTime = -1;
  private minBeatInterval = 0.25;
  private beatSensitivity = 1.3;
  private detectedBeatCount = 0;

  private beatPattern: number[] = [];
  private currentBeatIndex = 0;
  private usePredictedBeats = false;

  async loadTrack(track: Track): Promise<void> {
    this.currentTrack = track;
    this.bpm = track.bpm;
    this.minBeatInterval = 60 / (this.bpm * 1.5);
    this.detectedBeatCount = 0;
    this.lastBeatTime = -1;
    this.energyHistory = [];
    this.beatPattern = [];
    this.currentBeatIndex = 0;

    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.3;

      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 0.3;

      this.analyser.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);

      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount) as any;
      this.timeDataArray = new Uint8Array(this.analyser.frequencyBinCount) as any;
    }

    this.audioBuffer = this.generateSyntheticTrack(track);
    this.analyzeBeatsOffline(this.audioBuffer);
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

      const kickEnv = Math.exp(-beatPhase * 14) * 0.9;
      const kickFreq = 90 + beatPhase * -50;
      const kick = Math.sin(2 * Math.PI * kickFreq * time) * kickEnv;

      const snarePhase = (beatPhase + 0.5) % 1;
      const snareEnv = Math.exp(-snarePhase * 12) * 0.4;
      const snare = (Math.random() * 2 - 1) * snareEnv;

      const bassNote = Math.floor(time * beatFreq) % 4;
      const bassFreqs = [55, 65.41, 73.42, 82.41];
      const bass = Math.sin(2 * Math.PI * bassFreqs[bassNote] * time) * 0.18;

      const chordFreqs = [261.63, 329.63, 392.0, 523.25];
      let chord = 0;
      chordFreqs.forEach((freq, idx) => {
        const amp = 0.025 + Math.sin(time * 0.5 + idx) * 0.01;
        chord += Math.sin(2 * Math.PI * freq * time) * amp;
      });

      const hihatFreq = beatFreq * 2;
      const hihatPhase = (time * hihatFreq) % 1;
      const hihatEnv = Math.exp(-hihatPhase * 25) * 0.12;
      const hihat = (Math.random() * 2 - 1) * hihatEnv;

      let melody = 0;
      if (track.color === 'cool') {
        const melIdx = Math.floor(time * beatFreq * 2) % 8;
        const melFreqs = [440, 493.88, 523.25, 587.33, 659.25, 587.33, 523.25, 493.88];
        const melEnv = Math.exp(-((time * beatFreq * 2) % 1) * 6) * 0.08;
        melody = Math.sin(2 * Math.PI * melFreqs[melIdx] * time) * melEnv;
      } else if (track.color === 'warm') {
        const melIdx = Math.floor(time * beatFreq) % 7;
        const melFreqs = [523.25, 587.33, 659.25, 698.46, 783.99, 698.46, 659.25];
        const melEnv = Math.exp(-((time * beatFreq) % 1) * 5) * 0.07;
        melody = Math.sin(2 * Math.PI * melFreqs[melIdx] * time) * melEnv;
      } else {
        const melFreq = 220 + Math.sin(time * 4) * 30;
        const melEnv = 0.06 + Math.sin(time * 2) * 0.02;
        melody = Math.sin(2 * Math.PI * melFreq * time) * melEnv;
      }

      let sample = kick + snare + bass + chord + hihat + melody;
      sample = Math.max(-1, Math.min(1, sample * 0.65));

      leftChannel[i] = sample;
      rightChannel[i] = sample;
    }

    return buffer;
  }

  private analyzeBeatsOffline(buffer: AudioBuffer): void {
    const sampleRate = buffer.sampleRate;
    const channelData = buffer.getChannelData(0);
    const windowSize = Math.floor(sampleRate * 0.02);
    const hopSize = Math.floor(windowSize / 2);
    const energies: number[] = [];
    const beatTimes: number[] = [];

    for (let i = 0; i < channelData.length - windowSize; i += hopSize) {
      let lowFreqEnergy = 0;
      const windowEnd = Math.min(i + windowSize, channelData.length);

      for (let j = i; j < windowEnd; j++) {
        const sample = channelData[j];
        lowFreqEnergy += Math.abs(sample);
      }

      energies.push(lowFreqEnergy / (windowEnd - i));
    }

    const beatHopSeconds = hopSize / sampleRate;
    let lastBeatIdx = -20;
    const minBeatHop = Math.floor(60 / 220 / beatHopSeconds);

    for (let i = 5; i < energies.length - 5; i++) {
      let localSum = 0;
      let localCount = 0;

      for (let j = -5; j <= 5; j++) {
        if (j === 0) continue;
        localSum += energies[i + j];
        localCount++;
      }

      const localAvg = localSum / localCount;
      const threshold = localAvg * 1.35;

      if (energies[i] > threshold && i - lastBeatIdx > minBeatHop) {
        beatTimes.push(i * beatHopSeconds);
        lastBeatIdx = i;
      }
    }

    if (beatTimes.length > 4) {
      let totalInterval = 0;
      for (let i = 1; i < beatTimes.length; i++) {
        totalInterval += beatTimes[i] - beatTimes[i - 1];
      }
      const avgInterval = totalInterval / (beatTimes.length - 1);
      const detectedBPM = Math.round(60 / avgInterval);

      if (detectedBPM >= 60 && detectedBPM <= 240) {
        this.bpm = detectedBPM;
        this.minBeatInterval = 60 / (this.bpm * 1.5);
      }
    }

    this.beatPattern = beatTimes;
    this.usePredictedBeats = beatTimes.length > buffer.duration * 0.8;
    this.currentBeatIndex = 0;
  }

  start(): void {
    if (!this.audioContext || !this.audioBuffer || !this.analyser || !this.gainNode) return;

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    this.source = this.audioContext.createBufferSource();
    this.source.buffer = this.audioBuffer;
    this.source.connect(this.analyser);

    this.source.onended = () => {
      if (this.isPlaying) {
        this.isPlaying = false;
      }
    };

    this.source.start(0, this.pausedTime);
    this.startTime = this.audioContext.currentTime - this.pausedTime;
    this.isPlaying = true;
    this.lastBeatTime = this.pausedTime;
    this.energyHistory = [];

    if (this.usePredictedBeats) {
      while (this.currentBeatIndex < this.beatPattern.length &&
             this.beatPattern[this.currentBeatIndex] < this.pausedTime) {
        this.currentBeatIndex++;
      }
    }
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
    this.detectedBeatCount = 0;
    this.lastBeatTime = -1;
    this.energyHistory = [];
    this.currentBeatIndex = 0;
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
    if (!this.isPlaying || !this.analyser || !this.frequencyData || !this.timeDataArray) return;

    const currentTime = this.getCurrentTime();

    if (this.usePredictedBeats && this.beatPattern.length > 0) {
      while (this.currentBeatIndex < this.beatPattern.length &&
             this.beatPattern[this.currentBeatIndex] <= currentTime + 0.02) {

        const beatTime = this.beatPattern[this.currentBeatIndex];
        if (beatTime > this.lastBeatTime + this.minBeatInterval) {
          this.lastBeatTime = beatTime;
          this.detectedBeatCount++;
          const intensity = this.calculateCurrentIntensity();
          this.beatCallbacks.forEach(cb => cb(beatTime, intensity));
        }
        this.currentBeatIndex++;
      }
    } else {
      this.detectBeatsRealtime(currentTime);
    }
  }

  private detectBeatsRealtime(currentTime: number): void {
    if (!this.analyser || !this.frequencyData) return;

    this.analyser.getByteFrequencyData(this.frequencyData as Uint8Array<ArrayBuffer>);

    const lowBandEnergy = this.calculateBandEnergy(0, 25);
    const midBandEnergy = this.calculateBandEnergy(25, 80);
    const totalEnergy = lowBandEnergy * 2.5 + midBandEnergy;

    this.energyHistory.push(totalEnergy);
    if (this.energyHistory.length > this.historySize) {
      this.energyHistory.shift();
    }

    if (this.energyHistory.length < 10) return;

    const avgEnergy = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length;

    let variance = 0;
    for (const e of this.energyHistory) {
      variance += (e - avgEnergy) ** 2;
    }
    variance /= this.energyHistory.length;
    const stdDev = Math.sqrt(variance);

    const timeSinceLastBeat = currentTime - this.lastBeatTime;
    const beatThreshold = avgEnergy + stdDev * this.beatSensitivity;

    const recentAvg = this.energyHistory.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const isRising = recentAvg > avgEnergy && totalEnergy > beatThreshold;

    if (isRising && timeSinceLastBeat > this.minBeatInterval) {
      this.lastBeatTime = currentTime;
      this.detectedBeatCount++;

      const intensity = Math.min(1, (totalEnergy - avgEnergy) / (stdDev * 3 + 0.01));
      const clampedIntensity = Math.max(0.3, Math.min(1, intensity));

      this.beatCallbacks.forEach(cb => cb(currentTime, clampedIntensity));
    }
  }

  private calculateCurrentIntensity(): number {
    if (!this.frequencyData) return 0.5;
    const energy = this.calculateBandEnergy(0, 30);
    return Math.max(0.3, Math.min(1, energy / 180));
  }

  private calculateBandEnergy(startBin: number, endBin: number): number {
    if (!this.frequencyData) return 0;

    const start = Math.max(0, startBin);
    const end = Math.min(this.frequencyData.length, endBin);
    if (end <= start) return 0;

    let sum = 0;
    for (let i = start; i < end; i++) {
      sum += this.frequencyData[i];
    }

    return sum / (end - start);
  }

  getBeatIntensity(): number {
    if (!this.analyser || !this.frequencyData) return 0;
    this.analyser.getByteFrequencyData(this.frequencyData as Uint8Array<ArrayBuffer>);
    return this.calculateBandEnergy(0, 50) / 255;
  }

  getLowFrequencyEnergy(): number {
    if (!this.analyser || !this.frequencyData) return 0;
    this.analyser.getByteFrequencyData(this.frequencyData as Uint8Array<ArrayBuffer>);
    return this.calculateBandEnergy(0, 15);
  }

  getBeatCount(): number {
    return this.detectedBeatCount;
  }

  getPredictedBeatCount(): number {
    return this.beatPattern.length;
  }

  isUsingPredictedBeats(): boolean {
    return this.usePredictedBeats;
  }
}
