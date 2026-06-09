import { Tile, Point, HSL } from './tile';

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  progress: number;
  duration: number;
  hue: number;
  affectedTiles: Set<number>;
}

export interface PatternParams {
  rotationSpeed: number;
  colorCycleSpeed: number;
  deformationIntensity: number;
}

const COLOR_CYCLE_PERIOD = 8;
const RIPPLE_DURATION = 1.2;
const BASE_TILE_SIZE = 48;

export class Pattern {
  tiles: Tile[];
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  tileSize: number;
  baseHeight: number;

  globalRotation: number;
  colorPhase: number;
  time: number;

  params: PatternParams;
  ripples: Ripple[];

  hoveredTileIndex: number | null;
  dirty: boolean;
  flashOverlay: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.centerX = width / 2;
    this.centerY = height / 2;
    this.tileSize = BASE_TILE_SIZE;
    this.baseHeight = this.tileSize * 0.6;

    this.globalRotation = 0;
    this.colorPhase = 0;
    this.time = 0;

    this.params = {
      rotationSpeed: 1,
      colorCycleSpeed: 1,
      deformationIntensity: 1.0,
    };

    this.tiles = [];
    this.ripples = [];
    this.hoveredTileIndex = null;
    this.dirty = true;
    this.flashOverlay = 0;

