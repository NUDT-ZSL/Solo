import type { IGameData, GameState } from './types';
import { RoomData, TILE_SIZE, getTileCenter } from './room';
import type { IPlayerState, IEnemyState, IProjectileState, IDebris, IParticle, IAttackArea } from './types';
import { Player } from './entities';

export class GameRenderer {
  private ctx: CanvasRenderingContext2D;
  private canvasWidth: number;
  private canvasHeight: number;
  private cachedRoomKey: string = '';
  private roomCanvas: HTMLCanvasElement | null = null;
  private roomCtx: CanvasRenderingContext2D | null = null;

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx;
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  render(data: IGameData): void {
    this.ctx.fillStyle = '#09090b';
    this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    const { room, player, enemies, projectiles, debris, state, deathAnimationProgress } = data;

    const roomPixelWidth = room.width * TILE_SIZE;
    const roomPixelHeight = room.height * TILE_SIZE;
    const offsetX = (this.canvasWidth - roomPixelWidth) / 2;
    const offsetY = (this.canvasHeight - roomPixelHeight) / 2;

    this.ctx.save();
    this.ctx.translate(offsetX, offsetY);

    this.drawRoomCached(room);
    this.drawEntranceExit(room);
    this.drawChests(room);
    this.drawEnemies(enemies);
    this.drawProjectiles(projectiles);
    this.drawPlayer(player);
    this.drawAttackEffect(player);
    this.drawDebris(debris);
    this.drawPlayerParticles(player);

    this.ctx.restore();

    if (state === 'death_animation' || state === 'game_over') {
      const easedProgress = 1 - Math.pow(1 - deathAnimationProgress, 3);
      this.ctx.fillStyle = `rgba(0, 0, 0, ${easedProgress})`;
      this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    }

    if (state === 'item_select' || state === 'upgrade_select') {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 24px system-ui, sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      const label = state === 'item_select' ? '选择道具中...' : '选择升级中...';
      this.ctx.fillText(label, this.canvasWidth / 2, this.canvasHeight / 2);
    }
  }

  private getRoomKey(room: RoomData): string {
    return `${room.width}_${room.height}_${room.seed}`;
  }

  private drawRoomCached(room: RoomData): void {
    const key = this.getRoomKey(room);
    if (this.cachedRoomKey !== key || !this.roomCanvas) {
      this.roomCanvas = document.createElement('canvas');
      this.roomCanvas.width = room.width * TILE_SIZE;
      this.roomCanvas.height = room.height * TILE_SIZE;
      this.roomCtx = this.roomCanvas.getContext('2d')!;
      this.drawRoomToContext(this.roomCtx, room);
      this.cachedRoomKey = key;
    }
    this.ctx.drawImage(this.roomCanvas, 0, 0);
  }

