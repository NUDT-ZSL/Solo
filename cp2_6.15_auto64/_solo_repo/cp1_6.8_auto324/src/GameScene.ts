import Phaser from 'phaser';
import { Star } from './Star';
import { Asteroid, AsteroidState } from './Asteroid';
import { Gate, GateState } from './Gate';

interface LevelConfig {
  starPos: { x: number; y: number };
  asteroids: { x: number; y: number }[];
  gates: { x: number; y: number }[];
  fragments: { x: number; y: number }[];
  blackholes: { x: number; y: number; strength: number }[];
  interferenceZones: { x: number; y: number; radius: number; strength: number }[];
  nebulas: { x: number; y: number; scale: number; tint: number }[];
  energyRegenRate: number;
  maxLineLength: number;
}

interface FragmentSprite {
  sprite: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Arc;
  collected: boolean;
  pulseTween: Phaser.Tweens.Tween | null;
  index: number;
}

interface InterferenceZone {
  image: Phaser.GameObjects.Image;
  x: number;
  y: number;
  radius: number;
  strength: number;
}

interface BlackholeData {
  image: Phaser.GameObjects.Image;
  ring: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  strength: number;
  rotateTween: Phaser.Tweens.Tween | null;
}

export class GameScene extends Phaser.Scene {
  private star!: Star;
  private asteroids: Asteroid[] = [];
  private gates: Gate[] = [];
  private fragments: FragmentSprite[] = [];
  private blackholes: BlackholeData[] = [];
  private interferenceZones: InterferenceZone[] = [];
  private bgStars: Phaser.GameObjects.Arc[] = [];
  private bgGraphics!: Phaser.GameObjects.Graphics;
  private nebulaImages: Phaser.GameObjects.Image[] = [];

  private currentLevel: number = 0;
  private totalLevels: number = 5;
  private currentGateOrder: number = 0;
  private collectedFragments: number = 0;
  private totalFragments: number = 3;

  private uiPanel!: Phaser.GameObjects.Graphics;
  private energyBarBg!: Phaser.GameObjects.Graphics;
  private energyBarFill!: Phaser.GameObjects.Graphics;
  private levelText!: Phaser.GameObjects.Text;
  private fragmentText!: Phaser.GameObjects.Text;
  private resetBtn!: Phaser.GameObjects.Container;
  private levelCompleteOverlay: Phaser.GameObjects.Container | null = null;
  private allCompleteOverlay: Phaser.GameObjects.Container | null = null;

