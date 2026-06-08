export type TerrainType = 'spring' | 'bouncer' | 'portal';

export interface Terrain {
  id: number;
  type: TerrainType;
  x: number;
  y: number;
  width: number;
  height: number;
  portalPairId?: number;
  flashTimer?: number;
  particles?: Particle[];
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  radius: number;
  color: string;
}

const GRID_SIZE = 40;
const GRID_COLOR = '#3D4A5C';
const HIGHLIGHT_COLOR = '#F6E05E';

export class TerrainManager {
  terrains: Terrain[] = [];
  selectedType: TerrainType | null = null;
  draggingTerrain: Terrain | null = null;
  dragOffsetX = 0;
  dragOffsetY = 0;
  highlightedTerrainId: number | null = null;
  private nextId = 1;
  private portalPairCounter = 0;
  private pendingPortal: Terrain | null = null;
  private canvasWidth: number;
  private canvasHeight: number;

  onChange: (() => void) | null = null;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  setCanvasSize(w: number, h: number) {
    this.canvasWidth = w;
    this.canvasHeight = h;
  }

  snapToGrid(value: number): number {
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
  }

  addTerrain(type: TerrainType, x: number, y: number): Terrain | null {
    const snappedX = this.snapToGrid(x);
    const snappedY = this.snapToGrid(y);

    let width = 40, height = 40;
    if (type === 'bouncer') { width = 80; height = 20; }
    if (type === 'spring') { width = 50; height = 15; }
    if (type === 'portal') { width = 30; height = 50; }

    const terrain: Terrain = {
      id: this.nextId++,
      type,
      x: snappedX - width / 2,
      y: snappedY - height / 2,
      width,
      height
    };

    if (type === 'portal') {
      if (this.pendingPortal) {
        this.portalPairCounter++;
        terrain.portalPairId = this.portalPairCounter;
        this.pendingPortal.portalPairId = this.portalPairCounter;
        this.pendingPortal = null;
      } else {
        this.pendingPortal = terrain;
      }
    }

    this.terrains.push(terrain);
    this.onChange?.();
    return terrain;
  }

  removeTerrain(id: number) {
    const idx = this.terrains.findIndex(t => t.id === id);
    if (idx === -1) return;
    const t = this.terrains[idx];
    if (t.type === 'portal' && t.portalPairId) {
      const pair = this.terrains.find(o => o.type === 'portal' && o.portalPairId === t.portalPairId && o.id !== id);
      if (pair === this.pendingPortal) this.pendingPortal = null;
      if (pair) {
        this.terrains = this.terrains.filter(x => x.id !== pair.id);
      }
    }
    this.terrains = this.terrains.filter(x => x.id !== id);
    this.onChange?.();
  }

  getTerrainAt(x: number, y: number): Terrain | null {
    for (let i = this.terrains.length - 1; i >= 0; i--) {
      const t = this.terrains[i];
      if (x >= t.x && x <= t.x + t.width && y >= t.y && y <= t.y + t.height) {
        return t;
      }
    }
    return null;
  }

  startDrag(x: number, y: number): boolean {
    const terrain = this.getTerrainAt(x, y);
    if (terrain) {
      this.draggingTerrain = terrain;
      this.dragOffsetX = x - terrain.x;
      this.dragOffsetY = y - terrain.y;
      return true;
    }
    return false;
  }

  updateDrag(x: number, y: number) {
    if (!this.draggingTerrain) return;
    this.draggingTerrain.x = this.snapToGrid(x - this.dragOffsetX);
    this.draggingTerrain.y = this.snapToGrid(y - this.dragOffsetY);
    this.onChange?.();
  }

  endDrag() {
    this.draggingTerrain = null;
  }

  handleCanvasClick(x: number, y: number) {
    if (!this.selectedType) return;
    if (this.getTerrainAt(x, y)) return;
    this.addTerrain(this.selectedType, x, y);
  }

  reset() {
    this.terrains = [];
    this.pendingPortal = null;
    this.portalPairCounter = 0;
    this.nextId = 1;
    this.selectedType = null;
    this.draggingTerrain = null;
    this.highlightedTerrainId = null;
    this.onChange?.();
  }

