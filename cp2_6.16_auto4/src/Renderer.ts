import { Cell } from './MazeGenerator';
import { Player } from './Player';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private particles: Particle[];
  private lastSecondDisplay: string;
  private numberScaleAnimation: number;

  private readonly COLORS = {
    background: '#0a0a23',
    wall: '#2a2a4a',
    wallGlow: '#4a4a8a',
    floor: '#0d1b2a',
    gridLine: '#1a1a3e',
    trap: '#8b0000',
    key: '#ffd700',
    exit: '#ffd700',
    text: '#ffffff',
    panel: '#1a1a2e',
  } as const;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;
    this.width = 0;
    this.height = 0;
    this.particles = [];
    this.lastSecondDisplay = '';
    this.numberScaleAnimation = 0;
  }

  public resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
  }

  public clear(): void {
    this.ctx.fillStyle = this.COLORS.background;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  public drawMaze(
    maze: Cell[][],
    cellSize: number,
    offsetX: number,
    offsetY: number,
    currentTime: number
  ): void {
    for (let y = 0; y < maze.length; y++) {
      for (let x = 0; x < maze[y].length; x++) {
        const cell = maze[y][x];
        const px = offsetX + x * cellSize;
        const py = offsetY + y * cellSize;

        this.drawCellFloor(cell, px, py, cellSize, currentTime);
        this.drawCellWalls(cell, px, py, cellSize);
      }
    }

    this.drawGrid(maze, cellSize, offsetX, offsetY);
  }

  private drawCellFloor(cell: Cell, px: number, py: number, cellSize: number, currentTime: number): void {
    const ctx = this.ctx;

    if (cell.hasTrap) {
      const gradient = ctx.createRadialGradient(
        px + cellSize / 2, py + cellSize / 2, 0,
        px + cellSize / 2, py + cellSize / 2, cellSize / 2
      );
      gradient.addColorStop(0, this.COLORS.trap);
      gradient.addColorStop(0.5, '#4a0000');
      gradient.addColorStop(1, this.COLORS.floor);
      ctx.fillStyle = gradient;
    } else {
      ctx.fillStyle = this.COLORS.floor;
    }
    ctx.fillRect(px, py, cellSize, cellSize);

    if (cell.isExit) {
      const pulse = (Math.sin(currentTime * 0.004) + 1) / 2;
      ctx.save();
      ctx.shadowColor = this.COLORS.exit;
      ctx.shadowBlur = 10 + pulse * 20;
      ctx.fillStyle = this.COLORS.exit;
      ctx.fillRect(px + 4, py + 4, cellSize - 8, cellSize - 8);
      ctx.restore();

      ctx.fillStyle = this.COLORS.background;
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🚪', px + cellSize / 2, py + cellSize / 2);
    }

    if (cell.isStart) {
      ctx.fillStyle = 'rgba(100, 200, 100, 0.3)';
      ctx.fillRect(px, py, cellSize, cellSize);
      ctx.fillStyle = '#64c864';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('START', px + cellSize / 2, py + cellSize / 2);
    }

    if (cell.hasKey) {
      const pulse = (Math.sin(currentTime * 0.006 + cell.x + cell.y) + 1) / 2;
      ctx.save();
      ctx.shadowColor = this.COLORS.key;
      ctx.shadowBlur = 8 + pulse * 12;
      ctx.fillStyle = this.COLORS.key;
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🔑', px + cellSize / 2, py + cellSize / 2);
      ctx.restore();
    }

    if (cell.hasTrap) {
      ctx.font = '18px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚠️', px + cellSize / 2, py + cellSize / 2);
    }
  }

  private drawCellWalls(cell: Cell, px: number, py: number, cellSize: number): void {
    const ctx = this.ctx;
    const wallThickness = 3;

    ctx.save();
    ctx.shadowColor = this.COLORS.wallGlow;
    ctx.shadowBlur = 2;
    ctx.fillStyle = this.COLORS.wall;

    if (cell.walls.top) {
      ctx.fillRect(px, py, cellSize, wallThickness);
    }
    if (cell.walls.right) {
      ctx.fillRect(px + cellSize - wallThickness, py, wallThickness, cellSize);
    }
    if (cell.walls.bottom) {
      ctx.fillRect(px, py + cellSize - wallThickness, cellSize, wallThickness);
    }
    if (cell.walls.left) {
      ctx.fillRect(px, py, wallThickness, cellSize);
    }

    ctx.restore();
  }

  private drawGrid(maze: Cell[][], cellSize: number, offsetX: number, offsetY: number): void {
    const ctx = this.ctx;
    ctx.strokeStyle = this.COLORS.gridLine;
    ctx.lineWidth = 0.5;

    const mazeWidth = maze[0].length * cellSize;
    const mazeHeight = maze.length * cellSize;

    for (let x = 0; x <= maze[0].length; x++) {
      ctx.beginPath();
      ctx.moveTo(offsetX + x * cellSize, offsetY);
      ctx.lineTo(offsetX + x * cellSize, offsetY + mazeHeight);
      ctx.stroke();
    }

    for (let y = 0; y <= maze.length; y++) {
      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY + y * cellSize);
      ctx.lineTo(offsetX + mazeWidth, offsetY + y * cellSize);
      ctx.stroke();
    }
  }

  public drawPlayer(player: Player, _cellSize: number, offsetX: number, offsetY: number, currentTime: number): void {
    const ctx = this.ctx;
    const px = offsetX + player.x;
    const py = offsetY + player.y;

    ctx.save();
    ctx.translate(px, py);

    if (player.keyAnimationTime > 0) {
      const progress = 1 - player.keyAnimationTime / 500;
      const ringRadius = player.size * (0.8 + progress * 0.5);
      const alpha = 1 - progress;
      
      ctx.save();
      ctx.strokeStyle = `rgba(255, 215, 0, ${alpha})`;
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(0, -player.size / 2 - 10, ringRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    const bounceOffset = player.isMoving ? Math.sin(currentTime * 0.02) * 2 : 0;

    if (player.isSlowed) {
      ctx.globalAlpha = 0.5;
    }

    ctx.fillStyle = player.color;
    ctx.shadowColor = player.color;
    ctx.shadowBlur = 8;

    const halfSize = player.size / 2;
    this.roundRect(ctx, -halfSize, -halfSize + bounceOffset, player.size, player.size, 6);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    this.roundRect(ctx, -halfSize + 4, -halfSize + 4 + bounceOffset, player.size - 16, player.size / 3, 3);
    ctx.fill();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.arc(-6, -2 + bounceOffset, 3, 0, Math.PI * 2);
    ctx.arc(6, -2 + bounceOffset, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-5, -3 + bounceOffset, 1.5, 0, Math.PI * 2);
    ctx.arc(7, -3 + bounceOffset, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  public drawUI(
    players: Player[],
    elapsedTime: number,
    requiredKeys: number,
    isMobile: boolean,
    _leftPanelWidth: number,
    _rightPanelWidth: number,
    showMobilePanel: boolean,
    currentTime: number
  ): void {
    if (!isMobile || showMobilePanel) {
      this.drawLeftPanel(players, requiredKeys, isMobile, showMobilePanel, currentTime);
      this.drawRightPanel(players, isMobile, showMobilePanel, currentTime);
    }

    this.drawTimer(elapsedTime, currentTime);
  }

  private drawLeftPanel(
    players: Player[],
    requiredKeys: number,
    isMobile: boolean,
    showMobilePanel: boolean,
    _currentTime: number
  ): void {
    const ctx = this.ctx;
    const panelX = isMobile && showMobilePanel ? 15 : 0;
    const panelY = isMobile && showMobilePanel ? 60 : 0;
    const panelWidth = isMobile ? 160 : 160;
    const panelHeight = 80 + players.length * 70;

    if (!isMobile) {
      ctx.fillStyle = this.COLORS.panel;
      this.roundRect(ctx, panelX, panelY + 80, panelWidth, panelHeight, 8);
      ctx.fill();
    }

    const startY = panelY + 100;

    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      const y = startY + i * 70;

      const avatarX = panelX + 25;
      const avatarY = y + 15;
      const avatarRadius = 15;

      ctx.save();
      if (player.isSlowed) {
        ctx.globalAlpha = 0.4;
        ctx.filter = 'grayscale(100%)';
      }

      ctx.fillStyle = player.color;
      ctx.shadowColor = player.color;
      ctx.shadowBlur = 5;
      ctx.beginPath();
      ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.beginPath();
      ctx.arc(avatarX - 4, avatarY - 4, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      ctx.fillStyle = this.COLORS.text;
      ctx.font = '12px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(player.name, panelX + 50, y + 12);

      ctx.fillStyle = this.COLORS.key;
      ctx.font = 'bold 14px Arial';
      ctx.fillText(`🔑 ${player.keysCollected}/${requiredKeys}`, panelX + 50, y + 32);

      if (player.isSlowed) {
        ctx.fillStyle = '#ff6666';
        ctx.font = '10px Arial';
        ctx.fillText('⏳ 减速中', panelX + 50, y + 48);
      }

      if (player.finished) {
        ctx.fillStyle = '#64c864';
        ctx.font = 'bold 10px Arial';
        ctx.fillText('✓ 已完成', panelX + 50, y + 48);
      }
    }
  }

  private drawRightPanel(
    players: Player[],
    isMobile: boolean,
    showMobilePanel: boolean,
    currentTime: number
  ): void {
    const ctx = this.ctx;
    const panelWidth = isMobile ? 180 : 200;
    const panelX = isMobile && showMobilePanel ? this.width - panelWidth - 15 : this.width - panelWidth;
    const panelY = isMobile && showMobilePanel ? 60 : 50;
    const panelHeight = 80 + players.length * 45;

    ctx.fillStyle = this.COLORS.panel;
    this.roundRect(ctx, panelX, panelY, panelWidth, panelHeight, 8);
    ctx.fill();

    ctx.fillStyle = this.COLORS.key;
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🏆 实时排名', panelX + panelWidth / 2, panelY + 30);

    const sortedPlayers = [...players].sort((a, b) => {
      if (a.finished && b.finished) return a.finishTime - b.finishTime;
      if (a.finished) return -1;
      if (b.finished) return 1;
      if (b.keysCollected !== a.keysCollected) return b.keysCollected - a.keysCollected;
      return 0;
    });

    // #region debug-point H4:ranking
    if (Math.random() < 0.1) {
      const DEBUG_URL = 'http://127.0.0.1:7777/event';
      const SESSION_ID = 'maze-race-multi-bug';
      const originalOrder = players.map(p => ({ id: p.id, name: p.name, keys: p.keysCollected, finished: p.finished }));
      const sortedOrder = sortedPlayers.map(p => ({ id: p.id, name: p.name, keys: p.keysCollected, finished: p.finished, rank: sortedPlayers.indexOf(p) + 1 }));
      fetch(DEBUG_URL, { method: 'POST', body: JSON.stringify({ sessionId: SESSION_ID, runId: 'pre', hypothesisId: 'H4', location: 'Renderer.ts:377', msg: '[DEBUG] Ranking calculation', data: { originalOrder, sortedOrder }, ts: Date.now() }) }).catch(() => {});
    }
    // #endregion

    for (let i = 0; i < sortedPlayers.length; i++) {
      const player = sortedPlayers[i];
      const y = panelY + 60 + i * 40;

      if (i === 0) {
        const pulse = (Math.sin(currentTime * 0.00628) + 1) / 2;
        ctx.save();
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 10 + pulse * 15;
        ctx.fillStyle = `rgba(255, 215, 0, ${0.3 + pulse * 0.3})`;
        this.roundRect(ctx, panelX + 10, y - 15, panelWidth - 20, 35, 4);
        ctx.fill();
        ctx.restore();
      }

      const rankEmoji = ['🥇', '🥈', '🥉', '4️⃣'][i] || `${i + 1}`;
      ctx.fillStyle = i === 0 ? this.COLORS.key : this.COLORS.text;
      ctx.font = i === 0 ? 'bold 14px Arial' : '14px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`${rankEmoji} ${player.name}`, panelX + 20, y + 5);

      ctx.fillStyle = this.COLORS.key;
      ctx.font = '12px Arial';
      ctx.textAlign = 'right';
      ctx.fillText(`🔑 ${player.keysCollected}`, panelX + panelWidth - 20, y + 5);
    }
  }

  private drawTimer(elapsedTime: number, _currentTime: number): void {
    const ctx = this.ctx;
    const seconds = Math.floor(elapsedTime / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const display = `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    if (display !== this.lastSecondDisplay) {
      this.lastSecondDisplay = display;
      this.numberScaleAnimation = 200;
    }

    if (this.numberScaleAnimation > 0) {
      this.numberScaleAnimation -= 16;
    }

    const scale = this.numberScaleAnimation > 0 ? 1 + (this.numberScaleAnimation / 200) * 0.3 : 1;

    ctx.save();
    ctx.translate(this.width / 2, 35);
    ctx.scale(scale, scale);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.roundRect(ctx, -60, -20, 120, 40, 8);
    ctx.fill();

    ctx.fillStyle = this.COLORS.text;
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(display, 0, 0);

    ctx.restore();
  }

  public createFireworks(x: number, y: number, count: number = 100): void {
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dfe6e9', '#fd79a8', '#a29bfe', '#ffd700'];

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 2 + Math.random() * 5;
      
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 3000,
        maxLife: 3000,
        size: 3 + Math.random() * 4,
      });
    }
  }

  public updateParticles(deltaTime: number): void {
    this.particles = this.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
      p.life -= deltaTime;
      return p.life > 0;
    });
  }

  public drawParticles(): void {
    const ctx = this.ctx;

    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  public drawVictory(winner: Player, elapsedTime: number, currentTime: number): void {
    const ctx = this.ctx;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, this.width, this.height);

    const seconds = Math.floor(elapsedTime / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const timeStr = `${minutes}:${secs.toString().padStart(2, '0')}`;

    const pulse = (Math.sin(currentTime * 0.005) + 1) / 2;

    ctx.save();
    ctx.shadowColor = winner.color;
    ctx.shadowBlur = 20 + pulse * 30;
    ctx.fillStyle = winner.color;
    ctx.font = 'bold 70px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${winner.name} 胜利!`, this.width / 2, this.height / 2 - 60);
    ctx.restore();

    ctx.fillStyle = this.COLORS.key;
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`⏱ ${timeStr}`, this.width / 2, this.height / 2 + 20);

    ctx.fillStyle = this.COLORS.text;
    ctx.font = '20px Arial';
    ctx.fillText('按 SPACE 键重新开始', this.width / 2, this.height / 2 + 80);

    this.drawParticles();
  }
}
