import Phaser from 'phaser';
import { Guardian, type Projectile } from '../entities/Guardian';
import { ShadowCreature } from '../entities/ShadowCreature';
import { Quadtree, type QuadtreeItem } from '../utils/Quadtree';
import { ParticlePool } from '../utils/ParticlePool';
import {
  CANVAS_WIDTH, CANVAS_HEIGHT, SLOTS, PATH_POINTS, WAVES,
  INITIAL_CARD_COUNTS, INITIAL_LIVES, TOTAL_WAVES,
  WAVE_INTERVAL_MS, WAVE_BREAK_MS, MAX_PROJECTILES_PER_FRAME,
  FLYING_PATH
} from '../config/gameConfig';
import { ELEMENTS, ELEMENT_ORDER, checkFusion, type ElementType } from '../config/elements';

interface CardSlot {
  element: ElementType;
  count: number;
  container: Phaser.GameObjects.Container;
  icon: Phaser.GameObjects.Text;
  countText: Phaser.GameObjects.Text;
  bg: Phaser.GameObjects.Rectangle;
}

export class GameScene extends Phaser.Scene {
  particlePool!: ParticlePool;
  quadtree!: Quadtree;

  guardians: (Guardian | null)[] = [];
  creatures: ShadowCreature[] = [];
  projectiles: Projectile[] = [];
  slotContainers: Phaser.GameObjects.Container[] = [];
  slotHexes: Phaser.GameObjects.Graphics[] = [];
  slotEmblems: Phaser.GameObjects.Text[] = [];
  slotGlows: Phaser.GameObjects.Arc[] = [];

  cardSlots: CardSlot[] = [];
  draggingCard: { element: ElementType; sprite: Phaser.GameObjects.Container; validSlot: number | null } | null = null;
  validSlotHighlight: Phaser.GameObjects.Graphics | null = null;

  lives: number = INITIAL_LIVES;
  currentWave: number = 0;
  killCount: number = 0;
  waveSpawned: number = 0;
  waveKilled: number = 0;
  waveActive: boolean = false;
  waveBreakActive: boolean = false;
  waveBreakTimer: number = 0;
  spawnTimer: number = 0;
  totalTime: number = 0;

  livesIcons: Phaser.GameObjects.Text[] = [];
  waveText!: Phaser.GameObjects.Text;
  killText!: Phaser.GameObjects.Text;
  transitionText!: Phaser.GameObjects.Text;
  countdownText!: Phaser.GameObjects.Text;
  gameOverText!: Phaser.GameObjects.Text;
  projectileGraphics!: Phaser.GameObjects.Graphics;

  uiTopBg!: Phaser.GameObjects.Rectangle;
  cardPanelBg!: Phaser.GameObjects.Rectangle;

  gameOver: boolean = false;
  victory: boolean = false;

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.particlePool = new ParticlePool(this);
    this.quadtree = new Quadtree({ x: 0, y: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT });
    this.projectileGraphics = this.add.graphics();
    this.projectileGraphics.setDepth(500);

    this.createBackground();
    this.createPath();
    this.createSlots();
    this.createCardInventory();
    this.createUI();
    this.setupDrag();
    this.setupInput();

