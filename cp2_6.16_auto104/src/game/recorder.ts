import { FrameData, Player } from './entities';

export class Recorder {
  private buffer: FrameData[] = [];
  private maxDuration: number = 3;
  private frameInterval: number = 1 / 60;
  private maxFrames: number = Math.ceil(this.maxDuration / this.frameInterval);

  recordFrame(player: Player): void {
    const frame: FrameData = {
      x: player.x,
      y: player.y,
      vx: player.vx,
      vy: player.vy,
      onGround: player.onGround
    };

    this.buffer.push(frame);

    if (this.buffer.length > this.maxFrames) {
      this.buffer.shift();
    }
  }

  getLast3Seconds(): FrameData[] {
    if (this.buffer.length === 0) {
      return [];
    }
    return [...this.buffer];
  }

  getCloneRemainingTime(): number {
    return this.maxDuration;
  }

  clear(): void {
    this.buffer = [];
  }

  getBufferLength(): number {
    return this.buffer.length;
  }

  getMaxFrames(): number {
    return this.maxFrames;
  }

  hasEnoughData(): boolean {
    return this.buffer.length >= this.maxFrames * 0.5;
  }
}
