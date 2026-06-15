import { TILE_SIZE, Tile, Player, CrystalOre, Tower, Enemy, Bullet, Particle } from './entities';

const COLORS = {
  SKY: '#1A1A2E',
  GRASS: '#336633',
  GRASS_DARK: '#264d26',
  ROCK: '#666666',
  ROCK_DARK: '#4d4d4d',
  CRYSTAL: '#FFCC00',
  CRYSTAL_GLOW: '#FFE88A',
  PLAYER_BODY: '#88CCFF',
  PLAYER_HEAD: '#FFE4B5',
  PLAYER_GLOW: '#88FFFF',
  TOWER_DIAMOND: '#FFDD44',
  TOWER_GLOW: '#FFFF88',
  ENEMY_BODY: '#4A0033',
  ENEMY_DARK: '#330022',
  ENEMY_EYES: '#FF0033',
  BULLET: '#FFDD44',
  BULLET_TRAIL: '#FFEE88',
  UI_HEART: '#FF3355',
  UI_HEART_EMPTY: '#331111',
  UI_TEXT: '#FFFFFF',
  MINIMAP_BG: 'rgba(0,0,0,0.7)',
  MINIMAP_BORDER: '#444444'
};

export interface Camera {
  x: number;
  y: number;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  public width: number;
  public height: number;
  private stars: { x: number; y: number; size: number; twinkle: number }[] = [];
  public lodEnabled: boolean = false;
  public entityCount: number = 0;

