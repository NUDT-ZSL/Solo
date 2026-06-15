import Phaser from 'phaser';
import { TimeManager } from '../utils/TimeManager';
import { Level, LevelConfig, ObstacleConfig, MachineConfig, PlatformConfig, MachineTargetConfig } from '../objects/Level';
import { TimeStamp, TimeStampConfig } from '../objects/TimeStamp';
import { TimeEffectType } from '../utils/TimeManager';

const GAME_W = 960;
const GAME_H = 640;

const PALETTE = {
  bg: 0x1a1008,
  bgMid: 0x2d1f0e,
  bronze: 0xd4a574,
  copper: 0xb87333,
  darkBronze: 0x8b6914,
  gold: 0xffd700,
  warmBrown: 0x5c3a1e,
  metal: 0x9a8c7a,
  metalLight: 0xc4b59a,
  vine: 0x3d7a3d,
  vineBright: 0x5cb85c,
  accent: 0xff8c00,
  textLight: 0xf5e6d3,
  textDim: 0xa89070,
};

export class GameScene extends Phaser.Scene {
  private timeManager!: TimeManager;
  private levelManager!: Level;
  private levelConfig!: LevelConfig;

  private player!: Phaser.GameObjects.Container;
  private playerBody!: Phaser.GameObjects.Graphics;
  private playerSpeed: number = 160;
  private cursorKeys!: Phaser.Types.Input.Keyboard.CursorKeys;

  private stamps: TimeStamp[] = [];
  private stampType: TimeEffectType = 'accelerate';

  private obstacles: Phaser.GameObjects.Container[] = [];
  private machines: Phaser.GameObjects.Container[] = [];
  private platforms: Phaser.GameObjects.Container[] = [];
  private targets: Map<string, { config: MachineTargetConfig; graphic: Phaser.GameObjects.Graphics; open: boolean }> = new Map();

  private score: number = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private stampCountText!: Phaser.GameObjects.Text;

  private bgGear1!: Phaser.GameObjects.Graphics;
  private bgGear2!: Phaser.GameObjects.Graphics;

  private filmOverlay!: Phaser.GameObjects.Graphics;
  private filmNoiseTimer: number = 0;
  private scratches: { x: number; y: number; len: number; angle: number }[] = [];

  private controlPanel!: Phaser.GameObjects.Container;
  private speedSlider!: Phaser.GameObjects.Graphics;
  private cooldownSlider!: Phaser.GameObjects.Graphics;
  private speedSliderValue: number = 1.0;
  private cooldownSliderValue: number = 2000;
  private draggingSlider: 'speed' | 'cooldown' | null = null;

  private goalGraphic!: Phaser.GameObjects.Graphics;
  private goalGlow!: Phaser.GameObjects.Graphics;

  private stampTypeButtons: Map<TimeEffectType, Phaser.GameObjects.Container> = new Map();
  private dragStamp: TimeStamp | null = null;
  private isDragging: boolean = false;

  private levelComplete: boolean = false;
  private levelCompleteOverlay: Phaser.GameObjects.Container | null = null;

  private camera: Phaser.Cameras.Scene2D.Camera;

  constructor() {
    super({ key: 'GameScene' });
    this.camera = null as any;
  }

  create(): void {
    this.timeManager = new TimeManager();
    this.levelManager = new Level();

    this.camera = this.cameras.main;
    this.camera.setBackgroundColor(PALETTE.bg);

    this.cursorKeys = this.input.keyboard!.createCursorKeys();
    this.input.keyboard!.addKeys('W,A,S,D,SPACE,R');

    this.createBackground();
    this.loadLevel(this.levelManager.getCurrent());

    this.createUI();
    this.createControlPanel();
    this.createStampTypeSelector();
    this.createFilmOverlay();

    this.input.on('pointerdown', this.handlePointerDown, this);
    this.input.on('pointermove', this.handlePointerMove, this);
    this.input.on('pointerup', this.handlePointerUp, this);
  }

  private createBackground(): void {
    const bg = this.add.graphics();
    bg.fillStyle(PALETTE.bg, 1);
    bg.fillRect(0, 0, 2000, 1500);

    for (let i = 0; i < 30; i++) {
      const x = Phaser.Math.Between(0, 2000);
      const y = Phaser.Math.Between(0, 1500);
      const r = Phaser.Math.Between(50, 200);
      bg.fillStyle(PALETTE.bgMid, 0.15);
      bg.fillCircle(x, y, r);
    }

    for (let i = 0; i < 50; i++) {
      const x = Phaser.Math.Between(0, 2000);
      const y = Phaser.Math.Between(0, 1500);
      const w = Phaser.Math.Between(1, 3);
      const h = Phaser.Math.Between(20, 80);
      const angle = Phaser.Math.Between(0, 360) * Math.PI / 180;
      bg.fillStyle(PALETTE.metal, 0.04);
      bg.fillRect(x, y, w, h);
    }

    this.bgGear1 = this.add.graphics();
    this.bgGear2 = this.add.graphics();
    this.drawGear(this.bgGear1, 200, 150, 120, 16, PALETTE.darkBronze, 0.08);
    this.drawGear(this.bgGear2, 800, 500, 80, 12, PALETTE.copper, 0.06);
  }