  private gravityLines: Phaser.GameObjects.Graphics[] = [];

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.cameras.main.fadeIn(500, 10, 10, 26);
    this.createBackground();
    this.loadLevel(0);
  }

  private createBackground(): void {
    this.bgGraphics = this.add.graphics();
    this.drawGradientBg();

    for (let i = 0; i < 200; i++) {
      const x = Phaser.Math.Between(0, this.scale.width);
      const y = Phaser.Math.Between(0, this.scale.height);
      const r = Phaser.Math.FloatBetween(0.5, 2);
      const alpha = Phaser.Math.FloatBetween(0.3, 1);
      const star = this.add.circle(x, y, r, 0xffffff, alpha);
      this.bgStars.push(star);

      if (Math.random() < 0.3) {
        this.tweens.add({
          targets: star,
          alpha: Phaser.Math.FloatBetween(0.1, 0.4),
          duration: Phaser.Math.Between(1500, 4000),
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
          delay: Phaser.Math.Between(0, 3000),
        });
      }
    }
  }

  private drawGradientBg(): void {
    const w = this.scale.width;
    const h = this.scale.height;

    this.bgGraphics.clear();

    const steps = 32;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const r = Math.floor(Phaser.Math.Linear(10, 20, t));
      const g = Math.floor(Phaser.Math.Linear(10, 10, t));
      const b = Math.floor(Phaser.Math.Linear(26, 42, t));
      const color = (r << 16) | (g << 8) | b;
      this.bgGraphics.fillStyle(color, 1);
      this.bgGraphics.fillRect(0, (h / steps) * i, w, h / steps + 1);
    }
  }

  private getLevelConfigs(): LevelConfig[] {
    const w = this.scale.width;
    const h = this.scale.height;
    const cx = w / 2;
    const cy = h / 2;

    return [
      {
        starPos: { x: cx * 0.4, y: cy },
        asteroids: [
          { x: cx * 0.7, y: cy * 0.5 },
          { x: cx * 0.8, y: cy * 1.2 },
          { x: cx * 0.9, y: cy * 0.8 },
        ],
        gates: [
          { x: cx * 1.4, y: cy * 0.6 },
          { x: cx * 1.5, y: cy * 1.2 },
        ],
        fragments: [
          { x: cx * 1.6, y: cy * 0.4 },
          { x: cx * 1.3, y: cy * 1.4 },
          { x: cx * 1.7, y: cy },
        ],
        blackholes: [],
        interferenceZones: [],
        nebulas: [
          { x: cx * 1.2, y: cy * 0.7, scale: 1.5, tint: 0x3b1f8e },
        ],
        energyRegenRate: 10,
        maxLineLength: 400,
      },
      {
        starPos: { x: cx * 0.3, y: cy * 1.2 },
        asteroids: [
          { x: cx * 0.6, y: cy * 0.6 },
          { x: cx * 0.5, y: cy * 0.9 },
          { x: cx * 0.7, y: cy * 1.3 },
        ],
        gates: [
          { x: cx * 1.3, y: cy * 0.5 },
          { x: cx * 1.5, y: cy * 0.9 },
          { x: cx * 1.2, y: cy * 1.4 },
        ],
        fragments: [
          { x: cx * 1.6, y: cy * 0.3 },
          { x: cx * 1.7, y: cy * 1.0 },
          { x: cx * 1.1, y: cy * 1.6 },
        ],
        blackholes: [],
        interferenceZones: [
          { x: cx, y: cy * 0.8, radius: 70, strength: 40 },
        ],
        nebulas: [
          { x: cx * 0.8, y: cy * 0.5, scale: 2, tint: 0x5b21b6 },
          { x: cx * 1.4, y: cy * 1.2, scale: 1.2, tint: 0x3b1f8e },
        ],
        energyRegenRate: 8,
        maxLineLength: 380,
      },
      {
        starPos: { x: cx * 0.5, y: cy * 0.4 },
        asteroids: [
          { x: cx * 0.6, y: cy * 0.7 },
          { x: cx * 0.4, y: cy * 1.0 },
          { x: cx * 0.8, y: cy * 0.5 },
          { x: cx * 0.9, y: cy * 1.1 },
        ],
        gates: [
          { x: cx * 1.5, y: cy * 0.3 },
          { x: cx * 1.6, y: cy * 0.8 },
          { x: cx * 1.3, y: cy * 1.3 },
        ],
        fragments: [
          { x: cx * 1.7, y: cy * 0.5 },
          { x: cx * 1.4, y: cy * 1.5 },
          { x: cx * 1.8, y: cy * 1.1 },
        ],
        blackholes: [
          { x: cx * 1.1, y: cy * 0.6, strength: 120 },
        ],
        interferenceZones: [
          { x: cx * 0.9, y: cy * 0.9, radius: 75, strength: 50 },
        ],
        nebulas: [
          { x: cx, y: cy * 0.6, scale: 2.2, tint: 0x4c1d95 },
          { x: cx * 1.5, y: cy * 1.3, scale: 1.5, tint: 0x5b21b6 },
        ],
        energyRegenRate: 7,
        maxLineLength: 360,
      },
      {
        starPos: { x: cx * 0.3, y: cy * 0.5 },
        asteroids: [
          { x: cx * 0.5, y: cy * 0.8 },
          { x: cx * 0.6, y: cy * 1.2 },
          { x: cx * 0.8, y: cy * 0.4 },
          { x: cx * 0.4, y: cy * 1.4 },
        ],
        gates: [
          { x: cx * 1.2, y: cy * 0.3 },
          { x: cx * 1.5, y: cy * 0.7 },
          { x: cx * 1.3, y: cy * 1.2 },
          { x: cx * 1.6, y: cy * 1.5 },
        ],
        fragments: [
          { x: cx * 1.7, y: cy * 0.4 },
          { x: cx * 1.8, y: cy * 1.0 },
          { x: cx * 1.4, y: cy * 1.6 },
        ],
        blackholes: [
          { x: cx * 1.0, y: cy * 0.8, strength: 140 },
        ],
        interferenceZones: [
          { x: cx * 0.8, y: cy * 0.6, radius: 80, strength: 55 },
          { x: cx * 1.3, y: cy * 1.0, radius: 65, strength: 45 },
        ],
        nebulas: [
          { x: cx * 0.7, y: cy * 0.5, scale: 2.5, tint: 0x4c1d95 },
          { x: cx * 1.4, y: cy * 1.4, scale: 1.8, tint: 0x3b1f8e },
        ],
        energyRegenRate: 6,
        maxLineLength: 340,
      },
      {
        starPos: { x: cx * 0.2, y: cy },
        asteroids: [
          { x: cx * 0.4, y: cy * 0.5 },
          { x: cx * 0.5, y: cy * 1.3 },
          { x: cx * 0.7, y: cy * 0.3 },
          { x: cx * 0.3, y: cy * 1.5 },
          { x: cx * 0.6, y: cy * 0.9 },
        ],
        gates: [
          { x: cx * 1.1, y: cy * 0.2 },
          { x: cx * 1.4, y: cy * 0.6 },
          { x: cx * 1.6, y: cy * 1.0 },
          { x: cx * 1.3, y: cy * 1.4 },
          { x: cx * 1.7, y: cy * 0.3 },
        ],
        fragments: [
          { x: cx * 1.8, y: cy * 0.5 },
          { x: cx * 1.5, y: cy * 1.5 },
          { x: cx * 1.9, y: cy * 1.1 },
        ],
        blackholes: [
          { x: cx * 0.9, y: cy * 0.7, strength: 160 },
          { x: cx * 1.2, y: cy * 1.2, strength: 130 },
        ],
        interferenceZones: [
          { x: cx * 0.7, y: cy * 0.5, radius: 85, strength: 60 },
          { x: cx * 1.1, y: cy * 0.9, radius: 70, strength: 50 },
          { x: cx * 1.5, y: cy * 1.3, radius: 60, strength: 40 },
        ],
        nebulas: [
          { x: cx * 0.6, y: cy * 0.4, scale: 3, tint: 0x4c1d95 },
          { x: cx * 1.3, y: cy * 0.8, scale: 2, tint: 0x5b21b6 },
          { x: cx * 1.6, y: cy * 1.5, scale: 1.5, tint: 0x3b1f8e },
        ],
        energyRegenRate: 5,
        maxLineLength: 320,
      },
    ];
  }

  private loadLevel(levelIndex: number): void {
    this.clearLevel();

    const configs = this.getLevelConfigs();
    if (levelIndex >= configs.length) {
      this.showAllComplete();
      return;
    }

    const config = configs[levelIndex];
    this.currentLevel = levelIndex;
    this.currentGateOrder = 0;
    this.collectedFragments = 0;
    this.totalFragments = config.fragments.length;

    this.drawGradientBg();

    config.nebulas.forEach((n) => {
      const img = this.add.image(n.x, n.y, 'nebula');
      img.setScale(n.scale);
      img.setTint(n.tint);
      img.setAlpha(0.4);
      img.setDepth(0);
      this.nebulaImages.push(img);
    });

    config.blackholes.forEach((bh) => {
      const img = this.add.image(bh.x, bh.y, 'blackhole');
      img.setDepth(1);

      const ring = this.add.circle(bh.x, bh.y, 55, 0x6a00bf, 0.08);
      ring.setDepth(1);

      const rotateTween = this.tweens.add({
        targets: ring,
        angle: 360,
        duration: 8000,
        repeat: -1,
        ease: 'Linear',
      });

      this.blackholes.push({ image: img, ring, x: bh.x, y: bh.y, strength: bh.strength, rotateTween });
    });

    config.interferenceZones.forEach((iz) => {
      const img = this.add.image(iz.x, iz.y, 'interference');
      img.setScale(iz.radius / 80);
      img.setDepth(1);
      img.setAlpha(0.6);

      this.tweens.add({
        targets: img,
        alpha: 0.3,
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      this.interferenceZones.push({
        image: img,
        x: iz.x,
        y: iz.y,
        radius: iz.radius,
        strength: iz.strength,
      });
    });

    this.star = new Star(this, config.starPos.x, config.starPos.y);
    this.star.setDepth(10);
    this.add.existing(this.star);
    this.star.setEnergyRegenRate(config.energyRegenRate);
    this.star.setMaxLineLength(config.maxLineLength);
    this.star.onGravityLineCreated = this.onGravityLineCreated.bind(this);

    config.gates.forEach((g, i) => {
      const gate = new Gate(this, g.x, g.y, i);
      gate.setDepth(5);
      this.add.existing(gate);
      this.gates.push(gate);
    });

    if (this.gates.length > 0) {
      this.gates[0].activate();
      this.currentGateOrder = 0;
    }

    config.fragments.forEach((f, i) => {
      const glow = this.add.circle(f.x, f.y, 20, 0xffd700, 0.15);
      glow.setDepth(4);

      const sprite = this.add.image(f.x, f.y, 'fragment');
      sprite.setDepth(5);

      const pulseTween = this.tweens.add({
        targets: sprite,
        scaleX: 1.15,
        scaleY: 1.15,
        duration: 1200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: i * 300,
      });

      this.tweens.add({
        targets: glow,
        scaleX: 1.4,
        scaleY: 1.4,
        alpha: 0.05,
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: i * 200,
      });

      this.fragments.push({ sprite, glow, collected: false, pulseTween, index: i });
    });

    config.asteroids.forEach((a) => {
      const asteroid = new Asteroid(this, a.x, a.y);
      asteroid.setDepth(8);
      this.add.existing(asteroid);

      asteroid.onHitGate = this.onAsteroidHitGate.bind(this);
      asteroid.onCapturedByBlackhole = this.onAsteroidCaptured.bind(this);
      asteroid.onOutOfBounds = this.onAsteroidOutOfBounds.bind(this);

      this.asteroids.push(asteroid);
    });

    this.createUI();

    this.cameras.main.fadeIn(400, 10, 10, 26);
  }

  private clearLevel(): void {
    if (this.star) {
      this.star.destroy();
    }

    this.asteroids.forEach((a) => a.destroy());
    this.gates.forEach((g) => g.destroy());
    this.fragments.forEach((f) => {
      if (f.pulseTween) f.pulseTween.stop();
      f.sprite.destroy();
      f.glow.destroy();
    });
    this.blackholes.forEach((bh) => {
      if (bh.rotateTween) bh.rotateTween.stop();
      bh.image.destroy();
      bh.ring.destroy();
    });
    this.interferenceZones.forEach((iz) => iz.image.destroy());
    this.nebulaImages.forEach((n) => n.destroy());
    this.gravityLines.forEach((gl) => gl.destroy());

    if (this.uiPanel) this.uiPanel.destroy();
    if (this.energyBarBg) this.energyBarBg.destroy();
    if (this.energyBarFill) this.energyBarFill.destroy();
    if (this.levelText) this.levelText.destroy();
    if (this.fragmentText) this.fragmentText.destroy();
    if (this.resetBtn) this.resetBtn.destroy();
    if (this.levelCompleteOverlay) this.levelCompleteOverlay.destroy();
    if (this.allCompleteOverlay) this.allCompleteOverlay.destroy();

    this.asteroids = [];
    this.gates = [];
    this.fragments = [];
    this.blackholes = [];
    this.interferenceZones = [];
    this.nebulaImages = [];
    this.gravityLines = [];
    this.levelCompleteOverlay = null;
    this.allCompleteOverlay = null;
  }

  private onGravityLineCreated(points: Phaser.Math.Vector2[]): void {
    const idleAsteroids = this.asteroids.filter(
      (a) => a.getState() === AsteroidState.Idle
    );

    if (idleAsteroids.length === 0) return;

    const startPt = points[0];
    const endPt = points[points.length - 1];

    let closest: Asteroid | null = null;
    let closestDist = Infinity;

    for (const a of idleAsteroids) {
      const d = Phaser.Math.Distance.Between(a.x, a.y, startPt.x, startPt.y);
      if (d < closestDist && d < 200) {
        closestDist = d;
        closest = a;
      }
    }

    if (!closest) {
      closest = idleAsteroids[0];
    }

    const lineGfx = this.add.graphics();
    lineGfx.setDepth(3);
    this.gravityLines.push(lineGfx);

    lineGfx.lineStyle(2, 0x8b5cf6, 0.25);
    lineGfx.beginPath();
    lineGfx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      lineGfx.lineTo(points[i].x, points[i].y);
    }
    lineGfx.strokePath();

    closest.launchAlongPath(points);

    this.tweens.add({
      targets: lineGfx,
      alpha: 0,
      duration: 3000,
      ease: 'Sine.easeOut',
      onComplete: () => {
        lineGfx.destroy();
        const idx = this.gravityLines.indexOf(lineGfx);
        if (idx >= 0) this.gravityLines.splice(idx, 1);
      },
    });
  }

  private onAsteroidHitGate(asteroid: Asteroid, _gateIndex: number): void {
    for (const gate of this.gates) {
      if (
        gate.getState() === GateState.Active &&
        gate.checkCollision(asteroid.x, asteroid.y)
      ) {
        gate.unlock();

        const idx = this.asteroids.indexOf(asteroid);
        if (idx >= 0) {
          asteroid.destroy();
          this.asteroids.splice(idx, 1);
        }

        this.currentGateOrder++;

        if (this.currentGateOrder < this.gates.length) {
          this.gates[this.currentGateOrder].activate();
        }

        this.spawnParticleBurst(gate.x, gate.y, 0x22c55e, 20);
        this.updateUI();
        this.checkFragmentProximity();
        break;
      }
    }
  }

  private onAsteroidCaptured(_asteroid: Asteroid): void {
    const idx = this.asteroids.indexOf(_asteroid);
    if (idx >= 0) {
      this.asteroids.splice(idx, 1);
    }
    setTimeout(() => _asteroid.destroy(), 500);
  }

  private onAsteroidOutOfBounds(asteroid: Asteroid): void {
    const idx = this.asteroids.indexOf(asteroid);
    if (idx >= 0) {
      this.asteroids.splice(idx, 1);
    }
    setTimeout(() => asteroid.destroy(), 100);
  }

  private checkFragmentProximity(): void {
    const allGatesUnlocked = this.gates.every((g) => g.getState() === GateState.Unlocked);

    if (!allGatesUnlocked) return;

    for (const frag of this.fragments) {
      if (frag.collected) continue;

      const dist = Phaser.Math.Distance.Between(
        frag.sprite.x,
        frag.sprite.y,
        this.star.x,
        this.star.y
      );

      if (dist < 60) {
        this.collectFragment(frag);
      }
    }

    for (const frag of this.fragments) {
      if (frag.collected) continue;

      for (const asteroid of this.asteroids) {
        if (!asteroid.isFlying()) continue;
        const d = Phaser.Math.Distance.Between(
          frag.sprite.x,
          frag.sprite.y,
          asteroid.x,
          asteroid.y
        );
        if (d < 45) {
          this.collectFragment(frag);
          break;
        }
      }
    }
  }

  private collectFragment(frag: FragmentSprite): void {
    if (frag.collected) return;
    frag.collected = true;
    this.collectedFragments++;

    this.spawnParticleBurst(frag.sprite.x, frag.sprite.y, 0xffd700, 25);

    this.tweens.add({
      targets: [frag.sprite, frag.glow],
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      duration: 400,
      ease: 'Back.easeIn',
      onComplete: () => {
        frag.sprite.destroy();
        frag.glow.destroy();
      },
    });

    if (frag.pulseTween) {
      frag.pulseTween.stop();
    }

    this.updateUI();

    if (this.collectedFragments >= this.totalFragments) {
      this.time.delayedCall(800, () => this.showLevelComplete());
    }
  }

  private spawnParticleBurst(x: number, y: number, color: number, count: number): void {
    const particles: Phaser.GameObjects.Arc[] = [];

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Phaser.Math.FloatBetween(-0.3, 0.3);
      const p = this.add.circle(x, y, Phaser.Math.FloatBetween(1.5, 3), color, 0.9);
      p.setDepth(15);
      particles.push(p);

      const speed = Phaser.Math.FloatBetween(60, 150);
      const dist = Phaser.Math.FloatBetween(40, 120);

      this.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        scaleX: 0.3,
        scaleY: 0.3,
        duration: 600 + speed * 2,
        ease: 'Sine.easeOut',
        onComplete: () => p.destroy(),
      });
    }
  }

  private checkAsteroidGateCollision(): void {
    for (let i = this.asteroids.length - 1; i >= 0; i--) {
      const asteroid = this.asteroids[i];
      if (!asteroid.isFlying()) continue;

      for (const gate of this.gates) {
        if (gate.checkCollision(asteroid.x, asteroid.y)) {
          if (this.onAsteroidHitGate) {
            this.onAsteroidHitGate(asteroid, gate.getOrderIndex());
          }
          break;
        }
      }
    }
  }

  private applyBlackholeGravity(): void {
    for (const bh of this.blackholes) {
      for (const asteroid of this.asteroids) {
        if (asteroid.isFlying()) {
          asteroid.pullToward(bh.x, bh.y, bh.strength);
        }
      }
    }
  }

  private applyInterferenceZones(): void {
    for (const iz of this.interferenceZones) {
      for (const asteroid of this.asteroids) {
        if (!asteroid.isFlying()) continue;

        const dist = Phaser.Math.Distance.Between(asteroid.x, asteroid.y, iz.x, iz.y);
        if (dist < iz.radius) {
          const factor = 1 - dist / iz.radius;
          const angle = this.time.now * 0.003;
          const offX = Math.cos(angle) * iz.strength * factor * 0.02;
          const offY = Math.sin(angle) * iz.strength * factor * 0.02;
          asteroid.applyInterference(offX, offY);
        }
      }
    }
  }

  private showLevelComplete(): void {
    this.levelCompleteOverlay = this.add.container(this.scale.width / 2, this.scale.height / 2);
    this.levelCompleteOverlay.setDepth(100);

    const bg = this.add.graphics();
    bg.fillStyle(0x0a0a1a, 0.85);
    bg.fillRoundedRect(-200, -120, 400, 240, 20);
    this.levelCompleteOverlay.add(bg);

    const title = this.add.text(0, -70, `第 ${this.currentLevel + 1} 关完成`, {
      fontSize: '28px',
      fontFamily: 'serif',
      color: '#ffd700',
      stroke: '#8b5cf6',
      strokeThickness: 2,
    }).setOrigin(0.5);
    this.levelCompleteOverlay.add(title);

    const fragText = this.add.text(0, -20, `收集恒星碎片: ${this.collectedFragments}/${this.totalFragments}`, {
      fontSize: '18px',
      fontFamily: 'serif',
      color: '#c8b8ff',
    }).setOrigin(0.5);
    this.levelCompleteOverlay.add(fragText);

    const btnText = this.currentLevel + 1 < this.totalLevels ? '下一关' : '通关！';
    const btn = this.add.text(0, 50, btnText, {
      fontSize: '22px',
      fontFamily: 'serif',
      color: '#22c55e',
      stroke: '#1a4a2a',
      strokeThickness: 2,
      backgroundColor: '#1a2a1a',
      padding: { x: 30, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setScale(1.1));
    btn.on('pointerout', () => btn.setScale(1));
    btn.on('pointerdown', () => {
      if (this.currentLevel + 1 < this.totalLevels) {
        this.loadLevel(this.currentLevel + 1);
      } else {
        this.showAllComplete();
      }
    });

    this.levelCompleteOverlay.add(btn);
    this.levelCompleteOverlay.setScale(0);
    this.levelCompleteOverlay.setAlpha(0);

    this.tweens.add({
      targets: this.levelCompleteOverlay,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 500,
      ease: 'Back.easeOut',
    });
  }

  private showAllComplete(): void {
    this.clearLevel();
    this.drawGradientBg();

    this.allCompleteOverlay = this.add.container(this.scale.width / 2, this.scale.height / 2);
    this.allCompleteOverlay.setDepth(100);

    const bg = this.add.graphics();
    bg.fillStyle(0x0a0a1a, 0.9);
    bg.fillRoundedRect(-250, -150, 500, 300, 24);
    this.allCompleteOverlay.add(bg);

    const title = this.add.text(0, -90, '🌟 恭喜通关！', {
      fontSize: '36px',
      fontFamily: 'serif',
      color: '#ffd700',
      stroke: '#8b5cf6',
      strokeThickness: 3,
    }).setOrigin(0.5);
    this.allCompleteOverlay.add(title);

    const sub = this.add.text(0, -30, '你已收集所有恒星碎片', {
      fontSize: '20px',
      fontFamily: 'serif',
      color: '#c8b8ff',
    }).setOrigin(0.5);
    this.allCompleteOverlay.add(sub);

    const sub2 = this.add.text(0, 10, '星轨编织者的传说继续...', {
      fontSize: '16px',
      fontFamily: 'serif',
      color: '#8b5cf6',
    }).setOrigin(0.5);
    this.allCompleteOverlay.add(sub2);

    const replayBtn = this.add.text(0, 70, '重新开始', {
      fontSize: '22px',
      fontFamily: 'serif',
      color: '#22c55e',
      backgroundColor: '#1a2a1a',
      padding: { x: 30, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    replayBtn.on('pointerover', () => replayBtn.setScale(1.1));
    replayBtn.on('pointerout', () => replayBtn.setScale(1));
    replayBtn.on('pointerdown', () => {
      this.loadLevel(0);
    });

    this.allCompleteOverlay.add(replayBtn);
    this.allCompleteOverlay.setScale(0);
    this.allCompleteOverlay.setAlpha(0);

    this.tweens.add({
      targets: this.allCompleteOverlay,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 800,
      ease: 'Elastic.easeOut',
    });
  }

  private createUI(): void {
    const panelW = 220;
    const panelH = 160;
    const px = this.scale.width - panelW - 20;
    const py = this.scale.height - panelH - 20;

    this.uiPanel = this.add.graphics();
    this.uiPanel.setDepth(50);
    this.drawUIPanel(this.uiPanel, px, py, panelW, panelH);

    const barW = 180;
    const barH = 14;
    const barX = px + 20;
    const barY = py + 50;

    this.energyBarBg = this.add.graphics();
    this.energyBarBg.setDepth(51);
    this.energyBarBg.fillStyle(0x1a1a3a, 0.8);
    this.energyBarBg.fillRoundedRect(barX, barY, barW, barH, 4);

    this.energyBarFill = this.add.graphics();
    this.energyBarFill.setDepth(52);

    const energyLabel = this.add.text(barX, barY - 20, '能量', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#8b5cf6',
    });
    energyLabel.setDepth(53);

    this.levelText = this.add.text(px + 20, py + 85, `关卡: ${this.currentLevel + 1}/${this.totalLevels}`, {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#c8b8ff',
    });
    this.levelText.setDepth(53);

    this.fragmentText = this.add.text(px + 20, py + 108, `碎片: ${this.collectedFragments}/${this.totalFragments}`, {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#ffd700',
    });
    this.fragmentText.setDepth(53);

    this.resetBtn = this.add.container(px + panelW - 55, py + panelH - 35);
    this.resetBtn.setDepth(53);

    const resetBg = this.add.graphics();
    resetBg.fillStyle(0x2a1a4a, 0.7);
    resetBg.fillRoundedRect(-35, -14, 70, 28, 6);
    resetBg.lineStyle(1, 0x6a3fcf, 0.5);
    resetBg.strokeRoundedRect(-35, -14, 70, 28, 6);
    this.resetBtn.add(resetBg);

    const resetText = this.add.text(0, 0, '重置', {
      fontSize: '13px',
      fontFamily: 'monospace',
      color: '#c8b8ff',
    }).setOrigin(0.5);
    this.resetBtn.add(resetText);

    this.resetBtn.setSize(70, 28);
    this.resetBtn.setInteractive({ useHandCursor: true });

    this.resetBtn.on('pointerover', () => {
      resetBg.clear();
      resetBg.fillStyle(0x3a2a5a, 0.8);
      resetBg.fillRoundedRect(-35, -14, 70, 28, 6);
      resetBg.lineStyle(1, 0x8b5cf6, 0.7);
      resetBg.strokeRoundedRect(-35, -14, 70, 28, 6);
    });

    this.resetBtn.on('pointerout', () => {
      resetBg.clear();
      resetBg.fillStyle(0x2a1a4a, 0.7);
      resetBg.fillRoundedRect(-35, -14, 70, 28, 6);
      resetBg.lineStyle(1, 0x6a3fcf, 0.5);
      resetBg.strokeRoundedRect(-35, -14, 70, 28, 6);
    });

    this.resetBtn.on('pointerdown', () => {
      this.loadLevel(this.currentLevel);
    });
  }

  private drawUIPanel(gfx: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number): void {
    gfx.clear();
    gfx.fillStyle(0x1a1a3a, 0.6);
    gfx.fillRoundedRect(x, y, w, h, 16);

    gfx.lineStyle(1, 0x6a3fcf, 0.3);
    gfx.strokeRoundedRect(x, y, w, h, 16);

    const innerMargin = 4;
    gfx.fillStyle(0x2a2a5a, 0.15);
    gfx.fillRoundedRect(x + innerMargin, y + innerMargin, w - innerMargin * 2, h - innerMargin * 2, 14);
  }

  private updateUI(): void {
    if (!this.star || !this.energyBarFill) return;

    const panelW = 220;
    const panelH = 160;
    const px = this.scale.width - panelW - 20;
    const py = this.scale.height - panelH - 20;

    const barW = 180;
    const barH = 14;
    const barX = px + 20;
    const barY = py + 50;

    this.energyBarFill.clear();

    const energyPct = this.star.getEnergyPercent();
    const fillW = barW * energyPct;

    if (fillW > 0) {
      const color = energyPct > 0.3 ? 0x8b5cf6 : 0xff4466;
      this.energyBarFill.fillStyle(color, 0.9);
      this.energyBarFill.fillRoundedRect(barX, barY, fillW, barH, 4);
    }

    if (this.fragmentText) {
      this.fragmentText.setText(`碎片: ${this.collectedFragments}/${this.totalFragments}`);
    }

    if (this.levelText) {
      this.levelText.setText(`关卡: ${this.currentLevel + 1}/${this.totalLevels}`);
    }
  }

  update(_time: number, delta: number): void {
    if (this.levelCompleteOverlay || this.allCompleteOverlay) return;

    if (this.star) {
      this.star.update(delta);
    }

    this.asteroids.forEach((a) => a.update(delta));

    this.applyBlackholeGravity();
    this.applyInterferenceZones();
    this.checkAsteroidGateCollision();

    const allGatesUnlocked = this.gates.length > 0 && this.gates.every((g) => g.getState() === GateState.Unlocked);
    if (allGatesUnlocked) {
      this.checkFragmentProximity();
    }

    this.updateUI();
  }
}
