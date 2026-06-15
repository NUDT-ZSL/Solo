export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private enabled = true;
  private initialized = false;

  private ensure(): void {
    if (this.initialized) return;
    try {
      const AC =
        (window.AudioContext as typeof AudioContext) ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.25;
      this.masterGain.connect(this.ctx.destination);
      this.initialized = true;
    } catch (e) {
      this.enabled = false;
    }
  }

  resumeOnUserGesture(): void {
    this.ensure();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => undefined);
    }
  }

  private beep(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume = 0.4,
    freqEnd?: number,
  ): void {
    if (!this.enabled) return;
    this.ensure();
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (freqEnd !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), now + duration);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain).connect(this.masterGain);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  playMove(): void {
    this.beep(880, 0.06, 'sine', 0.25, 990);
  }

  playCrystal(): void {
    this.ensure();
    if (!this.ctx || !this.masterGain || !this.enabled) return;
    this.beep(1320, 0.25, 'sine', 0.3, 1760);
    setTimeout(() => this.beep(1760, 0.2, 'sine', 0.25, 2100), 60);
    setTimeout(() => this.beep(2100, 0.18, 'triangle', 0.2), 120);
  }

  playTrapClear(): void {
    this.beep(180, 0.3, 'sawtooth', 0.25, 80);
  }

  playGameOver(): void {
    this.beep(440, 0.2, 'square', 0.3, 220);
    setTimeout(() => this.beep(220, 0.3, 'square', 0.28, 110), 150);
  }

  playLevelUp(): void {
    const notes = [523, 659, 784, 1047];
    notes.forEach((n, i) => {
      setTimeout(() => this.beep(n, 0.18, 'triangle', 0.3), i * 90);
    });
  }

  playVictory(): void {
    const notes = [523, 659, 784, 880, 1047, 1319, 1568];
    notes.forEach((n, i) => {
      setTimeout(() => this.beep(n, 0.3, 'triangle', 0.32), i * 130);
    });
  }

  playStep(): void {
    this.beep(660, 0.05, 'sine', 0.15);
  }
}
