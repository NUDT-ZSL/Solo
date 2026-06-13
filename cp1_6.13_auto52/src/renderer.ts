import { Maze, CELL_SIZE } from './maze';
import { Player } from './player';
import { Gem, ShadowCreature, Portal } from './entity';

export interface GameState {
  maze: Maze;
  player: Player;
  gems: Gem[];
  creatures: ShadowCreature[];
  portal: Portal;
  floor: number;
  totalGems: number;
  gameOver: boolean;
  gameOverTime: number;
  showRestartHover: boolean;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private wallNoiseCanvas: HTMLCanvasElement | null = null;
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private offscreenCtx: CanvasRenderingContext2D | null = null;
  private currentMazeKey: string = '';
  private lastPlayerX: number = -1;
  private lastPlayerY: number = -1;
  private lastLightRadius: number = -1;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
    this.width = canvas.width;
    this.height = canvas.height;
    this.generateWallNoise();

    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = canvas.width;
    this.offscreenCanvas.height = canvas.height;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d');
  }

  private generateWallNoise(): void {
    this.wallNoiseCanvas = document.createElement('canvas');
    this.wallNoiseCanvas.width = CELL_SIZE;
    this.wallNoiseCanvas.height = CELL_SIZE;
    const nctx = this.wallNoiseCanvas.getContext('2d');
    if (!nctx) return;
    nctx.fillStyle = '#4a4a4a';
    nctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
    const img = nctx.getImageData(0, 0, CELL_SIZE, CELL_SIZE);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 40;
      img.data[i] = Math.max(0, Math.min(255, img.data[i] + n));
      img.data[i + 1] = Math.max(0, Math.min(255, img.data[i + 1] + n));
      img.data[i + 2] = Math.max(0, Math.min(255, img.data[i + 2] + n));
    }
    nctx.putImageData(img, 0, 0);
    nctx.strokeStyle = 'rgba(0,0,0,0.3)';
    nctx.lineWidth = 1;
    nctx.strokeRect(0.5, 0.5, CELL_SIZE - 1, CELL_SIZE - 1);
  }

  public render(state: GameState): void {
    const { maze, player, gems, creatures, portal } = state;

    if (state.gameOver) {
      this.ctx.fillStyle = '#000000';
      this.ctx.fillRect(0, 0, this.width, this.height);
      this.renderGameOver(state);
      return;
    }

    const offsetX = (this.width - maze.width * CELL_SIZE) / 2;
    const offsetY = (this.height - maze.height * CELL_SIZE) / 2;

    const mazeKey = maze.grid.map(row => row.join('')).join('|');
    if (mazeKey !== this.currentMazeKey) {
      this.currentMazeKey = mazeKey;
      this.preRenderMaze(maze, offsetX, offsetY);
      this.ctx.fillStyle = '#000000';
      this.ctx.fillRect(0, 0, this.width, this.height);
      this.lastPlayerX = -1;
      this.lastPlayerY = -1;
      this.lastLightRadius = -1;
    }

    const maxLight = Math.max(this.lastLightRadius, player.lightRadius) + CELL_SIZE * 2;

    const dirtyRects: { x: number; y: number; w: number; h: number }[] = [];
    const playerCanvasX = player.x + offsetX;
    const playerCanvasY = player.y + offsetY;
    const lastPlayerCanvasX = this.lastPlayerX + offsetX;
    const lastPlayerCanvasY = this.lastPlayerY + offsetY;

    if (this.lastPlayerX >= 0) {
      const prevL = Math.max(0, Math.floor((lastPlayerCanvasX - maxLight) / 2) * 2);
      const prevT = Math.max(0, Math.floor((lastPlayerCanvasY - maxLight) / 2) * 2);
      const prevR = Math.min(this.width, Math.ceil((lastPlayerCanvasX + maxLight) / 2) * 2);
      const prevB = Math.min(this.height, Math.ceil((lastPlayerCanvasY + maxLight) / 2) * 2);
      dirtyRects.push({ x: prevL, y: prevT, w: prevR - prevL, h: prevB - prevT });
    }

    const currL = Math.max(0, Math.floor((playerCanvasX - maxLight) / 2) * 2);
    const currT = Math.max(0, Math.floor((playerCanvasY - maxLight) / 2) * 2);
    const currR = Math.min(this.width, Math.ceil((playerCanvasX + maxLight) / 2) * 2);
    const currB = Math.min(this.height, Math.ceil((playerCanvasY + maxLight) / 2) * 2);
    dirtyRects.push({ x: currL, y: currT, w: currR - currL, h: currB - currT });

    for (const rect of dirtyRects) {
      if (rect.w <= 0 || rect.h <= 0) continue;
      this.ctx.clearRect(rect.x, rect.y, rect.w, rect.h);
      this.ctx.fillStyle = '#000000';
      this.ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

      if (this.offscreenCanvas) {
        this.ctx.drawImage(
          this.offscreenCanvas,
          rect.x, rect.y, rect.w, rect.h,
          rect.x, rect.y, rect.w, rect.h
        );
      }
    }

    this.ctx.save();
    this.ctx.translate(offsetX, offsetY);

    const clipL = Math.max(0, (player.x - player.lightRadius - CELL_SIZE));
    const clipT = Math.max(0, (player.y - player.lightRadius - CELL_SIZE));
    const clipR = Math.min(maze.width * CELL_SIZE, (player.x + player.lightRadius + CELL_SIZE));
    const clipB = Math.min(maze.height * CELL_SIZE, (player.y + player.lightRadius + CELL_SIZE));
    this.ctx.beginPath();
    this.ctx.rect(clipL, clipT, clipR - clipL, clipB - clipT);
    this.ctx.clip();

    this.renderPortal(portal, player);
    this.renderGems(gems, player);
    this.renderCreatures(creatures, player);
    this.renderPlayer(player);

    this.ctx.restore();

    this.renderLightMask(player, offsetX, offsetY);
    this.renderUI(state);

    this.lastPlayerX = player.x;
    this.lastPlayerY = player.y;
    this.lastLightRadius = player.lightRadius;
  }

  private preRenderMaze(maze: Maze, offsetX: number, offsetY: number): void {
    if (!this.offscreenCtx) return;
    const ctx = this.offscreenCtx;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.save();
    ctx.translate(offsetX, offsetY);

    for (let y = 0; y < maze.height; y++) {
      for (let x = 0; x < maze.width; x++) {
        if (maze.grid[y][x] === 1) {
          const px = x * CELL_SIZE;
          const py = y * CELL_SIZE;
          if (this.wallNoiseCanvas) {
            ctx.drawImage(this.wallNoiseCanvas, px, py);
          } else {
            ctx.fillStyle = '#4a4a4a';
            ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
          }
        }
      }
    }

    ctx.restore();
  }

  private renderPlayer(player: Player): void {
    const ctx = this.ctx;

    const blink = player.invulnerable > 0 && Math.floor(player.invulnerable * 10) % 2 === 0;
    if (blink) return;

    const gradient = ctx.createRadialGradient(
      player.x, player.y, 0,
      player.x, player.y, player.radius
    );
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.5, '#fde047');
    gradient.addColorStop(1, '#fde047cc');

    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  private renderLightMask(player: Player, offsetX: number, offsetY: number): void {
    const ctx = this.ctx;

    const px = player.x + offsetX;
    const py = player.y + offsetY;

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';

    const gradient = ctx.createRadialGradient(
      px, py, 0,
      px, py, player.lightRadius
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 1)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.restore();
  }

  private renderGems(gems: Gem[], player: Player): void {
    const ctx = this.ctx;
    for (const gem of gems) {
      if (gem.collected && gem.isCollectAnimDone()) continue;

      const dx = gem.x - player.x;
      const dy = gem.y - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > player.lightRadius + 30) continue;

      let scale = 1;
      let alpha = 1;
      if (gem.collected) {
        const t = gem.collectAnim / 0.4;
        scale = 1 + t * 1.5;
        alpha = 1 - t;
      }

      ctx.save();
      ctx.translate(gem.x, gem.y);
      ctx.rotate(gem.rotation);
      ctx.scale(scale, scale);
      ctx.globalAlpha = alpha;

      ctx.fillStyle = '#fbbf24';
      ctx.strokeStyle = '#fef3c7';
      ctx.lineWidth = 1.5;

      this.drawOctagram(ctx, gem.radius);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fef3c7';
      this.drawOctagram(ctx, gem.radius * 0.4);
      ctx.fill();

      ctx.restore();
    }
  }

  private drawOctagram(ctx: CanvasRenderingContext2D, r: number): void {
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const angle = (i * Math.PI) / 8 - Math.PI / 2;
      const radius = i % 2 === 0 ? r : r * 0.45;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  private renderCreatures(creatures: ShadowCreature[], player: Player): void {
    const ctx = this.ctx;
    for (const c of creatures) {
      const dx = c.x - player.x;
      const dy = c.y - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > player.lightRadius + c.radius * 2) continue;

      const visibleAlpha = Math.max(0, 1 - dist / (player.lightRadius + c.radius));
      const alpha = Math.min(c.opacity + visibleAlpha * 0.5, 0.9);

      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.fillStyle = `rgba(10, 5, 20, ${alpha})`;
      ctx.strokeStyle = `rgba(80, 40, 120, ${alpha * 0.5})`;
      ctx.lineWidth = 1;

      ctx.beginPath();
      const points = 12;
      for (let i = 0; i < points; i++) {
        const angle = (i / points) * Math.PI * 2;
        const wobble = Math.sin(c.shapeSeed + i * 1.3 + performance.now() / 300) * 4;
        const r = c.radius + wobble;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      if (dist < CELL_SIZE * 2) {
        ctx.fillStyle = `rgba(255, 80, 80, ${alpha})`;
        ctx.beginPath();
        ctx.arc(-4, -2, 2, 0, Math.PI * 2);
        ctx.arc(4, -2, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  private renderPortal(portal: Portal, player: Player): void {
    const ctx = this.ctx;
    const dx = portal.x - player.x;
    const dy = portal.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > player.lightRadius + portal.radius * 2) return;

    ctx.save();
    ctx.translate(portal.x, portal.y);

    const pulse = (Math.sin(portal.pulseTime * Math.PI * 4) + 1) / 2;

    for (let i = 3; i >= 0; i--) {
      const t = (portal.pulseTime * 2 + i * 0.25) % 1;
      const r = portal.radius * (0.3 + t * 0.8);
      const a = (1 - t) * 0.7;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      if (portal.active) {
        grad.addColorStop(0, `rgba(251, 191, 36, ${a})`);
        grad.addColorStop(0.5, `rgba(167, 139, 250, ${a * 0.8})`);
        grad.addColorStop(1, `rgba(124, 58, 237, 0)`);
      } else {
        grad.addColorStop(0, `rgba(88, 28, 135, ${a * 0.6})`);
        grad.addColorStop(1, `rgba(30, 10, 60, 0)`);
      }
      ctx.fillStyle = grad;
      ctx.fill();
    }

    if (portal.active) {
      const glowPulse = (Math.sin(portal.pulseTime * Math.PI * 4) + 1) / 2;
      for (let g = 0; g < 3; g++) {
        const glowT = (portal.pulseTime * 2 + g * 0.17) % 1;
        const glowAlpha = Math.sin(glowT * Math.PI) * 0.7;
        const glowR = portal.radius + 6 + glowT * 20;
        ctx.strokeStyle = `rgba(251, 191, 36, ${glowAlpha})`;
        ctx.lineWidth = 3 - g;
        ctx.beginPath();
        ctx.arc(0, 0, glowR, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.strokeStyle = `rgba(253, 224, 71, ${0.6 + glowPulse * 0.4})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, portal.radius + pulse * 4, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  private renderUI(state: GameState): void {
    const ctx = this.ctx;
    const { player, floor, totalGems } = state;

    ctx.save();

    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    this.roundRect(ctx, 12, 12, 170, 48, 8);
    ctx.fill();

    for (let i = 0; i < player.maxLives; i++) {
      const hx = 24 + i * 26;
      const hy = 24;
      const animT = player.lifeLostAnim.get(i);
      let scale = 1;
      let gray = false;
      if (animT !== undefined) {
        scale = 1 - animT / 0.3;
        gray = true;
      } else if (i >= player.lives) {
        gray = true;
      }
      ctx.save();
      ctx.translate(hx + 8, hy + 12);
      ctx.scale(scale, scale);
      ctx.fillStyle = gray ? '#6b7280' : '#ef4444';
      this.drawHeart(ctx, 10);
      ctx.fill();
      ctx.restore();
    }

    ctx.fillStyle = '#fbbf24';
    ctx.translate(110, 32);
    this.drawOctagram(ctx, 8);
    ctx.fill();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${player.gemsCollected} / ${totalGems}`, 132, 36);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    this.roundRect(ctx, this.width - 100, 12, 88, 36, 8);
    ctx.fill();

    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#a78bfa';
    ctx.shadowBlur = 8;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Floor ${floor}`, this.width - 24, 30);
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  private drawHeart(ctx: CanvasRenderingContext2D, size: number): void {
    ctx.beginPath();
    const s = size;
    ctx.moveTo(0, s * 0.3);
    ctx.bezierCurveTo(0, -s * 0.3, -s, -s * 0.3, -s, s * 0.1);
    ctx.bezierCurveTo(-s, s * 0.6, 0, s, 0, s);
    ctx.bezierCurveTo(0, s, s, s * 0.6, s, s * 0.1);
    ctx.bezierCurveTo(s, -s * 0.3, 0, -s * 0.3, 0, s * 0.3);
    ctx.closePath();
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  private renderGameOver(state: GameState): void {
    const ctx = this.ctx;
    const t = Math.min(state.gameOverTime, 1.5) / 1.5;

    ctx.fillStyle = `rgba(127, 29, 29, ${t})`;
    ctx.fillRect(0, 0, this.width, this.height);

    if (state.gameOverTime < 0.5) return;

    ctx.save();

    let textShakeX = 0;
    let textShakeY = 0;
    const shakeDuration = 0.5;
    if (state.gameOverTime >= 0.5 && state.gameOverTime < 0.5 + shakeDuration) {
      textShakeX = 2 + Math.random() * 3;
      textShakeY = 2 + Math.random() * 3;
      if (Math.random() > 0.5) textShakeX = -textShakeX;
      if (Math.random() > 0.5) textShakeY = -textShakeY;
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 20;
    ctx.fillText('Game Over', this.width / 2 + textShakeX, this.height / 2 - 60 + textShakeY);
    ctx.shadowBlur = 0;

    ctx.font = '18px sans-serif';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(`你到达了第 ${state.floor} 层`, this.width / 2, this.height / 2 - 10);

    const btnW = 160;
    const btnH = 50;
    const btnX = this.width / 2 - btnW / 2;
    const btnY = this.height / 2 + 40;

    const hover = state.showRestartHover;
    const scale = hover ? 1.1 : 1;

    ctx.save();
    ctx.translate(this.width / 2, btnY + btnH / 2);
    ctx.scale(scale, scale);
    ctx.translate(-this.width / 2, -(btnY + btnH / 2));

    const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
    btnGrad.addColorStop(0, '#a78bfa');
    btnGrad.addColorStop(1, '#7c3aed');
    ctx.fillStyle = btnGrad;
    this.roundRect(ctx, btnX, btnY, btnW, btnH, 10);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Restart', this.width / 2, btnY + btnH / 2);
    ctx.restore();

    ctx.restore();
  }

  public isRestartButton(mx: number, my: number): boolean {
    const btnW = 160;
    const btnH = 50;
    const btnX = this.width / 2 - btnW / 2;
    const btnY = this.height / 2 + 40;
    return mx >= btnX && mx <= btnX + btnW && my >= btnY && my <= btnY + btnH;
  }
}
