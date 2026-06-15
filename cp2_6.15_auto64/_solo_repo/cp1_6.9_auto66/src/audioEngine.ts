class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private initialized = false;

  ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      try {
        const AC =
          (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!AC) return null;
        const ctx: AudioContext = new AC();
        this.ctx = ctx;
        const mg = ctx.createGain();
        mg.gain.value = 0.5;
        mg.connect(ctx.destination);
        this.masterGain = mg;
      } catch (e) {
        return null;
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    this.initialized = true;
    return this.ctx;
  }

  resume() {
    const ctx = this.ensureContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  }

  private playTone(
    frequency: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume: number = 0.3,
    attack: number = 0.01,
    decay: number = 0.1,
    sustain: number = 0.5,
    release: number = 0.1,
    freqEnd?: number
  ) {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    const now = ctx.currentTime;

    osc.frequency.setValueAtTime(frequency, now);
    if (freqEnd !== undefined) {
      osc.frequency.linearRampToValueAtTime(freqEnd, now + duration);
    }

    const peakVolume = volume;
    const sustainVolume = peakVolume * sustain;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(peakVolume, now + attack);
    gain.gain.linearRampToValueAtTime(sustainVolume, now + attack + decay);
    gain.gain.setValueAtTime(
      sustainVolume,
      now + Math.max(attack + decay, duration - release)
    );
    gain.gain.linearRampToValueAtTime(
      0,
      now + Math.max(attack + decay + release, duration)
    );

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + duration + release + 0.02);
  }

  playClick() {
    this.playTone(800, 0.06, 'square', 0.12, 0.005, 0.02, 0.1, 0.03);
  }

  playRotate() {
    this.playTone(660, 0.08, 'triangle', 0.15, 0.01, 0.03, 0.2, 0.04);
  }

  playUnlock(level: number = 1) {
    const startFreq = 523;
    const endFreq = 1047;
    const baseDuration = 0.5;
    this.playTone(
      startFreq,
      baseDuration + (level - 1) * 0.1,
      'sawtooth',
      0.22,
      0.02,
      0.08,
      0.6,
      0.15,
      endFreq
    );
    setTimeout(() => {
      this.playTone(
        endFreq * 1.5,
        0.3,
        'sine',
        0.15,
      0.02,
      0.05,
      0.4,
      0.12
      );
    }, 150);
  }

  playFinalVictory() {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const c5 = 523.25;
    const e5 = 659.25;
    const g5 = 783.99;
    const c6 = 1046.5;
    const duration = 2.2;
    const notes = [c5, e5, g5, c6];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(
          freq,
          duration - i * 0.1,
          'sine',
          0.18,
          0.04,
          0.15,
          0.7,
          0.6
        );
      }, i * 80);
    });
    setTimeout(() => {
      this.playTone(c6 * 2, 1.5, 'triangle', 0.12, 0.1, 0.3, 0.5, 0.8);
    }, 400);
  }

  playHint() {
    this.playTone(880, 0.12, 'sine', 0.18, 0.01, 0.04, 0.3, 0.08);
    setTimeout(
      () => this.playTone(1174, 0.12, 'sine', 0.18, 0.01, 0.04, 0.3, 0.08),
      80
    );
  }

  playReset() {
    this.playTone(330, 0.08, 'square', 0.12, 0.01, 0.03, 0.2, 0.05);
    setTimeout(
      () => this.playTone(220, 0.1, 'square', 0.12, 0.01, 0.04, 0.2, 0.06),
      60
    );
  }
}

export const audioEngine = new AudioEngine();
