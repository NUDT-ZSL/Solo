import { Ship, PlayerId, MAX_SHIELD_LAYERS, HUD_FLASH_DURATION } from './entities';
import { HudState } from './game';

interface HudData {
  ship: Ship;
  shardCount: number;
  flashTimer: number;
}

export class UI {
  canvasWidth: number;
  canvasHeight: number;

  constructor(width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  resize(width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  render(ctx: CanvasRenderingContext2D, ships: Ship[], hud: HudState) {
    const p1Data: HudData = {
      ship: ships[0],
      shardCount: hud.p1ShardCount,
      flashTimer: hud.p1FlashTimer,
    };
    const p2Data: HudData = {
      ship: ships[1],
      shardCount: hud.p2ShardCount,
      flashTimer: hud.p2FlashTimer,
    };

    this.renderHudPanel(ctx, p1Data, 'left');
    this.renderHudPanel(ctx, p2Data, 'right');
  }

  private renderHudPanel(ctx: CanvasRenderingContext2D, data: HudData, side: 'left' | 'right') {
    const panelWidth = 200;
    const panelHeight = 110;
    const padding = 20;
    const margin = 20;

    const x = side === 'left' ? margin : this.canvasWidth - panelWidth - margin;
    const y = margin;

    const isP1 = data.ship.id === 1;
    const themeColor = isP1 ? '#ff3366' : '#3399ff';
    const glowColor = isP1 ? 'rgba(255, 51, 102, 0.5)' : 'rgba(51, 153, 255, 0.5)';
    const flashAlpha = data.flashTimer > 0 ? (data.flashTimer / HUD_FLASH_DURATION) * 0.5 : 0;

    ctx.save();

    if (flashAlpha > 0) {
      ctx.shadowColor = themeColor;
      ctx.shadowBlur = 20;
    }

    ctx.beginPath();
    const radius = 12;
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + panelWidth - radius, y);
    ctx.quadraticCurveTo(x + panelWidth, y, x + panelWidth, y + radius);
    ctx.lineTo(x + panelWidth, y + panelHeight - radius);
    ctx.quadraticCurveTo(x + panelWidth, y + panelHeight, x + panelWidth - radius, y + panelHeight);
    ctx.lineTo(x + radius, y + panelHeight);
    ctx.quadraticCurveTo(x, y + panelHeight, x, y + panelHeight - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();

    const panelBg = `rgba(20, 10, 40, ${0.6 + flashAlpha})`;
    ctx.fillStyle = panelBg;
    ctx.fill();

    ctx.strokeStyle = themeColor;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.5;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    const titleText = isP1 ? '玩家 1 (WASD)' : '玩家 2 (方向键)';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = side === 'left' ? 'left' : 'right';
    ctx.textBaseline = 'top';
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 4;
    ctx.fillStyle = themeColor;
    const titleX = side === 'left' ? x + padding : x + panelWidth - padding;
    ctx.fillText(titleText, titleX, y + padding);

    ctx.shadowBlur = 0;

    this.renderLives(ctx, data.ship.lives, x, y, panelWidth, padding, side, themeColor);
    this.renderShields(ctx, data.ship.shieldLayers, x, y, panelWidth, padding, side, themeColor);
    this.renderShards(ctx, data.shardCount, x, y, panelWidth, padding, side);

    ctx.restore();
  }

  private renderLives(
    ctx: CanvasRenderingContext2D,
    lives: number,
    x: number,
    y: number,
    panelWidth: number,
    padding: number,
    side: 'left' | 'right',
    color: string
  ) {
    const rowY = y + padding + 28;
    const label = '生命';
    ctx.font = '12px sans-serif';
    ctx.textAlign = side === 'left' ? 'left' : 'right';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
    ctx.shadowBlur = 2;

    const iconSize = 14;
    const gap = 6;
    const maxLives = 5;

    if (side === 'left') {
      ctx.fillText(label, x + padding, rowY);
      let iconX = x + padding + 42;
      for (let i = 0; i < maxLives; i++) {
        const active = i < lives;
        this.drawHeart(ctx, iconX, rowY + iconSize / 2 + 1, iconSize, active ? color : 'rgba(255,255,255,0.2)');
        iconX += iconSize + gap;
      }
    } else {
      let iconX = x + panelWidth - padding - 42;
      for (let i = 0; i < maxLives; i++) {
        const active = i < lives;
        iconX -= iconSize + gap;
        this.drawHeart(ctx, iconX, rowY + iconSize / 2 + 1, iconSize, active ? color : 'rgba(255,255,255,0.2)');
      }
      ctx.fillText(label, x + panelWidth - padding, rowY);
    }
    ctx.shadowBlur = 0;
  }

  private drawHeart(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color: string) {
    const s = size / 14;
    ctx.save();
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.moveTo(cx, cy + 5 * s);
    ctx.bezierCurveTo(cx, cy + 2 * s, cx - 7 * s, cy + 2 * s, cx - 7 * s, cy + 5 * s);
    ctx.bezierCurveTo(cx - 7 * s, cy + 9 * s, cx, cy + 12 * s, cx, cy + 12 * s);
    ctx.bezierCurveTo(cx, cy + 12 * s, cx + 7 * s, cy + 9 * s, cx + 7 * s, cy + 5 * s);
    ctx.bezierCurveTo(cx + 7 * s, cy + 2 * s, cx, cy + 2 * s, cx, cy + 5 * s);
    ctx.fill();
    ctx.restore();
  }

  private renderShields(
    ctx: CanvasRenderingContext2D,
    layers: number,
    x: number,
    y: number,
    panelWidth: number,
    padding: number,
    side: 'left' | 'right',
    color: string
  ) {
    const rowY = y + padding + 52;
    const label = '护盾';
    ctx.font = '12px sans-serif';
    ctx.textAlign = side === 'left' ? 'left' : 'right';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
    ctx.shadowBlur = 2;

    const iconSize = 14;
    const gap = 6;
    const shieldColor = color;

    if (side === 'left') {
      ctx.fillText(label, x + padding, rowY);
      let iconX = x + padding + 42;
      for (let i = 0; i < MAX_SHIELD_LAYERS; i++) {
        const active = i < layers;
        this.drawDiamond(ctx, iconX + iconSize / 2, rowY + iconSize / 2 + 1, iconSize, active ? shieldColor : 'rgba(255,255,255,0.2)');
        iconX += iconSize + gap;
      }
    } else {
      let iconX = x + panelWidth - padding - 42;
      for (let i = 0; i < MAX_SHIELD_LAYERS; i++) {
        const active = i < layers;
        iconX -= iconSize + gap;
        this.drawDiamond(ctx, iconX + iconSize / 2, rowY + iconSize / 2 + 1, iconSize, active ? shieldColor : 'rgba(255,255,255,0.2)');
      }
      ctx.fillText(label, x + panelWidth - padding, rowY);
    }
    ctx.shadowBlur = 0;
  }

  private drawDiamond(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color: string) {
    const half = size / 2;
    ctx.save();
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.moveTo(cx, cy - half);
    ctx.lineTo(cx + half, cy);
    ctx.lineTo(cx, cy + half);
    ctx.lineTo(cx - half, cy);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private renderShards(
    ctx: CanvasRenderingContext2D,
    count: number,
    x: number,
    y: number,
    panelWidth: number,
    padding: number,
    side: 'left' | 'right'
  ) {
    const rowY = y + padding + 76;
    const label = '碎片';
    ctx.font = '12px sans-serif';
    ctx.textAlign = side === 'left' ? 'left' : 'right';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
    ctx.shadowBlur = 2;

    const iconSize = 14;
    const value = `${count}`;

    if (side === 'left') {
      ctx.fillText(label, x + padding, rowY);
      this.drawShardIcon(ctx, x + padding + 42 + iconSize / 2, rowY + iconSize / 2 + 1, iconSize);
      ctx.fillStyle = '#ffdd33';
      ctx.shadowColor = 'rgba(255, 221, 51, 0.6)';
      ctx.fillText(value, x + padding + 42 + iconSize + 10, rowY);
    } else {
      ctx.fillStyle = '#ffdd33';
      ctx.shadowColor = 'rgba(255, 221, 51, 0.6)';
      ctx.textAlign = 'right';
      ctx.fillText(value, x + panelWidth - padding - 42 - iconSize - 10, rowY);
      this.drawShardIcon(ctx, x + panelWidth - padding - 42 - iconSize / 2, rowY + iconSize / 2 + 1, iconSize);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
      ctx.textAlign = 'right';
      ctx.fillText(label, x + panelWidth - padding, rowY);
    }
    ctx.shadowBlur = 0;
  }

  private drawShardIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
    const sides = 6;
    const r = size / 2;
    ctx.save();
    ctx.fillStyle = '#ffdd33';
    ctx.shadowColor = 'rgba(255, 220, 50, 0.7)';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
      const px = cx + Math.cos(angle) * r;
      const py = cy + Math.sin(angle) * r;
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
