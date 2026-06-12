import { PlatformData } from '../types';

export class Platform {
  public data: PlatformData;

  constructor(x: number, y: number, width: number, height: number, isGround: boolean = false) {
    this.data = { x, y, width, height, isGround };
  }

  public render(ctx: CanvasRenderingContext2D): void {
    const { x, y, width, height, isGround } = this.data;
    ctx.imageSmoothingEnabled = false;

    if (isGround) {
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(x, y, width, height);
      ctx.fillStyle = '#6B3410';
      for (let px = 0; px < width; px += 16) {
        for (let py = 0; py < height; py += 16) {
          if ((px + py) % 32 === 0) {
            ctx.fillRect(x + px, y + py, 8, 8);
          }
        }
      }
      ctx.fillStyle = '#228B22';
      ctx.fillRect(x, y, width, 6);
      ctx.fillStyle = '#32CD32';
      for (let px = 0; px < width; px += 8) {
        ctx.fillRect(x + px, y, 4, 4);
      }
    } else {
      ctx.fillStyle = '#D3D3D3';
      ctx.fillRect(x, y, width, height);
      ctx.fillStyle = '#A9A9A9';
      ctx.fillRect(x, y + height - 4, width, 4);
      ctx.fillStyle = '#E8E8E8';
      ctx.fillRect(x, y, width, 3);
      ctx.fillStyle = '#B0B0B0';
      for (let px = 8; px < width - 8; px += 24) {
        ctx.fillRect(x + px, y + 8, 2, height - 16);
      }
    }
  }
}
