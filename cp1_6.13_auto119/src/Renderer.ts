import type { Platform, Spike, Coin, Portal, LevelData } from './LevelGenerator';
import type { Player } from './Player';

const COLOR_SKY_TOP = '#1e3a5f';
const COLOR_SKY_BOTTOM = '#60a5fa';
const COLOR_MOUNTAIN = '#2d4a2e';
const COLOR_TREE = '#3b6e3c';
const COLOR_GRASS = '#4ade80';
const COLOR_GROUND = '#4ade80';
const COLOR_PLATFORM = '#d97706';
const COLOR_SPIKE = '#ef4444';
const COLOR_COIN = '#facc15';
const COLOR_PORTAL_GLOW = '#a855f7';
const COLOR_PLAYER = '#3b82f6';
const COLOR_PLAYER_BORDER = '#1e3a8a';
const COLOR_TEXT = '#ffffff';
const COLOR_ACCENT = '#1e3a8a';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
  }

  render(
    level: LevelData,
    player: Player,
    cameraX: number,
    time: number,
    score: number,
    lives: number,
    levelNum: number,
    countdown: number
  ): void {
    this.clear();
    this.drawSky();
    this.drawParallaxBackground(cameraX, time);

    this.ctx.save();
    this.ctx.translate(-cameraX, 0);

    this.drawPlatforms(level.platforms);
    this.drawSpikes(level.spikes, time);
    this.drawCoins(level.coins, time);
    this.drawPortal(level.portal, time);
    this.drawPlayer(player);

    this.ctx.restore();

    this.drawUI(score, lives, levelNum, countdown);
  }

  private clear(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  private drawSky(): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, COLOR_SKY_TOP);
    gradient.addColorStop(1, COLOR_SKY_BOTTOM);
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawParallaxBackground(cameraX: number, time: number): void {
    this.drawMountainLayer(cameraX * 0.1);
    this.drawTreeLayer(cameraX * 0.3);
    this.drawGrassLayer(cameraX * 0.6);
  }

  private drawMountainLayer(offset: number): void {
    this.ctx.fillStyle = COLOR_MOUNTAIN;
    const baseY = this.height - 180;
    const mountainWidth = 400;
    const tileWidth = mountainWidth * 2;
    const startX = -((offset % tileWidth) + tileWidth) % tileWidth - mountainWidth;

    for (let i = 0; i < 8; i++) {
      const x = startX + i * mountainWidth;
      this.ctx.beginPath();
      this.ctx.moveTo(x, baseY + 100);
      this.ctx.lineTo(x + mountainWidth / 2, baseY - 60);
      this.ctx.lineTo(x + mountainWidth, baseY + 100);
      this.ctx.closePath();
      this.ctx.fill();
    }
  }

  private drawTreeLayer(offset: number): void {
    this.ctx.fillStyle = COLOR_TREE;
    const baseY = this.height - 120;
    const treeWidth = 120;
    const spacing = 160;
    const tileWidth = spacing * 10;
    const startX = -((offset % tileWidth) + tileWidth) % tileWidth - spacing;

    for (let i = 0; i < 15; i++) {
      const x = startX + i * spacing;
      const treeHeight = 80 + (i % 3) * 15;

      this.ctx.fillStyle = '#8b5a2b';
      this.ctx.fillRect(x + treeWidth / 2 - 6, baseY - treeHeight + 40, 12, 50);

      this.ctx.fillStyle = COLOR_TREE;
      this.ctx.beginPath();
      this.ctx.moveTo(x, baseY - treeHeight + 60);
      this.ctx.lineTo(x + treeWidth / 2, baseY - treeHeight);
      this.ctx.lineTo(x + treeWidth, baseY - treeHeight + 60);
      this.ctx.closePath();
      this.ctx.fill();
    }
  }

  private drawGrassLayer(offset: number): void {
    this.ctx.fillStyle = COLOR_GRASS;
    const baseY = this.height - 80;
    const blobWidth = 80;
    const spacing = 60;
    const tileWidth = spacing * 20;
    const startX = -((offset % tileWidth) + tileWidth) % tileWidth - spacing;

    for (let i = 0; i < 25; i++) {
      const x = startX + i * spacing;
      const height = 12 + (i % 4) * 4;
      this.ctx.beginPath();
      this.ctx.arc(x + blobWidth / 2, baseY + height, blobWidth / 2, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawPlatforms(platforms: Platform[]): void {
    for (const platform of platforms) {
      if (platform.isGround) {
        this.ctx.fillStyle = COLOR_GROUND;
        this.ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        this.ctx.fillStyle = '#22c55e';
        this.ctx.fillRect(platform.x, platform.y, platform.width, 8);
      } else {
        this.ctx.fillStyle = COLOR_PLATFORM;
        this.ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        this.ctx.fillStyle = '#92400e';
        this.ctx.fillRect(platform.x, platform.y + platform.height - 4, platform.width, 4);
      }
    }
  }

  private drawSpikes(spikes: Spike[], time: number): void {
    for (const spike of spikes) {
      const rotation = (time / 0.8) * Math.PI * 2;
      const cx = spike.x + spike.size / 2;
      const cy = spike.y + spike.size / 2;

      this.ctx.save();
      this.ctx.translate(cx, cy);
      this.ctx.rotate(rotation);

      this.ctx.fillStyle = COLOR_SPIKE;
      this.ctx.beginPath();
      const r = spike.size / 2;
      for (let i = 0; i < 3; i++) {
        const angle = (i * 2 * Math.PI) / 3 - Math.PI / 2;
        const x = r * Math.cos(angle);
        const y = r * Math.sin(angle);
        if (i === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      }
      this.ctx.closePath();
      this.ctx.fill();

      this.ctx.restore();
    }
  }

  private drawCoins(coins: Coin[], time: number): void {
    for (const coin of coins) {
      if (coin.collected) continue;

      const rotation = (time / 1.2) * Math.PI * 2 + coin.phase;
      const scaleX = Math.cos(rotation);
      const absScaleX = Math.abs(scaleX);

      this.ctx.save();
      this.ctx.translate(coin.x, coin.y);
      this.ctx.scale(absScaleX, 1);

      this.ctx.fillStyle = COLOR_COIN;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, 12, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = '#eab308';
      this.ctx.beginPath();
      this.ctx.arc(0, 0, 8, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.restore();
    }
  }

  private drawPortal(portal: Portal, time: number): void {
    const pulseScale = 1 + Math.sin(time * Math.PI * 2) * 0.1;
    const numParticles = 20;

    for (let i = 0; i < numParticles; i++) {
      const angle = (i / numParticles) * Math.PI * 2 + time * 2;
      const radius = portal.radius * pulseScale;
      const px = portal.x + Math.cos(angle) * radius;
      const py = portal.y + Math.sin(angle) * radius;
      const particleSize = 4 + Math.sin(time * 3 + i) * 2;

      this.ctx.fillStyle = COLOR_PORTAL_GLOW;
      this.ctx.globalAlpha = 0.8;
      this.ctx.beginPath();
      this.ctx.arc(px, py, particleSize, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1;

    this.ctx.fillStyle = '#c084fc';
    this.ctx.beginPath();
    this.ctx.arc(portal.x, portal.y, portal.radius * 0.6 * pulseScale, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#e9d5ff';
    this.ctx.beginPath();
    this.ctx.arc(portal.x, portal.y, portal.radius * 0.3 * pulseScale, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawPlayer(player: Player): void {
    const cx = player.x + player.width / 2;
    const cy = player.y + player.height / 2;

    this.ctx.save();
    this.ctx.translate(cx, cy + player.height / 2);
    this.ctx.scale(player.scaleX, player.scaleY);
    this.ctx.translate(0, -player.height / 2);

    this.ctx.fillStyle = COLOR_PLAYER;
    this.ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height);

    this.ctx.strokeStyle = COLOR_PLAYER_BORDER;
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(-player.width / 2, -player.height / 2, player.width, player.height);

    const eyeY = -player.height / 2 + 8;
    const eyeOffsetX = player.facingRight ? 4 : -4;
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(-player.width / 2 + 6 + eyeOffsetX, eyeY, 5, 5);
    this.ctx.fillRect(player.width / 2 - 11 + eyeOffsetX, eyeY, 5, 5);

    this.ctx.fillStyle = COLOR_PLAYER_BORDER;
    this.ctx.fillRect(-player.width / 2 + 7 + eyeOffsetX + (player.facingRight ? 1 : 0), eyeY + 1, 3, 3);
    this.ctx.fillRect(player.width / 2 - 10 + eyeOffsetX + (player.facingRight ? 1 : 0), eyeY + 1, 3, 3);

    this.ctx.restore();
  }

  private drawUI(score: number, lives: number, levelNum: number, countdown: number): void {
    this.ctx.fillStyle = COLOR_ACCENT;
    this.ctx.globalAlpha = 0.7;
    this.ctx.fillRect(10, 10, 180, 80);
    this.ctx.globalAlpha = 1;

    this.ctx.fillStyle = COLOR_TEXT;
    this.ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`分数: ${score}`, 20, 36);
    this.ctx.fillText(`生命: ${'♥'.repeat(lives)}${'♡'.repeat(3 - lives)}`, 20, 60);
    this.ctx.fillText(`关卡: ${levelNum}`, 20, 84);

    const timerWidth = 120;
    const timerX = this.width - 10 - timerWidth;
    this.ctx.fillStyle = COLOR_ACCENT;
    this.ctx.globalAlpha = 0.7;
    this.ctx.fillRect(timerX, 10, timerWidth, 40);
    this.ctx.globalAlpha = 1;

    this.ctx.fillStyle = countdown <= 10 ? '#ef4444' : COLOR_TEXT;
    this.ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
    this.ctx.textAlign = 'center';
    const minutes = Math.floor(countdown / 60);
    const seconds = countdown % 60;
    const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    this.ctx.fillText(timeStr, timerX + timerWidth / 2, 38);
  }
}
