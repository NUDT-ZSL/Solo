export enum ElementType {
  FIRE = 'fire',
  WATER = 'water',
  WIND = 'wind',
  EARTH = 'earth',
  LIGHT = 'light',
}

const ELEMENT_FREQUENCIES: Record<ElementType, number> = {
  [ElementType.FIRE]: 523,
  [ElementType.WATER]: 659,
  [ElementType.WIND]: 784,
  [ElementType.EARTH]: 440,
  [ElementType.LIGHT]: 880,
};

interface QueuedSound {
  element: ElementType;
  delay: number;
  scheduled: boolean;
}

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private queue: QueuedSound[] = [];
  private volume = 0.35;
  private initialized = false;

  public init(): void {
    if (this.initialized) return;
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.ctx.destination);
      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported', e);
    }
  }

  public resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  public playElementSound(element: ElementType, delayMs = 0): void {
    if (!this.initialized) this.init();
    this.queue.push({ element, delay: delayMs, scheduled: false });
  }

  public playTideSound(): void {
    if (!this.initialized || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const freqs = [523, 659, 784, 880, 1047];
    freqs.forEach((f, i) => {
      this.playTone(f, now + i * 0.08, 0.5, 'triangle', 0.2);
    });
  }

  public update(nowTime: number): void {
    if (!this.initialized || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    for (const q of this.queue) {
      if (!q.scheduled) {
        const freq = ELEMENT_FREQUENCIES[q.element];
        const startAt = now + q.delay / 1000;
        this.playTone(freq, startAt, 0.35, 'sine', 0.3);
        this.playTone(freq * 2, startAt, 0.35, 'sine', 0.12);
        q.scheduled = true;
      }
    }
    this.queue = this.queue.filter(q => !q.scheduled || (this.ctx && now + 2 < this.ctx.currentTime));
    this.queue = [];
    void nowTime;
  }

  private playTone(freq: number, startTime: number, duration: number, type: OscillatorType, gain: number): void {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    g.gain.setValueAtTime(0, startTime);
    g.gain.linearRampToValueAtTime(gain, startTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }
}
