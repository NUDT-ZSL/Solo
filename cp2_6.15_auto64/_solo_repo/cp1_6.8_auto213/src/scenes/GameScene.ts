import Phaser from 'phaser';
import { Planet } from '../objects/Planet';
import { GravityWave } from '../objects/GravityWave';
import { ControlPanel } from '../ui/ControlPanel';
import { LEVELS, LevelData } from '../utils/levelData';

export class GameScene extends Phaser.Scene {
  private currentLevelIndex: number = 0;
  private currentLevel: LevelData | null = null;
  private remainingSteps: number = 0;
  private planets: Planet[] = [];
  private activeWaves: GravityWave[] = [];
  private controlPanel: ControlPanel | null = null;
  private waveStrength: number = 5;
  private deflectionAngle: number = 5;

  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;

  private launchIndicator: Phaser.GameObjects.Graphics | null = null;
  private starOrbitGraphics: Phaser.GameObjects.Graphics | null = null;
  private portalGraphics: Phaser.GameObjects.Graphics | null = null;
  private launchPointGfx: Phaser.GameObjects.Graphics | null = null;

  private levelText: Phaser.GameObjects.Text | null = null;
  private stepsText: Phaser.GameObjects.Text | null = null;
  private messageText: Phaser.GameObjects.Text | null = null;

  private portalParticles: Phaser.GameObjects.Graphics | null = null;
  private portalActivated: boolean = false;
  private portalEffectTime: number = 0;
  private portalEffectPos: { x: number; y: number } | null = null;

  private bgGraphics: Phaser.GameObjects.Graphics | null = null;
  private bgStars: { x: number; y: number; size: number; twinkleSpeed: number; phase: number }[] = [];

  private fadeInRect: Phaser.GameObjects.Graphics | null = null;
  private fadeInAlpha: number = 1;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.controlPanel = new ControlPanel(
      (val) => { this.waveStrength = val; },
      (val) => { this.deflectionAngle = val; },
      () => { this.resetLevel(); },
    );

    this.launchIndicator = this.add.graphics();
    this.starOrbitGraphics = this.add.graphics();
    this.portalGraphics = this.add.graphics();
    this.launchPointGfx = this.add.graphics();
    this.bgGraphics = this.add.graphics();
    this.portalParticles = this.add.graphics();

