export type SpectrumColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'indigo' | 'violet';

export const SPECTRUM_FREQUENCIES: Record<SpectrumColor, number> = {
  red: 440.0,
  orange: 493.88,
  yellow: 523.25,
  green: 587.33,
  blue: 659.25,
  indigo: 698.46,
  violet: 783.99
};

export const SPECTRUM_COLORS: Record<SpectrumColor, string> = {
  red: '#FF0000',
  orange: '#FF7F00',
  yellow: '#FFFF00',
  green: '#00FF00',
  blue: '#0000FF',
  indigo: '#4B0082',
  violet: '#9400D3'
};

export const SPECTRUM_ORDER: SpectrumColor[] = ['red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'violet'];

interface AudioTrack {
  oscillator: OscillatorNode;
  gainNode: GainNode;
  active: boolean;
  targetVolume: number;
  currentVolume: number;
}

class AudioManager {
  private audioContext: AudioContext | null = null;
  private tracks: Map<SpectrumColor, AudioTrack> = new Map();
  private masterGain: GainNode | null = null;
  private initialized = false;
  private animationFrameId: number | null = null;

  constructor() {
    this.initContext();
  }

  private initContext(): void {
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioContextClass();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.5;
      this.masterGain.connect(this.audioContext.destination);
    } catch (e) {
      console.warn('Web Audio API not supported:', e);
    }
  }

  public async ensureInitialized(): Promise<void> {
    if (!this.audioContext) {
      this.initContext();
    }
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    if (!this.initialized && this.audioContext && this.masterGain) {
      this.createAllOscillators();
      this.initialized = true;
      this.startVolumeRamp();
    }
  }

  private createAllOscillators(): void {
    if (!this.audioContext || !this.masterGain) return;

    SPECTRUM_ORDER.forEach((color) => {
      const oscillator = this.audioContext!.createOscillator();
      const gainNode = this.audioContext!.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.value = SPECTRUM_FREQUENCIES[color];
      gainNode.gain.value = 0;

      oscillator.connect(gainNode);
      gainNode.connect(this.masterGain!);
      oscillator.start();

      this.tracks.set(color, {
        oscillator,
        gainNode,
        active: false,
        targetVolume: 0,
        currentVolume: 0
      });
    });
  }

  private startVolumeRamp(): void {
    const ramp = () => {
      this.tracks.forEach((track) => {
        const diff = track.targetVolume - track.currentVolume;
        track.currentVolume += diff * 0.1;
        if (Math.abs(diff) < 0.0001) {
          track.currentVolume = track.targetVolume;
        }
        track.gainNode.gain.value = track.currentVolume;
      });
      this.animationFrameId = requestAnimationFrame(ramp);
    };
    ramp();
  }

  public setColorVolume(color: SpectrumColor, widthRatio: number, isActive: boolean): void {
    const track = this.tracks.get(color);
    if (!track) return;

    if (isActive && widthRatio > 0) {
      const baseVolume = 0.1 + Math.random() * 0.2;
      track.targetVolume = Math.min(0.3, baseVolume * Math.max(0.3, Math.min(1, widthRatio)));
      track.active = true;
    } else {
      track.targetVolume = 0;
      track.active = false;
    }
  }

  public setAllVolumes(colorData: { color: SpectrumColor; widthRatio: number; isActive: boolean }[]): void {
    colorData.forEach(({ color, widthRatio, isActive }) => {
      this.setColorVolume(color, widthRatio, isActive);
    });
  }

  public flashColor(color: SpectrumColor, flashVolume: number = 0.4, duration: number = 200): void {
    const track = this.tracks.get(color);
    if (!track || !this.audioContext) return;

    const originalTarget = track.targetVolume;
    track.targetVolume = flashVolume;

    setTimeout(() => {
      track.targetVolume = originalTarget;
    }, duration);
  }

  public stopAll(): void {
    this.tracks.forEach((track) => {
      track.targetVolume = 0;
      track.active = false;
    });
  }

  public destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.tracks.forEach((track) => {
      try {
        track.oscillator.stop();
        track.oscillator.disconnect();
        track.gainNode.disconnect();
      } catch (e) {
        // ignore
      }
    });
    this.tracks.clear();
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}

export const audioManager = new AudioManager();
