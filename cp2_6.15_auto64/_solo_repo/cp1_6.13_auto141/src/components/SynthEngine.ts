export type WaveType = 'sine' | 'sawtooth' | 'triangle' | 'square';

export interface Note {
  id: string;
  frequency: number;
  startTime: number;
  duration: number;
  velocity: number;
}

class SynthEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private oscillators: Map<string, { osc: OscillatorNode; gain: GainNode }> = new Map();
  private waveType: WaveType = 'sine';
  private volume: number = 0.5;
  private targetVolume: number = 0.5;
  private targetFrequency: number = 440;
  private currentFrequency: number = 440;
  private interpolationDuration: number = 0.2;
  private lastFrequencyUpdate: number = 0;
  private startFrequency: number = 440;
  private isPlaying: boolean = false;
  private mainOscillator: OscillatorNode | null = null;
  private mainGain: GainNode | null = null;

  constructor() {
    this.initAudioContext();
  }

  private initAudioContext(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0;
      
      this.filter = this.audioContext.createBiquadFilter();
      this.filter.type = 'lowpass';
      this.filter.frequency.value = 2000;
      this.filter.Q.value = 1;
      
      this.filter.connect(this.masterGain);
      this.masterGain.connect(this.audioContext.destination);

      this.mainGain = this.audioContext.createGain();
      this.mainGain.gain.value = 0;
      this.mainGain.connect(this.filter);
    } catch (e) {
      console.error('Web Audio API not supported:', e);
    }
  }

  async resume(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  setFrequency(frequency: number): void {
    if (!this.audioContext) return;
    
    const now = performance.now();
    this.startFrequency = this.currentFrequency;
    this.targetFrequency = frequency;
    this.lastFrequencyUpdate = now;

    if (this.mainOscillator) {
      const currentTime = this.audioContext.currentTime;
      this.mainOscillator.frequency.cancelScheduledValues(currentTime);
      this.mainOscillator.frequency.setValueAtTime(this.currentFrequency, currentTime);
      this.mainOscillator.frequency.linearRampToValueAtTime(
        frequency,
        currentTime + this.interpolationDuration
      );
    }
    
    this.currentFrequency = frequency;
  }

  setWaveType(type: WaveType): void {
    this.waveType = type;
    if (this.mainOscillator) {
      this.mainOscillator.type = type;
    }
  }

  setVolume(volume: number): void {
    this.targetVolume = Math.max(0, Math.min(1, volume));
    
    if (this.masterGain && this.audioContext) {
      const currentTime = this.audioContext.currentTime;
      this.masterGain.gain.cancelScheduledValues(currentTime);
      this.masterGain.gain.setValueAtTime(this.volume, currentTime);
      this.masterGain.gain.linearRampToValueAtTime(
        this.targetVolume,
        currentTime + this.interpolationDuration
      );
    }
    
    this.volume = this.targetVolume;
  }

  setFilterFrequency(freq: number): void {
    if (this.filter && this.audioContext) {
      const currentTime = this.audioContext.currentTime;
      this.filter.frequency.cancelScheduledValues(currentTime);
      this.filter.frequency.setValueAtTime(this.filter.frequency.value, currentTime);
      this.filter.frequency.linearRampToValueAtTime(freq, currentTime + 0.1);
    }
  }

  setFilterQ(q: number): void {
    if (this.filter) {
      this.filter.Q.value = q;
    }
  }

  startTone(frequency?: number): void {
    if (!this.audioContext || !this.filter || !this.mainGain) return;
    if (this.isPlaying) return;

    const freq = frequency || this.currentFrequency;
    this.currentFrequency = freq;
    this.targetFrequency = freq;

    this.mainOscillator = this.audioContext.createOscillator();
    this.mainOscillator.type = this.waveType;
    this.mainOscillator.frequency.value = freq;
    this.mainOscillator.connect(this.mainGain);
    
    const now = this.audioContext.currentTime;
    this.mainGain.gain.cancelScheduledValues(now);
    this.mainGain.gain.setValueAtTime(0, now);
    this.mainGain.gain.linearRampToValueAtTime(0.3, now + 0.05);
    
    this.mainOscillator.start();
    this.isPlaying = true;
  }

  stopTone(): void {
    if (!this.mainOscillator || !this.mainGain || !this.audioContext) return;
    if (!this.isPlaying) return;

    const now = this.audioContext.currentTime;
    this.mainGain.gain.cancelScheduledValues(now);
    this.mainGain.gain.setValueAtTime(this.mainGain.gain.value, now);
    this.mainGain.gain.linearRampToValueAtTime(0, now + 0.1);
    
    setTimeout(() => {
      if (this.mainOscillator) {
        try {
          this.mainOscillator.stop();
        } catch (e) {}
        this.mainOscillator.disconnect();
        this.mainOscillator = null;
      }
      this.isPlaying = false;
    }, 100);
  }

  playNote(frequency: number, duration: number = 0.5, velocity: number = 0.5): void {
    if (!this.audioContext || !this.filter) return;

    const osc = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    osc.type = this.waveType;
    osc.frequency.value = frequency;
    
    osc.connect(gainNode);
    gainNode.connect(this.filter);
    
    const now = this.audioContext.currentTime;
    const gainValue = velocity * 0.3;
    
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(gainValue, now + 0.05);
    gainNode.gain.linearRampToValueAtTime(gainValue * 0.7, now + duration * 0.7);
    gainNode.gain.linearRampToValueAtTime(0, now + duration);
    
    osc.start(now);
    osc.stop(now + duration + 0.1);
    
    const noteId = `note_${Date.now()}_${Math.random()}`;
    this.oscillators.set(noteId, { osc, gain: gainNode });
    
    setTimeout(() => {
      this.oscillators.delete(noteId);
    }, (duration + 0.2) * 1000);
  }

  getWaveType(): WaveType {
    return this.waveType;
  }

  getVolume(): number {
    return this.volume;
  }

  getCurrentFrequency(): number {
    return this.currentFrequency;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  setInterpolationDuration(duration: number): void {
    this.interpolationDuration = Math.max(0, duration);
  }

  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  destroy(): void {
    this.stopTone();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

export const synthEngine = new SynthEngine();
export default SynthEngine;
