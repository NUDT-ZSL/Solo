import Phaser from 'phaser';
import { RuneDetector, Point, SpellType, RuneResult } from '../entities/RuneDetector';
import { SpellManager, Spell } from '../entities/SpellManager';

interface GhostData {
  health: number;
  maxHealth: number;
  baseSpeed: number;
  isEnraged: boolean;
  healthBar: Phaser.GameObjects.Graphics;
}

let particleTexCreated = false;

export class GameScene extends Phaser.Scene {
  private spellManager: SpellManager;

  private isDrawing: boolean;
  private runePoints: Point[];
  private runeGraphics: Phaser.GameObjects.Graphics;
  private trailPointGraphics: Phaser.GameObjects.Graphics;

  private playerPos: Point;
  private playerHealth: number;
  private playerMaxHealth: number;
  private playerShield: Phaser.GameObjects.Graphics;
  private shieldColorTween: number;

  private ghosts: Phaser.Physics.Arcade.Group;
  private ghostSpawnTimer: number;
  private currentLevel: number;
  private ghostSpawnInterval: number;
  private ghostBaseHealth: number;

  private killCount: number;
  private killsForNextLevel: number;

  private healthText: Phaser.GameObjects.Text;
  private killText: Phaser.GameObjects.Text;
  private levelText: Phaser.GameObjects.Text;

  private edgeFog: Phaser.GameObjects.Graphics;
  private fogTime: number;

  private cursor: Phaser.GameObjects.Container;

  private gridTexture: Phaser.GameObjects.Image;

  private screenFlashGraphics: Phaser.GameObjects.Graphics;
  private lowHealthAudioTimer: number;

  private levelUpRipple: Phaser.GameObjects.Graphics | null;
  private isLevelUpAnimating: boolean;

  private readonly MAX_GHOSTS = 12;
  private readonly PARTICLE_TEX = '__shared_particle_dot';

  constructor() {
    super({ key: 'GameScene' });
  }

  public init(): void {
    this.isDrawing = false;
    this.runePoints = [];
    this.playerHealth = 100;
    this.playerMaxHealth = 100;
    this.killCount = 0;
    this.currentLevel = 1;
    this.killsForNextLevel = 10;
    this.ghostSpawnInterval = 3000;
    this.ghostBaseHealth = 30;
    this.ghostSpawnTimer = 0;
    this.fogTime = 0;
    this.lowHealthAudioTimer = 0;
    this.shieldColorTween = 0;
    this.isLevelUpAnimating = false;
    this.levelUpRipple = null;
  }

  private ensureParticleTexture(): void {
    if (!particleTexCreated && !this.textures.exists(this.PARTICLE_TEX)) {
      const g = this.add.graphics();
      g.fillStyle(0xffffff, 1);
      g.fillCircle(4, 4, 4);
      g.generateTexture(this.PARTICLE_TEX, 8, 8);
      g.destroy();
      particleTexCreated = true;
    }
  }

  public create(): void {
    this.playerPos = {
      x: this.scale.width / 2,
      y: this.scale.height / 2
    };

    this.ensureParticleTexture();
    this.createBackground();
    this.createEdgeFog();
    this.createGridTexture();
    this.createCursor();
    this.createPlayerShield();
    this.createUI();

    this.spellManager = new SpellManager(this);
    this.ghosts = this.physics.add.group({
      maxSize: this.MAX_GHOSTS,
      allowGravity: false,
      immovable: false
    });

    this.runeGraphics = this.add.graphics();
    this.runeGraphics.setDepth(100);
    this.trailPointGraphics = this.add.graphics();
    this.trailPointGraphics.setDepth(101);
    this.screenFlashGraphics = this.add.graphics();
    this.screenFlashGraphics.setDepth(500);

    this.setupInputHandlers();
    this.setupCollisions();

    this.events.on('windowResized', this.onWindowResized, this);
    this.time.addEvent({
      delay: 100,
      callback: this.spawnGhost,
      callbackScope: this,
      loop: false
    });
  }

