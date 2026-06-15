import Phaser from 'phaser';
import {
  LevelConfig,
  WallData,
  GapData,
  PrismData,
  PulseOrbData,
  ColorTheme,
  getLevel,
  getNextLevelId,
} from '../utils/LevelData';

interface Footprint {
  sprite: Phaser.GameObjects.Sprite;
  bridgeBody: Phaser.Physics.Arcade.StaticBody | null;
  timer: Phaser.Time.TimerEvent;
  gapIndex: number;
  alpha: number;
}

interface Ripple {
  graphics: Phaser.GameObjects.Graphics;
  radius: number;
  maxRadius: number;
  alpha: number;
}

interface PrismState {
  container: Phaser.GameObjects.Container;
  arms: Phaser.Physics.Arcade.Sprite[];
  angle: number;
  speed: number;
  data: PrismData;
}

interface PulseOrbState {
  sprite: Phaser.GameObjects.Sprite;
  body: Phaser.Physics.Arcade.StaticBody | null;
  data: PulseOrbData;
  elapsed: number;
  active: boolean;
}

export class GameScene extends Phaser.Scene {
  private levelId = 1;
  private levelConfig!: LevelConfig;
  private theme!: ColorTheme;

  private player!: Phaser.Physics.Arcade.Sprite;
  private wallsGroup!: Phaser.Physics.Arcade.StaticGroup;
  private gapBarriers!: Phaser.Physics.Arcade.StaticGroup;
  private prisms: PrismState[] = [];
  private pulseOrbs: PulseOrbState[] = [];
  private footprints: Footprint[] = [];
  private ripples: Ripple[] = [];

  private wallGraphics!: Phaser.GameObjects.Graphics;
  private gapGraphics!: Phaser.GameObjects.Graphics;
  private trailEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;

  private targetPos: Phaser.Math.Vector2 | null = null;
  private isMoving = false;
  private steps = 0;
  private levelText!: Phaser.GameObjects.Text;
  private stepText!: Phaser.GameObjects.Text;

  private isPointerDown = false;
  private pointerDownTime = 0;
  private isLongPress = false;
  private longPressThreshold = 350;

  private footprintDuration = 4000;
  private moveSpeed = 200;

  private controlsPanel!: Phaser.GameObjects.Container;
  private speedSlider!: Phaser.GameObjects.Container;
  private durationSlider!: Phaser.GameObjects.Container;

  private endpoint!: Phaser.GameObjects.Sprite;
  private fadeOverlay!: Phaser.GameObjects.Graphics;

