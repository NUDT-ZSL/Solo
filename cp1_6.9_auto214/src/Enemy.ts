import Phaser from 'phaser';
import { GameScene } from './main';

export enum EnemyType {
  TRIANGLE = 'triangle',
  POLYGON = 'polygon',
  DIAMOND = 'diamond'
}

export enum MovePattern {
  STRAIGHT = 'straight',
  SINE = 'sine',
  ARC = 'arc'
}

interface EnemyData {
  type: EnemyType;
  color: number;
  hp: number;
  pattern: MovePattern;
  baseY: number;
  spawnTime: number;
  amplitude: number;
  frequency: number;
  arcDirection: number;
  speed: number;
  graphics: Phaser.GameObjects.Graphics;
  glow: Phaser.GameObjects.Graphics;
}

export class EnemyManager {
  private scene: GameScene;
  public enemyGroup!: Phaser.Physics.Arcade.Group;
  private spawnTimer: number = 0;
  private spawnInterval: number = 1.5;
  private maxEnemies: number = 30;

  private enemyColors: Map<EnemyType, number[]> = new Map([
    [EnemyType.TRIANGLE, [0xff3355, 0xff5577, 0xff2244]],
    [EnemyType.POLYGON, [0xaa44ff, 0xcc66ff, 0x8822dd]],
    [EnemyType.DIAMOND, [0x44ff88, 0x66ffaa, 0x22dd66]]
  ]);

  private enemyNames: EnemyType[] = [EnemyType.TRIANGLE, EnemyType.POLYGON, EnemyType.DIAMOND];
  private patterns: MovePattern[] = [MovePattern.STRAIGHT, MovePattern.SINE, MovePattern.ARC];

  constructor(scene: GameScene) {
    this.scene = scene;
    this.enemyGroup = this.scene.physics.add.group({
      classType: Phaser.Physics.Arcade.Image,
      maxSize: this.maxEnemies,
      runChildUpdate: false
    });
  }

  reset(): void {
    this.spawnTimer = 0;
    this.spawnInterval = 1.5;
    this.enemyGroup.clear(true, true);
  }

  private spawnEnemy(): void {
    if (this.enemyGroup.countActive(true) >= this.maxEnemies) return;

    const scene = this.scene;
    const width = scene.scale.width;
    const height = scene.scale.height;

    const tunnelTop = 90;
    const tunnelBottom = height - 90;

    const type = Phaser.Utils.Array.GetRandom(this.enemyNames) as EnemyType;
    const pattern = Phaser.Utils.Array.GetRandom(this.patterns) as MovePattern;
    const colors = this.enemyColors.get(type)!;
    const color = Phaser.Utils.Array.GetRandom(colors) as number;

    const y = Phaser.Math.FloatBetween(tunnelTop + 40, tunnelBottom - 40);
    const x = width + 80;

    const size = Phaser.Math.FloatBetween(26, 42);
    const speedBase = Phaser.Math.FloatBetween(140, 220);
    const speedMultiplier = 1 + Math.floor(scene.gameTime / 30) * 0.08;
    const speed = speedBase * speedMultiplier;

    const enemy = this.enemyGroup.create(x, y) as Phaser.Physics.Arcade.Image;
    enemy.setTexture('');
    enemy.setAlpha(0);
    enemy.setSize(size * 1.6, size * 1.6);
    enemy.setDisplaySize(size * 1.6, size * 1.6);
    enemy.setDepth(40);
    enemy.body.setSize(size * 1.2, size * 1.2);

    const graphics = scene.add.graphics();
    graphics.setDepth(41);
    const glow = scene.add.graphics();
    glow.setDepth(39);

    const enemyData: EnemyData = {
      type,
      color,
      hp: type === EnemyType.POLYGON ? 2 : 1,
      pattern,
      baseY: y,
      spawnTime: scene.gameTime,
      amplitude: Phaser.Math.FloatBetween(35, 90),
      frequency: Phaser.Math.FloatBetween(1.2, 2.8),
      arcDirection: Phaser.Math.Between(-1, 1) || 1,
      speed,
      graphics,
      glow
    };

    enemy.setData('enemyData', enemyData);
    this.drawEnemy(enemy);
  }

