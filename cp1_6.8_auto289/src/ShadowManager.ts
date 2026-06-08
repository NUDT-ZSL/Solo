import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './main';

export interface LightSource {
  x: number;
  y: number;
  radius: number;
  intensity: number;
  color: number;
  active: boolean;
  destructible: boolean;
  id: string;
}

export interface WallSegment {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class ShadowManager {
  private scene: Phaser.Scene;
  private lightSources: LightSource[] = [];
  private wallSegments: WallSegment[] = [];
  private shadowTexture!: Phaser.GameObjects.RenderTexture;
  private lightTexture!: Phaser.GameObjects.RenderTexture;
  private ambientParticles: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
  private shadowGrid: boolean[][] = [];
  private gridCellSize: number = 8;
  private gridCols: number;
  private gridRows: number;

  constructor(scene: Phaser.Scene, walls: WallSegment[]) {
    this.scene = scene;
    this.wallSegments = walls;
    this.gridCols = Math.ceil(GAME_WIDTH / this.gridCellSize);
    this.gridRows = Math.ceil(GAME_HEIGHT / this.gridCellSize);
    this.shadowGrid = Array.from({ length: this.gridRows }, () =>
      Array(this.gridCols).fill(false)
    );

    this.shadowTexture = scene.add.renderTexture(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.shadowTexture.setDepth(50);
    this.shadowTexture.setBlendMode(Phaser.BlendModes.MULTIPLY);

    this.lightTexture = scene.add.renderTexture(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.lightTexture.setDepth(5);

    this.createAmbientParticles();
  }

  private createAmbientParticles(): void {
    const gfx = this.scene.add.graphics();
    gfx.fillStyle(0x6644aa, 1);
    gfx.fillCircle(2, 2, 2);
    gfx.generateTexture('shadowParticle', 4, 4);
    gfx.destroy();

    for (let i = 0; i < 3; i++) {
      const emitter = this.scene.add.particles(
        Phaser.Math.Between(0, GAME_WIDTH),
        Phaser.Math.Between(0, GAME_HEIGHT),
        'shadowParticle',
        {
          speed: { min: 3, max: 10 },
          lifespan: { min: 6000, max: 12000 },
          quantity: 1,
          frequency: { min: 300, max: 800 },
          scale: { start: 0.4, end: 0 },
          alpha: { start: 0.3, end: 0 },
          blendMode: 'ADD',
          emitZone: {
            type: 'random',
            source: new Phaser.Geom.Rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT),
          },
        }
      );
      emitter.setDepth(3);
      this.ambientParticles.push(emitter);
    }
  }

  addLight(light: LightSource): void {
    this.lightSources.push(light);
  }

  removeLight(id: string): void {
    const idx = this.lightSources.findIndex((l) => l.id === id);
    if (idx >= 0) {
      this.lightSources[idx].active = false;
    }
  }

  getLights(): LightSource[] {
    return this.lightSources.filter((l) => l.active);
  }

  getDestructibleLightsNear(x: number, y: number, range: number): LightSource[] {
    return this.lightSources.filter(
      (l) =>
        l.active &&
        l.destructible &&
        Phaser.Math.Distance.Between(x, y, l.x, l.y) < range
    );
  }

  isPointInShadow(px: number, py: number): boolean {
    const col = Math.floor(px / this.gridCellSize);
    const row = Math.floor(py / this.gridCellSize);
    if (col < 0 || col >= this.gridCols || row < 0 || row >= this.gridRows) {
      return true;
    }
    return this.shadowGrid[row][col];
  }

  update(): void {
    this.computeShadowGrid();
    this.renderLightLayer();
    this.renderShadowLayer();
  }

  private computeShadowGrid(): void {
    for (let row = 0; row < this.gridRows; row++) {
      for (let col = 0; col < this.gridCols; col++) {
        this.shadowGrid[row][col] = true;
      }
    }

    const activeLights = this.lightSources.filter((l) => l.active);

    for (const light of activeLights) {
      const rInCells = Math.ceil(light.radius / this.gridCellSize);
      const centerCol = Math.floor(light.x / this.gridCellSize);
      const centerRow = Math.floor(light.y / this.gridCellSize);

      for (let dr = -rInCells; dr <= rInCells; dr++) {
        for (let dc = -rInCells; dc <= rInCells; dc++) {
          const col = centerCol + dc;
          const row = centerRow + dr;
          if (col < 0 || col >= this.gridCols || row < 0 || row >= this.gridRows) continue;

          const cellX = col * this.gridCellSize + this.gridCellSize / 2;
          const cellY = row * this.gridCellSize + this.gridCellSize / 2;

          const dist = Phaser.Math.Distance.Between(light.x, light.y, cellX, cellY);
          if (dist > light.radius) continue;

          if (!this.isWallBlockingLight(light.x, light.y, cellX, cellY)) {
            this.shadowGrid[row][col] = false;
          }
        }
      }
    }
  }

  private isWallBlockingLight(
    lx: number,
    ly: number,
    px: number,
    py: number
  ): boolean {
    const steps = 8;
    const dx = (px - lx) / steps;
    const dy = (py - ly) / steps;

    for (let i = 1; i < steps; i++) {
      const checkX = lx + dx * i;
      const checkY = ly + dy * i;

      for (const wall of this.wallSegments) {
        if (
          checkX >= wall.x &&
          checkX <= wall.x + wall.width &&
          checkY >= wall.y &&
          checkY <= wall.y + wall.height
        ) {
          return true;
        }
      }
    }
    return false;
  }

  private renderLightLayer(): void {
    this.lightTexture.clear();

    const gfx = this.scene.add.graphics();

    const activeLights = this.lightSources.filter((l) => l.active);
    for (const light of activeLights) {
      const r = light.radius;
      const intensity = light.intensity;

      const colorObj = Phaser.Display.Color.IntegerToColor(light.color);
      const r1 = colorObj.r;
      const g1 = colorObj.g;
      const b1 = colorObj.b;

      for (let ring = 6; ring >= 0; ring--) {
        const ringRadius = r * (ring / 6);
        const alpha = intensity * (1 - ring / 6) * 0.25;
        gfx.fillStyle(
          Phaser.Display.Color.GetColor(r1, g1, b1),
          alpha
        );
        gfx.fillCircle(light.x, light.y, ringRadius);
      }
    }

    this.lightTexture.draw(gfx);
    gfx.destroy();
  }

  private renderShadowLayer(): void {
    this.shadowTexture.clear();

    const gfx = this.scene.add.graphics();

    gfx.fillStyle(0x000000, 0.65);
    gfx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const activeLights = this.lightSources.filter((l) => l.active);
    for (const light of activeLights) {
      gfx.setBlendMode(Phaser.BlendModes.ERASE);
      const r = light.radius;
      for (let ring = 5; ring >= 0; ring--) {
        const ringRadius = r * (ring / 5);
        const alpha = 0.3 + (1 - ring / 5) * 0.7;
        gfx.fillStyle(0xffffff, alpha);
        gfx.fillCircle(light.x, light.y, ringRadius);
      }
      gfx.setBlendMode(Phaser.BlendModes.NORMAL);
    }

    this.shadowTexture.draw(gfx);
    gfx.destroy();
  }

  createLightDustParticles(x: number, y: number): void {
    const gfx = this.scene.add.graphics();
    gfx.fillStyle(0xffdd88, 1);
    gfx.fillCircle(2, 2, 2);
    gfx.generateTexture('lightDust', 4, 4);
    gfx.destroy();

    const emitter = this.scene.add.particles(x, y, 'lightDust', {
      speed: { min: 30, max: 100 },
      lifespan: 800,
      quantity: 20,
      scale: { start: 1, end: 0 },
      alpha: { start: 0.9, end: 0 },
      blendMode: 'ADD',
    });
    emitter.setDepth(60);

    this.scene.time.delayedCall(1000, () => {
      emitter.destroy();
    });
  }

  destroy(): void {
    this.shadowTexture.destroy();
    this.lightTexture.destroy();
    this.ambientParticles.forEach((p) => p.destroy());
  }
}
