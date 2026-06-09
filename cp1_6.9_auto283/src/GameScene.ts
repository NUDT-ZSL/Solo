import Phaser from 'phaser';
import { Player } from './Player';
import { generateLevel, LevelData, Wall, PlatformData, FragmentData, GuardData } from './LevelData';

type GameState = 'menu' | 'playing' | 'instructions' | 'levelComplete' | 'gameComplete';

interface MetalPlatform {
  sprite: Phaser.Physics.Arcade.Sprite;
  graphics: Phaser.GameObjects.Graphics;
  originalX: number;
  originalY: number;
  isMoving: boolean;
  moveDirX: number;
  moveDirY: number;
  moveDistance: number;
  movedDistance: number;
  isAttracting: boolean;
}

interface EnergyFragment {
  container: Phaser.GameObjects.Container;
  star: Phaser.GameObjects.Graphics;
  glow: Phaser.GameObjects.Graphics;
  collected: boolean;
  rotation: number;
  scalePhase: number;
}

interface ShadowGuard {
  container: Phaser.GameObjects.Container;
  body: Phaser.Physics.Arcade.Body;
  shape: Phaser.GameObjects.Graphics;
  patrolPoints: { x: number; y: number }[];
  currentTarget: number;
  speed: number;
  retreatUntil: number;
  retreatX: number;
  retreatY: number;
}

export class GameScene extends Phaser.Scene {
  public gameState: GameState = 'menu';
  public currentLevel = 1;
  public maxLevel = 3;

  public score = 0;
  public collectedFragments = 0;
  public requiredFragments = 10;

  public levelData!: LevelData;
  public player!: Player;

  public wallGroup!: Phaser.Physics.Arcade.StaticGroup;
  public platforms: MetalPlatform[] = [];
  public fragments: EnergyFragment[] = [];
  public guards: ShadowGuard[] = [];

  public scoreText!: Phaser.GameObjects.Text;
  public fragmentText!: Phaser.GameObjects.Text;
  public levelText!: Phaser.GameObjects.Text;
  public stateText!: Phaser.GameObjects.Text;

  public cursorKeys!: Phaser.Types.Input.Keyboard.CursorKeys;
  public wasdKeys!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  public spaceKey!: Phaser.Input.Keyboard.Key;

  public portalGraphics!: Phaser.GameObjects.Graphics;
  public portalActive = false;
  public portalRotation = 0;

  public flashOverlay!: Phaser.GameObjects.Rectangle;
  public backgroundStars!: Phaser.GameObjects.Graphics;

  public menuContainer!: Phaser.GameObjects.Container;
  public menuButtons: { btn: Phaser.GameObjects.Container; label: Phaser.GameObjects.Text; glow: Phaser.GameObjects.Graphics }[] = [];

  public particlesGold: any;
  public particlesFinish: any;

  public platformMagnetCooldowns: Map<MetalPlatform, number> = new Map();

  constructor() {
    super({ key: 'GameScene' });
  }

  public create(): void {
    this.createInput();
    this.createBackground();
    this.createFlashOverlay();
    this.createParticleEmitters();
    this.createHUD();
    this.createMenu();
  }

