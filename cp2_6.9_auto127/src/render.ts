import { DungeonMap, TILE_SIZE, MAP_COLS, MAP_ROWS, TILE } from './map';
import { Player } from './player';

const COLOR_WALL = '#3A3A3A';
const COLOR_FLOOR = '#7A7A7A';
const COLOR_EXIT = '#00FF00';
const COLOR_ENTRANCE = '#4466AA';
const COLOR_GEM = '#FFD700';
const COLOR_PLAYER = '#FFFFFF';

const RAY_COUNT = 48;
const LIGHT_OFFSET_DEG = 15;
const LIGHT_OFFSET_RAD = (LIGHT_OFFSET_DEG * Math.PI) / 180;

interface VisibleTile {
  x: number;
  y: number;
  brightness: number;
  minDist: number;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private minimapCtx: CanvasRenderingContext2D;
  private visibleTiles: Map<string, VisibleTile> = new Map();
  private gemBlinkPhase: number = 0;
  private exitBlinkPhase: number = 0;

  constructor(ctx: CanvasRenderingContext2D, minimapCtx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.minimapCtx = minimapCtx;
  }

  public update(time: number): void {
    this.gemBlinkPhase = (time / 500) % (Math.PI * 2);
    this.exitBlinkPhase = (time / 400) % (Math.PI * 2);
  }

  public render(map: DungeonMap, player: Player): void {
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

    this.calculateVisibility(map, player);
    this.drawTiles(map, player);
    this.drawGems(map);
    this.drawExit(map);
    this.drawLightGlow(player);
    this.drawPlayer(player);
  }