  private drawRoomToContext(ctx: CanvasRenderingContext2D, room: RoomData): void {
    for (let y = 0; y < room.height; y++) {
      for (let x = 0; x < room.width; x++) {
        const tile = room.tiles[y][x];
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;

        if (tile === 1) {
          ctx.fillStyle = '#4a4a5a';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.fillStyle = '#3a3a4a';
          ctx.fillRect(px, py + TILE_SIZE - 4, TILE_SIZE, 4);
          ctx.fillStyle = '#5a5a6a';
          ctx.fillRect(px, py, TILE_SIZE, 2);
        } else if (tile === 2) {
          ctx.fillStyle = '#2a2a3a';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.fillStyle = '#5c5c6c';
          const pillarSize = TILE_SIZE * 0.7;
          const pillarOffset = (TILE_SIZE - pillarSize) / 2;
          ctx.fillRect(
            px + pillarOffset,
            py + pillarOffset,
            pillarSize,
            pillarSize
          );
          ctx.fillStyle = '#6c6c7c';
          ctx.fillRect(
            px + pillarOffset,
            py + pillarOffset,
            pillarSize,
            4
          );
        } else {
          ctx.fillStyle = '#2a2a3a';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = '#252535';
          ctx.lineWidth = 1;
          ctx.strokeRect(px + 0.5, py + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
        }
      }
    }
  }

  private drawRoom(room: RoomData): void {
    this.drawRoomToContext(this.ctx, room);
  }

  private drawEntranceExit(room: RoomData): void {
    const time = Date.now() / 1000;
    const pulse = 0.5 + 0.5 * Math.sin(time * Math.PI * 2 / 1.5);
    const alpha = 0.5 + 0.5 * pulse;

    const isVertical = (pos: { x: number; y: number }) =>
      pos.x === 0 || pos.x === room.width - 1;

    const entrancePos = getTileCenter(room.entrance.x, room.entrance.y);
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = '#60a5fa';
    if (isVertical(room.entrance)) {
      this.ctx.fillRect(entrancePos.x - 8, entrancePos.y - 16, 16, 32);
      this.ctx.shadowColor = '#60a5fa';
      this.ctx.shadowBlur = 10;
      this.ctx.fillRect(entrancePos.x - 8, entrancePos.y - 16, 16, 32);
    } else {
      this.ctx.fillRect(entrancePos.x - 16, entrancePos.y - 8, 32, 16);
      this.ctx.shadowColor = '#60a5fa';
      this.ctx.shadowBlur = 10;
      this.ctx.fillRect(entrancePos.x - 16, entrancePos.y - 8, 32, 16);
    }
    this.ctx.restore();

    const exitPos = getTileCenter(room.exit.x, room.exit.y);
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = '#fbbf24';
    if (isVertical(room.exit)) {
      this.ctx.fillRect(exitPos.x - 8, exitPos.y - 16, 16, 32);
      this.ctx.shadowColor = '#fbbf24';
      this.ctx.shadowBlur = 15;
      this.ctx.fillRect(exitPos.x - 8, exitPos.y - 16, 16, 32);
    } else {
      this.ctx.fillRect(exitPos.x - 16, exitPos.y - 8, 32, 16);
      this.ctx.shadowColor = '#fbbf24';
      this.ctx.shadowBlur = 15;
      this.ctx.fillRect(exitPos.x - 16, exitPos.y - 8, 32, 16);
    }
    this.ctx.fillStyle = '#f59e0b';
    this.ctx.fillRect(exitPos.x - 1.5, exitPos.y - 1.5, 3, 3);
    this.ctx.restore();
  }

  private drawChests(room: RoomData): void {
    room.chests.forEach((chest) => {
      const pos = getTileCenter(chest.position.x, chest.position.y);
      const size = 16;
      const halfSize = size / 2;

      if (chest.opened) {
        this.ctx.fillStyle = '#666666';
        this.ctx.fillRect(pos.x - halfSize, pos.y - halfSize, size, size);
        this.ctx.strokeStyle = '#444444';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(pos.x - halfSize, pos.y - halfSize, size, size);
      } else {
        this.ctx.fillStyle = '#8b4513';
        this.ctx.fillRect(pos.x - halfSize, pos.y - halfSize, size, size);
        this.ctx.fillStyle = '#a0522d';
        this.ctx.fillRect(pos.x - halfSize, pos.y - halfSize, size, 4);
        this.ctx.fillStyle = '#fbbf24';
        this.ctx.fillRect(pos.x - 2, pos.y - 2, 4, 4);
        this.ctx.strokeStyle = '#5c3317';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(pos.x - halfSize, pos.y - halfSize, size, size);
      }
    });
  }

  private drawPlayer(player: IPlayerState): void {
    const flashAlpha = player.hitFlashTimer > 0 ? 0.5 : 1;
    const invincibleAlpha = player.invincibleTimer > 0 ? 
      (Math.sin(Date.now() / 50) > 0 ? 1 : 0.3) : 1;

    this.ctx.save();
    this.ctx.globalAlpha = flashAlpha * invincibleAlpha;

    if (player.hasShield) {
      this.ctx.beginPath();
      this.ctx.arc(player.x, player.y, 10 + 6, 0, Math.PI * 2);
      this.ctx.strokeStyle = '#60a5fa';
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([4, 4]);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }

    this.ctx.beginPath();
    this.ctx.arc(player.x, player.y, 10, 0, Math.PI * 2);
    this.ctx.fillStyle = player.hitFlashTimer > 0 ? '#ffffff' : '#3b82f6';
    this.ctx.fill();
    this.ctx.strokeStyle = '#1d4ed8';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.arc(
      player.x + Math.cos(player.direction) * 4,
      player.y + Math.sin(player.direction) * 4,
      4,
      0,
      Math.PI * 2
    );
    this.ctx.fillStyle = '#60a5fa';
    this.ctx.fill();

    this.ctx.restore();
  }

  private drawAttackEffect(player: IPlayerState): void {
    if (!player.isAttacking) return;

    const attackArea: IAttackArea = {
      x: player.x,
      y: player.y,
      direction: player.direction,
      angle: Math.PI / 3,
      radius: 40,
    };

    this.ctx.save();
    this.ctx.globalAlpha = 0.4;
    this.ctx.fillStyle = '#ffffff33';

    this.ctx.beginPath();
    this.ctx.moveTo(attackArea.x, attackArea.y);
    this.ctx.arc(
      attackArea.x,
      attackArea.y,
      attackArea.radius,
      attackArea.direction - attackArea.angle / 2,
      attackArea.direction + attackArea.angle / 2
    );
    this.ctx.closePath();
    this.ctx.fill();

    const time = Date.now() / 50;
    this.ctx.globalAlpha = 0.2 + 0.2 * Math.sin(time);
    this.ctx.fill();
    this.ctx.restore();
  }

  private drawEnemies(enemies: IEnemyState[]): void {
    enemies.forEach((enemy) => {
      this.ctx.save();

      if (enemy.isBoss) {
        this.drawOctagon(
          enemy.x,
          enemy.y,
          enemy.radius,
          enemy.hitFlashTimer > 0 ? '#ffffff' : '#22c55e',
          '#15803d'
        );

        const hpPercent = enemy.hp / enemy.maxHp;
        const barWidth = 60;
        const barHeight = 6;
        this.ctx.fillStyle = '#1f2937';
        this.ctx.fillRect(
          enemy.x - barWidth / 2,
          enemy.y - enemy.radius - 15,
          barWidth,
          barHeight
        );
        this.ctx.fillStyle = '#22c55e';
        this.ctx.fillRect(
          enemy.x - barWidth / 2,
          enemy.y - enemy.radius - 15,
          barWidth * hpPercent,
          barHeight
        );
        this.ctx.strokeStyle = '#15803d';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(
          enemy.x - barWidth / 2,
          enemy.y - enemy.radius - 15,
          barWidth,
          barHeight
        );
      } else {
        this.drawDiamond(
          enemy.x,
          enemy.y,
          enemy.radius,
          enemy.hitFlashTimer > 0 ? '#ffffff' : '#ef4444',
          '#b91c1c'
        );

        const hpPercent = enemy.hp / enemy.maxHp;
        const barWidth = 28;
        const barHeight = 4;
        this.ctx.fillStyle = '#1f2937';
        this.ctx.fillRect(
          enemy.x - barWidth / 2,
          enemy.y - enemy.radius - 10,
          barWidth,
          barHeight
        );
        this.ctx.fillStyle = '#ef4444';
        this.ctx.fillRect(
          enemy.x - barWidth / 2,
          enemy.y - enemy.radius - 10,
          barWidth * hpPercent,
          barHeight
        );
      }

      this.ctx.restore();
    });
  }

  private drawDiamond(
    x: number,
    y: number,
    size: number,
    fillColor: string,
    strokeColor: string
  ): void {
    this.ctx.beginPath();
    this.ctx.moveTo(x, y - size);
    this.ctx.lineTo(x + size, y);
    this.ctx.lineTo(x, y + size);
    this.ctx.lineTo(x - size, y);
    this.ctx.closePath();
    this.ctx.fillStyle = fillColor;
    this.ctx.fill();
    this.ctx.strokeStyle = strokeColor;
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
  }

  private drawOctagon(
    x: number,
    y: number,
    size: number,
    fillColor: string,
    strokeColor: string
  ): void {
    this.ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8 - Math.PI / 8;
      const px = x + Math.cos(angle) * size;
      const py = y + Math.sin(angle) * size;
      if (i === 0) {
        this.ctx.moveTo(px, py);
      } else {
        this.ctx.lineTo(px, py);
      }
    }
    this.ctx.closePath();
    this.ctx.fillStyle = fillColor;
    this.ctx.fill();
    this.ctx.strokeStyle = strokeColor;
    this.ctx.lineWidth = 3;
    this.ctx.stroke();
  }

