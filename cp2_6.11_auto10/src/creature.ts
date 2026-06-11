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

type GamePhase = 'idle' | 'growing' | 'mutating' | 'evolving';

export class Creature {
  public x: number;
  public y: number;
  public size: number;
  public targetSize: number;
  public sizeGrowthProgress: number = 1;
  public baseSize: number;
  public genes: Genes;
  public satiety: number = 100;
  public evolutionLevel: number = 1;
  public intimacy: number = 0;
  public feedCount: number = 0;
  public abilities: AbilityType[] = [];
  public phase: GamePhase = 'idle';
  public phaseTimer: number = 0;
  public evolutionStormTriggered: boolean = false;
  public bobTime: number = 0;
  private pixelGrid: (string | null)[][] = [];
  private previousGrid: (string | null)[][] = [];
  private flightOffset: number = 0;
  private targetX: number;
  private moveTimer: number = 0;
  private flightPhase: number = 0;
  private glowPulse: number = 0;
  private displaySize: number;

  constructor(x: number, y: number, eggGenes: EggGenes, stage: number = 16) {
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.baseSize = stage;
    this.size = stage;
    this.targetSize = stage;
    this.displaySize = stage;

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
    this.previousGrid = this.cloneGrid(this.pixelGrid);
    void this.previousGrid;
  }

  private cloneGrid(g: (string | null)[][]): (string | null)[][] {
    return g.map(row => row.slice());
  }

  private rebuildPixelGrid(): void {
    this.previousGrid = this.cloneGrid(this.pixelGrid);
    this.pixelGrid = this.generatePixelArt(this.getNextGridSize());
  }

  private getNextGridSize(): number {
    const s = Math.ceil(this.targetSize);
    return Math.max(16, s - (s % 2 === 0 ? 0 : 1));
  }

  private generatePixelArt(gridSize: number): (string | null)[][] {
    const grid: (string | null)[][] = Array.from({ length: gridSize }, () => new Array(gridSize).fill(null));
    const half = gridSize / 2;
    const body = this.genes.bodyColor;
    const dark = this.shade(body, -0.32);
    const light = this.shade(body, 0.22);
    const accent = this.genes.accentColor;
    const eye = this.genes.eyeColor;
    const white = '#FFFFFF';
    const bodyRadius = gridSize * 0.41;
    const cx = half;
    const cy = half + 1;

    for (let yy = 0; yy < gridSize; yy++) {
      for (let xx = 0; xx < gridSize; xx++) {
        const dx = (xx - cx) / bodyRadius;
        const dy = (yy - cy) / (bodyRadius * 0.92);
        const dist = dx * dx + dy * dy;
        if (dist <= 1.0) {
          let c = body;
          if (dist > 0.9) c = dark;
          else {
            const lx = (xx - cx) / (gridSize * 0.3);
            const ly = (yy - cy) / (gridSize * 0.3);
            if (lx * lx + (ly + 0.32) * (ly + 0.32) < 0.045) c = light;
          }
          grid[yy][xx] = c;
        }
      }
    }

    this.applyPattern(grid, gridSize, accent, body, bodyRadius);
    this.drawFace(grid, gridSize, eye, white, bodyRadius);
    this.drawLimbs(grid, gridSize, dark);
    return grid;
  }

