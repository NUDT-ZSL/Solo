import { Mirror, CELL_SIZE, MIRROR_HALF_LEN, gridToPixel } from './GameEngine';

export class MirrorManager {
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  drawGrid(offsetX: number, offsetY: number, cols: number, rows: number) {
    const ctx = this.ctx;
    ctx.save();

    ctx.strokeStyle = 'rgba(60, 80, 90, 0.25)';
    ctx.lineWidth = 0.5;

    for (let c = 0; c <= cols; c++) {
      const x = offsetX + c * CELL_SIZE;
      ctx.beginPath();
      ctx.moveTo(x, offsetY);
      ctx.lineTo(x, offsetY + rows * CELL_SIZE);
      ctx.stroke();
    }

    for (let r = 0; r <= rows; r++) {
      const y = offsetY + r * CELL_SIZE;
      ctx.beginPath();
      ctx.moveTo(offsetX, y);
      ctx.lineTo(offsetX + cols * CELL_SIZE, y);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(60, 80, 90, 0.12)';
    ctx.setLineDash([2, 6]);
    for (let c = 0; c <= cols; c++) {
      for (let r = 0; r <= rows; r++) {
        const x = offsetX + c * CELL_SIZE;
        const y = offsetY + r * CELL_SIZE;
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.setLineDash([]);

    ctx.restore();
  }

  drawMirror(mirror: Mirror, offsetX: number, offsetY: number) {
    const ctx = this.ctx;
    const center = gridToPixel(mirror.gridX, mirror.gridY, offsetX, offsetY);
    const drawX = center.x + mirror.shakeOffset.x;
    const drawY = center.y + mirror.shakeOffset.y;
    const rad = (mirror.angle * Math.PI) / 180;
    const dx = Math.cos(rad) * MIRROR_HALF_LEN;
    const dy = -Math.sin(rad) * MIRROR_HALF_LEN;

    ctx.save();

    if (mirror.glowIntensity > 0.01) {
      const glowAlpha = mirror.glowIntensity * 0.4;
      ctx.shadowColor = `rgba(0, 180, 255, ${glowAlpha})`;
      ctx.shadowBlur = 18 * mirror.glowIntensity;
    }

    const isHighlighted = mirror.highlighted || mirror.id === undefined;
    const baseAlpha = isHighlighted ? 0.55 : 0.3;

    ctx.beginPath();
    ctx.moveTo(drawX - dx, drawY - dy);
    ctx.lineTo(drawX + dx, drawY + dy);
    ctx.strokeStyle = `rgba(255, 255, 255, ${baseAlpha})`;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    if (mirror.highlighted) {
      ctx.beginPath();
      ctx.moveTo(drawX - dx, drawY - dy);
      ctx.lineTo(drawX + dx, drawY + dy);
      ctx.strokeStyle = 'rgba(0, 200, 255, 0.9)';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(drawX - dx, drawY - dy);
      ctx.lineTo(drawX + dx, drawY + dy);
      ctx.strokeStyle = 'rgba(0, 150, 220, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    const capRadius = 3.5;
    ctx.fillStyle = mirror.highlighted ? 'rgba(0, 220, 255, 0.9)' : 'rgba(0, 150, 220, 0.6)';
    ctx.beginPath();
    ctx.arc(drawX - dx, drawY - dy, capRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(drawX + dx, drawY + dy, capRadius, 0, Math.PI * 2);
    ctx.fill();

    if (mirror.rotatable) {
      ctx.beginPath();
      ctx.arc(drawX, drawY, 8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 180, 255, 0.08)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 180, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.restore();
  }

  drawAllMirrors(mirrors: Mirror[], offsetX: number, offsetY: number) {
    for (const mirror of mirrors) {
      this.drawMirror(mirror, offsetX, offsetY);
    }
  }

  drawLaserSource(sourceX: number, sourceY: number, dirX: number, dirY: number) {
    const ctx = this.ctx;
    ctx.save();

    const gradient = ctx.createRadialGradient(sourceX, sourceY, 0, sourceX, sourceY, 18);
    gradient.addColorStop(0, 'rgba(255, 100, 50, 0.6)');
    gradient.addColorStop(0.5, 'rgba(255, 80, 30, 0.2)');
    gradient.addColorStop(1, 'rgba(255, 60, 20, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(sourceX, sourceY, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 120, 60, 0.9)';
    ctx.beginPath();
    ctx.arc(sourceX, sourceY, 8, 0, Math.PI * 2);
    ctx.fill();

    const tipX = sourceX + dirX * 16;
    const tipY = sourceY + dirY * 16;
    ctx.strokeStyle = 'rgba(255, 120, 60, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sourceX, sourceY);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();

    ctx.restore();
  }

  drawTargetCrystal(
    gridX: number, gridY: number,
    pulsePhase: number, offsetX: number, offsetY: number,
    exploding: boolean, hit: boolean
  ) {
    if (exploding && hit) return;

    const ctx = this.ctx;
    const pos = gridToPixel(gridX, gridY, offsetX, offsetY);
    const pulse = 0.7 + 0.3 * Math.sin(pulsePhase);

    ctx.save();

    const glowRadius = 28 * pulse;
    const outerGlow = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, glowRadius);
    outerGlow.addColorStop(0, `rgba(255, 200, 50, ${0.4 * pulse})`);
    outerGlow.addColorStop(0.5, `rgba(255, 170, 30, ${0.15 * pulse})`);
    outerGlow.addColorStop(1, 'rgba(255, 150, 20, 0)');
    ctx.fillStyle = outerGlow;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = 'rgba(255, 200, 50, 0.6)';
    ctx.shadowBlur = 12 * pulse;

    const size = 12 * pulse;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y - size);
    ctx.lineTo(pos.x + size * 0.7, pos.y);
    ctx.lineTo(pos.x, pos.y + size);
    ctx.lineTo(pos.x - size * 0.7, pos.y);
    ctx.closePath();
    ctx.fillStyle = `rgba(255, 210, 60, ${0.85 * pulse})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(255, 240, 120, ${0.9})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    const innerSize = 5 * pulse;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y - innerSize);
    ctx.lineTo(pos.x + innerSize * 0.5, pos.y);
    ctx.lineTo(pos.x, pos.y + innerSize);
    ctx.lineTo(pos.x - innerSize * 0.5, pos.y);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 255, 200, 0.95)';
    ctx.fill();

    ctx.restore();
  }
}