  private gapBarrierBodies: Phaser.Physics.Arcade.StaticBody[] = [];

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: { levelId?: number }): void {
    this.levelId = data.levelId ?? 1;
    this.steps = 0;
    this.isMoving = false;
    this.targetPos = null;
    this.footprints = [];
    this.ripples = [];
    this.prisms = [];
    this.pulseOrbs = [];
    this.gapBarrierBodies = [];
    this.isPointerDown = false;
    this.isLongPress = false;
  }

  create(): void {
    const level = getLevel(this.levelId);
    if (!level) {
      this.add.text(400, 300, '恭喜通关！', {
        fontSize: '36px',
        color: '#ffffff',
        fontFamily: '"Microsoft YaHei", sans-serif',
      }).setOrigin(0.5);
      return;
    }
    this.levelConfig = level;
    this.theme = level.colorTheme;

    this.cameras.main.setBackgroundColor('#000000');

    this.fadeOverlay = this.add.graphics();
    this.fadeOverlay.fillStyle(0x000000, 1);
    this.fadeOverlay.fillRect(0, 0, 800, 600);
    this.fadeOverlay.setDepth(100);

    this.tweens.add({
      targets: this.fadeOverlay,
      alpha: { from: 1, to: 0 },
      duration: 600,
      ease: 'Power2',
    });

    this.wallGraphics = this.add.graphics();
    this.gapGraphics = this.add.graphics();

    this.createWalls();
    this.createGaps();
    this.createPrisms();
    this.createPulseOrbs();
    this.createEndpoint();
    this.createPlayer();
    this.createTrailEmitter();
    this.createUI();
    this.setupInput();

    this.physics.add.collider(this.player, this.wallsGroup, this.onPlayerHitWall, undefined, this);
    this.physics.add.collider(this.player, this.gapBarriers);
    this.physics.add.overlap(this.player, this.endpoint, this.onReachEndpoint, undefined, this);
  }

  update(_time: number, delta: number): void {
    this.updatePlayerMovement(delta);
    this.updateFootprints(delta);
    this.updateRipples(delta);
    this.updatePrisms(delta);
    this.updatePulseOrbs(delta);
    this.updateTrailEmitter();
  }

  private createWalls(): void {
    this.wallsGroup = this.physics.add.staticGroup();
    this.wallGraphics.clear();

    const color = this.theme.primary;
    const glowColor = this.theme.glow;

    for (const wall of this.levelConfig.walls) {
      this.createWallBody(wall, color, glowColor);
    }
  }

  private createWallBody(wall: WallData, color: number, glowColor: number): void {
    const isVertical = wall.x1 === wall.x2;
    const thickness = wall.thickness ?? 4;

    if (isVertical) {
      const x = wall.x1;
      const yMin = Math.min(wall.y1, wall.y2);
      const yMax = Math.max(wall.y1, wall.y2);
      const height = yMax - yMin;

      this.wallGraphics.lineStyle(12, glowColor, 0.15);
      this.wallGraphics.lineBetween(x, yMin, x, yMax);
      this.wallGraphics.lineStyle(6, color, 0.4);
      this.wallGraphics.lineBetween(x, yMin, x, yMax);
      this.wallGraphics.lineStyle(thickness, color, 0.9);
      this.wallGraphics.lineBetween(x, yMin, x, yMax);

      const rect = this.add.rectangle(x, (yMin + yMax) / 2, thickness + 4, height);
      this.wallsGroup.add(rect);
      rect.body.setSize(thickness + 4, height);
      rect.body.setOffset(-(thickness + 4) / 2, -height / 2);
    } else {
      const y = wall.y1;
      const xMin = Math.min(wall.x1, wall.x2);
      const xMax = Math.max(wall.x1, wall.x2);
      const width = xMax - xMin;

      this.wallGraphics.lineStyle(12, glowColor, 0.15);
      this.wallGraphics.lineBetween(xMin, y, xMax, y);
      this.wallGraphics.lineStyle(6, color, 0.4);
      this.wallGraphics.lineBetween(xMin, y, xMax, y);
      this.wallGraphics.lineStyle(thickness, color, 0.9);
      this.wallGraphics.lineBetween(xMin, y, xMax, y);

      const rect = this.add.rectangle((xMin + xMax) / 2, y, width, thickness + 4);
      this.wallsGroup.add(rect);
      rect.body.setSize(width, thickness + 4);
      rect.body.setOffset(-width / 2, -(thickness + 4) / 2);
    }
  }

  private createGaps(): void {
    this.gapBarriers = this.physics.add.staticGroup();
    this.gapGraphics.clear();

    const gapColor = 0xff4757;

    for (const gap of this.levelConfig.gaps) {
      const isVertical = gap.x1 === gap.x2;
      const gapColorAlpha = 0.6;

      if (isVertical) {
        const x = gap.x1;
        const yCenter = (gap.y1 + gap.y2) / 2;

        this.gapGraphics.lineStyle(2, gapColor, 0.3);
        this.gapGraphics.lineBetween(x, gap.y1, x, gap.y2);

        for (let i = 0; i < 3; i++) {
          const py = gap.y1 + (gap.y2 - gap.y1) * (i / 3) + (gap.y2 - gap.y1) / 6;
          this.gapGraphics.fillStyle(gapColor, gapColorAlpha);
          this.gapGraphics.fillCircle(x, py, 3);
        }

        const rect = this.add.rectangle(x, yCenter, gap.width, Math.abs(gap.y2 - gap.y1) || gap.width);
        this.gapBarriers.add(rect);
        rect.body.setSize(gap.width, Math.abs(gap.y2 - gap.y1) || gap.width);
        rect.body.setOffset(-gap.width / 2, -(Math.abs(gap.y2 - gap.y1) || gap.width) / 2);
        this.gapBarrierBodies.push(rect.body as Phaser.Physics.Arcade.StaticBody);
      } else {
        const y = gap.y1;
        const xCenter = (gap.x1 + gap.x2) / 2;

        this.gapGraphics.lineStyle(2, gapColor, 0.3);
        this.gapGraphics.lineBetween(gap.x1, y, gap.x2, y);

        for (let i = 0; i < 3; i++) {
          const px = gap.x1 + (gap.x2 - gap.x1) * (i / 3) + (gap.x2 - gap.x1) / 6;
          this.gapGraphics.fillStyle(gapColor, gapColorAlpha);
          this.gapGraphics.fillCircle(px, y, 3);
        }

        const rect = this.add.rectangle(xCenter, y, Math.abs(gap.x2 - gap.x1) || gap.width, gap.width);
        this.gapBarriers.add(rect);
        rect.body.setSize(Math.abs(gap.x2 - gap.x1) || gap.width, gap.width);
        rect.body.setOffset(-(Math.abs(gap.x2 - gap.x1) || gap.width) / 2, -gap.width / 2);
        this.gapBarrierBodies.push(rect.body as Phaser.Physics.Arcade.StaticBody);
      }
    }
  }

  private createPrisms(): void {
    for (const prismData of this.levelConfig.prisms) {
      const container = this.add.container(prismData.x, prismData.y);
      const centerGlow = this.add.circle(0, 0, 8, this.theme.primary, 0.6);
      const centerCore = this.add.circle(0, 0, 4, 0xffffff, 0.9);
      container.add(centerGlow);
      container.add(centerCore);

      const arms: Phaser.Physics.Arcade.Sprite[] = [];

      for (let i = 0; i < prismData.armCount; i++) {
        const angle = (Math.PI * 2 * i) / prismData.armCount;
        const arm = this.physics.add.staticSprite(
          prismData.x + Math.cos(angle) * prismData.armLength / 2,
          prismData.y + Math.sin(angle) * prismData.armLength / 2,
          'prism_arm'
        );
        arm.setAlpha(0.7);
        arm.setRotation(angle);
        arms.push(arm);
      }

      this.prisms.push({
        container,
        arms,
        angle: 0,
        speed: prismData.rotationSpeed,
        data: prismData,
      });
    }
  }

  private createPulseOrbs(): void {
    for (const orbData of this.levelConfig.pulseOrbs) {
      const sprite = this.add.sprite(orbData.x, orbData.y, 'pulse_orb');
      sprite.setAlpha(0.8);

      this.pulseOrbs.push({
        sprite,
        body: null,
        data: orbData,
        elapsed: 0,
        active: true,
      });
    }
  }

  private createEndpoint(): void {
    this.endpoint = this.add.sprite(
      this.levelConfig.endPos.x,
      this.levelConfig.endPos.y,
      'endpoint'
    );
    this.endpoint.setDepth(5);

    this.tweens.add({
      targets: this.endpoint,
      scaleX: { from: 1, to: 1.3 },
      scaleY: { from: 1, to: 1.3 },
      alpha: { from: 0.8, to: 1 },
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private createPlayer(): void {
    this.player = this.physics.add.sprite(
      this.levelConfig.startPos.x,
      this.levelConfig.startPos.y,
      'player'
    );
    this.player.setDepth(10);
    this.player.setCircle(16, 0, 0);
    this.player.setCollideWorldBounds(true);
    this.physics.world.setBounds(40, 40, 720, 520);
  }

  private createTrailEmitter(): void {
    const tint = this.theme.trailPrimary;

    this.trailEmitter = this.add.particles(0, 0, 'particle', {
      speed: { min: 5, max: 20 },
      scale: { start: 0.8, end: 0 },
      lifespan: { min: 200, max: 500 },
      alpha: { start: 0.6, end: 0 },
      blendMode: 'ADD',
      tint: tint,
      emitting: false,
      quantity: 2,
      frequency: 30,
    });
    this.trailEmitter.setDepth(9);
  }

  private updateTrailEmitter(): void {
    if (this.isMoving && this.player) {
      this.trailEmitter.setPosition(this.player.x, this.player.y);
      if (!this.trailEmitter.emitting) {
        this.trailEmitter.start();
      }
    } else {
      if (this.trailEmitter.emitting) {
        this.trailEmitter.stop();
      }
    }
  }

  private createUI(): void {
    this.levelText = this.add.text(16, 16, `关卡 ${this.levelId} - ${this.levelConfig.name}`, {
      fontSize: '16px',
      fontFamily: '"Microsoft YaHei", sans-serif',
      color: '#' + this.theme.primary.toString(16).padStart(6, '0'),
    }).setDepth(50);

    this.stepText = this.add.text(16, 38, `步数: 0`, {
      fontSize: '14px',
      fontFamily: '"Microsoft YaHei", sans-serif',
      color: '#' + this.theme.secondary.toString(16).padStart(6, '0'),
    }).setDepth(50);

    this.createControlPanel();
  }

  private createControlPanel(): void {
    const panelW = 180;
    const panelH = 150;
    const panelX = 800 - panelW - 12;
    const panelY = 600 - panelH - 12;

    const bg = this.add.graphics();
    bg.fillStyle(0x1a1a2e, 0.7);
    bg.fillRoundedRect(panelX, panelY, panelW, panelH, 10);
    bg.lineStyle(1, this.theme.primary, 0.3);
    bg.strokeRoundedRect(panelX, panelY, panelW, panelH, 10);
    bg.setDepth(49);

    const resetBtn = this.add.text(panelX + panelW / 2, panelY + 20, '重置关卡', {
      fontSize: '14px',
      fontFamily: '"Microsoft YaHei", sans-serif',
      color: '#ffffff',
      backgroundColor: '#' + this.theme.glow.toString(16).padStart(6, '0'),
      padding: { x: 16, y: 6 },
    }).setOrigin(0.5).setDepth(50).setInteractive({ useHandCursor: true });

    resetBtn.on('pointerover', () => resetBtn.setAlpha(0.8));
    resetBtn.on('pointerout', () => resetBtn.setAlpha(1));
    resetBtn.on('pointerdown', () => this.resetLevel());

    this.add.text(panelX + 14, panelY + 52, '足迹持续', {
      fontSize: '11px',
      fontFamily: '"Microsoft YaHei", sans-serif',
      color: '#' + this.theme.secondary.toString(16).padStart(6, '0'),
    }).setDepth(50);

    const durationSliderBg = this.createSliderTrack(panelX + 14, panelY + 72, panelW - 28);
    const durationKnob = this.createSliderKnob(panelX + 14, panelY + 72);
    this.setupSlider(durationSliderBg, durationKnob, panelX + 14, panelX + panelW - 14, (val) => {
      this.footprintDuration = 2000 + val * 6000;
    }, 0.33);

    this.add.text(panelX + 14, panelY + 98, '移动速度', {
      fontSize: '11px',
      fontFamily: '"Microsoft YaHei", sans-serif',
      color: '#' + this.theme.secondary.toString(16).padStart(6, '0'),
    }).setDepth(50);

    const speedSliderBg = this.createSliderTrack(panelX + 14, panelY + 118, panelW - 28);
    const speedKnob = this.createSliderKnob(panelX + 14, panelY + 118);
    this.setupSlider(speedSliderBg, speedKnob, panelX + 14, panelX + panelW - 14, (val) => {
      this.moveSpeed = 100 + val * 250;
    }, 0.33);

    this.controlsPanel = this.add.container(0, 0, [bg, resetBtn, durationSliderBg, durationKnob, speedSliderBg, speedKnob]);
    this.controlsPanel.setDepth(50);
  }

  private createSliderTrack(x: number, y: number, width: number): Phaser.GameObjects.Graphics {
    const g = this.add.graphics();
    g.fillStyle(0x2d2d4e, 0.8);
    g.fillRoundedRect(x, y, width, 6, 3);
    g.setDepth(50);
    return g;
  }

  private createSliderKnob(x: number, y: number): Phaser.GameObjects.Arc {
    const knob = this.add.circle(x, y + 3, 8, this.theme.primary, 0.9);
    knob.setStrokeStyle(1, this.theme.secondary, 0.5);
    knob.setDepth(51);
    return knob;
  }

  private setupSlider(
    track: Phaser.GameObjects.Graphics,
    knob: Phaser.GameObjects.Arc,
    minX: number,
    maxX: number,
    onChange: (normalized: number) => void,
    initialNorm: number
  ): void {
    const range = maxX - minX;
    let dragging = false;

    knob.x = minX + range * initialNorm;
    onChange(initialNorm);

    knob.setInteractive({ draggable: true });

    knob.on('dragstart', () => { dragging = true; });
    knob.on('dragend', () => { dragging = false; });
    knob.on('drag', (pointer: Phaser.Input.Pointer) => {
      if (!dragging) return;
      const newX = Phaser.Math.Clamp(pointer.x, minX, maxX);
      knob.x = newX;
      const norm = (newX - minX) / range;
      onChange(norm);
    });
  }

  private setupInput(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isUIClick(pointer)) return;
      this.isPointerDown = true;
      this.pointerDownTime = this.time.now;
      this.isLongPress = false;

      this.time.delayedCall(this.longPressThreshold, () => {
        if (this.isPointerDown && !this.isLongPress) {
          this.isLongPress = true;
          this.dropFootprint();
        }
      });
    });

    this.input.on('pointerup', () => {
      if (!this.isLongPress && this.isPointerDown) {
        const pointer = this.input.activePointer;
        this.setTarget(pointer.worldX, pointer.worldY);
      }
      this.isPointerDown = false;
      this.isLongPress = false;
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isPointerDown && !this.isLongPress) {
        const dx = pointer.x - pointer.downX;
        const dy = pointer.y - pointer.downY;
        if (Math.sqrt(dx * dx + dy * dy) > 10) {
          this.isPointerDown = false;
          this.isLongPress = false;
        }
      }
    });
  }

  private isUIClick(pointer: Phaser.Input.Pointer): boolean {
    const panelX = 800 - 180 - 12;
    const panelY = 600 - 150 - 12;
    return pointer.x >= panelX && pointer.x <= panelX + 180 && pointer.y >= panelY && pointer.y <= panelY + 150;
  }

  private setTarget(x: number, y: number): void {
    x = Phaser.Math.Clamp(x, 50, 750);
    y = Phaser.Math.Clamp(y, 50, 550);

    this.targetPos = new Phaser.Math.Vector2(x, y);
    this.isMoving = true;
    this.steps++;
    this.stepText.setText(`步数: ${this.steps}`);

    this.createRipple(this.player.x, this.player.y);
  }

  private updatePlayerMovement(delta: number): void {
    if (!this.isMoving || !this.targetPos || !this.player) return;

    const dx = this.targetPos.x - this.player.x;
    const dy = this.targetPos.y - this.player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 3) {
      this.stopPlayer();
      return;
    }

    const speed = this.moveSpeed * (delta / 1000);
    const moveX = (dx / dist) * Math.min(speed, dist);
    const moveY = (dy / dist) * Math.min(speed, dist);

    this.player.setVelocity(0, 0);
    this.player.x += moveX;
    this.player.y += moveY;
  }

  private onPlayerHitWall(): void {
    this.stopPlayer();
  }

  private stopPlayer(): void {
    this.isMoving = false;
    this.targetPos = null;
    if (this.player && this.player.body) {
      this.player.setVelocity(0, 0);
    }
  }

  private dropFootprint(): void {
    if (!this.player) return;

    const px = this.player.x;
    const py = this.player.y;

    const sprite = this.add.sprite(px, py, 'footprint');
    sprite.setDepth(8);
    sprite.setAlpha(0.8);
    sprite.setTint(this.theme.footprint);

    let bridgeBody: Phaser.Physics.Arcade.StaticBody | null = null;
    let gapIdx = -1;

    for (let i = 0; i < this.levelConfig.gaps.length; i++) {
      const gap = this.levelConfig.gaps[i];
      const gx = (gap.x1 + gap.x2) / 2;
      const gy = (gap.y1 + gap.y2) / 2;
      const d = Phaser.Math.Distance.Between(px, py, gx, gy);

      if (d < 60) {
        const isVertical = gap.x1 === gap.x2;
        const bridge = this.add.rectangle(gx, gy, isVertical ? gap.width + 10 : Math.abs(gap.x2 - gap.x1) + 10, isVertical ? Math.abs(gap.y2 - gap.y1) + 10 : gap.width + 10, this.theme.footprint, 0);
        this.gapBarriers.add(bridge);

        if (this.gapBarrierBodies[i]) {
          this.gapBarrierBodies[i].enable = false;
        }

        bridgeBody = bridge.body as Phaser.Physics.Arcade.StaticBody;
        gapIdx = i;
        break;
      }
    }

    const timer = this.time.delayedCall(this.footprintDuration, () => {
      this.removeFootprint(fp);
    });

    const fp: Footprint = { sprite, bridgeBody, timer, gapIndex: gapIdx, alpha: 0.8 };
    this.footprints.push(fp);

    this.createFootprintBurst(px, py);
  }

  private removeFootprint(fp: Footprint): void {
    const idx = this.footprints.indexOf(fp);
    if (idx === -1) return;

    this.tweens.add({
      targets: fp.sprite,
      alpha: 0,
      duration: 300,
      onComplete: () => {
        fp.sprite.destroy();
      },
    });

    if (fp.bridgeBody) {
      fp.bridgeBody.gameObject.destroy();
    }

    if (fp.gapIndex >= 0 && this.gapBarrierBodies[fp.gapIndex]) {
      this.gapBarrierBodies[fp.gapIndex].enable = true;
    }

    this.footprints.splice(idx, 1);
  }

  private updateFootprints(delta: number): void {
    for (const fp of this.footprints) {
      const remaining = fp.timer.getOverallRemaining();
      const total = this.footprintDuration;
      const progress = 1 - remaining / total;

      fp.alpha = 0.8 * (1 - progress * progress);
      fp.sprite.setAlpha(Math.max(0, fp.alpha));

      const pulseScale = 1 + Math.sin(this.time.now * 0.005) * 0.05 * (1 - progress);
      fp.sprite.setScale(pulseScale);
    }
  }

  private createFootprintBurst(x: number, y: number): void {
    const emitter = this.add.particles(x, y, 'footprint', {
      speed: { min: 20, max: 60 },
      scale: { start: 0.6, end: 0 },
      lifespan: 400,
      alpha: { start: 0.7, end: 0 },
      tint: this.theme.footprint,
      blendMode: 'ADD',
      quantity: 12,
      emitting: false,
    });
    emitter.setDepth(9);
    emitter.explode(12);
    this.time.delayedCall(500, () => emitter.destroy());
  }

  private createRipple(x: number, y: number): void {
    const graphics = this.add.graphics();
    graphics.setDepth(9);

    const ripple: Ripple = {
      graphics,
      radius: 5,
      maxRadius: 40,
      alpha: 0.5,
    };
    this.ripples.push(ripple);
  }

  private updateRipples(_delta: number): void {
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.radius += 1.2;
      r.alpha -= 0.015;

      if (r.alpha <= 0 || r.radius >= r.maxRadius) {
        r.graphics.destroy();
        this.ripples.splice(i, 1);
        continue;
      }

      r.graphics.clear();
      r.graphics.lineStyle(2, this.theme.trailPrimary, r.alpha);
      r.graphics.strokeCircle(r.graphics.x || 0, r.graphics.y || 0, r.radius);
    }
  }

  private updatePrisms(delta: number): void {
    for (const prism of this.prisms) {
      prism.angle += prism.speed * (delta / 1000);
      prism.container.setRotation(prism.angle);

      const data = prism.data;
      for (let i = 0; i < prism.arms.length; i++) {
        const armAngle = prism.angle + (Math.PI * 2 * i) / data.armCount;
        const dist = data.armLength / 2;
        prism.arms[i].x = data.x + Math.cos(armAngle) * dist;
        prism.arms[i].y = data.y + Math.sin(armAngle) * dist;
        prism.arms[i].setRotation(armAngle);
        prism.arms[i].body.reset(prism.arms[i].x, prism.arms[i].y);
      }
    }
  }

  private updatePulseOrbs(delta: number): void {
    for (const orb of this.pulseOrbs) {
      const data = orb.data;
      orb.elapsed += delta;

      const cycleTime = data.activeDuration + data.inactiveDuration;
      const cyclePos = orb.elapsed % cycleTime;

      const wasActive = orb.active;
      orb.active = cyclePos < data.activeDuration;

      if (orb.active) {
        const pulseProgress = cyclePos / data.activeDuration;
        const scale = 0.8 + Math.sin(pulseProgress * Math.PI * 2 * data.pulseSpeed) * 0.2;
        orb.sprite.setScale(scale);
        orb.sprite.setAlpha(0.7 + Math.sin(pulseProgress * Math.PI * 2 * data.pulseSpeed) * 0.3);

        if (!wasActive) {
          if (orb.body) {
            orb.body.gameObject.destroy();
          }
          const blockingRect = this.add.rectangle(data.x, data.y, data.radius * 2, data.radius * 2, 0x000000, 0);
          this.wallsGroup.add(blockingRect);
          blockingRect.body.setSize(data.radius * 2, data.radius * 2);
          blockingRect.body.setOffset(-data.radius, -data.radius);
          orb.body = blockingRect.body as Phaser.Physics.Arcade.StaticBody;
        }
      } else {
        orb.sprite.setAlpha(0.2);
        orb.sprite.setScale(0.6);
        if (wasActive && orb.body) {
          orb.body.gameObject.destroy();
          orb.body = null;
        }
      }
    }
  }

  private onReachEndpoint(): void {
    if (this.isMoving) this.stopPlayer();

    this.trailEmitter.stop();

    const nextId = getNextLevelId(this.levelId);

    this.tweens.add({
      targets: this.fadeOverlay,
      alpha: { from: 0, to: 1 },
      duration: 500,
      ease: 'Power2',
      onComplete: () => {
        this.scene.restart({ levelId: nextId ?? this.levelId + 1 });
      },
    });
  }

  private resetLevel(): void {
    this.tweens.add({
      targets: this.fadeOverlay,
      alpha: { from: 0, to: 0.6 },
      duration: 200,
      yoyo: true,
      onComplete: () => {
        this.scene.restart({ levelId: this.levelId });
      },
    });
  }
}
