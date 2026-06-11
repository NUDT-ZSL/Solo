import type { Renderer } from './renderer';

export interface EggGenes {
  bodySize: number;
  eyeColor: string;
  limbCount: number;
  patternType: number;
  bodyColor: string;
  accentColor: string;
  personality: number;
}

const EGG_COLOR_PALETTES: [string, string][] = [
  ['#FFE0B2', '#FFAB91'],
  ['#B3E5FC', '#81D4FA'],
  ['#C8E6C9', '#A5D6A7'],
  ['#F8BBD0', '#F48FB1'],
  ['#E1BEE7', '#CE93D8'],
  ['#FFECB3', '#FFE082'],
  ['#B2DFDB', '#80CBC4'],
  ['#D7CCC8', '#BCAAA4'],
];

const EYE_COLORS = ['#FFFFFF', '#FFEB3B', '#4FC3F7', '#FF5252', '#69F0AE', '#E040FB', '#FF9100'];

const BODY_COLORS = [
  '#FF8A65', '#81C784', '#64B5F6', '#BA68C8',
  '#FFD54F', '#4DB6AC', '#F06292', '#A1887F',
  '#AED581', '#4DD0E1', '#7986CB', '#FFB74D',
];

const ACCENT_COLORS = [
  '#FF5252', '#FFEB3B', '#69F0AE', '#40C4FF',
  '#E040FB', '#FF6E40', '#B388FF', '#FFEE58',
  '#64FFDA', '#FF4081', '#7C4DFF', '#FFFF00',
];

export class Egg {
  private x: number;
  private y: number;
  private size: number = 32;
  private clickCount: number = 0;
  private requiredClicks: number = 10;
  private baseColor: string;
  private accentColor: string;
  private pattern: number;
  private wobbleTimer: number = 0;
  private isHatching: boolean = false;
  private hatchProgress: number = 0;
  private shellPieces: ShellPiece[] = [];
  private genes: EggGenes;
  private hatchComplete: boolean = false;
  private lastClickTime: number = 0;
  private flashTimer: number = 0;

  constructor(sceneWidth: number, sceneHeight: number) {
    this.x = sceneWidth / 2 - this.size / 2;
    this.y = sceneHeight / 2 - this.size / 2 + 40;

    const palette = EGG_COLOR_PALETTES[Math.floor(Math.random() * EGG_COLOR_PALETTES.length)];
    this.baseColor = palette[0];
    this.accentColor = palette[1];
    this.pattern = Math.floor(Math.random() * 4);

    this.genes = this.generateGenes();
  }

  private generateGenes(): EggGenes {
    return {
      bodySize: 12 + Math.floor(Math.random() * 4),
      eyeColor: EYE_COLORS[Math.floor(Math.random() * EYE_COLORS.length)],
      limbCount: [2, 4, 6][Math.floor(Math.random() * 3)],
      patternType: Math.floor(Math.random() * 5),
      bodyColor: BODY_COLORS[Math.floor(Math.random() * BODY_COLORS.length)],
      accentColor: ACCENT_COLORS[Math.floor(Math.random() * ACCENT_COLORS.length)],
      personality: Math.random(),
    };
  }

  click(renderer: Renderer): boolean {
    if (this.isHatching || this.hatchComplete) return false;

    const now = performance.now();
    if (now - this.lastClickTime < 16) return false;
    this.lastClickTime = now;

    this.clickCount++;
    this.wobbleTimer = 0.3;
    this.flashTimer = 0.2;

    const particleCount = 20 + Math.floor(Math.random() * 11);
    const centerX = this.x + this.size / 2;
    const centerY = this.y + this.size / 2;
    const colors = [
      this.accentColor,
      this.baseColor,
      '#FFFFFF',
      '#FFEB3B',
      '#FF5252',
      '#69F0AE',
      '#40C4FF',
    ];
    renderer.spawnParticles(centerX, centerY, particleCount, colors, {
      maxLife: 0.5,
      size: 2,
    });

    if (this.clickCount >= this.requiredClicks) {
      this.startHatching(renderer);
    }

    return true;
  }

  private startHatching(renderer: Renderer): void {
    this.isHatching = true;
    this.hatchProgress = 0;

    const centerX = this.x + this.size / 2;
    const centerY = this.y + this.size / 2;

    const pieceOffsets: [number, number, number, number][] = [
      [0, 0, -3, -4],
      [this.size / 2, 0, 3, -4],
      [0, this.size / 2, -3, 4],
      [this.size / 2, this.size / 2, 3, 4],
      [this.size / 4, 0, 0, -5],
      [this.size / 4, this.size / 2, -2, 5],
      [0, this.size / 4, -5, 0],
      [this.size / 2, this.size / 4, 5, 0],
    ];

    this.shellPieces = pieceOffsets.map(([ox, oy, dx, dy]) => ({
      x: this.x + ox,
      y: this.y + oy,
      vx: dx * (1 + Math.random()),
      vy: dy * (1 + Math.random()),
      width: this.size / 2,
      height: this.size / 2,
      rotation: 0,
      rotSpeed: (Math.random() - 0.5) * 0.3,
      color: Math.random() > 0.5 ? this.baseColor : this.accentColor,
      alpha: 1,
    }));

    renderer.spawnBurstParticles(centerX, centerY, 40, [
      '#FFFFFF', this.accentColor, this.baseColor, '#FFEB3B',
    ]);
  }