  private drawGear(g: Phaser.GameObjects.Graphics, cx: number, cy: number, radius: number, teeth: number, color: number, alpha: number): void {
    g.clear();
    g.fillStyle(color, alpha);
    g.lineStyle(2, color, alpha);

    const innerR = radius * 0.7;
    const toothH = radius * 0.2;

    g.beginPath();
    for (let i = 0; i < teeth; i++) {
      const a1 = (i / teeth) * Math.PI * 2;
      const a2 = ((i + 0.3) / teeth) * Math.PI * 2;
      const a3 = ((i + 0.5) / teeth) * Math.PI * 2;
      const a4 = ((i + 0.8) / teeth) * Math.PI * 2;

      if (i === 0) {
        g.moveTo(Math.cos(a1) * innerR, Math.sin(a1) * innerR);
      }
      g.lineTo(Math.cos(a2) * (innerR + toothH), Math.sin(a2) * (innerR + toothH));
      g.lineTo(Math.cos(a3) * (innerR + toothH), Math.sin(a3) * (innerR + toothH));
      g.lineTo(Math.cos(a4) * innerR, Math.sin(a4) * innerR);
    }
    g.closePath();
    g.fillPath();
    g.strokePath();

    g.fillStyle(PALETTE.bg, alpha + 0.1);
    g.fillCircle(cx === 0 ? 0 : 0, cy === 0 ? 0 : 0, radius * 0.2);

    g.lineStyle(1, color, alpha * 0.8);
    g.strokeCircle(0, 0, radius * 0.45);
  }

  private loadLevel(config: LevelConfig): void {
    this.levelConfig = config;
    this.stamps.forEach(s => s.destroy());
    this.stamps = [];
    this.obstacles.forEach(o => o.destroy());
    this.obstacles = [];
    this.machines.forEach(m => m.destroy());
    this.machines = [];
    this.platforms.forEach(p => p.destroy());
    this.platforms = [];
    this.targets.forEach(t => t.graphic.destroy());
    this.targets.clear();
    this.levelComplete = false;
    this.levelCompleteOverlay?.destroy();
    this.levelCompleteOverlay = null;

    this.camera.setBounds(0, 0, config.width, config.height);

    this.createPlayer(config.playerStart.x, config.playerStart.y);
    this.createObstacles(config.obstacles);
    this.createMachines(config.machines);
    this.createPlatforms(config.platforms);
    this.createTargets(config.targets);
    this.createGoal(config.goalPosition);

    this.camera.startFollow(this.player, true, 0.08, 0.08);
  }

  private createPlayer(x: number, y: number): void {
    this.player?.destroy();

    this.playerBody = this.add.graphics();
    this.drawPlayer(0);

    this.player = this.add.container(x, y, [this.playerBody]);
    this.player.setSize(24, 36);
    this.physics.world.enable(this.player);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setSize(24, 36);
  }

  private drawPlayer(frameOffset: number): void {
    this.playerBody.clear();

    this.playerBody.fillStyle(PALETTE.copper, 1);
    this.playerBody.fillRoundedRect(-12, -18, 24, 36, 4);

    this.playerBody.fillStyle(PALETTE.metalLight, 1);
    this.playerBody.fillRoundedRect(-8, -18, 16, 8, 2);

    this.playerBody.fillStyle(PALETTE.gold, 0.9);
    const eyeX = Math.sin(frameOffset * 0.1) * 2;
    this.playerBody.fillCircle(-3 + eyeX, -14, 2);
    this.playerBody.fillCircle(3 + eyeX, -14, 2);

    this.playerBody.lineStyle(1, PALETTE.bronze, 0.8);
    for (let i = 0; i < 3; i++) {
      const yy = -6 + i * 8;
      this.playerBody.strokeLineBetween(-8, yy, 8, yy);
    }

    this.playerBody.fillStyle(PALETTE.darkBronze, 1);
    this.playerBody.fillCircle(0, -8, 3);
  }

  private createObstacles(configs: ObstacleConfig[]): void {
    for (const cfg of configs) {
      const g = this.add.graphics();
      const container = this.add.container(cfg.x, cfg.y, [g]);

      if (cfg.type === 'vine') {
        this.drawVine(g, cfg.width, cfg.height, cfg.initialGrowth ?? 1);
      } else if (cfg.type === 'wall') {
        this.drawWall(g, cfg.width, cfg.height);
      } else if (cfg.type === 'gear_gate') {
        this.drawGearGate(g, cfg.width, cfg.height);
      }

      container.setSize(cfg.width, cfg.height);
      container.setData('config', cfg);
      container.setData('currentGrowth', cfg.initialGrowth ?? 1);

      this.obstacles.push(container);
    }
  }

  private drawVine(g: Phaser.GameObjects.Graphics, w: number, h: number, growth: number): void {
    g.clear();
    const scale = Math.min(growth, 3);
    const dh = h * scale;
    const dw = w * (1 + (scale - 1) * 0.3);

    g.fillStyle(PALETTE.vine, 0.7);
    g.fillRoundedRect(-dw / 2, -dh / 2, dw, dh, 6);

    g.fillStyle(PALETTE.vineBright, 0.5);
    for (let i = 0; i < 5 * scale; i++) {
      const lx = Phaser.Math.Between(-dw / 2 + 4, dw / 2 - 4);
      const ly = Phaser.Math.Between(-dh / 2 + 4, dh / 2 - 4);
      g.fillCircle(lx, ly, 3 + Math.random() * 4);
    }

    g.lineStyle(2, PALETTE.vineBright, 0.4);
    g.strokeRoundedRect(-dw / 2, -dh / 2, dw, dh, 6);
  }