  private createBackground(): void {
    const bgGfx = this.add.graphics();
    const w = this.scale.width;
    const h = this.scale.height;
    const centerX = w / 2;
    const centerY = h / 2;
    const maxRadius = Math.max(w, h);

    bgGfx.fillGradientStyle(
      0x0a0015, 0x0a0015,
      0x1a0a3e, 0x1a0a3e,
      1
    );
    bgGfx.fillRect(0, 0, w, h);

    for (let r = maxRadius; r > 0; r -= 30) {
      const alpha = Math.min(0.08, r / maxRadius * 0.08);
      bgGfx.lineStyle(1, 0x442266, alpha);
      bgGfx.strokeCircle(centerX, centerY, r);
    }

    bgGfx.setDepth(-10);
  }

  private createEdgeFog(): void {
    this.edgeFog = this.add.graphics();
    this.edgeFog.setDepth(50);
    this.updateEdgeFog(0);
  }

  private updateEdgeFog(time: number): void {
    const w = this.scale.width;
    const h = this.scale.height;
    this.edgeFog.clear();

    const phase = (time % 4000) / 4000 * Math.PI * 2;
    const pulse = (Math.sin(phase) + 1) / 2;
    const baseAlpha = 0.15 + pulse * 0.1;

    const edgeWidth = Math.min(w, h) * 0.25;

    for (let i = 0; i < 8; i++) {
      const offset = Math.sin(phase + i * 0.8) * edgeWidth * 0.2;
      const alpha = baseAlpha * (0.5 + Math.sin(phase * 2 + i * 0.5) * 0.5);

      this.edgeFog.fillGradientStyle(
        0x0d0520, 0x0d0520,
        0x0d0520, 0x0d0520,
        alpha, 0, alpha, 0
      );
      this.edgeFog.fillRect(0, 0, w, edgeWidth + offset);

      this.edgeFog.fillGradientStyle(
        0x0d0520, 0x0d0520,
        0x0d0520, 0x0d0520,
        0, alpha, 0, alpha
      );
      this.edgeFog.fillRect(0, h - edgeWidth - offset, w, edgeWidth + offset);

      this.edgeFog.fillGradientStyle(
        0x0d0520, 0x0d0520,
        0x0d0520, 0x0d0520,
        alpha, alpha, 0, 0
      );
      this.edgeFog.fillRect(0, 0, edgeWidth + offset, h);

      this.edgeFog.fillGradientStyle(
        0x0d0520, 0x0d0520,
        0x0d0520, 0x0d0520,
        0, 0, alpha, alpha
      );
      this.edgeFog.fillRect(w - edgeWidth - offset, 0, edgeWidth + offset, h);
    }
  }

  private createGridTexture(): void {
    const gridGfx = this.add.graphics();
    const gridSize = 64;
    const w = this.scale.width;
    const h = this.scale.height;

    gridGfx.lineStyle(1, 0x9370db, 0.06);
    for (let x = 0; x < w; x += gridSize) {
      gridGfx.lineBetween(x, 0, x, h);
    }
    for (let y = 0; y < h; y += gridSize) {
      gridGfx.lineBetween(0, y, w, y);
    }

    gridGfx.lineStyle(1, 0xd4af37, 0.04);
    for (let x = gridSize * 2; x < w; x += gridSize * 4) {
      gridGfx.lineBetween(x, 0, x, h);
    }
    for (let y = gridSize * 2; y < h; y += gridSize * 4) {
      gridGfx.lineBetween(0, y, w, y);
    }

    gridGfx.generateTexture('grid-bg', w, h);
    this.gridTexture = this.add.image(w / 2, h / 2, 'grid-bg');
    this.gridTexture.setAlpha(0.8);
    this.gridTexture.setDepth(-5);
    gridGfx.destroy();
  }