  update(deltaTime: number): void {
    if (this.wobbleTimer > 0) {
      this.wobbleTimer -= deltaTime;
    }
    if (this.flashTimer > 0) {
      this.flashTimer -= deltaTime;
    }

    if (this.isHatching && !this.hatchComplete) {
      this.hatchProgress += deltaTime;

      for (const piece of this.shellPieces) {
        piece.x += piece.vx;
        piece.y += piece.vy;
        piece.vy += 0.2;
        piece.rotation += piece.rotSpeed;
        piece.alpha = Math.max(0, 1 - this.hatchProgress);
      }

      if (this.hatchProgress >= 1) {
        this.hatchComplete = true;
      }
    }
  }

  draw(renderer: Renderer): void {
    if (!this.hatchComplete && !this.isHatching) {
      this.drawEgg(renderer);
    }

    if (this.isHatching) {
      this.drawHatching(renderer);
    }
  }

  private drawEgg(renderer: Renderer): void {
    const ctx = (renderer as any).ctx as CanvasRenderingContext2D;
    const wobbleOffset = this.wobbleTimer > 0 ? Math.sin(performance.now() / 20) * 2 : 0;
    const drawX = this.x + wobbleOffset;

    const flashAlpha = this.flashTimer > 0 ? (0.3 * (this.flashTimer / 0.2)) : 0;

    const s = 2;
    const eggMap: number[][] = [];

    for (let r = 0; r < 16; r++) {
      eggMap[r] = [];
      for (let c = 0; c < 16; c++) {
        const nx = (c - 7.5) / 7.5;
        const ny = (r - 8) / 8;
        const egg = nx * nx / 0.9 + ny * ny;

        let val = 0;
        if (egg <= 1) val = 1;

        if (val === 1 && this.pattern === 0 && ((r + c) % 5 === 0)) val = 2;
        if (val === 1 && this.pattern === 1 && (r % 4 === 0 && c % 2 === 0)) val = 2;
        if (val === 1 && this.pattern === 2 && Math.abs(r - c) % 6 === 0) val = 2;
        if (val === 1 && this.pattern === 3 && (r * c) % 7 === 0) val = 2;

        if (val === 1) {
          const edgeDist = Math.min(
            Math.abs(nx * 7.5),
            Math.abs(ny * 8),
            7.5 - Math.abs(nx * 7.5),
            8 - Math.abs(ny * 8)
          );
          if (edgeDist < 1.5) val = 3;
        }

        eggMap[r][c] = val;
      }
    }

    for (let r = 0; r < 16; r++) {
      for (let c = 0; c < 16; c++) {
        const val = eggMap[r][c];
        if (val === 0) continue;

        let color = this.baseColor;
        if (val === 2) color = this.accentColor;
        if (val === 3) color = this.darkenColor(this.baseColor, 0.7);

        renderer.drawPixel(drawX + c * s, this.y + r * s, color, s);
      }
    }

    if (flashAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = flashAlpha;
      for (let r = 0; r < 16; r++) {
        for (let c = 0; c < 16; c++) {
          if (eggMap[r][c] > 0) {
            renderer.drawPixel(drawX + c * s, this.y + r * s, '#FFFFFF', s);
          }
        }
      }
      ctx.restore();
    }

    const progressWidth = this.size;
    const progressHeight = 4;
    const progressY = this.y + this.size + 8;
    renderer.drawRect(this.x, progressY, progressWidth, progressHeight, '#0D1420');
    renderer.drawRect(
      this.x + 1,
      progressY + 1,
      Math.max(0, (progressWidth - 2) * (this.clickCount / this.requiredClicks)),
      progressHeight - 2,
      '#FF5252'
    );
  }

  private drawHatching(renderer: Renderer): void {
    const ctx = (renderer as any).ctx as CanvasRenderingContext2D;

    for (const piece of this.shellPieces) {
      if (piece.alpha <= 0) continue;

      ctx.save();
      ctx.globalAlpha = piece.alpha;
      ctx.translate(piece.x + piece.width / 2, piece.y + piece.height / 2);
      ctx.rotate(piece.rotation);

      const s = 2;
      const cols = piece.width / s;
      const rows = piece.height / s;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if ((r + c) % 3 === 0 && Math.random() > 0.3) continue;
          ctx.fillStyle = piece.color;
          ctx.fillRect(
            -piece.width / 2 + c * s,
            -piece.height / 2 + r * s,
            s,
            s
          );
        }
      }

      ctx.restore();
    }
  }

  private darkenColor(color: string, factor: number): string {
    const hex = color.replace('#', '');
    const r = Math.floor(parseInt(hex.slice(0, 2), 16) * factor);
    const g = Math.floor(parseInt(hex.slice(2, 4), 16) * factor);
    const b = Math.floor(parseInt(hex.slice(4, 6), 16) * factor);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  getGenes(): EggGenes {
    return { ...this.genes };
  }

  isHatched(): boolean {
    return this.hatchComplete;
  }

  isHatchingActive(): boolean {
    return this.isHatching && !this.hatchComplete;
  }

  containsPoint(px: number, py: number): boolean {
    if (this.isHatching || this.hatchComplete) return false;
    const cx = this.x + this.size / 2;
    const cy = this.y + this.size / 2;
    const nx = (px - cx) / (this.size / 2);
    const ny = (py - cy) / (this.size / 2);
    return nx * nx / 0.9 + ny * ny <= 1;
  }

  getCenter(): { x: number; y: number } {
    return {
      x: this.x + this.size / 2,
      y: this.y + this.size / 2,
    };
  }
}

interface ShellPiece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  rotation: number;
  rotSpeed: number;
  color: string;
  alpha: number;
}
