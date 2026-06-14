import { GameEvent } from '../types';
import { eventBus } from './EventBus';

interface AudioTrack {
  buffer: AudioBuffer | null;
  source: AudioBufferSourceNode | null;
  gainNode: GainNode | null;
  isPlaying: boolean;
  volume: number;
}

class AudioManager {
  private audioContext: AudioContext | null = null;
  private tracks: Map<string, AudioTrack> = new Map();
  private masterGain: GainNode | null = null;
  private isInitialized: boolean = false;
  private currentAmbient: string | null = null;
  private fadeDuration: number = 1000;

  async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      this.masterGain.gain.value = 0.5;

      this.isInitialized = true;
      this.setupEventListeners();
    } catch (error) {
      console.error('Failed to initialize AudioManager:', error);
    }
  }

  private setupEventListeners(): void {
    eventBus.on(GameEvent.PLAY_SOUND, (soundName: string, volume?: number) => {
      this.playSound(soundName, volume);
    });

    eventBus.on(GameEvent.STOP_SOUND, (soundName: string) => {
      this.stopSound(soundName);
    });

    eventBus.on(GameEvent.FADE_SOUND, (soundName: string, targetVolume: number, duration?: number) => {
      this.fadeTo(soundName, targetVolume, duration);
    });

    eventBus.on(GameEvent.SCENE_CHANGE, (sceneData: any) => {
      if (sceneData.ambientSound) {
        this.switchAmbient(sceneData.ambientSound);
      } else {
        this.stopCurrentAmbient();
      }
    });
  }

  async preloadSound(soundName: string, url: string): Promise<void> {
    if (!this.audioContext) {
      await this.init();
    }

    if (this.tracks.has(soundName) && this.tracks.get(soundName)!.buffer) {
      return;
    }

    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);

      this.tracks.set(soundName, {
        buffer: audioBuffer,
        source: null,
        gainNode: null,
        isPlaying: false,
        volume: 1,
      });
    } catch (error) {
      console.error(`Failed to preload sound ${soundName}:`, error);
    }
  }

  async playSound(soundName: string, volume: number = 1): Promise<void> {
    if (!this.isInitialized) {
      await this.init();
    }

    if (!this.audioContext || !this.masterGain) return;

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    const track = this.tracks.get(soundName);
    if (!track || !track.buffer) {
      console.warn(`Sound ${soundName} not preloaded`);
      return;
    }

    if (track.isPlaying && track.source) {
      track.source.stop();
    }

    const source = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();

    source.buffer = track.buffer;
    source.loop = soundName.includes('ambient') || soundName.includes('bg');
    gainNode.gain.value = volume;

    source.connect(gainNode);
    gainNode.connect(this.masterGain);

    source.start();
    source.onended = () => {
      if (track.source === source) {
        track.isPlaying = false;
      }
    };

    track.source = source;
    track.gainNode = gainNode;
    track.isPlaying = true;
    track.volume = volume;
  }

  stopSound(soundName: string): void {
    const track = this.tracks.get(soundName);
    if (track && track.source) {
      track.source.stop();
      track.isPlaying = false;
      track.source = null;
    }
  }

  fadeTo(soundName: string, targetVolume: number, duration: number = this.fadeDuration): void {
    const track = this.tracks.get(soundName);
    if (!track || !track.gainNode || !this.audioContext) return;

    const currentTime = this.audioContext.currentTime;
    track.gainNode.gain.cancelScheduledValues(currentTime);
    track.gainNode.gain.setValueAtTime(track.volume, currentTime);
    track.gainNode.gain.linearRampToValueAtTime(targetVolume, currentTime + duration / 1000);
    track.volume = targetVolume;
  }

  async switchAmbient(newAmbient: string): Promise<void> {
    if (this.currentAmbient === newAmbient) return;

    if (this.currentAmbient) {
      this.fadeTo(this.currentAmbient, 0, this.fadeDuration);
      setTimeout(() => {
        if (this.currentAmbient && this.currentAmbient !== newAmbient) {
          this.stopSound(this.currentAmbient);
        }
      }, this.fadeDuration);
    }

    this.currentAmbient = newAmbient;
    await this.playSound(newAmbient, 0);
    setTimeout(() => {
      this.fadeTo(newAmbient, 0.3, this.fadeDuration);
    }, 50);
  }

  stopCurrentAmbient(): void {
    if (this.currentAmbient) {
      this.fadeTo(this.currentAmbient, 0, this.fadeDuration);
      setTimeout(() => {
        if (this.currentAmbient) {
          this.stopSound(this.currentAmbient);
          this.currentAmbient = null;
        }
      }, this.fadeDuration);
    }
  }

  setMasterVolume(volume: number): void {
    if (this.masterGain && this.audioContext) {
      this.masterGain.gain.setValueAtTime(volume, this.audioContext.currentTime);
    }
  }

  getMasterVolume(): number {
    return this.masterGain ? this.masterGain.gain.value : 0;
  }

  resume(): void {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  destroy(): void {
    this.tracks.forEach((track) => {
      if (track.source) {
        track.source.stop();
      }
    });
    this.tracks.clear();
    if (this.audioContext) {
      this.audioContext.close();
    }
    this.isInitialized = false;
  }
}

export const audioManager = new AudioManager();
export default audioManager;
