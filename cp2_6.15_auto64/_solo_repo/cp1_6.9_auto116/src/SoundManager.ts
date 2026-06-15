export class SoundManager {
  private static _instance: SoundManager | null = null;
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private initialized = false;

  private towerAttackBuffer: AudioBuffer | null = null;
  private corePulseBuffer: AudioBuffer | null = null;
  private enemyDestroyBuffer: AudioBuffer | null = null;

  static getInstance(): SoundManager {
    if (!SoundManager._instance) {
      SoundManager._instance = new SoundManager();
    }
    return SoundManager._instance;
  }

  init(): void {
    if (this.initialized) return;
    try {
      const AC =
        (window as unknown as { AudioContext?: typeof AudioContext })
          .AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.25;
      this.masterGain.connect(this.ctx.destination);
      this.generateBuffers();
      this.initialized = true;
    } catch (e) {
      // ignore
    }
  }

  private generateBuffers(): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    this.towerAttackBuffer = this.createSineBuffer(ctx, 600, 0.1, 0.5);
    this.corePulseBuffer = this.createTriangleWithNoiseBuffer(ctx, 300, 0.2, 0.45);
    this.enemyDestroyBuffer = this.createSquareBuffer(ctx, 200, 0.08, 0.35);
  }

  private createSineBuffer(
    ctx: AudioContext,
    freq: number,
    duration: number,
    volume: number
  ): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.max(0, 1 - t / duration);
      data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * volume;
    }
    return buffer;
  }

  private createTriangleWithNoiseBuffer(
    ctx: AudioContext,
    freq: number,
    duration: number,
    volume: number
  ): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.max(0, 1 - t / duration);
      const phase = (t * freq) % 1;
      const tri = phase < 0.5 ? 4 * phase - 1 : 3 - 4 * phase;
      const noise = (Math.random() * 2 - 1) * 0.35;
      data[i] = (tri * 0.7 + noise * 0.3) * envelope * volume;
    }
    return buffer;
  }

  private createSquareBuffer(
    ctx: AudioContext,
    freq: number,
    duration: number,
    volume: number
  ): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.max(0, 1 - t / duration);
      const square = Math.sin(2 * Math.PI * freq * t) >= 0 ? 1 : -1;
      data[i] = square * envelope * volume;
    }
    return buffer;
  }

  private playBuffer(buffer: AudioBuffer | null): void {
    if (!this.initialized || !this.ctx || !this.masterGain || !buffer) return;
    try {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      const gain = this.ctx.createGain();
      gain.gain.value = 1;
      src.connect(gain);
      gain.connect(this.masterGain);
      src.start();
    } catch (e) {
      // ignore
    }
  }

  playTowerAttack(): void {
    this.playBuffer(this.towerAttackBuffer);
  }

  playCorePulse(): void {
    this.playBuffer(this.corePulseBuffer);
  }

  playEnemyDestroy(): void {
    this.playBuffer(this.enemyDestroyBuffer);
  }
}
