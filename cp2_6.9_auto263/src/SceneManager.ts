import type { Difficulty } from './AudioEngine';
import { DIFFICULTY_CONFIG } from './AudioEngine';

export interface BlockState {
  index: number;
  noteName: string;
  x: number;
  y: number;
  width: number;
  height: number;
  highlightType: 'none' | 'sequence' | 'correct' | 'wrong';
  highlightStart: number;
}

export interface PulseWave {
  x: number;
  y: number;
  startRadius: number;
  startTime: number;
  duration: number;
  color: string;
}

export interface GameState {
  score: number;
  timeLeft: number;
  isPlaying: boolean;
  isShowingSequence: boolean;
  difficulty: Difficulty;
  currentRound: number;
}

const BLOCK_SIZE = 60;
const BLOCK_GAP = 10;
const HIGHLIGHT_DURATION_SEQUENCE = 300;
const HIGHLIGHT_DURATION_CORRECT = 200;
const HIGHLIGHT_DURATION_WRONG = 300;
const PULSE_DURATION = 400;

export class SceneManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private blocks: BlockState[] = [];
  private pulseWaves: PulseWave[] = [];
  private gameState: GameState;
  private dpr: number = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;

    this.gameState = {
      score: 0,
      timeLeft: 30,
      isPlaying: false,
      isShowingSequence: false,
      difficulty: 'normal',
      currentRound: 1
    };

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  public resize(): void {
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * this.dpr;
    this.canvas.height = window.innerHeight * this.dpr;
    this.canvas.style.width = window.innerWidth + 'px';
    this.canvas.style.height = window.innerHeight + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.layoutBlocks();
  }

  public setDifficulty(difficulty: Difficulty): void {
    this.gameState.difficulty = difficulty;
    this.layoutBlocks();
  }

  private layoutBlocks(): void {
    const config = DIFFICULTY_CONFIG[this.gameState.difficulty];
    const { cols, rows, notes } = config;

    const totalWidth = cols * BLOCK_SIZE + (cols - 1) * BLOCK_GAP;
    const totalHeight = rows * BLOCK_SIZE + (rows - 1) * BLOCK_GAP;

    const canvasW = window.innerWidth;
    const canvasH = window.innerHeight;

    const startX = (canvasW - totalWidth) / 2;
    const startY = (canvasH - totalHeight) / 2;

    this.blocks = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const index = row * cols + col;
        if (index >= notes.length) break;
        this.blocks.push({
          index,
          noteName: notes[index],
          x: startX + col * (BLOCK_SIZE + BLOCK_GAP),
          y: startY + row * (BLOCK_SIZE + BLOCK_GAP),
          width: BLOCK_SIZE,
          height: BLOCK_SIZE,
          highlightType: 'none',
          highlightStart: 0
        });
      }
    }
  }

  public updateState(state: Partial<GameState>): void {
    Object.assign(this.gameState, state);
  }

  public highlightBlock(index: number, type: 'sequence' | 'correct' | 'wrong'): void {
    const block = this.blocks[index];
    if (!block) return;

    block.highlightType = type;
    block.highlightStart = performance.now();

    const cx = block.x + block.width / 2;
    const cy = block.y + block.height / 2;

    let color = '#A855F7';
    if (type === 'correct') color = '#00FF88';
    else if (type === 'wrong') color = '#FF3366';

    this.pulseWaves.push({
      x: cx,
      y: cy,
      startRadius: 0,
      startTime: performance.now(),
      duration: PULSE_DURATION,
      color
    });
  }

  public clearHighlights(): void {
    for (const block of this.blocks) {
      block.highlightType = 'none';
      block.highlightStart = 0;
    }
  }

  public getBlockAt(clientX: number, clientY: number): BlockState | null {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    for (const block of this.blocks) {
      if (
        x >= block.x && x <= block.x + block.width &&
        y >= block.y && y <= block.y + block.height
      ) {
        return block;
      }
    }
    return null;
  }

  public getBlocks(): BlockState[] {
    return this.blocks;
  }

  public render(): void {
    const ctx = this.ctx;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const now = performance.now();

    ctx.clearRect(0, 0, w, h);
    this.drawBackground(ctx, w, h);
    this.updateAndDrawPulseWaves(ctx, now);
    this.drawBlocks(ctx, now);
  }

  private drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) / 1.5);
    gradient.addColorStop(0, '#121224');
    gradient.addColorStop(1, '#0A0A14');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  }

  private drawBlocks(ctx: CanvasRenderingContext2D, now: number): void {
    for (const block of this.blocks) {
      let elapsed = 0;
      let duration = 0;

      if (block.highlightType !== 'none') {
        elapsed = now - block.highlightStart;
        switch (block.highlightType) {
          case 'sequence': duration = HIGHLIGHT_DURATION_SEQUENCE; break;
          case 'correct': duration = HIGHLIGHT_DURATION_CORRECT; break;
          case 'wrong': duration = HIGHLIGHT_DURATION_WRONG; break;
        }
        if (elapsed >= duration) {
          block.highlightType = 'none';
          elapsed = 0;
        }
      }

      const isHighlighted = block.highlightType !== 'none';
      const t = isHighlighted ? Math.min(elapsed / duration, 1) : 0;
      const easeOut = isHighlighted ? 1 - t * t : 0;

      let fillColor = '#2A2D3A';
      let glowColor = 'rgba(0, 0, 0, 0)';
      let glowIntensity = 0;

      if (block.highlightType === 'sequence') {
        const gradient = ctx.createLinearGradient(block.x, block.y, block.x, block.y + block.height);
        gradient.addColorStop(0, '#00D4FF');
        gradient.addColorStop(1, '#A855F7');
        ctx.fillStyle = gradient;
        glowColor = 'rgba(168, 85, 247, ' + (0.6 * easeOut) + ')';
        glowIntensity = 25 * easeOut;
      } else if (block.highlightType === 'correct') {
        fillColor = `rgba(0, 255, 136, ${0.3 + 0.7 * easeOut})`;
        ctx.fillStyle = fillColor;
        glowColor = 'rgba(0, 255, 136, ' + (0.7 * easeOut) + ')';
        glowIntensity = 20 * easeOut;
      } else if (block.highlightType === 'wrong') {
        fillColor = `rgba(255, 51, 102, ${0.3 + 0.7 * easeOut})`;
        ctx.fillStyle = fillColor;
        glowColor = 'rgba(255, 51, 102, ' + (0.7 * easeOut) + ')';
        glowIntensity = 20 * easeOut;
      } else {
        ctx.fillStyle = '#2A2D3A';
        glowColor = 'rgba(0, 212, 255, 0.08)';
        glowIntensity = 6;
      }

      if (block.highlightType === 'none' || block.highlightType === 'correct' || block.highlightType === 'wrong') {
        if (block.highlightType === 'none') {
          ctx.fillStyle = '#2A2D3A';
        }
      }

      ctx.save();
      if (glowIntensity > 0) {
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = glowIntensity;
        ctx.shadowOffsetY = 3;
      }

      const radius = 8;
      this.roundRect(ctx, block.x, block.y, block.width, block.height, radius);
      ctx.fill();

      if (block.highlightType === 'sequence') {
        const gradient = ctx.createLinearGradient(block.x, block.y, block.x, block.y + block.height);
        gradient.addColorStop(0, '#00D4FF');
        gradient.addColorStop(1, '#A855F7');
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = glowIntensity;
        ctx.fillStyle = gradient;
        this.roundRect(ctx, block.x, block.y, block.width, block.height, radius);
        ctx.fill();
      }

      ctx.restore();

      ctx.save();
      ctx.strokeStyle = block.highlightType === 'sequence' ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      this.roundRect(ctx, block.x + 0.5, block.y + 0.5, block.width - 1, block.height - 1, radius);
      ctx.stroke();
      ctx.restore();
    }
  }

  private updateAndDrawPulseWaves(ctx: CanvasRenderingContext2D, now: number): void {
    this.pulseWaves = this.pulseWaves.filter(p => now - p.startTime < p.duration);

    for (const pulse of this.pulseWaves) {
      const elapsed = now - pulse.startTime;
      const t = elapsed / pulse.duration;
      const radius = 0 + t * 80;
      const alpha = 0.8 * (1 - t);

      ctx.save();
      ctx.beginPath();
      ctx.arc(pulse.x, pulse.y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = this.hexToRgba(pulse.color, alpha);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  }

  private hexToRgba(hex: string, alpha: number): string {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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
}