  private drawWall(g: Phaser.GameObjects.Graphics, w: number, h: number): void {
    g.clear();

    g.fillStyle(PALETTE.warmBrown, 1);
    g.fillRect(-w / 2, -h / 2, w, h);

    g.lineStyle(1, PALETTE.metal, 0.3);
    const brickH = 12;
    const brickW = w;
    for (let row = 0; row < Math.ceil(h / brickH); row++) {
      const y = -h / 2 + row * brickH;
      g.strokeLineBetween(-w / 2, y, w / 2, y);
      const offsetX = row % 2 === 0 ? 0 : w / 2;
      g.strokeLineBetween(-w / 2 + offsetX, y, -w / 2 + offsetX, y + brickH);
    }

    g.lineStyle(2, PALETTE.metalLight, 0.2);
    for (let i = 0; i < 5; i++) {
      const sx = Phaser.Math.Between(-w / 2, w / 2);
      const sy = Phaser.Math.Between(-h / 2, h / 2);
      g.strokeLineBetween(sx, sy, sx + 3, sy + Phaser.Math.Between(5, 20));
    }

    g.lineStyle(1, PALETTE.bronze, 0.5);
    g.strokeRect(-w / 2, -h / 2, w, h);
  }

  private drawGearGate(g: Phaser.GameObjects.Graphics, w: number, h: number): void {
    g.clear();

    g.fillStyle(PALETTE.metal, 0.8);
    g.fillRect(-w / 2, -h / 2, w, h);

    g.lineStyle(1, PALETTE.metalLight, 0.4);
    g.strokeRect(-w / 2, -h / 2, w, h);

    const cx = 0;
    const cy = 0;
    const r = Math.min(w, h) * 0.35;
    g.fillStyle(PALETTE.darkBronze, 0.9);
    g.fillCircle(cx, cy, r);
    g.lineStyle(2, PALETTE.bronze, 0.8);
    g.strokeCircle(cx, cy, r);

    const teeth = 8;
    for (let i = 0; i < teeth; i++) {
      const angle = (i / teeth) * Math.PI * 2;
      const x1 = Math.cos(angle) * r * 0.8;
      const y1 = Math.sin(angle) * r * 0.8;
      const x2 = Math.cos(angle) * r;
      const y2 = Math.sin(angle) * r;
      g.lineStyle(3, PALETTE.bronze, 0.6);
      g.strokeLineBetween(cx + x1, cy + y1, cx + x2, cy + y2);
    }

    g.fillStyle(PALETTE.gold, 0.6);
    g.fillCircle(cx, cy, r * 0.2);
  }

  private createMachines(configs: MachineConfig[]): void {
    for (const cfg of configs) {
      const g = this.add.graphics();
      const label = this.add.text(0, -30, cfg.type.toUpperCase(), {
        fontSize: '10px',
        color: '#d4a574',
        fontFamily: 'monospace',
      }).setOrigin(0.5);

      const container = this.add.container(cfg.x, cfg.y, [g, label]);
      container.setSize(40, 40);
      container.setData('config', { ...cfg });
      container.setData('activationProgress', 0);
      container.setData('activated', false);

      this.drawMachine(g, cfg.type, false, 0);
      this.machines.push(container);
    }
  }

  private drawMachine(g: Phaser.GameObjects.Graphics, type: string, activated: boolean, progress: number): void {
    g.clear();

    const baseColor = activated ? PALETTE.gold : PALETTE.copper;
    const alpha = activated ? 1 : 0.8;

    if (type === 'lever') {
      g.fillStyle(PALETTE.metal, alpha);
      g.fillRoundedRect(-20, -15, 40, 30, 4);
      g.lineStyle(2, baseColor, alpha);
      g.strokeRoundedRect(-20, -15, 40, 30, 4);

      const leverAngle = activated ? -0.6 : 0.6;
      g.lineStyle(4, PALETTE.bronze, 1);
      g.beginPath();
      g.moveTo(0, 5);
      g.lineTo(Math.sin(leverAngle) * 18, 5 - Math.cos(leverAngle) * 18);
      g.strokePath();

      g.fillStyle(baseColor, 1);
      g.fillCircle(Math.sin(leverAngle) * 18, 5 - Math.cos(leverAngle) * 18, 5);
    } else if (type === 'button') {
      g.fillStyle(PALETTE.metal, alpha);
      g.fillCircle(0, 0, 18);
      g.lineStyle(2, baseColor, alpha);
      g.strokeCircle(0, 0, 18);

      const btnScale = activated ? 0.6 : 1;
      g.fillStyle(baseColor, 1);
      g.fillCircle(0, 0, 10 * btnScale);
    } else if (type === 'valve') {
      g.fillStyle(PALETTE.metal, alpha);
      g.fillCircle(0, 0, 18);
      g.lineStyle(2, baseColor, alpha);
      g.strokeCircle(0, 0, 18);

      const valveAngle = activated ? Math.PI / 4 : 0;
      g.lineStyle(3, PALETTE.bronze, 1);
      g.beginPath();
      g.moveTo(Math.cos(valveAngle) * -12, Math.sin(valveAngle) * -12);
      g.lineTo(Math.cos(valveAngle) * 12, Math.sin(valveAngle) * 12);
      g.strokePath();
      g.beginPath();
      g.moveTo(Math.cos(valveAngle + Math.PI / 2) * -12, Math.sin(valveAngle + Math.PI / 2) * -12);
      g.lineTo(Math.cos(valveAngle + Math.PI / 2) * 12, Math.sin(valveAngle + Math.PI / 2) * 12);
      g.strokePath();
    }

    if (progress > 0 && !activated) {
      g.fillStyle(PALETTE.accent, 0.6);
      g.slice(0, 0, 22, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2, false);
      g.fillPath();
    }
  }

