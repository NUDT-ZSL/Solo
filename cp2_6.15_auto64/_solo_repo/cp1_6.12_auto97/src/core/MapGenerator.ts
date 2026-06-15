import * as Phaser from 'phaser';
import { PerlinNoise } from '../utils/PerlinNoise';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  TILE_SIZE,
  MAP_COLS,
  MAP_ROWS,
  TERRAIN,
  COLORS
} from '../config/Constants';

export type TerrainType = typeof TERRAIN[keyof typeof TERRAIN];

export interface TileData {
  terrain: TerrainType;
  x: number;
  y: number;
}

export class MapGenerator {
  private scene: Phaser.Scene;
  private noise: PerlinNoise;
  private tileData: TileData[][] = [];
  private tilemap: Phaser.Tilemaps.Tilemap | null = null;
  private tileset: Phaser.Tilemaps.Tileset | null = null;
  private layer: Phaser.Tilemaps.TilemapLayer | null = null;
  private borderGraphics: Phaser.GameObjects.Graphics | null = null;

  constructor(scene: Phaser.Scene, seed?: number) {
    this.scene = scene;
    this.noise = new PerlinNoise(seed ?? Date.now());
  }

  generate(): void {
    this.generateTileData();
    this.generateTextures();
    this.createTilemap();
    this.createBorderGradient();
  }

  private generateTileData(): void {
    const scale = 0.08;
    for (let row = 0; row < MAP_ROWS; row++) {
      this.tileData[row] = [];
      for (let col = 0; col < MAP_COLS; col++) {
        const nx = col * scale;
        const ny = row * scale;
        const value = (this.noise.octaveNoise2D(nx, ny, 4, 0.5) + 1) * 0.5;
        let terrain: TerrainType;
        if (value < 0.45) {
          terrain = TERRAIN.GRASS;
        } else if (value < 0.65) {
          terrain = TERRAIN.MUD;
        } else {
          terrain = TERRAIN.WATER;
        }
        this.tileData[row][col] = { terrain, x: col * TILE_SIZE, y: row * TILE_SIZE };
      }
    }
  }

  private generateTextures(): void {
    this.createGrassTexture();
    this.createMudTexture();
    this.createWaterTexture();
  }

  private createGrassTexture(): void {
    const key = 'tile_grass';
    if (this.scene.textures.exists(key)) return;
    const canvas = this.scene.textures.createCanvas(key, TILE_SIZE, TILE_SIZE);
    const ctx = canvas.getContext();
    ctx.fillStyle = `#${COLORS.GRASS_DARK.toString(16).padStart(6, '0')}`;
    ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = `#${COLORS.GRASS_LIGHT.toString(16).padStart(6, '0')}`;
    const grassPixels = [
      [2, 3], [5, 7], [8, 2], [11, 11], [13, 5],
      [3, 12], [7, 1], [10, 9], [14, 14], [1, 9],
      [6, 13], [9, 6], [12, 3], [4, 4], [15, 8]
    ];
    for (const [px, py] of grassPixels) {
      ctx.fillRect(px, py, 2, 2);
    }
    canvas.refresh();
  }

  private createMudTexture(): void {
    const key = 'tile_mud';
    if (this.scene.textures.exists(key)) return;
    const canvas = this.scene.textures.createCanvas(key, TILE_SIZE, TILE_SIZE);
    const ctx = canvas.getContext();
    ctx.fillStyle = `#${COLORS.MUD_DARK.toString(16).padStart(6, '0')}`;
    ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = `#${COLORS.MUD_LIGHT.toString(16).padStart(6, '0')}`;
    const mudPixels = [
      [1, 1], [4, 6], [8, 3], [12, 10], [14, 2],
      [2, 11], [6, 14], [10, 7], [13, 12], [5, 4],
      [9, 1], [3, 8], [11, 5], [7, 11], [15, 15]
    ];
    for (const [px, py] of mudPixels) {
      ctx.fillRect(px, py, 3, 2);
    }
    canvas.refresh();
  }

  private createWaterTexture(): void {
    const key = 'tile_water';
    if (this.scene.textures.exists(key)) return;
    const canvas = this.scene.textures.createCanvas(key, TILE_SIZE, TILE_SIZE);
    const ctx = canvas.getContext();
    ctx.fillStyle = `#${COLORS.WATER_DARK.toString(16).padStart(6, '0')}`;
    ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = `#${COLORS.WATER_LIGHT.toString(16).padStart(6, '0')}`;
    ctx.fillRect(1, 4, 6, 1);
    ctx.fillRect(9, 4, 5, 1);
    ctx.fillRect(4, 10, 8, 1);
    ctx.fillRect(2, 13, 4, 1);
    ctx.fillRect(10, 13, 4, 1);
    canvas.refresh();
  }

