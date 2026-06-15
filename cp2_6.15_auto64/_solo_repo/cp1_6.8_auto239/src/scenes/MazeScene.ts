import Phaser from 'phaser';
import { Player } from '../objects/Player';
import { LEVELS, LevelConfig } from '../utils/levelData';

export class MazeScene extends Phaser.Scene {
  currentLevel: number;
  levelConfig: LevelConfig | null;
  player: Player | null;
  wallRects: Phaser.Geom.Rectangle[];
  footbridgeRects: Phaser.Geom.Rectangle[];
  graphics: Phaser.GameObjects.Graphics | null;
  wallObjects: Phaser.GameObjects.Rectangle[];
  gapObjects: Phaser.GameObjects.Rectangle[];
  goalObject: Phaser.GameObjects.Arc | null;
  goalGlow: Phaser.GameObjects.Arc | null;
  prismObjects: { graphics: Phaser.GameObjects.Graphics; config: LevelConfig['prisms'][0]; angle: number }[];
  pulseOrbObjects: { graphics: Phaser.GameObjects.Graphics; config: LevelConfig['pulseOrbs'][0] }[];
  levelText: Phaser.GameObjects.Text | null;
  stepsText: Phaser.GameObjects.Text | null;
  fadeOverlay: Phaser.GameObjects.Rectangle | null;
  panelBg: Phaser.GameObjects.Rectangle | null;
  resetBtn: Phaser.GameObjects.Text | null;
  durationSlider: Phaser.GameObjects.Rectangle | null;
  durationKnob: Phaser.GameObjects.Arc | null;
  speedSlider: Phaser.GameObjects.Rectangle | null;
  speedKnob: Phaser.GameObjects.Arc | null;
  durationLabel: Phaser.GameObjects.Text | null;
  speedLabel: Phaser.GameObjects.Text | null;
  durationValue: number;
  speedValue: number;
  isDraggingDuration: boolean;
  isDraggingSpeed: boolean;
  panelBaseX: number;
  panelBaseY: number;
  levelComplete: boolean;
  goalPulse: number;

  constructor() {
    super({ key: 'MazeScene' });
    this.currentLevel = 0;
    this.levelConfig = null;
    this.player = null;
    this.wallRects = [];
    this.footbridgeRects = [];
    this.graphics = null;
    this.wallObjects = [];
    this.gapObjects = [];
    this.goalObject = null;
    this.goalGlow = null;
    this.prismObjects = [];
    this.pulseOrbObjects = [];
    this.levelText = null;
    this.stepsText = null;
    this.fadeOverlay = null;
    this.panelBg = null;
    this.resetBtn = null;
    this.durationSlider = null;
    this.durationKnob = null;
    this.speedSlider = null;
    this.speedKnob = null;
    this.durationLabel = null;
    this.speedLabel = null;
    this.durationValue = 0.5;
    this.speedValue = 0.5;
    this.isDraggingDuration = false;
    this.isDraggingSpeed = false;
    this.panelBaseX = 0;
    this.panelBaseY = 0;
    this.levelComplete = false;
    this.goalPulse = 0;
  }

  create() {
    this.loadLevel(this.currentLevel);
  }

  loadLevel(levelIndex: number) {
    this.levelComplete = false;
    this.goalPulse = 0;

    if (levelIndex >= LEVELS.length) {
      this.showVictory();
      return;
    }

    this.cleanup();

    this.levelConfig = LEVELS[levelIndex];
    const cfg = this.levelConfig!;

    this.cameras.main.setBackgroundColor('#000000');

    this.graphics = this.add.graphics();
    this.graphics.setDepth(1);

    this.wallRects = [];
    this.wallObjects = [];

    for (const wall of cfg.walls) {
      const rect = this.add.rectangle(
        wall.x + wall.w / 2,
        wall.y + wall.h / 2,
        wall.w,
        wall.h,
        cfg.colorTheme.main,
        0.6
      );
      rect.setDepth(2);
      rect.setStrokeStyle(1, cfg.colorTheme.glow, 0.4);
      this.wallObjects.push(rect);
      this.wallRects.push(new Phaser.Geom.Rectangle(wall.x, wall.y, wall.w, wall.h));
    }

    this.footbridgeRects = [];
    this.gapObjects = [];

    for (const gap of cfg.gaps) {
      const gapRect = this.add.rectangle(
        gap.x + gap.w / 2,
        gap.y + gap.h / 2,
        gap.w,
        gap.h,
        0x000000,
        1
      );
      gapRect.setDepth(2);
      gapRect.setStrokeStyle(1, 0x333333, 0.5);
      this.gapObjects.push(gapRect);

      if (!gap.needsFootbridge) {
        this.footbridgeRects.push(new Phaser.Geom.Rectangle(gap.x, gap.y, gap.w, gap.h));
      }
    }

    this.prismObjects = [];
    for (const prism of cfg.prisms) {
      const g = this.add.graphics();
      g.setDepth(3);
      this.prismObjects.push({ graphics: g, config: prism, angle: 0 });
    }

    this.pulseOrbObjects = [];
    for (const orb of cfg.pulseOrbs) {
      const g = this.add.graphics();
      g.setDepth(3);
      this.pulseOrbObjects.push({ graphics: g, config: orb });
    }

    this.goalGlow = this.add.circle(cfg.goal.x, cfg.goal.y, 24, cfg.colorTheme.glow, 0.2);
    this.goalGlow.setDepth(4);
    this.goalObject = this.add.circle(cfg.goal.x, cfg.goal.y, 16, cfg.colorTheme.glow, 0.7);
    this.goalObject.setDepth(4);
    this.add.circle(cfg.goal.x, cfg.goal.y, 8, 0xffffff, 0.5).setDepth(4);

    this.player = new Player(this, cfg.playerStart.x, cfg.playerStart.y, cfg.colorTheme);

    this.createUI(cfg);

    this.fadeOverlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 1);
    this.fadeOverlay.setDepth(100);
    this.tweens.add({
      targets: this.fadeOverlay,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
      onComplete: () => {
        this.fadeOverlay!.setVisible(false);
      },
    });

