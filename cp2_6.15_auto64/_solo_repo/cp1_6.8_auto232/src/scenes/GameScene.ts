import Phaser from 'phaser';
import {
  LEVELS,
  GAME_WIDTH,
  GAME_HEIGHT,
  COLORS,
  PLANET_COLORS,
  LevelConfig,
  PlanetConfig,
  PortalConfig,
} from '../config';
import { StarTrail } from '../objects/StarTrail';
import { GravityWave } from '../objects/GravityWave';

interface PlanetGameObject {
  config: PlanetConfig;
  graphics: Phaser.GameObjects.Graphics;
  glowGraphics: Phaser.GameObjects.Graphics;
  currentX: number;
  currentY: number;
  rotationAngle: number;
}

interface PortalGameObject {
  config: PortalConfig;
  graphics: Phaser.GameObjects.Graphics;
  activated: boolean;
  activateTime: number;
  particles: { angle: number; dist: number; speed: number; size: number; alpha: number }[];
}

export class GameScene extends Phaser.Scene {
  private levelConfig!: LevelConfig;
  private starTrails: StarTrail[] = [];
  private planets: PlanetGameObject[] = [];
  private portals: PortalGameObject[] = [];
  private waves: GravityWave[] = [];
  private bgGraphics!: Phaser.GameObjects.Graphics;
  private bgStars: { x: number; y: number; size: number; twinkle: number; phase: number }[] = [];
  private bgStarGraphics!: Phaser.GameObjects.Graphics;

  private remainingSteps: number = 0;
  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private aimGraphics!: Phaser.GameObjects.Graphics;

  private waveStrength: number = 0.5;
  private deflectionAngle: number = 1.0;

  private levelText!: Phaser.GameObjects.Text;
  private stepsText!: Phaser.GameObjects.Text;
  private resultText!: Phaser.GameObjects.Text;

  private panelContainer!: Phaser.GameObjects.Container;
  private strengthSlider!: Phaser.GameObjects.Graphics;
  private deflectionSlider!: Phaser.GameObjects.Graphics;
  private strengthHandle!: Phaser.GameObjects.Arc;
  private deflectionHandle!: Phaser.GameObjects.Arc;
  private draggingSlider: string | null = null;

