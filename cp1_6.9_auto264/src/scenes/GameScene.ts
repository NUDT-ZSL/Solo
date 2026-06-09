import Phaser from 'phaser';

interface AuroraParticle {
  sprite: Phaser.GameObjects.Arc;
  baseY: number;
  phase: number;
  period: number;
  amplitude: number;
  driftSpeed: number;
}

interface CrystalData {
  createdAt: number;
  color: number;
}

interface RiftData {
  baseY: number;
  phase: number;
}

export class GameScene extends Phaser.Scene {
  private static readonly GAME_WIDTH = 800;
  private static readonly GAME_HEIGHT = 600;
  private static readonly BIRD_X = 250;
  private static readonly SCROLL_SPEED = 30;
  private static readonly CRYSTAL_SPEED = 60;
  private static readonly RIFT_SWING_AMPLITUDE = 100;
  private static readonly RIFT_SWING_PERIOD = 3000;
  private static readonly CRYSTAL_LIFETIME = 15000;
  private static readonly INITIAL_AURORA_PARTICLES = 180;
  private static readonly MAX_PARTICLES = 250;
  private static readonly MAX_SPEED_MULTIPLIER = 1.5;

  private birdContainer!: Phaser.GameObjects.Container;
  private birdTriangles: Phaser.GameObjects.Triangle[] = [];
  private wingFlapTimer = 0;
  private isMouseDown = false;
  private birdVelocityY = 0;
  private isSlowed = false;
  private slowTimer = 0;

  private crystalGroup!: Phaser.Physics.Arcade.Group;
  private riftGroup!: Phaser.Physics.Arcade.Group;

  private score = 0;
  private crystalCount = 0;
  private survivalTime = 0;
  private speedMultiplier = 1.0;
  private auroraBurstCount = 0;
  private nextBurstThreshold = 10;

  private scoreText!: Phaser.GameObjects.Text;
  private speedText!: Phaser.GameObjects.Text;
  private pulseBorder!: Phaser.GameObjects.Graphics;
  private pulseBorderVisible = false;
  private pulseBorderTimer = 0;

  private auroraParticles: AuroraParticle[] = [];
  private auroraParticleCount = GameScene.INITIAL_AURORA_PARTICLES;

  private backgroundBands: Phaser.GameObjects.Graphics[] = [];

  private crystalSpawnTimer = 0;
  private riftSpawnTimer = 0;

  private gameStartTime = 0;
  private isGameOver = false;

  private birdHitbox!: Phaser.Physics.Arcade.Sprite;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.gameStartTime = this.time.now;
    this.isGameOver = false;

