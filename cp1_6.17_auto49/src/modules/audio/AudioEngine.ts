export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private oscillators: OscillatorNode[] = [];
  private gains: GainNode[] = [];

  constructor() {
    this.initAudioContext();
  }

  private initAudioContext(): void {
    if (typeof window !== 'undefined' && !this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  public getContextState(): string {
    return this.audioContext?.state || 'uninitialized';
  }

  public resume(): Promise<void> {
    this.initAudioContext();
    if (this.audioContext?.state === 'suspended') {
      return this.audioContext.resume();
    }
    return Promise.resolve();
  }

  public playMelody(frequencies: number[], duration: number = 2000): Promise<void> {
    return new Promise((resolve) => {
      this.initAudioContext();
      this.resume();

      if (!this.audioContext) {
        resolve();
        return;
      }

      const ctx = this.audioContext;
      const noteDuration = duration / frequencies.length;

      frequencies.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + index * noteDuration / 1000);

        gain.gain.setValueAtTime(0, ctx.currentTime + index * noteDuration / 1000);
        gain.gain.linearRampToValueAtTime(
          0.3,
          ctx.currentTime + index * noteDuration / 1000 + 0.01
        );
        gain.gain.linearRampToValueAtTime(
          0,
          ctx.currentTime + (index + 1) * noteDuration / 1000 - 0.05
        );

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + index * noteDuration / 1000);
        osc.stop(ctx.currentTime + (index + 1) * noteDuration / 1000);

        this.oscillators.push(osc);
        this.gains.push(gain);

        osc.onended = () => {
          const oscIndex = this.oscillators.indexOf(osc);
          if (oscIndex > -1) {
            this.oscillators.splice(oscIndex, 1);
            this.gains.splice(oscIndex, 1);
          }
        };
      });

      setTimeout(resolve, duration);
    });
  }

  public playGuitar(): Promise<void> {
    return this.playMelody([261.63, 293.66, 329.63, 392.00, 493.88, 392.00, 329.63, 293.66], 2000);
  }

  public playTrophy(): Promise<void> {
    return this.playMelody([523.25, 659.25, 783.99, 1046.50, 1318.51, 1046.50, 783.99, 659.25], 2000);
  }

  public playPhoto(): Promise<void> {
    return this.playMelody([220.00, 246.94, 261.63, 293.66, 261.63, 246.94, 220.00, 196.00], 2000);
  }

  public playVinyl(): Promise<void> {
    return new Promise((resolve) => {
      this.initAudioContext();
      this.resume();

      if (!this.audioContext) {
        resolve();
        return;
      }

      const ctx = this.audioContext;
      const duration = 2000;

      const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * duration / 1000, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < noiseBuffer.length; i++) {
        output[i] = Math.random() * 0.1 - 0.05;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 2000;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration / 1000);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start();
      noise.stop(ctx.currentTime + duration / 1000);

      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(196, ctx.currentTime);
      oscGain.gain.setValueAtTime(0.2, ctx.currentTime);
      oscGain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration / 1000);
      osc.connect(oscGain);
      oscGain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration / 1000);

      setTimeout(resolve, duration);
    });
  }

  public playPoster(): Promise<void> {
    return this.playMelody([329.63, 392.00, 493.88, 587.33, 659.25, 587.33, 493.88, 392.00], 2000);
  }

  public playPlant(): Promise<void> {
    return this.playMelody([261.63, 246.94, 220.00, 196.00, 174.61, 196.00, 220.00, 246.94], 2000);
  }

  public playCoffee(): Promise<void> {
    return this.playMelody([293.66, 349.23, 440.00, 523.25, 659.25, 523.25, 440.00, 349.23], 2000);
  }

  public playRadio(): Promise<void> {
    return new Promise((resolve) => {
      this.initAudioContext();
      this.resume();

      if (!this.audioContext) {
        resolve();
        return;
      }

      const ctx = this.audioContext;
      const duration = 2000;

      const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * duration / 1000, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < noiseBuffer.length; i++) {
        output[i] = Math.sin(i * 0.1) * 0.1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1000;
      filter.Q.value = 10;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.2, ctx.currentTime);

      const frequencies = [440.00, 392.00, 349.23, 293.66, 329.63, 392.00, 440.00, 493.88];
      frequencies.forEach((freq, index) => {
        filter.frequency.setValueAtTime(freq * 2.27, ctx.currentTime + index * 250 / 1000);
      });

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start();
      noise.stop(ctx.currentTime + duration / 1000);

      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration / 1000);

      setTimeout(resolve, duration);
    });
  }

  public playByItemId(itemId: string): Promise<void> {
    const itemType = itemId.split('-').pop();
    
    switch (itemType) {
      case 'guitar':
        return this.playGuitar();
      case 'trophy':
        return this.playTrophy();
      case 'photo':
        return this.playPhoto();
      case 'vinyl':
        return this.playVinyl();
      case 'poster':
        return this.playPoster();
      case 'plant':
        return this.playPlant();
      case 'coffee':
        return this.playCoffee();
      case 'radio':
        return this.playRadio();
      default:
        return this.playMelody([440, 523.25, 659.25, 783.99]);
    }
  }

  public stopAll(): void {
    this.oscillators.forEach(osc => {
      try {
        osc.stop();
      } catch (e) {}
    });
    this.oscillators = [];
    this.gains = [];
  }

  public destroy(): void {
    this.stopAll();
    this.audioContext?.close();
    this.audioContext = null;
  }
}

export const audioEngine = new AudioEngine();
