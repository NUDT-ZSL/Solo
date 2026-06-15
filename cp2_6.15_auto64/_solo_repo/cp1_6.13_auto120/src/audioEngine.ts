export interface BeatSchedule {
  beats: number[];
  bpm: number;
  duration: number;
}

class AudioEngine {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private startTime: number = 0;
  private pauseTime: number = 0;
  private _isPlaying: boolean = false;
  private volume: number = 0.8;

  get isPlaying(): boolean {
    return this._isPlaying;
  }

  async init() {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = this.volume;
      this.gainNode.connect(this.audioContext.destination);
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  async loadSong(url: string): Promise<AudioBuffer> {
    await this.init();
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    this.audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
    return this.audioBuffer;
  }

  play(): void {
    if (!this.audioContext || !this.audioBuffer || this._isPlaying) return;

    this.sourceNode = this.audioContext.createBufferSource();
    this.sourceNode.buffer = this.audioBuffer;
    this.sourceNode.connect(this.gainNode!);
    this.sourceNode.onended = () => {
      this._isPlaying = false;
    };

    const offset = this.pauseTime;
    this.sourceNode.start(0, offset);
    this.startTime = this.audioContext.currentTime - offset;
    this._isPlaying = true;
  }

  pause(): void {
    if (!this.sourceNode || !this._isPlaying) return;
    this.pauseTime = this.getCurrentTime();
    this.sourceNode.stop();
    this.sourceNode.disconnect();
    this.sourceNode = null;
    this._isPlaying = false;
  }

  stop(): void {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
        this.sourceNode.disconnect();
      } catch {}
      this.sourceNode = null;
    }
    this.pauseTime = 0;
    this.startTime = 0;
    this._isPlaying = false;
  }

  getCurrentTime(): number {
    if (!this.audioContext || !this._isPlaying) return this.pauseTime;
    return this.audioContext.currentTime - this.startTime;
  }

  getDuration(): number {
    return this.audioBuffer?.duration ?? 0;
  }

  setVolume(vol: number): void {
    this.volume = vol / 100;
    if (this.gainNode) {
      this.gainNode.gain.value = this.volume;
    }
  }

  getVolume(): number {
    return Math.round(this.volume * 100);
  }

  getBeatSchedule(beats: number[], bpm: number, duration: number): BeatSchedule {
    return { beats, bpm, duration };
  }

  getCurrentBeatIndex(beatSchedule: BeatSchedule): number {
    const currentTime = this.getCurrentTime();
    let idx = -1;
    for (let i = 0; i < beatSchedule.beats.length; i++) {
      if (currentTime >= beatSchedule.beats[i]) {
        idx = i;
      } else {
        break;
      }
    }
    return idx;
  }

  getProgress(): number {
    const duration = this.getDuration();
    if (duration <= 0) return 0;
    return Math.min(this.getCurrentTime() / duration, 1);
  }
}

export const audioEngine = new AudioEngine();