  private drawEnemy(enemy: Phaser.Physics.Arcade.Image): void {
    const data = enemy.getData('enemyData') as EnemyData;
    const { type, color, graphics, glow } = data;
    const x = enemy.x;
    const y = enemy.y;
    const size = enemy.displayWidth * 0.32;

    graphics.clear();
    glow.clear();

    const lighterColor = Phaser.Display.Color.IntegerToColor(color);
    lighterColor.lighten(25);
    const glowColor = lighterColor.color;

    glow.lineStyle(5, glowColor, 0.35);

    graphics.lineStyle(2.5, glowColor, 0.95);
    graphics.fillStyle(color, 0.85);

    graphics.beginPath();
    glow.beginPath();

    if (type === EnemyType.TRIANGLE) {
      graphics.moveTo(x - size * 1.3, y - size);
      graphics.lineTo(x + size * 1.1, y);
      graphics.lineTo(x - size * 1.3, y + size);
      graphics.closePath();

      glow.moveTo(x - size * 1.4, y - size * 1.1);
      glow.lineTo(x + size * 1.2, y);
      glow.lineTo(x - size * 1.4, y + size * 1.1);
      glow.closePath();
    } else if (type === EnemyType.DIAMOND) {
      graphics.moveTo(x - size * 1.3, y);
      graphics.lineTo(x, y - size * 1.1);
      graphics.lineTo(x + size * 1.3, y);
      graphics.lineTo(x, y + size * 1.1);
      graphics.closePath();

      glow.moveTo(x - size * 1.45, y);
      glow.lineTo(x, y - size * 1.2);
      glow.lineTo(x + size * 1.45, y);
      glow.lineTo(x, y + size * 1.2);
      glow.closePath();
    } else {
      const sides = Phaser.Math.Between(5, 6);
      for (let i = 0; i < sides; i++) {
        const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
        const px = x + Math.cos(angle) * size * 1.2;
        const py = y + Math.sin(angle) * size * 1.2;
        if (i === 0) {
          graphics.moveTo(px, py);
        } else {
          graphics.lineTo(px, py);
        }
      }
      graphics.closePath();

      for (let i = 0; i < sides; i++) {
        const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
        const px = x + Math.cos(angle) * size * 1.35;
        const py = y + Math.sin(angle) * size * 1.35;
        if (i === 0) {
          glow.moveTo(px, py);
        } else {
          glow.lineTo(px, py);
        }
      }
      glow.closePath();
    }

    graphics.fillPath();
    graphics.strokePath();
    glow.strokePath();

    graphics.fillStyle(0xffffff, 0.6);
    if (type === EnemyType.TRIANGLE) {
      graphics.fillTriangle(
        x - size * 0.3, y - size * 0.35,
        x + size * 0.3, y,
        x - size * 0.3, y + size * 0.35
      );
    } else if (type === EnemyType.DIAMOND) {
      graphics.save();
      graphics.translateCanvas(x, y);
      graphics.rotateCanvas(Math.PI / 4);
      graphics.fillRect(-size * 0.2, -size * 0.2, size * 0.4, size * 0.4);
      graphics.restore();
    } else {
      graphics.fillCircle(x, y, size * 0.25);
    }
  }

  public killEnemy(enemy: Phaser.Physics.Arcade.Image): void {
    const data = enemy.getData('enemyData') as EnemyData;
    const x = enemy.x;
    const y = enemy.y;
    const color = data.color;

    if (data.graphics) data.graphics.destroy();
    if (data.glow) data.glow.destroy();

    this.createDeathParticles(x, y, color);

    this.scene.cameras.main.shake(60, 0.003);

    this.enemyGroup.killAndHide(enemy);
    enemy.destroy();
  }

  private createDeathParticles(x: number, y: number, color: number): void {
    const scene = this.scene;
    const particleCount = Phaser.Math.Between(10, 20);

    const lighter = Phaser.Display.Color.IntegerToColor(color);
    lighter.lighten(30);
    const lightColor = lighter.color;

    const flash = scene.add.graphics();
    flash.setDepth(80);
    flash.fillStyle(color, 0.4);
    flash.fillCircle(x, y, 45);
    flash.fillStyle(lightColor, 0.6);
    flash.fillCircle(x, y, 32);
    flash.fillStyle(0xffffff, 0.9);
    flash.fillCircle(x, y, 18);

    scene.tweens.add({
      targets: flash,
      alpha: { from: 1, to: 0 },
      scale: { from: 0.6, to: 1.8 },
      duration: 280,
      ease: 'Cubic.easeOut',
      onComplete: () => flash.destroy()
    });

    const colors = [color, lightColor, 0xffffff, 0xffffaa];

    for (let i = 0; i < particleCount; i++) {
      const particle = scene.add.circle(x, y, Phaser.Math.FloatBetween(2, 5));
      particle.setDepth(70);
      particle.fillColor = Phaser.Utils.Array.GetRandom(colors) as number;
      particle.fillAlpha = 1;

      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const speed = Phaser.Math.FloatBetween(120, 380);

      scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * speed * Phaser.Math.FloatBetween(0.4, 1),
        y: y + Math.sin(angle) * speed * Phaser.Math.FloatBetween(0.4, 1),
        scale: { from: 1, to: 0 },
        alpha: { from: 1, to: 0 },
        duration: Phaser.Math.FloatBetween(800, 2000),
        ease: 'Cubic.easeOut',
        onComplete: () => particle.destroy()
      });
    }
  }

  update(delta: number): void {
    const dt = delta / 1000;
    const scene = this.scene;

    this.spawnTimer += dt;
    const currentInterval = this.spawnInterval / (1 + scene.gameTime / 80);
    if (this.spawnTimer >= Math.max(0.4, currentInterval)) {
      this.spawnTimer = 0;
      this.spawnEnemy();
    }

    const enemies = this.enemyGroup.getChildren() as Phaser.Physics.Arcade.Image[];
    const width = scene.scale.width;

    enemies.forEach((enemy) => {
      if (!enemy.active) return;

      const data = enemy.getData('enemyData') as EnemyData;
      const elapsed = scene.gameTime - data.spawnTime;

      let newX = enemy.x - data.speed * dt;
      let newY = data.baseY;

      if (data.pattern === MovePattern.SINE) {
        newY = data.baseY + Math.sin(elapsed * data.frequency) * data.amplitude;
      } else if (data.pattern === MovePattern.ARC) {
        const progress = Math.min(1, elapsed * 0.8);
        newY = data.baseY + Math.sin(progress * Math.PI) * data.amplitude * data.arcDirection;
      }

      const height = scene.scale.height;
      newY = Phaser.Math.Clamp(newY, 90, height - 90);

      enemy.setPosition(newX, newY);

      const dataRef = enemy.getData('enemyData') as EnemyData;
      dataRef.graphics.x = 0;
      dataRef.graphics.y = 0;
      dataRef.glow.x = 0;
      dataRef.glow.y = 0;

      data.graphics.setPosition(0, 0);
      data.glow.setPosition(0, 0);
      this.drawEnemy(enemy);

      if (newX < -100) {
        if (data.graphics) data.graphics.destroy();
        if (data.glow) data.glow.destroy();
        this.enemyGroup.killAndHide(enemy);
        enemy.destroy();
      }
    });
  }
}
