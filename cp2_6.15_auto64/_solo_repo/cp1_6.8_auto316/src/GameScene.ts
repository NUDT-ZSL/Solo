import Phaser from 'phaser';
import { Star } from './Star';
import { Asteroid } from './Asteroid';
import { Gate } from './Gate';

interface LevelData {
  star: { x: number; y: number };
  asteroids: { x: number; y: number }[];
  gates: { x: number; y: number }[];
  fragments: { x: number; y: number }[];
  blackHoles: { x: number; y: number }[];
  interferenceZones: { x: number; y: number }[];
  energyRegenRate: number;
  gravityLineCost: number;
  nebulae: { x: number; y: number; idx: number; scale: number }[];
}

export class GameScene extends Phaser.Scene {
  private currentLevel: number = 0;
  private totalLevels: number = 7;
  private playerStar!: Star;
  private asteroids: Asteroid[] = [];
  private gates: Gate[] = [];
  private fragments: Phaser.GameObjects.Sprite[] = [];
  private blackHoles: Phaser.GameObjects.Sprite[] = [];
  private interferenceZones: Phaser.GameObjects.Sprite[] = [];
  private collectedFragments: number = 0;
  private totalFragments: number = 3;
  private nextGateOrder: number = 0;

  private isDragging: boolean = false;
  private dragPoints: Phaser.Math.Vector2[] = [];
  private gravityLineGraphics!: Phaser.GameObjects.Graphics;
  private glowRing!: Phaser.GameObjects.Sprite;
  private gravityLineParticles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

  private bgStars: Phaser.GameObjects.Sprite[] = [];

  private energyBarBg!: Phaser.GameObjects.Graphics;
  private energyBarFill!: Phaser.GameObjects.Graphics;
  private levelText!: Phaser.GameObjects.Text;
  private fragmentText!: Phaser.GameObjects.Text;
  private resetBtn!: Phaser.GameObjects.Text;
  private panelBg!: Phaser.GameObjects.Graphics;