  private drawProjectiles(projectiles: IProjectileState[]): void {
    projectiles.forEach((proj) => {
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = '#f97316';
      this.ctx.fill();
      this.ctx.shadowColor = '#f97316';
      this.ctx.shadowBlur = 8;
      this.ctx.fill();
      this.ctx.restore();
    });
  }

  private drawDebris(debris: IDebris[]): void {
    debris.forEach((d) => {
      const alpha = d.life / d.maxLife;
      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = d.color;
      this.ctx.fillRect(d.x - d.size / 2, d.y - d.size / 2, d.size, d.size);
      this.ctx.restore();
    });
  }

  private drawPlayerParticles(player: IPlayerState): void {
    const time = Date.now() / 1000;
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6 + time * 2;
      const radius = 15 + Math.sin(time * 3 + i) * 5;
      const px = player.x + Math.cos(angle) * radius;
      const py = player.y + Math.sin(angle) * radius;
      this.ctx.save();
      this.ctx.globalAlpha = 0.3 + 0.2 * Math.sin(time * 4 + i);
      this.ctx.beginPath();
      this.ctx.arc(px, py, 2, 0, Math.PI * 2);
      this.ctx.fillStyle = '#60a5fa';
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.cachedRoomKey = '';
    this.roomCanvas = null;
    this.roomCtx = null;
  }
}