  private createPlatforms(configs: PlatformConfig[]): void {
    for (const cfg of configs) {
      const g = this.add.graphics();
      this.drawPlatform(g, cfg.width, cfg.height);

      const container = this.add.container(cfg.x, cfg.y, [g]);
      container.setSize(cfg.width, cfg.height);
      container.setData('config', cfg);
      container.setData('phase', 0);

      this.platforms.push(container);
    }
  }

  private drawPlatform(g: Phaser.GameObjects.Graphics, w: number, h: number): void {
    g.clear();
    g.fillStyle(PALETTE.metal, 0.9);
    g.fillRect(-w / 2, -h / 2, w, h);

    g.lineStyle(1, PALETTE.metalLight, 0.4);
    const rivets = Math.floor(w / 20);
    for (let i = 0; i <= rivets; i++) {
      const rx = -w / 2 + 8 + i * (w - 16) / rivets;
      g.fillStyle(PALETTE.darkBronze, 0.8);
      g.fillCircle(rx, 0, 2);
    }

    g.lineStyle(1, PALETTE.bronze, 0.5);
    g.strokeRect(-w / 2, -h / 2, w, h);

    g.lineStyle(1, PALETTE.metalLight, 0.15);
    for (let i = 0; i < 3; i++) {
      const lx = Phaser.Math.Between(-w / 2 + 2, w / 2 - 2);
      g.strokeLineBetween(lx, -h / 2, lx + 2, h / 2);
    }
  }

  private createTargets(configs: MachineTargetConfig[]): void {
    for (const cfg of configs) {
      const g = this.add.graphics();
      this.drawTarget(g, cfg, false);
      g.setPosition(cfg.x, cfg.y);
      this.targets.set(cfg.id, { config: cfg, graphic: g, open: false });
    }
  }

  private drawTarget(g: Phaser.GameObjects.Graphics, cfg: MachineTargetConfig, open: boolean): void {
    g.clear();
    const alpha = open ? 0.2 : 0.9;

    if (cfg.type === 'door') {
      g.fillStyle(PALETTE.warmBrown, alpha);
      g.fillRect(-cfg.width / 2, -cfg.height / 2, cfg.width, cfg.height);
      g.lineStyle(2, PALETTE.bronze, alpha);
      g.strokeRect(-cfg.width / 2, -cfg.height / 2, cfg.width, cfg.height);
      if (!open) {
        g.fillStyle(PALETTE.darkBronze, 1);
        g.fillCircle(cfg.width / 4, 0, 3);
      }
    } else if (cfg.type === 'bridge') {
      g.fillStyle(PALETTE.metal, alpha);
      g.fillRect(-cfg.width / 2, -cfg.height / 2, cfg.width, cfg.height);
      g.lineStyle(1, PALETTE.bronze, alpha);
      g.strokeRect(-cfg.width / 2, -cfg.height / 2, cfg.width, cfg.height);
    } else if (cfg.type === 'elevator') {
      g.fillStyle(PALETTE.copper, alpha);
      g.fillRect(-cfg.width / 2, -cfg.height / 2, cfg.width, cfg.height);
      g.lineStyle(1, PALETTE.gold, alpha);
      g.strokeRect(-cfg.width / 2, -cfg.height / 2, cfg.width, cfg.height);
    }
  }

  private createGoal(pos: { x: number; y: number }): void {
    this.goalGraphic = this.add.graphics();
    this.goalGlow = this.add.graphics();
    this.drawGoal(pos);
  }

  private drawGoal(pos: { x: number; y: number }): void {
    this.goalGraphic.clear();
    this.goalGlow.clear();

    this.goalGlow.fillStyle(PALETTE.gold, 0.1);
    this.goalGlow.fillCircle(pos.x, pos.y, 50);

    this.goalGraphic.fillStyle(PALETTE.gold, 0.3);
    this.goalGraphic.fillCircle(pos.x, pos.y, 30);

    this.goalGraphic.lineStyle(3, PALETTE.gold, 0.8);
    this.goalGraphic.strokeCircle(pos.x, pos.y, 30);

    this.goalGraphic.fillStyle(PALETTE.gold, 0.9);
    this.goalGraphic.fillCircle(pos.x, pos.y, 8);

    const star = this.drawStar(pos.x, pos.y, 5, 20, 10);
    this.goalGraphic.fillStyle(PALETTE.gold, 0.5);
    this.goalGraphic.fillPoints(star, true);
  }

