import Phaser from 'phaser';
import {
  GAME_CONFIG,
  FragmentData,
  PuzzleFragment,
  GameLevel,
  UnderflowZone,
  hslToHex,
  distance,
  randomRange,
  randomInt
} from '../types.js';
import { audioManager } from '../audio.js';

interface Particle {
  sprite: Phaser.GameObjects.Arc;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  offsetX: number;
  offsetY: number;
  type: 'bubble' | 'dust' | 'jelly';
}

export class UnderwaterScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Container;
  private playerLight!: Phaser.GameObjects.Graphics;
  private lightMaskGraphics!: Phaser.GameObjects.Graphics;
  private lightMask!: Phaser.Display.Masks.BitmapMask;
  private darkOverlay!: Phaser.GameObjects.Rectangle;
  private lightRadius!: number;
  private lightTargetX: number = 0;
  private lightTargetY: number = 0;
  private smoothLightX: number = 0;
  private smoothLightY: number = 0;

  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key; E: Phaser.Input.Keyboard.Key };
  private velocity: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 0);

  private fragments: Phaser.GameObjects.Container[] = [];
  private fragmentData: PuzzleFragment[] = [];
  private nearbyFragment: PuzzleFragment | null = null;

  private backpack: PuzzleFragment[] = [];
  private backpackUI: Phaser.GameObjects.Rectangle[] = [];
  private backpackContainer!: Phaser.GameObjects.Container;

  private particles: Particle[] = [];
  private particleContainer!: Phaser.GameObjects.Container;

  private underflowZones: UnderflowZone[] = [];
  private underflowVisuals: Phaser.GameObjects.Arc[] = [];
  private inUnderflow: boolean = false;
  private lastUnderflowDamage: number = 0;

  private portal: Phaser.GameObjects.Container | null = null;
  private portalJellies: Phaser.GameObjects.Arc[] = [];
  private portalActive: boolean = false;

  private currentLevel: number = 1;
  private levelConfig!: GameLevel;

  private cameraShake: number = 0;
  private shakeOffsetX: number = 0;
  private shakeOffsetY: number = 0;

  private hudText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;

  private gameOverOverlay!: Phaser.GameObjects.Rectangle;
  private gameOverText!: Phaser.GameObjects.Text;
  private restartButton!: Phaser.GameObjects.Container;
  private isGameOver: boolean = false;

  private puzzleBtn!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'UnderwaterScene' });
  }

  init(data: { level?: number; backpack?: PuzzleFragment[] }): void {
    this.currentLevel = data.level || 1;
    if (data.backpack) {
      this.backpack = data.backpack.filter(f => f.collected);
    }
    this.setupLevelConfig();
  }

  private setupLevelConfig(): void {
    const level = this.currentLevel;
    this.levelConfig = {
      level,
      fragmentCount: GAME_CONFIG.BASE_FRAGMENT_COUNT + (level - 1) * 2,
      sceneWidth: Math.round(GAME_CONFIG.BASE_SCENE_WIDTH * (1 + (level - 1) * 0.2)),
      sceneHeight: Math.round(GAME_CONFIG.BASE_SCENE_HEIGHT * (1 + (level - 1) * 0.2)),
      lightRadius: Math.max(60, GAME_CONFIG.BASE_LIGHT_RADIUS - (level - 1) * 10)
    };
    this.lightRadius = this.levelConfig.lightRadius;
  }

  create(): void {
    const w = this.scale.width;
    const h = this.scale.height;

    this.createBackground(w, h);
    this.createParticles(w, h);
    this.createUnderflowZones();
    this.createPlayer(w / 2, h / 2);
    this.createLighting(w, h);
    this.createFragments(w, h);
    this.createHUD(w);
    this.createBackpackUI(w);
    this.createPuzzleButton(w);
    this.setupInput();
    this.setupCamera(w, h);

    this.smoothLightX = this.player.x;
    this.smoothLightY = this.player.y;
    this.lightTargetX = this.player.x;
    this.lightTargetY = this.player.y;

    this.events.on('resume', this.onResume, this);
  }

  private createBackground(w: number, h: number): void {
    const bg = this.add.graphics();
    const gradientSteps = 20;
    for (let i = 0; i < gradientSteps; i++) {
      const t = i / gradientSteps;
      const r = Math.floor(10 + (5 - 10) * t);
      const g = Math.floor(22 + (14 - 22) * t);
      const b = Math.floor(40 + (26 - 40) * t);
      const color = (r << 16) | (g << 8) | b;
      const y = (h / gradientSteps) * i;
      bg.fillStyle(color, 1);
      bg.fillRect(0, y, w, h / gradientSteps + 1);
    }
    bg.setDepth(-100);
  }

  private createParticles(w: number, h: number): void {
    this.particleContainer = this.add.container(0, 0);
    this.particleContainer.setDepth(-10);

    const bubbleCount = 60;
    const dustCount = 140;
    const jellyCount = 20;
    const total = bubbleCount + dustCount + jellyCount;

    for (let i = 0; i < total; i++) {
      let type: 'bubble' | 'dust' | 'jelly';
      let size: number;
      let color: number;
      let alpha: number;

      if (i < bubbleCount) {
        type = 'bubble';
        size = randomRange(3, 10);
        color = hslToHex(200, 80, 75);
        alpha = randomRange(0.2, 0.5);
      } else if (i < bubbleCount + dustCount) {
        type = 'dust';
        size = randomRange(1, 4);
        color = hslToHex(210, 30, 70);
        alpha = randomRange(0.15, 0.4);
      } else {
        type = 'jelly';
        size = randomRange(12, 25);
        color = hslToHex(180, 70, 60);
        alpha = randomRange(0.25, 0.5);
      }

      const x = randomRange(0, w);
      const y = randomRange(0, h);
      const sprite = this.add.circle(x, y, size, color, alpha);

      this.particleContainer.add(sprite);
      this.particles.push({
        sprite,
        baseX: x,
        baseY: y,
        vx: randomRange(-5, 5),
        vy: type === 'bubble' ? randomRange(-20, -8) : randomRange(-3, 3),
        offsetX: 0,
        offsetY: 0,
        type
      });
    }
  }

  private createUnderflowZones(): void {
    const count = 2 + this.currentLevel;
    const w = this.scale.width;
    const h = this.scale.height;

    for (let i = 0; i < count; i++) {
      const zone: UnderflowZone = {
        x: randomRange(200, w - 200),
        y: randomRange(200, h - 200),
        radius: GAME_CONFIG.UNDERFLOW_RADIUS
      };

      const distToCenter = distance(zone.x, zone.y, w / 2, h / 2);
      if (distToCenter < 300) {
        zone.x = w / 2 + Math.cos(Math.random() * Math.PI * 2) * 400;
        zone.y = h / 2 + Math.sin(Math.random() * Math.PI * 2) * 400;
      }

      this.underflowZones.push(zone);

      const visual = this.add.circle(zone.x, zone.y, zone.radius, 0x041020, 0.9);
      visual.setDepth(-5);
      this.underflowVisuals.push(visual);

      for (let s = 0; s < 5; s++) {
        const swirl = this.add.circle(
          zone.x + randomRange(-zone.radius * 0.6, zone.radius * 0.6),
          zone.y + randomRange(-zone.radius * 0.6, zone.radius * 0.6),
          randomRange(8, 20),
          0x061530,
          0.5
        );
        swirl.setDepth(-4);
      }
    }
  }

  private createPlayer(x: number, y: number): void {
    this.player = this.add.container(x, y);
    this.player.setDepth(50);

    const innerGlow = this.add.circle(0, 0, 20, hslToHex(200, 100, 80), 0.9);
    const core = this.add.circle(0, 0, 10, 0xffffff, 1);
    const outerHalo = this.add.circle(0, 0, 30, hslToHex(200, 100, 70), 0.3);

    this.player.add([outerHalo, innerGlow, core]);

    const tentacleCount = 5;
    for (let i = 0; i < tentacleCount; i++) {
      const angle = (i / tentacleCount) * Math.PI * 2;
      const tentacle = this.add.line(
        Math.cos(angle) * 6,
        Math.sin(angle) * 6,
        0, 0,
        Math.cos(angle) * 20,
        Math.sin(angle) * 20,
        hslToHex(200, 100, 75),
        0.6
      );
      tentacle.setLineWidth(2);
      this.player.add(tentacle);
    }
  }

  private createLighting(w: number, h: number): void {
    this.darkOverlay = this.add.rectangle(w / 2, h / 2, w * 2, h * 2, 0x0a1628, 0.85);
    this.darkOverlay.setDepth(90);

    this.lightMaskGraphics = this.add.graphics();
    this.lightMaskGraphics.setVisible(false);

    this.updateLightMaskTexture();

    this.lightMask = new Phaser.Display.Masks.BitmapMask(this, this.lightMaskGraphics);
    this.lightMask.invertAlpha = true;
    this.darkOverlay.setMask(this.lightMask);
  }

  private updateLightMaskTexture(): void {
    const g = this.lightMaskGraphics;
    g.clear();

    const radius = this.lightRadius;
    const x = this.smoothLightX;
    const y = this.smoothLightY;

    const steps = 20;
    for (let i = steps; i >= 0; i--) {
      const t = i / steps;
      const r = radius * (0.2 + t * 0.8);
      const alpha = Math.pow(1 - t, 1.5);
      const color = hslToHex(210 - t * 30, 80 + t * 20, 60 + t * 40);
      g.fillStyle(color, alpha);
      g.fillCircle(x, y, r);
    }
  }

  private createFragments(w: number, h: number): void {
    const startX = w / 2;
    const startY = h / 2;
    const count = this.levelConfig.fragmentCount;

    const gridCols = Math.ceil(Math.sqrt(count * (w / h)));
    const gridRows = Math.ceil(count / gridCols);
    const cellW = (w - 300) / gridCols;
    const cellH = (h - 300) / gridRows;

    for (let i = 0; i < count; i++) {
      const col = i % gridCols;
      const row = Math.floor(i / gridCols);

      let fx: number, fy: number;
      let attempts = 0;
      do {
        fx = 150 + col * cellW + randomRange(cellW * 0.2, cellW * 0.8);
        fy = 150 + row * cellH + randomRange(cellH * 0.2, cellH * 0.8);
        attempts++;
      } while (distance(fx, fy, startX, startY) < 200 && attempts < 10);

      const hue = randomInt(GAME_CONFIG.FRAGMENT_HUE_MIN, GAME_CONFIG.FRAGMENT_HUE_MAX);
      const fragWidth = GAME_CONFIG.FRAGMENT_WIDTH;
      const fragHeight = GAME_CONFIG.FRAGMENT_HEIGHT;
      const rotation = randomRange(0, 360);

      const fragmentData: PuzzleFragment = {
        id: i,
        x: fx,
        y: fy,
        rotation,
        width: fragWidth,
        height: fragHeight,
        hue,
        targetX: fx,
        targetY: fy,
        targetRotation: rotation,
        collected: false,
        snapped: false,
        snapToId: null
      };

      this.fragmentData.push(fragmentData);
      this.createFragmentVisual(fragmentData);
    }
  }

  private createFragmentVisual(frag: PuzzleFragment): void {
    const container = this.add.container(frag.x, frag.y);
    container.setDepth(20);
    container.setRotation(Phaser.Math.DegToRad(frag.rotation));

    const color = hslToHex(frag.hue, GAME_CONFIG.FRAGMENT_SATURATION, 55);
    const borderColor = hslToHex(frag.hue, GAME_CONFIG.FRAGMENT_SATURATION, 75);

    const shadow = this.add.rectangle(4, 6, frag.width, frag.height, 0x000000, 0.3);
    const bg = this.add.rectangle(0, 0, frag.width, frag.height, color, GAME_CONFIG.FRAGMENT_ALPHA);
    const border = this.add.rectangle(0, 0, frag.width, frag.height, borderColor, 0.6);
    border.setStrokeStyle(2, borderColor, 0.8);

    const symbolCount = randomInt(2, 5);
    const symbols: Phaser.GameObjects.Shape[] = [];
    for (let i = 0; i < symbolCount; i++) {
      const sx = randomRange(-frag.width * 0.35, frag.width * 0.35);
      const sy = randomRange(-frag.height * 0.3, frag.height * 0.3);
      const symbolType = randomInt(0, 3);
      const symColor = hslToHex(frag.hue, 80, 80);

      if (symbolType === 0) {
        const s = this.add.circle(sx, sy, randomRange(4, 8), symColor, 0.7);
        symbols.push(s);
      } else if (symbolType === 1) {
        const s = this.add.star(sx, sy, 5, 4, 8, symColor, 0.7);
        symbols.push(s);
      } else {
        const s = this.add.triangle(
          sx, sy - 5,
          sx - 6, sy + 5,
          sx + 6, sy + 5,
          symColor, 0.7
        );
        symbols.push(s);
      }
    }

    container.add([shadow, bg, border, ...symbols]);
    container.setData('fragmentId', frag.id);
    container.setData('isGlowing', false);
    this.fragments.push(container);
  }

  private createHUD(w: number): void {
    this.hudText = this.add.text(20, 20, '', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '18px',
      color: '#88ccff',
      stroke: '#003355',
      strokeThickness: 2
    });
    this.hudText.setDepth(200);
    this.hudText.setScrollFactor(0);

    this.hintText = this.add.text(w / 2, 100, '', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '22px',
      color: '#ffd700',
      stroke: '#332200',
      strokeThickness: 3,
      align: 'center'
    });
    this.hintText.setOrigin(0.5);
    this.hintText.setDepth(200);
    this.hintText.setScrollFactor(0);
  }

  private createBackpackUI(w: number): void {
    this.backpackContainer = this.add.container(0, 0);
    this.backpackContainer.setDepth(150);
    this.backpackContainer.setScrollFactor(0);
    this.backpackContainer.setPosition(0, 0);

    const bg = this.add.rectangle(w / 2, 60, w - 80, 70, 0x0a1628, 0.7);
    bg.setStrokeStyle(2, 0x4488cc, 0.5);
    this.backpackContainer.add(bg);

    const label = this.add.text(60, 40, '背包:', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '16px',
      color: '#aaccff'
    });
    this.backpackContainer.add(label);

    this.refreshBackpackUI();
  }

  private refreshBackpackUI(): void {
    this.backpackUI.forEach(ui => ui.destroy());
    this.backpackUI = [];

    const startX = 130;
    const startY = 60;
    const gap = 50;

    this.backpack.forEach((frag, idx) => {
      const x = startX + idx * gap;
      const y = startY;
      const scaleW = (GAME_CONFIG.FRAGMENT_WIDTH * 0.3) / GAME_CONFIG.FRAGMENT_WIDTH;

      const color = hslToHex(frag.hue, GAME_CONFIG.FRAGMENT_SATURATION, 60);
      const bg = this.add.rectangle(x, y, GAME_CONFIG.FRAGMENT_WIDTH * 0.3, GAME_CONFIG.FRAGMENT_HEIGHT * 0.3, color, 0.8);
      bg.setStrokeStyle(1, hslToHex(frag.hue, GAME_CONFIG.FRAGMENT_SATURATION, 80), 0.9);
      bg.setScale(scaleW * 0.9, 0.9);
      this.backpackContainer.add(bg);
      this.backpackUI.push(bg);
    });
  }

  private createPuzzleButton(w: number): void {
    this.puzzleBtn = this.add.container(w - 120, 60);
    this.puzzleBtn.setDepth(160);
    this.puzzleBtn.setScrollFactor(0);

    const bg = this.add.rectangle(0, 0, 160, 40, 0x2244aa, 0.8);
    bg.setStrokeStyle(2, 0x6699ff, 0.9);
    const text = this.add.text(0, 0, '拼接古卷 [Tab]', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '16px',
      color: '#ffffff'
    });
    text.setOrigin(0.5);

    this.puzzleBtn.add([bg, text]);
    this.puzzleBtn.setSize(160, 40);
    this.puzzleBtn.setInteractive({ useHandCursor: true });

    this.puzzleBtn.on('pointerover', () => bg.setFillStyle(0x3366cc, 0.9));
    this.puzzleBtn.on('pointerout', () => bg.setFillStyle(0x2244aa, 0.8));
    this.puzzleBtn.on('pointerdown', () => this.openPuzzleScene());
  }

  private setupInput(): void {
    const kb = this.input.keyboard!;
    this.wasd = {
      W: kb.addKey('W'),
      A: kb.addKey('A'),
      S: kb.addKey('S'),
      D: kb.addKey('D'),
      E: kb.addKey('E')
    };

    const tab = kb.addKey('TAB');
    tab.on('down', () => this.openPuzzleScene());

    kb.on('keydown-E', () => this.tryPickupFragment());
  }

  private setupCamera(w: number, h: number): void {
    this.cameras.main.setBounds(0, 0, w, h);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
  }

  private openPuzzleScene(): void {
    if (this.backpack.length < 2) {
      this.showHint('至少收集2块碎片才能拼接！', 1500);
      return;
    }
    this.scene.pause();
    this.scene.launch('PuzzleScene', {
      fragments: this.backpack.map(f => ({ ...f })),
      level: this.currentLevel
    });
  }

  private onResume(_scene: Phaser.Scene, data: { completed: boolean; fragments: PuzzleFragment[] }): void {
    if (data && data.completed) {
      this.showHint('古卷拼合成功！传送门已激活！', 2500);
      audioManager.playArpeggio();
      this.triggerScreenShake(2, 100);
      this.spawnPortal();
    }
    if (data && data.fragments) {
      this.backpack = data.fragments.filter(f => f.collected);
      this.refreshBackpackUI();
    }
  }

  private spawnPortal(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const px = w - 150;
    const py = h / 2;

    this.portal = this.add.container(px, py);
    this.portal.setDepth(40);
    this.portalJellies = [];

    for (let i = 0; i < GAME_CONFIG.PORTAL_JELLY_COUNT; i++) {
      const angle = (i / GAME_CONFIG.PORTAL_JELLY_COUNT) * Math.PI * 2;
      const r = GAME_CONFIG.PORTAL_RADIUS * randomRange(0.6, 1.0);
      const jx = Math.cos(angle) * r;
      const jy = Math.sin(angle) * r;
      const size = randomRange(8, 18);

      const jelly = this.add.circle(jx, jy, size, hslToHex(180, 80, 65), randomRange(0.3, 0.6));
      jelly.setData('baseAngle', angle);
      jelly.setData('baseRadius', r);
      jelly.setData('size', size);
      this.portal.add(jelly);
      this.portalJellies.push(jelly);
    }

    const core = this.add.circle(0, 0, 30, hslToHex(180, 100, 75), 0.6);
    this.portal.add(core);
    this.portalActive = true;
    audioManager.playPortalHum();
  }

  private showHint(msg: string, duration: number = 2000): void {
    this.hintText.setText(msg);
    this.hintText.setAlpha(1);
    this.tweens.add({
      targets: this.hintText,
      alpha: 0,
      duration: duration,
      ease: 'Quad.easeInOut',
      delay: duration * 0.5
    });
  }

  private triggerScreenShake(intensity: number, duration: number): void {
    this.cameraShake = duration;
    const startTime = this.time.now;
    const totalTime = duration;

    this.tweens.addCounter({
      from: 1,
      to: 0,
      duration: totalTime,
      ease: 'Quad.easeOut',
      onUpdate: (tween) => {
        const progress = tween.getValue() ?? 0;
        this.shakeOffsetX = (Math.random() - 0.5) * intensity * 2 * progress;
        this.shakeOffsetY = (Math.random() - 0.5) * intensity * 2 * progress;
      },
      onComplete: () => {
        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;
      }
    });
  }

  private tryPickupFragment(): void {
    if (this.isGameOver) return;
    if (!this.nearbyFragment || this.nearbyFragment.collected) return;

    const frag = this.nearbyFragment;
    frag.collected = true;
    this.backpack.push(frag);

    const idx = this.fragmentData.findIndex(f => f.id === frag.id);
    if (idx >= 0) {
      const visual = this.fragments[idx];
      this.tweens.add({
        targets: visual,
        scale: 0.3,
        alpha: 0,
        duration: 200,
        ease: GAME_CONFIG.EASING,
        onComplete: () => {
          visual.destroy();
        }
      });

      audioManager.playPickup();
      this.refreshBackpackUI();

      const collected = this.fragmentData.filter(f => f.collected).length;
      const total = this.fragmentData.length;
      this.showHint(`已收集 ${collected}/${total} 碎片！按 Tab 拼接`, 1500);

      if (collected === total && !this.portalActive) {
        setTimeout(() => {
          if (!this.portalActive && collected === this.backpack.length) {
            this.showHint('所有碎片已收集！按 Tab 开始拼接', 2500);
          }
        }, 800);
      }
    }
  }

  private updateNearbyFragment(): void {
    let closest: PuzzleFragment | null = null;
    let closestDist = Infinity;

    this.fragmentData.forEach((frag, idx) => {
      if (frag.collected) return;
      const d = distance(this.player.x, this.player.y, frag.x, frag.y);
      if (d < GAME_CONFIG.PICKUP_DISTANCE && d < closestDist) {
        closestDist = d;
        closest = frag;
      }

      const visual = this.fragments[idx];
      if (!visual || visual.scene === undefined) return;

      if (d < GAME_CONFIG.PICKUP_DISTANCE) {
        visual.setData('isGlowing', true);
      } else {
        visual.setData('isGlowing', false);
        visual.setAlpha(1);
      }
    });

    this.nearbyFragment = closest;

    this.fragments.forEach(visual => {
      if (!visual || visual.scene === undefined) return;
      if (visual.getData('isGlowing')) {
        const t = (this.time.now / 1000) * Math.PI * 2;
        visual.setAlpha(0.3 + (Math.sin(t) + 1) * 0.35);
      }
    });

    if (closest) {
      this.hintText.setAlpha(1);
      this.hintText.setText('按 E 拾取碎片');
      this.hintText.setY(100);
    }
  }

  private checkUnderflow(dt: number): void {
    this.inUnderflow = false;

    for (const zone of this.underflowZones) {
      if (distance(this.player.x, this.player.y, zone.x, zone.y) < zone.radius) {
        this.inUnderflow = true;
        break;
      }
    }

    if (this.inUnderflow) {
      const now = this.time.now;
      if (now - this.lastUnderflowDamage >= GAME_CONFIG.UNDERFLOW_DAMAGE_INTERVAL) {
        this.lightRadius = Math.max(GAME_CONFIG.MIN_LIGHT_RADIUS, this.lightRadius - GAME_CONFIG.UNDERFLOW_LIGHT_DAMAGE);
        this.lastUnderflowDamage = now;

        if (this.lightRadius <= GAME_CONFIG.MIN_LIGHT_RADIUS) {
          this.gameOver();
          return;
        }
      }
    }

    this.underflowVisuals.forEach(v => {
      const pulse = 1 + Math.sin(this.time.now / 500) * 0.05;
      v.setScale(pulse);
    });
  }

  private checkPortalEntry(): void {
    if (!this.portalActive || !this.portal || this.isGameOver) return;
    const dist = distance(this.player.x, this.player.y, this.portal.x, this.portal.y);
    if (dist < 50) {
      this.enterPortal();
    }
  }

  private enterPortal(): void {
    audioManager.playPortalHum();
    if (this.currentLevel >= GAME_CONFIG.TOTAL_LEVELS) {
      this.victory();
      return;
    }
    this.scene.restart({ level: this.currentLevel + 1 });
  }

  private victory(): void {
    this.isGameOver = true;
    const w = this.scale.width;
    const h = this.scale.height;

    const overlay = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0);
    overlay.setDepth(300);

    this.tweens.add({
      targets: overlay,
      alpha: 0.9,
      duration: 1000,
      ease: 'Quad.easeInOut'
    });

    const text = this.add.text(w / 2, h / 2 - 40, '古卷重现天日！', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '48px',
      color: '#ffd700',
      stroke: '#332200',
      strokeThickness: 4
    });
    text.setOrigin(0.5);
    text.setDepth(301);
    text.setAlpha(0);
    this.tweens.add({
      targets: text,
      alpha: 1,
      duration: 1000,
      delay: 500,
      ease: 'Quad.easeInOut'
    });

    const subText = this.add.text(w / 2, h / 2 + 30, '水母的秘密已被揭开', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '24px',
      color: '#88ccff'
    });
    subText.setOrigin(0.5);
    subText.setDepth(301);
    subText.setAlpha(0);
    this.tweens.add({
      targets: subText,
      alpha: 1,
      duration: 1000,
      delay: 1200,
      ease: 'Quad.easeInOut'
    });

    const btn = this.createRestartButton(w / 2, h / 2 + 120, '再次冒险');
    btn.setDepth(302);
    btn.setAlpha(0);
    this.tweens.add({
      targets: btn,
      alpha: 1,
      duration: 1000,
      delay: 1800,
      ease: 'Quad.easeInOut'
    });
  }

  private gameOver(): void {
    if (this.isGameOver) return;
    this.isGameOver = true;
    audioManager.playGameOver();

    const w = this.scale.width;
    const h = this.scale.height;

    this.gameOverOverlay = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0);
    this.gameOverOverlay.setDepth(300);

    this.tweens.add({
      targets: this.gameOverOverlay,
      alpha: 1,
      duration: 1000,
      ease: 'Quad.easeInOut'
    });

    this.gameOverText = this.add.text(w / 2, h / 2 - 40, '被遗忘在深海', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '48px',
      color: '#6688aa',
      stroke: '#001122',
      strokeThickness: 4
    });
    this.gameOverText.setOrigin(0.5);
    this.gameOverText.setDepth(301);
    this.gameOverText.setAlpha(0);
    this.tweens.add({
      targets: this.gameOverText,
      alpha: 1,
      duration: 1000,
      delay: 500,
      ease: 'Quad.easeInOut'
    });

    this.restartButton = this.createRestartButton(w / 2, h / 2 + 60, '重新开始');
    this.restartButton.setDepth(302);
    this.restartButton.setAlpha(0);
    this.tweens.add({
      targets: this.restartButton,
      alpha: 1,
      duration: 1000,
      delay: 1200,
      ease: 'Quad.easeInOut'
    });
  }

  private createRestartButton(x: number, y: number, label: string): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, 200, 50, 0x224466, 0.9);
    bg.setStrokeStyle(2, 0x66aacc, 1);
    const text = this.add.text(0, 0, label, {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '22px',
      color: '#ffffff'
    });
    text.setOrigin(0.5);
    container.add([bg, text]);
    container.setSize(200, 50);
    container.setInteractive({ useHandCursor: true });
    container.on('pointerover', () => bg.setFillStyle(0x3366aa, 1));
    container.on('pointerout', () => bg.setFillStyle(0x224466, 0.9));
    container.on('pointerdown', () => this.scene.restart({ level: 1 }));
    return container;
  }

  update(time: number, delta: number): void {
    if (this.isGameOver) return;

    const dt = delta / 1000;

    this.updatePlayer(dt);
    this.updateLight(dt);
    this.updateNearbyFragment();
    this.checkUnderflow(dt);
    this.checkPortalEntry();
    this.updateParticles(dt);
    this.updatePortal(time);
    this.updateHUD();
  }

  private updatePlayer(dt: number): void {
    const speed = GAME_CONFIG.PLAYER_SPEED * (this.inUnderflow ? 0.5 : 1);
    let vx = 0, vy = 0;

    if (this.wasd.W.isDown) vy -= 1;
    if (this.wasd.S.isDown) vy += 1;
    if (this.wasd.A.isDown) vx -= 1;
    if (this.wasd.D.isDown) vx += 1;

    if (vx !== 0 || vy !== 0) {
      const len = Math.sqrt(vx * vx + vy * vy);
      vx = (vx / len) * speed * dt;
      vy = (vy / len) * speed * dt;
    }

    const newX = Phaser.Math.Clamp(this.player.x + vx, 50, this.scale.width - 50);
    const newY = Phaser.Math.Clamp(this.player.y + vy, 50, this.scale.height - 50);

    this.player.setPosition(newX, newY);
    this.lightTargetX = newX;
    this.lightTargetY = newY;

    if (vx !== 0 || vy !== 0) {
      this.player.setRotation(Math.atan2(vy, vx) + Math.PI / 2);
      this.disturbParticles(newX, newY);
    }
  }

  private disturbParticles(px: number, py: number): void {
    for (const p of this.particles) {
      const d = distance(px, py, p.baseX + p.offsetX, p.baseY + p.offsetY);
      if (d < 100) {
        const influence = 1 - d / 100;
        const dx = (p.baseX + p.offsetX - px) / (d || 1);
        const dy = (p.baseY + p.offsetY - py) / (d || 1);
        p.offsetX += dx * 10 * influence;
        p.offsetY += dy * 10 * influence;
      }
    }
  }

  private updateLight(dt: number): void {
    const lerp = 0.1;
    this.smoothLightX += (this.lightTargetX - this.smoothLightX) * lerp;
    this.smoothLightY += (this.lightTargetY - this.smoothLightY) * lerp;
    this.updateLightMaskTexture();
  }

  private updateParticles(dt: number): void {
    const w = this.scale.width;
    const h = this.scale.height;

    for (const p of this.particles) {
      p.baseX += p.vx * dt;
      p.baseY += p.vy * dt;

      p.offsetX *= 0.95;
      p.offsetY *= 0.95;

      if (p.baseX < -20) p.baseX = w + 20;
      if (p.baseX > w + 20) p.baseX = -20;
      if (p.baseY < -20) p.baseY = h + 20;
      if (p.baseY > h + 20) p.baseY = -20;

      const x = p.baseX + p.offsetX;
      const y = p.baseY + p.offsetY;
      p.sprite.setPosition(x, y);

      if (p.type === 'bubble') {
        const scale = 1 + Math.sin((this.time.now / 1000 + p.baseX) * 2) * 0.1;
        p.sprite.setScale(scale);
      }
    }
  }

  private updatePortal(time: number): void {
    if (!this.portal || !this.portalActive) return;

    const t = time / 1000;
    this.portalJellies.forEach((jelly, i) => {
      const baseAngle = jelly.getData('baseAngle') as number;
      const baseRadius = jelly.getData('baseRadius') as number;
      const baseSize = jelly.getData('size') as number;

      const angle = baseAngle + t * 0.8;
      const pulse = 1 + Math.sin(t * 2 + i) * 0.2;
      const r = baseRadius * pulse;

      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;

      jelly.setPosition(x, y);
      jelly.setScale(pulse);
      jelly.setAlpha(0.3 + (Math.sin(t * 3 + i * 0.5) + 1) * 0.15);
    });
  }

  private updateHUD(): void {
    const collected = this.fragmentData.filter(f => f.collected).length;
    const total = this.fragmentData.length;
    const lightPct = Math.round(((this.lightRadius - GAME_CONFIG.MIN_LIGHT_RADIUS) / (GAME_CONFIG.BASE_LIGHT_RADIUS - GAME_CONFIG.MIN_LIGHT_RADIUS)) * 100);

    this.hudText.setText(
      `第 ${this.currentLevel}/${GAME_CONFIG.TOTAL_LEVELS} 层 | 碎片 ${collected}/${total} | 视野 ${lightPct}% | WASD移动 E拾取 Tab拼接`
    );

    if (this.inUnderflow) {
      this.hudText.setColor('#ff6666');
    } else {
      this.hudText.setColor('#88ccff');
    }
  }
}
