import {
  GameState,
  PlayerState,
  Projectile,
  BeatBubble,
  Particle,
  BeatTrackState,
  COLORS,
  GAME_CONFIG,
} from './types';
import { getTrackY } from './BeatTrack';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  render(state: GameState) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.save();

    if (state.screenEffect.shakeIntensity > 0.01) {
      const sx = (Math.random() - 0.5) * state.screenEffect.shakeIntensity * 10;
      const sy = (Math.random() - 0.5) * state.screenEffect.shakeIntensity * 10;
      ctx.translate(sx, sy);
    }

    this.drawBackground(ctx, w, h, state);
    this.drawBeatTrack(ctx, w, h, state.beatTrack);
    this.drawBeatBubbles(ctx, state.beatBubbles);
    this.drawProjectiles(ctx, state.projectiles);
    this.drawPlayers(ctx, state);
    this.drawParticles(ctx, state.particles);

    if (state.screenEffect.redFlash > 0.01) {
      ctx.fillStyle = `rgba(255, 0, 50, ${state.screenEffect.redFlash * 0.3})`;
      ctx.fillRect(-20, -20, w + 40, h + 40);
    }

    ctx.restore();

    if (state.phase === 'menu') {
      this.drawMenu(ctx, w, h);
    } else if (state.phase === 'ended') {
      this.drawEndScreen(ctx, w, h, state);
    }
  }

  private drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number, state: GameState) {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, COLORS.bg1);
    grad.addColorStop(1, COLORS.bg2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    const time = state.time;
    ctx.strokeStyle = `rgba(191, 0, 255, 0.05)`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      const yBase = h * 0.2 + i * h * 0.12;
      for (let x = 0; x < w; x += 4) {
        const y = yBase + Math.sin(x * 0.01 + time * 0.3 + i) * 15;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    for (let i = 0; i < 20; i++) {
      const sx = (Math.sin(i * 73.7 + time * 0.2) * 0.5 + 0.5) * w;
      const sy = (Math.cos(i * 41.3 + time * 0.15) * 0.5 + 0.5) * h * 0.6;
      const sr = 1 + Math.sin(time + i) * 0.5;
      ctx.fillStyle = `rgba(191, 0, 255, ${0.1 + Math.sin(time * 2 + i) * 0.05})`;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawBeatTrack(ctx: CanvasRenderingContext2D, w: number, h: number, track: BeatTrackState) {
    ctx.save();

    ctx.shadowColor = COLORS.trackGlow;
    ctx.shadowBlur = 15;
    ctx.strokeStyle = COLORS.trackLine;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.4;

    ctx.beginPath();
    for (let x = 0; x <= w; x += 3) {
      const y = getTrackY(track, x, h);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.shadowBlur = 30;
    ctx.strokeStyle = COLORS.trackLine;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.2;

    ctx.beginPath();
    for (let x = 0; x <= w; x += 3) {
      const y = getTrackY(track, x, h) + 5;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.restore();
  }

  private drawBeatBubbles(ctx: CanvasRenderingContext2D, bubbles: BeatBubble[]) {
    for (const bubble of bubbles) {
      if (bubble.collected || bubble.expired) continue;

      const pulse = Math.sin(bubble.pulsePhase) * 0.3 + 0.7;
      const color = bubble.type === 'speed' ? COLORS.bubbleSpeed : COLORS.bubbleShield;

      ctx.save();
      ctx.globalAlpha = pulse * 0.7;
      ctx.shadowColor = color;
      ctx.shadowBlur = 20;

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(bubble.x, bubble.y, bubble.radius * pulse, 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalAlpha = pulse * 0.2;
      ctx.fillStyle = color;
      ctx.fill();

      ctx.globalAlpha = 1;
      ctx.font = `bold ${12}px Rajdhani, sans-serif`;
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowBlur = 0;
      ctx.fillText(bubble.type === 'speed' ? '⚡' : '🛡', bubble.x, bubble.y);

      ctx.restore();
    }
  }

  private drawProjectiles(ctx: CanvasRenderingContext2D, projectiles: Projectile[]) {
    for (const proj of projectiles) {
      ctx.save();

      ctx.shadowColor = proj.color;
      ctx.shadowBlur = proj.isCharged ? 25 : 15;

      ctx.fillStyle = proj.color;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, proj.radius * 1.6, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, proj.radius * 0.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  private drawPlayers(ctx: CanvasRenderingContext2D, state: GameState) {
    for (const player of state.players) {
      if (player.hp <= 0) continue;
      this.drawPlayer(ctx, player);
    }
  }

  private drawPlayer(ctx: CanvasRenderingContext2D, player: PlayerState) {
    ctx.save();

    if (player.invincibleTimer > 0) {
      ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.02) * 0.3;
    }

    ctx.shadowColor = player.glowColor;
    ctx.shadowBlur = 20;

    ctx.fillStyle = player.color;
    ctx.strokeStyle = player.glowColor;
    ctx.lineWidth = 2;

    const size = GAME_CONFIG.PLAYER_SIZE;
    ctx.beginPath();
    ctx.moveTo(player.x, player.y - size);
    ctx.lineTo(player.x + size * 0.6, player.y);
    ctx.lineTo(player.x, player.y + size * 0.4);
    ctx.lineTo(player.x - size * 0.6, player.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(player.x, player.y - size * 0.3, size * 0.15, 0, Math.PI * 2);
    ctx.fill();

    if (player.shield > 0) {
      ctx.strokeStyle = COLORS.shieldColor;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.4 + Math.sin(Date.now() * 0.005) * 0.2;
      ctx.shadowColor = COLORS.shieldColor;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(player.x, player.y - size * 0.2, size + 6, 0, Math.PI * 2);
      ctx.stroke();

      for (let i = 0; i < player.shield; i++) {
        const angle = -Math.PI / 2 + (i - (player.shield - 1) / 2) * 0.5;
        const sx = player.x + Math.cos(angle) * (size + 6);
        const sy = player.y - size * 0.2 + Math.sin(angle) * (size + 6);
        ctx.fillStyle = COLORS.shieldColor;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(sx, sy, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (player.charging) {
      ctx.strokeStyle = player.chargeProgress >= 0.8 ? COLORS.neonYellow : player.color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.6;
      const progress = player.chargeProgress;
      ctx.beginPath();
      ctx.arc(player.x, player.y - size * 0.2, size + 12, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
      ctx.stroke();
    }

    if (player.speedBoostTimer > 0) {
      ctx.strokeStyle = COLORS.bubbleSpeed;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.3;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(player.x, player.y - size * 0.2, size + 18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }

  private drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;

      if (p.type === 'explosion') {
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 5;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        const s = p.size;
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.lineTo(s * 0.4, s * 0.3);
        ctx.lineTo(-s * 0.4, s * 0.3);
        ctx.closePath();
        ctx.fill();
      } else if (p.type === 'shield_break') {
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        const s = p.size;
        ctx.fillRect(-s / 2, -s / 2, s, s);
      } else {
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  private drawMenu(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.shadowColor = COLORS.neonPurple;
    ctx.shadowBlur = 30;
    ctx.fillStyle = COLORS.neonPurple;
    ctx.font = `bold ${Math.min(72, w * 0.06)}px Orbitron, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('弦语战境', w / 2, h * 0.3);
    ctx.restore();

    ctx.fillStyle = COLORS.neonBlue;
    ctx.font = `${Math.min(20, w * 0.018)}px Rajdhani, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('STRING RHYTHM ARENA', w / 2, h * 0.3 + 50);

    ctx.fillStyle = '#ccc';
    ctx.font = `${Math.min(16, w * 0.014)}px Rajdhani, sans-serif`;
    ctx.fillText('P1: WASD 移动 | 空格 攻击/蓄力', w / 2, h * 0.5);
    ctx.fillText('P2: 方向键 移动 | Enter 攻击/蓄力', w / 2, h * 0.5 + 30);
    ctx.fillText('长按蓄力发射强音符（消耗1格护盾）', w / 2, h * 0.5 + 60);

    const pulse = Math.sin(Date.now() * 0.004) * 0.3 + 0.7;
    ctx.save();
    ctx.shadowColor = COLORS.neonGreen;
    ctx.shadowBlur = 15;
    ctx.fillStyle = COLORS.neonGreen;
    ctx.globalAlpha = pulse;
    ctx.font = `bold ${Math.min(24, w * 0.022)}px Rajdhani, sans-serif`;
    ctx.fillText('按 空格 或 Enter 开始', w / 2, h * 0.72);
    ctx.restore();
  }

  private drawEndScreen(ctx: CanvasRenderingContext2D, w: number, h: number, state: GameState) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, w, h);

    const winner = state.winner;
    const color = winner === 0 ? COLORS.p1Main : COLORS.p2Main;
    const label = winner === 0 ? 'P1' : 'P2';

    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 30;
    ctx.fillStyle = color;
    ctx.font = `bold ${Math.min(56, w * 0.05)}px Orbitron, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${label} WINS`, w / 2, h * 0.4);
    ctx.restore();

    const pulse = Math.sin(Date.now() * 0.004) * 0.3 + 0.7;
    ctx.fillStyle = '#ccc';
    ctx.globalAlpha = pulse;
    ctx.font = `${Math.min(20, w * 0.018)}px Rajdhani, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('按 空格 或 Enter 重新开始', w / 2, h * 0.55);
  }
}
