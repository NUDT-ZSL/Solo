export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  constructor() {}

  private ensureContext(): void {
    if (!this.audioContext) {
      const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
      this.audioContext = new Ctx();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.5;
      this.masterGain.connect(this.audioContext.destination);
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  public playNote(frequency: number, duration: number = 0.4): void {
    this.ensureContext();
    if (!this.audioContext || !this.masterGain) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(frequency, now);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(frequency * 2, now);

    const osc2Gain = ctx.createGain();
    osc2Gain.gain.setValueAtTime(0.2, now);

    const attackTime = 0.01;
    const decayTime = 0.08;
    const sustainLevel = 0.3;
    const releaseTime = 0.3;

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.6, now + attackTime);
    gainNode.gain.linearRampToValueAtTime(sustainLevel * 0.6, now + attackTime + decayTime);
    gainNode.gain.setValueAtTime(sustainLevel * 0.6, now + duration);
    gainNode.gain.linearRampToValueAtTime(0, now + duration + releaseTime);

    osc2Gain.gain.setValueAtTime(0, now);
    osc2Gain.gain.linearRampToValueAtTime(0.2, now + attackTime);
    osc2Gain.gain.linearRampToValueAtTime(sustainLevel * 0.2, now + attackTime + decayTime);
    osc2Gain.gain.setValueAtTime(sustainLevel * 0.2, now + duration);
    osc2Gain.gain.linearRampToValueAtTime(0, now + duration + releaseTime);

    osc1.connect(gainNode);
    osc2.connect(osc2Gain);
    osc2Gain.connect(gainNode);
    gainNode.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + duration + releaseTime + 0.05);
    osc2.stop(now + duration + releaseTime + 0.05);
  }
}