  private createInput(): void {
    this.cursorKeys = this.input.keyboard!.createCursorKeys();
    this.wasdKeys = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    };
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  }

  private createBackground(): void {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a20, 0x1a0a30, 0x20103a, 0x150825, 1, 1, 1, 1);
    bg.fillRect(0, 0, 800, 600);

    this.backgroundStars = this.add.graphics();
    for (let i = 0; i < 120; i++) {
      const x = Math.random() * 800;
      const y = Math.random() * 600;
      const size = 0.5 + Math.random() * 1.5;
      const alpha = 0.3 + Math.random() * 0.7;
      this.backgroundStars.fillStyle(0xffffff, alpha);
      this.backgroundStars.fillCircle(x, y, size);
    }
  }

  private createFlashOverlay(): void {
    this.flashOverlay = this.add.rectangle(400, 300, 800, 600, 0xff0000, 0);
    this.flashOverlay.setDepth(1000);
  }

  private createParticleEmitters(): void {
    const goldGfx = this.add.graphics();
    goldGfx.fillStyle(0xffd700, 1);
    goldGfx.fillCircle(4, 4, 4);
    goldGfx.generateTexture('GOLD_PARTICLE', 8, 8);
    goldGfx.destroy();

    const finishGfx = this.add.graphics();
    finishGfx.fillStyle(0xfff5a0, 1);
    finishGfx.fillCircle(5, 5, 5);
    finishGfx.generateTexture('FINISH_PARTICLE', 10, 10);
    finishGfx.destroy();

    this.particlesGold = this.add.particles(0, 0, 'GOLD_PARTICLE', {
      color: [0xffd700, 0xffea00, 0xfff176, 0xffffff],
      scale: { start: 0.6, end: 0.1 },
      alpha: { start: 1, end: 0.2 },
      speed: { min: 40, max: 120 },
      angle: { min: 0, max: 360 },
      lifespan: 500,
      quantity: 0,
      emitting: false
    });

    this.particlesFinish = this.add.particles(0, 0, 'FINISH_PARTICLE', {
      color: [0xffd700, 0xffea00, 0xffffff],
      scale: { start: 1, end: 0.1 },
      alpha: { start: 1, end: 0 },
      speed: { min: 20, max: 80 },
      angle: { min: 270 - 30, max: 270 + 30 },
      gravityY: 20,
      lifespan: 1000,
      quantity: 0,
      emitting: false
    });
  }

  private createHUD(): void {
    this.scoreText = this.add.text(20, 15, '分数: 0', {
      fontFamily: 'Microsoft YaHei',
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setDepth(500).setScrollFactor(0);

    this.fragmentText = this.add.text(20, 42, '碎片: 0/10', {
      fontFamily: 'Microsoft YaHei',
      fontSize: '16px',
      color: '#ffd700',
      fontStyle: 'bold'
    }).setDepth(500).setScrollFactor(0);

    this.levelText = this.add.text(680, 15, '第 1 关', {
      fontFamily: 'Microsoft YaHei',
      fontSize: '20px',
      color: '#aaaaff',
      fontStyle: 'bold'
    }).setDepth(500).setScrollFactor(0);

    this.stateText = this.add.text(400, 280, '', {
      fontFamily: 'Microsoft YaHei',
      fontSize: '40px',
      color: '#ffd700',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(2000).setScrollFactor(0).setVisible(false);
  }

  private createMenu(): void {
    this.menuContainer = this.add.container(400, 300).setDepth(800);

    const title = this.add.text(0, -140, '磁轨甲虫', {
      fontFamily: 'Microsoft YaHei',
      fontSize: '56px',
      color: '#aaccff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    title.setStroke('#334466', 6);
    (title as any).setShadow(0, 0, '#6688ff', 20, true, true);

    const subtitle = this.add.text(0, -80, 'Magnetic Beetle', {
      fontFamily: 'Arial',
      fontSize: '22px',
      color: '#8899cc'
    }).setOrigin(0.5);

    const startBtn = this.createMenuButton(0, 0, '开始游戏', () => this.startGame());
    const instrBtn = this.createMenuButton(0, 80, '操作说明', () => this.showInstructions());

    this.menuContainer.add([title, subtitle, startBtn.btn, instrBtn.btn]);
  }

  private createMenuButton(x: number, y: number, text: string, onClick: () => void): { btn: Phaser.GameObjects.Container; label: Phaser.GameObjects.Text; glow: Phaser.GameObjects.Graphics } {
    const container = this.add.container(x, y);

    const glow = this.add.graphics();
    glow.fillStyle(0x88aaff, 0);
    glow.fillRoundedRect(-120, -32, 240, 64, 18);

    const bg = this.add.graphics();
    bg.fillGradientStyle(0x3a2a5a, 0x2a1a4a, 0x4a3a6a, 0x3a2a5a, 1, 1, 1, 1);
    bg.fillRoundedRect(-110, -28, 220, 56, 14);
    bg.lineStyle(2, 0x88aaff, 0.6);
    bg.strokeRoundedRect(-110, -28, 220, 56, 14);

    const label = this.add.text(0, 0, text, {
      fontFamily: 'Microsoft YaHei',
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    container.add([glow, bg, label]);

    container.setSize(220, 56);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerover', () => {
      this.tweens.add({
        targets: container,
        scale: 1.1,
        duration: 200,
        ease: 'Quad.easeOut'
      });
      this.tweens.add({
        targets: glow,
        alpha: 0.3,
        duration: 200,
        ease: 'Quad.easeOut'
      });
    });

    container.on('pointerout', () => {
      this.tweens.add({
        targets: container,
        scale: 1.0,
        duration: 200,
        ease: 'Quad.easeOut'
      });
      this.tweens.add({
        targets: glow,
        alpha: 0,
        duration: 200,
        ease: 'Quad.easeOut'
      });
    });

    container.on('pointerdown', onClick);

    this.menuButtons.push({ btn: container, label, glow });

    return { btn: container, label, glow };
  }

  private showInstructions(): void {
    const instrContainer = this.add.container(400, 300).setDepth(900);

    const overlay = this.add.rectangle(0, 0, 800, 600, 0x000000, 0.75);

    const panel = this.add.graphics();
    panel.fillGradientStyle(0x2a1a4a, 0x1a0a3a, 0x3a2a5a, 0x2a1a4a, 1, 1, 1, 1);
    panel.fillRoundedRect(-280, -220, 560, 440, 20);
    panel.lineStyle(3, 0x88aaff, 0.7);
    panel.strokeRoundedRect(-280, -220, 560, 440, 20);

    const title = this.add.text(0, -180, '操作说明', {
      fontFamily: 'Microsoft YaHei',
      fontSize: '32px',
      color: '#aaccff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const lines = [
      '🎮 W / ↑  向上移动',
      '🎮 S / ↓  向下移动',
      '🎮 A / ←  向左移动',
      '🎮 D / →  向右移动',
      '',
      '⚡ 空格键  切换磁极',
      '   正极（蓝）→ 吸引金属平台',
      '   负极（红）→ 弹开金属平台',
      '',
      '💎 收集金色能量碎片（+10分）',
      '👁 避开暗影守卫（-3分，减速1秒）',
      '🚪 收集足够碎片后进入传送门通关'
    ];

    let yOffset = -110;
    const textObjs: Phaser.GameObjects.Text[] = [];
    for (const line of lines) {
      const t = this.add.text(0, yOffset, line, {
        fontFamily: 'Microsoft YaHei',
        fontSize: line.startsWith('🎮') || line.startsWith('⚡') || line.startsWith('💎') || line.startsWith('👁') || line.startsWith('🚪') ? '20px' : '17px',
        color: line.startsWith('🎮') || line.startsWith('⚡') || line.startsWith('💎') || line.startsWith('👁') || line.startsWith('🚪') ? '#ffffff' : '#bbbbcc',
        fontStyle: line.startsWith('🎮') || line.startsWith('⚡') || line.startsWith('💎') || line.startsWith('👁') || line.startsWith('🚪') ? 'bold' : 'normal'
      }).setOrigin(0.5);
      textObjs.push(t);
      yOffset += line === '' ? 18 : 32;
    }

    const closeBtn = this.add.container(0, 175);
    const closeBg = this.add.graphics();
    closeBg.fillGradientStyle(0x4a3a7a, 0x3a2a6a, 0x5a4a8a, 0x4a3a7a, 1, 1, 1, 1);
    closeBg.fillRoundedRect(-70, -25, 140, 50, 12);
    closeBg.lineStyle(2, 0x88aaff, 0.6);
    closeBg.strokeRoundedRect(-70, -25, 140, 50, 12);
    const closeLabel = this.add.text(0, 0, '返回', {
      fontFamily: 'Microsoft YaHei',
      fontSize: '22px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    closeBtn.add([closeBg, closeLabel]);
    closeBtn.setSize(140, 50);
    closeBtn.setInteractive({ useHandCursor: true });

    closeBtn.on('pointerover', () => {
      this.tweens.add({ targets: closeBtn, scale: 1.1, duration: 200, ease: 'Quad.easeOut' });
    });
    closeBtn.on('pointerout', () => {
      this.tweens.add({ targets: closeBtn, scale: 1.0, duration: 200, ease: 'Quad.easeOut' });
    });
    closeBtn.on('pointerdown', () => {
      this.tweens.add({
        targets: instrContainer,
        alpha: 0,
        duration: 300,
        ease: 'Quad.easeOut',
        onComplete: () => instrContainer.destroy()
      });
    });

    instrContainer.add([overlay, panel, title, ...textObjs, closeBtn]);
    instrContainer.setAlpha(0);
    this.tweens.add({
      targets: instrContainer,
      alpha: 1,
      duration: 300,
      ease: 'Quad.easeOut'
    });
  }

  private startGame(): void {
    this.currentLevel = 1;
    this.score = 0;
    this.collectedFragments = 0;
    this.portalActive = false;

    this.tweens.add({
      targets: this.menuContainer,
      alpha: 0,
      duration: 400,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.menuContainer.setVisible(false);
        this.loadLevel(this.currentLevel);
      }
    });
  }

  private loadLevel(level: number): void {
    this.clearLevel();

    this.levelData = generateLevel(level);
    this.requiredFragments = this.levelData.requiredFragments;
    this.collectedFragments = 0;
    this.portalActive = false;

    this.createWalls();
    this.createPlayer();
    this.createPlatforms();
    this.createFragments();
    this.createGuards();
    this.createPortal(false);
    this.setupCollisions();

    this.updateHUD();
    this.gameState = 'playing';
  }

  private clearLevel(): void {
    this.wallGroup && this.wallGroup.clear(true, true);
    this.platforms.forEach(p => {
      p.sprite.destroy();
      p.graphics.destroy();
    });
    this.platforms = [];
    this.platformMagnetCooldowns.clear();

    this.fragments.forEach(f => f.container.destroy());
    this.fragments = [];

    this.guards.forEach(g => g.container.destroy());
    this.guards = [];

    this.portalGraphics && this.portalGraphics.destroy();

    if (this.player) {
      this.player.destroy();
    }
  }

  private createWalls(): void {
    this.wallGroup = this.physics.add.staticGroup();

    for (const wall of this.levelData.walls) {
      this.createWallGraphic(wall);
    }
  }

  private createWallGraphic(wall: Wall): void {
    const g = this.add.graphics();

    g.fillGradientStyle(0x505050, 0x303030, 0x484848, 0x383838, 1, 1, 1, 1);
    g.fillRect(wall.x, wall.y, wall.width, wall.height);

    g.lineStyle(2, 0x8888aa, 0.5);
    g.strokeRect(wall.x + 0.5, wall.y + 0.5, wall.width - 1, wall.height - 1);

    g.lineStyle(1, 0xaaaacc, 0.3);
    if (wall.width > wall.height) {
      g.beginPath();
      g.moveTo(wall.x + 2, wall.y + wall.height / 2);
      g.lineTo(wall.x + wall.width - 2, wall.y + wall.height / 2);
      g.strokePath();
    } else {
      g.beginPath();
      g.moveTo(wall.x + wall.width / 2, wall.y + 2);
      g.lineTo(wall.x + wall.width / 2, wall.y + wall.height - 2);
      g.strokePath();
    }

    const sprite = this.physics.add.staticSprite(wall.x + wall.width / 2, wall.y + wall.height / 2, '__DEFAULT');
    sprite.setTexture('', '');
    sprite.setDisplaySize(wall.width, wall.height);
    sprite.body!.setSize(wall.width, wall.height);
    sprite.setData('isWall', true);
    this.wallGroup.add(sprite);
  }

  private createPlayer(): void {
    this.player = new Player(this, this.levelData.startX, this.levelData.startY);
  }

  private createPlatforms(): void {
    for (const pdata of this.levelData.platforms) {
      this.createPlatform(pdata);
    }
  }

  private createPlatform(pdata: PlatformData): void {
    const graphics = this.add.graphics();
    this.drawPlatformGraphics(graphics, pdata.width, pdata.height);

    const cx = pdata.x + pdata.width / 2;
    const cy = pdata.y + pdata.height / 2;

    const sprite = this.physics.add.sprite(cx, cy, '__DEFAULT');
    sprite.setTexture('', '');
    sprite.setDisplaySize(pdata.width, pdata.height);
    sprite.body!.setSize(pdata.width, pdata.height);
    sprite.setImmovable(false);
    sprite.setDrag(500, 500);
    sprite.setFriction(0.9, 0.9);
    sprite.setBounce(0.1, 0.1);
    sprite.body!.setAllowGravity(false);

    graphics.x = cx;
    graphics.y = cy;

    const platform: MetalPlatform = {
      sprite,
      graphics,
      originalX: cx,
      originalY: cy,
      isMoving: false,
      moveDirX: 0,
      moveDirY: 0,
      moveDistance: 0,
      movedDistance: 0,
      isAttracting: false
    };

    this.platforms.push(platform);
    this.platformMagnetCooldowns.set(platform, 0);
  }

  private drawPlatformGraphics(g: Phaser.GameObjects.Graphics, w: number, h: number): void {
    g.clear();
    const hw = w / 2;
    const hh = h / 2;

    g.fillGradientStyle(0xffe664, 0xffcc33, 0xcc9900, 0xffaa33, 1, 1, 1, 1);
    g.fillRoundedRect(-hw, -hh, w, h, 4);

    g.lineStyle(2, 0xffffff, 0.6);
    g.beginPath();
    g.moveTo(-hw + 4, -hh + 4);
    g.lineTo(hw - 8, -hh + 4);
    g.lineTo(hw - 14, -hh + 10);
    g.strokePath();

    g.lineStyle(2, 0x886600, 0.5);
    g.beginPath();
    g.moveTo(-hw + 4, hh - 4);
    g.lineTo(hw - 4, hh - 4);
    g.strokePath();

    g.lineStyle(2, 0xffffaa, 0.7);
    g.strokeRoundedRect(-hw, -hh, w, h, 4);
  }

  private createFragments(): void {
    for (const fdata of this.levelData.fragments) {
      this.createFragment(fdata);
    }
  }

  private createFragment(fdata: FragmentData): void {
    const container = this.add.container(fdata.x, fdata.y);

    const glow = this.add.graphics();
    glow.fillStyle(0xffd700, 0.25);
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI * 2 / 8) * i;
      glow.fillCircle(Math.cos(a) * 14, Math.sin(a) * 14, 3);
    }

    const star = this.add.graphics();

    const fragment: EnergyFragment = {
      container,
      star,
      glow,
      collected: false,
      rotation: Math.random() * Math.PI * 2,
      scalePhase: Math.random() * Math.PI * 2
    };

    this.drawFragmentStar(fragment);

    container.add([glow, star]);
    this.fragments.push(fragment);
  }

  private drawFragmentStar(f: EnergyFragment): void {
    const g = f.star;
    g.clear();

    const baseScale = 1 + 0.1 * Math.sin(f.scalePhase);
    const outerR = 14 * baseScale;
    const innerR = 6 * baseScale;

    const pts: Phaser.Types.Math.Vector2Like[] = [];
    for (let i = 0; i < 12; i++) {
      const a = (Math.PI * 2 / 12) * i - Math.PI / 2 + f.rotation;
      const r = i % 2 === 0 ? outerR : innerR;
      pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
    }

    g.fillGradientStyle(0xffef9a, 0xffd700, 0xffa000, 0xffcc33, 1, 1, 1, 1);
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      g.lineTo(pts[i].x, pts[i].y);
    }
    g.closePath();
    g.fillPath();

    g.lineStyle(1.5, 0xffffcc, 0.8);
    g.strokePoints(pts, true);

    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(-2, -3, 2);
  }

  private createGuards(): void {
    for (const gdata of this.levelData.guards) {
      this.createGuard(gdata);
    }
  }

  private createGuard(gdata: GuardData): void {
    const container = this.add.container(gdata.x, gdata.y);

    const shape = this.add.graphics();
    this.drawGuardShape(shape);

    this.physics.world.enable(container);
    const body = container.body as Phaser.Physics.Arcade.Body;
    body.setCircle(20);
    body.setAllowGravity(false);
    body.setImmovable(false);

    const guard: ShadowGuard = {
      container,
      body,
      shape,
      patrolPoints: gdata.patrolPoints.length > 1 ? [...gdata.patrolPoints] : [{ x: gdata.x, y: gdata.y }],
      currentTarget: 1 % gdata.patrolPoints.length,
      speed: gdata.speed,
      retreatUntil: 0,
      retreatX: 0,
      retreatY: 0
    };

    container.add([shape]);
    this.guards.push(guard);
  }

  private drawGuardShape(g: Phaser.GameObjects.Graphics): void {
    g.clear();

    const r = 18;
    const pts: Phaser.Types.Math.Vector2Like[] = [];
    const sides = 7;
    for (let i = 0; i < sides; i++) {
      const a = (Math.PI * 2 / sides) * i - Math.PI / 2;
      const vr = r + (i % 2 === 0 ? 3 : -2) + Math.sin(i * 2.3) * 2;
      pts.push({ x: Math.cos(a) * vr, y: Math.sin(a) * vr });
    }

    g.fillStyle(0x110011, 0.7);
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      g.lineTo(pts[i].x, pts[i].y);
    }
    g.closePath();
    g.fillPath();

    g.lineStyle(2, 0x660022, 0.3);
    g.strokePoints(pts, true);

    g.fillStyle(0xff2244, 0.8);
    g.fillCircle(-5, -3, 2.5);
    g.fillCircle(5, -3, 2.5);
  }

  private createPortal(active: boolean): void {
    this.portalGraphics = this.add.graphics();
    this.portalGraphics.setDepth(400);
    this.portalActive = active;
    this.portalRotation = 0;
    this.drawPortal();
  }

  private drawPortal(): void {
    const g = this.portalGraphics;
    g.clear();

    const x = this.levelData.portalX;
    const y = this.levelData.portalY;
    const r = 60;

    if (!this.portalActive) {
      g.lineStyle(2, 0x444466, 0.3);
      g.strokeCircle(x, y, r);
      g.lineStyle(1, 0x444466, 0.15);
      g.strokeCircle(x, y, r - 10);
      return;
    }

    for (let ring = 3; ring >= 0; ring--) {
      const rr = r - ring * 10;
      const alpha = 0.1 + ring * 0.15;
      g.lineStyle(3, 0x6699ff, alpha);
      g.beginPath();
      g.arc(x, y, rr, this.portalRotation + ring * 0.5, this.portalRotation + ring * 0.5 + Math.PI * 1.6);
      g.strokePath();

      g.lineStyle(3, 0x99ccff, alpha * 0.6);
      g.beginPath();
      g.arc(x, y, rr, this.portalRotation + ring * 0.5 + Math.PI, this.portalRotation + ring * 0.5 + Math.PI * 2.4);
      g.strokePath();
    }

    g.fillStyle(0x6699ff, 0.15);
    g.fillCircle(x, y, r * 0.4);

    g.fillStyle(0xaaddff, 0.8);
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI * 2 / 6) * i + this.portalRotation * 2;
      g.fillCircle(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7, 2);
    }
  }

  private setupCollisions(): void {
    this.physics.add.collider(this.player.container, this.wallGroup);

    for (const p of this.platforms) {
      this.physics.add.collider(this.player.container, p.sprite);
      this.physics.add.collider(p.sprite, this.wallGroup);
      for (const p2 of this.platforms) {
        if (p !== p2) {
          this.physics.add.collider(p.sprite, p2.sprite);
        }
      }
    }

    for (const g of this.guards) {
      this.physics.add.collider(this.player.container, g.container, () => {
        this.onGuardCollision(g);
      });
    }
  }

  private onGuardCollision(guard: ShadowGuard): void {
    if (this.player.state === 'slowed') return;

    this.player.applySlow(1000);

    this.score = Math.max(0, this.score - 3);
    this.updateHUD();

    this.flashOverlay.setFillStyle(0xff0000, 0.3);
    this.tweens.add({
      targets: this.flashOverlay,
      alpha: { from: 0.3, to: 0 },
      duration: 200,
      ease: 'Quad.easeOut'
    });

    const dx = guard.container.x - this.player.x;
    const dy = guard.container.y - this.player.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    guard.retreatX = (dx / d);
    guard.retreatY = (dy / d);
    guard.retreatUntil = this.time.now + 300;
  }

  private checkFragmentCollection(): void {
    for (const f of this.fragments) {
      if (f.collected) continue;

      const dx = f.container.x - this.player.x;
      const dy = f.container.y - this.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 26) {
        f.collected = true;

        this.particlesGold.emitParticleAt(f.container.x, f.container.y, 30);

        this.score += 10;
        this.collectedFragments++;
        this.updateHUD();

        const scaleTween = this.tweens.add({
          targets: f.container,
          scale: 1.8,
          alpha: 0,
          duration: 250,
          ease: 'Quad.easeOut',
          onComplete: () => {
            f.container.destroy();
          }
        });
        void scaleTween;

        if (this.collectedFragments >= this.requiredFragments) {
          this.activatePortal();
        }
      }
    }
  }

  private activatePortal(): void {
    if (this.portalActive) return;
    this.portalActive = true;

    this.particlesGold.emitParticleAt(this.levelData.portalX, this.levelData.portalY, 20);
  }

  private checkPortal(): void {
    if (!this.portalActive) return;

    const dx = this.levelData.portalX - this.player.x;
    const dy = this.levelData.portalY - this.player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 50) {
      this.onLevelComplete();
    }
  }

  private onLevelComplete(): void {
    if (this.gameState !== 'playing') return;
    this.gameState = 'levelComplete';

    this.particlesFinish.emitParticleAt(this.player.x, this.player.y, 50);

    this.tweens.add({
      targets: this.player.container,
      scale: 0.2,
      alpha: 0,
      angle: 360 * 3,
      y: this.player.y - 150,
      duration: 1500,
      ease: 'Cubic.easeIn'
    });

    this.cameras.main.zoomTo(1.4, 1000, 'Cubic.easeInOut');

    this.time.delayedCall(1200, () => {
      this.cameras.main.fadeOut(800, 10, 5, 30);
    });

    this.time.delayedCall(2000, () => {
      if (this.currentLevel >= this.maxLevel) {
        this.onGameComplete();
      } else {
        this.currentLevel++;
        this.cameras.main.resetFX();
        this.cameras.main.zoom = 1;
        this.loadLevel(this.currentLevel);
      }
    });
  }

  private onGameComplete(): void {
    this.gameState = 'gameComplete';
    this.clearLevel();
    this.cameras.main.resetFX();
    this.cameras.main.zoom = 1;

    this.stateText.setText('恭喜通关！');
    this.stateText.setColor('#ffd700');
    this.stateText.setFontSize('48px');
    this.stateText.setVisible(true);
    this.stateText.setAlpha(0);

    this.particlesFinish.emitParticleAt(400, 300, 80);

    this.tweens.add({
      targets: this.stateText,
      alpha: 1,
      duration: 800,
      ease: 'Quad.easeOut'
    });

    this.time.delayedCall(2500, () => {
      this.tweens.add({
        targets: this.stateText,
        alpha: 0,
        duration: 500,
        ease: 'Quad.easeOut',
        onComplete: () => {
          this.stateText.setVisible(false);
          this.returnToMenu();
        }
      });
    });
  }

  private returnToMenu(): void {
    this.gameState = 'menu';
    this.currentLevel = 1;
    this.score = 0;
    this.collectedFragments = 0;
    this.clearLevel();
    this.menuContainer.setVisible(true);
    this.menuContainer.setAlpha(0);
    this.tweens.add({
      targets: this.menuContainer,
      alpha: 1,
      duration: 400,
      ease: 'Quad.easeOut'
    });
    this.updateHUD();
  }

  private updateHUD(): void {
    this.scoreText.setText(`分数: ${this.score}`);
    this.fragmentText.setText(`碎片: ${this.collectedFragments}/${this.requiredFragments}`);
    this.levelText.setText(`第 ${this.currentLevel} 关`);
  }

  private handlePlayerInput(): void {
    let dx = 0;
    let dy = 0;

    if (this.cursorKeys.left.isDown || this.wasdKeys.A.isDown) dx -= 1;
    if (this.cursorKeys.right.isDown || this.wasdKeys.D.isDown) dx += 1;
    if (this.cursorKeys.up.isDown || this.wasdKeys.W.isDown) dy -= 1;
    if (this.cursorKeys.down.isDown || this.wasdKeys.S.isDown) dy += 1;

    if (dx !== 0 || dy !== 0) {
      this.player.move(dx, dy);
    } else {
      const body = this.player.body;
      body.setVelocity(body.velocity.x * 0.85, body.velocity.y * 0.85);
    }

    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      this.player.togglePolarity();
    }
  }

  private applyMagneticForces(time: number, delta: number): void {
    void delta;
    const px = this.player.x;
    const py = this.player.y;
    const maxRange = 220;
    const isPositive = this.player.polarity === 'positive';

    for (const platform of this.platforms) {
      const cx = platform.sprite.x;
      const cy = platform.sprite.y;

      const dx = px - cx;
      const dy = py - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > maxRange || dist < 2) continue;

      const cooldown = this.platformMagnetCooldowns.get(platform) || 0;
      if (time < cooldown) continue;

      const force = 1000 / dist;
      const dirX = dx / dist;
      const dirY = dy / dist;

      if (isPositive) {
        platform.sprite.body!.velocity.x += dirX * force * 0.1;
        platform.sprite.body!.velocity.y += dirY * force * 0.1;
        platform.isAttracting = true;
      } else {
        if (!platform.isMoving) {
          platform.isMoving = true;
          platform.moveDirX = -dirX;
          platform.moveDirY = -dirY;
          platform.moveDistance = 200;
          platform.movedDistance = 0;
          platform.sprite.body!.velocity.x += (-dirX) * force * 0.15;
          platform.sprite.body!.velocity.y += (-dirY) * force * 0.15;
          this.platformMagnetCooldowns.set(platform, time + 300);
        }
      }
    }
  }

  private updatePlatforms(delta: number): void {
    for (const platform of this.platforms) {
      platform.graphics.x = platform.sprite.x;
      platform.graphics.y = platform.sprite.y;

      const vx = platform.sprite.body!.velocity.x;
      const vy = platform.sprite.body!.velocity.y;
      const speed = Math.sqrt(vx * vx + vy * vy);

      if (platform.isMoving && speed > 2) {
        platform.movedDistance += speed * (delta / 1000);
        if (platform.movedDistance >= platform.moveDistance) {
          platform.sprite.body!.velocity.x *= 0.3;
          platform.sprite.body!.velocity.y *= 0.3;
          platform.isMoving = false;
        }
      }

      if (platform.isAttracting) {
        platform.isAttracting = false;
      }
    }
  }

  private updateFragments(delta: number): void {
    for (const f of this.fragments) {
      if (f.collected) continue;
      f.rotation += Phaser.Math.DegToRad(15) * (delta / 1000);
      f.scalePhase += (Math.PI * 2 / 0.8) * (delta / 1000);
      this.drawFragmentStar(f);
    }
  }

  private updateGuards(time: number, delta: number): void {
    for (const guard of this.guards) {
      if (time < guard.retreatUntil) {
        guard.container.x += guard.retreatX * guard.speed * 1.5 * (delta / 1000);
        guard.container.y += guard.retreatY * guard.speed * 1.5 * (delta / 1000);
        guard.body.reset(guard.container.x, guard.container.y);
        continue;
      }

      const target = guard.patrolPoints[guard.currentTarget];
      const dx = target.x - guard.container.x;
      const dy = target.y - guard.container.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 5) {
        guard.currentTarget = (guard.currentTarget + 1) % guard.patrolPoints.length;
      } else {
        const mx = (dx / dist) * guard.speed * (delta / 1000);
        const my = (dy / dist) * guard.speed * (delta / 1000);
        guard.container.x += mx;
        guard.container.y += my;
        guard.body.reset(guard.container.x, guard.container.y);
      }
    }
  }

  private updatePortal(delta: number): void {
    if (this.portalActive) {
      this.portalRotation += Phaser.Math.DegToRad(30) * (delta / 1000);
    }
    this.drawPortal();
  }

  public update(time: number, delta: number): void {
    if (this.gameState !== 'playing') return;

    this.handlePlayerInput();
    this.player.update(time, delta);
    this.applyMagneticForces(time, delta);
    this.updatePlatforms(delta);
    this.updateFragments(delta);
    this.updateGuards(time, delta);
    this.updatePortal(delta);
    this.checkFragmentCollection();
    this.checkPortal();
  }
}