    this.guardians = new Array(SLOTS.length).fill(null);
    this.scheduleNextWave();
  }

  private createBackground(): void {
    const g = this.add.graphics();
    g.setDepth(0);
    g.fillGradientStyle(0x1a0a2e, 0x2d0a1e, 0x3d0a0a, 0x1a0a2e, 1);
    g.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    const stars = this.add.graphics();
    stars.setDepth(1);
    for (let i = 0; i < 120; i++) {
      const x = Math.random() * CANVAS_WIDTH;
      const y = Math.random() * (CANVAS_HEIGHT - 180);
      const s = Math.random() * 1.6 + 0.4;
      const a = Math.random() * 0.75 + 0.2;
      const col = i % 9 === 0 ? 0xffd700 : 0xffffff;
      stars.fillStyle(col, a);
      stars.fillCircle(x, y, s);
    }
    this.tweens.add({
      targets: stars,
      alpha: { from: 0.7, to: 1 },
      duration: 4000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut'
    });
  }

  private createPath(): void {
    const pg = this.add.graphics();
    pg.setDepth(5);
    pg.lineStyle(22, 0x2a0040, 0.45);
    pg.beginPath();
    pg.moveTo(PATH_POINTS[0].x, PATH_POINTS[0].y);
    for (let i = 1; i < PATH_POINTS.length; i++) {
      pg.lineTo(PATH_POINTS[i].x, PATH_POINTS[i].y);
    }
    pg.strokePath();
    pg.lineStyle(10, 0x6633aa, 0.55);
    pg.strokePath();
    pg.lineStyle(4, 0xffaa55, 0.45);
    pg.strokePath();

    PATH_POINTS.forEach((pt, i) => {
      const isEnd = i === PATH_POINTS.length - 1;
      const isStart = i === 0;
      if (isEnd) {
        const portal = this.add.circle(pt.x, pt.y, 28, 0xaa44ff, 0.35);
        portal.setStrokeStyle(3, 0xff88ff, 1);
        portal.setDepth(6);
        this.tweens.add({
          targets: portal,
          scale: { from: 0.8, to: 1.25 },
          alpha: { from: 0.3, to: 0.6 },
          duration: 1200,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.InOut'
        });
        const label = this.add.text(pt.x, pt.y + 48, '光门', {
          fontSize: '14px', color: '#ff99ff', fontFamily: 'Georgia, "Microsoft YaHei", serif'
        });
        label.setOrigin(0.5);
        label.setDepth(7);
      } else if (isStart) {
        const start = this.add.circle(pt.x, pt.y, 22, 0x441100, 0.4);
        start.setStrokeStyle(3, 0xff5522, 0.9);
        start.setDepth(6);
        this.tweens.add({
          targets: start,
          scale: { from: 0.9, to: 1.15 },
          duration: 900,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.InOut'
        });
      } else {
        const node = this.add.circle(pt.x, pt.y, 5, 0xffcc66, 0.85);
        node.setDepth(6);
        this.tweens.add({
          targets: node,
          alpha: { from: 0.5, to: 1 },
          duration: 800 + i * 40,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.InOut'
        });
      }
    });

    const fp = this.add.graphics();
    fp.setDepth(4);
    fp.lineStyle(3, 0x4488ff, 0.15);
    fp.setLineDash([6, 8]);
    fp.beginPath();
    fp.moveTo(FLYING_PATH[0].x, FLYING_PATH[0].y);
    fp.lineTo(FLYING_PATH[1].x, FLYING_PATH[1].y);
    fp.strokePath();
  }

  private createSlots(): void {
    SLOTS.forEach((slot, idx) => {
      const cont = this.add.container(slot.x, slot.y);
      cont.setDepth(8);
      cont.setData('slotIndex', idx);

      const glow = this.add.circle(0, 0, 48, 0xffd700, 0.06);
      glow.setStrokeStyle(2, 0xffd700, 0.25);
      cont.add(glow);

      const hex = this.add.graphics();
      hex.setDepth(8);
      const size = 40;
      const points: Phaser.Geom.Point[] = [];
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        points.push(new Phaser.Geom.Point(Math.cos(angle) * size, Math.sin(angle) * size));
      }
      hex.lineStyle(3, 0xffd700, 0.85);
      hex.fillStyle(0x1a0a2e, 0.55);
      hex.beginPath();
      hex.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < 6; i++) {
        hex.lineTo(points[i].x, points[i].y);
      }
      hex.closePath();
      hex.fillPath();
      hex.strokePath();
      hex.x = slot.x;
      hex.y = slot.y;
      this.slotHexes.push(hex);

      const emblem = this.add.text(0, 0, '✦', {
        fontSize: '22px',
        color: '#aa88ff',
        fontFamily: 'serif'
      });
      emblem.setOrigin(0.5);
      emblem.setAlpha(0.5);
      cont.add(emblem);

      this.tweens.add({
        targets: emblem,
        angle: { from: 0, to: 360 },
        duration: 12000,
        repeat: -1,
        ease: 'Linear'
      });
      this.tweens.add({
        targets: glow,
        alpha: { from: 0.05, to: 0.15 },
        scale: { from: 0.95, to: 1.05 },
        duration: 2200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut'
      });

      this.slotContainers.push(cont);
      this.slotEmblems.push(emblem);
      this.slotGlows.push(glow);
    });
  }

  private createCardInventory(): void {
    const panelY = CANVAS_HEIGHT - 80;
    const panelH = 76;
    this.cardPanelBg = this.add.rectangle(CANVAS_WIDTH / 2, panelY + 4, CANVAS_WIDTH - 28, panelH, 0xffffff, 0.06);
    this.cardPanelBg.setStrokeStyle(2, 0xffffff, 0.22);
    this.cardPanelBg.setDepth(100);
    this.cardPanelBg.setAlpha(0.98);

    const overlay = this.add.graphics();
    overlay.setDepth(99);
    overlay.fillStyle(0x110033, 0.55);
    overlay.fillRoundedRect(14, panelY - panelH / 2 + 4, CANVAS_WIDTH - 28, panelH, 14);

    const spacing = 170;
    const startX = CANVAS_WIDTH / 2 - (ELEMENT_ORDER.length - 1) * spacing / 2;

    ELEMENT_ORDER.forEach((el, i) => {
      const cfg = ELEMENTS[el];
      const x = startX + i * spacing;
      const y = panelY + 4;

      const cont = this.add.container(x, y);
      cont.setDepth(101);
      cont.setSize(120, 60);
      cont.setData('element', el);
      cont.setInteractive({ useHandCursor: true, pixelPerfect: false });

      const bg = this.add.rectangle(0, 0, 120, 60, cfg.color, 0.18);
      bg.setStrokeStyle(2, cfg.color, 0.85);
      bg.setAlpha(0.95);
      cont.add(bg);

      const innerGlow = this.add.rectangle(0, 0, 114, 54, 0xffffff, 0.05);
      cont.add(innerGlow);

      const icon = this.add.text(-26, 2, cfg.icon, { fontSize: '32px', fontFamily: 'sans-serif' });
      icon.setOrigin(0.5);
      cont.add(icon);

      const name = this.add.text(8, -12, cfg.name + '灵', {
        fontSize: '16px',
        color: '#ffffff',
        fontFamily: 'Georgia, "Microsoft YaHei", serif',
        fontStyle: 'bold'
      });
      name.setShadow(1, 1, 'rgba(0,0,0,0.6)', 0, true, false);
      cont.add(name);

      const count = INITIAL_CARD_COUNTS[el];
      const countText = this.add.text(8, 12, `× ${count}`, {
        fontSize: '18px',
        color: '#ffdd77',
        fontFamily: 'Georgia, "Microsoft YaHei", serif',
        fontStyle: 'bold'
      });
      cont.add(countText);

      cont.on('pointerover', () => {
        this.tweens.add({ targets: bg, scale: 1.05, duration: 180, ease: 'Sine.Out' });
        bg.setStrokeStyle(3, cfg.color, 1);
      });
      cont.on('pointerout', () => {
        this.tweens.add({ targets: bg, scale: 1, duration: 180, ease: 'Sine.Out' });
        bg.setStrokeStyle(2, cfg.color, 0.85);
      });

      this.cardSlots.push({
        element: el,
        count,
        container: cont,
        icon,
        countText,
        bg
      });
    });
  }

  private createUI(): void {
    this.uiTopBg = this.add.rectangle(CANVAS_WIDTH / 2, 26, CANVAS_WIDTH - 20, 44, 0x000000, 0.55);
    this.uiTopBg.setStrokeStyle(1, 0xffd700, 0.3);
    this.uiTopBg.setDepth(200);

    this.waveText = this.add.text(30, 26, `Wave 0/${TOTAL_WAVES}`, {
      fontSize: '20px',
      color: '#ffdd88',
      fontFamily: 'Georgia, "Microsoft YaHei", serif',
      fontStyle: 'bold'
    });
    this.waveText.setOrigin(0, 0.5);
    this.waveText.setDepth(201);
    this.waveText.setShadow(2, 2, 'rgba(0,0,0,0.7)', 0, true, false);

    const startX = CANVAS_WIDTH / 2 - (INITIAL_LIVES - 1) * 14;
    for (let i = 0; i < INITIAL_LIVES; i++) {
      const heart = this.add.text(startX + i * 28, 26, '❤', {
        fontSize: '22px',
        color: '#ff3355',
        fontFamily: 'sans-serif'
      });
      heart.setOrigin(0.5);
      heart.setDepth(201);
      heart.setShadow(1, 1, 'rgba(0,0,0,0.8)', 0, true, false);
      this.livesIcons.push(heart);
    }

    this.killText = this.add.text(CANVAS_WIDTH - 30, 26, `击杀: 0`, {
      fontSize: '20px',
      color: '#aaddff',
      fontFamily: 'Georgia, "Microsoft YaHei", serif',
      fontStyle: 'bold'
    });
    this.killText.setOrigin(1, 0.5);
    this.killText.setDepth(201);
    this.killText.setShadow(2, 2, 'rgba(0,0,0,0.7)', 0, true, false);

    this.transitionText = this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40, '', {
      fontSize: '52px',
      color: '#ffdd66',
      fontFamily: 'Georgia, "Microsoft YaHei", serif',
      fontStyle: 'bold',
      stroke: '#220044',
      strokeThickness: 6
    });
    this.transitionText.setOrigin(0.5);
    this.transitionText.setDepth(300);
    this.transitionText.setVisible(false);

    this.countdownText = this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30, '', {
      fontSize: '88px',
      color: '#ffffff',
      fontFamily: 'Georgia, "Microsoft YaHei", serif',
      fontStyle: 'bold',
      stroke: '#aa2244',
      strokeThickness: 6
    });
    this.countdownText.setOrigin(0.5);
    this.countdownText.setDepth(301);
    this.countdownText.setVisible(false);

    this.gameOverText = this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, '', {
      fontSize: '64px',
      fontFamily: 'Georgia, "Microsoft YaHei", serif',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 8
    });
    this.gameOverText.setOrigin(0.5);
    this.gameOverText.setDepth(400);
    this.gameOverText.setVisible(false);
  }

  private setupDrag(): void {
    this.cardSlots.forEach(cs => {
      cs.container.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (this.gameOver || this.victory) return;
        if (cs.count <= 0) {
          this.cameras.main.shake(120, 0.004);
          return;
        }
        this.startDrag(cs, pointer);
      });
    });
  }

  private startDrag(cs: CardSlot, pointer: Phaser.Input.Pointer): void {
    const cfg = ELEMENTS[cs.element];
    const dragSprite = this.add.container(pointer.x, pointer.y);
    dragSprite.setDepth(1000);
    dragSprite.setAlpha(0.75);
    dragSprite.setScale(0.95);
    const bg = this.add.rectangle(0, 0, 110, 54, cfg.color, 0.25);
    bg.setStrokeStyle(3, cfg.color, 0.95);
    dragSprite.add(bg);
    const icon = this.add.text(-24, 2, cfg.icon, { fontSize: '30px', fontFamily: 'sans-serif' });
    icon.setOrigin(0.5);
    dragSprite.add(icon);
    const name = this.add.text(10, 0, cfg.name + '灵', {
      fontSize: '18px', color: '#ffffff', fontStyle: 'bold',
      fontFamily: 'Georgia, "Microsoft YaHei", serif'
    });
    dragSprite.add(name);
    this.draggingCard = { element: cs.element, sprite: dragSprite, validSlot: null };

    this.validSlotHighlight = this.add.graphics();
    this.validSlotHighlight.setDepth(50);

    this.input.on('pointermove', this.onDragMove, this);
    this.input.on('pointerup', this.onDragEnd, this);
  }

  private onDragMove(pointer: Phaser.Input.Pointer): void {
    if (!this.draggingCard) return;
    this.draggingCard.sprite.setPosition(pointer.x, pointer.y);
    let bestSlot: number | null = null;
    let bestDist = 55 * 55;
    for (let i = 0; i < SLOTS.length; i++) {
      if (this.guardians[i]) continue;
      const s = SLOTS[i];
      const dx = pointer.x - s.x;
      const dy = pointer.y - s.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestDist) {
        bestDist = d2;
        bestSlot = i;
      }
    }
    if (this.validSlotHighlight) {
      this.validSlotHighlight.clear();
      if (bestSlot !== null) {
        const s = SLOTS[bestSlot];
        this.validSlotHighlight.lineStyle(4, 0x88ff88, 0.9);
        const size = 46;
        this.validSlotHighlight.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i - Math.PI / 6;
          const px = s.x + Math.cos(angle) * size;
          const py = s.y + Math.sin(angle) * size;
          if (i === 0) this.validSlotHighlight.moveTo(px, py);
          else this.validSlotHighlight.lineTo(px, py);
        }
        this.validSlotHighlight.closePath();
        this.validSlotHighlight.strokePath();
        this.validSlotHighlight.fillStyle(0x44ff88, 0.18);
        this.validSlotHighlight.fillPath();
      }
    }
    this.draggingCard.validSlot = bestSlot;
  }

  private onDragEnd(_pointer: Phaser.Input.Pointer): void {
    this.input.off('pointermove', this.onDragMove, this);
    this.input.off('pointerup', this.onDragEnd, this);
    if (!this.draggingCard) return;
    const slot = this.draggingCard.validSlot;
    const element = this.draggingCard.element;
    const fromX = this.draggingCard.sprite.x;
    const fromY = this.draggingCard.sprite.y;
    const dragSprite = this.draggingCard.sprite;
    if (slot !== null && !this.guardians[slot]) {
      const cardSlot = this.cardSlots.find(c => c.element === element);
      if (cardSlot && cardSlot.count > 0) {
        cardSlot.count--;
        cardSlot.countText.setText(`× ${cardSlot.count}`);
        if (cardSlot.count === 0) {
          this.tweens.add({ targets: cardSlot.bg, alpha: 0.3, duration: 250 });
          cardSlot.bg.setStrokeStyle(2, 0x666666, 0.5);
        }
        const slotCfg = SLOTS[slot];
        const targetSlot = slotCfg;
        this.tweens.add({
          targets: dragSprite,
          x: targetSlot.x,
          y: targetSlot.y,
          scaleX: 0.4,
          scaleY: 0.4,
          alpha: 0,
          duration: 280,
          ease: 'Back.In',
          onComplete: () => {
            dragSprite.destroy();
            this.placeGuardian(slot, element, fromX, fromY);
          }
        });
      } else {
        this.tweens.add({
          targets: dragSprite,
          alpha: 0,
          scale: 0.5,
          duration: 200,
          onComplete: () => dragSprite.destroy()
        });
      }
    } else {
      this.tweens.add({
        targets: dragSprite,
        alpha: 0,
        scale: 0.5,
        duration: 200,
        onComplete: () => dragSprite.destroy()
      });
      this.cameras.main.shake(80, 0.003);
    }
    if (this.validSlotHighlight) {
      this.validSlotHighlight.destroy();
      this.validSlotHighlight = null;
    }
    this.draggingCard = null;
  }

  private placeGuardian(slotIdx: number, element: ElementType, fromX: number, fromY: number): void {
    const slotCfg = SLOTS[slotIdx];
    const guardian = new Guardian(this, element, slotCfg.x, slotCfg.y, slotIdx, this.particlePool);
    this.guardians[slotIdx] = guardian;
    const emblem = this.slotEmblems[slotIdx];
    emblem.setText(ELEMENTS[element].icon);
    emblem.setColor(ELEMENTS[element].colorHex);
    emblem.setAlpha(0.9);
    emblem.setFontSize('26px');
    this.particlePool.emit(slotCfg.x, slotCfg.y, 22, ELEMENTS[element].color, {
      life: 0.7,
      maxSpeed: 220,
      minSize: 2,
      maxSize: 5
    });
    const ringGlow = this.add.circle(slotCfg.x, slotCfg.y, 20, 0xffffff, 0);
    ringGlow.setDepth(19);
    this.tweens.add({
      targets: ringGlow,
      radius: 90,
      alpha: { from: 0.7, to: 0 },
      duration: 500,
      ease: 'Power2.Out',
      onComplete: () => ringGlow.destroy()
    });
    this.slotContainers[slotIdx].setInteractive({ useHandCursor: true });
    this.slotContainers[slotIdx].on('pointerover', () => {
      guardian.showRange(true);
    });
    this.slotContainers[slotIdx].on('pointerout', () => {
      guardian.showRange(false);
    });
    void fromX;
    this.checkFusions();
  }

  private setupInput(): void {
  }

  private checkFusions(): void {
    const newFusions: Map<number, number[]> = new Map();
    for (let i = 0; i < SLOTS.length; i++) {
      if (!this.guardians[i]) continue;
      newFusions.set(i, []);
    }
    for (let i = 0; i < SLOTS.length; i++) {
      const gi = this.guardians[i];
      if (!gi) continue;
      for (const j of SLOTS[i].neighbors) {
        if (j <= i) continue;
        const gj = this.guardians[j];
        if (!gj) continue;
        if (checkFusion(gi.element, gj.element)) {
          newFusions.get(i)!.push(j);
          newFusions.get(j)!.push(i);
        }
      }
    }
    for (let i = 0; i < SLOTS.length; i++) {
      const gi = this.guardians[i];
      if (!gi) continue;
      const partners = newFusions.get(i) ?? [];
      const oldPartners = new Set(gi.fusedPartners);
      const newPartners = new Set(partners);
      for (const p of partners) {
        if (!oldPartners.has(p) && p > i) {
          const gj = this.guardians[p];
          if (gj) {
            gi.addFusionLine(p, SLOTS[p].x, SLOTS[p].y, gj.element);
            gj.addFusionLine(i, SLOTS[i].x, SLOTS[i].y, gi.element);
          }
        }
      }
      for (const p of Array.from(oldPartners)) {
        if (!newPartners.has(p)) {
          gi.removeFusionLine(p);
          const gj = this.guardians[p];
          if (gj) gj.removeFusionLine(i);
        }
      }
      gi.setFusion(partners);
    }
  }

  private scheduleNextWave(): void {
    if (this.currentWave >= TOTAL_WAVES) return;
    if (this.currentWave === 0) {
      this.waveBreakTimer = WAVE_BREAK_MS;
      this.waveBreakActive = true;
      this.transitionText.setText('准备迎战！');
      this.transitionText.setVisible(true);
      this.transitionText.setAlpha(0);
      this.tweens.add({ targets: this.transitionText, alpha: 1, duration: 300, ease: 'Sine.Out' });
    } else {
      this.waveBreakTimer = WAVE_BREAK_MS;
      this.waveBreakActive = true;
      this.transitionText.setText(`Wave ${this.currentWave} Cleared!`);
      this.transitionText.setVisible(true);
      this.transitionText.setAlpha(1);
      this.tweens.add({
        targets: this.transitionText,
        scale: { from: 0.6, to: 1.1 },
        duration: 400,
        yoyo: true,
        ease: 'Back.Out'
      });
    }
  }

  private startWave(): void {
    this.currentWave++;
    this.waveActive = true;
    this.waveBreakActive = false;
    this.waveSpawned = 0;
    this.waveKilled = 0;
    this.spawnTimer = 0;
    this.waveText.setText(`Wave ${this.currentWave}/${TOTAL_WAVES}`);
    this.transitionText.setVisible(false);
    this.countdownText.setVisible(false);
    const announce = this.add.text(CANVAS_WIDTH / 2, 90, `第 ${this.currentWave} 波`, {
      fontSize: '38px',
      color: '#ff8888',
      fontFamily: 'Georgia, "Microsoft YaHei", serif',
      fontStyle: 'bold',
      stroke: '#220000',
      strokeThickness: 4
    });
    announce.setOrigin(0.5);
    announce.setDepth(250);
    this.tweens.add({
      targets: announce,
      alpha: { from: 0, to: 1, hold: 1000, then: 0 },
      scale: { from: 0.6, to: 1.15, then: 1 },
      duration: 1600,
      ease: 'Power2.Out',
      onComplete: () => announce.destroy()
    });
    this.cameras.main.flash(350, 120, 30, 30);
  }

  private spawnNextInWave(): void {
    const waveCfg = WAVES[this.currentWave - 1];
    if (!waveCfg) return;
    if (this.waveSpawned >= waveCfg.totalCount) return;
    const compIdx = this.pickCompositionIndex(waveCfg);
    const type = waveCfg.composition[compIdx].type;
    waveCfg.composition[compIdx].count--;
    const start = type === 'flying' ? FLYING_PATH[0] : PATH_POINTS[0];
    const jitterX = (Math.random() - 0.5) * 20;
    const jitterY = (Math.random() - 0.5) * 16;
    const creature = new ShadowCreature(this, type, start.x + jitterX, start.y + jitterY, this.particlePool);
    this.creatures.push(creature);
    this.waveSpawned++;
  }

  private pickCompositionIndex(waveCfg: { composition: { count: number }[] }): number {
    for (let i = 0; i < waveCfg.composition.length; i++) {
      if (waveCfg.composition[i].count > 0) return i;
    }
    return 0;
  }

  update(time: number, delta: number): void {
    const dt = Math.min(0.05, delta / 1000);
    this.totalTime += dt;

    if (this.gameOver || this.victory) {
      this.particlePool.update(dt);
      return;
    }

    if (this.waveBreakActive) {
      this.waveBreakTimer -= delta;
      const remaining = Math.max(0, this.waveBreakTimer);
      const second = Math.ceil(remaining / 1000);
      if (second > 0) {
        this.countdownText.setText(String(second));
        this.countdownText.setVisible(true);
        const blink = (remaining % 500) < 250;
        this.countdownText.setAlpha(blink ? 1 : 0.4);
      }
      if (remaining <= 0) {
        this.startWave();
      }
    }

    if (this.waveActive) {
      const waveCfg = WAVES[this.currentWave - 1];
      if (waveCfg && this.waveSpawned < waveCfg.totalCount) {
        this.spawnTimer -= delta;
        if (this.spawnTimer <= 0) {
          this.spawnNextInWave();
          this.spawnTimer = waveCfg.spawnInterval;
        }
      }
    }

    this.updateCreatures(dt);
    this.updateQuadTree();
    this.updateGuardians(dt);
    this.updateProjectiles(dt);
    this.updateFusionLines();
    this.particlePool.update(dt);
    this.updateWaveEnd();
  }

  private updateCreatures(dt: number): void {
    for (let i = this.creatures.length - 1; i >= 0; i--) {
      const c = this.creatures[i];
      const result = c.update(dt);
      if (result.reachedEnd) {
        this.lives--;
        this.updateLivesUI();
        this.creatures.splice(i, 1);
        this.cameras.main.shake(160, 0.008);
        this.cameras.main.flash(220, 180, 30, 30);
        if (this.lives <= 0) {
          this.triggerGameOver(false);
        }
      } else if (result.dead && !c.alive) {
        this.creatures.splice(i, 1);
        this.killCount++;
        this.waveKilled++;
        this.killText.setText(`击杀: ${this.killCount}`);
      }
    }
  }

  private updateQuadTree(): void {
    this.quadtree.clear();
    for (const c of this.creatures) {
      if (!c.alive) continue;
      const item: QuadtreeItem = {
        x: c.x,
        y: c.y,
        radius: 14,
        ref: c
      };
      this.quadtree.insert(item);
    }
  }

  private updateGuardians(dt: number): void {
    for (let i = 0; i < this.guardians.length; i++) {
      const g = this.guardians[i];
      if (!g) continue;
      const candidates = this.quadtree.queryCircle(g.x, g.y, g.range);
      const targets = candidates.map(c => ({
        x: c.x,
        y: c.y,
        alive: true,
        ref: c.ref
      }));
      const proj = g.update(dt, targets);
      if (proj) {
        this.projectiles.push(proj);
      }
    }
  }

  private updateProjectiles(dt: number): void {
    this.projectileGraphics.clear();
    const processCount = Math.min(MAX_PROJECTILES_PER_FRAME, this.projectiles.length);
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (!p.alive) {
        this.projectiles.splice(i, 1);
        continue;
      }
      const target = p.targetRef as ShadowCreature | undefined;
      if (target && target.alive) {
        const dx = target.x - p.x;
        const dy = target.y - p.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 12) {
          p.alive = false;
          const dead = target.takeDamage(p.damage, p.color);
          if (dead) {
          }
          this.projectiles.splice(i, 1);
          continue;
        }
        const moveX = (dx / d) * p.speed * dt;
        const moveY = (dy / d) * p.speed * dt;
        p.x += moveX;
        p.y += moveY;
        p.target.x = target.x;
        p.target.y = target.y;
      } else {
        const dx = p.target.x - p.x;
        const dy = p.target.y - p.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 5) {
          p.alive = false;
          this.projectiles.splice(i, 1);
          continue;
        }
        const moveX = (dx / d) * p.speed * dt;
        const moveY = (dy / d) * p.speed * dt;
        p.x += moveX;
        p.y += moveY;
      }

      p.trail.push({ x: p.x, y: p.y, alpha: 1 });
      if (p.trail.length > 8) p.trail.shift();
      for (let t = 0; t < p.trail.length; t++) {
        const tr = p.trail[t];
        const a = (t / p.trail.length) * 0.85;
        this.projectileGraphics.fillStyle(p.color, a);
        const sz = 2 + (t / p.trail.length) * 4;
        this.projectileGraphics.fillCircle(tr.x, tr.y, sz);
      }
      this.projectileGraphics.fillStyle(p.color, 1);
      this.projectileGraphics.fillCircle(p.x, p.y, 6);
      this.projectileGraphics.fillStyle(0xffffff, 0.85);
      this.projectileGraphics.fillCircle(p.x, p.y, 3);

      if (processCount <= 0 && this.projectiles.length > MAX_PROJECTILES_PER_FRAME) {
        break;
      }
    }
    void time;
  }

  private updateFusionLines(): void {
    for (let i = 0; i < SLOTS.length; i++) {
      const gi = this.guardians[i];
      if (!gi) continue;
      for (const j of SLOTS[i].neighbors) {
        if (j <= i) continue;
        const gj = this.guardians[j];
        if (!gj) continue;
        if (checkFusion(gi.element, gj.element)) {
          gi.updateFusionLine(j, SLOTS[j].x, SLOTS[j].y, gj.element);
        }
      }
    }
  }

  private updateLivesUI(): void {
    for (let i = 0; i < this.livesIcons.length; i++) {
      const visible = i < this.lives;
      if (visible) {
        this.livesIcons[i].setColor('#ff3355');
        this.livesIcons[i].setAlpha(1);
      } else {
        this.livesIcons[i].setColor('#553344');
        this.livesIcons[i].setAlpha(0.4);
      }
    }
  }

  private updateWaveEnd(): void {
    if (!this.waveActive) return;
    const waveCfg = WAVES[this.currentWave - 1];
    if (!waveCfg) return;
    const allSpawned = this.waveSpawned >= waveCfg.totalCount;
    const allGone = this.creatures.length === 0;
    if (allSpawned && allGone) {
      this.waveActive = false;
      if (this.currentWave >= TOTAL_WAVES) {
        this.triggerGameOver(true);
      } else {
        this.scheduleNextWave();
      }
    }
  }

  private triggerGameOver(victory: boolean): void {
    this.gameOver = true;
    this.victory = victory;
    this.gameOverText.setVisible(true);
    this.gameOverText.setAlpha(0);
    this.gameOverText.setScale(0.3);
    if (victory) {
      this.gameOverText.setText('✦ 胜利！灵契永存 ✦');
      this.gameOverText.setColor('#ffee66');
      this.cameras.main.flash(800, 255, 200, 50);
    } else {
      this.gameOverText.setText('✦ 灵契破灭 ✦');
      this.gameOverText.setColor('#ff6666');
      this.cameras.main.flash(800, 200, 20, 20);
    }
    this.tweens.add({
      targets: this.gameOverText,
      alpha: 1,
      scale: 1,
      duration: 900,
      ease: 'Back.Out'
    });
    const final = this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 80, '', {
      fontSize: '26px',
      color: '#ccddff',
      fontFamily: 'Georgia, "Microsoft YaHei", serif'
    });
    final.setOrigin(0.5);
    final.setDepth(401);
    final.setText(`击杀总数: ${this.killCount}  |  波次: ${this.currentWave}/${TOTAL_WAVES}`);
    final.setAlpha(0);
    this.tweens.add({
      targets: final,
      alpha: 1,
      delay: 700,
      duration: 500
    });
    void WAVE_INTERVAL_MS;
  }
}
