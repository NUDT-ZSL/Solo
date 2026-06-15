import { GameMap, TileType } from './map';
import { PlayerState } from './player';

const COLORS = {
  WALL: '#2a2a2a',
  FLOOR: '#c8c8c8',
  BORDER: '#1a1a1a',
  PLAYER: '#4caf50',
  COIN: '#ffd700',
  FOG: 'rgba(0, 0, 0, 0.7)',
  UI_TEXT: '#ffffff'
};

export class Renderer {
  private ctx!: CanvasRenderingContext2D;
  private canvas!: HTMLCanvasElement;
  private tileSize!: number;
  private offsetX!: number;
  private offsetY!: number;

  constructor(canvas: HTMLCanvasElement, mapWidth: number, mapHeight: number) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Cannot get 2D context');
    }
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
    this.calculateTileSize(mapWidth, mapHeight);
  }

  private calculateTileSize(mapWidth: number, mapHeight: number): void {
    const maxTileW = Math.floor(800 / mapWidth);
    const maxTileH = Math.floor(600 / mapHeight);
    this.tileSize = Math.min(maxTileW, maxTileH);
    this.offsetX = Math.floor((800 - mapWidth * this.tileSize) / 2);
    this.offsetY = Math.floor((600 - mapHeight * this.tileSize) / 2);
  }

  public getTileSize(): number {
    return this.tileSize;
  }

  public clear(): void {
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  public renderMap(map: GameMap, player: PlayerState): void {
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const tile = map.tiles[y][x];
        const px = this.offsetX + x * this.tileSize;
        const py = this.offsetY + y * this.tileSize;
        const inVision = this.isInVision(x, y, player.x, player.y, 5);

        switch (tile) {
          case TileType.WALL:
            this.ctx.fillStyle = COLORS.WALL;
            break;
          case TileType.FLOOR:
            this.ctx.fillStyle = COLORS.FLOOR;
            break;
          case TileType.BORDER:
            this.ctx.fillStyle = COLORS.BORDER;
            break;
        }
        this.ctx.fillRect(px, py, this.tileSize, this.tileSize);

        if (!inVision) {
          this.ctx.fillStyle = COLORS.FOG;
          this.ctx.fillRect(px, py, this.tileSize, this.tileSize);
        }
      }
    }
  }

  private isInVision(x: number, y: number, px: number, py: number, radius: number): boolean {
    const dist = Math.sqrt(Math.pow(x - px, 2) + Math.pow(y - py, 2));
    return dist <= radius;
  }

  public renderCoins(map: GameMap, player: PlayerState): void {
    for (const coin of map.coins) {
      if (this.isInVision(coin.x, coin.y, player.x, player.y, 5)) {
        const px = this.offsetX + coin.x * this.tileSize + this.tileSize / 2;
        const py = this.offsetY + coin.y * this.tileSize + this.tileSize / 2;
        const r = Math.max(2, this.tileSize * 0.3);
        this.ctx.fillStyle = COLORS.COIN;
        this.ctx.beginPath();
        this.ctx.arc(px, py, r, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
  }

  public renderPortals(map: GameMap, player: PlayerState): void {
    for (const portal of map.portals) {
      if (this.isInVision(portal.x, portal.y, player.x, player.y, 5)) {
        const px = this.offsetX + portal.x * this.tileSize;
        const py = this.offsetY + portal.y * this.tileSize;
        const gradient = this.ctx.createLinearGradient(px, py, px + this.tileSize, py + this.tileSize);
        gradient.addColorStop(0, '#9c27b0');
        gradient.addColorStop(0.5, '#e040fb');
        gradient.addColorStop(1, '#7b1fa2');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(px + 2, py + 2, this.tileSize - 4, this.tileSize - 4);
      }
    }
  }

  public renderPlayer(player: PlayerState): void {
    const px = this.offsetX + player.renderX;
    const py = this.offsetY + player.renderY;
    const padding = Math.max(1, this.tileSize * 0.1);
    this.ctx.fillStyle = COLORS.PLAYER;
    this.ctx.fillRect(px + padding, py + padding, this.tileSize - padding * 2, this.tileSize - padding * 2);
  }

  public renderUI(player: PlayerState): void {
    this.ctx.fillStyle = COLORS.UI_TEXT;
    this.ctx.font = 'bold 18px "Courier New", monospace';
    this.ctx.textAlign = 'right';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(`金币: ${player.coinCount}`, this.canvas.width - 20, 15);
  }

  public renderAll(map: GameMap, player: PlayerState): void {
    this.clear();
    this.renderMap(map, player);
    this.renderCoins(map, player);
    this.renderPortals(map, player);
    this.renderPlayer(player);
    this.renderUI(player);
  }
}