  private createCursor(): void {
    this.cursor = this.add.container(0, 0);
    this.cursor.setDepth(1000);

    const glowGfx = this.add.graphics();
    const glowSize = 24;
    for (let r = glowSize; r > 0; r -= 3) {
      const alpha = (1 - r / glowSize) * 0.3;
      glowGfx.fillStyle(0xffffff, alpha);
      glowGfx.fillCircle(glowSize / 2, glowSize / 2, r);
    }
    glowGfx.generateTexture('cursor-glow', glowSize, glowSize);
    const glowImg = this.add.image(0, 0, 'cursor-glow');
    this.cursor.add(glowImg);
    glowGfx.destroy();

    const wandGfx = this.add.graphics();
    const wandSize = 24;
    wandGfx.lineStyle(2, 0xd4af37, 1);
    wandGfx.beginPath();
    wandGfx.moveTo(wandSize * 0.1, wandSize * 0.9);
    wandGfx.lineTo(wandSize * 0.5, wandSize * 0.2);
    wandGfx.strokePath();
    wandGfx.fillStyle(0x9370db, 1);
    wandGfx.fillCircle(wandSize * 0.5, wandSize * 0.15, 3);
    wandGfx.fillStyle(0xd4af37, 0.8);
    wandGfx.fillCircle(wandSize * 0.5, wandSize * 0.15, 1.5);
    wandGfx.generateTexture('cursor-wand', wandSize, wandSize);
    const wandImg = this.add.image(0, 0, 'cursor-wand');
    this.cursor.add(wandImg);
    wandGfx.destroy();

    this.tweens.add({
      targets: glowImg,
      scale: { from: 0.9, to: 1.1 },
      alpha: { from: 0.7, to: 1 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private createPlayerShield(): void {
    this.playerShield = this.add.graphics();
    this.playerShield.setDepth(30);
    this.updatePlayerShield();
  }

  private updatePlayerShield(): void {
    const x = this.playerPos.x;
    const y = this.playerPos.y;
    const radius = 35;
    this.shieldColorTween += 0.02;
    this.playerShield.clear();

    const healthRatio = this.playerHealth / this.playerMaxHealth;
    let r: number, g: number, b: number;

    if (healthRatio < 0.3) {
      const flash = Math.sin(this.time.now * 0.02) * 0.5 + 0.5;
      r = 220;
      g = Math.floor(50 * (1 - flash));
      b = Math.floor(50 * (1 - flash));
    } else {
      r = Math.floor(147 + Math.sin(this.shieldColorTween) * 20);
      g = Math.floor(112 + Math.cos(this.shieldColorTween * 0.7) * 20);
      b = Math.floor(219 + Math.sin(this.shieldColorTween * 1.3) * 20);
    }

    const shieldColor = (r << 16) | (g << 8) | b;

    for (let i = 0; i < 5; i++) {
      const ringRadius = radius + i * 3;
      const alpha = 0.15 - i * 0.025;
      this.playerShield.lineStyle(2 + i, shieldColor, alpha * healthRatio);
      this.playerShield.strokeCircle(x, y, ringRadius);
    }

    this.playerShield.fillStyle(shieldColor, 0.08 * healthRatio);
    this.playerShield.fillCircle(x, y, radius - 5);

    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + this.shieldColorTween;
      const runeX = x + Math.cos(angle) * (radius - 2);
      const runeY = y + Math.sin(angle) * (radius - 2);
      this.playerShield.fillStyle(0xd4af37, 0.8 * healthRatio);
      this.playerShield.fillCircle(runeX, runeY, 2);
    }
  }

  private createUI(): void {
    const runeFont: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#00ffcc',
      stroke: '#d4af37',
      strokeThickness: 2,
      shadow: {
        offsetX: 0,
        offsetY: 0,
        color: '#00ffcc',
        blur: 15,
        fill: true,
        stroke: true
      }
    };

    this.healthText = this.add.text(30, 30, '', runeFont);
    this.healthText.setDepth(200);
    this.healthText.setScrollFactor(0);

    const glowGfx = this.add.graphics();
    glowGfx.fillStyle(0x00ffcc, 0.3);
    glowGfx.fillRoundedRect(25, 25, 140, 50, 8);
    glowGfx.lineStyle(2, 0xd4af37, 0.5);
    glowGfx.strokeRoundedRect(25, 25, 140, 50, 8);
    glowGfx.setDepth(199);

    this.killText = this.add.text(
      this.scale.width - 30,
      30,
      '',
      {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '20px',
        color: '#d4af37',
        stroke: '#663399',
        strokeThickness: 1,
        shadow: {
          offsetX: 0, offsetY: 0,
          color: '#d4af37',
          blur: 10, fill: true
        }
      }
    );
    this.killText.setOrigin(1, 0);
    this.killText.setDepth(200);
    this.killText.setScrollFactor(0);

    this.levelText = this.add.text(
      this.scale.width / 2,
      35,
      '',
      {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '22px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#9370db',
        strokeThickness: 2,
        shadow: {
          offsetX: 0, offsetY: 0,
          color: '#9370db',
          blur: 12, fill: true
        }
      }
    );
    this.levelText.setOrigin(0.5, 0);
    this.levelText.setDepth(200);
    this.levelText.setScrollFactor(0);

    this.updateUI();
  }

  private updateUI(): void {
    if (this.healthText) {
      this.healthText.setText(`❤ ${Math.max(0, Math.floor(this.playerHealth))}`);
    }
    if (this.killText) {
      this.killText.setText(`⚔ 击败: ${this.killCount} / ${this.killsForNextLevel}`);
    }
    if (this.levelText) {
      this.levelText.setText(`— 第 ${this.currentLevel} 关 —`);
    }
  }

  private setupInputHandlers(): void {
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.cursor) {
        this.cursor.setPosition(pointer.x, pointer.y);
      }

      if (this.isDrawing) {
        const lastPoint = this.runePoints[this.runePoints.length - 1];
        const dx = pointer.x - lastPoint.x;
        const dy = pointer.y - lastPoint.y;
        if (dx * dx + dy * dy > 9) {
          this.runePoints.push({ x: pointer.x, y: pointer.y });
          this.drawRune();
        }
      }
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown() && !this.isLevelUpAnimating) {
        this.startDrawing(pointer);
      }
    });

    this.input.on('pointerup', () => {
      if (this.isDrawing) {
        this.endDrawing();
      }
    });

    this.input.on('pointerupoutside', () => {
      if (this.isDrawing) {
        this.endDrawing();
      }
    });
  }

  private startDrawing(pointer: Phaser.Input.Pointer): void {
    this.isDrawing = true;
    this.runePoints = [{ x: pointer.x, y: pointer.y }];
    this.runeGraphics.clear();
    this.trailPointGraphics.clear();
  }

  private drawRune(): void {
    if (this.runePoints.length < 2) return;

    this.runeGraphics.clear();

    const totalPoints = this.runePoints.length;
    for (let i = 1; i < totalPoints; i++) {
      const progress = i / totalPoints;
      const hue = progress * 180 + 220;
      const color = Phaser.Display.Color.HSVToRGB(hue / 360, 1, 1).color;
      const width = 3 + progress * 2;
      const glowWidth = width + 4;

      this.runeGraphics.lineStyle(glowWidth, color, 0.3);
      this.runeGraphics.lineBetween(
        this.runePoints[i - 1].x, this.runePoints[i - 1].y,
        this.runePoints[i].x, this.runePoints[i].y
      );

      this.runeGraphics.lineStyle(width, color, 0.95);
      this.runeGraphics.lineBetween(
        this.runePoints[i - 1].x, this.runePoints[i - 1].y,
        this.runePoints[i].x, this.runePoints[i].y
      );
    }

    const last = this.runePoints[totalPoints - 1];
    this.trailPointGraphics.clear();

    for (let r = 10; r > 0; r -= 2) {
      const alpha = (1 - r / 10) * 0.5;
      this.trailPointGraphics.fillStyle(0xffffff, alpha);
      this.trailPointGraphics.fillCircle(last.x, last.y, r);
    }

    this.trailPointGraphics.fillStyle(0xd4af37, 1);
    this.trailPointGraphics.fillCircle(last.x, last.y, 3);
  }

  private endDrawing(): void {
    this.isDrawing = false;
    const result: RuneResult = RuneDetector.detect(this.runePoints);

    if (result.spellType) {
      this.playCastFlash(result.spellType);
      this.castSpell(result.spellType, result.direction);
    }

    this.time.delayedCall(result.spellType ? 300 : 100, () => {
      if (this.runeGraphics) this.runeGraphics.clear();
      if (this.trailPointGraphics) this.trailPointGraphics.clear();
    });

    this.runePoints = [];
  }

  private playCastFlash(type: SpellType): void {
    const flashGfx = this.screenFlashGraphics;
    flashGfx.clear();

    let color = 0xffffff;
    switch (type) {
      case 'fireball': color = 0xff6600; break;
      case 'iceShard': color = 0x66ddff; break;
      case 'lightning': color = 0xffff88; break;
    }

    flashGfx.fillStyle(color, 0.25);
    flashGfx.fillRect(0, 0, this.scale.width, this.scale.height);

    this.tweens.add({
      targets: flashGfx,
      alpha: 0,
      duration: 300,
      ease: 'Power2.Out',
      onComplete: () => { flashGfx.clear(); flashGfx.setAlpha(1); }
    });

    this.ensureParticleTexture();
    const sparkle = this.add.particles(this.playerPos.x, this.playerPos.y, this.PARTICLE_TEX, {
      lifespan: 300,
      speed: { min: 100, max: 300 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [color, 0xffffff, 0xd4af37],
      blendMode: Phaser.BlendModes.ADD,
      quantity: 15,
      duration: 150
    });
    this.time.delayedCall(300, () => { sparkle.destroy(); });
  }

  private castSpell(type: SpellType, direction: Point): void {
    this.spellManager.createSpell(
      this.playerPos.x,
      this.playerPos.y,
      type,
      direction
    );
  }

  private setupCollisions(): void {
    this.physics.add.overlap(
      this.spellManager.spells,
      this.ghosts,
      (obj1, obj2) => {
        const spellObj = obj1 as Phaser.GameObjects.GameObject;
        const ghostObj = obj2 as Phaser.GameObjects.GameObject;
        this.onSpellGhostCollision(spellObj, ghostObj);
      }
    );
  }

  private onSpellGhostCollision(
    spellObj: Phaser.GameObjects.GameObject,
    ghostObj: Phaser.GameObjects.GameObject
  ): void {
    const spell = spellObj as Spell;
    const ghost = ghostObj as Phaser.Physics.Arcade.Sprite;
    const data = ghost.getData('ghostData') as GhostData;

    if (!spell || !data || spell.isDead) return;

    data.health -= spell.config.damage;

    this.createHitParticles(ghost.x, ghost.y, spell.config);
    this.updateGhostHealthBar(ghost);

    if (data.health <= 0) {
      this.killGhost(ghost, spell.config.color);
    }

    this.spellManager.onSpellHitGhost(spell);
  }

  private createHitParticles(x: number, y: number, config: any): void {
    const count = 20 + Math.floor(Math.random() * 11);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 140;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const color = config.particleColor[Math.floor(Math.random() * config.particleColor.length)];

      const particle = this.add.circle(x, y, 3 + Math.random() * 3, color, 1);
      particle.setBlendMode(Phaser.BlendModes.ADD);

      const startTime = this.time.now;
      const duration = 600 + Math.random() * 200;

      const updateParticle = () => {
        const elapsed = this.time.now - startTime;
        if (elapsed >= duration) {
          particle.destroy();
          return;
        }
        const t = elapsed / 1000;
        const damping = 1 - elapsed / duration;
        particle.x += vx * t * damping;
        particle.y += vy * t * damping;
        particle.setAlpha(1 - elapsed / duration);
        particle.setScale(1 - elapsed / duration);
        this.time.delayedCall(16, updateParticle);
      };
      updateParticle();
    }
  }

  private killGhost(ghost: Phaser.Physics.Arcade.Sprite, color: number): void {
    const x = ghost.x;
    const y = ghost.y;
    const data = ghost.getData('ghostData') as GhostData;

    if (data.healthBar) {
      data.healthBar.destroy();
    }

    this.createKillExplosion(x, y, color);
    this.flashScreenEdge(color);

    ghost.destroy();
    this.killCount++;
    this.updateUI();

    if (this.killCount >= this.killsForNextLevel) {
      this.levelUp();
    }
  }

  private createKillExplosion(x: number, y: number, color: number): void {
    const ring = this.add.circle(x, y, 5, color, 0.8);
    ring.setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: ring,
      radius: 80,
      alpha: 0,
      duration: 400,
      ease: 'Power2.Out',
      onComplete: () => { ring.destroy(); }
    });

    const count = 25;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 100 + Math.random() * 150;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const colors = [color, 0xffffff, 0xd4af37, 0x9370db];
      const c = colors[Math.floor(Math.random() * colors.length)];

      const particle = this.add.circle(x, y, 4 + Math.random() * 4, c, 1);
      particle.setBlendMode(Phaser.BlendModes.ADD);

      const start = this.time.now;
      const dur = 700 + Math.random() * 300;
      const update = () => {
        const e = this.time.now - start;
        if (e >= dur) { particle.destroy(); return; }
        const dt = e / 1000;
        particle.x += vx * dt * (1 - e / dur);
        particle.y += vy * dt * (1 - e / dur);
        particle.setAlpha(1 - e / dur);
        particle.setScale(1 - e / dur * 0.7);
        this.time.delayedCall(16, update);
      };
      update();
    }
  }

  private flashScreenEdge(color: number): void {
    const gfx = this.add.graphics();
    gfx.setDepth(450);
    const w = this.scale.width;
    const h = this.scale.height;
    const thickness = 30;

    gfx.fillGradientStyle(color, color, color, color, 0.6, 0, 0.6, 0);
    gfx.fillRect(0, 0, w, thickness);
    gfx.fillGradientStyle(color, color, color, color, 0, 0.6, 0, 0.6);
    gfx.fillRect(0, h - thickness, w, thickness);
    gfx.fillGradientStyle(color, color, color, color, 0.6, 0.6, 0, 0);
    gfx.fillRect(0, 0, thickness, h);
    gfx.fillGradientStyle(color, color, color, color, 0, 0, 0.6, 0.6);
    gfx.fillRect(w - thickness, 0, thickness, h);

    this.tweens.add({
      targets: gfx,
      alpha: 0,
      duration: 200,
      ease: 'Linear',
      onComplete: () => { gfx.destroy(); }
    });
  }

  private spawnGhost(): void {
    if (this.ghosts.getChildren().length >= this.MAX_GHOSTS) {
      this.ghostSpawnTimer = this.ghostSpawnInterval;
      return;
    }

    const w = this.scale.width;
    const h = this.scale.height;
    const edge = Math.floor(Math.random() * 4);
    let x = 0, y = 0;
    const margin = 50;

    switch (edge) {
      case 0: x = Math.random() * w; y = -margin; break;
      case 1: x = w + margin; y = Math.random() * h; break;
      case 2: x = Math.random() * w; y = h + margin; break;
      case 3: x = -margin; y = Math.random() * h; break;
    }

    const ghost = this.createGhostSprite(x, y);
    this.ghosts.add(ghost);
  }

  private createGhostSprite(x: number, y: number): Phaser.Physics.Arcade.Sprite {
    const size = 50;
    const gfx = this.add.graphics();
    this.drawGhostVisual(gfx, size, 0x220044, 0x442266, 0.8);
    gfx.generateTexture('ghost-normal', size, size);
    gfx.destroy();

    const gfx2 = this.add.graphics();
    this.drawGhostVisual(gfx2, size, 0x660011, 0x992233, 0.9);
    gfx2.generateTexture('ghost-enraged', size, size);
    gfx2.destroy();

    const ghost = this.physics.add.sprite(x, y, 'ghost-normal');
    ghost.setBodySize(35, 35);
    ghost.setOffset(size / 2 - 17.5, size / 2 - 17.5);

    const baseSpeed = 80 + Math.random() * 40;
    const data: GhostData = {
      health: this.ghostBaseHealth,
      maxHealth: this.ghostBaseHealth,
      baseSpeed: baseSpeed,
      isEnraged: false,
      healthBar: this.add.graphics()
    };
    data.healthBar.setDepth(40);
    ghost.setData('ghostData', data);

    this.updateGhostHealthBar(ghost);

    this.tweens.add({
      targets: ghost,
      y: { from: y - 4, to: y + 4 },
      duration: 1200 + Math.random() * 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    return ghost;
  }

  private drawGhostVisual(
    gfx: Phaser.GameObjects.Graphics,
    size: number,
    darkColor: number,
    lightColor: number,
    alpha: number
  ): void {
    const cx = size / 2;
    const cy = size / 2;

    gfx.fillStyle(darkColor, alpha * 0.5);
    gfx.fillCircle(cx, cy, size * 0.45);

    gfx.fillStyle(darkColor, alpha * 0.7);
    gfx.fillCircle(cx, cy - size * 0.05, size * 0.35);

    gfx.fillStyle(lightColor, alpha * 0.4);
    gfx.fillCircle(cx - size * 0.1, cy - size * 0.1, size * 0.15);
    gfx.fillCircle(cx + size * 0.12, cy - size * 0.05, size * 0.12);

    gfx.fillStyle(0xff3333, alpha * 0.8);
    gfx.fillCircle(cx - size * 0.1, cy - size * 0.08, size * 0.05);
    gfx.fillCircle(cx + size * 0.08, cy - size * 0.08, size * 0.05);

    for (let i = 0; i < 4; i++) {
      const bx = cx - size * 0.25 + i * size * 0.17;
      const midX = bx;
      const midY = cy + size * 0.35 + Math.sin(i) * size * 0.05;
      const leftX = bx - size * 0.06;
      const leftY = cy + size * 0.2;
      const rightX = bx + size * 0.06;
      const rightY = cy + size * 0.2;

      gfx.fillStyle(darkColor, alpha * 0.6);
      gfx.fillTriangle(
        leftX, leftY,
        midX, midY,
        rightX, rightY
      );
    }
  }

  private updateGhostHealthBar(ghost: Phaser.Physics.Arcade.Sprite): void {
    const data = ghost.getData('ghostData') as GhostData;
    if (!data || !data.healthBar) return;
    data.healthBar.clear();

    const barWidth = 40;
    const barHeight = 5;
    const x = ghost.x - barWidth / 2;
    const y = ghost.y - 35;
    const ratio = Math.max(0, data.health / data.maxHealth);

    data.healthBar.fillStyle(0x333333, 0.8);
    data.healthBar.fillRoundedRect(x - 1, y - 1, barWidth + 2, barHeight + 2, 2);

    let barColor = 0x00ff00;
    if (ratio < 0.3) barColor = 0xff0000;
    else if (ratio < 0.6) barColor = 0xffff00;

    data.healthBar.fillStyle(barColor, 1);
    data.healthBar.fillRoundedRect(x, y, barWidth * ratio, barHeight, 1);
  }

  private updateGhosts(delta: number): void {
    const ghosts = this.ghosts.getChildren() as Phaser.Physics.Arcade.Sprite[];
    for (const ghost of ghosts) {
      const data = ghost.getData('ghostData') as GhostData;
      if (!data) continue;

      const dx = this.playerPos.x - ghost.x;
      const dy = this.playerPos.y - ghost.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const dirX = dist > 0 ? dx / dist : 0;
      const dirY = dist > 0 ? dy / dist : 0;

      const prevEnraged = data.isEnraged;
      data.isEnraged = dist < 100;

      if (prevEnraged !== data.isEnraged) {
        ghost.setTexture(data.isEnraged ? 'ghost-enraged' : 'ghost-normal');
      }

      const speed = data.isEnraged ? data.baseSpeed * 2 : data.baseSpeed;
      ghost.setVelocity(dirX * speed, dirY * speed);

      this.updateGhostHealthBar(ghost);

      if (dist < 45) {
        this.damagePlayer(10);
        if (data.healthBar) data.healthBar.destroy();
        ghost.destroy();
      }
    }
  }

  private damagePlayer(amount: number): void {
    this.playerHealth = Math.max(0, this.playerHealth - amount);
    this.updateUI();
    this.updatePlayerShield();

    this.screenFlashGraphics.clear();
    this.screenFlashGraphics.fillStyle(0xff0000, 0.3);
    this.screenFlashGraphics.fillRect(0, 0, this.scale.width, this.scale.height);
    this.tweens.add({
      targets: this.screenFlashGraphics,
      alpha: 0,
      duration: 200,
      onComplete: () => { this.screenFlashGraphics.clear(); this.screenFlashGraphics.setAlpha(1); }
    });

    this.cameras.main.shake(200, 0.005);

    if (this.playerHealth <= 0) {
      this.gameOver();
    }
  }

  private gameOver(): void {
    this.physics.pause();
    this.edgeFog.clear();

    const overlay = this.add.graphics();
    overlay.setDepth(800);
    overlay.fillStyle(0x000000, 0.75);
    overlay.fillRect(0, 0, this.scale.width, this.scale.height);

    const title = this.add.text(
      this.scale.width / 2,
      this.scale.height / 2 - 60,
      '学院陷落',
      {
        fontFamily: 'Georgia, serif',
        fontSize: '64px',
        fontStyle: 'bold',
        color: '#ff3366',
        stroke: '#660033',
        strokeThickness: 4,
        shadow: { offsetX: 0, offsetY: 0, color: '#ff3366', blur: 25, fill: true }
      }
    );
    title.setOrigin(0.5);
    title.setDepth(801);

    const info = this.add.text(
      this.scale.width / 2,
      this.scale.height / 2 + 20,
      `击败幽灵数: ${this.killCount}\n到达关卡: ${this.currentLevel}`,
      {
        fontFamily: 'Georgia, serif',
        fontSize: '28px',
        color: '#d4af37',
        align: 'center',
        shadow: { offsetX: 0, offsetY: 0, color: '#d4af37', blur: 10, fill: true }
      }
    );
    info.setOrigin(0.5);
    info.setDepth(801);

    const restart = this.add.text(
      this.scale.width / 2,
      this.scale.height / 2 + 120,
      '【 点击重新开始 】',
      {
        fontFamily: 'Georgia, serif',
        fontSize: '24px',
        color: '#aaffcc',
        shadow: { offsetX: 0, offsetY: 0, color: '#aaffcc', blur: 15, fill: true }
      }
    );
    restart.setOrigin(0.5);
    restart.setDepth(801);
    restart.setInteractive({ useHandCursor: true });

    restart.on('pointerover', () => {
      restart.setScale(1.1);
      restart.setColor('#ffffff');
    });
    restart.on('pointerout', () => {
      restart.setScale(1);
      restart.setColor('#aaffcc');
    });
    restart.on('pointerdown', () => {
      this.scene.restart();
    });
  }

  private levelUp(): void {
    if (this.isLevelUpAnimating) return;
    this.isLevelUpAnimating = true;

    this.currentLevel++;
    this.killCount = 0;
    this.killsForNextLevel = 10 + this.currentLevel * 2;
    this.ghostSpawnInterval = Math.max(800, 3000 - this.currentLevel * 250);
    this.ghostBaseHealth = 30 + this.currentLevel * 10;

    this.updateUI();

    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;
    const maxR = Math.max(this.scale.width, this.scale.height);

    this.levelUpRipple = this.add.graphics();
    this.levelUpRipple.setDepth(700);

    let currentR = 10;
    const colors = [0x9370db, 0xd4af37, 0x66ddff, 0xff6600, 0xffffff];

    const animateRipple = () => {
      if (!this.levelUpRipple) return;
      this.levelUpRipple.clear();

      for (let i = 0; i < 4; i++) {
        const r = Math.max(0, currentR - i * 40);
        if (r <= 0) continue;
        const alpha = Math.max(0, (1 - r / maxR) * (1 - i * 0.2));
        const color = colors[i % colors.length];
        this.levelUpRipple.lineStyle(6 - i, color, alpha);
        this.levelUpRipple.strokeCircle(cx, cy, r);
      }

      currentR += 20;

      if (currentR < maxR + 100) {
        this.time.delayedCall(16, animateRipple);
      } else {
        if (this.levelUpRipple) {
          this.levelUpRipple.destroy();
          this.levelUpRipple = null;
        }
        this.isLevelUpAnimating = false;
      }
    };
    animateRipple();

    const banner = this.add.text(cx, cy - 40, `第 ${this.currentLevel} 关`, {
      fontFamily: 'Georgia, serif',
      fontSize: '72px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#d4af37',
      strokeThickness: 5,
      shadow: { offsetX: 0, offsetY: 0, color: '#9370db', blur: 30, fill: true }
    });
    banner.setOrigin(0.5);
    banner.setDepth(750);
    banner.setScale(0.2);
    banner.setAlpha(0);

    this.tweens.add({
      targets: banner,
      scale: { from: 0.2, to: 1.2 },
      alpha: { from: 0, to: 1 },
      duration: 500,
      ease: 'Back.easeOut',
      yoyo: true,
      hold: 600,
      onComplete: () => { banner.destroy(); }
    });
  }

  public update(time: number, delta: number): void {
    if (this.time.paused) return;

    this.fogTime += delta;
    if (this.fogTime > 30) {
      this.updateEdgeFog(this.fogTime);
      this.fogTime = 0;
    }

    this.updatePlayerShield();
    this.updateGhosts(delta);

    this.spellManager.update(delta);

    this.ghostSpawnTimer += delta;
    if (this.ghostSpawnTimer >= this.ghostSpawnInterval) {
      this.ghostSpawnTimer = 0;
      this.spawnGhost();
    }

    if (this.playerHealth < 30) {
      this.lowHealthAudioTimer += delta;
      if (this.lowHealthAudioTimer > 500) {
        this.lowHealthAudioTimer = 0;
      }
    }
  }

  private onWindowResized(data: { width: number; height: number }): void {
    this.playerPos = { x: data.width / 2, y: data.height / 2 };

    if (this.killText) {
      this.killText.setPosition(data.width - 30, 30);
    }
    if (this.levelText) {
      this.levelText.setPosition(data.width / 2, 35);
    }
  }
}
