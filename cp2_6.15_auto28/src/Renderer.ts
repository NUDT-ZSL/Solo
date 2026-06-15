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
  private lightCanvas: HTMLCanvasElement;
  private lightCtx: CanvasRenderingContext2D;
  private lightVisibility: number[][];

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.lightCanvas = document.createElement('canvas');
    this.lightCanvas.width = CANVAS_SIZE;
    this.lightCanvas.height = CANVAS_SIZE;
    this.lightCtx = this.lightCanvas.getContext('2d')!;
    this.lightVisibility = [];
    for (let y = 0; y < MAP_SIZE; y++) {
      this.lightVisibility[y] = [];
      for (let x = 0; x < MAP_SIZE; x++) {
        this.lightVisibility[y][x] = 0;
      }
    }
  }

  render(state: GameState): void {
    this.ctx.fillStyle = '#3a2a1a';
    this.ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    this.computeLightVisibility(state);
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

  private computeLightVisibility(state: GameState): void {
    const { map, player, doors } = state;
    const px = player.x;
    const py = player.y;
    const radius = player.torchRadius;

    for (let y = 0; y < MAP_SIZE; y++) {
      for (let x = 0; x < MAP_SIZE; x++) {
        this.lightVisibility[y][x] = 0;
      }
    }

    this.lightVisibility[py][px] = 1;

    const rayCount = 360;
    for (let i = 0; i < rayCount; i++) {
      const angle = (i / rayCount) * Math.PI * 2;
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);

      let currentDist = 0;
      const step = 0.05;
      let blocked = false;
      let lightMultiplier = 1.0;
      let lastLowWallTile = '';

      while (currentDist <= radius && !blocked) {
        const sampleX = px + dx * currentDist;
        const sampleY = py + dy * currentDist;
        const tileX = Math.floor(sampleX);
        const tileY = Math.floor(sampleY);

        if (tileX < 0 || tileX >= MAP_SIZE || tileY < 0 || tileY >= MAP_SIZE) {
          blocked = true;
          break;
        }

        const tile = map[tileY][tileX];
        const tileKey = `${tileX},${tileY}`;
        const attenuation = Math.max(0, 1 - currentDist / radius);
        const door = doors.find((d) => d.x === tileX && d.y === tileY);

        if (tile.type === TileType.LOW_WALL && !door) {
          if (tileKey !== lastLowWallTile) {
            lightMultiplier *= 0.3;
            lastLowWallTile = tileKey;
          }
        }

        const finalAttenuation = attenuation * lightMultiplier;
        if (this.lightVisibility[tileY][tileX] < finalAttenuation) {
          this.lightVisibility[tileY][tileX] = finalAttenuation;
        }

        if (tile.type === TileType.HIGH_WALL) {
          if (!door || !door.open) {
            blocked = true;
          }
        }

        currentDist += step;
      }
    }
  }

  private drawMap(state: GameState): void {
    const { map, doors } = state;

    for (let y = 0; y < MAP_SIZE; y++) {
      for (let x = 0; x < MAP_SIZE; x++) {
        const tile = map[y][x];
        const visibility = this.lightVisibility[y][x];
        const explored = tile.explored;

        if (!explored && visibility <= 0) continue;

        const screenX = x * TILE_SIZE;
        const screenY = y * TILE_SIZE;

        let color = '#2a2a2a';
        switch (tile.type) {
          case TileType.FLOOR:
            color = '#2a2a2a';
            break;
          case TileType.LOW_WALL:
            color = visibility > 0 ? '#777777' : '#555555';
            break;
          case TileType.HIGH_WALL:
            color = visibility > 0 ? '#777777' : '#555555';
            break;
          case TileType.DOOR:
            color = '#8B4513';
            break;
        }

        if (visibility <= 0 && explored) {
          this.ctx.globalAlpha = 0.3;
        } else {
          this.ctx.globalAlpha = 1;
        }

        if (tile.type === TileType.DOOR) {
          const door = doors.find((d) => d.x === x && d.y === y);

          this.ctx.fillStyle = '#5a3513';
          this.ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);

          this.ctx.fillStyle = '#8B4513';
          this.ctx.fillRect(screenX + 2, screenY + 2, TILE_SIZE - 4, TILE_SIZE - 4);

          if (door) {
            if (!door.open) {
              this.ctx.fillStyle = '#6b3410';
              this.ctx.fillRect(
                screenX + Math.floor(TILE_SIZE / 2) - 1,
                screenY + 4,
                2,
                TILE_SIZE - 8
              );

              this.ctx.fillStyle = '#FFD700';
              this.ctx.fillRect(screenX + TILE_SIZE - 6, screenY + 4, 2, 2);
            } else {
              this.ctx.save();
              this.ctx.translate(screenX + 2, screenY + 2);
              this.ctx.rotate((door.rotation * Math.PI) / 180);
              this.ctx.fillStyle = '#8B4513';
              this.ctx.fillRect(0, 0, TILE_SIZE - 4, 3);
              this.ctx.restore();
            }
          }
        } else {
          this.ctx.fillStyle = color;
          this.ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
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
      if (this.lightVisibility[item.y]?.[item.x] <= 0) continue;

      const screenX = item.x * TILE_SIZE + TILE_SIZE / 2;
      const screenY = item.y * TILE_SIZE + TILE_SIZE / 2;

      if (item.type === ItemType.TORCH_BOOST) {
        const glowRadius = TILE_SIZE * 0.8;
        this.drawRadialGlow(screenX, screenY, glowRadius, [255, 215, 0], 0.6);

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

  private drawRadialGlow(
    cx: number,
    cy: number,
    radius: number,
    color: [number, number, number],
    maxAlpha: number
  ): void {
    const r = Math.ceil(radius);
    const x0 = Math.max(0, Math.floor(cx - r));
    const y0 = Math.max(0, Math.floor(cy - r));
    const x1 = Math.min(CANVAS_SIZE, Math.ceil(cx + r));
    const y1 = Math.min(CANVAS_SIZE, Math.ceil(cy + r));
    const w = x1 - x0;
    const h = y1 - y0;
    if (w <= 0 || h <= 0) return;

    const imageData = this.ctx.getImageData(x0, y0, w, h);
    const data = imageData.data;
    const [cr, cg, cb] = color;

    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const dx = px + x0 - cx;
        const dy = py + y0 - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > radius) continue;

        const t = 1 - dist / radius;
        const alpha = t * t * maxAlpha;
        const idx = (py * w + px) * 4;

        const dstR = data[idx];
        const dstG = data[idx + 1];
        const dstB = data[idx + 2];
        const dstA = data[idx + 3] / 255;

        const outA = alpha + dstA * (1 - alpha);
        if (outA <= 0) continue;

        data[idx] = (cr * alpha + dstR * dstA * (1 - alpha)) / outA;
        data[idx + 1] = (cg * alpha + dstG * dstA * (1 - alpha)) / outA;
        data[idx + 2] = (cb * alpha + dstB * dstA * (1 - alpha)) / outA;
        data[idx + 3] = outA * 255;
      }
    }

    this.ctx.putImageData(imageData, x0, y0);
  }

  private drawMonsters(state: GameState): void {
    const { monsters, player } = state;
    const px = player.x;
    const py = player.y;
    const radius = player.torchRadius;

    for (const monster of monsters) {
      const dist = Math.sqrt((monster.x - px) ** 2 + (monster.y - py) ** 2);
      if (dist > radius) continue;
      if (this.lightVisibility[monster.y]?.[monster.x] <= 0) continue;

      const screenX = monster.x * TILE_SIZE + TILE_SIZE / 2;
      const screenY = monster.y * TILE_SIZE + TILE_SIZE / 2;

      const blinkPhase = Math.sin((monster.blinkTimer / MONSTER_BLINK_PERIOD) * Math.PI * 2);
      if (blinkPhase > 0) {
        this.drawRadialGlow(screenX, screenY, TILE_SIZE, [255, 0, 0], 0.5);
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
    const { player } = state;
    const px = player.x * TILE_SIZE + TILE_SIZE / 2;
    const py = player.y * TILE_SIZE + TILE_SIZE / 2;
    const radius = player.torchRadius * TILE_SIZE;

    this.lightCtx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    this.lightCtx.fillStyle = 'rgba(0, 0, 0, 0.92)';
    this.lightCtx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    const r = Math.ceil(radius);
    const x0 = Math.max(0, Math.floor(px - r));
    const y0 = Math.max(0, Math.floor(py - r));
    const x1 = Math.min(CANVAS_SIZE, Math.ceil(px + r));
    const y1 = Math.min(CANVAS_SIZE, Math.ceil(py + r));
    const w = x1 - x0;
    const h = y1 - y0;

    if (w > 0 && h > 0) {
      const imageData = this.lightCtx.createImageData(w, h);
      const data = imageData.data;

      const centerR = 255;
      const centerG = 238;
      const centerB = 136;
      const centerA = 0.6;
      const edgeR = 0;
      const edgeG = 0;
      const edgeB = 0;
      const edgeA = 0.1;

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const screenX = x + x0;
          const screenY = y + y0;
          const tileX = Math.floor(screenX / TILE_SIZE);
          const tileY = Math.floor(screenY / TILE_SIZE);

          const dx = screenX - px;
          const dy = screenY - py;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const idx = (y * w + x) * 4;

          if (dist > radius) {
            data[idx] = 0;
            data[idx + 1] = 0;
            data[idx + 2] = 0;
            data[idx + 3] = 0;
            continue;
          }

          let visibility = 0;
          if (tileX >= 0 && tileX < MAP_SIZE && tileY >= 0 && tileY < MAP_SIZE) {
            visibility = this.lightVisibility[tileY][tileX];
          }

          const t = dist / radius;
          const invT = 1 - t;
          const lr = centerR * invT + edgeR * t;
          const lg = centerG * invT + edgeG * t;
          const lb = centerB * invT + edgeB * t;
          const la = centerA * invT + edgeA * t;

          const finalAlpha = la * visibility;

          data[idx] = lr;
          data[idx + 1] = lg;
          data[idx + 2] = lb;
          data[idx + 3] = Math.round(finalAlpha * 255);
        }
      }

      this.lightCtx.putImageData(imageData, x0, y0);
    }

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

    this.ctx.font = 'bold 10px "Courier New", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillStyle = '#e8d8a0';

    const currentRoom = state.rooms.find(
      (r) =>
        state.player.x >= r.x &&
        state.player.x < r.x + r.width &&
        state.player.y >= r.y &&
        state.player.y < r.y + r.height
    );
    const roomText = currentRoom ? `房间 ${currentRoom.id + 1}` : '走廊';
    this.ctx.fillText(roomText, offsetX + minimapSize / 2, offsetY + 12);

    const explorePercent = state.totalFloorCount > 0
      ? Math.round((state.exploredCount / state.totalFloorCount) * 100)
      : 0;
    this.ctx.fillText(
      `探索: ${explorePercent}%`,
      offsetX + minimapSize / 2,
      offsetY + minimapSize + 12
    );

    this.ctx.textAlign = 'start';
  }
}