  private createTilemap(): void {
    this.tilemap = this.scene.make.tilemap({
      width: MAP_COLS,
      height: MAP_ROWS,
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE
    });

    this.tileset = this.tilemap.addTilesetImage(
      'tileset',
      undefined,
      TILE_SIZE,
      TILE_SIZE,
      0,
      0
    );

    const layerData: Phaser.Tilemaps.MapData = (this.tilemap as any).mapData;
    const data = layerData.layers[0].data;

    for (let row = 0; row < MAP_ROWS; row++) {
      for (let col = 0; col < MAP_COLS; col++) {
        const tile = this.tileData[row]?.[col];
        if (!tile) continue;
        const tileObj = data[row][col];
        if (tileObj) {
          const terrainIdx = tile.terrain === TERRAIN.GRASS ? 0 :
                            tile.terrain === TERRAIN.MUD ? 1 : 2;
          tileObj.index = terrainIdx;
        }
      }
    }

    this.tilemap.putTilesAt(
      this.tileData.map(row => row.map(t => {
        if (t.terrain === TERRAIN.GRASS) return 0;
        if (t.terrain === TERRAIN.MUD) return 1;
        return 2;
      })),
      0,
      0
    );

    const grassTileset = this.tilemap.addTilesetImage('grass_ts', 'tile_grass', TILE_SIZE, TILE_SIZE, 0, 0);
    const mudTileset = this.tilemap.addTilesetImage('mud_ts', 'tile_mud', TILE_SIZE, TILE_SIZE, 0, 0);
    const waterTileset = this.tilemap.addTilesetImage('water_ts', 'tile_water', TILE_SIZE, TILE_SIZE, 0, 0);

    const blankLayer = this.tilemap.createBlankLayer('terrain', [grassTileset, mudTileset, waterTileset])!;

    for (let row = 0; row < MAP_ROWS; row++) {
      for (let col = 0; col < MAP_COLS; col++) {
        const tile = this.tileData[row][col];
        if (!tile) continue;
        let ts: Phaser.Tilemaps.Tileset;
        if (tile.terrain === TERRAIN.GRASS) ts = grassTileset;
        else if (tile.terrain === TERRAIN.MUD) ts = mudTileset;
        else ts = waterTileset;
        blankLayer.putTileAt(0, col, row, false, ts);
      }
    }

    blankLayer.setDepth(0);
    this.layer = blankLayer;
  }

  private createBorderGradient(): void {
    this.borderGraphics = this.scene.add.graphics();
    this.borderGraphics.setDepth(9998);
    const borderWidth = 40;
    const gradientSteps = 20;

    for (let i = 0; i < gradientSteps; i++) {
      const alpha = (i / gradientSteps) * 0.9;
      const w = borderWidth * (1 - i / gradientSteps);
      this.borderGraphics.lineStyle(2, 0x000000, alpha);
      this.borderGraphics.strokeRect(
        w, w,
        GAME_WIDTH - w * 2,
        GAME_HEIGHT - w * 2
      );
    }
  }

  getTerrainAt(worldX: number, worldY: number): TerrainType {
    const col = Math.floor(worldX / TILE_SIZE);
    const row = Math.floor(worldY / TILE_SIZE);
    if (row < 0 || row >= MAP_ROWS || col < 0 || col >= MAP_COLS) {
      return TERRAIN.WATER;
    }
    return this.tileData[row][col].terrain;
  }

  isWalkable(worldX: number, worldY: number): boolean {
    return this.getTerrainAt(worldX, worldY) !== TERRAIN.WATER;
  }

  getRandomWalkablePosition(): { x: number; y: number } {
    for (let attempt = 0; attempt < 200; attempt++) {
      const x = 32 + Math.random() * (GAME_WIDTH - 64);
      const y = 32 + Math.random() * (GAME_HEIGHT - 64);
      if (this.isWalkable(x, y)) {
        return { x, y };
      }
    }
    return { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 };
  }

  destroy(): void {
    if (this.layer) this.layer.destroy();
    if (this.borderGraphics) this.borderGraphics.destroy();
    this.tilemap = null;
    this.tileset = null;
    this.layer = null;
    this.borderGraphics = null;
  }
}
