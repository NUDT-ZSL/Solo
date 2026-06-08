export class AudioManager {
  private audioContext: AudioContext | null = null;
  private scheduledBeats: Set<number> = new Set();
  private startTime = 0;
  private isPlaying = false;
  private observer: { x: number } | null = null;
  private beats: { x: number }[] = [];
  private scrollX: number = 0;
  private playSpeed = 300;

  private ensureContext(): void {
    if (!this.audioContext) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AC();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  setObserver(observer: { x: number }): void {
    this.observer = observer;
  }

  setBeats(beats: { x: number }[]): void {
    this.beats = beats;
  }

  setPlaySpeed(speed: number): void {
    this.playSpeed = speed;
  }

  start(): void {
    this.ensureContext();
    this.startTime = performance.now();
    this.scheduledBeats.clear();
    this.isPlaying = true;
  }

  stop(): void {
    this.isPlaying = false;
    this.scheduledBeats.clear();
  }

  setScrollX(x: number): void {
    this.scrollX = x;
  }

  update(): void {
    if (!this.isPlaying || !this.observer) return;

    const playerX = this.observer.x;
    const threshold = 20;

    for (let i = 0; i < this.beats.length; i++) {
      const beat = this.beats[i];
      if (this.scheduledBeats.has(i)) continue;

      const distance = beat.x - playerX;
      if (distance <= threshold && distance >= -10) {
        this.playKick();
        this.scheduledBeats.add(i);
      }
    }
  }

  playKick(): void {
    this.ensureContext();
    if (!this.audioContext) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);

    gain.gain.setValueAtTime(0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  playHit(): void {
    this.ensureContext();
    if (!this.audioContext) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  playSuccess(): void {
    this.ensureContext();
    if (!this.audioContext) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);

      gain.gain.setValueAtTime(0.4, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.15);
    });
  }
}