  private applyPattern(grid: (string | null)[][], size: number, accent: string, body: string, r: number): void {
    const half = size / 2;
    switch (this.genes.patternMode) {
      case 'dots': {
        for (let i = 0; i < 7; i++) {
          const ang = (i / 7) * Math.PI * 2 + this.genes.bodySize;
          const rr = r * 0.52;
          const px = Math.floor(half + Math.cos(ang) * rr);
          const py = Math.floor(half + Math.sin(ang) * rr);
          for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
            const x = px + dx, y = py + dy;
            if (x >= 0 && x < size && y >= 0 && y < size && grid[y][x] === body) grid[y][x] = accent;
          }
        }
        break;
      }
      case 'stripes': {
        for (let x = 0; x < size; x++) {
          if (x % 4 === 0 || x % 4 === 1) {
            for (let y = 0; y < size; y++) {
              if (grid[y][x] === body && Math.abs(x - half) < r * 0.78) grid[y][x] = accent;
            }
          }
        }
        break;
      }
      case 'spots': {
        const seeds = [[2, 6], [size - 6, 8], [5, size / 2], [size - 8, size / 2 + 2]];
        for (const [sx, sy] of seeds) {
          for (let dy2 = -2; dy2 <= 1; dy2++) for (let dx2 = -2; dx2 <= 1; dx2++) {
            const px = sx + dx2, py = sy + dy2;
            if (px >= 0 && px < size && py >= 0 && py < size && grid[py][px] === body) grid[py][px] = accent;
          }
        }
        break;
      }
      case 'gradient': {
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            if (grid[y][x] === body) {
              const prog = (y - (half - r * 0.8)) / (r * 1.6);
              if (prog > 0.58) grid[y][x] = accent;
              else if (prog > 0.42) grid[y][x] = this.mix(body, accent, 0.52);
            }
          }
        }
        break;
      }
    }
  }

  private drawFace(grid: (string | null)[][], size: number, eye: string, white: string, r: number): void {
    const half = size / 2;
    const eyeY = Math.floor(half - size * 0.16);
    const eyeOff = Math.floor(size * 0.22);
    const eyeSz = Math.max(1, Math.floor(size * 0.085));
    const positions = [[Math.floor(half - eyeOff), eyeY], [Math.floor(half + eyeOff - 1), eyeY]];
    for (const [ex, ey] of positions) {
      for (let dy = -eyeSz; dy <= eyeSz; dy++) for (let dx = -eyeSz; dx <= eyeSz; dx++) {
        if (dx * dx + dy * dy <= eyeSz * eyeSz + 0.5) {
          const px = ex + dx, py = ey + dy;
          if (px >= 0 && px < size && py >= 0 && py < size && grid[py][px]) grid[py][px] = white;
        }
      }
    }
    for (const [ex, ey] of positions) {
      for (let dy = 0; dy <= Math.max(0, eyeSz - 1); dy++) for (let dx = 0; dx <= Math.max(0, eyeSz - 1); dx++) {
        const px = ex + dx, py = ey + dy;
        if (px >= 0 && px < size && py >= 0 && py < size) grid[py][px] = eye;
      }
    }
    const mouthY = Math.floor(half + size * 0.11);
    const mouthW = Math.max(2, Math.floor(size * 0.13));
    const dark = this.shade(this.genes.bodyColor, -0.35);
    for (let x = -mouthW; x <= mouthW - 1; x++) {
      const px = Math.floor(half + x);
      if (px >= 0 && px < size) grid[mouthY][px] = dark;
    }
    void r;
  }

  private drawLimbs(grid: (string | null)[][], size: number, dark: string): void {
    const half = size / 2;
    const bodyBottom = Math.floor(half + size * 0.4);
    if (this.genes.limbCount >= 2) {
      const sp = size * 0.2;
      for (let i = 0; i < 2; i++) {
        const side = i === 0 ? -1 : 1;
        const lx = Math.floor(half + side * sp);
        const h = Math.max(2, Math.floor(size * 0.2));
        for (let hh = 0; hh < h; hh++) for (let w = -1; w <= 0; w++) {
          const px = lx + w, py = bodyBottom + hh;
          if (px >= 0 && px < size && py >= 0 && py < size) grid[py][px] = dark;
        }
      }
    }
    if (this.genes.limbCount >= 4) {
      for (let i = 0; i < 2; i++) {
        const side = i === 0 ? -1 : 1;
        const lx = Math.floor(half + side * size * 0.44);
        const ly = Math.floor(half - size * 0.1);
        const len = Math.max(2, Math.floor(size * 0.2));
        for (let l = 0; l < len; l++) for (let w = -1; w <= 0; w++) {
          const px = lx + side * l + w, py = ly;
          if (px >= 0 && px < size && py >= 0 && py < size) grid[py][px] = dark;
        }
      }
    }
    if (this.genes.limbCount >= 6) {
      const wingY = Math.floor(half - size * 0.28);
      for (let s = -1; s <= 1; s += 2) for (let dy = -1; dy <= 1; dy++) for (let dx = 0; dx < 3; dx++) {
        const px = Math.floor(half + s * (size * 0.36 + dx));
        const py = wingY + dy;
        if (px >= 0 && px < size && py >= 0 && py < size) grid[py][px] = this.genes.accentColor;
      }
    }
  }

  private shade(hex: string, pct: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * pct * 100);
    const R = Math.max(0, Math.min(255, (num >> 16) + amt));
    const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amt));
    const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt));
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  }

  private mix(c1: string, c2: string, ratio: number): string {
    const n1 = parseInt(c1.replace('#', ''), 16);
    const n2 = parseInt(c2.replace('#', ''), 16);
    const r = Math.floor(((n1 >> 16) * (1 - ratio) + (n2 >> 16) * ratio));
    const g = Math.floor((((n1 >> 8) & 0xFF) * (1 - ratio) + ((n2 >> 8) & 0xFF) * ratio));
    const b = Math.floor(((n1 & 0xFF) * (1 - ratio) + ((n2 & 0xFF) * ratio)));
    return '#' + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
  }

  public update(dt: number, boundsX: number, groundY: number, renderer: Renderer): void {
    this.bobTime += dt;
    this.moveTimer -= dt;
    this.phaseTimer -= dt;
    this.glowPulse += dt;

    if (this.phase !== 'idle' && this.phaseTimer <= 0) {
      if (this.phase === 'mutating') this.phase = 'idle';
      if (this.phase === 'evolving') {
        this.finalizeEvolution(renderer);
      }
    }

    if (this.phase === 'growing') {
      this.sizeGrowthProgress = Math.min(1, this.sizeGrowthProgress + dt / 450);
      this.displaySize = this.lerp(this.baseSize, this.targetSize, this.easeOutCubic(this.sizeGrowthProgress));
      if (this.sizeGrowthProgress >= 1) {
        this.baseSize = this.targetSize;
        this.displaySize = this.targetSize;
        this.phase = 'idle';
      }
    }

    if (this.phase === 'evolving' && !this.evolutionStormTriggered) {
      this.evolutionStormTriggered = true;
      const c = this.getCenter();
      renderer.triggerEvolutionStorm(c.x, c.y);
    }

    if (!this.isLocked()) {
      if (this.moveTimer <= 0) {
        this.moveTimer = 2200 + Math.random() * 3200;
        this.targetX = boundsX * (0.14 + Math.random() * 0.72);
      }
      const dx = this.targetX - this.x;
      if (Math.abs(dx) > 1.5) this.x += Math.sign(dx) * 0.28 * (dt / 16.67);
    }

    if (this.abilities.includes('flight')) {
      this.flightPhase += dt * 0.0028;
      this.flightOffset = this.size + Math.sin(this.flightPhase) * 10 + 14;
    }
    void groundY;
  }

  private easeOutCubic(t: number): number { return 1 - Math.pow(1 - t, 3); }
  private lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }

  public isLocked(): boolean {
    return this.phase === 'evolving';
  }

  public getDrawY(): number {
    if (this.abilities.includes('flight')) return this.y - this.flightOffset;
    return this.y;
  }

  public draw(renderer: Renderer): void {
    const bob = Math.sin(this.bobTime * 0.0038) * 2;
    const s = Math.round(this.displaySize);
    const drawX = Math.round(this.x - s / 2);
    const drawY = Math.round(this.getDrawY() - s / 2 + bob);

    if (this.phase === 'evolving') {
      const _t = this.phase ? 1 - Math.abs(this.phaseTimer / 2000 - 1) : 0;
      void _t;
      const fade = this.phaseTimer > 1000 ? 1 - (this.phaseTimer - 1000) / 1000 : this.phaseTimer / 1000;
      if (fade > 0.05) this.drawMorphing(renderer, drawX, drawY, s, Math.max(0.1, fade));
    } else {
      this.renderScaledGrid(renderer, drawX, drawY, s);
      if (this.phase === 'mutating') this.drawMutationFlash(renderer, drawX, drawY, s);
    }

    if (this.abilities.includes('flight') && !this.isLocked() && Math.random() < 0.45) {
      renderer.addTrailParticles(this.x + (Math.random() - 0.5) * this.size * 0.3, this.getDrawY() + this.size * 0.35);
    }
    if (this.abilities.includes('glow') && !this.isLocked()) {
      renderer.addGlowParticles(this.x, this.getDrawY(), this.size * (0.85 + Math.sin(this.glowPulse * 0.003) * 0.1));
    }
  }

  private renderScaledGrid(renderer: Renderer, drawX: number, drawY: number, s: number): void {
    const gridSize = this.pixelGrid.length;
    if (s === gridSize) {
      renderer.drawPixelGrid(this.pixelGrid, drawX, drawY, 1);
      return;
    }
    const scale = s / gridSize;
    const ctx = renderer.getContext();
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const c = this.pixelGrid[y][x];
        if (c) {
          ctx.fillStyle = c;
          ctx.fillRect(
            Math.floor(drawX + x * scale),
            Math.floor(drawY + y * scale),
            Math.ceil(scale),
            Math.ceil(scale)
          );
        }
      }
    }
  }

  private drawMorphing(renderer: Renderer, drawX: number, drawY: number, s: number, alpha: number): void {
    const ctx = renderer.getContext();
    ctx.save();
    ctx.globalAlpha = alpha;
    this.renderScaledGrid(renderer, drawX, drawY, s);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  private drawMutationFlash(renderer: Renderer, x: number, y: number, s: number): void {
    const ctx = renderer.getContext();
    const phase = Math.abs(Math.sin(this.phaseTimer * 0.045));
    ctx.save();
    ctx.globalAlpha = 0.35 * phase;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(Math.floor(x - 3), Math.floor(y - 3), s + 6, s + 6);
    ctx.restore();
  }

  public feed(renderer: Renderer): void {
    this.satiety = Math.min(100, this.satiety + 20);
    this.feedCount++;
    this.mutateGenes();

    this.targetSize = Math.min(64, this.size + 2);
    this.baseSize = this.size;
    this.sizeGrowthProgress = 0;
    this.phase = 'growing';
    this.phaseTimer = 500;

    this.rebuildPixelGrid();
    setTimeout(() => {
      this.phase = 'mutating';
      this.phaseTimer = 300;
      const c = this.getCenter();
      renderer.addMutationParticles(c.x, c.y);
    }, 450);
  }

  private mutateGenes(): void {
    const roll = Math.random();
    if (roll < 0.22) {
      const modes: Genes['patternMode'][] = ['dots', 'stripes', 'spots', 'gradient'];
      const available = modes.filter(m => m !== this.genes.patternMode);
      this.genes.patternMode = available[Math.floor(Math.random() * available.length)];
    } else if (roll < 0.48) {
      this.genes.bodyColor = this.shade(this.genes.bodyColor, (Math.random() - 0.5) * 22);
    } else if (roll < 0.72) {
      this.genes.accentColor = this.shade(this.genes.accentColor, (Math.random() - 0.5) * 26);
    } else {
      const delta = Math.random() > 0.5 ? 1 : -1;
      const newLimbs = Math.min(6, Math.max(2, this.genes.limbCount + delta));
      if (newLimbs !== this.genes.limbCount) this.genes.limbCount = newLimbs;
    }
  }

  public decreaseSatiety(dt: number): void {
    this.satiety = Math.max(0, this.satiety - (dt / 30000) * 10);
  }

  public tryEvolve(renderer: Renderer): boolean {
    if (this.feedCount >= 5 && this.phase === 'idle') {
      this.phase = 'evolving';
      this.phaseTimer = 2000;
      this.evolutionStormTriggered = false;
      void renderer;
      return true;
    }
    return false;
  }

  private finalizeEvolution(renderer: Renderer): void {
    this.evolutionLevel++;
    this.feedCount = 0;
    const abilityMsg = this.unlockAbility();
    this.genes.bodySize *= 1.22;

    this.targetSize = Math.min(72, this.targetSize + 16);
    this.baseSize = this.displaySize;
    this.sizeGrowthProgress = 0;
    this.rebuildPixelGrid();

    this.phase = 'growing';
    this.phaseTimer = 600;

    if (abilityMsg) {
      const notif = document.getElementById('evolution-notification');
      if (notif) {
        notif.textContent = abilityMsg;
        notif.classList.remove('hide');
        notif.classList.add('show');
        setTimeout(() => {
          notif.classList.remove('show');
          notif.classList.add('hide');
          setTimeout(() => { notif.classList.remove('hide'); }, 500);
        }, 3200);
      }
    }
    void renderer;
  }

  private unlockAbility(): string | null {
    const allAbilities: AbilityType[] = ['flight', 'glow', 'weather_control'];
    const available = allAbilities.filter(a => !this.abilities.includes(a));
    if (available.length === 0) {
      this.satiety = Math.min(100, this.satiety + 30);
      return `🎉 进化到 Lv.${this.evolutionLevel}！饱食度+30`;
    }
    const pick = available[Math.floor(Math.random() * available.length)];
    this.abilities.push(pick);
    const abilityNames: Record<AbilityType, string> = {
      flight: '✨ 飞行拖尾',
      glow: '🌟 发光光晕',
      weather_control: '🌦️ 气候控制'
    };
    return `🎉 进化到 Lv.${this.evolutionLevel}！解锁：${abilityNames[pick]}`;
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
    return this.displaySize * 0.6;
  }
}