  triggerSpringFlash(terrain: Terrain) {
    terrain.flashTimer = 0.15;
  }

  spawnBouncerParticles(terrain: Terrain) {
    const particles: Particle[] = [];
    for (let i = 0; i < 3; i++) {
      particles.push({
        x: terrain.x + terrain.width / 2 + (i - 1) * 15,
        y: terrain.y,
        vx: (Math.random() - 0.5) * 1,
        vy: -1.5 - Math.random(),
        life: 0.5,
        maxLife: 0.5,
        radius: 2 + Math.random() * 2,
        color: '#48BB78'
      });
    }
    terrain.particles = terrain.particles ? [...terrain.particles, ...particles] : particles;
  }

  updateParticles(dt: number) {
    for (const t of this.terrains) {
      if (t.flashTimer !== undefined && t.flashTimer > 0) {
        t.flashTimer -= dt;
      }
      if (t.particles) {
        for (const p of t.particles) {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.05;
          p.life -= dt;
        }
        t.particles = t.particles.filter(p => p.life > 0);
        if (t.particles.length === 0) t.particles = undefined;
      }
    }
  }

  drawGrid(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;
    for (let x = 0; x <= this.canvasWidth; x += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.canvasHeight);
      ctx.stroke();
    }
    for (let y = 0; y <= this.canvasHeight; y += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.canvasWidth, y);
      ctx.stroke();
    }
  }

  drawTerrains(ctx: CanvasRenderingContext2D) {
    for (const t of this.terrains) {
      this.drawTerrain(ctx, t);
    }
    if (this.draggingTerrain) {
      ctx.save();
      ctx.strokeStyle = 'rgba(99, 179, 237, 0.7)';
      ctx.fillStyle = 'rgba(99, 179, 237, 0.15)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.fillRect(this.draggingTerrain.x, this.draggingTerrain.y, this.draggingTerrain.width, this.draggingTerrain.height);
      ctx.strokeRect(this.draggingTerrain.x, this.draggingTerrain.y, this.draggingTerrain.width, this.draggingTerrain.height);
      ctx.restore();
    }
  }

  drawTerrain(ctx: CanvasRenderingContext2D, t: Terrain) {
    ctx.save();

    if (this.highlightedTerrainId === t.id) {
      ctx.shadowColor = HIGHLIGHT_COLOR;
      ctx.shadowBlur = 10;
    }

    if (t.type === 'spring') {
      const flash = t.flashTimer && t.flashTimer > 0;
      ctx.fillStyle = flash ? '#FFFFFF' : '#48BB78';
      if (flash) {
        ctx.shadowColor = '#FFFFFF';
        ctx.shadowBlur = 15;
      }
      const radius = 6;
      this.roundRect(ctx, t.x, t.y, t.width, t.height, radius);
      ctx.fill();
      ctx.fillStyle = flash ? '#48BB78' : '#2F855A';
      ctx.fillRect(t.x + 5, t.y + t.height - 3, t.width - 10, 3);
    } else if (t.type === 'bouncer') {
      ctx.fillStyle = '#ED8936';
      this.roundRect(ctx, t.x, t.y, t.width, t.height, 4);
      ctx.fill();
      ctx.fillStyle = '#C05621';
      ctx.fillRect(t.x, t.y + t.height - 4, t.width, 4);
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = '#F6AD55';
        ctx.fillRect(t.x + 5 + i * 15, t.y + 3, 8, 2);
      }
      if (t.particles) {
        for (const p of t.particles) {
          ctx.globalAlpha = p.life / p.maxLife;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    } else if (t.type === 'portal') {
      const grd = ctx.createRadialGradient(
        t.x + t.width / 2, t.y + t.height / 2, 5,
        t.x + t.width / 2, t.y + t.height / 2, t.width
      );
      grd.addColorStop(0, '#D6BCFA');
      grd.addColorStop(0.5, '#9F7AEA');
      grd.addColorStop(1, '#553C9A');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.ellipse(t.x + t.width / 2, t.y + t.height / 2, t.width / 2, t.height / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      if (t.portalPairId) {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(t.portalPairId), t.x + t.width / 2, t.y + t.height / 2);
      }
    }

    ctx.restore();
  }

  roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
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

export { GRID_SIZE };
