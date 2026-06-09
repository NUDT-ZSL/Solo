export class SoundManager {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.5;
      this.masterGain.connect(this.audioContext.destination);
      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported:', e);
    }
  }

  private ensureContext(): AudioContext | null {
    if (!this.audioContext || !this.initialized) return null;
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    return this.audioContext;
  }

  playAggregationSound(): void {
    const ctx = this.ensureContext();
    const master = this.masterGain;
    if (!ctx || !master) return;

    const frequencies = [523, 659, 784];
    const startTime = ctx.currentTime;

    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      const noteStart = startTime + i * 0.15;
      const noteEnd = noteStart + 0.1;

      gain.gain.setValueAtTime(0, noteStart);
      gain.gain.linearRampToValueAtTime(0.3, noteStart + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, noteEnd);

      osc.connect(gain);
      gain.connect(master);

      osc.start(noteStart);
      osc.stop(noteEnd + 0.05);
    });
  }

  playGravityBallDissipate(): void {
    const ctx = this.ensureContext();
    const master = this.masterGain;
    if (!ctx || !master) return;

    const startTime = ctx.currentTime;
    const duration = 0.3;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, startTime);
    osc.frequency.exponentialRampToValueAtTime(150, startTime + duration);

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(master);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }

  playFragmentMerge(): void {
    const ctx = this.ensureContext();
    const master = this.masterGain;
    if (!ctx || !master) return;

    const startTime = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, startTime);
    osc.frequency.exponentialRampToValueAtTime(880, startTime + 0.15);

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.15, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);

    osc.connect(gain);
    gain.connect(master);

    osc.start(startTime);
    osc.stop(startTime + 0.2);
  }

  playZoneLit(): void {
    const ctx = this.ensureContext();
    const master = this.masterGain;
    if (!ctx || !master) return;

    const frequencies = [392, 494, 587, 784];
    const startTime = ctx.currentTime;

    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      const noteStart = startTime + i * 0.08;
      const noteEnd = noteStart + 0.3;

      gain.gain.setValueAtTime(0, noteStart);
      gain.gain.linearRampToValueAtTime(0.25, noteStart + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, noteEnd);

      osc.connect(gain);
      gain.connect(master);

      osc.start(noteStart);
      osc.stop(noteEnd + 0.05);
    });
  }
}

export const soundManager = new SoundManager();