    this.generateGrid();
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.centerX = width / 2;
    this.centerY = height / 2;
    this.generateGrid();
    this.dirty = true;
  }

  private generateGrid(): void {
    this.tiles = [];

    const size = this.tileSize;
    const h = size * Math.sqrt(3) / 2;
    const rowHeight = h;
    const colWidth = size * 1.5;

    const cols = Math.ceil(this.width / colWidth) + 4;
    const rows = Math.ceil(this.height / rowHeight) + 4;

    const offsetX = this.centerX - (cols * colWidth) / 2;
    const offsetY = this.centerY - (rows * rowHeight) / 2;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = offsetX + col * colWidth;
        const y = offsetY + row * rowHeight;
        const rowOffset = (row % 2) * (colWidth / 2);

        const p1: Point = { x: x + rowOffset, y: y };
        const p2: Point = { x: x + rowOffset + size, y: y };
        const p3up: Point = { x: x + rowOffset + size / 2, y: y - h };
        const p3down: Point = { x: x + rowOffset + size / 2, y: y + h };

        const colorIdx = (row * cols + col) * 13.7;
        const baseHue = (colorIdx * 23) % 360;

        const tileUp = new Tile(
          [p1, p2, p3up],
          this.getColorAtPhase(baseHue, 0)
        );
        const tileDown = new Tile(
          [p1, p3down, p2],
          this.getColorAtPhase(baseHue + 60, 0)
        );

        tileUp.setHeightMultiplier(this.params.deformationIntensity);
        tileDown.setHeightMultiplier(this.params.deformationIntensity);

        this.tiles.push(tileUp, tileDown);
      }
    }
  }

  private getColorAtPhase(baseHue: number, phase: number): HSL {
    const hue = (baseHue + phase * 360) % 360;
    const warmth = Math.sin(phase * Math.PI * 2) * 0.5 + 0.5;
    const saturation = 65 + warmth * 15;
    const lightness = 42 + (1 - warmth) * 8;

    return { h: hue, s: saturation, l: lightness };
  }

  setParams(params: Partial<PatternParams>): void {
    if (params.rotationSpeed !== undefined) {
      this.params.rotationSpeed = params.rotationSpeed;
    }
    if (params.colorCycleSpeed !== undefined) {
      this.params.colorCycleSpeed = params.colorCycleSpeed;
    }
    if (params.deformationIntensity !== undefined) {
      this.params.deformationIntensity = params.deformationIntensity;
      for (const tile of this.tiles) {
        tile.setHeightMultiplier(params.deformationIntensity);
      }
    }
    this.dirty = true;
  }

  resetToDefaults(): void {
    this.params = {
      rotationSpeed: 1,
      colorCycleSpeed: 1,
      deformationIntensity: 1.0,
    };
    for (const tile of this.tiles) {
      tile.setHeightMultiplier(1.0);
    }
    this.flashOverlay = 1;
    this.dirty = true;
  }

  handleMouseMove(x: number, y: number): void {
    const local = this.screenToLocal(x, y);
    const newHovered = this.findTileAt(local.x, local.y);

    if (newHovered !== this.hoveredTileIndex) {
      if (this.hoveredTileIndex !== null) {
        this.tiles[this.hoveredTileIndex].hover(false);
      }
      if (newHovered !== null) {
        this.tiles[newHovered].hover(true);
      }
      this.hoveredTileIndex = newHovered;
      this.dirty = true;
    }
  }

  handleClick(x: number, y: number): void {
    const local = this.screenToLocal(x, y);
    const tileIdx = this.findTileAt(local.x, local.y);

    if (tileIdx !== null && this.tiles[tileIdx].currentBump > 0.3) {
      const tile = this.tiles[tileIdx];
      this.ripples.push({
        x: tile.center.x,
        y: tile.center.y,
        radius: 0,
        maxRadius: Math.max(this.width, this.height),
        progress: 0,
        duration: RIPPLE_DURATION,
        hue: tile.currentColor.h,
        affectedTiles: new Set<number>(),
      });
      this.dirty = true;
    }
  }

  private screenToLocal(x: number, y: number): Point {
    const dx = x - this.centerX;
    const dy = y - this.centerY;
    const cos = Math.cos(-this.globalRotation);
    const sin = Math.sin(-this.globalRotation);
    return {
      x: this.centerX + dx * cos - dy * sin,
      y: this.centerY + dx * sin + dy * cos,
    };
  }

  private findTileAt(x: number, y: number): number | null {
    for (let i = 0; i < this.tiles.length; i++) {
      if (this.tiles[i].containsPoint(x, y)) {
        return i;
      }
    }
    return null;
  }

  private getNeighbors(tileIndex: number): number[] {
    const tile = this.tiles[tileIndex];
    const neighbors: number[] = [];
    const threshold = this.tileSize * 1.2;
    const thresholdSq = threshold * threshold;

    for (let i = 0; i < this.tiles.length; i++) {
      if (i === tileIndex) continue;
      const other = this.tiles[i];
      const dx = other.center.x - tile.center.x;
      const dy = other.center.y - tile.center.y;
      if (dx * dx + dy * dy < thresholdSq) {
        neighbors.push(i);
      }
    }
    return neighbors;
  }

  update(deltaTime: number): boolean {
    this.time += deltaTime;

    const rotationDelta = deltaTime * 0.15 * this.params.rotationSpeed;
    if (Math.abs(rotationDelta) > 0.0001) {
      this.globalRotation += rotationDelta;
      this.dirty = true;
    }

    const colorDelta = (deltaTime / COLOR_CYCLE_PERIOD) * this.params.colorCycleSpeed;
    if (Math.abs(colorDelta) > 0.00001) {
      this.colorPhase = (this.colorPhase + colorDelta) % 1;
      this.updateTileColors();
      this.dirty = true;
    }

    let tilesChanged = false;
    for (const tile of this.tiles) {
      if (tile.update(deltaTime)) {
        tilesChanged = true;
      }
    }
    if (tilesChanged) this.dirty = true;

    if (this.ripples.length > 0) {
      this.updateRipples(deltaTime);
      this.dirty = true;
    }

    if (this.flashOverlay > 0) {
      this.flashOverlay = Math.max(0, this.flashOverlay - deltaTime * 2);
      this.dirty = true;
    }

    const shouldRender = this.dirty;
    this.dirty = false;
    return shouldRender;
  }

  private updateTileColors(): void {
    for (let i = 0; i < this.tiles.length; i++) {
      const baseHue = ((i * 17.3) % 360);
      this.tiles[i].setBaseColor(this.getColorAtPhase(baseHue, this.colorPhase));
    }
  }

  private updateRipples(deltaTime: number): void {
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const ripple = this.ripples[i];
      ripple.progress += deltaTime / ripple.duration;

      if (ripple.progress >= 1) {
        this.ripples.splice(i, 1);
        continue;
      }

      const t = ripple.progress;
      ripple.radius = ripple.maxRadius * (0.05 + t * 0.95);

      const waveWidth = this.tileSize * 2.5;
      for (let j = 0; j < this.tiles.length; j++) {
        if (ripple.affectedTiles.has(j)) continue;

        const tile = this.tiles[j];
        const dx = tile.center.x - ripple.x;
        const dy = tile.center.y - ripple.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (Math.abs(dist - ripple.radius) < waveWidth) {
          tile.triggerRippleTint();
          ripple.affectedTiles.add(j);
        }
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.clearRect(0, 0, this.width, this.height);

    for (let i = 0; i < this.tiles.length; i++) {
      const tile = this.tiles[i];
      if (tile.currentBump > 0.01) {
        const neighbors = this.getNeighbors(i);
        for (const nIdx of neighbors) {
          tile.drawShadow(
            ctx,
            this.baseHeight,
            this.globalRotation,
            this.tiles[nIdx].center
          );
        }
      }
    }

    for (const tile of this.tiles) {
      tile.draw(ctx, this.baseHeight, this.globalRotation);
    }

    this.drawRipples(ctx);

    if (this.flashOverlay > 0) {
      ctx.fillStyle = `rgba(200, 220, 255, ${this.flashOverlay * 0.15})`;
      ctx.fillRect(0, 0, this.width, this.height);
    }
  }

  private drawRipples(ctx: CanvasRenderingContext2D): void {
    for (const ripple of this.ripples) {
      const t = ripple.progress;
      const alpha = Math.sin(t * Math.PI) * 0.6;
      const width = 4 + t * 8;

      ctx.save();
      ctx.translate(this.centerX, this.centerY);
      ctx.rotate(this.globalRotation);
      ctx.translate(-this.centerX, -this.centerY);

      const gradient = ctx.createRadialGradient(
        ripple.x, ripple.y, Math.max(0, ripple.radius - width * 2),
        ripple.x, ripple.y, ripple.radius + width
      );

      const h = ripple.hue;
      gradient.addColorStop(0, `hsla(${h}, 90%, 65%, 0)`);
      gradient.addColorStop(0.5, `hsla(${(h + 60) % 360}, 95%, 70%, ${alpha})`);
      gradient.addColorStop(1, `hsla(${(h + 120) % 360}, 90%, 65%, 0)`);

      ctx.strokeStyle = gradient;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }
  }
}
