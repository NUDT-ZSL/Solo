import { Renderer } from './renderer';
import { EggGenes } from './egg';

export interface Genes {
  bodySize: number;
  eyeColor: string;
  limbCount: number;
  patternMode: 'dots' | 'stripes' | 'spots' | 'gradient';
  bodyColor: string;
  accentColor: string;
}

export type AbilityType = 'flight' | 'glow' | 'weather_control';

export class Creature {
  public x: number;
  public y: number;
  public size: number;
  public genes: Genes;
  public satiety: number = 100;
  public evolutionLevel: number = 1;
  public intimacy: number = 0;
  public feedCount: number = 0;
  public abilities: AbilityType[] = [];
  public isMutating: boolean = false;
  public isEvolving: boolean = false;
  public evolutionProgress: number = 0;
  private mutationTime: number = 0;
  private bobTime: number = 0;
  private pixelGrid: (string | null)[][] = [];
  private flightOffset: number = 0;
  private targetX: number;
  private targetY: number;
  private moveTimer: number = 0;
  private flightPhase: number = 0;

  constructor(x: number, y: number, eggGenes: EggGenes, stage: number = 16) {
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    this.size = stage;
    this.flightOffset = stage;

    const patternModes: Genes['patternMode'][] = ['dots', 'stripes', 'spots', 'gradient'];
    this.genes = {
      bodySize: 1,
      eyeColor: eggGenes.eyeColor,
      limbCount: 2 + Math.floor(Math.random() * 3),
      patternMode: patternModes[Math.floor(Math.random() * patternModes.length)],
      bodyColor: eggGenes.bodyColor,
      accentColor: eggGenes.accentColor
    };

    this.rebuildPixelGrid();
  }

  private rebuildPixelGrid(): void {
    this.pixelGrid = this.generatePixelArt(this.size);
  }

