import Phaser from 'phaser';

export interface TileData {
  sprite: Phaser.Physics.Matter.Image;
  weight: number;
  color: number;
  stackLevel: number;
  wobbleTime: number;
  isOnTray: boolean;
  traySide: 'left' | 'right' | null;
  originalX: number;
  originalY: number;
}

const TILE_SIZE = 30;
const MAX_POOLED_TILES = 50;

const COLOR_START_R = 255;
const COLOR_START_G = 165;
const COLOR_START_B = 0;
const COLOR_END_R = 0;
const COLOR_END_G = 206;
const COLOR_END_B = 209;

export default class TileManager {
  private scene: Phaser.Scene;
  private pool: TileData[] = [];
  private activeTiles: TileData[] = [];
  private recycledTiles: TileData[] = [];
  private particleManager: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private tileGraphicsKey: string = 'tile_gfx';
  private maxRecycled: number = 10;
  private onRecycledFull: (() => void) | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createTileTexture();
    this.createParticleSystem();
    this.prePoolTiles();
  }

  setRecycledFullCallback(callback: () => void): void {
    this.onRecycledFull = callback;
  }

  getRecycledCount(): number {
    return this.recycledTiles.length;
  }

  getMaxRecycled(): number {
    return this.maxRecycled;
  }

  clearRecycled(): void {
    this.recycledTiles.forEach(tile => {
      if (tile.sprite.scene) {
        tile.sprite.destroy();
      }
    });
    this.recycledTiles = [];
  }

  private createTileTexture(): void {
    const gfx = this.scene.add.graphics();
    gfx.fillStyle(0xffffff, 1);
    gfx.fillRoundedRect(2, 2, TILE_SIZE - 4, TILE_SIZE - 4, 4);
    gfx.lineStyle(2, 0xffffff, 0.3);
    gfx.strokeRoundedRect(2, 2, TILE_SIZE - 4, TILE_SIZE - 4, 4);
    gfx.generateTexture(this.tileGraphicsKey, TILE_SIZE, TILE_SIZE);
    gfx.destroy();
  }

  private createParticleSystem(): void {
    this.particleManager = this.scene.add.particles(0, 0, this.tileGraphicsKey, {
      lifespan: 600,
      speed: { min: 80, max: 200 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.5, end: 0 },
      gravityY: 200,
      quantity: 15,
      emitting: false,
      blendMode: 'ADD'
    });
  }
  private prePoolTiles(): void {
    for (let i = 0; i < MAX_POOLED_TILES; i++) {
      this.createPooledTile();
    }
  }

  private createPooledTile(): TileData {
    const weight = Phaser.Math.Between(1, 5);
    const color = this.getColorForWeight(weight);
    const sprite = this.scene.matter.add.image(-1000, -1000, this.tileGraphicsKey);
    sprite.setTint(color);
    sprite.setDisplaySize(TILE_SIZE, TILE_SIZE);
    sprite.setMass(weight * 0.5);
    sprite.setFriction(0.8, 0.6, 0.4);
    sprite.setRectangle(TILE_SIZE, TILE_SIZE, {
      chamfer: { radius: 4 }
    });
    sprite.setActive(false);
    sprite.setVisible(false);
    sprite.setStatic(true);

    const tileData: TileData = {
      sprite,
      weight,
      color,
      stackLevel: 0,
      wobbleTime: 0,
      isOnTray: false,
      traySide: null,
      originalX: -1000,
      originalY: -1000
    };
    this.pool.push(tileData);
    return tileData;
  }

  getColorForWeight(weight: number): number {
    const t = (weight - 1) / 4;
    const r = Math.floor(Phaser.Math.Linear(COLOR_START_R, COLOR_END_R, t));
    const g = Math.floor(Phaser.Math.Linear(COLOR_START_G, COLOR_END_G, t));
    const b = Math.floor(Phaser.Math.Linear(COLOR_START_B, COLOR_END_B, t));
    return Phaser.Display.Color.GetColor(r, g, b);
  }

  spawnTile(x: number, y: number): TileData | null {
    if (this.activeTiles.length >= MAX_POOLED_TILES * 0.8) {
      this.compressPool();
    }

    let tile: TileData | undefined = this.pool.pop();
    if (!tile) {
      tile = this.createPooledTile();
    }

    tile.weight = Phaser.Math.Between(1, 5);
    tile.color = this.getColorForWeight(tile.weight);
    tile.stackLevel = 0;
    tile.wobbleTime = 0;
    tile.isOnTray = false;
    tile.traySide = null;
    tile.originalX = x;
    tile.originalY = y;

    tile.sprite.setActive(true);
    tile.sprite.setVisible(true);
    tile.sprite.setStatic(false);
    tile.sprite.setPosition(x, y);
    tile.sprite.setTint(tile.color);
    tile.sprite.setMass(tile.weight * 0.5);
    tile.sprite.setVelocity(0, 0);
    tile.sprite.setAngularVelocity(0);
    tile.sprite.setRotation(0);
    tile.sprite.setAlpha(0);
    tile.sprite.setCollisionCategory(2);
    tile.sprite.setCollidesWith([1, 2]);

    this.scene.tweens.add({
      targets: tile.sprite,
      alpha: 1,
      scaleX: { from: 0.3, to: 1 },
      scaleY: { from: 0.3, to: 1 },
      duration: 300,
      ease: 'Back.Out'
    });

    this.activeTiles.push(tile);
    return tile;
  }

  removeTile(tile: TileData, withParticles: boolean = true): void {
    const index = this.activeTiles.indexOf(tile);
    if (index > -1) {
      this.activeTiles.splice(index, 1);
    }

    if (withParticles) {
      this.createShatterParticles(tile.sprite.x, tile.sprite.y, tile.color);
    }

    this.scene.tweens.add({
      targets: tile.sprite,
      alpha: 0,
      scaleX: 0.1,
      scaleY: 0.1,
      duration: 200,
      ease: 'Cubic.In',
      onComplete: () => {
        if (tile.sprite.scene) {
          tile.sprite.setActive(false);
          tile.sprite.setVisible(false);
          tile.sprite.setStatic(true);
          tile.sprite.setPosition(-1000, -1000);
          tile.sprite.setCollisionCategory(0);
        }
        this.recycledTiles.push(tile);
        if (this.recycledTiles.length > this.maxRecycled && this.onRecycledFull) {
          this.onRecycledFull();
        }
      }
    });
  }

  private createShatterParticles(x: number, y: number, color: number): void {
    const particleCount = 12;

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const speed = Phaser.Math.Between(80, 200);
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const particle = this.scene.add.rectangle(
        x,
        y,
        Phaser.Math.Between(4, 8),
        Phaser.Math.Between(4, 8),
        color,
        1
      );
      particle.setStrokeStyle(1, color, 0.8);

      this.scene.tweens.add({
        targets: particle,
        x: x + vx * 0.6,
        y: y + vy * 0.6 + 150,
        alpha: 0,
        scaleX: 0.1,
        scaleY: 0.1,
        angle: Phaser.Math.Between(-180, 180),
        duration: 600,
        ease: 'Cubic.Out',
        onComplete: () => {
          if (particle.scene) {
            particle.destroy();
          }
        }
      });
    }
  }

  createGravityWave(x: number, y: number): void {
    const wave = this.scene.add.graphics();
    const maxRadius = Phaser.Math.Between(30, 60);
    const duration = 300;

    this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration,
      onUpdate: (tween) => {
        const progress = tween.getValue() || 0;
        wave.clear();
        const alpha = 1 - progress;
        const radius = maxRadius * progress;
        wave.lineStyle(3, 0x00ced1, alpha);
        wave.strokeCircle(x, y, radius);
        wave.lineStyle(2, 0xffa500, alpha * 0.6);
        wave.strokeCircle(x, y, radius * 0.6);
      },
      onComplete: () => {
        wave.destroy();
      }
    });
  }

  updateActiveTiles(delta: number): void {
    this.activeTiles.forEach(tile => {
      if (tile.isOnTray && tile.stackLevel >= 3) {
        tile.wobbleTime += delta;
        const wobbleFactor = tile.stackLevel >= 5 ? 2.0 : tile.stackLevel >= 4 ? 1.5 : 1.0;
        const wobbleAmount = Math.min(0.05 * wobbleFactor * (1 + tile.wobbleTime / 3000), 0.25);
        const currentAngle = tile.sprite.rotation;
        tile.sprite.setRotation(currentAngle + Math.sin(tile.wobbleTime / 150) * wobbleAmount * delta / 16);

        if (tile.stackLevel >= 5 && tile.wobbleTime > 2000) {
          if (Math.random() < 0.01) {
            tile.sprite.setAngularVelocity(Phaser.Math.Between(-0.05, 0.05));
            tile.sprite.setVelocity(Phaser.Math.Between(-2, 2), -1);
            tile.isOnTray = false;
            tile.stackLevel = 0;
          }
        }
      }
    });

    this.cleanupFallenTiles();
  }

  private cleanupFallenTiles(): void {
    const toRemove: TileData[] = [];
    this.activeTiles.forEach(tile => {
      if (tile.sprite.y > 800 || tile.sprite.x < -200 || tile.sprite.x > 1200) {
        if (tile.isOnTray || !tile.isOnTray) {
          toRemove.push(tile);
        }
      }
    });
    toRemove.forEach(tile => this.removeTile(tile, false));
  }

  private compressPool(): void {
    this.recycledTiles.forEach(tile => {
      if (!this.pool.includes(tile) && !this.activeTiles.includes(tile)) {
        if (tile.sprite.scene) {
          this.pool.push(tile);
        }
      }
    });
    this.recycledTiles = [];
  }

  getActiveTiles(): TileData[] {
    return this.activeTiles;
  }

  getTileAtPointer(pointer: Phaser.Input.Pointer): TileData | null {
    for (let i = this.activeTiles.length - 1; i >= 0; i--) {
      const tile = this.activeTiles[i];
      const bounds = tile.sprite.getBounds();
      if (bounds.contains(pointer.x, pointer.y)) {
        return tile;
      }
    }
    return null;
  }

  updateTileStackLevels(trayLeftY: number, trayRightY: number, trayLeftX: number, trayRightX: number): void {
    this.activeTiles.forEach(tile => {
      const isLeftSide = tile.sprite.x < 400;
      const trayX = isLeftSide ? trayLeftX : trayRightX;
      const trayY = isLeftSide ? trayLeftY : trayRightY;
      const distToTray = Math.sqrt(
        Math.pow(tile.sprite.x - trayX, 2) +
        Math.pow(tile.sprite.y - trayY, 2)
      );

      if (distToTray < 250 && tile.sprite.y < trayY + 20) {
        tile.isOnTray = true;
        tile.traySide = isLeftSide ? 'left' : 'right';
        const heightDiff = trayY - tile.sprite.y;
        tile.stackLevel = Math.max(0, Math.floor(heightDiff / TILE_SIZE));
      } else if (distToTray > 350) {
        tile.isOnTray = false;
        tile.stackLevel = 0;
      }
    });
  }

  destroy(): void {
    this.activeTiles.forEach(tile => {
      if (tile.sprite.scene) tile.sprite.destroy();
    });
    this.pool.forEach(tile => {
      if (tile.sprite.scene) tile.sprite.destroy();
    });
    this.recycledTiles.forEach(tile => {
      if (tile.sprite.scene) tile.sprite.destroy();
    });
    if (this.particleManager) {
      this.particleManager.destroy();
    }
  }
}