  private drawStar(cx: number, cy: number, points: number, outerR: number, innerR: number): Phaser.Geom.Point[] {
    const result: Phaser.Geom.Point[] = [];
    for (let i = 0; i < points * 2; i++) {
      const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? outerR : innerR;
      result.push(new Phaser.Geom.Point(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r));
    }
    return result;
  }

  private createUI(): void {
    const uiContainer = this.add.container(0, 0);
    uiContainer.setScrollFactor(0);
    uiContainer.setDepth(100);

    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x0d0904, 0.75);
    panelBg.fillRoundedRect(10, 10, 220, 70, 8);
    panelBg.lineStyle(1, PALETTE.bronze, 0.4);
    panelBg.strokeRoundedRect(10, 10, 220, 70, 8);

    this.levelText = this.add.text(20, 18, '', {
      fontSize: '16px',
      color: '#d4a574',
      fontFamily: 'monospace',
    });

    this.scoreText = this.add.text(20, 40, '', {
      fontSize: '14px',
      color: '#ffd700',
      fontFamily: 'monospace',
    });

    this.stampCountText = this.add.text(20, 58, '', {
      fontSize: '12px',
      color: '#a89070',
      fontFamily: 'monospace',
    });

    uiContainer.add([panelBg, this.levelText, this.scoreText, this.stampCountText]);
  }

  private createControlPanel(): void {
    this.controlPanel = this.add.container(GAME_W, GAME_H);
    this.controlPanel.setScrollFactor(0);
    this.controlPanel.setDepth(100);

    const panelW = 200;
    const panelH = 160;
    const px = -panelW - 15;
    const py = -panelH - 15;

    const bg = this.add.graphics();
    bg.fillStyle(0x1a1008, 0.7);
    bg.fillRoundedRect(px, py, panelW, panelH, 10);
    bg.lineStyle(1, PALETTE.bronze, 0.3);
    bg.strokeRoundedRect(px, py, panelW, panelH, 10);

    bg.fillStyle(0x2d1f0e, 0.4);
    for (let i = 0; i < panelW; i += 4) {
      for (let j = 0; j < panelH; j += 4) {
        if (Math.random() < 0.1) {
          bg.fillStyle(0x2d1f0e, Math.random() * 0.3);
          bg.fillRect(px + i, py + j, 3, 3);
        }
      }
    }

    const speedLabel = this.add.text(px + 10, py + 10, '时间流速', {
      fontSize: '12px',
      color: '#d4a574',
      fontFamily: 'monospace',
    });

    this.speedSlider = this.add.graphics();
    this.drawSlider(this.speedSlider, px + 10, py + 30, 180, this.speedSliderValue, 0.1, 3.0);

    const cooldownLabel = this.add.text(px + 10, py + 60, '印记冷却', {
      fontSize: '12px',
      color: '#d4a574',
      fontFamily: 'monospace',
    });

    this.cooldownSlider = this.add.graphics();
    this.drawSlider(this.cooldownSlider, px + 10, py + 80, 180, this.cooldownSliderValue, 500, 10000);

    const resetBtn = this.add.text(px + 60, py + 120, '↺ 重置关卡', {
      fontSize: '14px',
      color: '#ff8c00',
      fontFamily: 'monospace',
      backgroundColor: '#2d1f0e',
      padding: { x: 8, y: 4 },
    }).setInteractive({ useHandCursor: true });

    resetBtn.on('pointerover', () => resetBtn.setColor('#ffd700'));
    resetBtn.on('pointerout', () => resetBtn.setColor('#ff8c00'));
    resetBtn.on('pointerdown', () => this.resetLevel());

    this.controlPanel.add([bg, speedLabel, this.speedSlider, cooldownLabel, this.cooldownSlider, resetBtn]);

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const localX = pointer.x - (this.controlPanel.x + px);
      const localY = pointer.y - (this.controlPanel.y + py);

      if (localX >= 10 && localX <= 190) {
        if (localY >= 25 && localY <= 50) {
          this.draggingSlider = 'speed';
        } else if (localY >= 75 && localY <= 100) {
          this.draggingSlider = 'cooldown';
        }
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.draggingSlider) return;
      const localX = pointer.x - (this.controlPanel.x + px + 10);
      const ratio = Phaser.Math.Clamp(localX / 180, 0, 1);

      if (this.draggingSlider === 'speed') {
        this.speedSliderValue = 0.1 + ratio * 2.9;
        this.timeManager.setGlobalSpeed(this.speedSliderValue);
        this.drawSlider(this.speedSlider, px + 10, py + 30, 180, this.speedSliderValue, 0.1, 3.0);
      } else {
        this.cooldownSliderValue = 500 + ratio * 9500;
        this.timeManager.setCooldownTime(this.cooldownSliderValue);
        this.drawSlider(this.cooldownSlider, px + 10, py + 80, 180, this.cooldownSliderValue, 500, 10000);
      }
    });

    this.input.on('pointerup', () => {
      this.draggingSlider = null;
    });
  }

  private drawSlider(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, value: number, min: number, max: number): void {
    g.clear();
    const ratio = (value - min) / (max - min);

    g.fillStyle(0x2d1f0e, 0.8);
    g.fillRoundedRect(x, y, w, 14, 7);

    g.fillStyle(PALETTE.bronze, 0.6);
    g.fillRoundedRect(x, y, w * ratio, 14, 7);

    g.fillStyle(PALETTE.gold, 1);
    g.fillCircle(x + w * ratio, y + 7, 8);
    g.lineStyle(1, PALETTE.bronze, 0.8);
    g.strokeCircle(x + w * ratio, y + 7, 8);

    const displayVal = max > 1000 ? `${(value / 1000).toFixed(1)}s` : value.toFixed(1) + 'x';
    g.destroy();
    const parent = g.parent;
    if (parent) {
      const valText = this.add.text(x + w + 8, y - 2, displayVal, {
        fontSize: '10px',
        color: '#a89070',
        fontFamily: 'monospace',
      });
      (this.controlPanel as any).add(valText);
    }
  }

  private createStampTypeSelector(): void {
    const types: TimeEffectType[] = ['accelerate', 'decelerate', 'reverse'];
    const labels: Record<TimeEffectType, string> = { accelerate: '加速 ▶▶', decelerate: '减速 ◀◀', reverse: '倒流 ◀▶' };
    const colors: Record<TimeEffectType, number> = { accelerate: 0xffd700, decelerate: 0x4a90d9, reverse: 0x9b59b6 };

    const container = this.add.container(GAME_W / 2, GAME_H - 20);
    container.setScrollFactor(0);
    container.setDepth(100);

    const bg = this.add.graphics();
    bg.fillStyle(0x1a1008, 0.7);
    bg.fillRoundedRect(-160, -30, 320, 50, 8);
    bg.lineStyle(1, PALETTE.bronze, 0.3);
    bg.strokeRoundedRect(-160, -30, 320, 50, 8);
    container.add(bg);

    for (let i = 0; i < types.length; i++) {
      const t = types[i];
      const bx = -120 + i * 110;
      const btn = this.add.container(bx, 0);

      const btnBg = this.add.graphics();
      const isSelected = t === this.stampType;
      this.drawStampButton(btnBg, colors[t], isSelected);
      btn.add(btnBg);

      const txt = this.add.text(0, 0, labels[t], {
        fontSize: '12px',
        color: isSelected ? '#fff' : '#a89070',
        fontFamily: 'monospace',
      }).setOrigin(0.5);
      btn.add(txt);

      btn.setSize(100, 36);
      btn.setInteractive(new Phaser.Geom.Rectangle(-50, -18, 100, 36), Phaser.Geom.Rectangle.Contains);

      btn.on('pointerdown', () => {
        this.stampType = t;
        this.stampTypeButtons.forEach((b, key) => {
          const bgG = b.getAt(0) as Phaser.GameObjects.Graphics;
          this.drawStampButton(bgG, colors[key], key === t);
          const tObj = b.getAt(1) as Phaser.GameObjects.Text;
          tObj.setColor(key === t ? '#fff' : '#a89070');
        });
      });

      this.stampTypeButtons.set(t, btn);
      container.add(btn);
    }
  }

  private drawStampButton(g: Phaser.GameObjects.Graphics, color: number, selected: boolean): void {
    g.clear();
    g.fillStyle(color, selected ? 0.4 : 0.1);
    g.fillRoundedRect(-50, -18, 100, 36, 6);
    g.lineStyle(selected ? 2 : 1, color, selected ? 1 : 0.5);
    g.strokeRoundedRect(-50, -18, 100, 36, 6);
  }

  private createFilmOverlay(): void {
    this.filmOverlay = this.add.graphics();
    this.filmOverlay.setScrollFactor(0);
    this.filmOverlay.setDepth(99);
    this.filmOverlay.setAlpha(0);
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.levelComplete) return;
    if (this.draggingSlider) return;

    const worldPoint = this.camera.getWorldPoint(pointer.x, pointer.y);

    const uiBounds = {
      x: GAME_W - 230,
      y: GAME_H - 190,
      w: 230,
      h: 190,
    };
    if (pointer.x >= uiBounds.x && pointer.x <= uiBounds.x + uiBounds.w &&
        pointer.y >= uiBounds.y && pointer.y <= uiBounds.y + uiBounds.h) {
      return;
    }

    if (pointer.y >= GAME_H - 60) {
      return;
    }

    const key = `stamp_${Math.floor(worldPoint.x)}_${Math.floor(worldPoint.y)}`;
    if (!this.timeManager.canPlace(key)) return;
    if (this.stamps.length >= this.levelConfig.maxStamps) return;

    const stampConfig: TimeStampConfig = {
      x: worldPoint.x,
      y: worldPoint.y,
      type: this.stampType,
      radius: 100,
      duration: 8000,
      strength: 2.0,
    };

    const stamp = new TimeStamp(this, stampConfig);
    stamp.playPlacementAnimation();
    stamp.setOnExpire((s) => {
      const idx = this.stamps.indexOf(s);
      if (idx >= 0) this.stamps.splice(idx, 1);
    });

    this.stamps.push(stamp);
    this.timeManager.recordPlacement(key);
    this.isDragging = true;
    this.dragStamp = stamp;

    this.score += 10;
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.isDragging || !this.dragStamp) return;

    const worldPoint = this.camera.getWorldPoint(pointer.x, pointer.y);
    this.dragStamp.setPosition(worldPoint.x, worldPoint.y);
  }

  private handlePointerUp(): void {
    this.isDragging = false;
    this.dragStamp = null;
  }

  private resetLevel(): void {
    this.stamps.forEach(s => s.destroy());
    this.stamps = [];
    this.score = Math.max(0, this.score - 50);
    this.loadLevel(this.levelManager.getCurrent());
  }

  update(_time: number, delta: number): void {
    if (this.levelComplete) return;

    const dt = delta / 1000;

    this.timeManager.update(delta);

    this.updatePlayerMovement(dt);
    this.updateObstacles(dt);
    this.updatePlatforms(dt);
    this.updateMachines(dt);
    this.updateStamps(delta);
    this.updateBackgroundGears(dt);
    this.updateFilmEffect(dt);
    this.updateGoalCheck();
    this.updateUIText();
  }

  private updatePlayerMovement(dt: number): void {
    if (!this.player) return;

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    let vx = 0;
    let vy = 0;

    const leftKey = this.cursorKeys.left?.isDown || (this.input.keyboard as any).A?.isDown;
    const rightKey = this.cursorKeys.right?.isDown || (this.input.keyboard as any).D?.isDown;
    const upKey = this.cursorKeys.up?.isDown || (this.input.keyboard as any).W?.isDown;
    const downKey = this.cursorKeys.down?.isDown || (this.input.keyboard as any).S?.isDown;

    if (leftKey) vx -= 1;
    if (rightKey) vx += 1;
    if (upKey) vy -= 1;
    if (downKey) vy += 1;

    if (vx !== 0 || vy !== 0) {
      const len = Math.sqrt(vx * vx + vy * vy);
      vx /= len;
      vy /= len;
    }

    const localSpeed = this.timeManager.getLocalSpeed(this.player.x, this.player.y);
    const speed = this.playerSpeed * localSpeed;

    body.setVelocity(vx * speed, vy * speed);

    this.drawPlayer(_time * 0.003);
  }

  private updateObstacles(dt: number): void {
    for (const container of this.obstacles) {
      const cfg = container.getData('config') as ObstacleConfig;
      let growth = container.getData('currentGrowth') as number;

      if (cfg.type === 'vine' && cfg.growthRate) {
        const localSpeed = this.timeManager.getLocalSpeed(container.x, container.y);
        growth += cfg.growthRate * dt * localSpeed;
        growth = Phaser.Math.Clamp(growth, 0, cfg.maxGrowth ?? 3);
        container.setData('currentGrowth', growth);

        const g = container.getAt(0) as Phaser.GameObjects.Graphics;
        this.drawVine(g, cfg.width, cfg.height, growth);
      }
    }
  }

  private updatePlatforms(dt: number): void {
    for (const container of this.platforms) {
      const cfg = container.getData('config') as PlatformConfig;
      let phase = container.getData('phase') as number;

      const localSpeed = this.timeManager.getLocalSpeed(container.x, container.y);
      phase += (dt * localSpeed) / (cfg.period / 1000);
      container.setData('phase', phase);

      const t = (Math.sin(phase * Math.PI * 2) + 1) / 2;
      const x = cfg.startX + (cfg.endX - cfg.startX) * t;
      const y = cfg.startY + (cfg.endY - cfg.startY) * t;
      container.setPosition(x, y);
    }
  }

  private updateMachines(dt: number): void {
    for (const container of this.machines) {
      const cfg = container.getData('config') as MachineConfig;
      if (cfg.activated) continue;

      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, container.x, container.y);
      if (dist > 50) {
        container.setData('activationProgress', 0);
        continue;
      }

      const localSpeed = this.timeManager.getLocalSpeed(container.x, container.y);

      let progress = container.getData('activationProgress') as number;
      const isUnderCorrectEffect = this.isUnderEffect(container.x, container.y, cfg.requiresTimeEffect);

      if (isUnderCorrectEffect && dist <= 50) {
        progress += (dt * 1000 * Math.abs(localSpeed)) / cfg.activationDuration;
      }

      progress = Phaser.Math.Clamp(progress, 0, 1);
      container.setData('activationProgress', progress);

      const g = container.getAt(0) as Phaser.GameObjects.Graphics;
      this.drawMachine(g, cfg.type, false, progress);

      if (progress >= 1) {
        cfg.activated = true;
        container.setData('activated', true);
        container.setData('activationProgress', 1);
        this.drawMachine(g, cfg.type, true, 1);
        this.activateTarget(cfg.targetId);
        this.score += 100;
      }
    }
  }

  private isUnderEffect(x: number, y: number, type: TimeEffectType): boolean {
    for (const stamp of this.stamps) {
      const dist = Phaser.Math.Distance.Between(x, y, stamp.x, stamp.y);
      if (dist <= stamp.getEffectRadius() && stamp.getType() === type) {
        return true;
      }
    }
    return false;
  }

  private activateTarget(targetId: string): void {
    const target = this.targets.get(targetId);
    if (!target) return;

    target.open = true;
    this.drawTarget(target.graphic, target.config, true);
  }

  private updateStamps(delta: number): void {
    this.timeManager.update(delta);

    for (const stamp of this.stamps) {
      stamp.updateStamp(delta);
    }
  }

  private updateBackgroundGears(dt: number): void {
    const speed = this.timeManager.globalTimeSpeed;

    this.bgGear1.rotation += dt * 0.15 * speed;
    this.bgGear2.rotation -= dt * 0.2 * speed;
  }

  private updateFilmEffect(dt: number): void {
    let anyReversed = false;

    if (this.player) {
      anyReversed = this.timeManager.isReversedAt(this.player.x, this.player.y);
    }

    if (!anyReversed) {
      for (const stamp of this.stamps) {
        if (stamp.getType() === 'reverse') {
          anyReversed = true;
          break;
        }
      }
    }

    const targetAlpha = anyReversed ? 0.35 : 0;
    const currentAlpha = this.filmOverlay.alpha;
    this.filmOverlay.setAlpha(Phaser.Math.Linear(currentAlpha, targetAlpha, dt * 3));

    if (anyReversed) {
      this.filmNoiseTimer += dt;
      this.filmOverlay.clear();

      if (this.filmNoiseTimer > 0.05) {
        this.filmNoiseTimer = 0;
        this.scratches = [];
        const scratchCount = Phaser.Math.Between(1, 4);
        for (let i = 0; i < scratchCount; i++) {
          this.scratches.push({
            x: Phaser.Math.Between(0, GAME_W),
            y: Phaser.Math.Between(0, GAME_H),
            len: Phaser.Math.Between(50, 200),
            angle: Phaser.Math.Between(-30, 30) * Math.PI / 180,
          });
        }
      }

      this.filmOverlay.fillStyle(0x000000, 0.1);
      for (let i = 0; i < 30; i++) {
        const nx = Phaser.Math.Between(0, GAME_W);
        const ny = Phaser.Math.Between(0, GAME_H);
        const ns = Phaser.Math.Between(1, 3);
        this.filmOverlay.fillRect(nx, ny, ns, ns);
      }

      this.filmOverlay.lineStyle(1, 0xffffff, 0.15);
      for (const s of this.scratches) {
        this.filmOverlay.beginPath();
        this.filmOverlay.moveTo(s.x, s.y);
        this.filmOverlay.lineTo(
          s.x + Math.cos(s.angle) * s.len,
          s.y + Math.sin(s.angle) * s.len
        );
        this.filmOverlay.strokePath();
      }

      if (Math.random() < 0.05) {
        this.filmOverlay.fillStyle(0x000000, 0.3);
        this.filmOverlay.fillRect(0, Phaser.Math.Between(0, GAME_H), GAME_W, Phaser.Math.Between(2, 8));
      }
    }
  }

  private updateGoalCheck(): void {
    if (!this.player || this.levelComplete) return;

    const dist = Phaser.Math.Distance.Between(
      this.player.x, this.player.y,
      this.levelConfig.goalPosition.x, this.levelConfig.goalPosition.y
    );

    if (dist < 40) {
      this.onLevelComplete();
    }
  }

  private onLevelComplete(): void {
    this.levelComplete = true;
    this.score += 500;

    this.levelCompleteOverlay = this.add.container(GAME_W / 2, GAME_H / 2);
    this.levelCompleteOverlay.setScrollFactor(0);
    this.levelCompleteOverlay.setDepth(200);

    const bg = this.add.graphics();
    bg.fillStyle(0x0d0904, 0.8);
    bg.fillRoundedRect(-180, -80, 360, 160, 12);
    bg.lineStyle(2, PALETTE.gold, 0.6);
    bg.strokeRoundedRect(-180, -80, 360, 160, 12);

    const title = this.add.text(0, -50, this.levelManager.isLast() ? '🎉 全部通关！' : '✦ 关卡完成 ✦', {
      fontSize: '24px',
      color: '#ffd700',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    const scoreTxt = this.add.text(0, -10, `得分: ${this.score}`, {
      fontSize: '18px',
      color: '#d4a574',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    const nextText = this.levelManager.isLast() ? '重新开始' : '下一关 ▶';
    const nextBtn = this.add.text(0, 35, nextText, {
      fontSize: '16px',
      color: '#ff8c00',
      fontFamily: 'monospace',
      backgroundColor: '#2d1f0e',
      padding: { x: 16, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    nextBtn.on('pointerover', () => nextBtn.setColor('#ffd700'));
    nextBtn.on('pointerout', () => nextBtn.setColor('#ff8c00'));
    nextBtn.on('pointerdown', () => {
      if (this.levelManager.isLast()) {
        this.levelManager.reset();
        this.score = 0;
      } else {
        this.levelManager.advance();
      }
      this.loadLevel(this.levelManager.getCurrent());
    });

    this.levelCompleteOverlay.add([bg, title, scoreTxt, nextBtn]);
    this.levelCompleteOverlay.setScale(0);
    this.tweens.add({
      targets: this.levelCompleteOverlay,
      scaleX: 1,
      scaleY: 1,
      duration: 400,
      ease: 'Back.easeOut',
    });
  }

  private updateUIText(): void {
    const cfg = this.levelConfig;
    this.levelText.setText(`关卡 ${cfg.id}: ${cfg.name}`);
    this.scoreText.setText(`得分: ${this.score}`);
    this.stampCountText.setText(`印记: ${this.stamps.length}/${cfg.maxStamps}`);
  }
}
