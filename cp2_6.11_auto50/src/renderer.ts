import { GameState, Talisman, ElementType } from './gameState';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  life: number;
  maxLife: number;
  type: 'fire' | 'ice' | 'wind' | 'stone';
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gameState: GameState;
  private cellSize: number;
  private boardX: number;
  private boardY: number;
  private boardSize: number;
  private particles: Particle[];
  private maxParticles: number;
  private time: number;
  private hoveredCell: { row: number; col: number } | null;

  constructor(canvas: HTMLCanvasElement, gameState: GameState) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;
    this.gameState = gameState;
    this.cellSize = 70;
    this.boardX = 0;
    this.boardY = 0;
    this.boardSize = 490;
    this.particles = [];
    this.maxParticles = 200;
    this.time = 0;
    this.hoveredCell = null;
    
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize(): void {
    const container = this.canvas.parentElement;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    
    this.canvas.width = width;
    this.canvas.height = height;

    this.boardSize = Math.min(width * 0.5, 490);
    this.cellSize = this.boardSize / GameState.GRID_SIZE;
    
    this.boardX = (width - this.boardSize) / 2;
    this.boardY = (height - this.boardSize) / 2 + 20;
  }

  update(deltaTime: number): void {
    this.time += deltaTime;
    this.updateParticles(deltaTime);
  }

  private updateParticles(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= deltaTime;
      
      if (p.type === 'fire') {
        p.vy += 0.1;
      } else if (p.type === 'wind') {
        const angle = Math.atan2(p.vy, p.vx);
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        p.vx = Math.cos(angle + 0.1) * speed;
        p.vy = Math.sin(angle + 0.1) * speed;
      }
      
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    if (this.particles.length > this.maxParticles) {
      this.particles.sort((a, b) => a.life - b.life);
      this.particles = this.particles.slice(0, this.maxParticles);
    }
  }

  render(): void {
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;

    ctx.clearRect(0, 0, width, height);
    
    this.drawBackground();
    this.drawBoard();
    this.drawIceEffects();
    this.drawLavaSpots();
    this.drawStoneWalls();
    this.drawTalismans();
    this.drawParticles();
    this.drawScorePopups();
    this.drawUI();
  }

  private drawBackground(): void {
    const ctx = this.ctx;
    const gradient = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, '#0B0B2B');
    gradient.addColorStop(1, '#1A0A3A');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private drawBoard(): void {
    const ctx = this.ctx;
    const x = this.boardX;
    const y = this.boardY;
    const size = this.boardSize;
    const gridSize = GameState.GRID_SIZE;

    ctx.shadowColor = '#C5A55A80';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.fillStyle = '#1C1C3A';
    ctx.fillRect(x - 2, y - 2, size + 4, size + 4);

    ctx.shadowBlur = 0;

    ctx.strokeStyle = '#2A2A5A';
    ctx.lineWidth = 0.5;

    for (let i = 0; i <= gridSize; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * this.cellSize, y);
      ctx.lineTo(x + i * this.cellSize, y + size);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x, y + i * this.cellSize);
      ctx.lineTo(x + size, y + i * this.cellSize);
      ctx.stroke();
    }

    ctx.strokeStyle = '#1A1A2E';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, size, size);
  }

  private drawIceEffects(): void {
    const ctx = this.ctx;
    
    for (const effect of this.gameState.iceEffects) {
      const x = this.boardX + effect.col * this.cellSize;
      const y = this.boardY + effect.row * this.cellSize;
      const size = this.cellSize;
      const alpha = effect.life / effect.maxLife;

      ctx.strokeStyle = `rgba(224, 255, 255, ${alpha})`;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);

      ctx.fillStyle = `rgba(224, 255, 255, ${alpha * 0.2})`;
      ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
    }
  }

  private drawLavaSpots(): void {
    const ctx = this.ctx;
    
    for (const spot of this.gameState.lavaSpots) {
      const centerX = this.boardX + (spot.x + 0.5) * this.cellSize;
      const centerY = this.boardY + (spot.y + 0.5) * this.cellSize;
      const radius = (20 / 70) * this.cellSize;
      const alpha = spot.life / spot.maxLife;

      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      gradient.addColorStop(0, `rgba(255, 69, 0, ${alpha * 0.6})`);
      gradient.addColorStop(0.5, `rgba(255, 140, 0, ${alpha * 0.4})`);
      gradient.addColorStop(1, `rgba(255, 69, 0, 0)`);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawStoneWalls(): void {
    const ctx = this.ctx;
    
    for (const wall of this.gameState.stoneWalls) {
      const centerX = this.boardX + (wall.col + 0.5) * this.cellSize;
      const centerY = this.boardY + (wall.row + 0.5) * this.cellSize;
      const alpha = wall.isCollapsing ? wall.life / 0.5 : 1;

      ctx.fillStyle = `rgba(92, 64, 51, ${alpha})`;
      
      if (wall.direction === 'horizontal') {
        const width = (20 / 70) * this.cellSize;
        const height = 2;
        ctx.fillRect(centerX - width / 2, centerY - height / 2, width, height);
      } else {
        const width = 2;
        const height = (20 / 70) * this.cellSize;
        ctx.fillRect(centerX - width / 2, centerY - height / 2, width, height);
      }

      if (wall.isCollapsing) {
        this.spawnStoneParticles(centerX, centerY);
      }
    }
  }

  private spawnStoneParticles(x: number, y: number): void {
    if (Math.random() < 0.3) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 1;
      
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed + 0.5,
        radius: 2 + Math.random() * 1,
        color: '#5C4033',
        life: 0.5,
        maxLife: 0.5,
        type: 'stone'
      });
    }
  }

  private drawTalismans(): void {
    const gridSize = GameState.GRID_SIZE;

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const talisman = this.gameState.grid[row][col];
        if (talisman) {
          this.drawTalisman(talisman);
        }
      }
    }
  }

  private drawTalisman(talisman: Talisman): void {
    let drawRow = talisman.row;
    let drawCol = talisman.col;
    
    if (talisman.isMoving) {
      const progress = talisman.moveProgress;
      drawRow = talisman.row + (talisman.targetRow - talisman.row) * progress;
      drawCol = talisman.col + (talisman.targetCol - talisman.col) * progress;
    }

    const x = this.boardX + (drawCol + 0.5) * this.cellSize;
    const y = this.boardY + (drawRow + 0.5) * this.cellSize;
    let size = this.cellSize * 0.8;

    if (talisman.isRemoving) {
      const scale = 1 - talisman.removeProgress * 0.5;
      size *= scale;
      
      this.spawnElementParticles(talisman.element, x, y);
    }

    if (talisman.isNew) {
      const scale = 0.5 + talisman.newProgress * 0.5;
      size *= scale;
    }

    const isSelected = this.gameState.selectedTalisman?.id === talisman.id;
    const isHovered = this.hoveredCell?.row === talisman.row && this.hoveredCell?.col === talisman.col;

    if (isHovered && !talisman.isRemoving) {
      size *= 1.1;
    }

    if (isSelected) {
      this.drawSelectionGlow(x, y, size);
    }

    this.drawTalismanShape(talisman.element, x, y, size);
    this.drawTalismanSymbol(talisman.element, x, y, size);
  }

  private drawSelectionGlow(x: number, y: number, size: number): void {
    const ctx = this.ctx;
    const glowSize = size * 0.65;
    const rotation = this.time * Math.PI;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);

    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 10;

    const corners = [
      { x: -glowSize, y: -glowSize },
      { x: glowSize, y: -glowSize },
      { x: glowSize, y: glowSize },
      { x: -glowSize, y: glowSize }
    ];

    ctx.beginPath();
    for (let i = 0; i < corners.length; i++) {
      const corner = corners[i];
      const nextCorner = corners[(i + 1) % corners.length];
      const midX = (corner.x + nextCorner.x) / 2;
      const midY = (corner.y + nextCorner.y) / 2;
      
      if (i === 0) {
        ctx.moveTo(corner.x, corner.y);
      }
      ctx.quadraticCurveTo(midX, midY, nextCorner.x, nextCorner.y);
    }
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
    ctx.shadowBlur = 0;
  }

  private drawTalismanShape(element: ElementType, x: number, y: number, size: number): void {
    const ctx = this.ctx;
    const color = GameState.ELEMENT_COLORS[element];
    const halfSize = size / 2;
    const radius = 8;

    ctx.save();
    ctx.translate(x, y);

    const gradient = ctx.createLinearGradient(-halfSize, -halfSize, halfSize, halfSize);
    gradient.addColorStop(0, this.lightenColor(color, 30));
    gradient.addColorStop(1, this.darkenColor(color, 30));

    ctx.fillStyle = gradient;
    ctx.beginPath();
    
    const r = Math.min(radius, halfSize);
    ctx.moveTo(-halfSize + r, -halfSize);
    ctx.lineTo(halfSize - r, -halfSize);
    ctx.quadraticCurveTo(halfSize, -halfSize, halfSize, -halfSize + r);
    ctx.lineTo(halfSize, halfSize - r);
    ctx.quadraticCurveTo(halfSize, halfSize, halfSize - r, halfSize);
    ctx.lineTo(-halfSize + r, halfSize);
    ctx.quadraticCurveTo(-halfSize, halfSize, -halfSize, halfSize - r);
    ctx.lineTo(-halfSize, -halfSize + r);
    ctx.quadraticCurveTo(-halfSize, -halfSize, -halfSize + r, -halfSize);
    
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = this.lightenColor(color, 50);
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }

  private drawTalismanSymbol(element: ElementType, x: number, y: number, size: number): void {
    const ctx = this.ctx;
    const color = '#FFFFFF';
    const symbolSize = size * 0.4;

    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (element) {
      case 'fire':
        this.drawFireSymbol(symbolSize);
        break;
      case 'water':
        this.drawWaterSymbol(symbolSize);
        break;
      case 'wind':
        this.drawWindSymbol(symbolSize);
        break;
      case 'earth':
        this.drawEarthSymbol(symbolSize);
        break;
    }

    ctx.restore();
  }

  private drawFireSymbol(size: number): void {
    const ctx = this.ctx;
    const s = size / 2;

    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.quadraticCurveTo(s * 0.6, -s * 0.3, s * 0.3, s * 0.2);
    ctx.quadraticCurveTo(s * 0.5, s * 0.5, 0, s * 0.6);
    ctx.quadraticCurveTo(-s * 0.5, s * 0.5, -s * 0.3, s * 0.2);
    ctx.quadraticCurveTo(-s * 0.6, -s * 0.3, 0, -s);
    ctx.fill();

    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-s * 0.2, -s * 0.2);
    ctx.quadraticCurveTo(0, -s * 0.4, s * 0.2, -s * 0.2);
    ctx.quadraticCurveTo(s * 0.1, 0, 0, s * 0.1);
    ctx.quadraticCurveTo(-s * 0.1, 0, -s * 0.2, -s * 0.2);
    ctx.stroke();
  }

  private drawWaterSymbol(size: number): void {
    const ctx = this.ctx;
    const s = size / 2;

    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.quadraticCurveTo(s, 0, 0, s * 0.8);
    ctx.quadraticCurveTo(-s, 0, 0, -s);
    ctx.fill();

    ctx.strokeStyle = '#E0FFFF';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-s * 0.4, -s * 0.1);
    ctx.quadraticCurveTo(-s * 0.2, -s * 0.2, 0, -s * 0.1);
    ctx.quadraticCurveTo(s * 0.2, 0, s * 0.4, -s * 0.1);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-s * 0.3, s * 0.2);
    ctx.quadraticCurveTo(-s * 0.1, s * 0.1, s * 0.1, s * 0.2);
    ctx.quadraticCurveTo(s * 0.3, s * 0.3, s * 0.4, s * 0.2);
    ctx.stroke();
  }

  private drawWindSymbol(size: number): void {
    const ctx = this.ctx;
    const s = size / 2;

    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const radius = s * (0.3 + i * 0.25);
      const startAngle = -Math.PI / 2 + i * 0.5;
      const endAngle = startAngle + Math.PI * 1.2;
      
      ctx.arc(0, 0, radius, startAngle, endAngle);
    }
    ctx.lineWidth = 2;
    ctx.stroke();

    const angle = -Math.PI / 2 + Math.PI * 1.2;
    const tipX = Math.cos(angle) * s * 0.8;
    const tipY = Math.sin(angle) * s * 0.8;
    
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(tipX - s * 0.15, tipY - s * 0.1);
    ctx.lineTo(tipX - s * 0.05, tipY + s * 0.15);
    ctx.closePath();
    ctx.fill();
  }

  private drawEarthSymbol(size: number): void {
    const ctx = this.ctx;
    const s = size / 2;

    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s * 0.8, 0);
    ctx.lineTo(0, s);
    ctx.lineTo(-s * 0.8, 0);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#D2B48C';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-s * 0.3, -s * 0.2);
    ctx.lineTo(s * 0.3, -s * 0.2);
    ctx.moveTo(-s * 0.4, s * 0.1);
    ctx.lineTo(s * 0.4, s * 0.1);
    ctx.moveTo(-s * 0.2, s * 0.4);
    ctx.lineTo(s * 0.2, s * 0.4);
    ctx.stroke();
  }

  private spawnElementParticles(element: ElementType, x: number, y: number): void {
    if (Math.random() < 0.5) return;

    switch (element) {
      case 'fire':
        this.spawnFireParticles(x, y);
        break;
      case 'water':
        this.spawnIceParticles(x, y);
        break;
      case 'wind':
        this.spawnWindParticles(x, y);
        break;
      case 'earth':
        this.spawnEarthParticles(x, y);
        break;
    }
  }

  private spawnFireParticles(x: number, y: number): void {
    const count = 2 + Math.floor(Math.random() * 2);
    const colors = ['#FF4500', '#FF8C00', '#FFD700', '#FF6347'];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 2;
      
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        radius: 3 + Math.random() * 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 0.8,
        maxLife: 0.8,
        type: 'fire'
      });
    }
  }

  private spawnIceParticles(x: number, y: number): void {
    const count = 4 + Math.floor(Math.random() * 4);

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const speed = 1 + Math.random() * 1;
      
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2 + Math.random() * 2,
        color: '#E0FFFF',
        life: 0.6,
        maxLife: 0.6,
        type: 'ice'
      });
    }
  }

  private spawnWindParticles(x: number, y: number): void {
    const count = 3 + Math.floor(Math.random() * 3);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 1.5;
      
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2 + Math.random() * 2,
        color: '#90EE90',
        life: 0.7,
        maxLife: 0.7,
        type: 'wind'
      });
    }
  }

  private spawnEarthParticles(x: number, y: number): void {
    const count = 3 + Math.floor(Math.random() * 3);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 2;
      
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed + 0.5,
        radius: 2 + Math.random() * 3,
        color: '#8B4513',
        life: 0.5,
        maxLife: 0.5,
        type: 'stone'
      });
    }
  }

  private drawParticles(): void {
    const ctx = this.ctx;

    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawScorePopups(): void {
    const ctx = this.ctx;

    for (const popup of this.gameState.scorePopups) {
      const x = this.boardX + (popup.x + 0.5) * this.cellSize;
      const y = this.boardY + (popup.y + 0.5) * this.cellSize;
      const progress = 1 - popup.life / popup.maxLife;
      const alpha = popup.life / popup.maxLife;
      const scale = 1 + progress * 0.3;
      const offsetY = -progress * 30;

      ctx.save();
      ctx.translate(x, y + offsetY);
      ctx.scale(scale, scale);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 20px Microsoft YaHei, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 10;

      const text = popup.isCombo ? `+${popup.score} x2!` : `+${popup.score}`;
      ctx.fillText(text, 0, 0);

      ctx.restore();
    }
  }

  private drawUI(): void {
    const centerX = this.canvas.width / 2;
    const topY = this.boardY - 60;

    this.drawTimer(centerX - 80, topY);
    this.drawScore(centerX + 60, topY);
  }

  private drawTimer(x: number, y: number): void {
    const ctx = this.ctx;
    const radius = 20;
    const progress = this.gameState.timeLeft / GameState.GAME_DURATION;

    ctx.save();
    ctx.translate(x, y);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();

    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    const red = Math.floor(255 * (1 - progress));
    const green = Math.floor(255 * progress);
    gradient.addColorStop(0, `rgb(${red}, ${green}, 0)`);
    gradient.addColorStop(1, `rgb(${Math.floor(red * 0.8)}, ${Math.floor(green * 0.8)}, 0)`);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius - 2, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px Microsoft YaHei, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(Math.ceil(this.gameState.timeLeft).toString(), 0, 0);

    ctx.restore();
  }

  private drawScore(x: number, y: number): void {
    const ctx = this.ctx;

    ctx.save();
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 18px Microsoft YaHei, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 5;

    ctx.fillText(`得分: ${this.gameState.score}`, x, y);

    ctx.restore();
  }

  setHoveredCell(row: number | null, col: number | null): void {
    if (row === null || col === null) {
      this.hoveredCell = null;
    } else {
      this.hoveredCell = { row, col };
    }
  }

  getCellAtPosition(clientX: number, clientY: number): { row: number; col: number } | null {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left - this.boardX;
    const y = clientY - rect.top - this.boardY;

    if (x < 0 || x >= this.boardSize || y < 0 || y >= this.boardSize) {
      return null;
    }

    const col = Math.floor(x / this.cellSize);
    const row = Math.floor(y / this.cellSize);

    if (row >= 0 && row < GameState.GRID_SIZE && col >= 0 && col < GameState.GRID_SIZE) {
      return { row, col };
    }

    return null;
  }

  private lightenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
    const B = Math.min(255, (num & 0x0000FF) + amt);
    return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
  }

  private darkenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, (num >> 16) - amt);
    const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
    const B = Math.max(0, (num & 0x0000FF) - amt);
    return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }
}