  private portalParticlesGraphics!: Phaser.GameObjects.Graphics;
  private gameEnded: boolean = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: { levelId: number }): void {
    const level = LEVELS.find((l) => l.id === data.levelId);
    if (!level) {
      this.scene.start('LevelSelectScene');
      return;
    }
    this.levelConfig = level;
    this.remainingSteps = level.maxSteps;
    this.isDragging = false;
    this.gameEnded = false;
    this.waves = [];
    this.starTrails = [];
    this.planets = [];
    this.portals = [];
    this.bgStars = [];
    this.draggingSlider = null;
    this.waveStrength = 0.5;
    this.deflectionAngle = 1.0;
  }

  create(): void {
    this.drawBackground();
    this.createBgStars();
    this.createStarTrails();
    this.createPlanets();
    this.createPortals();
    this.createAimLine();
    this.createUI();
    this.createControlPanel();
    this.setupInput();
    this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  private drawBackground(): void {
    this.bgGraphics = this.add.graphics();
    for (let y = 0; y < GAME_HEIGHT; y++) {
      const t = y / GAME_HEIGHT;
      const r = Math.floor(Phaser.Math.Linear((COLORS.bgTop >> 16) & 0xff, (COLORS.bgBottom >> 16) & 0xff, t));
      const g = Math.floor(Phaser.Math.Linear((COLORS.bgTop >> 8) & 0xff, (COLORS.bgBottom >> 8) & 0xff, t));
      const b = Math.floor(Phaser.Math.Linear(COLORS.bgTop & 0xff, COLORS.bgBottom & 0xff, t));
      this.bgGraphics.fillStyle((r << 16) | (g << 8) | b, 1);
      this.bgGraphics.fillRect(0, y, GAME_WIDTH, 1);
    }
  }

  private createBgStars(): void {
    this.bgStarGraphics = this.add.graphics();
    for (let i = 0; i < 100; i++) {
      this.bgStars.push({
        x: Phaser.Math.Between(0, GAME_WIDTH),
        y: Phaser.Math.Between(0, GAME_HEIGHT),
        size: Math.random() * 1.5 + 0.3,
        twinkle: Math.random() * 0.015 + 0.003,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  private createStarTrails(): void {
    for (const trailConfig of this.levelConfig.starTrails) {
      this.starTrails.push(new StarTrail(this, trailConfig));
    }
  }

  private createPlanets(): void {
    for (const pConfig of this.levelConfig.planets) {
      const colorData = PLANET_COLORS[pConfig.colorIndex % PLANET_COLORS.length];
      const graphics = this.add.graphics();
      const glowGraphics = this.add.graphics();
      glowGraphics.setBlendMode(Phaser.BlendModes.ADD);

      this.planets.push({
        config: pConfig,
        graphics,
        glowGraphics,
        currentX: pConfig.x,
        currentY: pConfig.y,
        rotationAngle: 0,
      });
    }
  }

  private createPortals(): void {
    this.portalParticlesGraphics = this.add.graphics();
    this.portalParticlesGraphics.setBlendMode(Phaser.BlendModes.ADD);

    for (const portalConfig of this.levelConfig.portals) {
      const graphics = this.add.graphics();
      const particles: PortalGameObject['particles'] = [];
      for (let i = 0; i < 24; i++) {
        particles.push({
          angle: (i / 24) * Math.PI * 2,
          dist: portalConfig.radius + 5,
          speed: 0.8 + Math.random() * 0.5,
          size: 1.5 + Math.random() * 1.5,
          alpha: 0.4 + Math.random() * 0.4,
        });
      }

      this.portals.push({
        config: portalConfig,
        graphics,
        activated: false,
        activateTime: 0,
        particles,
      });
    }
  }

  private createAimLine(): void {
    this.aimGraphics = this.add.graphics();
  }

  private createUI(): void {
    this.levelText = this.add.text(20, 20, `关卡 ${this.levelConfig.id}: ${this.levelConfig.name}`, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '20px',
      color: '#aabbdd',
      fontStyle: 'bold',
    });

    this.stepsText = this.add.text(20, 50, `剩余步数: ${this.remainingSteps}`, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '16px',
      color: '#8899bb',
    });

    this.resultText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '', {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '36px',
      color: '#00ffaa',
      fontStyle: 'bold',
      stroke: '#003322',
      strokeThickness: 3,
    });
    this.resultText.setOrigin(0.5);
    this.resultText.setAlpha(0);

    const backBtn = this.add.text(GAME_WIDTH - 20, 20, '← 返回', {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '14px',
      color: '#667799',
    });
    backBtn.setOrigin(1, 0);
    backBtn.setInteractive({ useHandCursor: true });
    backBtn.on('pointerover', () => backBtn.setColor('#99aacc'));
    backBtn.on('pointerout', () => backBtn.setColor('#667799'));
    backBtn.on('pointerdown', () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.time.delayedCall(300, () => this.scene.start('LevelSelectScene'));
    });
  }

  private createControlPanel(): void {
    const panelX = GAME_WIDTH - 210;
    const panelY = GAME_HEIGHT - 190;
    const panelW = 195;
    const panelH = 175;

    this.panelContainer = this.add.container(0, 0);

    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x0a0a2e, 0.65);
    panelBg.fillRoundedRect(panelX, panelY, panelW, panelH, 10);
    panelBg.lineStyle(1, 0x334466, 0.5);
    panelBg.strokeRoundedRect(panelX, panelY, panelW, panelH, 10);

    const strengthLabel = this.add.text(panelX + 15, panelY + 15, '引力波强度', {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '12px',
      color: '#8899bb',
    });

    const deflectionLabel = this.add.text(panelX + 15, panelY + 75, '偏折角度', {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '12px',
      color: '#8899bb',
    });

    this.strengthSlider = this.add.graphics();
    this.drawSliderTrack(this.strengthSlider, panelX + 15, panelY + 38, 165, this.waveStrength);

    this.deflectionSlider = this.add.graphics();
    this.drawSliderTrack(this.deflectionSlider, panelX + 15, panelY + 98, 165, this.deflectionAngle / 2.0);

    this.strengthHandle = this.add.arc(
      panelX + 15 + 165 * this.waveStrength,
      panelY + 38,
      6,
      0,
      360,
      false,
      0x4488ff,
      1
    );
    this.strengthHandle.setStrokeStyle(1, 0xaaccff, 0.8);
    this.strengthHandle.setInteractive({ draggable: true, useHandCursor: true });

    this.deflectionHandle = this.add.arc(
      panelX + 15 + 165 * (this.deflectionAngle / 2.0),
      panelY + 98,
      6,
      0,
      360,
      false,
      0x4488ff,
      1
    );
    this.deflectionHandle.setStrokeStyle(1, 0xaaccff, 0.8);
    this.deflectionHandle.setInteractive({ draggable: true, useHandCursor: true });

    this.strengthHandle.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number) => {
      const minX = panelX + 15;
      const maxX = panelX + 15 + 165;
      const clamped = Phaser.Math.Clamp(dragX, minX, maxX);
      this.strengthHandle.setX(clamped);
      this.waveStrength = (clamped - minX) / 165;
      this.strengthSlider.clear();
      this.drawSliderTrack(this.strengthSlider, panelX + 15, panelY + 38, 165, this.waveStrength);
    });

    this.deflectionHandle.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number) => {
      const minX = panelX + 15;
      const maxX = panelX + 15 + 165;
      const clamped = Phaser.Math.Clamp(dragX, minX, maxX);
      this.deflectionHandle.setX(clamped);
      this.deflectionAngle = ((clamped - minX) / 165) * 2.0;
      this.deflectionSlider.clear();
      this.drawSliderTrack(this.deflectionSlider, panelX + 15, panelY + 98, 165, this.deflectionAngle / 2.0);
    });

    const resetBtn = this.add.text(panelX + panelW / 2, panelY + 145, '重置关卡', {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '13px',
      color: '#aabbcc',
      backgroundColor: '#1a1a4e',
      padding: { x: 12, y: 5 },
    });
    resetBtn.setOrigin(0.5);
    resetBtn.setInteractive({ useHandCursor: true });
    resetBtn.on('pointerover', () => resetBtn.setColor('#ddeeff'));
    resetBtn.on('pointerout', () => resetBtn.setColor('#aabbcc'));
    resetBtn.on('pointerdown', () => this.restartLevel());
  }

  private drawSliderTrack(graphics: Phaser.GameObjects.Graphics, x: number, y: number, width: number, value: number): void {
    graphics.fillStyle(0x1a1a4e, 0.8);
    graphics.fillRoundedRect(x, y - 3, width, 6, 3);
    graphics.fillStyle(0x4488ff, 0.8);
    graphics.fillRoundedRect(x, y - 3, width * value, 6, 3);
  }

  private setupInput(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.gameEnded) return;
      if (this.remainingSteps <= 0) return;
      if (pointer.x > GAME_WIDTH - 220 && pointer.y > GAME_HEIGHT - 200) return;

      this.isDragging = true;
      this.dragStartX = pointer.x;
      this.dragStartY = pointer.y;
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging) return;
      this.drawAimLine(pointer.x, pointer.y);
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging) return;
      this.isDragging = false;
      this.aimGraphics.clear();

      const dx = pointer.x - this.dragStartX;
      const dy = pointer.y - this.dragStartY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 15) return;

      const angle = Math.atan2(dy, dx);
      const origin = this.levelConfig.waveOrigin;
      this.launchWave(origin.x, origin.y, angle);
    });
  }

  private drawAimLine(currentX: number, currentY: number): void {
    this.aimGraphics.clear();
    const origin = this.levelConfig.waveOrigin;
    const dx = currentX - this.dragStartX;
    const dy = currentY - this.dragStartY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 5) return;

    const angle = Math.atan2(dy, dx);
    const aimLen = Math.min(dist * 0.8, 200);

    this.aimGraphics.setBlendMode(Phaser.BlendModes.ADD);

    this.aimGraphics.lineStyle(1, 0x4488ff, 0.15);
    this.aimGraphics.strokeCircle(origin.x, origin.y, 20);

    for (let i = 0; i < aimLen; i += 8) {
      const alpha = 0.4 * (1 - i / aimLen);
      this.aimGraphics.fillStyle(0x00ccff, alpha);
      const px = origin.x + Math.cos(angle) * i;
      const py = origin.y + Math.sin(angle) * i;
      this.aimGraphics.fillCircle(px, py, 2);
    }

    const endX = origin.x + Math.cos(angle) * aimLen;
    const endY = origin.y + Math.sin(angle) * aimLen;
    this.aimGraphics.lineStyle(1.5, 0x00ccff, 0.5);
    this.aimGraphics.beginPath();
    this.aimGraphics.moveTo(origin.x, origin.y);
    this.aimGraphics.lineTo(endX, endY);
    this.aimGraphics.strokePath();

    const arrowSize = 8;
    const a1 = angle + Math.PI * 0.85;
    const a2 = angle - Math.PI * 0.85;
    this.aimGraphics.fillStyle(0x00ccff, 0.6);
    this.aimGraphics.fillTriangle(
      endX,
      endY,
      endX + Math.cos(a1) * arrowSize,
      endY + Math.sin(a1) * arrowSize,
      endX + Math.cos(a2) * arrowSize,
      endY + Math.sin(a2) * arrowSize
    );
  }

  private launchWave(x: number, y: number, angle: number): void {
    if (this.remainingSteps <= 0) return;
    this.remainingSteps--;
    this.stepsText.setText(`剩余步数: ${this.remainingSteps}`);

    const wave = new GravityWave(this, x, y, angle, this.waveStrength, this.deflectionAngle);
    this.waves.push(wave);
  }

  private restartLevel(): void {
    this.scene.restart({ levelId: this.levelConfig.id });
  }

  update(time: number, delta: number): void {
    this.updateBgStars(delta);
    this.updateStarTrails(delta);
    this.updatePlanets(delta);
    this.updatePortals(time, delta);
    this.updateWaves(delta);
    this.checkGameState();
  }

  private updateBgStars(delta: number): void {
    this.bgStarGraphics.clear();
    this.bgStarGraphics.setBlendMode(Phaser.BlendModes.ADD);
    for (const star of this.bgStars) {
      star.phase += star.twinkle * delta;
      const alpha = 0.2 + 0.5 * (0.5 + 0.5 * Math.sin(star.phase));
      this.bgStarGraphics.fillStyle(0xccccff, alpha);
      this.bgStarGraphics.fillCircle(star.x, star.y, star.size);
    }
  }

  private updateStarTrails(delta: number): void {
    for (const trail of this.starTrails) {
      trail.update(delta);
    }
  }

  private updatePlanets(delta: number): void {
    for (const planet of this.planets) {
      planet.rotationAngle += delta * 0.001;

      if (planet.config.orbitRadius > 0) {
        const orbitAngle = planet.config.orbitOffset + time * planet.config.orbitSpeed * 0.001;
        planet.currentX = planet.config.x + Math.cos(orbitAngle) * planet.config.orbitRadius;
        planet.currentY = planet.config.y + Math.sin(orbitAngle) * planet.config.orbitRadius;
      } else {
        planet.currentX = planet.config.x;
        planet.currentY = planet.config.y;
      }

      const colorData = PLANET_COLORS[planet.config.colorIndex % PLANET_COLORS.length];

      planet.graphics.clear();
      planet.graphics.setBlendMode(Phaser.BlendModes.NORMAL);

      planet.graphics.fillStyle(colorData.fill, 0.35);
      planet.graphics.fillCircle(planet.currentX, planet.currentY, planet.config.radius);

      const highlightAngle = planet.rotationAngle;
      const hlX = planet.currentX + Math.cos(highlightAngle) * planet.config.radius * 0.3;
      const hlY = planet.currentY + Math.sin(highlightAngle) * planet.config.radius * 0.3;
      planet.graphics.fillStyle(0xffffff, 0.15);
      planet.graphics.fillCircle(hlX, hlY, planet.config.radius * 0.5);

      planet.glowGraphics.clear();
      planet.glowGraphics.setBlendMode(Phaser.BlendModes.ADD);
      planet.glowGraphics.fillStyle(colorData.glow, 0.08);
      planet.glowGraphics.fillCircle(planet.currentX, planet.currentY, planet.config.radius * 2);
      planet.glowGraphics.fillStyle(colorData.glow, 0.15);
      planet.glowGraphics.fillCircle(planet.currentX, planet.currentY, planet.config.radius * 1.4);
    }
  }

  private updatePortals(time: number, delta: number): void {
    for (const portal of this.portals) {
      portal.graphics.clear();

      const baseColor = portal.activated ? COLORS.portalActive : COLORS.portalInactive;
      const glowAlpha = portal.activated ? 0.3 + 0.15 * Math.sin(time * 0.005) : 0.05;

      portal.graphics.setBlendMode(Phaser.BlendModes.ADD);
      portal.graphics.fillStyle(baseColor, glowAlpha);
      portal.graphics.fillCircle(portal.config.x, portal.config.y, portal.config.radius * 2);

      portal.graphics.setBlendMode(Phaser.BlendModes.NORMAL);
      portal.graphics.lineStyle(2, baseColor, portal.activated ? 0.8 : 0.3);
      portal.graphics.strokeCircle(portal.config.x, portal.config.y, portal.config.radius);

      const innerRadius = portal.config.radius * (0.4 + 0.2 * Math.sin(time * 0.003));
      portal.graphics.fillStyle(baseColor, portal.activated ? 0.5 : 0.15);
      portal.graphics.fillCircle(portal.config.x, portal.config.y, innerRadius);

      if (portal.activated) {
        this.updatePortalParticles(portal, delta);
      }
    }

    this.drawPortalParticles(delta);
  }

  private updatePortalParticles(portal: PortalGameObject, delta: number): void {
    for (const p of portal.particles) {
      p.angle += p.speed * delta * 0.003;
      p.dist += Math.sin(p.angle * 3) * 0.1;
      p.alpha = 0.3 + 0.5 * (0.5 + 0.5 * Math.sin(p.angle * 2));
    }
  }

  private drawPortalParticles(delta: number): void {
    this.portalParticlesGraphics.clear();
    this.portalParticlesGraphics.setBlendMode(Phaser.BlendModes.ADD);

    for (const portal of this.portals) {
      if (!portal.activated) continue;

      for (const p of portal.particles) {
        const px = portal.config.x + Math.cos(p.angle) * p.dist;
        const py = portal.config.y + Math.sin(p.angle) * p.dist;
        this.portalParticlesGraphics.fillStyle(COLORS.portalActive, p.alpha * 0.6);
        this.portalParticlesGraphics.fillCircle(px, py, p.size);
      }

      const burstProgress = Math.min((this.time.now - portal.activateTime) / 1000, 1);
      if (burstProgress < 1) {
        const burstRadius = portal.config.radius * (1 + burstProgress * 3);
        const burstAlpha = 0.5 * (1 - burstProgress);
        this.portalParticlesGraphics.fillStyle(COLORS.portalActive, burstAlpha);
        this.portalParticlesGraphics.fillCircle(portal.config.x, portal.config.y, burstRadius);
      }
    }
  }

  private updateWaves(delta: number): void {
    const planetStates = this.planets.map((p) => ({
      x: p.currentX,
      y: p.currentY,
      radius: p.config.radius,
    }));

    for (let i = this.waves.length - 1; i >= 0; i--) {
      const wave = this.waves[i];
      const result = wave.update(delta, planetStates, this.levelConfig.portals);

      if (result.hitPortal) {
        const portal = this.portals[result.portalIndex];
        if (!portal.activated) {
          portal.activated = true;
          portal.activateTime = this.time.now;
        }
      }

      if (!wave.isAlive()) {
        wave.destroy();
        this.waves.splice(i, 1);
      }
    }
  }

  private checkGameState(): void {
    if (this.gameEnded) return;

    const allPortalsActivated = this.portals.every((p) => p.activated);
    if (allPortalsActivated) {
      this.gameEnded = true;
      this.showResult(true);
      return;
    }

    if (this.remainingSteps <= 0 && this.waves.length === 0) {
      this.gameEnded = true;
      this.showResult(false);
    }
  }

  private showResult(success: boolean): void {
    this.resultText.setText(success ? '✦ 传送门已全部激活 ✦' : '步数耗尽…');
    this.resultText.setColor(success ? '#00ffaa' : '#ff6644');

    this.tweens.add({
      targets: this.resultText,
      alpha: 1,
      duration: 600,
      ease: 'Power2',
    });

    if (success) {
      const nextLevel = LEVELS.find((l) => l.id === this.levelConfig.id + 1);
      if (nextLevel) {
        const nextBtn = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 50, '下一关 →', {
          fontFamily: '"Microsoft YaHei", sans-serif',
          fontSize: '18px',
          color: '#00ffaa',
          backgroundColor: '#002211',
          padding: { x: 16, y: 8 },
        });
        nextBtn.setOrigin(0.5);
        nextBtn.setAlpha(0);
        nextBtn.setInteractive({ useHandCursor: true });
        this.tweens.add({ targets: nextBtn, alpha: 1, duration: 400, delay: 600 });
        nextBtn.on('pointerdown', () => {
          this.cameras.main.fadeOut(400, 0, 0, 0);
          this.time.delayedCall(400, () => this.scene.start('GameScene', { levelId: nextLevel.id }));
        });
      }
    }

    const retryBtn = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + (success ? 100 : 50), '重新挑战', {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '14px',
      color: '#8899bb',
      backgroundColor: '#0a0a2e',
      padding: { x: 12, y: 6 },
    });
    retryBtn.setOrigin(0.5);
    retryBtn.setAlpha(0);
    retryBtn.setInteractive({ useHandCursor: true });
    this.tweens.add({ targets: retryBtn, alpha: 1, duration: 400, delay: 800 });
    retryBtn.on('pointerdown', () => this.restartLevel());

    const backBtn = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + (success ? 140 : 90), '返回选关', {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '14px',
      color: '#667799',
    });
    backBtn.setOrigin(0.5);
    backBtn.setAlpha(0);
    backBtn.setInteractive({ useHandCursor: true });
    this.tweens.add({ targets: backBtn, alpha: 1, duration: 400, delay: 1000 });
    backBtn.on('pointerdown', () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.time.delayedCall(300, () => this.scene.start('LevelSelectScene'));
    });
  }
}
