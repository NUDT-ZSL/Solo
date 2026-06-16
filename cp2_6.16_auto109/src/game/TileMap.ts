import {
  Tile,
  TerrainType,
  Building,
  TILE_SIZE,
  MAP_WIDTH,
  MAP_HEIGHT,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
} from './entities';

export class TileMap {
  public readonly width: number = MAP_WIDTH;
  public readonly height: number = MAP_HEIGHT;
  public readonly tileSize: number = TILE_SIZE;
  private tiles: Tile[][] = [];
  private offsetX: number;
  private offsetY: number;

  constructor() {
    this.offsetX = (CANVAS_WIDTH - MAP_WIDTH * TILE_SIZE) / 2;
    this.offsetY = (CANVAS_HEIGHT - MAP_HEIGHT * TILE_SIZE) / 2;
    this.generateMap();
  }

  public generateMap(): void {
    this.tiles = [];
    for (let y = 0; y < this.height; y++) {
      const row: Tile[] = [];
      for (let x = 0; x < this.width; x++) {
        let terrain: TerrainType = 'land';
        if (x === 0 || y === 0 || x === this.width - 1 || y === this.height - 1) {
          terrain = 'deep';
        } else if (x === 1 || y === 1 || x === this.width - 2 || y === this.height - 2) {
          terrain = 'shallow';
        } else {
          const rand = Math.random();
          if (rand < 0.1) terrain = 'shallow';
          else terrain = 'land';
        }
        row.push({
          x,
          y,
          terrain,
          waterLevel: 0,
          delayedWaterLevel: 0,
          tideDelay: 0,
        });
      }
      this.tiles.push(row);
    }
  }

  public getTile(x: number, y: number): Tile | null {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return null;
    return this.tiles[y][x];
  }

  public getTileAtPixel(pixelX: number, pixelY: number): Tile | null {
    const relX = pixelX - this.offsetX;
    const relY = pixelY - this.offsetY;
    if (relX < 0 || relY < 0) return null;
    const tileX = Math.floor(relX / this.tileSize);
    const tileY = Math.floor(relY / this.tileSize);
    return this.getTile(tileX, tileY);
  }

  public getTileCenter(tileX: number, tileY: number): { x: number; y: number } {
    return {
      x: this.offsetX + tileX * this.tileSize + this.tileSize / 2,
      y: this.offsetY + tileY * this.tileSize + this.tileSize / 2,
    };
  }

  public getPixelToTile(pixelX: number, pixelY: number): { x: number; y: number } | null {
    const tile = this.getTileAtPixel(pixelX, pixelY);
    if (!tile) return null;
    return { x: tile.x, y: tile.y };
  }

  public updateWaterLevels(tideLevel: number, buildings: Building[]): void {
    const delayedTiles = new Set<string>();
    for (const building of buildings) {
      if (building.type === 'seawall' && !building.isDamaged) {
        const adjacent = this.getAdjacentTiles(building.x, building.y, 1);
        for (const tile of adjacent) {
          delayedTiles.add(`${tile.x},${tile.y}`);
          tile.tideDelay = 2;
        }
      }
    }

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const tile = this.tiles[y][x];
        const key = `${x},${y}`;
        if (delayedTiles.has(key)) {
          if (tile.tideDelay > 0) {
            tile.tideDelay -= 1 / 60;
            tile.delayedWaterLevel = Math.max(0, tideLevel - 2);
          } else {
            tile.delayedWaterLevel = tideLevel;
          }
          tile.waterLevel = tile.delayedWaterLevel;
        } else {
          tile.waterLevel = tideLevel;
        }
      }
    }
  }

  public getAdjacentTiles(x: number, y: number, range: number): Tile[] {
    const tiles: Tile[] = [];
    for (let dy = -range; dy <= range; dy++) {
      for (let dx = -range; dx <= range; dx++) {
        if (dx === 0 && dy === 0) continue;
        const tile = this.getTile(x + dx, y + dy);
        if (tile) tiles.push(tile);
      }
    }
    return tiles;
  }

  public getShallowTiles(): Tile[] {
    const result: Tile[] = [];
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.tiles[y][x].terrain === 'shallow') {
          result.push(this.tiles[y][x]);
        }
      }
    }
    return result;
  }

  public getLandTiles(): Tile[] {
    const result: Tile[] = [];
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.tiles[y][x].terrain === 'land') {
          result.push(this.tiles[y][x]);
        }
      }
    }
    return result;
  }

  public getDeepTiles(): Tile[] {
    const result: Tile[] = [];
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.tiles[y][x].terrain === 'deep') {
          result.push(this.tiles[y][x]);
        }
      }
    }
    return result;
  }

  public getOffset(): { x: number; y: number } {
    return { x: this.offsetX, y: this.offsetY };
  }

  public isInBounds(tileX: number, tileY: number): boolean {
    return tileX >= 0 && tileX < this.width && tileY >= 0 && tileY < this.height;
  }

  public render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#0A1628';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const tile = this.tiles[y][x];
        const px = this.offsetX + x * this.tileSize;
        const py = this.offsetY + y * this.tileSize;

        let color = this.terrainToColor(tile.terrain, tile.waterLevel);

        ctx.fillStyle = color;
        ctx.fillRect(px, py, this.tileSize, this.tileSize);

        if (tile.terrain === 'deep' || tile.terrain === 'shallow') {
          const waveAlpha = 0.1 + (tile.waterLevel / 8) * 0.15;
          ctx.fillStyle = `rgba(255, 255, 255, ${waveAlpha})`;
          const waveOffset = (Date.now() / 500 + x + y) % 2;
          for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(
              px + 10 + i * 20 + Math.sin(waveOffset + i) * 3,
              py + 10 + (i % 2) * 25 + Math.cos(waveOffset + i) * 3,
              2,
              0,
              Math.PI * 2
            );
            ctx.fill();
          }
        }

        ctx.strokeStyle = 'rgba(30, 58, 95, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(px, py, this.tileSize, this.tileSize);
      }
    }
  }

  private terrainToColor(terrain: TerrainType, waterLevel: number): string {
    const waterInfluence = Math.min(waterLevel / 8, 1);
    switch (terrain) {
      case 'land': {
        if (waterInfluence > 0.3) {
          const r = Math.floor(139 * (1 - waterInfluence * 0.5) + 59 * waterInfluence * 0.5);
          const g = Math.floor(115 * (1 - waterInfluence * 0.5) + 130 * waterInfluence * 0.5);
          const b = Math.floor(85 * (1 - waterInfluence * 0.5) + 246 * waterInfluence * 0.5);
          return `rgb(${r}, ${g}, ${b})`;
        }
        return '#8B7355';
      }
      case 'shallow':
        return '#3B82F6';
      case 'deep':
        return '#1E3A5F';
      default:
        return '#8B7355';
    }
  }
}