    this.createBackgroundBands();
    this.createAuroraParticles();
    this.createUI();
    this.createPulseBorder();
    this.createBird();
    this.createGroups();
    this.setupCollisions();
    this.setupInput();
    this.setupTimers();
  }

  private createBackgroundBands(): void {
    const colors = [0x0d1b2a, 0x3e1f47, 0x1b4332, 0x0d1b2a];
    const bandHeight = 60;
    const totalHeight = bandHeight * colors.length;
    const startY = (GameScene.GAME_HEIGHT - totalHeight) / 2;

    colors.forEach((color, i) => {
      const band = this.add.graphics();
      band.fillGradientStyle(color, color, color, color, 0.8, 0.8, 0.8, 0.8);
      band.fillRect(0, startY + i * bandHeight, GameScene.GAME_WIDTH, bandHeight);
      band.setScrollFactor(0);
      band.setDepth(-100 + i);
      this.backgroundBands.push(band);
    });

    const overlay = this.add.graphics();
    overlay.fillGradientStyle(
      0x0d1b2a, 0x0d1b2a, 0x3e1f47, 0x3e1f47,
      0.3, 0.3, 0.3, 0.3
    );
    overlay.fillRect(0, 0, GameScene.GAME_WIDTH, GameScene.GAME_HEIGHT);
    overlay.setDepth(-50);
  }

  private createAuroraParticles(): void {
    for (let i = 0; i < this.auroraParticleCount; i++) {
      this.createSingleAuroraParticle();
    }
  }

  private createSingleAuroraParticle(): AuroraParticle {
    const colors = [0x00e5ff, 0x9c27b0, 0x00ff88, 0x64b5f6, 0xba68c8];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size = 2 + Math.random() * 3;
    const alpha = 0.3 + Math.random() * 0.5;
    const x = Math.random() * GameScene.GAME_WIDTH;
    const baseY = Math.random() * GameScene.GAME_HEIGHT;
    const period = 3000 + Math.random() * 2000;
    const amplitude = 15 + Math.random() * 5;
    const driftSpeed = 0.3 + Math.random() * 0.2;

    const sprite = this.add.circle(x, baseY, size, color, alpha);
    sprite.setDepth(-30);
    sprite.setBlendMode(Phaser.BlendModes.ADD);

    const particle: AuroraParticle = {
      sprite,
      baseY,
      phase: Math.random() * Math.PI * 2,
      period,
      amplitude,
      driftSpeed
    };

    this.auroraParticles.push(particle);
    return particle;
  }

  private createUI(): void {
    this.scoreText = this.add.text(20, 20, '得分: 0', {
      fontFamily: '"Press Start 2P", cursive',
      fontSize: '20px',
      color: '#ffffff'
    });
    this.scoreText.setShadow(3, 3, 'rgba(0, 0, 0, 0.8)', 0, true, true);
    this.scoreText.setScrollFactor(0);
    this.scoreText.setDepth(1000);

    this.speedText = this.add.text(GameScene.GAME_WIDTH - 20, 20, '速度: 1.00x', {
      fontFamily: '"Press Start 2P", cursive',
      fontSize: '14px',
      color: '#ffd700'
    });
    this.speedText.setOrigin(1, 0);
    this.speedText.setScrollFactor(0);
    this.speedText.setDepth(1000);
  }

  private createPulseBorder(): void {
    this.pulseBorder = this.add.graphics();
    this.pulseBorder.setDepth(999);
    this.pulseBorder.setScrollFactor(0);
    this.pulseBorder.setVisible(false);
  }

  private updatePulseBorder(): void {
    if (!this.pulseBorderVisible) return;

    this.pulseBorder.clear();

    const pulseProgress = (this.pulseBorderTimer % 500) / 500;
    const alpha = 0.3 + Math.sin(pulseProgress * Math.PI * 2) * 0.3 + 0.3;
    const color = 0x9c27b0;
    const borderWidth = 10;

    this.pulseBorder.lineStyle(borderWidth, color, alpha);
    this.pulseBorder.strokeRect(
      borderWidth / 2,
      borderWidth / 2,
      GameScene.GAME_WIDTH - borderWidth,
      GameScene.GAME_HEIGHT - borderWidth
    );
  }

  private createBird(): void {
    this.birdContainer = this.add.container(GameScene.BIRD_X, GameScene.GAME_HEIGHT / 2);
    this.birdContainer.setDepth(100);

    const cyan = 0x00e5ff;
    const purple = 0x9c27b0;

    const colors = [
      this.lerpColor(cyan, purple, 0),
      this.lerpColor(cyan, purple, 0.25),
      this.lerpColor(cyan, purple, 0.5),
      this.lerpColor(cyan, purple, 0.75),
      this.lerpColor(cyan, purple, 1)
    ];

    const positions = [
      { x: 0, y: 0, scale: 1.3, rotation: -Math.PI / 2 },
      { x: -18, y: -8, scale: 0.9, rotation: -Math.PI / 4 - 0.2 },
      { x: -18, y: 8, scale: 0.9, rotation: Math.PI / 4 + 0.2 },
      { x: -30, y: -14, scale: 0.7, rotation: -Math.PI / 8 },
      { x: -30, y: 14, scale: 0.7, rotation: Math.PI / 8 }
    ];

    positions.forEach((pos, i) => {
      const size = 12 * pos.scale;
      const triangle = this.add.triangle(
        pos.x, pos.y,
        size, 0,
        -size * 0.6, -size * 0.7,
        -size * 0.6, size * 0.7,
        colors[i],
        1
      );
      triangle.setRotation(pos.rotation);
      triangle.setStrokeStyle(2, colors[i], 0.8);
      triangle.setBlendMode(Phaser.BlendModes.ADD);
      this.birdTriangles.push(triangle);
      this.birdContainer.add(triangle);
    });

    const dummyGfx = this.add.graphics();
    dummyGfx.fillStyle(0xffffff, 0);
    dummyGfx.fillRect(0, 0, 50, 30);
    dummyGfx.generateTexture('__BIRD_DUMMY', 50, 30);
    dummyGfx.destroy();

    this.birdHitbox = this.physics.add.sprite(GameScene.BIRD_X, GameScene.GAME_HEIGHT / 2, '__BIRD_DUMMY');
    this.birdHitbox.setDisplaySize(50, 30);
    this.birdHitbox.setVisible(false);
    if (this.birdHitbox.body) {
      (this.birdHitbox.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    }
    this.birdHitbox.setImmovable(false);
    this.birdHitbox.setCollideWorldBounds(false);
  }

  private lerpColor(color1: number, color2: number, t: number): number {
    const r1 = (color1 >> 16) & 0xff;
    const g1 = (color1 >> 8) & 0xff;
    const b1 = color1 & 0xff;
    const r2 = (color2 >> 16) & 0xff;
    const g2 = (color2 >> 8) & 0xff;
    const b2 = color2 & 0xff;

    const r = Math.floor(r1 + (r2 - r1) * t);
    const g = Math.floor(g1 + (g2 - g1) * t);
    const b = Math.floor(b1 + (b2 - b1) * t);

    return (r << 16) | (g << 8) | b;
  }

  private hsvToColor(hue: number): number {
    const s = 0.7;
    const v = 1.0;
    const c = v * s;
    const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
    const m = v - c;

    let r = 0, g = 0, b = 0;
    if (hue >= 0 && hue < 60) { r = c; g = x; b = 0; }
    else if (hue >= 60 && hue < 120) { r = x; g = c; b = 0; }
    else if (hue >= 120 && hue < 180) { r = 0; g = c; b = x; }
    else if (hue >= 180 && hue < 240) { r = 0; g = x; b = c; }
    else if (hue >= 240 && hue < 300) { r = x; g = 0; b = c; }
    else if (hue >= 300 && hue < 360) { r = c; g = 0; b = x; }

    return ((Math.floor((r + m) * 255) << 16) |
            (Math.floor((g + m) * 255) << 8) |
            Math.floor((b + m) * 255));
  }

  private createGroups(): void {
    this.crystalGroup = this.physics.add.group({
      classType: Phaser.GameObjects.Container,
      maxSize: 100,
      runChildUpdate: false
    });

    this.riftGroup = this.physics.add.group({
      classType: Phaser.GameObjects.Container,
      maxSize: 50,
      runChildUpdate: false
    });
  }

  private setupCollisions(): void {
    this.physics.add.overlap(
      this.birdHitbox,
      this.crystalGroup,
      this.handleCrystalCollision,
      undefined,
      this
    );

    this.physics.add.overlap(
      this.birdHitbox,
      this.riftGroup,
      this.handleRiftCollision,
      undefined,
      this
    );
  }

  private handleCrystalCollision(
    _bird: any,
    crystal: any
  ): void {
    const crystalContainer = crystal as Phaser.GameObjects.Container;
    const crystalData = (crystalContainer as any).data as CrystalData;

    if (!crystalData || !crystalContainer.active) return;

    this.spawnCrystalExplosion(crystalContainer.x, crystalContainer.y, crystalData.color);
    this.showScorePopup(crystalContainer.x, crystalContainer.y);

    this.score += 10;
    this.crystalCount++;
    this.scoreText.setText(`得分: ${this.score}`);

    if (this.crystalCount >= this.nextBurstThreshold) {
      this.triggerAuroraBurst();
    }

    (crystalContainer as any).destroy();
    this.crystalGroup.remove(crystalContainer, true, true);
  }

  private handleRiftCollision(
    _bird: any,
    rift: any
  ): void {
    const riftObj = rift as unknown as Phaser.GameObjects.Container;
    if (this.isSlowed || !riftObj.active) return;

    this.isSlowed = true;
    this.slowTimer = 1000;

    this.birdContainer.setAlpha(0.4);
    this.pulseBorderVisible = true;
    this.pulseBorder.setVisible(true);

    this.cameras.main.shake(200, 0.005);
  }

  private spawnCrystalExplosion(x: number, y: number, color: number): void {
    const particleCount = 12;

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const speed = 80 + Math.random() * 40;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      const particle = this.add.circle(x, y, 4, color, 1);
      particle.setDepth(200);
      particle.setBlendMode(Phaser.BlendModes.ADD);

      const startX = x;
      const startY = y;

      const startTime = this.time.now;
      const duration = 500;

      const updateParticle = () => {
        const elapsed = this.time.now - startTime;
        const progress = elapsed / duration;

        if (progress >= 1) {
          particle.destroy();
          return;
        }

        const t = progress;
        particle.x = startX + vx * t * (duration / 1000);
        particle.y = startY + vy * t * (duration / 1000);
        particle.setAlpha(1 - t);
        particle.setScale(1 - t * 0.5);
      };

      this.events.on('update', updateParticle);
      this.time.delayedCall(duration + 50, () => {
        this.events.off('update', updateParticle);
      });
    }
  }

  private showScorePopup(x: number, y: number): void {
    const popup = this.add.text(x, y, '+10', {
      fontFamily: '"Press Start 2P", cursive',
      fontSize: '16px',
      color: '#00e5ff'
    });
    popup.setOrigin(0.5);
    popup.setDepth(300);
    popup.setScrollFactor(0);
    popup.setScale(0);

    const worldPos = this.cameras.main.getWorldPoint(x, y);
    popup.setPosition(worldPos.x, worldPos.y);

    this.tweens.add({
      targets: popup,
      scale: { from: 0, to: 1.5 },
      y: { from: worldPos.y, to: worldPos.y - 40 },
      alpha: { from: 1, to: 0 },
      duration: 800,
      ease: 'Back.easeOut',
      onComplete: () => {
        popup.destroy();
      }
    });
  }

  private triggerAuroraBurst(): void {
    this.auroraBurstCount++;
    this.nextBurstThreshold = this.crystalCount + 10;

    this.speedMultiplier = Math.min(
      GameScene.MAX_SPEED_MULTIPLIER,
      this.speedMultiplier * 1.05
    );
    this.speedText.setText(`速度: ${this.speedMultiplier.toFixed(2)}x`);

    const particlesToAdd = Math.min(20, GameScene.MAX_PARTICLES - this.auroraParticleCount);
    if (particlesToAdd > 0) {
      for (let i = 0; i < particlesToAdd; i++) {
        this.createSingleAuroraParticle();
      }
      this.auroraParticleCount += particlesToAdd;
    }

    const flash = this.add.rectangle(
      GameScene.GAME_WIDTH / 2,
      GameScene.GAME_HEIGHT / 2,
      GameScene.GAME_WIDTH,
      GameScene.GAME_HEIGHT,
      0xffffff,
      1
    );
    flash.setDepth(500);
    flash.setScrollFactor(0);

    this.tweens.add({
      targets: flash,
      alpha: { from: 1, to: 0 },
      duration: 200,
      ease: 'Linear',
      onComplete: () => {
        flash.destroy();
      }
    });

    this.cameras.main.shake(150, 0.008);
  }

  private setupInput(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) {
        this.isMouseDown = true;
      }
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.leftButtonDown()) {
        this.isMouseDown = false;
      }
    });

    this.input.keyboard?.on('keydown-SPACE', () => {
      this.isMouseDown = true;
    });

    this.input.keyboard?.on('keyup-SPACE', () => {
      this.isMouseDown = false;
    });
  }

  private setupTimers(): void {
    this.crystalSpawnTimer = 0;
    this.riftSpawnTimer = 2000;
  }

  private spawnCrystal(): void {
    const hue = Math.random() * 360;
    const color = this.hsvToColor(hue);

    const crystalContainer = this.add.container(820, 0);
    crystalContainer.setDepth(50);

    const y = 50 + Math.random() * (GameScene.GAME_HEIGHT - 100);
    crystalContainer.y = y;

    const size = 8;
    const hexPoints: { x: number; y: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
      hexPoints.push({
        x: Math.cos(angle) * size,
        y: Math.sin(angle) * size
      });
    }

    const graphics = this.add.graphics();
    graphics.lineStyle(2, color, 1);
    graphics.fillStyle(color, 0.8);

    graphics.beginPath();
    graphics.moveTo(hexPoints[0].x, hexPoints[0].y);
    for (let i = 1; i < hexPoints.length; i++) {
      graphics.lineTo(hexPoints[i].x, hexPoints[i].y);
    }
    graphics.closePath();
    graphics.fillPath();
    graphics.strokePath();

    const innerGlow = this.add.graphics();
    innerGlow.fillStyle(color, 0.4);
    innerGlow.beginPath();
    innerGlow.moveTo(hexPoints[0].x * 0.6, hexPoints[0].y * 0.6);
    for (let i = 1; i < hexPoints.length; i++) {
      innerGlow.lineTo(hexPoints[i].x * 0.6, hexPoints[i].y * 0.6);
    }
    innerGlow.closePath();
    innerGlow.fillPath();
    innerGlow.setBlendMode(Phaser.BlendModes.ADD);

    crystalContainer.add([graphics, innerGlow]);

    const crystalData: CrystalData = {
      createdAt: this.time.now,
      color
    };
    (crystalContainer as any).data = crystalData;

    this.physics.add.existing(crystalContainer);
    const body = (crystalContainer as any).body as Phaser.Physics.Arcade.Body;
    body.setCircle(size + 4);
    body.setAllowGravity(false);
    body.setImmovable(false);

    this.crystalGroup.add(crystalContainer);
  }

  private spawnRift(): void {
    const y = 80 + Math.random() * 440;

    const riftContainer = this.add.container(820, y);
    riftContainer.setDepth(60);

    const baseY = y;

    const outerGlow = this.add.graphics();
    outerGlow.fillStyle(0x9c27b0, 0.3);
    outerGlow.fillCircle(0, 0, 35);
    outerGlow.setBlendMode(Phaser.BlendModes.ADD);
    outerGlow.name = 'outerGlow';

    const innerDark = this.add.graphics();
    innerDark.fillStyle(0x000000, 1);
    innerDark.fillCircle(0, 0, 20);

    const pulseRing = this.add.graphics();
    pulseRing.lineStyle(3, 0x9c27b0, 0.8);
    pulseRing.strokeCircle(0, 0, 24);
    pulseRing.name = 'pulseRing';

    riftContainer.add([outerGlow, innerDark, pulseRing]);

    const riftData: RiftData = {
      baseY,
      phase: Math.random() * Math.PI * 2
    };
    (riftContainer as any).data = riftData;
    (riftContainer as any).createdAt = this.time.now;

    this.physics.add.existing(riftContainer);
    const body = (riftContainer as any).body as Phaser.Physics.Arcade.Body;
    body.setCircle(22);
    body.setAllowGravity(false);
    body.setImmovable(false);

    this.riftGroup.add(riftContainer);
  }

  update(time: number, delta: number): void {
    if (this.isGameOver) return;

    this.updateAuroraParticles(time, delta);
    this.updateBird(delta);
    this.updateCrystals(delta);
    this.updateRifts(time, delta);
    this.updateSlowEffect(delta);
    this.updatePulseBorder();
    this.updateSpawning(delta);
    this.updateSurvivalTime(delta);
    this.checkGameOver();
  }

  private updateAuroraParticles(time: number, delta: number): void {
    for (let i = this.auroraParticles.length - 1; i >= 0; i--) {
      const p = this.auroraParticles[i];

      const phase = ((time % p.period) / p.period) * Math.PI * 2 + p.phase;
      p.sprite.y = p.baseY + Math.sin(phase) * p.amplitude;

      p.sprite.x -= p.driftSpeed * (delta / 16.67) * this.speedMultiplier;

      if (p.sprite.x < -10) {
        p.sprite.x = GameScene.GAME_WIDTH + 10;
        p.baseY = Math.random() * GameScene.GAME_HEIGHT;
      }
    }
  }

  private updateBird(delta: number): void {
    const slowFactor = this.isSlowed ? 0.5 : 1;
    const upSpeed = 100 * slowFactor;
    const downSpeed = 150 * slowFactor;

    if (this.isMouseDown) {
      this.birdVelocityY = -upSpeed;
    } else {
      this.birdVelocityY = downSpeed;
    }

    const newY = this.birdContainer.y + this.birdVelocityY * (delta / 1000);
    this.birdContainer.y = Phaser.Math.Clamp(newY, 30, GameScene.GAME_HEIGHT - 30);
    this.birdHitbox.y = this.birdContainer.y;

    this.wingFlapTimer += delta;
    const flapPeriod = 300;
    const flapProgress = (this.wingFlapTimer % flapPeriod) / flapPeriod;
    const flapAngle = Math.sin(flapProgress * Math.PI * 2) * 0.15;

    if (this.birdVelocityY < 0) {
      this.birdTriangles[1].setRotation(-Math.PI / 4 - 0.2 - flapAngle - 0.1);
      this.birdTriangles[2].setRotation(Math.PI / 4 + 0.2 + flapAngle + 0.1);
      this.birdTriangles[3].setRotation(-Math.PI / 8 - flapAngle * 0.5 - 0.05);
      this.birdTriangles[4].setRotation(Math.PI / 8 + flapAngle * 0.5 + 0.05);
    } else {
      this.birdTriangles[1].setRotation(-Math.PI / 4 - 0.2 + flapAngle);
      this.birdTriangles[2].setRotation(Math.PI / 4 + 0.2 - flapAngle);
      this.birdTriangles[3].setRotation(-Math.PI / 8 + flapAngle * 0.5);
      this.birdTriangles[4].setRotation(Math.PI / 8 - flapAngle * 0.5);
    }
  }

  private updateCrystals(delta: number): void {
    const now = this.time.now;

    this.crystalGroup.getChildren().forEach((obj) => {
      const crystal = obj as Phaser.GameObjects.Container;
      const data = (crystal as any).data as CrystalData;

      if (!data) return;

      crystal.x -= (GameScene.CRYSTAL_SPEED * this.speedMultiplier) * (delta / 1000);

      const age = now - data.createdAt;
      if (crystal.x < -30 || age > GameScene.CRYSTAL_LIFETIME) {
        this.crystalGroup.remove(crystal, true, true);
      }
    });
  }

  private updateRifts(time: number, delta: number): void {
    this.riftGroup.getChildren().forEach((obj) => {
      const rift = obj as Phaser.GameObjects.Container;
      const data = (rift as any).data as RiftData;

      if (!data) return;

      rift.x -= (GameScene.SCROLL_SPEED * this.speedMultiplier) * (delta / 1000);

      const swingPhase = ((time % GameScene.RIFT_SWING_PERIOD) / GameScene.RIFT_SWING_PERIOD) * Math.PI * 2 + data.phase;
      rift.y = data.baseY + Math.sin(swingPhase) * GameScene.RIFT_SWING_AMPLITUDE;

      const pulsePhase = ((time % 1200) / 1200) * Math.PI * 2;
      const pulseScale = 1 + Math.sin(pulsePhase) * 0.15;
      const pulseAlpha = 0.6 + Math.sin(pulsePhase) * 0.3;

      const pulseRing = rift.getByName('pulseRing') as Phaser.GameObjects.Graphics;
      const outerGlow = rift.getByName('outerGlow') as Phaser.GameObjects.Graphics;

      if (pulseRing) {
        pulseRing.clear();
        pulseRing.lineStyle(3 + Math.sin(pulsePhase) * 1, 0x9c27b0, pulseAlpha);
        pulseRing.strokeCircle(0, 0, 24 * pulseScale);
      }

      if (outerGlow) {
        outerGlow.clear();
        outerGlow.fillStyle(0x9c27b0, 0.25 + Math.sin(pulsePhase) * 0.1);
        outerGlow.fillCircle(0, 0, 35 * pulseScale);
      }

      if (rift.x < -50) {
        this.riftGroup.remove(rift, true, true);
      }
    });
  }

  private updateSlowEffect(delta: number): void {
    if (this.isSlowed) {
      this.slowTimer -= delta;
      this.pulseBorderTimer += delta;

      if (this.slowTimer <= 0) {
        this.isSlowed = false;
        this.slowTimer = 0;
        this.pulseBorderVisible = false;
        this.pulseBorderTimer = 0;
        this.birdContainer.setAlpha(1);
        this.pulseBorder.setVisible(false);
        this.pulseBorder.clear();
      }
    }
  }

  private updateSpawning(delta: number): void {
    this.crystalSpawnTimer -= delta;
    this.riftSpawnTimer -= delta;

    if (this.crystalSpawnTimer <= 0) {
      this.spawnCrystal();
      this.crystalSpawnTimer = 600 + Math.random() * 400;
    }

    if (this.riftSpawnTimer <= 0) {
      this.spawnRift();
      this.riftSpawnTimer = 2000 + Math.random() * 1000;
    }
  }

  private updateSurvivalTime(delta: number): void {
    this.survivalTime += delta / 1000;
  }

  private checkGameOver(): void {
    const birdY = this.birdContainer.y;

    const hitTopEdge = birdY <= 25;
    const hitBottomEdge = birdY >= GameScene.GAME_HEIGHT - 25;

    const gameDuration = (this.time.now - this.gameStartTime) / 1000;
    const timedOut = gameDuration >= 30;

    if (hitTopEdge || hitBottomEdge || timedOut) {
      this.endGame();
    }
  }

  private endGame(): void {
    this.isGameOver = true;

    const crystalScore = this.crystalCount * 10;
    const survivalScore = Math.floor(this.survivalTime) * 5;
    const totalScore = crystalScore + survivalScore;

    this.time.delayedCall(500, () => {
      this.scene.start('GameOverScene', {
        totalScore,
        crystalCount: this.crystalCount,
        survivalTime: Math.floor(this.survivalTime),
        crystalScore,
        survivalScore
      });
    });
  }
}
