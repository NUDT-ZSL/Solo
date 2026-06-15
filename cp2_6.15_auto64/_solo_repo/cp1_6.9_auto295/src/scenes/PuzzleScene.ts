import Phaser from 'phaser';
import {
  GAME_CONFIG,
  PuzzleFragment,
  hslToHex,
  distance,
  angleDiff,
  randomRange
} from '../types.js';
import { audioManager } from '../audio.js';

interface DraggableFragment {
  data: PuzzleFragment;
  container: Phaser.GameObjects.Container;
  halo: Phaser.GameObjects.Rectangle | null;
  isDragging: boolean;
  dragOffsetX: number;
  dragOffsetY: number;
}

interface GoldParticle {
  sprite: Phaser.GameObjects.Arc;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  startSize: number;
  endSize: number;
}

export class PuzzleScene extends Phaser.Scene {
  private fragments: PuzzleFragment[] = [];
  private draggables: DraggableFragment[] = [];
  private currentLevel: number = 1;

  private puzzleArea!: Phaser.GameObjects.Rectangle;
  private puzzleCenterX: number = 0;
  private puzzleCenterY: number = 0;

  private dragging: DraggableFragment | null = null;
  private snapGroups: Map<number, number[]> = new Map();

  private goldParticles: GoldParticle[] = [];
  private particleContainer!: Phaser.GameObjects.Container;

  private isCompleted: boolean = false;
  private completedGroup: Phaser.GameObjects.Container | null = null;

  private backBtn!: Phaser.GameObjects.Container;
  private helpText!: Phaser.GameObjects.Text;
  private titleText!: Phaser.GameObjects.Text;
  private progressText!: Phaser.GameObjects.Text;

  private targetRectX: number = 0;
  private targetRectY: number = 0;
  private targetRectW: number = 0;
  private targetRectH: number = 0;

  private shakeTimer: number = 0;
  private shakeIntensity: number = 0;

  constructor() {
    super({ key: 'PuzzleScene' });
  }

  init(data: { fragments: PuzzleFragment[]; level: number }): void {
    this.fragments = data.fragments || [];
    this.currentLevel = data.level || 1;
    this.isCompleted = false;
    this.snapGroups.clear();
    this.draggables = [];
    this.goldParticles = [];
    this.dragging = null;
  }

  create(): void {
    const w = this.scale.width;
    const h = this.scale.height;

    this.createBackground(w, h);
    this.createUI(w, h);
    this.setupPuzzleArea(w, h);
    this.createFragmentTargets();
    this.createDraggableFragments();
    this.setupInput();
  }

  private createBackground(w: number, h: number): void {
    const bg = this.add.graphics();
    const gradientSteps = 20;
    for (let i = 0; i < gradientSteps; i++) {
      const t = i / gradientSteps;
      const r = Math.floor(10 + (3 - 10) * t);
      const g = Math.floor(22 + (8 - 22) * t);
      const b = Math.floor(40 + (15 - 40) * t);
      const color = (r << 16) | (g << 8) | b;
      const y = (h / gradientSteps) * i;
      bg.fillStyle(color, 0.95);
      bg.fillRect(0, y, w, h / gradientSteps + 1);
    }
    bg.setDepth(-100);
  }

  private createUI(w: number, h: number): void {
    this.titleText = this.add.text(w / 2, 50, '古卷拼接 - 第 ' + this.currentLevel + ' 层', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '28px',
      color: '#ffd700',
      stroke: '#332200',
      strokeThickness: 3
    });
    this.titleText.setOrigin(0.5);
    this.titleText.setDepth(100);

