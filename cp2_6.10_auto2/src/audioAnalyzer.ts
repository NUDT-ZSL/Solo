import type { Track } from './types';

type BeatCallback = (time: number) => void;

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
  private lastBeatTime = 0;
  private beatInterval = 0.5;
  private beatCount = 0;
  private currentTrack: Track | null = null;
  private soundEnabled = true;

  async loadTrack(track: Track): Promise<void> {
    this.currentTrack = track;
    this.bpm = track.bpm;
    this.beatInterval = 60 / this.bpm;
    this.lastBeatTime = 0;
    this.beatCount = 0;

    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 0.3;
      this.analyser.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);
    }

    this.audioBuffer = this.generateSyntheticTrack(track);
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
      const beatTime = (time * beatFreq) % 1;

      const envelope = Math.exp(-beatTime * 8);

      let sample = 0;

      const kickFreq = 60 + Math.sin(time * 0.5) * 10;
      const kick = Math.sin(2 * Math.PI * kickFreq * time) * envelope * 0.5;
      sample += kick;

      const bassFreq = 110;
      const bassNote = Math.floor(time * beatFreq) % 4;
      const bassFreqs = [110, 130.81, 146.83, 164.81];
      const bass = Math.sin(2 * Math.PI * bassFreqs[bassNote] * time) * 0.15;
      sample += bass;

      if (track.color === 'cool') {
        const leadFreq = 440 * Math.pow(2, Math.floor(time * beatFreq * 2) % 8 / 12);
        const lead = Math.sin(2 * Math.PI * leadFreq * time) * 0.08 * envelope;
        sample += lead;
      }

      if (track.color === 'warm') {
        const pianoFreq = 261.63 * Math.pow(2, Math.floor(time * beatFreq) % 7 / 12);
        const piano = Math.sin(2 * Math.PI * pianoFreq * time) * 0.1 * envelope;
        sample += piano;
      }

      if (track.color === 'dark') {
        const synthFreq = 200 + Math.sin(time * 3) * 50;
        const synth = Math.sin(2 * Math.PI * synthFreq * time) * 0.12 * envelope;
        sample += synth;
      }

      leftChannel[i] = sample * 0.8;
      rightChannel[i] = sample * 0.8;
    }

    return buffer;
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
    this.lastBeatTime = 0;
    this.beatCount = 0;
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
    if (!this.isPlaying) return;

    const currentTime = this.getCurrentTime();

    while (this.lastBeatTime + this.beatInterval <= currentTime) {
      this.lastBeatTime += this.beatInterval;
      this.beatCount++;
      this.beatCallbacks.forEach(cb => cb(this.lastBeatTime));
    }
  }

  getBeatIntensity(): number {
    if (!this.analyser) return 0;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }

    return sum / dataArray.length / 255;
  }
}
