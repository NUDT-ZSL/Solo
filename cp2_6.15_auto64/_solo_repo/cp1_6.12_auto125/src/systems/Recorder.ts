import { RecordedFrame, InputState, AttackType } from '../types';

const RECORD_DURATION = 5;

export class Recorder {
  private frames: RecordedFrame[] = [];
  private startTime: number = 0;
  private isRecording: boolean = false;
  private isPlaying: boolean = false;
  private playTime: number = 0;
  private attackEventsThisFrame: { type: AttackType; x: number; y: number }[] = [];
  private hitsThisFrame: { x: number; y: number }[] = [];

  public startRecording(): void {
    this.isRecording = true;
    this.frames = [];
    this.startTime = performance.now() / 1000;
  }

  public stopRecording(): void {
    this.isRecording = false;
  }

  public toggleRecording(): boolean {
    if (this.isRecording) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
    return this.isRecording;
  }

  public recordFrame(playerX: number, playerY: number, inputs: InputState): void {
    if (!this.isRecording) return;

    const now = performance.now() / 1000;
    const elapsed = now - this.startTime;

    this.frames.push({
      timestamp: elapsed,
      playerX,
      playerY,
      inputs: { ...inputs },
      attackEvents: [...this.attackEventsThisFrame],
      hits: [...this.hitsThisFrame],
    });

    this.attackEventsThisFrame = [];
    this.hitsThisFrame = [];

    while (this.frames.length > 0 && elapsed - this.frames[0].timestamp > RECORD_DURATION) {
      this.frames.shift();
    }
  }

  public addAttackEvent(type: AttackType, x: number, y: number): void {
    this.attackEventsThisFrame.push({ type, x, y });
  }

  public addHit(x: number, y: number): void {
    this.hitsThisFrame.push({ x, y });
  }

  public startPlayback(): boolean {
    if (this.frames.length < 2) return false;
    this.isPlaying = true;
    this.playTime = this.frames[0].timestamp;
    return true;
  }

  public stopPlayback(): void {
    this.isPlaying = false;
  }

  public updatePlayback(dt: number): RecordedFrame | null {
    if (!this.isPlaying || this.frames.length < 2) return null;

    this.playTime += dt;

    const endTime = this.frames[this.frames.length - 1].timestamp;
    if (this.playTime >= endTime) {
      this.isPlaying = false;
      return this.frames[this.frames.length - 1];
    }

    for (let i = 0; i < this.frames.length - 1; i++) {
      if (this.playTime >= this.frames[i].timestamp && this.playTime < this.frames[i + 1].timestamp) {
        const t = (this.playTime - this.frames[i].timestamp) / 
                  (this.frames[i + 1].timestamp - this.frames[i].timestamp);
        return this.interpolateFrame(this.frames[i], this.frames[i + 1], t);
      }
    }

    return this.frames[0];
  }

  private interpolateFrame(a: RecordedFrame, b: RecordedFrame, t: number): RecordedFrame {
    return {
      timestamp: a.timestamp + (b.timestamp - a.timestamp) * t,
      playerX: a.playerX + (b.playerX - a.playerX) * t,
      playerY: a.playerY + (b.playerY - a.playerY) * t,
      inputs: t < 0.5 ? a.inputs : b.inputs,
      attackEvents: t < 0.5 ? a.attackEvents : b.attackEvents,
      hits: t < 0.5 ? a.hits : b.hits,
    };
  }

  public getTrailPoints(): { x: number; y: number }[] {
    return this.frames.map(f => ({ x: f.playerX, y: f.playerY }));
  }

  public getHitMarkers(): { x: number; y: number }[] {
    const markers: { x: number; y: number }[] = [];
    for (const frame of this.frames) {
      markers.push(...frame.hits);
    }
    return markers;
  }

  public getIsRecording(): boolean {
    return this.isRecording;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public hasRecording(): boolean {
    return this.frames.length > 10;
  }

  public getFrames(): RecordedFrame[] {
    return this.frames;
  }
}