    this.helpText = this.add.text(w / 2, 95, '左键拖拽移动 | 右键旋转15° | 边缘自动吸附', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '16px',
      color: '#88aacc'
    });
    this.helpText.setOrigin(0.5);
    this.helpText.setDepth(100);

    this.progressText = this.add.text(w / 2, 125, '', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '18px',
      color: '#aaffaa'
    });
    this.progressText.setOrigin(0.5);
    this.progressText.setDepth(100);
    this.updateProgressText();

    this.backBtn = this.add.container(80, 60);
    this.backBtn.setDepth(100);
    const btnBg = this.add.rectangle(0, 0, 140, 40, 0x334466, 0.9);
    btnBg.setStrokeStyle(2, 0x6688aa, 1);
    const btnText = this.add.text(0, 0, '← 返回探索', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '16px',
      color: '#ffffff'
    });
    btnText.setOrigin(0.5);
    this.backBtn.add([btnBg, btnText]);
    this.backBtn.setSize(140, 40);
    this.backBtn.setInteractive({ useHandCursor: true });

    this.backBtn.on('pointerover', () => btnBg.setFillStyle(0x4466aa, 1));
    this.backBtn.on('pointerout', () => btnBg.setFillStyle(0x334466, 0.9));
    this.backBtn.on('pointerdown', () => this.closePuzzle(false));

    this.particleContainer = this.add.container(0, 0);
    this.particleContainer.setDepth(80);
  }

  private setupPuzzleArea(w: number, h: number): void {
    this.puzzleCenterX = w / 2;
    this.puzzleCenterY = h / 2 + 30;

    const areaW = Math.min(w * 0.75, 1200);
    const areaH = Math.min(h * 0.7, 700);

    this.puzzleArea = this.add.rectangle(
      this.puzzleCenterX,
      this.puzzleCenterY,
      areaW,
      areaH,
      0x0a1628,
      0.5
    );
    this.puzzleArea.setStrokeStyle(2, 0x447799, 0.6);
    this.puzzleArea.setDepth(-1);

    const gridLines = this.add.graphics();
    gridLines.setDepth(0);
    gridLines.lineStyle(1, 0x224466, 0.3);
    const gridStep = 50;
    for (let gx = this.puzzleCenterX - areaW / 2; gx <= this.puzzleCenterX + areaW / 2; gx += gridStep) {
      gridLines.lineBetween(gx, this.puzzleCenterY - areaH / 2, gx, this.puzzleCenterY + areaH / 2);
    }
    for (let gy = this.puzzleCenterY - areaH / 2; gy <= this.puzzleCenterY + areaH / 2; gy += gridStep) {
      gridLines.lineBetween(this.puzzleCenterX - areaW / 2, gy, this.puzzleCenterX + areaW / 2, gy);
    }
  }

  private createFragmentTargets(): void {
    const count = this.fragments.length;
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);

    const gap = 6;
    const fragW = GAME_CONFIG.FRAGMENT_WIDTH;
    const fragH = GAME_CONFIG.FRAGMENT_HEIGHT;

    const totalW = cols * fragW + (cols - 1) * gap;
    const totalH = rows * fragH + (rows - 1) * gap;

    this.targetRectW = totalW;
    this.targetRectH = totalH;
    this.targetRectX = this.puzzleCenterX - totalW / 2;
    this.targetRectY = this.puzzleCenterY - totalH / 2;

    this.fragments.forEach((frag, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      frag.targetX = this.targetRectX + col * (fragW + gap) + fragW / 2;
      frag.targetY = this.targetRectY + row * (fragH + gap) + fragH / 2;
      frag.targetRotation = 0;
      frag.snapped = false;
      frag.snapToId = null;
    });
  }

  private createDraggableFragments(): void {
    const areaRadiusX = Math.min(this.scale.width * 0.35, 400);
    const areaRadiusY = Math.min(this.scale.height * 0.3, 280);

    this.fragments.forEach((frag) => {
      frag.x = this.puzzleCenterX + randomRange(-areaRadiusX, areaRadiusX);
      frag.y = this.puzzleCenterY + randomRange(-areaRadiusY, areaRadiusY);
      frag.rotation = randomRange(-30, 30);
      frag.snapped = false;
      frag.snapToId = null;

      const container = this.createFragmentVisual(frag);
      this.setupDragInteraction(container, frag);

      const draggable: DraggableFragment = {
        data: frag,
        container,
        halo: null,
        isDragging: false,
        dragOffsetX: 0,
        dragOffsetY: 0
      };

      this.draggables.push(draggable);
      this.checkSnapForFragment(draggable);
    });
  }

  private createFragmentVisual(frag: PuzzleFragment): Phaser.GameObjects.Container {
    const container = this.add.container(frag.x, frag.y);
    container.setDepth(10);
    container.setRotation(Phaser.Math.DegToRad(frag.rotation));

    const color = hslToHex(frag.hue, GAME_CONFIG.FRAGMENT_SATURATION, 55);
    const borderColor = hslToHex(frag.hue, GAME_CONFIG.FRAGMENT_SATURATION, 75);
    const glowColor = hslToHex(frag.hue, 90, 85);

    const shadow = this.add.rectangle(3, 5, frag.width, frag.height, 0x000000, 0.35);
    const bg = this.add.rectangle(0, 0, frag.width, frag.height, color, GAME_CONFIG.FRAGMENT_ALPHA + 0.1);
    const border = this.add.rectangle(0, 0, frag.width, frag.height, 0x000000, 0);
    border.setStrokeStyle(3, borderColor, 0.9);

    const symbolCount = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < symbolCount; i++) {
      const sx = randomRange(-frag.width * 0.38, frag.width * 0.38);
      const sy = randomRange(-frag.height * 0.35, frag.height * 0.35);
      const symColor = glowColor;

      const symType = Math.floor(Math.random() * 4);
      if (symType === 0) {
        const s = this.add.circle(sx, sy, randomRange(5, 10), symColor, 0.85);
        container.add(s);
      } else if (symType === 1) {
        const s = this.add.star(sx, sy, 5, 5, 10, symColor, 0.85);
        container.add(s);
      } else if (symType === 2) {
        const s = this.add.triangle(
          sx, sy - 6, sx - 7, sy + 6, sx + 7, sy + 6, symColor, 0.85
        );
        container.add(s);
      } else {
        const lineLen = randomRange(10, 22);
        const ang = randomRange(0, Math.PI * 2);
        const s = this.add.line(
          sx, sy,
          -Math.cos(ang) * lineLen / 2, -Math.sin(ang) * lineLen / 2,
          Math.cos(ang) * lineLen / 2, Math.sin(ang) * lineLen / 2,
          symColor, 0.9
        );
        s.setLineWidth(2);
        container.add(s);
      }
    }

    container.add([shadow, bg, border]);
    container.setData('fragment', frag);
    return container;
  }

  private setupDragInteraction(container: Phaser.GameObjects.Container, frag: PuzzleFragment): void {
    container.setInteractive({
      draggable: true,
      useHandCursor: true
    });

    container.on('dragstart', (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      if (this.isCompleted) return;
      const draggable = this.draggables.find(d => d.container === container);
      if (draggable) {
        if (draggable.halo) {
          draggable.halo.destroy();
          draggable.halo = null;
        }
        this.dragging = draggable;
        draggable.isDragging = true;
        draggable.data.snapped = false;
        draggable.data.snapToId = null;
        container.setDepth(50);
        this.removeFromSnapGroup(frag.id);
      }
    });

    container.on('drag', (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      if (this.isCompleted) return;
      const w = this.scale.width;
      const h = this.scale.height;
      const clampedX = Phaser.Math.Clamp(dragX, 80, w - 80);
      const clampedY = Phaser.Math.Clamp(dragY, 160, h - 40);
      container.setPosition(clampedX, clampedY);
      frag.x = clampedX;
      frag.y = clampedY;
    });

    container.on('dragend', () => {
      if (this.isCompleted) return;
      const draggable = this.draggables.find(d => d.container === container);
      if (draggable) {
        draggable.isDragging = false;
        this.dragging = null;
        container.setDepth(10);
        this.checkSnapForFragment(draggable);
        this.updateProgressText();
      }
    });

    container.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isCompleted) return;
      if (pointer.rightButtonDown()) {
        const draggable = this.draggables.find(d => d.container === container);
        if (!draggable) return;
        frag.rotation = (frag.rotation + GAME_CONFIG.ROTATION_STEP) % 360;
        container.setRotation(Phaser.Math.DegToRad(frag.rotation));
        if (draggable.halo) {
          draggable.halo.destroy();
          draggable.halo = null;
        }
        draggable.data.snapped = false;
        draggable.data.snapToId = null;
        this.removeFromSnapGroup(frag.id);
        this.checkSnapForFragment(draggable);
        this.updateProgressText();
      }
    });
  }

  private checkSnapForFragment(draggable: DraggableFragment): void {
    const frag = draggable.data;

    const distToTarget = distance(frag.x, frag.y, frag.targetX, frag.targetY);
    const angleToTarget = angleDiff(frag.rotation, frag.targetRotation);

    if (distToTarget < GAME_CONFIG.SNAP_DISTANCE && angleToTarget < GAME_CONFIG.SNAP_ANGLE) {
      this.performSnap(draggable, frag.targetX, frag.targetY, 0);
      frag.snapped = true;
      this.addToSnapGroup(frag.id, frag.id);
      audioManager.playWaterDrop();
      return;
    }

    for (const other of this.draggables) {
      if (other === draggable || !other.data.snapped) continue;

      const relPositions = this.getEdgeRelativePositions(frag, other.data);
      for (const rel of relPositions) {
        const testX = other.data.x + rel.dx;
        const testY = other.data.y + rel.dy;
        const testDist = distance(frag.x, frag.y, testX, testY);
        const testAngle = angleDiff(frag.rotation, other.data.rotation + rel.dRot);

        if (testDist < GAME_CONFIG.SNAP_DISTANCE * 2 && testAngle < GAME_CONFIG.SNAP_ANGLE * 2) {
          const finalX = other.data.x + rel.dx;
          const finalY = other.data.y + rel.dy;
          const finalRot = other.data.rotation + rel.dRot;

          this.performSnap(draggable, finalX, finalY, finalRot);
          frag.snapped = true;
          frag.snapToId = other.data.id;
          this.addToSnapGroup(frag.id, other.data.id);
          audioManager.playWaterDrop();
          return;
        }
      }
    }
  }

  private getEdgeRelativePositions(frag1: PuzzleFragment, frag2: PuzzleFragment): { dx: number; dy: number; dRot: number }[] {
    const w = GAME_CONFIG.FRAGMENT_WIDTH;
    const h = GAME_CONFIG.FRAGMENT_HEIGHT;
    const gap = 6;

    const results: { dx: number; dy: number; dRot: number }[] = [];

    results.push({ dx: w + gap, dy: 0, dRot: 0 });
    results.push({ dx: -(w + gap), dy: 0, dRot: 0 });
    results.push({ dx: 0, dy: h + gap, dRot: 0 });
    results.push({ dx: 0, dy: -(h + gap), dRot: 0 });

    results.push({ dx: w + gap, dy: h + gap, dRot: 0 });
    results.push({ dx: -(w + gap), dy: h + gap, dRot: 0 });
    results.push({ dx: w + gap, dy: -(h + gap), dRot: 0 });
    results.push({ dx: -(w + gap), dy: -(h + gap), dRot: 0 });

    return results;
  }

  private performSnap(draggable: DraggableFragment, targetX: number, targetY: number, targetRotation: number): void {
    const frag = draggable.data;

    this.tweens.add({
      targets: draggable.container,
      x: targetX,
      y: targetY,
      rotation: Phaser.Math.DegToRad(targetRotation),
      duration: 180,
      ease: 'Quad.easeOut'
    });

    frag.x = targetX;
    frag.y = targetY;
    frag.rotation = targetRotation;

    if (draggable.halo) draggable.halo.destroy();

    const halo = this.add.rectangle(
      targetX, targetY,
      frag.width + GAME_CONFIG.SNAP_HALO_WIDTH * 2,
      frag.height + GAME_CONFIG.SNAP_HALO_WIDTH * 2,
      0x000000, 0
    );
    halo.setStrokeStyle(
      GAME_CONFIG.SNAP_HALO_WIDTH,
      hslToHex(45, 100, 65),
      GAME_CONFIG.SNAP_HALO_ALPHA
    );
    halo.setDepth(draggable.container.depth - 1);
    halo.rotation = Phaser.Math.DegToRad(targetRotation);
    draggable.halo = halo;

    this.triggerScreenShake(2, 100);

    setTimeout(() => this.checkCompletion(), 200);
  }

  private addToSnapGroup(id: number, groupId: number): void {
    let group = this.snapGroups.get(groupId);
    if (!group) {
      group = [groupId];
      this.snapGroups.set(groupId, group);
    }
    if (!group.includes(id)) group.push(id);
  }

  private removeFromSnapGroup(id: number): void {
    for (const [groupId, members] of this.snapGroups) {
      const idx = members.indexOf(id);
      if (idx >= 0) {
        members.splice(idx, 1);
        if (members.length <= 1) {
          this.snapGroups.delete(groupId);
        }
        break;
      }
    }
  }

  private checkCompletion(): void {
    const allSnapped = this.draggables.every(d => d.data.snapped);
    if (!allSnapped || this.isCompleted) return;

    this.isCompleted = true;
    this.playCompletionAnimation();
  }

  private playCompletionAnimation(): void {
    const cx = this.puzzleCenterX;
    const cy = this.puzzleCenterY;

    this.completedGroup = this.add.container(cx, cy);
    this.completedGroup.setDepth(60);

    const tweenTargets: Phaser.GameObjects.GameObject[] = [
      ...this.draggables.map(d => d.container),
      ...this.draggables.filter(d => d.halo).map(d => d.halo!)
    ];
    const scaleTween = this.tweens.add({
      targets: tweenTargets,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 250,
      ease: 'Quad.easeInOut',
      yoyo: true,
      hold: 0,
      onComplete: () => {
        if (this.completedGroup) {
          this.completedGroup.setScale(1);
        }
      }
    });

    this.spawnGoldParticleFountain(cx, cy, 150);
    audioManager.playArpeggio();
    this.triggerScreenShake(3, 200);

    this.time.delayedCall(800, () => {
      this.showCompletionUI();
    });
  }

  private spawnGoldParticleFountain(centerX: number, centerY: number, count: number): void {
    const colors = [
      hslToHex(45, 100, 70),
      hslToHex(40, 100, 75),
      hslToHex(50, 100, 65),
      hslToHex(35, 95, 80)
    ];

    for (let i = 0; i < count; i++) {
      const size = randomRange(4, 8);
      const color = colors[Math.floor(Math.random() * colors.length)];
      const alpha = randomRange(0.7, 1);

      const sprite = this.add.circle(centerX, centerY, size, color, alpha);
      this.particleContainer.add(sprite);

      const angle = randomRange(-Math.PI * 0.85, -Math.PI * 0.15);
      const speed = randomRange(80, 150);

      this.goldParticles.push({
        sprite,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: randomRange(1.2, 2.0),
        startSize: size,
        endSize: 2
      });
    }
  }

  private showCompletionUI(): void {
    const w = this.scale.width;
    const h = this.scale.height;

    const banner = this.add.container(w / 2, h - 100);
    banner.setDepth(200);

    const bannerBg = this.add.rectangle(0, 0, 500, 120, 0x0a1a33, 0.95);
    bannerBg.setStrokeStyle(3, 0xffd700, 0.9);
    const successText = this.add.text(0, -25, '古卷拼合成功！', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '32px',
      color: '#ffd700',
      stroke: '#332200',
      strokeThickness: 3
    });
    successText.setOrigin(0.5);

    const nextBtn = this.add.container(0, 35);
    const btnBg = this.add.rectangle(0, 0, 200, 44, 0x226622, 0.95);
    btnBg.setStrokeStyle(2, 0x88ff88, 1);
    const btnText = this.add.text(0, 0, '返回并进入下一层 →', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '18px',
      color: '#ffffff'
    });
    btnText.setOrigin(0.5);
    nextBtn.add([btnBg, btnText]);
    nextBtn.setSize(200, 44);
    nextBtn.setInteractive({ useHandCursor: true });

    nextBtn.on('pointerover', () => btnBg.setFillStyle(0x33aa33, 1));
    nextBtn.on('pointerout', () => btnBg.setFillStyle(0x226622, 0.95));
    nextBtn.on('pointerdown', () => this.closePuzzle(true));

    banner.add([bannerBg, successText, nextBtn]);

    banner.setAlpha(0);
    this.tweens.add({
      targets: banner,
      alpha: 1,
      duration: 500,
      ease: 'Quad.easeIn'
    });
  }

  private triggerScreenShake(intensity: number, duration: number): void {
    this.shakeIntensity = intensity;
    this.shakeTimer = duration;

    const startTime = this.time.now;
    const totalTime = duration;
    this.tweens.addCounter({
      from: 1,
      to: 0,
      duration: totalTime,
      ease: 'Quad.easeOut',
      onUpdate: (tween) => {
        const progress = tween.getValue() ?? 0;
        const ox = (Math.random() - 0.5) * intensity * 2 * progress;
        const oy = (Math.random() - 0.5) * intensity * 2 * progress;
        this.cameras.main.setScroll(ox, oy);
      },
      onComplete: () => {
        this.cameras.main.setScroll(0, 0);
      }
    });
  }

  private updateProgressText(): void {
    const total = this.draggables.length;
    const snapped = this.draggables.filter(d => d.data.snapped).length;
    this.progressText.setText(`已吸附 ${snapped}/${total} 碎片`);
  }

  private closePuzzle(completed: boolean): void {
    const fragmentsData = this.draggables.map(d => ({ ...d.data }));
    this.scene.stop();
    this.scene.resume('UnderwaterScene', {
      completed,
      fragments: fragmentsData
    });
  }

  private setupInput(): void {
    if (this.input.mouse) {
      this.input.mouse.disableContextMenu();
    }

    const kb = this.input.keyboard!;
    const esc = kb.addKey('ESC');
    esc.on('down', () => this.closePuzzle(false));

    const tabKey = kb.addKey('TAB');
    tabKey.on('down', () => this.closePuzzle(false));
  }

  update(time: number, delta: number): void {
    const dt = delta / 1000;
    this.updateGoldParticles(dt);
  }

  private updateGoldParticles(dt: number): void {
    if (this.goldParticles.length === 0) return;

    const gravity = 80;
    const toRemove: number[] = [];

    this.goldParticles.forEach((p, idx) => {
      p.life += dt;
      p.vy += gravity * dt;
      p.sprite.x += p.vx * dt;
      p.sprite.y += p.vy * dt;

      const lifeRatio = p.life / p.maxLife;
      const currentSize = p.startSize + (p.endSize - p.startSize) * lifeRatio;
      p.sprite.setRadius(Math.max(1, currentSize));
      p.sprite.setAlpha(Math.max(0, 1 - lifeRatio));

      if (p.life >= p.maxLife) {
        p.sprite.destroy();
        toRemove.push(idx);
      }
    });

    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.goldParticles.splice(toRemove[i], 1);
    }
  }
}
