export interface RecordEvent {
  stringIndex: number;
  timestamp: number;
}

export interface MelodyData {
  name: string;
  duration: number;
  events: RecordEvent[];
  stringCount: number;
  toneLevel: string;
  createdAt: number;
}

const STORAGE_KEY_PREFIX = 'liuguang_melody_';
const MAX_DURATION = 30;

export class Recorder {
  private isRecording: boolean = false;
  private isPlaying: boolean = false;
  private events: RecordEvent[] = [];
  private startTime: number = 0;
  private playStartTime: number = 0;
  private playEvents: RecordEvent[] = [];
  private playIndex: number = 0;
  private playDuration: number = 0;
  private currentStringCount: number = 12;
  private currentToneLevel: string = 'mid';
  
  public onTrigger?: (index: number) => void;
  public onRecordingStop?: () => void;
  public onPlaybackStart?: () => void;
  public onPlaybackStop?: () => void;
  public onPlaybackProgress?: (current: number, total: number) => void;

  constructor() {}

  public startRecording(stringCount: number, toneLevel: string): void {
    if (this.isRecording) return;
    
    this.events = [];
    this.startTime = performance.now();
    this.isRecording = true;
    this.currentStringCount = stringCount;
    this.currentToneLevel = toneLevel;
  }

  public stopRecording(): MelodyData | null {
    if (!this.isRecording) return null;
    
    this.isRecording = false;
    const endTime = performance.now();
    const duration = Math.min(MAX_DURATION, (endTime - this.startTime) / 1000);
    
    if (this.events.length === 0) {
      return null;
    }

    const now = new Date();
    const timestamp = `${now.getFullYear()}${this.pad(now.getMonth() + 1)}${this.pad(now.getDate())}_${this.pad(now.getHours())}${this.pad(now.getMinutes())}${this.pad(now.getSeconds())}`;
    const name = `melody_${timestamp}.json`;

    const melody: MelodyData = {
      name,
      duration,
      events: this.events,
      stringCount: this.currentStringCount,
      toneLevel: this.currentToneLevel,
      createdAt: Date.now(),
    };

    this.saveToStorage(name, melody);
    
    if (this.onRecordingStop) {
      this.onRecordingStop();
    }
    
    return melody;
  }

  private pad(n: number): string {
    return n.toString().padStart(2, '0');
  }

  public recordEvent(stringIndex: number): void {
    if (!this.isRecording) return;
    
    const elapsed = (performance.now() - this.startTime) / 1000;
    if (elapsed > MAX_DURATION) {
      this.stopRecording();
      return;
    }

    this.events.push({
      stringIndex,
      timestamp: elapsed * 1000,
    });
  }

  public isRecordingActive(): boolean {
    return this.isRecording;
  }

  public isPlayingActive(): boolean {
    return this.isPlaying;
  }

  public getMaxDuration(): number {
    return MAX_DURATION;
  }

  public getCurrentRecordingTime(): number {
    if (!this.isRecording) return 0;
    return Math.min(MAX_DURATION, (performance.now() - this.startTime) / 1000);
  }

  private saveToStorage(name: string, data: MelodyData): void {
    try {
      const key = STORAGE_KEY_PREFIX + name;
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save melody:', e);
    }
  }

  private loadFromStorage(name: string): MelodyData | null {
    try {
      const key = STORAGE_KEY_PREFIX + name;
      const data = localStorage.getItem(key);
      if (!data) return null;
      return JSON.parse(data);
    } catch (e) {
      console.error('Failed to load melody:', e);
      return null;
    }
  }

  public deleteMelody(name: string): void {
    try {
      const key = STORAGE_KEY_PREFIX + name;
      localStorage.removeItem(key);
    } catch (e) {
      console.error('Failed to delete melody:', e);
    }
  }

  public getAllMelodies(): MelodyData[] {
    const melodies: MelodyData[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            const melody = JSON.parse(data);
            melodies.push(melody);
          }
        } catch (e) {
          // skip invalid
        }
      }
    }
    
    return melodies.sort((a, b) => b.createdAt - a.createdAt);
  }

  public playMelody(name: string): boolean {
    const melody = this.loadFromStorage(name);
    if (!melody) return false;

    this.stopPlayback();
    
    this.playEvents = [...melody.events];
    this.playDuration = melody.duration;
    this.playIndex = 0;
    this.isPlaying = true;
    this.playStartTime = performance.now();

    if (this.onPlaybackStart) {
      this.onPlaybackStart();
    }

    return true;
  }

  public stopPlayback(): void {
    if (!this.isPlaying) return;
    
    this.isPlaying = false;
    this.playIndex = 0;
    this.playEvents = [];
    
    if (this.onPlaybackStop) {
      this.onPlaybackStop();
    }
  }

  public update(): void {
    if (!this.isPlaying) return;

    const elapsed = (performance.now() - this.playStartTime);
    
    if (this.onPlaybackProgress) {
      this.onPlaybackProgress(elapsed / 1000, this.playDuration);
    }

    while (this.playIndex < this.playEvents.length) {
      const event = this.playEvents[this.playIndex];
      if (elapsed >= event.timestamp) {
        if (this.onTrigger) {
          this.onTrigger(event.stringIndex);
        }
        this.playIndex++;
      } else {
        break;
      }
    }

    if (elapsed >= this.playDuration * 1000) {
      this.stopPlayback();
    }
  }

  public formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}