    this.createBackground();
    this.loadLevel(0);

    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);

    this.fadeInRect = this.add.graphics();
    this.fadeInRect.fillStyle(0x000011, 1);
    this.fadeInRect.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);
    this.fadeInRect.setDepth(1000);
    this.fadeInAlpha = 1;
  }

  private createBackground(): void {
    this.bgStars = [];
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    for (let i = 0; i < 200; i++) {
      this.bgStars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        size: Math.random() * 1.8 + 0.3,
        twinkleSpeed: Math.random() * 0.003 + 0.001,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  private loadLevel(index: number): void {
    this.clearLevel();

    if (index >= LEVELS.length) {
      this.showMessage('恭喜通关！所有星轨已解锁！');
      return;
    }

    this.currentLevelIndex = index;
    this.currentLevel = LEVELS[index];
    this.remainingSteps = this.currentLevel.maxSteps;
    this.portalActivated = false;

    this.drawBackground();
    this.drawStarOrbits();
    this.drawPortals();
    this.drawLaunchPoint();
    this.createPlanets();
    this.updateUI();

    this.fadeInAlpha = 1;
  }

  private clearLevel(): void {
    for (const p of this.planets) {
      p.destroy();
    }
    this.planets = [];
    for (const w of this.activeWaves) {
      w.destroy();
    }
    this.activeWaves = [];
    this.starOrbitGraphics?.clear();
    this.portalGraphics?.clear();
    this.launchPointGfx?.clear();
    this.launchIndicator?.clear();
    this.portalParticles?.clear();
    this.levelText?.destroy();
    this.stepsText?.destroy();
    this.messageText?.destroy();
    this.levelText = null;
    this.stepsText = null;
    this.messageText = null;
  }

  private drawBackground(): void {
    if (!this.bgGraphics) return;
    this.bgGraphics.clear();

    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    const steps = 40;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const r = Math.floor(t * 10);
      const g = Math.floor(t * 15);
      const b = Math.floor(8 + t * 40);
      const color = (r << 16) | (g << 8) | b;
      this.bgGraphics.fillStyle(color, 1);
      const y1 = Math.floor(t * h);
      const y2 = Math.floor((t + 1 / steps) * h) + 1;
      this.bgGraphics.fillRect(0, y1, w, y2 - y1);
    }
  }

  private drawStarOrbits(): void {
    if (!this.currentLevel || !this.starOrbitGraphics) return;
    this.starOrbitGraphics.clear();

    for (const orbit of this.currentLevel.starOrbits) {
      if (orbit.length < 2) continue;

      for (let i = 1; i < orbit.length; i++) {
        const t = i / orbit.length;
        const r = Math.floor(80 + t * 100);
        const g = Math.floor(60 + t * 120);
        const b = Math.floor(200 + t * 55);
        const alpha = 0.25 + Math.sin(t * Math.PI) * 0.15;

        this.starOrbitGraphics.lineStyle(1.5, (r << 16) | (g << 8) | b, alpha);
        this.starOrbitGraphics.beginPath();
        this.starOrbitGraphics.moveTo(orbit[i - 1].x, orbit[i - 1].y);

        const steps = 8;
        for (let s = 1; s <= steps; s++) {
          const st = s / steps;
          const px = orbit[i - 1].x + (orbit[i].x - orbit[i - 1].x) * st;
          const py = orbit[i - 1].y + (orbit[i].y - orbit[i - 1].y) * st;
          this.starOrbitGraphics.lineTo(px, py);
        }
        this.starOrbitGraphics.strokePath();
      }

      for (const pt of orbit) {
        this.starOrbitGraphics.fillStyle(0xc0d0ff, 0.4 + Math.random() * 0.3);
        this.starOrbitGraphics.fillCircle(pt.x, pt.y, 1.5);
      }
    }
  }

  private drawPortals(): void {
    if (!this.currentLevel || !this.portalGraphics) return;
    this.portalGraphics.clear();

    for (const portal of this.currentLevel.portals) {
      this.portalGraphics.fillStyle(0x3311aa, 0.15);
      this.portalGraphics.fillCircle(portal.x, portal.y, portal.radius * 2);

      this.portalGraphics.lineStyle(2, 0x6644cc, 0.3);
      this.portalGraphics.strokeCircle(portal.x, portal.y, portal.radius * 1.5);

      this.portalGraphics.lineStyle(2, 0x8866ee, 0.5);
      this.portalGraphics.strokeCircle(portal.x, portal.y, portal.radius);

      this.portalGraphics.fillStyle(0xaa88ff, 0.6);
      this.portalGraphics.fillCircle(portal.x, portal.y, portal.radius * 0.4);

      this.portalGraphics.fillStyle(0xddccff, 0.8);
      this.portalGraphics.fillCircle(portal.x, portal.y, portal.radius * 0.15);
    }
  }

  private drawLaunchPoint(): void {
    if (!this.currentLevel || !this.launchPointGfx) return;
    this.launchPointGfx.clear();

    const lp = this.currentLevel.launchPoint;
    this.launchPointGfx.lineStyle(1.5, 0x4466aa, 0.3);
    this.launchPointGfx.strokeCircle(lp.x, lp.y, 20);

    this.launchPointGfx.fillStyle(0x6688cc, 0.4);
    this.launchPointGfx.fillCircle(lp.x, lp.y, 8);

    this.launchPointGfx.fillStyle(0xaaccff, 0.7);
    this.launchPointGfx.fillCircle(lp.x, lp.y, 4);

    const arrowLen = 30;
    this.launchPointGfx.lineStyle(2, 0x6688cc, 0.4);
    this.launchPointGfx.beginPath();
    this.launchPointGfx.moveTo(lp.x, lp.y - 10);
    this.launchPointGfx.lineTo(lp.x, lp.y - 10 - arrowLen);
    this.launchPointGfx.strokePath();

    this.launchPointGfx.beginPath();
    this.launchPointGfx.moveTo(lp.x - 6, lp.y - 10 - arrowLen + 8);
    this.launchPointGfx.lineTo(lp.x, lp.y - 10 - arrowLen);
    this.launchPointGfx.lineTo(lp.x + 6, lp.y - 10 - arrowLen + 8);
    this.launchPointGfx.strokePath();
  }

  private createPlanets(): void {
    if (!this.currentLevel) return;
    for (const pd of this.currentLevel.planets) {
      const planet = new Planet(
        this, pd.x, pd.y, pd.radius, pd.color, pd.gravityRadius, pd.rotationSpeed,
      );
      this.planets.push(planet);
    }
  }

  private updateUI(): void {
    if (this.levelText) this.levelText.destroy();
    if (this.stepsText) this.stepsText.destroy();

    this.levelText = this.add.text(24, 20, `关卡 ${this.currentLevelIndex + 1}`, {
      fontSize: '20px',
      fontFamily: "'Segoe UI', sans-serif",
      color: '#8090cc',
      fontStyle: 'bold',
    }).setDepth(100);

    this.stepsText = this.add.text(24, 48, `剩余步数: ${this.remainingSteps}`, {
      fontSize: '15px',
      fontFamily: "'Segoe UI', sans-serif",
      color: this.remainingSteps <= 1 ? '#ff6666' : '#a0b0dd',
    }).setDepth(100);
  }

  private showMessage(text: string): void {
    if (this.messageText) this.messageText.destroy();

    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2;

    this.messageText = this.add.text(cx, cy, text, {
      fontSize: '28px',
      fontFamily: "'Segoe UI', sans-serif",
      color: '#c0d0ff',
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5).setDepth(200).setAlpha(0);

    this.tweens.add({
      targets: this.messageText,
      alpha: 1,
      duration: 600,
      ease: 'Power2',
    });
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (!this.currentLevel || this.remainingSteps <= 0 || this.portalActivated) return;

    const lp = this.currentLevel.launchPoint;
    const dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, lp.x, lp.y);
    if (dist < 40) {
      this.isDragging = true;
      this.dragStartX = pointer.x;
      this.dragStartY = pointer.y;
    }
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.isDragging || !this.currentLevel) return;

    this.launchIndicator?.clear();
    const lp = this.currentLevel.launchPoint;

    const dx = this.dragStartX - pointer.x;
    const dy = this.dragStartY - pointer.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 5) return;

    const nx = dx / len;
    const ny = dy / len;
    const strength = Math.min(len * 0.5, 200);

    this.launchIndicator?.lineStyle(2, 0x4488ff, 0.5);
    this.launchIndicator?.beginPath();
    this.launchIndicator?.moveTo(lp.x, lp.y);
    this.launchIndicator?.lineTo(lp.x + nx * strength, lp.y + ny * strength);
    this.launchIndicator?.strokePath();

    this.launchIndicator?.lineStyle(1, 0x4488ff, 0.2);
    this.launchIndicator?.strokeCircle(lp.x, lp.y, 25 + Math.sin(this.time.now * 0.005) * 5);

    for (let i = 0; i < 3; i++) {
      const t = 0.3 + i * 0.25;
      const px = lp.x + nx * strength * t;
      const py = lp.y + ny * strength * t;
      this.launchIndicator?.fillStyle(0x6688ff, 0.3 - i * 0.08);
      this.launchIndicator?.fillCircle(px, py, 3 - i * 0.5);
    }
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (!this.isDragging || !this.currentLevel) return;
    this.isDragging = false;
    this.launchIndicator?.clear();

    const lp = this.currentLevel.launchPoint;
    const dx = this.dragStartX - pointer.x;
    const dy = this.dragStartY - pointer.y;
    const len = Math.sqrt(dx * dx + dy * dy);

    if (len < 15) return;

    const wave = new GravityWave(
      this,
      lp.x,
      lp.y,
      dx,
      dy,
      this.waveStrength / 10,
      this.deflectionAngle / 5,
      this.planets,
    );

    wave.setOnPortalHit((x, y) => {
      this.onPortalActivated(x, y);
    });

    wave.setOnOutOfBounds(() => {
      this.onWaveLost();
    });

    this.activeWaves.push(wave);
    this.remainingSteps--;
    this.updateUI();

    if (this.remainingSteps <= 0 && !this.portalActivated) {
      this.time.delayedCall(2000, () => {
        if (!this.portalActivated) {
          this.showMessage('步数耗尽，重新尝试...');
          this.time.delayedCall(1500, () => {
            this.resetLevel();
          });
        }
      });
    }
  }

  private onPortalActivated(x: number, y: number): void {
    this.portalActivated = true;
    this.portalEffectPos = { x, y };
    this.portalEffectTime = 0;
    this.showMessage('传送门已激活！');

    this.time.delayedCall(2000, () => {
      this.nextLevel();
    });
  }

  private onWaveLost(): void {

  }

  private triggerPortalEffect(time: number): void {
    if (!this.portalEffectPos || !this.portalParticles) return;

    this.portalParticles.clear();
    this.portalEffectTime += 1;

    const cx = this.portalEffectPos.x;
    const cy = this.portalEffectPos.y;
    const particleCount = 60;
    const progress = Math.min(this.portalEffectTime / 120, 1);

    for (let i = 0; i < particleCount; i++) {
      const baseAngle = (Math.PI * 2 / particleCount) * i;
      const spiralAngle = baseAngle + this.portalEffectTime * 0.05 + Math.sin(i * 0.5) * 0.3;
      const radius = 10 + progress * 80 + Math.sin(baseAngle * 3 + this.portalEffectTime * 0.03) * 15;
      const px = cx + Math.cos(spiralAngle) * radius;
      const py = cy + Math.sin(spiralAngle) * radius;

      const alpha = (1 - progress) * (0.4 + Math.sin(i + this.portalEffectTime * 0.1) * 0.3);
      const size = 1.5 + Math.sin(i * 2 + this.portalEffectTime * 0.08) * 1;

      const r = Math.floor(150 + Math.sin(i) * 80);
      const g = Math.floor(100 + Math.cos(i * 0.7) * 80);
      const b = Math.floor(220 + Math.sin(i * 1.3) * 35);

      this.portalParticles.fillStyle((r << 16) | (g << 8) | b, alpha);
      this.portalParticles.fillCircle(px, py, size);
    }

    this.portalParticles.lineStyle(1.5, 0x8866ee, (1 - progress) * 0.5);
    this.portalParticles.strokeCircle(cx, cy, 10 + progress * 50);
  }

  private resetLevel(): void {
    this.loadLevel(this.currentLevelIndex);
  }

  private nextLevel(): void {
    this.loadLevel(this.currentLevelIndex + 1);
  }

  update(time: number, delta: number): void {
    if (this.fadeInAlpha > 0 && this.fadeInRect) {
      this.fadeInAlpha -= 0.025;
      if (this.fadeInAlpha <= 0) {
        this.fadeInAlpha = 0;
        this.fadeInRect.clear();
      } else {
        this.fadeInRect.clear();
        this.fadeInRect.fillStyle(0x000011, this.fadeInAlpha);
        this.fadeInRect.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);
      }
    }

    if (this.bgGraphics) {
      this.bgGraphics.clear();
      this.drawBackground();
      for (const star of this.bgStars) {
        const alpha = 0.3 + Math.sin(time * star.twinkleSpeed + star.phase) * 0.35 + 0.35;
        this.bgGraphics.fillStyle(0xccddff, alpha);
        this.bgGraphics.fillCircle(star.x, star.y, star.size);
      }
    }

    for (const planet of this.planets) {
      planet.update(time, delta);
    }

    const portalPositions = this.currentLevel?.portals ?? [];

    for (let i = this.activeWaves.length - 1; i >= 0; i--) {
      const wave = this.activeWaves[i];
      wave.update(delta, portalPositions);
      wave.render();
      if (!wave.isAlive()) {
        wave.destroy();
        this.activeWaves.splice(i, 1);
      }
    }

    if (this.portalActivated) {
      this.triggerPortalEffect(time);
    }

    this.drawPortals();
  }
}
