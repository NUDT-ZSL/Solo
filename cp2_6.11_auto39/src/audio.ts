export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private microphoneStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private dataArray: Uint8Array | null = null;
  public isMicAuthorized: boolean = false;
  private volumeThreshold: number = 30;

  private noteFrequencies: number[] = [];

  constructor() {
    this.generateNoteFrequencies();
  }

  private generateNoteFrequencies() {
    const c4 = 261.63;
    for (let i = 0; i < 30; i++) {
      this.noteFrequencies.push(c4 * Math.pow(2, i / 12));
    }
  }

  public getNoteFrequency(stringIndex: number): number {
    const idx = Math.max(0, Math.min(this.noteFrequencies.length - 1, stringIndex));
    return this.noteFrequencies[idx];
  }

  public getTotalStrings(): number {
    return this.noteFrequencies.length;
  }

  public async init(): Promise<void> {
    if (this.audioContext) return;
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0.3;
    this.masterGain.connect(this.audioContext.destination);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
  }

  public async authorizeMicrophone(): Promise<boolean> {
    if (this.isMicAuthorized) return true;
    try {
      this.microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!this.audioContext) await this.init();
      if (this.audioContext && this.microphoneStream) {
        this.micSource = this.audioContext.createMediaStreamSource(this.microphoneStream);
        this.micSource.connect(this.analyser!);
      }
      this.isMicAuthorized = true;
      return true;
    } catch (e) {
      console.error('Microphone authorization failed:', e);
      return false;
    }
  }

  public getVolume(): number {
    if (!this.analyser || !this.dataArray || !this.isMicAuthorized) return 0;
    this.analyser.getByteFrequencyData(this.dataArray);
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i];
    }
    const average = sum / this.dataArray.length;
    return (average / 255) * 100;
  }

  public getVolumeThreshold(): number {
    return this.volumeThreshold;
  }

  public playNote(frequency: number, duration: number = 0.3, volume: number = 0.3): void {
    if (!this.audioContext || !this.masterGain) return;
    const ctx = this.audioContext;
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.value = frequency;
    gain1.gain.value = 0;
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(volume, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc1.connect(gain1);
    gain1.connect(this.masterGain);
    osc1.start(now);
    osc1.stop(now + duration + 0.1);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.value = frequency * 2;
    gain2.gain.value = 0;
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.linearRampToValueAtTime(volume * 0.3, now + 0.02);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.7);
    osc2.connect(gain2);
    gain2.connect(this.masterGain);
    osc2.start(now);
    osc2.stop(now + duration + 0.1);

    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'sine';
    osc3.frequency.value = frequency * 3;
    gain3.gain.value = 0;
    gain3.gain.setValueAtTime(0, now);
    gain3.gain.linearRampToValueAtTime(volume * 0.15, now + 0.02);
    gain3.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.5);
    osc3.connect(gain3);
    gain3.connect(this.masterGain);
    osc3.start(now);
    osc3.stop(now + duration + 0.1);
  }

  public playChord(frequencies: number[], duration: number = 1.2, volume: number = 0.25): void {
    frequencies.forEach((freq, i) => {
      setTimeout(() => {
        this.playNote(freq, duration, volume / frequencies.length * 3);
      }, i * 50);
    });
  }

  public playStrongWindChord(frequencies: number[], duration: number = 1.2): void {
    if (!this.audioContext || !this.masterGain) return;
    const ctx = this.audioContext;
    const now = ctx.currentTime;

    const avgFreq = frequencies.reduce((a, b) => a + b, 0) / frequencies.length;

    frequencies.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.value = 0;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.1);
      gain.gain.linearRampToValueAtTime(0.05, now + 0.8);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + duration + 0.1);
    });

    const bassOsc = ctx.createOscillator();
    const bassGain = ctx.createGain();
    bassOsc.type = 'sine';
    bassOsc.frequency.value = avgFreq / 2;
    bassGain.gain.value = 0;
    bassGain.gain.setValueAtTime(0, now);
    bassGain.gain.linearRampToValueAtTime(0.1, now + 0.15);
    bassGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    bassOsc.connect(bassGain);
    bassGain.connect(this.masterGain);
    bassOsc.start(now);
    bassOsc.stop(now + duration + 0.1);
  }

  public resume(): void {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }
}