  private levelCompleteOverlay: Phaser.GameObjects.Container | null = null;
  private allCompleteOverlay: Phaser.GameObjects.Container | null = null;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0a0a1a');
    this.createBackground();
    this.createUI();
    this.loadLevel(0);
  }

  private createBackground(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a2e, 0x0a0a2e, 0x1a0a2a, 0x1a0a2a, 1);
    bg.fillRect(0, 0, w, h);
    bg.setDepth(-100);
    bg.setScrollFactor(0);

    for (let i = 0; i < 120; i++) {
      const sx = Phaser.Math.Between(0, w);
      const sy = Phaser.Math.Between(0, h);
      const star = this.add.sprite(sx, sy, 'star');
      star.setAlpha(Phaser.Math.FloatBetween(0.2, 0.9));
      star.setScale(Phaser.Math.FloatBetween(0.3, 0.8));
      star.setDepth(-90);
      star.setScrollFactor(0);
      this.bgStars.push(star);

      this.tweens.add({
        targets: star,
        alpha: { from: star.alpha, to: Phaser.Math.FloatBetween(0.1, 0.5) },
        duration: Phaser.Math.Between(1000, 4000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Phaser.Math.Between(0, 3000),
      });
    }
  }

  private createUI(): void {
    this.gravityLineGraphics = this.add.graphics();
    this.gravityLineGraphics.setDepth(10);

    this.glowRing = this.add.sprite(0, 0, 'glowRing');
    this.glowRing.setVisible(false);
    this.glowRing.setDepth(15);
    this.glowRing.setAlpha(0.7);

    this.createPanel();
  }

  private createPanel(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const panelW = 200;
    const panelH = 140;
    const panelX = w - panelW - 15;
    const panelY = h - panelH - 15;

    this.panelBg = this.add.graphics();
    this.panelBg.setDepth(80);
    this.panelBg.setScrollFactor(0);
    this.drawPanel(panelX, panelY, panelW, panelH);

    this.energyBarBg = this.add.graphics();
    this.energyBarBg.setDepth(81);
    this.energyBarBg.setScrollFactor(0);

    this.energyBarFill = this.add.graphics();
    this.energyBarFill.setDepth(82);
    this.energyBarFill.setScrollFactor(0);

    this.levelText = this.add.text(panelX + 15, panelY + 12, '', {
      fontSize: '14px',
      fontFamily: '"Segoe UI", sans-serif',
      color: '#aabbdd',
    });
    this.levelText.setDepth(83);
    this.levelText.setScrollFactor(0);

    this.fragmentText = this.add.text(panelX + 15, panelY + 34, '', {
      fontSize: '14px',
      fontFamily: '"Segoe UI", sans-serif',
      color: '#ffdd66',
    });
    this.fragmentText.setDepth(83);
    this.fragmentText.setScrollFactor(0);

    this.resetBtn = this.add.text(panelX + panelW / 2, panelY + panelH - 22, '重置关卡', {
      fontSize: '13px',
      fontFamily: '"Segoe UI", sans-serif',
      color: '#88aacc',
      backgroundColor: '#1a2a44',
      padding: { x: 12, y: 4 },
    });
    this.resetBtn.setOrigin(0.5);
    this.resetBtn.setDepth(83);
    this.resetBtn.setScrollFactor(0);
    this.resetBtn.setInteractive({ useHandCursor: true });
    this.resetBtn.on('pointerover', () => this.resetBtn.setColor('#bbddff'));
    this.resetBtn.on('pointerout', () => this.resetBtn.setColor('#88aacc'));
    this.resetBtn.on('pointerdown', () => this.resetLevel());
  }

  private drawPanel(px: number, py: number, pw: number, ph: number): void {
    this.panelBg.clear();
    this.panelBg.fillStyle(0x0d1a33, 0.65);
    this.panelBg.fillRoundedRect(px, py, pw, ph, 12);
    this.panelBg.lineStyle(1, 0x3355aa, 0.3);
    this.panelBg.strokeRoundedRect(px, py, pw, ph, 12);
  }

  private updateEnergyBar(): void {
    if (!this.playerStar || !this.energyBarBg || !this.energyBarFill) return;

    const w = this.scale.width;
    const h = this.scale.height;
    const panelW = 200;
    const panelH = 140;
    const panelX = w - panelW - 15;
    const panelY = h - panelH - 15;
    const barX = panelX + 15;
    const barY = panelY + 58;
    const barW = panelW - 30;
    const barH = 14;

    this.energyBarBg.clear();
    this.energyBarBg.fillStyle(0x1a2a44, 0.8);
    this.energyBarBg.fillRoundedRect(barX, barY, barW, barH, 4);

    this.energyBarFill.clear();
    const pct = this.playerStar.getEnergyPercent();
    const fillW = barW * pct;
    const color = pct > 0.3 ? 0x44aaff : 0xff4444;
    this.energyBarFill.fillStyle(color, 0.9);
    this.energyBarFill.fillRoundedRect(barX, barY, fillW, barH, 4);
  }

  private updateUI(): void {
    if (!this.levelText || !this.fragmentText) return;
    this.levelText.setText(`关卡 ${this.currentLevel + 1} / ${this.totalLevels}`);
    this.fragmentText.setText(`碎片 ${this.collectedFragments} / ${this.totalFragments}`);
    this.updateEnergyBar();
  }

  private getLevelData(index: number): LevelData {
    const w = this.scale.width;
    const h = this.scale.height;
    const cx = w / 2;
    const cy = h / 2;

    const levels: LevelData[] = [
      {
        star: { x: cx * 0.5, y: cy },
        asteroids: [{ x: cx * 0.5, y: cy - 80 }],
        gates: [{ x: cx * 1.5, y: cy }],
        fragments: [
          { x: cx * 1.3, y: cy - 80 },
          { x: cx * 1.7, y: cy + 40 },
          { x: cx * 1.0, y: cy + 100 },
        ],
        blackHoles: [],
        interferenceZones: [],
        energyRegenRate: 6,
        gravityLineCost: 12,
        nebulae: [
          { x: cx * 1.2, y: cy - 60, idx: 0, scale: 1.0 },
        ],
      },
      {
        star: { x: cx * 0.4, y: cy * 0.5 },
        asteroids: [{ x: cx * 0.4, y: cy * 0.5 - 80 }],
        gates: [
          { x: cx * 1.3, y: cy * 0.6 },
          { x: cx * 1.6, y: cy * 1.3 },
        ],
        fragments: [
          { x: cx * 1.0, y: cy * 0.4 },
          { x: cx * 1.5, y: cy * 0.9 },
          { x: cx * 0.7, y: cy * 1.4 },
        ],
        blackHoles: [],
        interferenceZones: [
          { x: cx * 1.0, y: cy * 0.8 },
        ],
        energyRegenRate: 5.5,
        gravityLineCost: 14,
        nebulae: [
          { x: cx * 0.8, y: cy * 1.1, idx: 1, scale: 0.8 },
          { x: cx * 1.4, y: cy * 0.3, idx: 2, scale: 0.6 },
        ],
      },
      {
        star: { x: cx * 0.3, y: cy },
        asteroids: [
          { x: cx * 0.3, y: cy - 90 },
          { x: cx * 0.3, y: cy + 50 },
        ],
        gates: [
          { x: cx * 1.1, y: cy * 0.5 },
          { x: cx * 1.5, y: cy },
          { x: cx * 1.1, y: cy * 1.5 },
        ],
        fragments: [
          { x: cx * 0.8, y: cy * 0.3 },
          { x: cx * 1.3, y: cy * 0.8 },
          { x: cx * 0.6, y: cy * 1.5 },
        ],
        blackHoles: [
          { x: cx * 0.9, y: cy },
        ],
        interferenceZones: [
          { x: cx * 1.3, y: cy * 0.7 },
        ],
        energyRegenRate: 5,
        gravityLineCost: 15,
        nebulae: [
          { x: cx * 0.7, y: cy * 0.5, idx: 0, scale: 0.9 },
          { x: cx * 1.4, y: cy * 1.2, idx: 1, scale: 0.7 },
        ],
      },
      {
        star: { x: cx * 0.5, y: cy * 0.4 },
        asteroids: [
          { x: cx * 0.5, y: cy * 0.4 - 80 },
          { x: cx * 0.5 + 50, y: cy * 0.4 + 30 },
        ],
        gates: [
          { x: cx * 1.2, y: cy * 0.3 },
          { x: cx * 0.8, y: cy * 1.4 },
          { x: cx * 1.5, y: cy * 0.9 },
        ],
        fragments: [
          { x: cx * 0.9, y: cy * 0.6 },
          { x: cx * 1.4, y: cy * 0.5 },
          { x: cx * 0.6, y: cy * 1.2 },
        ],
        blackHoles: [
          { x: cx * 1.0, y: cy * 0.7 },
          { x: cx * 0.5, y: cy * 1.1 },
        ],
        interferenceZones: [
          { x: cx * 1.3, y: cy * 0.5 },
          { x: cx * 0.7, y: cy * 0.9 },
        ],
        energyRegenRate: 4.5,
        gravityLineCost: 16,
        nebulae: [
          { x: cx * 1.1, y: cy * 0.2, idx: 2, scale: 0.8 },
          { x: cx * 0.4, y: cy * 1.3, idx: 0, scale: 0.6 },
        ],
      },
      {
        star: { x: cx * 0.3, y: cy * 0.3 },
        asteroids: [
          { x: cx * 0.3, y: cy * 0.3 - 80 },
          { x: cx * 0.3 + 40, y: cy * 0.3 + 30 },
          { x: cx * 0.3 - 30, y: cy * 0.3 + 60 },
        ],
        gates: [
          { x: cx * 0.9, y: cy * 0.4 },
          { x: cx * 1.4, y: cy * 0.6 },
          { x: cx * 1.0, y: cy * 1.3 },
          { x: cx * 0.5, y: cy * 1.5 },
        ],
        fragments: [
          { x: cx * 0.7, y: cy * 0.2 },
          { x: cx * 1.2, y: cy * 0.9 },
          { x: cx * 0.4, y: cy * 1.2 },
        ],
        blackHoles: [
          { x: cx * 1.1, y: cy * 0.8 },
          { x: cx * 0.6, y: cy * 0.7 },
        ],
        interferenceZones: [
          { x: cx * 0.8, y: cy * 0.5 },
          { x: cx * 1.3, y: cy * 0.3 },
          { x: cx * 0.5, y: cy * 1.0 },
        ],
        energyRegenRate: 4,
        gravityLineCost: 17,
        nebulae: [
          { x: cx * 0.9, y: cy * 0.3, idx: 1, scale: 0.9 },
          { x: cx * 0.4, y: cy * 1.2, idx: 2, scale: 0.7 },
          { x: cx * 1.3, y: cy * 1.0, idx: 0, scale: 0.5 },
        ],
      },
      {
        star: { x: cx * 0.5, y: cy * 0.5 },
        asteroids: [
          { x: cx * 0.5, y: cy * 0.5 - 90 },
          { x: cx * 0.5 + 60, y: cy * 0.5 - 40 },
        ],
        gates: [
          { x: cx * 1.3, y: cy * 0.3 },
          { x: cx * 0.7, y: cy * 1.4 },
          { x: cx * 1.5, y: cy * 1.1 },
        ],
        fragments: [
          { x: cx * 1.0, y: cy * 0.5 },
          { x: cx * 0.5, y: cy * 1.3 },
          { x: cx * 1.3, y: cy * 0.7 },
        ],
        blackHoles: [
          { x: cx * 0.9, y: cy * 0.6 },
          { x: cx * 1.2, y: cy * 0.9 },
          { x: cx * 0.6, y: cy * 1.0 },
        ],
        interferenceZones: [
          { x: cx * 1.0, y: cy * 0.4 },
          { x: cx * 0.7, y: cy * 0.8 },
          { x: cx * 1.4, y: cy * 0.5 },
        ],
        energyRegenRate: 3.5,
        gravityLineCost: 18,
        nebulae: [
          { x: cx * 0.8, y: cy * 0.4, idx: 0, scale: 1.0 },
          { x: cx * 1.3, y: cy * 1.0, idx: 1, scale: 0.8 },
          { x: cx * 0.5, y: cy * 1.3, idx: 2, scale: 0.6 },
        ],
      },
      {
        star: { x: cx * 0.4, y: cy * 0.6 },
        asteroids: [
          { x: cx * 0.4, y: cy * 0.6 - 90 },
          { x: cx * 0.4 + 50, y: cy * 0.6 + 20 },
          { x: cx * 0.4 - 40, y: cy * 0.6 - 30 },
        ],
        gates: [
          { x: cx * 1.0, y: cy * 0.3 },
          { x: cx * 1.5, y: cy * 0.5 },
          { x: cx * 1.3, y: cy * 1.2 },
          { x: cx * 0.6, y: cy * 1.5 },
        ],
        fragments: [
          { x: cx * 0.8, y: cy * 0.2 },
          { x: cx * 1.3, y: cy * 0.8 },
          { x: cx * 0.5, y: cy * 1.3 },
        ],
        blackHoles: [
          { x: cx * 0.8, y: cy * 0.5 },
          { x: cx * 1.2, y: cy * 0.7 },
          { x: cx * 0.5, y: cy * 1.1 },
        ],
        interferenceZones: [
          { x: cx * 0.9, y: cy * 0.4 },
          { x: cx * 1.3, y: cy * 0.3 },
          { x: cx * 0.7, y: cy * 0.9 },
          { x: cx * 1.1, y: cy * 1.0 },
        ],
        energyRegenRate: 3,
        gravityLineCost: 20,
        nebulae: [
          { x: cx * 0.7, y: cy * 0.3, idx: 0, scale: 1.0 },
          { x: cx * 1.2, y: cy * 0.8, idx: 1, scale: 0.9 },
          { x: cx * 0.4, y: cy * 1.4, idx: 2, scale: 0.7 },
          { x: cx * 1.5, y: cy * 0.2, idx: 0, scale: 0.5 },
        ],
      },
    ];

    return levels[Math.min(index, levels.length - 1)];
  }

  private loadLevel(index: number): void {
    this.clearLevelObjects();

    this.currentLevel = index;
    this.collectedFragments = 0;
    this.nextGateOrder = 0;

    const data = this.getLevelData(index);

    this.playerStar = new Star(this, data.star.x, data.star.y);
    this.playerStar.energyRegenRate = data.energyRegenRate;
    this.playerStar.gravityLineCost = data.gravityLineCost;
    this.playerStar.setDepth(20);

    data.nebulae.forEach((n) => {
      const neb = this.add.sprite(n.x, n.y, `nebula${n.idx}`);
      neb.setScale(n.scale);
      neb.setAlpha(0.5);
      neb.setDepth(-50);
    });

    data.asteroids.forEach((a) => {
      const asteroid = new Asteroid(this, a.x, a.y);
      asteroid.setDepth(15);
      this.asteroids.push(asteroid);
    });

    data.gates.forEach((g, i) => {
      const gate = new Gate(this, g.x, g.y, i);
      gate.setDepth(12);
      this.gates.push(gate);
    });

    data.fragments.forEach((f) => {
      const frag = this.add.sprite(f.x, f.y, 'fragment');
      frag.setDepth(14);
      frag.setScale(0.8);
      this.fragments.push(frag);
      this.tweens.add({
        targets: frag,
        scaleX: { from: 0.8, to: 1.0 },
        scaleY: { from: 0.8, to: 1.0 },
        alpha: { from: 0.6, to: 1.0 },
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });

    data.blackHoles.forEach((b) => {
      const bh = this.add.sprite(b.x, b.y, 'blackHole');
      bh.setDepth(11);
      this.blackHoles.push(bh);
      this.tweens.add({
        targets: bh,
        angle: 360,
        duration: 6000,
        repeat: -1,
        ease: 'Linear',
      });
    });

    data.interferenceZones.forEach((iz) => {
      const zone = this.add.sprite(iz.x, iz.y, 'interferenceZone');
      zone.setDepth(5);
      this.interferenceZones.push(zone);
      this.tweens.add({
        targets: zone,
        alpha: { from: 0.5, to: 0.8 },
        duration: 2000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });

    this.totalFragments = data.fragments.length;
    this.updateUI();

    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);
  }

  private clearLevelObjects(): void {
    this.input.off('pointerdown', this.onPointerDown, this);
    this.input.off('pointermove', this.onPointerMove, this);
    this.input.off('pointerup', this.onPointerUp, this);

    if (this.playerStar) this.playerStar.destroy();
    this.asteroids.forEach((a) => a.destroy());
    this.gates.forEach((g) => g.destroy());
    this.fragments.forEach((f) => f.destroy());
    this.blackHoles.forEach((b) => b.destroy());
    this.interferenceZones.forEach((iz) => iz.destroy());

    this.asteroids = [];
    this.gates = [];
    this.fragments = [];
    this.blackHoles = [];
    this.interferenceZones = [];

    this.isDragging = false;
    this.dragPoints = [];
    this.gravityLineGraphics.clear();
    this.glowRing.setVisible(false);
    this.destroyGravityLineParticles();

    if (this.levelCompleteOverlay) {
      this.levelCompleteOverlay.destroy();
      this.levelCompleteOverlay = null;
    }
    if (this.allCompleteOverlay) {
      this.allCompleteOverlay.destroy();
      this.allCompleteOverlay = null;
    }
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.levelCompleteOverlay || this.allCompleteOverlay) return;

    const dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, this.playerStar.x, this.playerStar.y);
    if (dist > 60) return;

    this.isDragging = true;
    this.dragPoints = [new Phaser.Math.Vector2(pointer.x, pointer.y)];
    this.glowRing.setPosition(pointer.x, pointer.y);
    this.glowRing.setVisible(true);
    this.glowRing.setScale(0.5);
    this.tweens.add({
      targets: this.glowRing,
      scaleX: 1,
      scaleY: 1,
      alpha: 0.7,
      duration: 200,
      ease: 'Back.easeOut',
    });
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.isDragging) return;

    const newPoint = new Phaser.Math.Vector2(pointer.x, pointer.y);
    const lastPoint = this.dragPoints[this.dragPoints.length - 1];
    const segDist = Phaser.Math.Distance.Between(newPoint.x, newPoint.y, lastPoint.x, lastPoint.y);

    if (segDist > 5) {
      this.dragPoints.push(newPoint);
    }

    this.glowRing.setPosition(pointer.x, pointer.y);

    this.drawGravityLine();
  }

  private onPointerUp(_pointer: Phaser.Input.Pointer): void {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.glowRing.setVisible(false);

    if (this.dragPoints.length < 3) {
      this.gravityLineGraphics.clear();
      this.destroyGravityLineParticles();
      return;
    }

    const totalLength = this.calculatePathLength();
    if (!this.playerStar.canDrawLine(totalLength)) {
      this.gravityLineGraphics.clear();
      this.destroyGravityLineParticles();
      return;
    }

    this.playerStar.consumeEnergyForLine(totalLength);
    this.launchAsteroidAlongPath();

    this.tweens.addCounter({
      from: 1,
      to: 0,
      duration: 800,
      onUpdate: (tw: Phaser.Tweens.Tween) => {
        this.gravityLineGraphics.setAlpha(tw.getValue() ?? 0);
      },
      onComplete: () => {
        this.gravityLineGraphics.clear();
        this.gravityLineGraphics.setAlpha(1);
      },
    });

    this.destroyGravityLineParticles();
    this.dragPoints = [];
  }

  private drawGravityLine(): void {
    this.gravityLineGraphics.clear();
    if (this.dragPoints.length < 2) return;

    this.gravityLineGraphics.lineStyle(3, 0x44aaff, 0.7);
    this.gravityLineGraphics.beginPath();
    this.gravityLineGraphics.moveTo(this.dragPoints[0].x, this.dragPoints[0].y);

    if (this.dragPoints.length === 2) {
      this.gravityLineGraphics.lineTo(this.dragPoints[1].x, this.dragPoints[1].y);
    } else {
      const smooth = this.smoothPoints(this.dragPoints);
      this.gravityLineGraphics.moveTo(smooth[0].x, smooth[0].y);
      for (let i = 1; i < smooth.length; i++) {
        this.gravityLineGraphics.lineTo(smooth[i].x, smooth[i].y);
      }
    }
    this.gravityLineGraphics.strokePath();

    this.gravityLineGraphics.lineStyle(8, 0x44aaff, 0.15);
    this.gravityLineGraphics.beginPath();
    this.gravityLineGraphics.moveTo(this.dragPoints[0].x, this.dragPoints[0].y);
    if (this.dragPoints.length > 2) {
      const smooth = this.smoothPoints(this.dragPoints);
      this.gravityLineGraphics.moveTo(smooth[0].x, smooth[0].y);
      for (let i = 1; i < smooth.length; i++) {
        this.gravityLineGraphics.lineTo(smooth[i].x, smooth[i].y);
      }
    } else {
      this.gravityLineGraphics.lineTo(this.dragPoints[1].x, this.dragPoints[1].y);
    }
    this.gravityLineGraphics.strokePath();

    this.updateGravityLineParticles();
  }

  private smoothPoints(points: Phaser.Math.Vector2[]): Phaser.Math.Vector2[] {
    if (points.length < 3) return points;
    const result: Phaser.Math.Vector2[] = [points[0]];
    for (let i = 1; i < points.length - 1; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const next = points[i + 1];
      result.push(new Phaser.Math.Vector2(
        (prev.x + curr.x * 2 + next.x) / 4,
        (prev.y + curr.y * 2 + next.y) / 4
      ));
    }
    result.push(points[points.length - 1]);
    return result;
  }

  private updateGravityLineParticles(): void {
    this.destroyGravityLineParticles();
    if (this.dragPoints.length < 4) return;

    const smooth = this.smoothPoints(this.dragPoints);
    const step = Math.max(1, Math.floor(smooth.length / 8));
    const emitPoints: { x: number; y: number }[] = [];
    for (let i = 0; i < smooth.length; i += step) {
      emitPoints.push({ x: smooth[i].x, y: smooth[i].y });
    }

    if (emitPoints.length === 0) return;

    this.gravityLineParticles = this.add.particles(emitPoints[0].x, emitPoints[0].y, 'particle', {
      speed: { min: 5, max: 20 },
      lifespan: { min: 300, max: 600 },
      alpha: { start: 0.5, end: 0 },
      scale: { start: 0.4, end: 0 },
      blendMode: 'ADD',
      frequency: 60,
      quantity: 1,
    });
    this.gravityLineParticles.setDepth(11);
  }

  private destroyGravityLineParticles(): void {
    if (this.gravityLineParticles) {
      this.gravityLineParticles.stop();
      this.gravityLineParticles.destroy();
      this.gravityLineParticles = null;
    }
  }

  private calculatePathLength(): number {
    let len = 0;
    for (let i = 1; i < this.dragPoints.length; i++) {
      len += Phaser.Math.Distance.Between(
        this.dragPoints[i - 1].x, this.dragPoints[i - 1].y,
        this.dragPoints[i].x, this.dragPoints[i].y
      );
    }
    return len;
  }

  private launchAsteroidAlongPath(): void {
    if (this.dragPoints.length < 3) return;

    const smooth = this.smoothPoints(this.dragPoints);
    const launchAsteroid = this.asteroids.find((a) => !a.isLaunched && !a.isAbsorbed);
    if (!launchAsteroid) return;

    const startX = launchAsteroid.x;
    const startY = launchAsteroid.y;
    const firstTarget = smooth[0];
    const toStartDist = Phaser.Math.Distance.Between(startX, startY, firstTarget.x, firstTarget.y);
    if (toStartDist > 120) return;

    const dir = smooth[1].clone().subtract(smooth[0]).normalize();
    const speed = launchAsteroid.speed;
    launchAsteroid.launch(dir.x * speed, dir.y * speed);

    let pathIndex = 1;
    const pathFollowInterval = this.time.addEvent({
      delay: 16,
      callback: () => {
        if (!launchAsteroid.isLaunched || launchAsteroid.isAbsorbed) {
          pathFollowInterval.remove();
          return;
        }
        if (pathIndex >= smooth.length) {
          pathFollowInterval.remove();
          return;
        }

        const target = smooth[pathIndex];
        const dist = Phaser.Math.Distance.Between(launchAsteroid.x, launchAsteroid.y, target.x, target.y);
        if (dist < 15) {
          pathIndex++;
        }

        if (pathIndex < smooth.length) {
          const nextTarget = smooth[pathIndex];
          const dir2 = new Phaser.Math.Vector2(nextTarget.x - launchAsteroid.x, nextTarget.y - launchAsteroid.y).normalize();
          const body = launchAsteroid.body as Phaser.Physics.Arcade.Body;
          const currentSpeed = Math.sqrt(body.velocity.x ** 2 + body.velocity.y ** 2);
          const blendFactor = 0.08;
          body.setVelocity(
            body.velocity.x * (1 - blendFactor) + dir2.x * currentSpeed * blendFactor,
            body.velocity.y * (1 - blendFactor) + dir2.y * currentSpeed * blendFactor
          );
        }
      },
      loop: true,
    });
  }

  update(_time: number, delta: number): void {
    if (this.playerStar) {
      this.playerStar.regenerateEnergy(delta);
    }

    this.asteroids.forEach((asteroid) => {
      if (!asteroid.isLaunched || asteroid.isAbsorbed) return;
      asteroid.update(delta);

      this.gates.forEach((gate) => {
        if (gate.isActive) return;
        if (gate.orderIndex !== this.nextGateOrder) return;
        if (gate.checkCollision(asteroid)) {
          gate.activate();
          this.nextGateOrder++;
        }
      });

      this.blackHoles.forEach((bh) => {
        const dist = Phaser.Math.Distance.Between(asteroid.x, asteroid.y, bh.x, bh.y);
        if (dist < 20) {
          asteroid.absorb();
        } else if (dist < 100) {
          const force = 800 / (dist * dist);
          const dx = bh.x - asteroid.x;
          const dy = bh.y - asteroid.y;
          const body = asteroid.body as Phaser.Physics.Arcade.Body;
          body.setVelocity(
            body.velocity.x + dx * force,
            body.velocity.y + dy * force
          );
        }
      });

      this.interferenceZones.forEach((zone) => {
        const dist = Phaser.Math.Distance.Between(asteroid.x, asteroid.y, zone.x, zone.y);
        if (dist < 55) {
          asteroid.applyInterference(
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2
          );
        }
      });
    });

    this.checkFragmentCollection();
    this.updateUI();
  }

  private checkFragmentCollection(): void {
    const launchedAsteroids = this.asteroids.filter((a) => a.isLaunched && !a.isAbsorbed);
    const allGatesOpen = this.gates.length > 0 && this.gates.every((g) => g.isActive);

    this.fragments.forEach((frag, idx) => {
      if (!frag.active) return;

      if (allGatesOpen) {
        const collector = launchedAsteroids.length > 0 ? launchedAsteroids[0] : this.playerStar;
        const dist = Phaser.Math.Distance.Between(frag.x, frag.y, collector.x, collector.y);
        if (dist < 50) {
          this.collectFragment(frag, idx);
        }
      }
    });
  }

  private collectFragment(frag: Phaser.GameObjects.Sprite, _idx: number): void {
    frag.setActive(false);

    this.tweens.add({
      targets: frag,
      alpha: 0,
      scaleX: 2,
      scaleY: 2,
      duration: 400,
      ease: 'Power2',
      onComplete: () => {
        frag.destroy();
      },
    });

    const burst = this.add.particles(frag.x, frag.y, 'particle', {
      speed: { min: 30, max: 80 },
      lifespan: { min: 200, max: 500 },
      alpha: { start: 0.9, end: 0 },
      scale: { start: 0.6, end: 0 },
      blendMode: 'ADD',
      quantity: 12,
      emitting: false,
    });
    burst.explode(12);
    this.time.delayedCall(800, () => {
      burst.destroy();
    });

    this.collectedFragments++;
    this.updateUI();

    if (this.collectedFragments >= this.totalFragments) {
      this.time.delayedCall(600, () => this.onLevelComplete());
    }
  }

  private onLevelComplete(): void {
    if (this.levelCompleteOverlay) return;

    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    this.levelCompleteOverlay = this.add.container(cx, cy);
    this.levelCompleteOverlay.setDepth(100);
    this.levelCompleteOverlay.setScrollFactor(0);

    const bg = this.add.graphics();
    bg.fillStyle(0x0a0a2e, 0.7);
    bg.fillRoundedRect(-160, -70, 320, 140, 16);
    bg.lineStyle(2, 0x44aaff, 0.4);
    bg.strokeRoundedRect(-160, -70, 320, 140, 16);
    this.levelCompleteOverlay.add(bg);

    const title = this.add.text(0, -30, '✦ 关卡完成 ✦', {
      fontSize: '24px',
      fontFamily: '"Segoe UI", sans-serif',
      color: '#ffdd66',
    }).setOrigin(0.5);
    this.levelCompleteOverlay.add(title);

    const isLast = this.currentLevel >= this.totalLevels - 1;
    const btnText = isLast ? '通关结算' : '下一关';
    const btn = this.add.text(0, 25, btnText, {
      fontSize: '18px',
      fontFamily: '"Segoe UI", sans-serif',
      color: '#88ccff',
      backgroundColor: '#1a2a55',
      padding: { x: 20, y: 8 },
    }).setOrigin(0.5);
    btn.setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => btn.setColor('#bbddff'));
    btn.on('pointerout', () => btn.setColor('#88ccff'));
    btn.on('pointerdown', () => {
      if (isLast) {
        this.onAllComplete();
      } else {
        this.loadLevel(this.currentLevel + 1);
      }
    });
    this.levelCompleteOverlay.add(btn);

    this.levelCompleteOverlay.setScale(0);
    this.tweens.add({
      targets: this.levelCompleteOverlay,
      scaleX: 1,
      scaleY: 1,
      duration: 400,
      ease: 'Back.easeOut',
    });
  }

  private onAllComplete(): void {
    if (this.allCompleteOverlay) return;

    if (this.levelCompleteOverlay) {
      this.levelCompleteOverlay.destroy();
      this.levelCompleteOverlay = null;
    }

    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    this.allCompleteOverlay = this.add.container(cx, cy);
    this.allCompleteOverlay.setDepth(100);
    this.allCompleteOverlay.setScrollFactor(0);

    const bg = this.add.graphics();
    bg.fillStyle(0x0a0a2e, 0.85);
    bg.fillRoundedRect(-200, -90, 400, 180, 16);
    bg.lineStyle(2, 0xffdd66, 0.5);
    bg.strokeRoundedRect(-200, -90, 400, 180, 16);
    this.allCompleteOverlay.add(bg);

    const title = this.add.text(0, -50, '★ 恭喜通关 ★', {
      fontSize: '28px',
      fontFamily: '"Segoe UI", sans-serif',
      color: '#ffdd66',
    }).setOrigin(0.5);
    this.allCompleteOverlay.add(title);

    const desc = this.add.text(0, -5, '你已收集所有恒星碎片，\n星轨编织完成！', {
      fontSize: '16px',
      fontFamily: '"Segoe UI", sans-serif',
      color: '#aabbdd',
      align: 'center',
    }).setOrigin(0.5);
    this.allCompleteOverlay.add(desc);

    const restartBtn = this.add.text(0, 50, '重新开始', {
      fontSize: '18px',
      fontFamily: '"Segoe UI", sans-serif',
      color: '#88ccff',
      backgroundColor: '#1a2a55',
      padding: { x: 20, y: 8 },
    }).setOrigin(0.5);
    restartBtn.setInteractive({ useHandCursor: true });
    restartBtn.on('pointerover', () => restartBtn.setColor('#bbddff'));
    restartBtn.on('pointerout', () => restartBtn.setColor('#88ccff'));
    restartBtn.on('pointerdown', () => {
      this.loadLevel(0);
    });
    this.allCompleteOverlay.add(restartBtn);

    this.allCompleteOverlay.setScale(0);
    this.tweens.add({
      targets: this.allCompleteOverlay,
      scaleX: 1,
      scaleY: 1,
      duration: 500,
      ease: 'Back.easeOut',
    });
  }

  private resetLevel(): void {
    this.loadLevel(this.currentLevel);
  }
}
