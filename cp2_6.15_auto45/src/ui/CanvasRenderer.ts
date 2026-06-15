import type { DungeonMap, Position, Room } from '../game/types';

interface PlayerState {
  position: Position;
  hp: number;
  maxHp: number;
}

interface AnimationState {
  treasureRotation: number;
  breathPhase: number;
  fadeAlpha: number;
}

const TILE_SIZE = 40;
const CANVAS_PADDING = 0;

function pointInRect(px: number, py: number, rx: number, ry: number, rw: number, rh: number): boolean {
  return px >= rx && px < rx + rw && py >= ry && py < ry + rh;
}

function rectIntersect(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function playerRoomCollision(playerPos: Position, playerRadius: number, room: Room): boolean {
  const playerLeft = playerPos.x - playerRadius;
  const playerTop = playerPos.y - playerRadius;
  const playerSize = playerRadius * 2;
  return rectIntersect(
    playerLeft, playerTop, playerSize, playerSize,
    room.x, room.y, room.width, room.height,
  );
}

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private map: DungeonMap | null = null;
  private player: PlayerState | null = null;
  private animation: AnimationState = {
    treasureRotation: 0,
    breathPhase: 0,
    fadeAlpha: 0,
  };
  private animFrameId: number | null = null;
  private lastFrameTime: number = 0;
  private onPlayerMove?: (pos: Position) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }
    this.ctx = ctx;
    this.setupInput();
  }

  private setupInput(): void {
    this.canvas.tabIndex = 0;
    this.canvas.addEventListener('keydown', (e) => {
      if (!this.player || !this.map) return;
      let dx = 0;
      let dy = 0;
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          dy = -1;
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          dy = 1;
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          dx = -1;
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          dx = 1;
          break;
        default:
          return;
      }
      e.preventDefault();
      const newPos = {
        x: this.player.position.x + dx,
        y: this.player.position.y + dy,
      };
      if (this.isWalkable(newPos)) {
        this.player.position = newPos;
        this.updateExploredRooms(newPos);
        this.onPlayerMove?.(newPos);
      }
    });
  }

  private isWalkable(pos: Position): boolean {
    if (!this.map) return false;
    if (
      pos.x < 0 ||
      pos.x >= this.map.width ||
      pos.y < 0 ||
      pos.y >= this.map.height
    ) {
      return false;
    }
    return this.map.tiles[pos.y][pos.x] === 'floor';
  }

  private updateExploredRooms(pos: Position): void {
    if (!this.map) return;
    const playerRadius = 0.25;
    for (const room of this.map.rooms) {
      if (playerRoomCollision(pos, playerRadius, room)) {
        this.map.exploredRooms.add(room.id);
      }
    }
  }

  setOnPlayerMove(callback: (pos: Position) => void): void {
    this.onPlayerMove = callback;
  }

  setMap(map: DungeonMap): void {
    this.map = map;
    this.animation.fadeAlpha = 0;
    this.player = {
      position: { ...map.entrance },
      hp: 100,
      maxHp: 100,
    };
    this.startAnimation();
  }

  getPlayer(): PlayerState | null {
    return this.player;
  }

  getExploredRooms(): Set<number> {
    return this.map?.exploredRooms ?? new Set();
  }

  private startAnimation(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
    this.lastFrameTime = performance.now();
    const loop = (time: number) => {
      const delta = (time - this.lastFrameTime) / 1000;
      this.lastFrameTime = time;
      this.updateAnimation(delta);
      this.render();
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  private updateAnimation(delta: number): void {
    this.animation.treasureRotation += delta * Math.PI * 2;
    this.animation.breathPhase += delta * Math.PI * 2;
    if (this.animation.fadeAlpha < 1) {
      this.animation.fadeAlpha = Math.min(1, this.animation.fadeAlpha + delta * 2);
    }
  }

  destroy(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private render(): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.fillStyle = '#0f0f23';
    ctx.fillRect(0, 0, w, h);

    if (!this.map) return;

    ctx.save();
    ctx.globalAlpha = this.animation.fadeAlpha;

    ctx.translate(CANVAS_PADDING, CANVAS_PADDING);

    this.renderTiles();
    this.renderRoomHalos();
    this.renderMonsters();
    this.renderTreasures();
    this.renderPlayer();

    ctx.restore();
  }

  private renderTiles(): void {
    if (!this.map) return;
    const ctx = this.ctx;

    for (let y = 0; y < this.map.height; y++) {
      for (let x = 0; x < this.map.width; x++) {
        const tile = this.map.tiles[y][x];
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;

        if (tile === 'wall') {
          ctx.fillStyle = '#444444';
        } else {
          ctx.fillStyle = '#666666';
        }
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 0.5, py + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
      }
    }
  }

  private renderRoomHalos(): void {
    if (!this.map) return;
    const ctx = this.ctx;
    const level = this.map.threatLevel;

    let haloColor: string;
    if (level <= 3) {
      haloColor = '#ffd54f';
    } else if (level <= 7) {
      const t = (level - 3) / 4;
      haloColor = this.interpolateColor('#ffd54f', '#ffffff', t);
    } else {
      haloColor = '#ffffff';
    }

    for (const room of this.map.rooms) {
      if (!this.map.exploredRooms.has(room.id)) continue;
      const cx = room.center.x * TILE_SIZE + TILE_SIZE / 2;
      const cy = room.center.y * TILE_SIZE + TILE_SIZE / 2;

      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, 8 * TILE_SIZE / 40 * 8);
      gradient.addColorStop(0, this.colorWithAlpha(haloColor, 0.15));
      gradient.addColorStop(1, this.colorWithAlpha(haloColor, 0));

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(cx, cy, 8 * TILE_SIZE / 40 * 8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private renderMonsters(): void {
    if (!this.map || !this.player) return;
    const ctx = this.ctx;

    for (const monster of this.map.monsters) {
      const isExplored = this.map.exploredRooms.has(monster.roomId);
      const alpha = isExplored ? 1 : 0.3;

      const px = monster.position.x * TILE_SIZE + TILE_SIZE / 2;
      const py = monster.position.y * TILE_SIZE + TILE_SIZE / 2;
      const size = 12 * TILE_SIZE / 40;

      ctx.save();
      ctx.globalAlpha = alpha;
      if (!isExplored) {
        ctx.fillStyle = '#888888';
      } else {
        ctx.fillStyle = '#e53935';
      }

      ctx.beginPath();
      ctx.moveTo(px, py - size);
      ctx.lineTo(px - size * 0.866, py + size * 0.5);
      ctx.lineTo(px + size * 0.866, py + size * 0.5);
      ctx.closePath();
      ctx.fill();

      if (isExplored) {
        ctx.strokeStyle = '#b71c1c';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  private renderTreasures(): void {
    if (!this.map) return;
    const ctx = this.ctx;

    for (const treasure of this.map.treasures) {
      if (treasure.collected) continue;
      const isExplored = this.map.exploredRooms.has(treasure.roomId);
      const alpha = isExplored ? 1 : 0.3;

      const px = treasure.position.x * TILE_SIZE + TILE_SIZE / 2;
      const py = treasure.position.y * TILE_SIZE + TILE_SIZE / 2;
      const w = 10 * TILE_SIZE / 40;
      const h = 16 * TILE_SIZE / 40;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(px, py);
      ctx.rotate(this.animation.treasureRotation);

      if (!isExplored) {
        ctx.fillStyle = '#999999';
      } else {
        ctx.fillStyle = '#ffd700';
      }

      ctx.beginPath();
      ctx.moveTo(0, -h / 2);
      ctx.lineTo(w / 2, 0);
      ctx.lineTo(0, h / 2);
      ctx.lineTo(-w / 2, 0);
      ctx.closePath();
      ctx.fill();

      if (isExplored) {
        ctx.strokeStyle = '#ff8f00';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 8;
        ctx.fill();
      }

      ctx.restore();
    }
  }

  private renderPlayer(): void {
    if (!this.player) return;
    const ctx = this.ctx;

    const px = this.player.position.x * TILE_SIZE + TILE_SIZE / 2;
    const py = this.player.position.y * TILE_SIZE + TILE_SIZE / 2;
    const baseR = 8 * TILE_SIZE / 40;
    const breathScale = 1 + Math.sin(this.animation.breathPhase) * 0.15;
    const r = baseR * breathScale;
    const haloR = baseR * 2.2 * breathScale;

    const haloGradient = ctx.createRadialGradient(px, py, baseR * 0.5, px, py, haloR);
    haloGradient.addColorStop(0, 'rgba(33, 150, 243, 0.5)');
    haloGradient.addColorStop(1, 'rgba(33, 150, 243, 0)');
    ctx.fillStyle = haloGradient;
    ctx.beginPath();
    ctx.arc(px, py, haloR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#2196f3';
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#1565c0';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  private interpolateColor(a: string, b: string, t: number): string {
    const pa = this.parseHex(a);
    const pb = this.parseHex(b);
    const r = Math.round(pa.r + (pb.r - pa.r) * t);
    const g = Math.round(pa.g + (pb.g - pa.g) * t);
    const bl = Math.round(pa.b + (pb.b - pa.b) * t);
    return `rgb(${r}, ${g}, ${bl})`;
  }

  private parseHex(hex: string): { r: number; g: number; b: number } {
    const h = hex.replace('#', '');
    return {
      r: parseInt(h.substring(0, 2), 16),
      g: parseInt(h.substring(2, 4), 16),
      b: parseInt(h.substring(4, 6), 16),
    };
  }

  private colorWithAlpha(color: string, alpha: number): string {
    if (color.startsWith('#')) {
      const { r, g, b } = this.parseHex(color);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return color;
  }

  focus(): void {
    this.canvas.focus();
  }
}
