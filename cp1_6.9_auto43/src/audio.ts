export class AudioManager {
  private ctx: AudioContext | null = null;

  init(): void {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private ensureCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.ctx;
  }

  playClick(frequency: number = 1000, duration: number = 0.1): void {
    const ctx = this.ensureCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  playRotateClick(): void {
    this.playClick(1000, 0.1);
  }

  playSnapHum(): void {
    const ctx = this.ensureCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  }

  playResonanceNote(shardId: number): void {
    const ctx = this.ensureCtx();
    const baseFreq = 261.63;
    const ratios = [1.0, 1.122, 1.259, 1.334, 1.498, 1.681, 1.887];
    const freq = baseFreq * ratios[shardId % ratios.length];
    const osc1 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc1.connect(gain).connect(ctx.destination);
    osc1.start();
    osc1.stop(ctx.currentTime + 0.4);
  }

  playVictoryChord(): void {
    const ctx = this.ensureCtx();
    const now = ctx.currentTime;
    const notes = [
      { f: 261.63, t: 0 },
      { f: 293.66, t: 0.2 },
      { f: 329.63, t: 0.4 },
      { f: 392.0, t: 0.6 },
      { f: 440.0, t: 0.8 },
      { f: 493.88, t: 1.0 },
      { f: 523.25, t: 1.2 }
    ];
    notes.forEach(({ f, t }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now + t);
      gain.gain.setValueAtTime(0, now + t);
      gain.gain.linearRampToValueAtTime(0.25, now + t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.2);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + t);
      osc.stop(now + t + 0.22);
    });
  }
}