  private calculateVisibility(map: DungeonMap, player: Player): void {
    this.visibleTiles.clear();

    const lightRadius = player.getLightRadius();
    const dirAngle = player.getDirectionAngle() + LIGHT_OFFSET_RAD;
    const offsetX = Math.cos(dirAngle) * 3;
    const offsetY = Math.sin(dirAngle) * 3;

    const lightOriginX = player.pixelX + offsetX;
    const lightOriginY = player.pixelY + offsetY;

    for (let i = 0; i < RAY_COUNT; i++) {
      const angle = (i / RAY_COUNT) * Math.PI * 2;
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);

      let dist = 0;
      const stepSize = 2;
      const maxDist = lightRadius * 1.5;

      while (dist < maxDist) {
        const px = lightOriginX + dx * dist;
        const py = lightOriginY + dy * dist;

        const tileX = Math.floor(px / TILE_SIZE);
        const tileY = Math.floor(py / TILE_SIZE);

        if (tileX < 0 || tileX >= MAP_COLS || tileY < 0 || tileY >= MAP_ROWS) break;

        const normalizedDist = Math.min(dist / lightRadius, 1);
        const brightness = 1 - normalizedDist;

        const key = `${tileX},${tileY}`;
        const existing = this.visibleTiles.get(key);
        if (!existing || dist < existing.minDist) {
          this.visibleTiles.set(key, {
            x: tileX,
            y: tileY,
            brightness: Math.max(existing?.brightness || 0, brightness),
            minDist: dist
          });
        }

        if (map.isWall(tileX, tileY)) break;

        dist += stepSize;
      }
    }
  }

  private drawTiles(map: DungeonMap, player: Player): void {
    const lightRadius = player.getLightRadius();
    const dirAngle = player.getDirectionAngle() + LIGHT_OFFSET_RAD;
    const offsetX = Math.cos(dirAngle) * 3;
    const offsetY = Math.sin(dirAngle) * 3;

    const lightOriginX = player.pixelX + offsetX;
    const lightOriginY = player.pixelY + offsetY;

    this.visibleTiles.forEach((tile) => {
      if (tile.brightness <= 0) return;

      const px = tile.x * TILE_SIZE;
      const py = tile.y * TILE_SIZE;
      const tileCenterX = px + TILE_SIZE / 2;
      const tileCenterY = py + TILE_SIZE / 2;

      const dist = Math.sqrt(
        Math.pow(tileCenterX - lightOriginX, 2) +
        Math.pow(tileCenterY - lightOriginY, 2)
      );
      const normalizedDist = Math.min(dist / lightRadius, 1);
      const brightness = Math.max(0, 1 - normalizedDist);

      let baseColor = COLOR_FLOOR;
      if (map.tiles[tile.y][tile.x] === TILE.WALL) {
        baseColor = COLOR_WALL;
      } else if (map.tiles[tile.y][tile.x] === TILE.ENTRANCE) {
        baseColor = COLOR_ENTRANCE;
      }

      const rgb = this.hexToRgb(baseColor);
      const r = Math.floor(rgb.r * brightness);
      const g = Math.floor(rgb.g * brightness);
      const b = Math.floor(rgb.b * brightness);

      this.ctx.fillStyle = `rgb(${r},${g},${b})`;
      this.ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

      if (map.tiles[tile.y][tile.x] === TILE.WALL && brightness > 0.1) {
        this.ctx.strokeStyle = `rgba(100,100,100,${brightness * 0.3})`;
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(px + 0.5, py + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
      }
    });
  }

  private drawGems(map: DungeonMap): void {
    const blink = 0.5 + 0.5 * Math.sin(this.gemBlinkPhase);

    for (const gem of map.gems) {
      if (gem.collected) continue;

      const key = `${gem.x},${gem.y}`;
      const tile = this.visibleTiles.get(key);
      if (!tile || tile.brightness <= 0.05) continue;

      const px = gem.x * TILE_SIZE + TILE_SIZE / 2;
      const py = gem.y * TILE_SIZE + TILE_SIZE / 2;
      const size = 7 + blink * 2;

      const brightness = tile.brightness;

      this.ctx.save();
      this.ctx.translate(px, py);

      const gemGlow = this.ctx.createRadialGradient(0, 0, 0, 0, 0, size * 2.5);
      gemGlow.addColorStop(0, `rgba(255, 215, 0, ${0.5 * brightness * blink})`);
      gemGlow.addColorStop(1, 'rgba(255, 215, 0, 0)');
      this.ctx.fillStyle = gemGlow;
      this.ctx.fillRect(-size * 2.5, -size * 2.5, size * 5, size * 5);

      this.ctx.beginPath();
      this.ctx.moveTo(0, -size);
      this.ctx.lineTo(size, 0);
      this.ctx.lineTo(0, size);
      this.ctx.lineTo(-size, 0);
      this.ctx.closePath();

      const r = Math.floor(255 * brightness);
      const g = Math.floor(215 * brightness);
      const b = Math.floor(0 * brightness);
      this.ctx.fillStyle = `rgb(${r},${g},${b})`;
      this.ctx.fill();

      this.ctx.beginPath();
      this.ctx.moveTo(0, -size);
      this.ctx.lineTo(size * 0.3, -size * 0.3);
      this.ctx.lineTo(-size * 0.3, -size * 0.3);
      this.ctx.closePath();
      this.ctx.fillStyle = `rgba(255, 255, 200, ${brightness})`;
      this.ctx.fill();

      this.ctx.restore();
    }
  }

  private drawExit(map: DungeonMap): void {
    const key = `${map.exit.x},${map.exit.y}`;
    const tile = this.visibleTiles.get(key);
    if (!tile) return;

    const blink = 0.4 + 0.6 * Math.sin(this.exitBlinkPhase);
    const px = map.exit.x * TILE_SIZE;
    const py = map.exit.y * TILE_SIZE;
    const brightness = tile.brightness;

    const baseR = Math.floor(0 * brightness);
    const baseG = Math.floor(255 * brightness * blink);
    const baseB = Math.floor(0 * brightness);
    this.ctx.fillStyle = `rgb(${baseR},${baseG},${baseB})`;
    this.ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

    this.ctx.strokeStyle = `rgba(100, 255, 100, ${brightness * blink})`;
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(px + 3, py + 3, TILE_SIZE - 6, TILE_SIZE - 6);

    this.ctx.fillStyle = `rgba(200, 255, 200, ${brightness * blink})`;
    this.ctx.font = 'bold 14px Courier New';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('出', px + TILE_SIZE / 2, py + TILE_SIZE / 2);
  }

  private drawLightGlow(player: Player): void {
    const radius = player.getLightRadius();
    const dirAngle = player.getDirectionAngle() + LIGHT_OFFSET_RAD;
    const offsetX = Math.cos(dirAngle) * 3;
    const offsetY = Math.sin(dirAngle) * 3;

    const px = player.pixelX + offsetX;
    const py = player.pixelY + offsetY;

    const glow = this.ctx.createRadialGradient(px, py, 0, px, py, radius);
    glow.addColorStop(0, 'rgba(255, 215, 0, 0.25)');
    glow.addColorStop(0.3, 'rgba(255, 200, 50, 0.12)');
    glow.addColorStop(0.6, 'rgba(255, 150, 0, 0.05)');
    glow.addColorStop(1, 'rgba(255, 100, 0, 0)');

    this.ctx.fillStyle = glow;
    this.ctx.beginPath();
    this.ctx.arc(px, py, radius, 0, Math.PI * 2);
    this.ctx.fill();

    const innerGlow = this.ctx.createRadialGradient(px, py, 0, px, py, radius * 0.3);
    innerGlow.addColorStop(0, 'rgba(255, 255, 200, 0.4)');
    innerGlow.addColorStop(1, 'rgba(255, 200, 100, 0)');

    this.ctx.fillStyle = innerGlow;
    this.ctx.beginPath();
    this.ctx.arc(px, py, radius * 0.3, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawPlayer(player: Player): void {
    const px = player.pixelX;
    const py = player.pixelY;

    const playerGlow = this.ctx.createRadialGradient(px, py, 0, px, py, 12);
    playerGlow.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
    playerGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
    this.ctx.fillStyle = playerGlow;
    this.ctx.beginPath();
    this.ctx.arc(px, py, 12, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = COLOR_PLAYER;
    this.ctx.beginPath();
    this.ctx.arc(px, py, 7, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#333';
    this.ctx.beginPath();
    this.ctx.arc(px, py, 5, 0, Math.PI * 2);
    this.ctx.fill();

    const dirAngle = player.getDirectionAngle();
    const eyeOffsetX = Math.cos(dirAngle) * 2;
    const eyeOffsetY = Math.sin(dirAngle) * 2;
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.beginPath();
    this.ctx.arc(px + eyeOffsetX, py + eyeOffsetY, 1.5, 0, Math.PI * 2);
    this.ctx.fill();

    const torchAngle = player.getDirectionAngle() + LIGHT_OFFSET_RAD;
    const torchX = px + Math.cos(torchAngle) * 9;
    const torchY = py + Math.sin(torchAngle) * 9;

    const torchFlicker = 0.8 + 0.2 * Math.sin(Date.now() / 50);
    const torchGlow = this.ctx.createRadialGradient(torchX, torchY, 0, torchX, torchY, 8 * torchFlicker);
    torchGlow.addColorStop(0, 'rgba(255, 220, 100, 0.9)');
    torchGlow.addColorStop(0.5, 'rgba(255, 150, 0, 0.5)');
    torchGlow.addColorStop(1, 'rgba(255, 100, 0, 0)');
    this.ctx.fillStyle = torchGlow;
    this.ctx.beginPath();
    this.ctx.arc(torchX, torchY, 8 * torchFlicker, 0, Math.PI * 2);
    this.ctx.fill();
  }

  public drawMinimap(map: DungeonMap, player: Player): void {
    const w = this.minimapCtx.canvas.width;
    const h = this.minimapCtx.canvas.height;
    const cellW = w / MAP_COLS;
    const cellH = h / MAP_ROWS;

    this.minimapCtx.fillStyle = '#000';
    this.minimapCtx.fillRect(0, 0, w, h);

    for (let y = 0; y < MAP_ROWS; y++) {
      for (let x = 0; x < MAP_COLS; x++) {
        if (!map.explored[y][x]) continue;

        const px = x * cellW;
        const py = y * cellH;

        if (map.tiles[y][x] === TILE.WALL) {
          this.minimapCtx.fillStyle = '#222';
        } else if (map.tiles[y][x] === TILE.EXIT) {
          this.minimapCtx.fillStyle = '#00FF00';
        } else if (map.tiles[y][x] === TILE.ENTRANCE) {
          this.minimapCtx.fillStyle = '#4466AA';
        } else {
          this.minimapCtx.fillStyle = '#555';
        }
        this.minimapCtx.fillRect(px, py, cellW + 0.5, cellH + 0.5);
      }
    }

    for (const gem of map.gems) {
      if (gem.collected) continue;
      if (!map.explored[gem.y][gem.x]) continue;

      const px = gem.x * cellW + cellW / 2;
      const py = gem.y * cellH + cellH / 2;
      this.minimapCtx.fillStyle = '#FFD700';
      this.minimapCtx.beginPath();
      this.minimapCtx.arc(px, py, Math.min(cellW, cellH) * 0.35, 0, Math.PI * 2);
      this.minimapCtx.fill();
    }

    if (map.explored[map.exit.y][map.exit.x]) {
      const px = map.exit.x * cellW;
      const py = map.exit.y * cellH;
      this.minimapCtx.fillStyle = '#00FF00';
      this.minimapCtx.fillRect(px + 1, py + 1, cellW - 2, cellH - 2);
    }

    const playerPx = player.x * cellW + cellW / 2;
    const playerPy = player.y * cellH + cellH / 2;
    const dirAngle = player.getDirectionAngle();

    this.minimapCtx.save();
    this.minimapCtx.translate(playerPx, playerPy);
    this.minimapCtx.rotate(dirAngle + Math.PI / 2);

    this.minimapCtx.fillStyle = '#4488FF';
    this.minimapCtx.beginPath();
    const triSize = Math.min(cellW, cellH) * 1.1;
    this.minimapCtx.moveTo(0, -triSize);
    this.minimapCtx.lineTo(triSize * 0.7, triSize * 0.6);
    this.minimapCtx.lineTo(-triSize * 0.7, triSize * 0.6);
    this.minimapCtx.closePath();
    this.minimapCtx.fill();

    this.minimapCtx.strokeStyle = '#AADDFF';
    this.minimapCtx.lineWidth = 1;
    this.minimapCtx.stroke();

    this.minimapCtx.restore();
  }

  public playVictoryAnimation(
    map: DungeonMap,
    player: Player,
    onComplete: () => void
  ): void {
    const exploredTiles: { x: number; y: number; dist: number }[] = [];

    for (let y = 0; y < MAP_ROWS; y++) {
      for (let x = 0; x < MAP_COLS; x++) {
        if (map.explored[y][x]) {
          const dx = x - player.x;
          const dy = y - player.y;
          const exitDx = x - map.exit.x;
          const exitDy = y - map.exit.y;
          const playerDist = Math.sqrt(dx * dx + dy * dy);
          const exitDist = Math.sqrt(exitDx * exitDx + exitDy * exitDy);
          exploredTiles.push({ x, y, dist: playerDist + exitDist * 0.01 });
        }
      }
    }

    exploredTiles.sort((a, b) => a.dist - b.dist);

    const interval = 50;
    let index = 0;

    const animateNext = () => {
      if (index >= exploredTiles.length) {
        setTimeout(onComplete, 300);
        return;
      }

      const end = Math.min(index + 3, exploredTiles.length);
      for (let i = index; i < end; i++) {
        const tile = exploredTiles[i];
        const px = tile.x * TILE_SIZE;
        const py = tile.y * TILE_SIZE;

        const flash = this.ctx.createRadialGradient(
          px + TILE_SIZE / 2, py + TILE_SIZE / 2, 0,
          px + TILE_SIZE / 2, py + TILE_SIZE / 2, TILE_SIZE
        );
        flash.addColorStop(0, 'rgba(255, 255, 150, 0.6)');
        flash.addColorStop(1, 'rgba(255, 200, 0, 0)');

        this.ctx.fillStyle = flash;
        this.ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
      }

      index = end;
      setTimeout(animateNext, interval);
    };

    animateNext();
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        }
      : { r: 128, g: 128, b: 128 };
  }
}