    this.setupInput();
  }

  createUI(cfg: LevelConfig) {
    this.levelText = this.add.text(20, 16, `关卡 ${cfg.level}`, {
      fontSize: '20px',
      fontFamily: 'sans-serif',
      color: `#${cfg.colorTheme.glow.toString(16).padStart(6, '0')}`,
    });
    this.levelText.setDepth(50);

    this.stepsText = this.add.text(20, 42, `步数: 0`, {
      fontSize: '16px',
      fontFamily: 'sans-serif',
      color: '#aaaaaa',
    });
    this.stepsText.setDepth(50);

    this.panelBaseX = 590;
    this.panelBaseY = 460;

    this.panelBg = this.add.rectangle(this.panelBaseX + 90, this.panelBaseY + 55, 200, 120, 0x111122, 0.6);
    this.panelBg.setDepth(48);
    this.panelBg.setStrokeStyle(1, 0x334466, 0.3);

    this.resetBtn = this.add.text(this.panelBaseX + 90, this.panelBaseY + 12, '重置关卡', {
      fontSize: '14px',
      fontFamily: 'sans-serif',
      color: '#cccccc',
      backgroundColor: '#222244',
      padding: { x: 12, y: 6 },
    });
    this.resetBtn.setOrigin(0.5);
    this.resetBtn.setDepth(50);
    this.resetBtn.setInteractive({ useHandCursor: true });
    this.resetBtn.on('pointerdown', () => {
      this.resetLevel();
    });

    this.durationLabel = this.add.text(this.panelBaseX + 10, this.panelBaseY + 38, '足迹时长', {
      fontSize: '11px',
      fontFamily: 'sans-serif',
      color: '#888888',
    });
    this.durationLabel.setDepth(50);

    this.durationSlider = this.add.rectangle(this.panelBaseX + 80, this.panelBaseY + 46, 120, 6, 0x333355, 0.8);
    this.durationSlider.setDepth(50);

    this.durationKnob = this.add.circle(this.panelBaseX + 80 + this.durationValue * 120, this.panelBaseY + 46, 7, cfg.colorTheme.main, 1);
    this.durationKnob.setDepth(51);
    this.durationKnob.setInteractive({ draggable: true });
    this.setupSlider(this.durationKnob, 'duration');

    this.speedLabel = this.add.text(this.panelBaseX + 10, this.panelBaseY + 66, '移动速度', {
      fontSize: '11px',
      fontFamily: 'sans-serif',
      color: '#888888',
    });
    this.speedLabel.setDepth(50);

    this.speedSlider = this.add.rectangle(this.panelBaseX + 80, this.panelBaseY + 74, 120, 6, 0x333355, 0.8);
    this.speedSlider.setDepth(50);

    this.speedKnob = this.add.circle(this.panelBaseX + 80 + this.speedValue * 120, this.panelBaseY + 74, 7, cfg.colorTheme.main, 1);
    this.speedKnob.setDepth(51);
    this.speedKnob.setInteractive({ draggable: true });
    this.setupSlider(this.speedKnob, 'speed');

    const parText = this.add.text(this.panelBaseX + 10, this.panelBaseY + 94, `目标步数: ${cfg.par}`, {
      fontSize: '11px',
      fontFamily: 'sans-serif',
      color: '#666666',
    });
    parText.setDepth(50);
  }

  setupSlider(knob: Phaser.GameObjects.Arc, type: 'duration' | 'speed') {
    const sliderX = this.panelBaseX + 80;
    const sliderW = 120;

    knob.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number) => {
      const clamped = Phaser.Math.Clamp(dragX, sliderX, sliderX + sliderW);
      knob.setX(clamped);
      const val = (clamped - sliderX) / sliderW;

      if (type === 'duration') {
        this.durationValue = val;
        if (this.player) {
          this.player.footprintDuration = 2000 + val * 6000;
        }
      } else {
        this.speedValue = val;
        if (this.player) {
          this.player.moveSpeed = 120 + val * 200;
        }
      }
    });
  }

  setupInput() {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.levelComplete) return;
      if (this.isOverPanel(pointer)) return;

      if (pointer.leftButtonDown()) {
        this.player!.startLongPress();
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.levelComplete) return;
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.levelComplete) return;
      if (!this.player) return;

      const wasLongPress = this.player.isLongPressing && this.player.longPressTimer;
      this.player.stopLongPress();

      if (!this.isOverPanel(pointer)) {
        const dx = pointer.x - this.player.x;
        const dy = pointer.y - this.player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 5 && !wasLongPress) {
          this.player.moveTo(pointer.x, pointer.y);
        }
      }
    });
  }

  isOverPanel(pointer: Phaser.Input.Pointer): boolean {
    return (
      pointer.x >= this.panelBaseX - 10 &&
      pointer.x <= this.panelBaseX + 200 &&
      pointer.y >= this.panelBaseY - 10 &&
      pointer.y <= this.panelBaseY + 120
    );
  }

  resetLevel() {
    if (!this.levelConfig || !this.player) return;
    this.player.reset(this.levelConfig.playerStart.x, this.levelConfig.playerStart.y);
    this.levelComplete = false;
    this.stepsText!.setText('步数: 0');
  }

  update(_time: number, delta: number) {
    if (!this.player || !this.levelConfig || !this.graphics) return;

    const allWalls = [...this.wallRects];
    const footprintRects = this.player.getFootprintRects();

    for (const gap of this.levelConfig.gaps) {
      if (!gap.needsFootbridge) continue;
      let bridged = false;
      for (const fp of footprintRects) {
        if (Phaser.Geom.Rectangle.Overlaps(fp, new Phaser.Geom.Rectangle(gap.x, gap.y, gap.w, gap.h))) {
          bridged = true;
          break;
        }
      }
      if (!bridged) {
        allWalls.push(new Phaser.Geom.Rectangle(gap.x, gap.y, gap.w, gap.h));
      }
    }

    for (const orb of this.levelConfig.pulseOrbs) {
      const t = (_time % orb.period) / orb.period;
      const pulseRadius = orb.radius + Math.sin(t * Math.PI * 2) * (orb.maxRadius - orb.radius);
      const cx = orb.x;
      const cy = orb.y;
      const px = this.player.x;
      const py = this.player.y;
      const pdist = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
      if (pdist < pulseRadius + this.player.radius) {
        this.player.isMoving = false;
        this.player.targetX = null;
        this.player.targetY = null;
        const pushDist = pulseRadius + this.player.radius - pdist;
        const angle = Math.atan2(py - cy, px - cx);
        this.player.x += Math.cos(angle) * pushDist * 1.5;
        this.player.y += Math.sin(angle) * pushDist * 1.5;
        this.player.stopLongPress();
      }
    }

    for (const prism of this.levelConfig.prisms) {
      const cx = prism.x;
      const cy = prism.y;
      const pdist = Math.sqrt((this.player.x - cx) ** 2 + (this.player.y - cy) ** 2);
      if (pdist < prism.radius + this.player.radius) {
        this.player.isMoving = false;
        this.player.targetX = null;
        this.player.targetY = null;
        const pushDist = prism.radius + this.player.radius - pdist;
        const angle = Math.atan2(this.player.y - cy, this.player.x - cx);
        this.player.x += Math.cos(angle) * pushDist * 1.2;
        this.player.y += Math.sin(angle) * pushDist * 1.2;
        this.player.stopLongPress();
      }
    }

    this.player.update(delta, allWalls);

    if (this.stepsText && this.player) {
      this.stepsText.setText(`步数: ${this.player.steps}`);
    }

    this.graphics.clear();

    this.player.drawRipple(this.graphics);

    for (const prismObj of this.prismObjects) {
      prismObj.angle += prismObj.config.speed * delta;
      const g = prismObj.graphics;
      g.clear();

      const sides = 3;
      const points: { x: number; y: number }[] = [];
      for (let i = 0; i < sides; i++) {
        const a = prismObj.angle + (i * Math.PI * 2) / sides;
        points.push({
          x: prismObj.config.x + Math.cos(a) * prismObj.config.radius,
          y: prismObj.config.y + Math.sin(a) * prismObj.config.radius,
        });
      }

      g.fillStyle(this.levelConfig!.colorTheme.main, 0.3);
      g.fillTriangle(points[0].x, points[0].y, points[1].x, points[1].y, points[2].x, points[2].y);

      g.lineStyle(2, this.levelConfig!.colorTheme.glow, 0.8);
      g.beginPath();
      g.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < sides; i++) {
        g.lineTo(points[i].x, points[i].y);
      }
      g.closePath();
      g.strokePath();

      g.lineStyle(1, this.levelConfig!.colorTheme.main, 0.3);
      g.strokeCircle(prismObj.config.x, prismObj.config.y, prismObj.config.radius + 8);
    }

    for (const orbObj of this.pulseOrbObjects) {
      const orb = orbObj.config;
      const g = orbObj.graphics;
      g.clear();

      const t = (_time % orb.period) / orb.period;
      const pulseRadius = orb.radius + Math.sin(t * Math.PI * 2) * (orb.maxRadius - orb.radius);

      g.fillStyle(this.levelConfig!.colorTheme.glow, 0.15);
      g.fillCircle(orb.x, orb.y, pulseRadius);

      g.lineStyle(1, this.levelConfig!.colorTheme.main, 0.3 + Math.sin(t * Math.PI * 2) * 0.3);
      g.strokeCircle(orb.x, orb.y, pulseRadius);

      g.fillStyle(this.levelConfig!.colorTheme.main, 0.8);
      g.fillCircle(orb.x, orb.y, orb.radius * 0.6);

      g.lineStyle(2, this.levelConfig!.colorTheme.glow, 0.6);
      g.strokeCircle(orb.x, orb.y, orb.radius);
    }

    this.goalPulse += delta * 0.003;
    const goalScale = 1 + Math.sin(this.goalPulse) * 0.15;
    if (this.goalGlow) {
      this.goalGlow.setScale(goalScale * 1.5);
      this.goalGlow.setAlpha(0.15 + Math.sin(this.goalPulse) * 0.08);
    }
    if (this.goalObject) {
      this.goalObject.setScale(goalScale);
    }

    if (!this.levelComplete && this.player) {
      const dx = this.player.x - this.levelConfig.goal.x;
      const dy = this.player.y - this.levelConfig.goal.y;
      if (Math.sqrt(dx * dx + dy * dy) < 20) {
        this.levelComplete = true;
        this.player.isMoving = false;
        this.player.stopLongPress();
        this.time.delayedCall(600, () => {
          this.currentLevel++;
          this.loadLevel(this.currentLevel);
        });
      }
    }
  }

  showVictory() {
    this.cleanup();
    this.cameras.main.setBackgroundColor('#000000');

    const centerX = 400;
    const centerY = 280;

    this.add.text(centerX, centerY - 30, '光痕迷域', {
      fontSize: '36px',
      fontFamily: 'sans-serif',
      color: '#a78bfa',
    }).setOrigin(0.5).setDepth(50);

    this.add.text(centerX, centerY + 30, '通关完成', {
      fontSize: '24px',
      fontFamily: 'sans-serif',
      color: '#34d399',
    }).setOrigin(0.5).setDepth(50);

    this.add.text(centerX, centerY + 80, '点击重新开始', {
      fontSize: '16px',
      fontFamily: 'sans-serif',
      color: '#888888',
    }).setOrigin(0.5).setDepth(50);

    this.input.once('pointerdown', () => {
      this.currentLevel = 0;
      this.loadLevel(0);
    });
  }

  cleanup() {
    if (this.player) {
      this.player.destroy();
      this.player = null;
    }
    for (const obj of this.wallObjects) obj.destroy();
    this.wallObjects = [];
    for (const obj of this.gapObjects) obj.destroy();
    this.gapObjects = [];
    for (const obj of this.prismObjects) obj.graphics.destroy();
    this.prismObjects = [];
    for (const obj of this.pulseOrbObjects) obj.graphics.destroy();
    this.pulseOrbObjects = [];
    if (this.goalObject) this.goalObject.destroy();
    if (this.goalGlow) this.goalGlow.destroy();
    if (this.graphics) this.graphics.destroy();
    if (this.fadeOverlay) this.fadeOverlay.destroy();
    if (this.levelText) this.levelText.destroy();
    if (this.stepsText) this.stepsText.destroy();
    if (this.panelBg) this.panelBg.destroy();
    if (this.resetBtn) this.resetBtn.destroy();
    if (this.durationSlider) this.durationSlider.destroy();
    if (this.durationKnob) this.durationKnob.destroy();
    if (this.speedSlider) this.speedSlider.destroy();
    if (this.speedKnob) this.speedKnob.destroy();
    if (this.durationLabel) this.durationLabel.destroy();
    if (this.speedLabel) this.speedLabel.destroy();

    this.children.removeAll();
  }
}
