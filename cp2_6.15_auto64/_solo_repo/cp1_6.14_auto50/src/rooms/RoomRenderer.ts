import { Room, Player, Enemy, Chest } from '../types';
import {
  TILE_SIZE,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  COLOR_BG,
  COLOR_WALL,
  COLOR_FLOOR,
  COLOR_DOOR,
  COLOR_PLAYER,
  COLOR_BAT,
  COLOR_SKELETON,
  COLOR_CHEST,
  COLOR_CHEST_OPENED,
} from '../constants';
import { getCameraOffset } from './RoomGenerator';

export function renderRoom(
  ctx: CanvasRenderingContext2D,
  room: Room,
  player: Player,
  alpha: number
): void {
  const { offsetX, offsetY } = getCameraOffset(room);

  ctx.globalAlpha = alpha;
  ctx.fillStyle = COLOR_BG;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  for (let y = 0; y < room.height; y++) {
    for (let x = 0; x < room.width; x++) {
      const tile = room.tiles[y][x];
      const px = offsetX + x * TILE_SIZE;
      const py = offsetY + y * TILE_SIZE;

      if (tile === 'wall') {
        ctx.fillStyle = COLOR_WALL;
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle = '#1a1a2a';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 0.5, py + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
      } else if (tile === 'floor') {
        ctx.fillStyle = COLOR_FLOOR;
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle = '#181820';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(px + 0.5, py + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
      } else if (tile === 'door') {
        ctx.fillStyle = COLOR_FLOOR;
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = COLOR_DOOR;
        const doorInset = 8;
        ctx.fillRect(px + doorInset, py + doorInset, TILE_SIZE - doorInset * 2, TILE_SIZE - doorInset * 2);
        ctx.strokeStyle = '#aa8800';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + doorInset, py + doorInset, TILE_SIZE - doorInset * 2, TILE_SIZE - doorInset * 2);
      }
    }
  }

  for (const chest of room.chests) {
    renderChest(ctx, chest, offsetX, offsetY);
  }

  for (const enemy of room.enemies) {
    renderEnemy(ctx, enemy, offsetX, offsetY);
  }

  renderPlayer(ctx, player, offsetX, offsetY);

  ctx.globalAlpha = 1;
}

function renderPlayer(
  ctx: CanvasRenderingContext2D,
  player: Player,
  offsetX: number,
  offsetY: number
): void {
  const px = offsetX + player.x;
  const py = offsetY + player.y;

  ctx.save();
  ctx.beginPath();
  ctx.arc(px, py, player.radius, 0, Math.PI * 2);
  ctx.fillStyle = COLOR_PLAYER;
  ctx.fill();
  ctx.strokeStyle = '#00cc00';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(px - 3, py - 2, 2, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(px + 3, py - 2, 2, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  ctx.restore();
}

function renderEnemy(
  ctx: CanvasRenderingContext2D,
  enemy: Enemy,
  offsetX: number,
  offsetY: number
): void {
  const ex = offsetX + enemy.x;
  const ey = offsetY + enemy.y;

  ctx.save();

  if (enemy.type === 'bat') {
    ctx.beginPath();
    ctx.arc(ex, ey, enemy.radius, 0, Math.PI * 2);
    ctx.fillStyle = COLOR_BAT;
    ctx.fill();
    ctx.strokeStyle = '#cc2222';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(ex - enemy.radius - 4, ey - 2);
    ctx.lineTo(ex - enemy.radius, ey + 2);
    ctx.lineTo(ex - enemy.radius + 4, ey - 4);
    ctx.fillStyle = COLOR_BAT;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(ex + enemy.radius + 4, ey - 2);
    ctx.lineTo(ex + enemy.radius, ey + 2);
    ctx.lineTo(ex + enemy.radius - 4, ey - 4);
    ctx.fillStyle = COLOR_BAT;
    ctx.fill();
  } else {
    const half = 7;
    ctx.fillStyle = COLOR_SKELETON;
    ctx.fillRect(ex - half, ey - half, half * 2, half * 2);
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 1;
    ctx.strokeRect(ex - half, ey - half, half * 2, half * 2);

    ctx.fillStyle = '#ff0000';
    ctx.fillRect(ex - 4, ey - 4, 3, 3);
    ctx.fillRect(ex + 2, ey - 4, 3, 3);

    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ex - 3, ey + 3);
    ctx.lineTo(ex + 3, ey + 3);
    ctx.stroke();
  }

  if (enemy.hp < enemy.maxHp) {
    const barWidth = 20;
    const barHeight = 3;
    const bx = ex - barWidth / 2;
    const by = ey - enemy.radius - 8;
    ctx.fillStyle = '#333333';
    ctx.fillRect(bx, by, barWidth, barHeight);
    const hpRatio = enemy.hp / enemy.maxHp;
    ctx.fillStyle = hpRatio > 0.5 ? '#44ff44' : hpRatio > 0.25 ? '#ffaa00' : '#ff4444';
    ctx.fillRect(bx, by, barWidth * hpRatio, barHeight);
  }

  ctx.restore();
}

function renderChest(
  ctx: CanvasRenderingContext2D,
  chest: Chest,
  offsetX: number,
  offsetY: number
): void {
  const cx = offsetX + chest.x;
  const cy = offsetY + chest.y;

  ctx.save();

  if (chest.opened) {
    ctx.fillStyle = COLOR_CHEST_OPENED;
    ctx.fillRect(cx - 10, cy - 6, 20, 12);
    ctx.strokeStyle = '#443300';
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - 10, cy - 6, 20, 12);

    ctx.fillStyle = '#332200';
    ctx.fillRect(cx - 8, cy - 4, 16, 4);
  } else {
    ctx.fillStyle = COLOR_CHEST;
    ctx.fillRect(cx - 10, cy - 8, 20, 16);
    ctx.strokeStyle = '#cc9900';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - 10, cy - 8, 20, 16);

    ctx.fillStyle = '#cc9900';
    ctx.fillRect(cx - 10, cy - 1, 20, 2);

    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#aa7700';
    ctx.fill();

    ctx.strokeStyle = '#eebb33';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy - 5);
    ctx.lineTo(cx + 6, cy - 5);
    ctx.stroke();
  }

  ctx.restore();
}

export function renderDeathScreen(ctx: CanvasRenderingContext2D): void {
  ctx.save();

  ctx.fillStyle = 'rgba(80, 80, 80, 0.7)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.fillStyle = '#ffffff';
  ctx.font = '48px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('你已死亡', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30);

  ctx.fillStyle = '#aaaaaa';
  ctx.font = '18px sans-serif';
  ctx.fillText('点击"重新开始"继续冒险', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);

  ctx.restore();
}

export function renderDamageFlash(ctx: CanvasRenderingContext2D, intensity: number): void {
  if (intensity <= 0) return;
  ctx.save();
  ctx.fillStyle = `rgba(255, 0, 0, ${intensity * 0.3})`;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.restore();
}
