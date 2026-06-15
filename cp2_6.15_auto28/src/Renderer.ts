import {
  GameState,
  TileType,
  MAP_SIZE,
  TILE_SIZE,
  ItemType,
  MONSTER_BLINK_PERIOD,
} from './types';

const CANVAS_SIZE = 800;

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private lightCtx: CanvasRenderingContext2D;
  private lightCanvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.lightCanvas = document.createElement('canvas');
    this.lightCanvas.width = CANVAS_SIZE;
    this.lightCanvas.height = CANVAS_SIZE;
    this.lightCtx = this.lightCanvas.getContext('2d')!;
  }

  render(state: GameState): void {
    this.ctx.fillStyle = '#3a2a1a';
    this.ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    this.drawMap(state);
    this.drawItems(state);
    this.drawMonsters(state);
    this.drawPlayer(state);
    this.drawLighting(state);
    this.drawParticles(state);
    this.drawGrid();
    this.drawDamageFlash(state);
    this.drawPickupEffect(state);
    this.drawMinimap(state);
  }

  private drawMap(state: GameState): void {
    const { map, player, doors } = state;
    const px = player.x;
    const py = player.y;
    const radius = player.torchRadius;

    for (let y = 0; y < MAP_SIZE; y++) {
      for (let x = 0; x < MAP_SIZE; x++) {
        const tile = map[y][x];
        const dist = Math.sqrt((x - px) ** 2 + (y - py) ** 2);
        const inLight = dist <= radius;
        const explored = tile.explored;

        if (!explored && !inLight) continue;

        const screenX = x * TILE_SIZE;
        const screenY = y * TILE_SIZE;

        let color = '#2a2a2a';
        switch (tile.type) {
          case TileType.FLOOR:
            color = '#2a2a2a';
            break;
          case TileType.LOW_WALL:
          case TileType.HIGH_WALL:
            color = inLight ? '#777777' : '#555555';
            break;
          case TileType.DOOR:
            color = '#8B4513';
            break;
        }

        if (!inLight && explored) {
          this.ctx.globalAlpha = 0.3;
        } else {
          this.ctx.globalAlpha = 1;
        }

        this.ctx.fillStyle = color;
        this.ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);

        if (tile.type === TileType.DOOR) {
          const door = doors.find((d) => d.x === x && d.y === y);
          if (door && door.rotation > 0) {
            this.ctx.save();
            this.ctx.translate(screenX + TILE_SIZE / 2, screenY + TILE_SIZE / 2);
            this.ctx.rotate((door.rotation * Math.PI) / 180);
            this.ctx.fillStyle = '#8B4513';
            this.ctx.fillRect(-TILE_SIZE / 2, -2, TILE_SIZE, 4);
            this.ctx.restore();
          }
        }

        if (tile.type === TileType.HIGH_WALL) {
          this.ctx.fillStyle = '#333333';
          this.ctx.fillRect(screenX, screenY, TILE_SIZE, 3);
        }

        this.ctx.globalAlpha = 1;
      }
    }
  }

  private drawItems(state: GameState): void {
    const { items, player } = state;
    const px = player.x;
    const py = player.y;
    const radius = player.torchRadius;

    for (const item of items) {
      const dist = Math.sqrt((item.x - px) ** 2 + (item.y - py) ** 2);
      if (dist > radius) continue;

      const screenX = item.x * TILE_SIZE + TILE_SIZE / 2;
      const screenY = item.y * TILE_SIZE + TILE_SIZE / 2;

      if (item.type === ItemType.TORCH_BOOST) {
        const gradient = this.ctx.createRadialGradient(
          screenX,
          screenY,
          0,
          screenX,
          screenY,
          TILE_SIZE * 0.8
        );
        gradient.addColorStop(0, 'rgba(255, 215, 0, 0.6)');
        gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(screenX, screenY, TILE_SIZE * 0.8, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = '#FFD700';
        this.ctx.beginPath();
        this.ctx.arc(screenX, screenY, TILE_SIZE * 0.3, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = '#FF8C00';
        this.ctx.fillRect(screenX - 2, screenY - TILE_SIZE * 0.4, 4, TILE_SIZE * 0.25);
      } else {
        this.ctx.fillStyle = '#228B22';
        this.ctx.beginPath();
        this.ctx.ellipse(screenX, screenY + 2, TILE_SIZE * 0.25, TILE_SIZE * 0.3, 0, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = '#8B0000';
        this.ctx.fillRect(screenX - 3, screenY - TILE_SIZE * 0.35, 6, TILE_SIZE * 0.15);

        this.ctx.fillStyle = '#90EE90';
        this.ctx.fillRect(screenX - 1, screenY - 2, 2, 8);
        this.ctx.fillRect(screenX - 4, screenY + 1, 8, 2);
      }
    }
  }

  private drawMonsters(state: GameState): void {
    const { monsters, player } = state;
    const px = player.x;
    const py = player.y;
    const radius = player.torchRadius;

    for (const monster of monsters) {
      const dist = Math.sqrt((monster.x - px) ** 2 + (monster.y - py) ** 2);
      if (dist > radius) continue;

      const screenX = monster.x * TILE_SIZE + TILE_SIZE / 2;
      const screenY = monster.y * TILE_SIZE + TILE_SIZE / 2;

      const blinkPhase = Math.sin((monster.blinkTimer / MONSTER_BLINK_PERIOD) * Math.PI * 2);
      if (blinkPhase > 0) {
        const glowGradient = this.ctx.createRadialGradient(
          screenX,
          screenY,
          0,
          screenX,
          screenY,
          TILE_SIZE
        );
        glowGradient.addColorStop(0, 'rgba(255, 0, 0, 0.5)');
        glowGradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
        this.ctx.fillStyle = glowGradient;
        this.ctx.beginPath();
        this.ctx.arc(screenX, screenY, TILE_SIZE, 0, Math.PI * 2);
        this.ctx.fill();
      }

      this.ctx.fillStyle = '#DC143C';
      this.ctx.beginPath();
      this.ctx.arc(screenX, screenY - 2, TILE_SIZE * 0.3, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = '#000000';
      this.ctx.fillRect(screenX - TILE_SIZE * 0.15, screenY - TILE_SIZE * 0.1, TILE_SIZE * 0.1, TILE_SIZE * 0.12);
      this.ctx.fillRect(screenX + TILE_SIZE * 0.05, screenY - TILE_SIZE * 0.1, TILE_SIZE * 0.1, TILE_SIZE * 0.12);

      this.ctx.fillStyle = '#DC143C';
      this.ctx.fillRect(screenX - TILE_SIZE * 0.2, screenY + TILE_SIZE * 0.1, TILE_SIZE * 0.4, TILE_SIZE * 0.25);

      this.ctx.fillStyle = '#FFFFFF';
      for (let i = 0; i < 3; i++) {
        this.ctx.fillRect(
          screenX - TILE_SIZE * 0.15 + i * TILE_SIZE * 0.15,
          screenY + TILE_SIZE * 0.12,
          TILE_SIZE * 0.05,
          TILE_SIZE * 0.12
        );
      }
    }
  }

  private drawPlayer(state: GameState): void {
    const { player } = state;
    const screenX = player.x * TILE_SIZE + TILE_SIZE / 2;
    const screenY = player.y * TILE_SIZE + TILE_SIZE / 2;

    const currentRotation = player.rotation + (player.targetRotation - player.rotation) * player.rotationProgress;

    this.ctx.save();
    this.ctx.translate(screenX, screenY);
    this.ctx.rotate((currentRotation * Math.PI) / 180);

    this.ctx.fillStyle = '#4169E1';
    this.ctx.beginPath();
    this.ctx.moveTo(0, -TILE_SIZE * 0.4);
    this.ctx.lineTo(-TILE_SIZE * 0.3, TILE_SIZE * 0.3);
    this.ctx.lineTo(0, TILE_SIZE * 0.1);
    this.ctx.lineTo(TILE_SIZE * 0.3, TILE_SIZE * 0.3);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.strokeStyle = '#1E90FF';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    this.ctx.restore();
  }

  private drawLighting(state: GameState): void {
    const { map, player, doors } = state;
    const px = player.x * TILE_SIZE + TILE_SIZE / 2;
    const py = player.y * TILE_SIZE + TILE_SIZE / 2;
    const radius = player.torchRadius * TILE_SIZE;

    this.lightCtx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    this.lightCtx.fillStyle = 'rgba(0, 0, 0, 0.92)';
    this.lightCtx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    this.lightCtx.globalCompositeOperation = 'destination-out';

    const rayCount = 360;
    for (let i = 0; i < rayCount; i++) {
      const angle = (i / rayCount) * Math.PI * 2;
      let hitHighWall = false;
      let dist = 0;
      const step = TILE_SIZE * 0.1;
      const maxDist = radius + TILE_SIZE;

      while (dist < maxDist && !hitHighWall) {
        const sampleX = px + Math.cos(angle) * dist;
        const sampleY = py + Math.sin(angle) * dist;
        const tileX = Math.floor(sampleX / TILE_SIZE);
        const tileY = Math.floor(sampleY / TILE_SIZE);

        if (tileX >= 0 && tileX < MAP_SIZE && tileY >= 0 && tileY < MAP_SIZE) {
          const tile = map[tileY][tileX];
          if (tile.type === TileType.HIGH_WALL) {
            const door = doors.find((d) => d.x === tileX && d.y === tileY);
            if (!door || !door.open) {
              hitHighWall = true;
            }
          }
        } else {
          hitHighWall = true;
        }
        dist += step;
      }

      const alpha = 1;
      this.lightCtx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      this.lightCtx.lineWidth = 3;
      this.lightCtx.beginPath();
      this.lightCtx.moveTo(px, py);
      this.lightCtx.lineTo(px + Math.cos(angle) * dist, py + Math.sin(angle) * dist);
      this.lightCtx.stroke();
    }

    this.lightCtx.globalCompositeOperation = 'source-over';

    const gradient = this.lightCtx.createRadialGradient(px, py, 0, px, py, radius);
    gradient.addColorStop(0, 'rgba(255, 238, 136, 0.6)');
    gradient.addColorStop(0.7, 'rgba(255, 200, 100, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.1)');

    this.lightCtx.globalCompositeOperation = 'source-in';
    this.lightCtx.fillStyle = gradient;
    this.lightCtx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    this.lightCtx.globalCompositeOperation = 'source-over';

    this.ctx.drawImage(this.lightCanvas, 0, 0);
  }

  private drawParticles(state: GameState): void {
    for (const particle of state.particles) {
      const alpha = particle.life / particle.maxLife;
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = particle.color;
      this.ctx.fillRect(
        particle.x - particle.size / 2,
        particle.y - particle.size / 2,
        particle.size,
        particle.size
      );
    }
    this.ctx.globalAlpha = 1;
  }

  private drawGrid(): void {
    this.ctx.strokeStyle = '#444444';
    this.ctx.lineWidth = 1;

    for (let x = 0; x <= MAP_SIZE; x++) {
      this.ctx.beginPath();
      this.ctx.moveTo(x * TILE_SIZE, 0);
      this.ctx.lineTo(x * TILE_SIZE, CANVAS_SIZE);
      this.ctx.stroke();
    }

    for (let y = 0; y <= MAP_SIZE; y++) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y * TILE_SIZE);
      this.ctx.lineTo(CANVAS_SIZE, y * TILE_SIZE);
      this.ctx.stroke();
    }
  }

  private drawDamageFlash(state: GameState): void {
    if (state.damageFlash <= 0) return;

    const alpha = state.damageFlash / 100;
    this.ctx.save();
    this.ctx.strokeStyle = `rgba(255, 0, 0, ${alpha})`;
    this.ctx.lineWidth = 40;
    this.ctx.strokeRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    this.ctx.restore();
  }

  private drawPickupEffect(state: GameState): void {
    if (!state.pickupEffect) return;

    const { pickupEffect } = state;
    const progress = 1 - pickupEffect.timer / 1000;
    const centerX = CANVAS_SIZE / 2;
    const centerY = CANVAS_SIZE / 2 - progress * 50;
    const alpha = 1 - progress;

    this.ctx.globalAlpha = alpha;

    if (pickupEffect.type === ItemType.TORCH_BOOST) {
      this.ctx.fillStyle = '#FFD700';
      this.ctx.beginPath();
      this.ctx.arc(centerX - 50, centerY, 20, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = '#FFD700';
      this.ctx.font = 'bold 20px "Courier New", monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('火炬强化!', centerX + 20, centerY + 7);
    } else {
      this.ctx.fillStyle = '#228B22';
      this.ctx.beginPath();
      this.ctx.ellipse(centerX - 50, centerY, 12, 16, 0, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = '#228B22';
      this.ctx.font = 'bold 20px "Courier New", monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('生命药水!', centerX + 20, centerY + 7);
    }

    this.ctx.globalAlpha = 1;
  }

  private drawMinimap(state: GameState): void {
    const minimapSize = 120;
    const tileSize = minimapSize / MAP_SIZE;
    const offsetX = CANVAS_SIZE - minimapSize - 16;
    const offsetY = 16;

    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(offsetX - 2, offsetY - 2, minimapSize + 4, minimapSize + 4);

    this.ctx.fillStyle = '#1a1a2a';
    this.ctx.fillRect(offsetX, offsetY, minimapSize, minimapSize);

    for (let y = 0; y < MAP_SIZE; y++) {
      for (let x = 0; x < MAP_SIZE; x++) {
        const tile = state.map[y][x];
        if (tile.explored) {
          this.ctx.fillStyle = '#cccccc';
          this.ctx.fillRect(
            offsetX + x * tileSize,
            offsetY + y * tileSize,
            tileSize,
            tileSize
          );
        }
      }
    }

    this.ctx.fillStyle = '#4169E1';
    this.ctx.fillRect(
      offsetX + state.player.x * tileSize - 1,
      offsetY + state.player.y * tileSize - 1,
      tileSize + 2,
      tileSize + 2
    );
  }
}