  private generatePixelArt(gridSize: number): (string | null)[][] {
    const grid: (string | null)[][] = Array(gridSize);
    const half = Math.floor(gridSize / 2);
    const body = this.genes.bodyColor;
    const dark = this.shadeColor(body, -0.3);
    const light = this.shadeColor(body, 0.2);
    const accent = this.genes.accentColor;
    const eye = this.genes.eyeColor;
    const white = '#FFFFFF';

    for (let r = 0; r < gridSize; r++) {
      grid[r] = new Array(gridSize).fill(null);
    }

    const bodyRadius = gridSize * 0.4;
    const cx = half;
    const cy = half + 1;

    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
      const dx = (x - cx) / bodyRadius;
      const dy = (y - cy) / (bodyRadius * 0.9);
      const dist = dx * dx + dy * dy;

      if (dist <= 1.0) {
        let c = body;

        if (dist > 0.92) {
          c = dark;
        } else {
          const lx = (x - cx) / (gridSize * 0.3);
          const ly = (y - cy) / (gridSize * 0.3);
          if (lx * lx + (ly + 0.3) * (ly + 0.3) < 0.04) {
            c = light;
          }
        }

        grid[y][x] = c;
      }
    }
    }

    this.applyPattern(grid, gridSize, accent, body);
    this.drawEyes(grid, gridSize, eye, white, bodyRadius);
    this.drawLimbs(grid, gridSize, dark);
    this.drawMouth(grid, gridSize, dark);

    return grid;
  }

  private applyPattern(grid: (string | null)[][], size: number, accent: string, body: string): void {
    const half = size / 2;
    const bodyRadius = size * 0.4;

    switch (this.genes.patternMode) {
      case 'dots':
        for (let i = 0; i < 6; i++) {
          const ang = (i / 6) * Math.PI * 2 + this.genes.bodySize;
          const rr = bodyRadius * 0.5;
          const px = Math.floor(half + Math.cos(ang) * rr);
          const py = Math.floor(half + Math.sin(ang) * rr);
          if (px >= 0 && px < size && py >= 0 && py < size && grid[py][px] === body) {
            grid[py][px] = accent;
            if (px + 1 < size && grid[py][px + 1] === body) grid[py][px + 1] = accent;
          }
        }
        break;
      case 'stripes':
        for (let x = 0; x < size; x++) {
          const mod = (x - half) % 4;
          if (mod === 0 || mod === 1) {
            for (let y = 0; y < size; y++) {
              if (grid[y][x] === body && Math.abs(x - half) < bodyRadius * 0.8) {
                grid[y][x] = accent;
              }
            }
          }
        }
        break;
      case 'spots':
        for (let i = 0; i < 4; i++) {
          const sx = Math.floor((i * size / 5) + 2;
          const sy = Math.floor(size * 0.35 + (i % 2) * size * 0.15);
          for (let dy2 = -1; dy2 <= 1; dy2++) {
            for (let dx2 = -1; dx2 <= 1; dx2++) {
              const px = sx + dx2;
              const py = sy + dy2;
              if (px >= 0 && px < size && py >= 0 && py < size && grid[py][px] === body) {
                grid[py][px] = accent;
              }
            }
          }
        }
        break;
      case 'gradient':
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            if (grid[y][x] === body) {
              const progress = (y - (half - bodyRadius * 0.8)) / (bodyRadius * 1.6);
              if (progress > 0.55) {
                grid[y][x] = accent;
              } else if (progress > 0.4) {
                grid[y][x] = this.mixColors(body, accent, 0.5);
              }
            }
          }
        }
        break;
    }
  }

  private drawEyes(grid: (string | null)[][], size: number, eyeColor: string, white: string, radius: number): void {
    const half = size / 2;
    const eyeY = Math.floor(half - size * 0.15);
    const eyeOffset = Math.floor(size * 0.2);
    const eyeSize = Math.max(1, Math.floor(size * 0.08));

    const positions = [
      [Math.floor(half - eyeOffset), eyeY],
      [Math.floor(half + eyeOffset - 1), eyeY]
    ];

    for (const [ex, ey] of positions) {
      for (let dy = -eyeSize; dy <= eyeSize; dy++) {
        for (let dx = -eyeSize; dx <= eyeSize; dx++) {
          if (dx * dx + dy * dy <= eyeSize * eyeSize + 0.5) {
          const px = ex + dx;
          const py = ey + dy;
          if (px >= 0 && px < size && py >= 0 && py < size && grid[py] && grid[py][px]) {
            grid[py][px] = white;
          }
        }
      }
    }

    for (const [ex, ey] of positions) {
      for (let dy = 0; dy <= Math.max(0, eyeSize - 1); dy++) {
        for (let dx = 0; dx <= Math.max(0, eyeSize - 1); dx++) {
          const px = ex + dx;
          const py = ey + dy;
          if (px >= 0 && px < size && py >= 0 && py < size) {
            grid[py][px] = eyeColor;
          }
        }
      }
    }
    void radius;
  }

  private drawLimbs(grid: (string | null)[][], size: number, dark: string): void {
    const half = size / 2;
    const bodyBottom = Math.floor(half + size * 0.38);
    const limbCount = this.genes.limbCount;

    if (limbCount >= 2) {
      const spacing = size * 0.2;
      for (let i = 0; i < Math.min(2, limbCount); i++) {
        const side = i === 0 ? -1 : 1;
        const lx = Math.floor(half + side * spacing);
        for (let h = 0; h < Math.floor(size * 0.18); h++) {
          for (let w = -1; w <= 0; w++) {
            const px = lx + w;
            const py = bodyBottom + h;
            if (px >= 0 && px < size && py >= 0 && py < size) {
              grid[py][px] = dark;
            }
          }
        }
      }
    }

    if (limbCount >= 4) {
      for (let i = 0; i < 2; i++) {
        const side = i === 0 ? -1 : 1;
        const lx = Math.floor(half + side * size * 0.42);
        const ly = Math.floor(half - size * 0.1);
        for (let l = 0; l < Math.floor(size * 0.2); l++) {
          for (let w = -1; w <= 0; w++) {
            const px = lx + side * l + w;
            const py = ly;
            if (px >= 0 && px < size && py >= 0 && py < size) {
              grid[py][px] = dark;
            }
          }
        }
      }
    }

    if (limbCount >= 6) {
      const wingY = Math.floor(half - size * 0.25);
      for (let s = -1; s <= 1; s += 2) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = 0; dx < 2; dx++) {
            const px = Math.floor(half + s * (size * 0.38 + dx));
            const py = wingY + dy;
            if (px >= 0 && px < size && py >= 0 && py < size) {
              grid[py][px] = this.genes.accentColor;
            }
          }
        }
      }
    }
  }

  private drawMouth(grid: (string | null)[][], size: number, dark: string): void {
    const half = size / 2;
    const mouthY = Math.floor(half + size * 0.1);
    const mouthW = Math.max(2, Math.floor(size * 0.12));
    for (let x = -mouthW; x <= mouthW - 1; x++) {
      const px = Math.floor(half + x);
      if (px >= 0 && px < size) {
        grid[mouthY][px] = dark;
      }
    }
    if (mouthY + 1 < size) {
      for (let x = -Math.floor(mouthW / 2); x <= Math.floor(mouthW / 2) - 1; x++) {
        const px = Math.floor(half + x);
        if (px >= 0 && px < size) {
          grid[mouthY + 1][px] = dark;
        }
      }
    }
  }

  private shadeColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent * 100);
    const R = Math.max(0, Math.min(255, (num >> 16) + amt));
    const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amt));
    const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt));
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  }

  private mixColors(c1: string, c2: string, ratio: number): string {
    const n1 = parseInt(c1.replace('#', ''), 16);
    const n2 = parseInt(c2.replace('#', ''), 16);
    const r = Math.floor(((n1 >> 16) * (1 - ratio) + (n2 >> 16) * ratio));
    const g = Math.floor((((n1 >> 8) & 0xFF) * (1 - ratio) + ((n2 >> 8) & 0xFF) * ratio));
    const b = Math.floor(((n1 & 0xFF) * (1 - ratio) + ((n2 & 0xFF) * ratio));
    return '#' + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
  }

  public update(dt: number, boundsX: number, groundY: number): void {
    this.bobTime += dt;
    this.moveTimer -= dt;

    if (this.isMutating) {
      this.mutationTime -= dt;
      if (this.mutationTime <= 0) {
        this.isMutating = false;
      }
    }

    if (this.isEvolving) {
      this.evolutionProgress += dt;
    }

    if (!this.isEvolving) {
      if (this.moveTimer <= 0) {
        this.moveTimer = 2000 + Math.random() * 3000;
        const rangeX = boundsX * 0.7;
        this.targetX = boundsX * 0.15 + Math.random() * rangeX;
      }

      const dx = this.targetX - this.x;
      if (Math.abs(dx) > 1) {
        this.x += Math.sign(dx) * 0.3 * (dt / 16.67);
      }
    }

    if (this.abilities.includes('flight')) {
      this.flightPhase += dt * 0.003;
      this.flightOffset = this.size + Math.sin(this.flightPhase) * 8 + 10;
    }
    void groundY;
  }

  public getDrawY(): number {
    if (this.abilities.includes('flight')) {
      return this.y - this.flightOffset;
    }
    return this.y;
  }

  public draw(renderer: Renderer, time: number): void {
    if (this.isEvolving) return;

    const bob = Math.sin(this.bobTime * 0.004) * 2;
    const drawX = this.x - this.size / 2;
    const drawY = this.getDrawY() - this.size / 2 + bob;

    let flashAlpha = 1;
    if (this.isMutating) {
      const phase = Math.sin(this.mutationTime * 0.05);
      flashAlpha = 0.5 + Math.abs(phase) * 0.5;
      renderer.drawPixelGrid(this.pixelGrid, drawX, drawY, 1, flashAlpha);
      const ctx = renderer.getContext();
      ctx.save();
      ctx.globalAlpha = 0.3 * Math.abs(phase);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(Math.floor(drawX - 2), Math.floor(drawY - 2), this.size + 4, this.size + 4);
      ctx.restore();
    } else {
      renderer.drawPixelGrid(this.pixelGrid, drawX, drawY, 1);
    }

    if (this.abilities.includes('flight')) {
      if (Math.random() < 0.4) {
        renderer.addTrailParticles(this.x + (Math.random() - 0.5) * this.size * 0.3, this.getDrawY() + this.size * 0.3);
      }
    }

    if (this.abilities.includes('glow')) {
      renderer.addGlowParticles(this.x, this.getDrawY(), this.size * 0.8);
    }

    void time;
  }

  public feed(renderer: Renderer): void {
    this.satiety = Math.min(100, this.satiety + 20);
    this.size = Math.min(48, this.size + 2);
    this.feedCount++;
    this.isMutating = true;
    this.mutationTime = 300;
    this.mutateGenes();
    this.rebuildPixelGrid();
    renderer.addMutationParticles(this.x, this.getDrawY());
  }

  private mutateGenes(): void {
    const roll = Math.random();
    if (roll < 0.25) {
      const modes: Genes['patternMode'][] = ['dots', 'stripes', 'spots', 'gradient'];
      this.genes.patternMode = modes[Math.floor(Math.random() * modes.length)];
    } else if (roll < 0.5) {
      this.genes.bodyColor = this.shadeColor(this.genes.bodyColor, (Math.random() - 0.5) * 20);
    } else if (roll < 0.75) {
      this.genes.accentColor = this.shadeColor(this.genes.accentColor, (Math.random() - 0.5) * 25);
    } else {
      this.genes.limbCount = Math.min(6, Math.max(2, this.genes.limbCount + (Math.random() > 0.5 ? 1 : -1)));
    }
  }

  public decreaseSatiety(dt: number): void {
    this.satiety = Math.max(0, this.satiety - dt / 30000 * 10);
  }

  public tryEvolve(): boolean {
    if (this.feedCount >= 5 && !this.isEvolving) {
      this.isEvolving = true;
      this.evolutionProgress = 0;
      return true;
    }
    return false;
  }

  public completeEvolution(): string | null {
    if (!this.isEvolving && this.evolutionProgress >= 2000) {
      this.isEvolving = false;
      this.evolutionLevel++;
      this.feedCount = 0;
      this.size = Math.min(64, this.size + 16);

      const allAbilities: AbilityType[] = ['flight', 'glow', 'weather_control'];
      const available = allAbilities.filter(a => !this.abilities.includes(a));
      let unlocked: AbilityType | null = null;
      if (available.length > 0) {
        unlocked = available[Math.floor(Math.random() * available.length)];
        this.abilities.push(unlocked);
      }

      this.genes.bodySize *= 1.2;
      this.rebuildPixelGrid();
      return unlocked ? this.getAbilityName(unlocked) : null;
    }
    return null;
  }

  private getAbilityName(ability: AbilityType): string {
    switch (ability) {
      case 'flight': return '✨ 解锁能力：飞行拖尾！';
      case 'glow': return '🌟 解锁能力：发光光晕！';
      case 'weather_control': return '🌦️ 解锁能力：气候控制！';
    }
  }

  public containsPoint(px: number, py: number): boolean {
    const dx = px - this.x;
    const dy = py - this.getDrawY();
    const r = this.size * 0.55;
    return dx * dx + dy * dy <= r * r;
  }

  public interact(): void {
    this.intimacy = Math.min(100, this.intimacy + 5);
  }

  public getCenter(): { x: number; y: number } {
    return { x: this.x, y: this.getDrawY() };
  }

  public getBoundingRadius(): number {
    return this.size * 0.6;
  }

  public getEvolutionAlpha(): number {
    if (!this.isEvolving) return 1;
    const t = this.evolutionProgress / 2000;
    if (t < 0.2) return 1 - t * 5;
    if (t > 0.8) return (t - 0.8) * 5;
    return 0;
  }
}
