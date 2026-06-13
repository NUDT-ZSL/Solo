import { GameState, HexCell, TowerType, HexCoord, ChainReactionEvent } from './types';
import { hexToPixel, getHexCorners, HEX_SIZE, pixelToHex, findCell } from './mapGenerator';

const COLORS = {
  background: '#2d3748',
  gridLine: '#4a5568',
  player1: '#63b3ed',
  player2: '#fc8181',
  fire: '#c53030',
  ice: '#2c7a7b',
  electric: '#d69e2e',
  placeable: '#ecc94b',
  hover: '#ffffff',
};

const TARGET_FPS = 60;
const FRAME_DURATION = 1000 / TARGET_FPS;

export interface RendererOptions {
  canvas: HTMLCanvasElement;
  onCellClick?: (coord: HexCoord) => void;
  onCellHover?: (coord: HexCoord | null) => void;
}

export class GameRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: GameState | null = null;
  private hoveredCoord: HexCoord | null = null;
  private currentPlayer: 1 | 2 = 1;
  private animationFrameId: number | null = null;
  private accumulator: number = 0;
  private lastFrameTime: number = 0;
  private onCellClick?: (coord: HexCoord) => void;
  private onCellHover?: (coord: HexCoord | null) => void;
  private screenShake: { offsetX: number; offsetY: number; startTime: number; duration: number } | null = null;
  private chainHighlights: ChainReactionEvent[] = [];
  private invalidCell: { coord: HexCoord; startTime: number } | null = null;
  private boundHandleClick: (e: MouseEvent) => void;
  private boundHandleMouseMove: (e: MouseEvent) => void;
  private boundHandleMouseLeave: () => void;

  constructor(options: RendererOptions) {
    this.canvas = options.canvas;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get canvas context');
    this.ctx = ctx;
    
    this.onCellClick = options.onCellClick;
    this.onCellHover = options.onCellHover;
    
    this.boundHandleClick = this.handleClick.bind(this);
    this.boundHandleMouseMove = this.handleMouseMove.bind(this);
    this.boundHandleMouseLeave = this.handleMouseLeave.bind(this);
    
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('click', this.boundHandleClick);
    this.canvas.addEventListener('mousemove', this.boundHandleMouseMove);
    this.canvas.addEventListener('mouseleave', this.boundHandleMouseLeave);
  }

  private handleClick(e: MouseEvent): void {
    if (!this.state) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    const coord = pixelToHex(x, y, centerX, centerY);
    const cell = findCell(this.state.map, coord);
    
    if (!cell) {
      this.triggerInvalidClick(coord);
      return;
    }
    
    if (cell.owner !== this.currentPlayer) {
      this.triggerInvalidClick(coord);
      return;
    }
    
    this.triggerClickAnimation(coord);
    
    if (this.onCellClick) {
      this.onCellClick(coord);
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.state) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    const coord = pixelToHex(x, y, centerX, centerY);
    const cell = findCell(this.state.map, coord);
    
    const isDifferent = !this.hoveredCoord || 
      coord.q !== this.hoveredCoord.q || 
      coord.r !== this.hoveredCoord.r;
    
    if (cell && isDifferent) {
      this.hoveredCoord = coord;
      if (this.onCellHover) {
        this.onCellHover(this.hoveredCoord);
      }
    } else if (!cell && this.hoveredCoord !== null) {
      this.hoveredCoord = null;
      if (this.onCellHover) {
        this.onCellHover(null);
      }
    }
  }

  private handleMouseLeave(): void {
    this.hoveredCoord = null;
    if (this.onCellHover) {
      this.onCellHover(null);
    }
  }

  private triggerClickAnimation(coord: HexCoord): void {
    if (!this.state) return;
    const cell = findCell(this.state.map, coord);
    if (cell) {
      cell.animation = {
        type: 'click',
        startTime: Date.now(),
        duration: 200,
      };
    }
  }

  private triggerInvalidClick(coord: HexCoord): void {
    this.invalidCell = { coord, startTime: Date.now() };
    this.triggerScreenShake();
  }

  private triggerScreenShake(): void {
    this.screenShake = {
      offsetX: 0,
      offsetY: 0,
      startTime: Date.now(),
      duration: 200,
    };
  }

  public setState(state: GameState, currentPlayer: 1 | 2): void {
    this.state = state;
    this.currentPlayer = currentPlayer;
    this.chainHighlights = [...state.chainReactions];
    
    if (state.chainReactions.length > 0) {
      this.triggerScreenShake();
    }
  }

  public start(): void {
    this.lastFrameTime = performance.now();
    this.accumulator = 0;
    this.loop(this.lastFrameTime);
  }

  public stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private loop(currentTime: number): void {
    const deltaTime = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;
    
    this.accumulator += deltaTime;
    
    while (this.accumulator >= FRAME_DURATION) {
      this.accumulator -= FRAME_DURATION;
    }
    
    this.render();
    
    this.animationFrameId = requestAnimationFrame((t) => this.loop(t));
  }

  private render(): void {
    if (!this.state) return;
    
    const ctx = this.ctx;
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    ctx.fillStyle = '#1a202c';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    let shakeX = 0;
    let shakeY = 0;
    if (this.screenShake) {
      const elapsed = Date.now() - this.screenShake.startTime;
      const progress = elapsed / this.screenShake.duration;
      
      if (progress < 1) {
        const intensity = 5 * (1 - progress);
        shakeX = (Math.random() - 0.5) * intensity;
        shakeY = (Math.random() - 0.5) * intensity;
      } else {
        this.screenShake = null;
      }
    }
    
    ctx.save();
    ctx.translate(shakeX, shakeY);
    
    const sortedCells = [...this.state.map].sort((a, b) => {
      const aHighlight = this.isChainHighlighted(a.coord);
      const bHighlight = this.isChainHighlighted(b.coord);
      if (aHighlight && !bHighlight) return 1;
      if (!aHighlight && bHighlight) return -1;
      return 0;
    });
    
    for (const cell of sortedCells) {
      this.drawCell(cell, centerX, centerY);
    }
    
    ctx.restore();
    
    this.cleanupAnimations();
  }

  private drawCell(cell: HexCell, centerX: number, centerY: number): void {
    const { x, y } = hexToPixel(cell.coord, centerX, centerY);
    const size = HEX_SIZE - 2;
    
    let scale = 1;
    let glowRadius = 0;
    let bounceOffset = 0;
    
    if (cell.animation) {
      const elapsed = Date.now() - cell.animation.startTime;
      const progress = Math.min(elapsed / cell.animation.duration, 1);
      
      switch (cell.animation.type) {
        case 'place':
          scale = progress;
          glowRadius = 30 * (1 - progress);
          break;
        case 'upgrade':
          const bouncePhase = (progress * 3) % 1;
          bounceOffset = Math.sin(bouncePhase * Math.PI) * 6;
          break;
        case 'click':
          scale = 1 + 0.1 * Math.sin(progress * Math.PI);
          break;
      }
    }
    
    const drawY = y + bounceOffset;
    const actualSize = size * scale;
    
    const isHovered = this.isHovered(cell.coord);
    this.drawHexBackground(x, drawY, actualSize, cell.owner, isHovered);
    this.drawHexBorder(x, drawY, actualSize);
    
    if (this.isPlaceable(cell)) {
      this.drawPlaceableHighlight(x, drawY, actualSize);
    }
    
    if (this.isChainHighlighted(cell.coord)) {
      this.drawChainHighlight(x, drawY, actualSize);
    }
    
    if (this.isInvalid(cell.coord)) {
      this.drawInvalidEffect(x, drawY, actualSize);
    }
    
    if (cell.tower) {
      this.drawTower(x, drawY, cell.tower.type, cell.tower.level, scale);
    }
    
    if (cell.animation?.type === 'place' && glowRadius > 0) {
      this.drawGlow(x, drawY, glowRadius);
    }
    
    if (cell.animation?.type === 'upgrade') {
      const elapsed = Date.now() - cell.animation.startTime;
      const flashPhase = Math.floor((elapsed / 150) % 2);
      if (flashPhase === 0) {
        this.drawUpgradeFlash(x, drawY, actualSize, cell.tower?.level || 1);
      }
    }
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    } : { r: 0, g: 0, b: 0 };
  }

  private brightenColor(hex: string, percent: number): string {
    const { r, g, b } = this.hexToRgb(hex);
    const newR = Math.min(255, Math.round(r + (255 - r) * percent));
    const newG = Math.min(255, Math.round(g + (255 - g) * percent));
    const newB = Math.min(255, Math.round(b + (255 - b) * percent));
    return `rgb(${newR}, ${newG}, ${newB})`;
  }

  private drawHexBackground(x: number, y: number, size: number, owner: number | null, hovered: boolean): void {
    const ctx = this.ctx;
    const corners = getHexCorners(x, y, size);
    
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < 6; i++) {
      ctx.lineTo(corners[i].x, corners[i].y);
    }
    ctx.closePath();
    
    let fillColor = COLORS.background;
    if (owner === 1) fillColor = COLORS.player1;
    else if (owner === 2) fillColor = COLORS.player2;
    
    if (hovered) {
      fillColor = this.brightenColor(fillColor, 0.2);
    }
    
    ctx.fillStyle = fillColor;
    ctx.fill();
  }

  private drawHexBorder(x: number, y: number, size: number): void {
    const ctx = this.ctx;
    const corners = getHexCorners(x, y, size);
    
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < 6; i++) {
      ctx.lineTo(corners[i].x, corners[i].y);
    }
    ctx.closePath();
    
    ctx.strokeStyle = COLORS.gridLine;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  private drawPlaceableHighlight(x: number, y: number, size: number): void {
    const ctx = this.ctx;
    const corners = getHexCorners(x, y, size + 3);
    
    const time = Date.now() / 500;
    const alpha = 0.5 + Math.sin(time * Math.PI * 2) * 0.5;
    
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < 6; i++) {
      ctx.lineTo(corners[i].x, corners[i].y);
    }
    ctx.closePath();
    
    ctx.strokeStyle = `rgba(236, 201, 75, ${alpha})`;
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  private drawChainHighlight(x: number, y: number, size: number): void {
    const ctx = this.ctx;
    const corners = getHexCorners(x, y, size + 4);
    
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < 6; i++) {
      ctx.lineTo(corners[i].x, corners[i].y);
    }
    ctx.closePath();
    
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 4;
    ctx.stroke();
    
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 15;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  private drawInvalidEffect(x: number, y: number, size: number): void {
    const ctx = this.ctx;
    const elapsed = this.invalidCell ? Date.now() - this.invalidCell.startTime : 300;
    const progress = Math.min(elapsed / 300, 1);
    const alpha = 1 - progress;
    
    const corners = getHexCorners(x, y, size + 2);
    
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < 6; i++) {
      ctx.lineTo(corners[i].x, corners[i].y);
    }
    ctx.closePath();
    
    ctx.strokeStyle = `rgba(255, 0, 0, ${alpha})`;
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  private drawTower(x: number, y: number, type: TowerType, level: number, scale: number): void {
    const ctx = this.ctx;
    const baseRadius = 12 * scale;
    
    let color = COLORS.fire;
    if (type === 'ice') color = COLORS.ice;
    else if (type === 'electric') color = COLORS.electric;
    
    for (let i = level; i > 0; i--) {
      const radius = baseRadius * (i / level);
      
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      
      ctx.fillStyle = color;
      ctx.fill();
      
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(x, y, baseRadius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  private drawGlow(x: number, y: number, radius: number): void {
    const ctx = this.ctx;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  private drawUpgradeFlash(x: number, y: number, size: number, level: number): void {
    const ctx = this.ctx;
    const radius = (size * 0.6 * level) / 3;
    
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  private isPlaceable(cell: HexCell): boolean {
    if (!this.state) return false;
    if (this.state.phase !== 'playing') return false;
    if (this.state.currentPlayer !== this.currentPlayer) return false;
    if (cell.owner !== this.currentPlayer) return false;
    if (cell.tower !== null) return false;
    
    const player = this.state.players.find(p => p.id === this.currentPlayer);
    return player !== undefined && player.energy >= 1;
  }

  private isHovered(coord: HexCoord): boolean {
    return this.hoveredCoord?.q === coord.q && this.hoveredCoord?.r === coord.r;
  }

  private isChainHighlighted(coord: HexCoord): boolean {
    const now = Date.now();
    return this.chainHighlights.some(event => {
      if (event.coord.q !== coord.q || event.coord.r !== coord.r) return false;
      const elapsed = now - event.startTime;
      return elapsed >= 0 && elapsed < 500;
    });
  }

  private isInvalid(coord: HexCoord): boolean {
    if (!this.invalidCell) return false;
    if (this.invalidCell.coord.q !== coord.q || this.invalidCell.coord.r !== coord.r) return false;
    const elapsed = Date.now() - this.invalidCell.startTime;
    return elapsed < 300;
  }

  private cleanupAnimations(): void {
    if (!this.state) return;
    const now = Date.now();
    
    for (const cell of this.state.map) {
      if (cell.animation && now - cell.animation.startTime > cell.animation.duration) {
        cell.animation = null;
      }
    }
    
    this.chainHighlights = this.chainHighlights.filter(
      event => now - event.startTime < 500
    );
    
    if (this.invalidCell && now - this.invalidCell.startTime > 300) {
      this.invalidCell = null;
    }
  }

  public resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  public destroy(): void {
    this.stop();
    this.canvas.removeEventListener('click', this.boundHandleClick);
    this.canvas.removeEventListener('mousemove', this.boundHandleMouseMove);
    this.canvas.removeEventListener('mouseleave', this.boundHandleMouseLeave);
  }
}

export { COLORS };