  constructor(canvas: HTMLCanvasElement, width: number, height: number) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.generateStars();
  }

  private generateStars(): void {
    this.stars = [];
    for (let i = 0; i < 200; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: Math.random() < 0.8 ? 1 : 2,
        twinkle: Math.random() * Math.PI * 2
      });
    }
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.generateStars();
  }

  clear(): void {
    this.ctx.fillStyle = COLORS.SKY;
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.drawStars();
  }

  private drawStars(): void {
    const time = Date.now() * 0.001;
    for (const star of this.stars) {
      const alpha = 0.3 + 0.5 * Math.abs(Math.sin(time * 2 + star.twinkle));
      this.ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      this.ctx.fillRect(Math.floor(star.x), Math.floor(star.y), star.size, star.size);
    }
  }

  worldToScreen(worldX: number, worldY: number, camera: Camera): { x: number; y: number } {
    return {
      x: worldX - camera.x + this.width / 2,
      y: worldY - camera.y + this.height / 2
    };
  }

  screenToWorld(screenX: number, screenY: number, camera: Camera): { x: number; y: number } {
    return {
      x: screenX + camera.x - this.width / 2,
      y: screenY + camera.y - this.height / 2
    };
  }

  private isInView(x: number, y: number, margin: number, camera: Camera): boolean {
    const sx = x - camera.x + this.width / 2;
    const sy = y - camera.y + this.height / 2;
    return sx > -margin && sx < this.width + margin && sy > -margin && sy < this.height + margin;
  }

  drawTiles(tiles: Map<string, Tile>, camera: Camera): void {
    const startTileX = Math.floor((camera.x - this.width / 2) / TILE_SIZE) - 1;
    const startTileY = Math.floor((camera.y - this.height / 2) / TILE_SIZE) - 1;
    const endTileX = Math.ceil((camera.x + this.width / 2) / TILE_SIZE) + 1;
    const endTileY = Math.ceil((camera.y + this.height / 2) / TILE_SIZE) + 1;

    for (let ty = startTileY; ty <= endTileY; ty++) {
      for (let tx = startTileX; tx <= endTileX; tx++) {
        const key = `${tx},${ty}`;
        const tile = tiles.get(key);

        if (!tile) {
          const { x, y } = this.worldToScreen(tx * TILE_SIZE, ty * TILE_SIZE, camera);
          const gradient = this.ctx.createRadialGradient(
            x + TILE_SIZE / 2, y + TILE_SIZE / 2, 0,
            x + TILE_SIZE / 2, y + TILE_SIZE / 2, TILE_SIZE
          );
          gradient.addColorStop(0, 'rgba(80, 80, 150, 0.15)');
          gradient.addColorStop(1, 'rgba(30, 30, 60, 0.05)');
          this.ctx.fillStyle = gradient;
          this.ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
          continue;
        }

        const { x, y } = this.worldToScreen(tile.x * TILE_SIZE, tile.y * TILE_SIZE, camera);

        if (tile.generateProgress < 1) {
          const p = tile.generateProgress;
          this.ctx.save();
          this.ctx.beginPath();
          this.ctx.rect(x, y, TILE_SIZE, TILE_SIZE);
          this.ctx.clip();
          this.drawTileContent(tile, x, y);

          const noiseSize = 2;
          for (let ny = 0; ny < TILE_SIZE; ny += noiseSize) {
            for (let nx = 0; nx < TILE_SIZE; nx += noiseSize) {
              const noiseVal = (Math.sin(tile.noiseSeed + nx * 0.3 + ny * 0.2) * 0.5 + 0.5);
              if (noiseVal > p * 1.2 - 0.1) {
                this.ctx.fillStyle = `rgba(200, 200, 255, ${0.3 + 0.3 * (1 - p)})`;
                this.ctx.fillRect(x + nx, y + ny, noiseSize, noiseSize);
              }
            }
          }
          this.ctx.restore();
        } else {
          this.drawTileContent(tile, x, y);
        }
      }
    }
  }

  private drawTileContent(tile: Tile, x: number, y: number): void {
    switch (tile.type) {
      case 'grass':
        this.ctx.fillStyle = COLORS.GRASS;
        this.ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        const seed = tile.noiseSeed;
        for (let i = 0; i < 4; i++) {
          const gx = x + Math.floor(((Math.sin(seed + i * 1.7) + 1) * 0.5) * (TILE_SIZE - 2));
          const gy = y + Math.floor(((Math.sin(seed + i * 2.3) + 1) * 0.5) * (TILE_SIZE - 2));
          this.ctx.fillStyle = COLORS.GRASS_DARK;
          this.ctx.fillRect(gx, gy, 2, 1);
        }
        break;

      case 'rock':
        this.ctx.fillStyle = COLORS.GRASS;
        this.ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        this.ctx.fillStyle = COLORS.ROCK;
        this.ctx.fillRect(x + 2, y + 3, 12, 11);
        this.ctx.fillStyle = COLORS.ROCK_DARK;
        this.ctx.fillRect(x + 2, y + 11, 12, 3);
        this.ctx.fillRect(x + 11, y + 3, 3, 8);
        this.ctx.fillStyle = '#7a7a7a';
        this.ctx.fillRect(x + 3, y + 4, 4, 2);
        break;

      case 'crystal':
        this.ctx.fillStyle = COLORS.GRASS;
        this.ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        break;
    }
  }

  drawCrystalOres(ores: CrystalOre[], camera: Camera): void {
    for (const ore of ores) {
      if (ore.collected) continue;
      if (!this.isInView(ore.x, ore.y, TILE_SIZE * 2, camera)) continue;

      const { x, y } = this.worldToScreen(ore.x, ore.y, camera);
      const pulse = 0.7 + 0.3 * Math.sin(ore.pulsePhase);
      const scale = ore.isHarvesting ? Math.max(0, 1 - ore.harvestAnimation) : 1;

      const glowRadius = 10 * pulse * scale;
      const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, glowRadius);
      gradient.addColorStop(0, `rgba(255, 230, 100, ${0.5 * pulse * scale})`);
      gradient.addColorStop(1, 'rgba(255, 200, 0, 0)');
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(x - glowRadius, y - glowRadius, glowRadius * 2, glowRadius * 2);

      this.ctx.save();
      this.ctx.translate(x, y);
      this.ctx.scale(scale, scale);

      const flash = ore.isHarvesting ? (Math.sin(ore.harvestAnimation * 30) > 0 ? 1 : 0.7) : 1;
      this.ctx.fillStyle = ore.isHarvesting && flash > 0.9 ? '#FFFFFF' : COLORS.CRYSTAL;
      this.ctx.beginPath();
      this.ctx.moveTo(0, -5);
      this.ctx.lineTo(3, -1);
      this.ctx.lineTo(2, 4);
      this.ctx.lineTo(-2, 4);
      this.ctx.lineTo(-3, -1);
      this.ctx.closePath();
      this.ctx.fill();

      this.ctx.fillStyle = COLORS.CRYSTAL_GLOW;
      this.ctx.fillRect(-1, -3, 1, 3);

      this.ctx.restore();
    }
  }

  drawPlayer(player: Player, camera: Camera): void {
    const { x, y } = this.worldToScreen(player.x, player.y, camera);
    const glowR = 25 * player.glowIntensity;
    const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, glowR);
    gradient.addColorStop(0, `rgba(136, 255, 255, ${0.4 * player.glowIntensity})`);
    gradient.addColorStop(1, 'rgba(136, 255, 255, 0)');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(x - glowR, y - glowR, glowR * 2, glowR * 2);

    if (player.invincibleTimer > 0 && Math.floor(player.invincibleTimer * 10) % 2 === 0) {
      return;
    }

    this.ctx.save();
    this.ctx.translate(x, y);

    const walkBob = player.animationState !== 'idle' ? Math.sin(player.animationFrame * Math.PI / 2) * 1 : 0;
    const armSwing = player.animationState !== 'idle' ? Math.sin(player.animationFrame * Math.PI / 2) * 2 : 0;

    this.ctx.fillStyle = COLORS.PLAYER_BODY;
    this.ctx.fillRect(-3, -2 + walkBob, 6, 7);

    this.ctx.fillStyle = COLORS.PLAYER_HEAD;
    this.ctx.fillRect(-3, -8 + walkBob, 6, 6);

    this.ctx.fillStyle = '#000';
    if (player.facing === 'left') {
      this.ctx.fillRect(-2, -6 + walkBob, 1, 2);
    } else if (player.facing === 'right') {
      this.ctx.fillRect(1, -6 + walkBob, 1, 2);
    } else if (player.facing === 'up') {
      this.ctx.fillStyle = COLORS.PLAYER_HEAD;
      this.ctx.fillRect(-3, -8 + walkBob, 6, 6);
    } else {
      this.ctx.fillRect(-2, -6 + walkBob, 1, 2);
      this.ctx.fillRect(1, -6 + walkBob, 1, 2);
    }

    this.ctx.fillStyle = COLORS.PLAYER_BODY;
    this.ctx.fillRect(-4, -1 + walkBob + armSwing, 2, 4);
    this.ctx.fillRect(2, -1 + walkBob - armSwing, 2, 4);

    this.ctx.fillStyle = '#4488BB';
    if (player.animationState === 'walk_left' || player.animationState === 'walk_right') {
      const legOffset = player.animationFrame % 2 === 0 ? 1 : -1;
      this.ctx.fillRect(-2, 5 + walkBob, 2, 3 + legOffset);
      this.ctx.fillRect(0, 5 + walkBob, 2, 3 - legOffset);
    } else if (player.animationState === 'walk_up' || player.animationState === 'walk_down') {
      const legOffset = player.animationFrame % 2 === 0 ? 1 : -1;
      this.ctx.fillRect(-2, 5 + walkBob, 2, 3 + legOffset);
      this.ctx.fillRect(0, 5 + walkBob, 2, 3 - legOffset);
    } else {
      this.ctx.fillRect(-2, 5, 2, 3);
      this.ctx.fillRect(0, 5, 2, 3);
    }

    this.ctx.restore();
  }

  drawTowers(towers: Tower[], camera: Camera): void {
    for (const tower of towers) {
      if (!this.isInView(tower.x, tower.y, TILE_SIZE * 3, camera)) continue;

      const { x, y } = this.worldToScreen(tower.x, tower.y, camera);

      const buildY = tower.isBuilding ? (1 - tower.buildProgress) * 20 : 0;
      const buildAlpha = tower.isBuilding ? Math.min(1, tower.buildProgress * 1.5) : 1;

      const glowR = 20;
      const gradient = this.ctx.createRadialGradient(x, y + 5 - buildY, 0, x, y + 5 - buildY, glowR);
      gradient.addColorStop(0, `rgba(255, 255, 136, ${0.35 * buildAlpha})`);
      gradient.addColorStop(1, 'rgba(255, 255, 136, 0)');
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(x - glowR, y + 5 - buildY - glowR, glowR * 2, glowR * 2);

      this.ctx.save();
      this.ctx.globalAlpha = buildAlpha;
      this.ctx.translate(x, y - buildY);

      this.ctx.strokeStyle = 'rgba(255, 255, 136, 0.4)';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.ellipse(0, 6, 8, 3, 0, 0, Math.PI * 2);
      this.ctx.stroke();

      this.ctx.fillStyle = COLORS.TOWER_DIAMOND;
      this.ctx.beginPath();
      const rotAngle = tower.isBuilding ? 0 : tower.rotation * 0.3;
      for (let i = 0; i < 4; i++) {
        const angle = rotAngle + i * Math.PI / 2;
        const r = 5;
        const px = Math.cos(angle) * r;
        const py = Math.sin(angle) * r;
        if (i === 0) this.ctx.moveTo(px, py);
        else this.ctx.lineTo(px, py);
      }
      this.ctx.closePath();
      this.ctx.fill();

      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const angle = rotAngle + i * Math.PI / 2;
        const r = 2;
        const px = Math.cos(angle) * r * 0.5;
        const py = Math.sin(angle) * r * 0.5 - 1;
        if (i === 0) this.ctx.moveTo(px, py);
        else this.ctx.lineTo(px, py);
      }
      this.ctx.closePath();
      this.ctx.fill();

      if (tower.hp < tower.maxHp) {
        this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
        this.ctx.fillRect(-6, -12, 12, 2);
        this.ctx.fillStyle = '#44FF44';
        this.ctx.fillRect(-6, -12, (12 * tower.hp) / tower.maxHp, 2);
      }

      this.ctx.restore();
    }
  }

  drawEnemies(enemies: Enemy[], camera: Camera): void {
    for (const enemy of enemies) {
      if (!this.isInView(enemy.x, enemy.y, TILE_SIZE, camera)) continue;
      enemy.lodLevel = this.lodEnabled && this.entityCount > 500 ? 1 : 0;

      const { x, y } = this.worldToScreen(enemy.x, enemy.y, camera);
      const wobble = Math.sin(enemy.wobblePhase) * 1;

      this.ctx.save();
      this.ctx.translate(x, y + wobble);

      if (enemy.lodLevel === 0) {
        this.ctx.fillStyle = COLORS.ENEMY_BODY;
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, 6, 5, 0, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = COLORS.ENEMY_DARK;
        this.ctx.fillRect(-5, 2, 10, 3);

        const eyePulse = 0.6 + 0.4 * Math.sin(enemy.eyePulse);
        this.ctx.fillStyle = `rgba(255, 0, 51, ${eyePulse})`;
        this.ctx.fillRect(-3, -2, 2, 2);
        this.ctx.fillRect(1, -2, 2, 2);

        this.ctx.fillStyle = `rgba(255, 100, 100, ${eyePulse * 0.5})`;
        this.ctx.fillRect(-3, -2, 1, 1);
        this.ctx.fillRect(1, -2, 1, 1);
      } else {
        this.ctx.fillStyle = COLORS.ENEMY_BODY;
        this.ctx.fillRect(-4, -4, 8, 8);
        this.ctx.fillStyle = COLORS.ENEMY_EYES;
        this.ctx.fillRect(-2, -1, 1, 1);
        this.ctx.fillRect(1, -1, 1, 1);
      }

      if (enemy.hp < enemy.maxHp) {
        this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
        this.ctx.fillRect(-5, -9, 10, 2);
        this.ctx.fillStyle = '#FF4444';
        this.ctx.fillRect(-5, -9, (10 * enemy.hp) / enemy.maxHp, 2);
      }

      this.ctx.restore();
    }
  }

  drawBullets(bullets: Bullet[], camera: Camera): void {
    for (const bullet of bullets) {
      if (!bullet.alive) continue;
      if (!this.isInView(bullet.x, bullet.y, 30, camera)) continue;

      const trail = bullet.trail;
      for (let i = 0; i < trail.length; i++) {
        const t = trail[i];
        const { x, y } = this.worldToScreen(t.x, t.y, camera);
        const alpha = (i + 1) / (trail.length + 1) * 0.6;
        this.ctx.fillStyle = `rgba(255, 221, 68, ${alpha})`;
        const size = 1 + Math.floor((i + 1) / trail.length * 2);
        this.ctx.fillRect(x - size / 2, y - size / 2, size, size);
      }

      const { x, y } = this.worldToScreen(bullet.x, bullet.y, camera);
      const glow = this.ctx.createRadialGradient(x, y, 0, x, y, 6);
      glow.addColorStop(0, 'rgba(255, 255, 136, 0.6)');
      glow.addColorStop(1, 'rgba(255, 221, 68, 0)');
      this.ctx.fillStyle = glow;
      this.ctx.fillRect(x - 6, y - 6, 12, 12);

      this.ctx.fillStyle = COLORS.BULLET;
      this.ctx.fillRect(x - 1, y - 1, 3, 3);
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.fillRect(x, y, 1, 1);
    }
  }

  drawParticles(particles: Particle[], camera: Camera): void {
    const reducedAlpha = this.lodEnabled && this.entityCount > 500 ? 0.5 : 1;
    for (const p of particles) {
      if (!this.isInView(p.x, p.y, 20, camera)) continue;
      const { x, y } = this.worldToScreen(p.x, p.y, camera);
      const alpha = p.getAlpha() * reducedAlpha;

      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.translate(x, y);
      this.ctx.rotate(p.rotation);
      this.ctx.fillStyle = p.color;
      const s = Math.max(1, Math.floor(p.size));
      this.ctx.fillRect(-s / 2, -s / 2, s, s);
      this.ctx.restore();
    }
  }

  drawUI(player: Player, crystals: number, wave: number, buildMode: boolean): void {
    this.ctx.save();

    this.ctx.fillStyle = 'rgba(0,0,0,0.4)';
    this.ctx.fillRect(8, 8, 120, 56);
    this.ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    this.ctx.strokeRect(8, 8, 120, 56);

    for (let i = 0; i < player.maxHp; i++) {
      const hx = 14 + i * 22;
      const hy = 14;
      const filled = i < player.hp;
      this.drawPixelHeart(hx, hy, filled);
    }

    this.ctx.fillStyle = COLORS.UI_TEXT;
    this.ctx.font = 'bold 12px "Courier New", monospace';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(`💎 ${crystals}`, 14, 38);
    this.ctx.fillText(`WAVE ${wave}`, 14, 52);

    if (buildMode) {
      this.ctx.fillStyle = 'rgba(255, 221, 68, 0.9)';
      this.ctx.font = 'bold 11px "Courier New", monospace';
      this.ctx.fillText('[1]建造模式  消耗:3💎', 14, 68);
    }

    this.ctx.restore();
  }

  private drawPixelHeart(x: number, y: number, filled: boolean): void {
    const color = filled ? COLORS.UI_HEART : COLORS.UI_HEART_EMPTY;
    const c = filled ? '#FF6677' : color;
    this.ctx.fillStyle = color;

    const h = [
      [0, 1, 1, 0, 0, 1, 1, 0],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [0, 1, 1, 1, 1, 1, 1, 0],
      [0, 0, 1, 1, 1, 1, 0, 0],
      [0, 0, 0, 1, 1, 0, 0, 0]
    ];

    for (let row = 0; row < h.length; row++) {
      for (let col = 0; col < h[row].length; col++) {
        if (h[row][col]) {
          this.ctx.fillRect(x + col * 2, y + row * 2, 2, 2);
        }
      }
    }
    if (filled) {
      this.ctx.fillStyle = c;
      this.ctx.fillRect(x + 2, y + 2, 2, 2);
    }
  }

  drawMinimap(
    tiles: Map<string, Tile>,
    player: Player,
    towers: Tower[],
    enemies: Enemy[],
    camera: Camera
  ): void {
    const mapW = 130;
    const mapH = 90;
    const mapX = this.width - mapW - 10;
    const mapY = 10;
    const scale = 2;

    this.ctx.fillStyle = COLORS.MINIMAP_BG;
    this.ctx.fillRect(mapX, mapY, mapW, mapH);
    this.ctx.strokeStyle = COLORS.MINIMAP_BORDER;
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(mapX, mapY, mapW, mapH);

    const centerTX = Math.floor(player.x / TILE_SIZE);
    const centerTY = Math.floor(player.y / TILE_SIZE);
    const halfTW = Math.floor(mapW / scale / 2);
    const halfTH = Math.floor(mapH / scale / 2);

    for (let ty = centerTY - halfTH; ty <= centerTY + halfTH; ty++) {
      for (let tx = centerTX - halfTW; tx <= centerTX + halfTW; tx++) {
        const tile = tiles.get(`${tx},${ty}`);
        const px = mapX + mapW / 2 + (tx - centerTX) * scale;
        const py = mapY + mapH / 2 + (ty - centerTY) * scale;
        if (px < mapX || px >= mapX + mapW || py < mapY || py >= mapY + mapH) continue;

        if (tile) {
          switch (tile.type) {
            case 'grass': this.ctx.fillStyle = '#2d5a2d'; break;
            case 'rock': this.ctx.fillStyle = '#555555'; break;
            case 'crystal': this.ctx.fillStyle = '#FFDD00'; break;
            default: this.ctx.fillStyle = '#1a1a1a';
          }
        } else {
          this.ctx.fillStyle = '#0d0d1a';
        }
        this.ctx.fillRect(Math.floor(px), Math.floor(py), scale, scale);
      }
    }

    for (const tower of towers) {
      const tx = Math.floor(tower.x / TILE_SIZE);
      const ty = Math.floor(tower.y / TILE_SIZE);
      const px = mapX + mapW / 2 + (tx - centerTX) * scale;
      const py = mapY + mapH / 2 + (ty - centerTY) * scale;
      if (px >= mapX && px < mapX + mapW && py >= mapY && py < mapY + mapH) {
        this.ctx.fillStyle = '#FFDD44';
        this.ctx.fillRect(Math.floor(px), Math.floor(py), scale, scale);
      }
    }

    for (const enemy of enemies) {
      const tx = Math.floor(enemy.x / TILE_SIZE);
      const ty = Math.floor(enemy.y / TILE_SIZE);
      const px = mapX + mapW / 2 + (tx - centerTX) * scale;
      const py = mapY + mapH / 2 + (ty - centerTY) * scale;
      if (px >= mapX && px < mapX + mapW && py >= mapY && py < mapY + mapH) {
        this.ctx.fillStyle = '#FF3344';
        this.ctx.fillRect(Math.floor(px), Math.floor(py), scale, scale);
      }
    }

    this.ctx.fillStyle = '#44FF66';
    this.ctx.fillRect(
      Math.floor(mapX + mapW / 2 - scale / 2),
      Math.floor(mapY + mapH / 2 - scale / 2),
      scale + 1, scale + 1
    );
  }

  drawBuildPreview(mouseWorldX: number, mouseWorldY: number, camera: Camera, valid: boolean, canAfford: boolean): void {
    const tx = Math.floor(mouseWorldX / TILE_SIZE);
    const ty = Math.floor(mouseWorldY / TILE_SIZE);
    const { x, y } = this.worldToScreen(tx * TILE_SIZE, ty * TILE_SIZE, camera);

    const color = valid && canAfford ? 'rgba(100, 255, 100, 0.4)' : 'rgba(255, 80, 80, 0.4)';
    const borderColor = valid && canAfford ? 'rgba(100, 255, 100, 0.8)' : 'rgba(255, 80, 80, 0.8)';

    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    this.ctx.strokeStyle = borderColor;
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x + 0.5, y + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);

    if (valid && canAfford) {
      this.ctx.save();
      this.ctx.globalAlpha = 0.6;
      this.ctx.translate(x + TILE_SIZE / 2, y + TILE_SIZE / 2);
      this.ctx.fillStyle = COLORS.TOWER_DIAMOND;
      this.ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const angle = i * Math.PI / 2;
        const px = Math.cos(angle) * 5;
        const py = Math.sin(angle) * 5;
        if (i === 0) this.ctx.moveTo(px, py);
        else this.ctx.lineTo(px, py);
      }
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  drawGameOver(animationProgress: number, restartCallback?: () => void, canvas?: HTMLCanvasElement): { buttonRect: { x: number; y: number; w: number; h: number } } | null {
    if (animationProgress <= 0) return null;

    const fadeIn = Math.min(1, animationProgress * 2);
    this.ctx.fillStyle = `rgba(0, 0, 0, ${0.7 * fadeIn})`;
    this.ctx.fillRect(0, 0, this.width, this.height);

    if (animationProgress < 0.3) return null;

    const textProgress = Math.min(1, (animationProgress - 0.3) * 1.5);
    const shatterProgress = textProgress > 0.7 ? (textProgress - 0.7) * 3.33 : 0;
    const scale = 0.5 + textProgress * 1.5;

    this.ctx.save();
    this.ctx.translate(this.width / 2, this.height / 2 - 30);
    this.ctx.scale(scale, scale);
    this.ctx.globalAlpha = Math.max(0, 1 - shatterProgress * 0.5);

    const text = 'GAME OVER';
    const letterSpacing = 8;
    const totalW = text.length * letterSpacing;

    for (let i = 0; i < text.length; i++) {
      const lx = -totalW / 2 + i * letterSpacing;
      const shatterX = shatterProgress > 0 ? (Math.sin(i * 2.3 + shatterProgress * 10) * shatterProgress * 40) : 0;
      const shatterY = shatterProgress > 0 ? (Math.cos(i * 3.1 + shatterProgress * 8) * shatterProgress * 30) : 0;
      const shatterR = shatterProgress > 0 ? (Math.sin(i * 1.7 + shatterProgress * 12) * shatterProgress * 0.5) : 0;
      const letterAlpha = Math.max(0, 1 - shatterProgress * 0.8);

      this.ctx.save();
      this.ctx.translate(lx + shatterX, shatterY);
      this.ctx.rotate(shatterR);
      this.ctx.globalAlpha = letterAlpha;

      this.ctx.fillStyle = '#FF3355';
      this.ctx.font = 'bold 16px "Courier New", monospace';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(text[i], 0, 0);

      this.ctx.fillStyle = 'rgba(255, 100, 100, 0.5)';
      this.ctx.fillText(text[i], 1, 1);

      this.ctx.restore();
    }

    this.ctx.restore();

    if (textProgress < 0.6) return null;

    const btnW = 140;
    const btnH = 36;
    const btnX = this.width / 2 - btnW / 2;
    const btnY = this.height / 2 + 30;
    const btnAlpha = Math.min(1, (textProgress - 0.6) * 2.5);

    this.ctx.save();
    this.ctx.globalAlpha = btnAlpha;

    this.ctx.fillStyle = '#333344';
    this.ctx.fillRect(btnX, btnY, btnW, btnH);
    this.ctx.strokeStyle = '#FFDD44';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(btnX + 1, btnY + 1, btnW - 2, btnH - 2);

    this.ctx.fillStyle = '#FFDD44';
    this.ctx.font = 'bold 14px "Courier New", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('重新开始', this.width / 2, btnY + btnH / 2);

    this.ctx.restore();

    return { buttonRect: { x: btnX, y: btnY, w: btnW, h: btnH } };
  }

  checkRestartClick(mx: number, my: number, buttonRect: { x: number; y: number; w: number; h: number } | undefined): boolean {
    if (!buttonRect) return false;
    return mx >= buttonRect.x && mx <= buttonRect.x + buttonRect.w &&
           my >= buttonRect.y && my <= buttonRect.y + buttonRect.h;
  }

  drawHarvestHint(x: number, y: number, camera: Camera): void {
    const { x: sx, y: sy } = this.worldToScreen(x, y - TILE_SIZE - 4, camera);
    const pulse = 0.7 + 0.3 * Math.sin(Date.now() * 0.008);
    this.ctx.save();
    this.ctx.globalAlpha = pulse;
    this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
    this.ctx.fillRect(sx - 12, sy - 7, 24, 12);
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = 'bold 10px "Courier New", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('E', sx, sy - 1);
    this.ctx.restore();
  }
}
