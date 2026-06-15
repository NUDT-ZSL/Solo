interface ActiveSound {
  source: AudioBufferSourceNode | OscillatorNode;
  gain: GainNode;
  endTime: number;
}

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeSounds: ActiveSound[] = [];
  private maxConcurrent = 3;
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.4;
      this.masterGain.connect(this.ctx.destination);
      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported:', e);
    }
  }

  private ensureContext(): void {
    if (!this.initialized) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private cleanupExpired(): void {
    const now = performance.now();
    this.activeSounds = this.activeSounds.filter(s => {
      if (now >= s.endTime) {
        try {
          if ('buffer' in s.source) {
            s.source.stop();
          } else {
            s.source.stop();
          }
        } catch (_) { /* noop */ }
        s.source.disconnect();
        s.gain.disconnect();
        return false;
      }
      return true;
    });
  }

  private canPlay(): boolean {
    this.cleanupExpired();
    return this.activeSounds.length < this.maxConcurrent;
  }

  playSuccess(): void {
    if (!this.ctx || !this.masterGain) { this.ensureContext(); if (!this.ctx || !this.masterGain) return; }
    if (!this.canPlay()) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.08);
    osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
    this.activeSounds.push({ source: osc, gain, endTime: performance.now() + 350 });
  }

  playFailure(): void {
    if (!this.ctx || !this.masterGain) { this.ensureContext(); if (!this.ctx || !this.masterGain) return; }
    if (!this.canPlay()) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
    this.activeSounds.push({ source: osc, gain, endTime: performance.now() + 550 });
  }

  playCoinDrop(): void {
    if (!this.ctx || !this.masterGain) { this.ensureContext(); if (!this.ctx || !this.masterGain) return; }
    if (!this.canPlay()) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
    this.activeSounds.push({ source: osc, gain, endTime: performance.now() + 200 });
  }

  playExplosion(): void {
    if (!this.ctx || !this.masterGain) { this.ensureContext(); if (!this.ctx || !this.masterGain) return; }
    if (!this.canPlay()) return;
    const ctx = this.ctx;
    const bufferSize = ctx.sampleRate * 0.6;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500, ctx.currentTime);
    gain.gain.setValueAtTime(0.6, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(ctx.currentTime);
    noise.stop(ctx.currentTime + 0.6);
    this.activeSounds.push({ source: noise, gain, endTime: performance.now() + 650 });
  }

  playBrewing(): void {
    if (!this.ctx || !this.masterGain) { this.ensureContext(); if (!this.ctx || !this.masterGain) return; }
    if (!this.canPlay()) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(60, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(90, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
    this.activeSounds.push({ source: osc, gain, endTime: performance.now() + 450 });
  }

  playClick(): void {
    if (!this.ctx || !this.masterGain) { this.ensureContext(); if (!this.ctx || !this.masterGain) return; }
    if (!this.canPlay()) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(500, ctx.currentTime);
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.08);
    this.activeSounds.push({ source: osc, gain, endTime: performance.now() + 100 });
  }
}
