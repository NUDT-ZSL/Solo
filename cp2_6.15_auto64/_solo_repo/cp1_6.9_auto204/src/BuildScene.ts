import Phaser from 'phaser';
import { GAME_CONFIG } from './main';
import Tower, { TowerType, TOWER_CONFIG } from './Tower';
import Enemy, { EnemyType } from './Enemy';
import UI from './UI';

interface Slot {
  ringIndex: number;
  slotIndex: number;
  x: number;
  y: number;
  occupied: boolean;
  graphic?: Phaser.GameObjects.Arc;
}

interface WaveConfig {
  enemies: { type: EnemyType; count: number; delay: number }[];
  reward: number;
}

const WAVES: WaveConfig[] = [
  { enemies: [{ type: 'shadow', count: 6, delay: 1200 }], reward: 60 },
  { enemies: [{ type: 'shadow', count: 8, delay: 1000 }, { type: 'splitter', count: 2, delay: 1800 }], reward: 80 },
  { enemies: [{ type: 'shadow', count: 6, delay: 900 }, { type: 'shield', count: 2, delay: 2200 }], reward: 100 },
  { enemies: [{ type: 'splitter', count: 5, delay: 1400 }, { type: 'shadow', count: 8, delay: 800 }], reward: 120 },
  { enemies: [{ type: 'shield', count: 4, delay: 2000 }, { type: 'shadow', count: 10, delay: 700 }], reward: 150 },
  { enemies: [{ type: 'shadow', count: 12, delay: 600 }, { type: 'splitter', count: 6, delay: 1200 }], reward: 170 },
  { enemies: [{ type: 'shield', count: 5, delay: 1800 }, { type: 'splitter', count: 5, delay: 1400 }, { type: 'shadow', count: 10, delay: 600 }], reward: 200 },
  { enemies: [{ type: 'shield', count: 8, delay: 1500 }, { type: 'splitter', count: 8, delay: 1000 }], reward: 240 },
  { enemies: [{ type: 'shadow', count: 20, delay: 400 }, { type: 'shield', count: 6, delay: 1600 }], reward: 280 },
  { enemies: [{ type: 'shield', count: 10, delay: 1200 }, { type: 'splitter', count: 10, delay: 900 }, { type: 'shadow', count: 15, delay: 500 }], reward: 400 }
];

export default class BuildScene extends Phaser.Scene {
  private ui!: UI;
  private slots: Slot[] = [];
  private towers: Tower[] = [];
  private enemies: Enemy[] = [];
  private occupiedSlots: Map<string, Tower> = new Map();

  private energy: number = 250;
  private maxEnergy: number = 999;
  private currentWave: number = 0;
  private totalWaves: number = WAVES.length;
  private waveInProgress: boolean = false;
  private waveSpawnQueue: { type: EnemyType; spawnAt: number }[] = [];
  private enemiesToSpawn: number = 0;
  private gameOver: boolean = false;
  private gameWon: boolean = false;
  private isPaused: boolean = false;

  private backgroundGraphics!: Phaser.GameObjects.Graphics;
  private orbitGraphics!: Phaser.GameObjects.Graphics;
  private coreGraphic!: Phaser.GameObjects.Graphics;
  private hoverSlot: Slot | null = null;
  private hoverIndicator!: Phaser.GameObjects.Arc;
  private cursorIcon!: Phaser.GameObjects.Container | null;
  private selectedTowerForInfo: Tower | null = null;

  private starLayers: Phaser.GameObjects.Particles.ParticleEmitter[] = [];

  constructor() { super('BuildScene'); }

  public create(): void {
    this.createBackground();
    this.createOrbits();
    this.createCore();
    this.createSlots();
    this.createHoverIndicator();

    this.ui = new UI(this, {
      onTowerSelect: (type) => this.handleTowerSelect(type),
      onPauseToggle: () => this.togglePause(),
      onUpgrade: () => this.upgradeSelectedTower(),
      onSell: () => this.sellSelectedTower(),
      onStartWave: () => this.startWave()
    });

    this.ui.updateEnergy(this.energy, this.maxEnergy);
    this.ui.updateWave(this.currentWave, this.totalWaves, this.waveInProgress);
    this.ui.updateEnemyCount(0, 0);

    this.setupInput();

    this.game.events.on(Phaser.Core.Events.BLUR, () => {
      if (!this.gameOver && !this.gameWon && !this.isPaused) {
        this.togglePause();
      }
    });
  }

  private createBackground(): void {
    const { BASE_WIDTH, BASE_HEIGHT } = GAME_CONFIG;

    this.backgroundGraphics = this.add.graphics();
    this.backgroundGraphics.fillGradientStyle(0x050010, 0x0a0018, 0x150028, 0x080014, 1);
    this.backgroundGraphics.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

    const starCount = 120;
    for (let layer = 0; layer < 2; layer++) {
      const layerStars = starCount + layer * 60;
      const g = this.add.graphics();
      const texKey = `stars_${layer}`;
      for (let i = 0; i < layerStars; i++) {
        const x = Math.random() * BASE_WIDTH;
        const y = Math.random() * BASE_HEIGHT;
        const size = 0.5 + Math.random() * (1.5 + layer);
        const alpha = 0.3 + Math.random() * 0.7;
        g.fillStyle(layer === 0 ? 0xaabbff : 0xffffff, alpha);
        g.fillCircle(x, y, size);
      }
      g.generateTexture(texKey, BASE_WIDTH, BASE_HEIGHT);
      g.destroy();

      const img = this.add.image(BASE_WIDTH / 2, BASE_HEIGHT / 2, texKey);
      img.setDepth(-100 + layer);
      this.tweens.add({
        targets: img,
        alpha: { from: 0.6 + layer * 0.2, to: 0.9 + layer * 0.1 },
        duration: 3000 + Math.random() * 2000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }

    for (let i = 0; i < 8; i++) {
      const nebulaColor = [0x6600aa, 0xaa0066, 0x0066aa][i % 3];
      const g = this.add.graphics();
      g.fillStyle(nebulaColor, 0.04);
      g.fillCircle(
        Math.random() * BASE_WIDTH,
        Math.random() * BASE_HEIGHT,
        80 + Math.random() * 180
      );
      g.setDepth(-90);
    }
  }

  private createOrbits(): void {
    const { CENTER, ORBIT } = GAME_CONFIG;
    this.orbitGraphics = this.add.graphics();
    this.orbitGraphics.setDepth(0);

    for (let r = 0; r < ORBIT.rings; r++) {
      const ringRadius = ORBIT.innerRadius + (ORBIT.outerRadius - ORBIT.innerRadius) * (r / (ORBIT.rings - 1));
      const alpha = 0.15 + r * 0.1;

      this.orbitGraphics.lineStyle(1, 0x6644aa, alpha);
      this.orbitGraphics.strokeCircle(CENTER.x, CENTER.y, ringRadius);
      this.orbitGraphics.lineStyle(1, 0xaa88ff, alpha * 0.4);
      this.orbitGraphics.strokeCircle(CENTER.x, CENTER.y, ringRadius + 0.5);

      const dashCount = 40;
      this.orbitGraphics.lineStyle(2, 0xcc99ff, alpha * 1.2);
      for (let d = 0; d < dashCount; d++) {
        const a1 = (d / dashCount) * Math.PI * 2;
        const a2 = a1 + 0.03;
        const x1 = CENTER.x + Math.cos(a1) * ringRadius;
        const y1 = CENTER.y + Math.sin(a1) * ringRadius;
        const x2 = CENTER.x + Math.cos(a2) * ringRadius;
        const y2 = CENTER.y + Math.sin(a2) * ringRadius;
        this.orbitGraphics.lineBetween(x1, y1, x2, y2);
      }
    }
  }

  private createCore(): void {
    const { CENTER, ORBIT } = GAME_CONFIG;
    this.coreGraphic = this.add.graphics();
    this.coreGraphic.setDepth(5);

    this.drawCore();

    this.tweens.add({
      targets: this.coreGraphic,
      scaleX: { from: 1, to: 1.05 },
      scaleY: { from: 1, to: 1.05 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private drawCore(): void {
    const { CENTER, ORBIT } = GAME_CONFIG;
    this.coreGraphic.setPosition(CENTER.x, CENTER.y);
    this.coreGraphic.clear();

    for (let i = 5; i >= 0; i--) {
      const r = ORBIT.innerRadius * (0.3 + i * 0.15);
      const alpha = 0.08 + i * 0.05;
      this.coreGraphic.fillStyle(0x66aaff, alpha);
      this.coreGraphic.fillCircle(0, 0, r);
    }

    this.coreGraphic.lineStyle(3, 0x88ccff, 0.8);
    this.coreGraphic.strokeCircle(0, 0, ORBIT.innerRadius * 0.8);
    this.coreGraphic.lineStyle(2, 0xaaddff, 0.6);
    this.coreGraphic.strokeCircle(0, 0, ORBIT.innerRadius * 0.6);

    this.coreGraphic.fillStyle(0xffffff, 1);
    this.coreGraphic.fillCircle(0, 0, 12);
    this.coreGraphic.fillStyle(0xaaddff, 0.9);
    this.coreGraphic.fillCircle(0, 0, 8);
  }

  private createSlots(): void {
    const { ORBIT } = GAME_CONFIG;
    for (let r = 0; r < ORBIT.rings; r++) {
      const slotsCount = ORBIT.slotsPerRing[r];
      for (let s = 0; s < slotsCount; s++) {
        const pos = Tower.getSlotPosition(r, s);
        const graphic = this.add.arc(pos.x, pos.y, 14);
        graphic.setStrokeStyle(2, 0x6644aa, 0.5);
        graphic.setFillStyle(0x1a0033, 0.3);
        graphic.setDepth(1);
        graphic.setData('ringIndex', r);
        graphic.setData('slotIndex', s);

        this.slots.push({
          ringIndex: r,
          slotIndex: s,
          x: pos.x,
          y: pos.y,
          occupied: false,
          graphic
        });
      }
    }
  }

  private createHoverIndicator(): void {
    this.hoverIndicator = this.add.arc(0, 0, 18);
    this.hoverIndicator.setStrokeStyle(3, 0xffff66, 0.9);
    this.hoverIndicator.setFillStyle(0xffff66, 0.15);
    this.hoverIndicator.setVisible(false);
    this.hoverIndicator.setDepth(50);
  }

  private setupInput(): void {
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.gameOver || this.gameWon) return;
      this.handlePointerMove(pointer.x, pointer.y);
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.gameOver || this.gameWon) return;
      if (pointer.rightButtonDown()) {
        this.cancelBuilding();
        return;
      }
      this.handleClick(pointer.x, pointer.y);
    });

    this.input.keyboard?.on('keydown-ESC', () => {
      this.cancelBuilding();
      this.ui.hideTowerInfo();
    });
  }

  private handlePointerMove(x: number, y: number): void {
    const selectedType = this.ui.getSelectedTowerType();

    if (selectedType) {
      const slot = this.findNearestSlot(x, y, 28);
      if (slot && !slot.occupied && this.towers.length < GAME_CONFIG.TOWER.maxCount) {
        if (this.hoverSlot !== slot) {
          this.hoverSlot = slot;
          this.hoverIndicator.setPosition(slot.x, slot.y);
          this.hoverIndicator.setVisible(true);
          const color = this.energy >= TOWER_CONFIG[selectedType][0].cost ? 0x66ff66 : 0xff6666;
          this.hoverIndicator.setStrokeStyle(3, color, 0.9);
          this.hoverIndicator.setFillStyle(color, 0.2);
        }
      } else {
        this.hoverSlot = null;
        this.hoverIndicator.setVisible(false);
      }
      this.updateCursorIcon(x, y, selectedType);
    } else {
      this.hoverSlot = null;
      this.hoverIndicator.setVisible(false);
      this.removeCursorIcon();
    }
  }

  private updateCursorIcon(x: number, y: number, type: TowerType): void {
    if (!this.cursorIcon) {
      this.cursorIcon = this.add.container(x, y);
      this.cursorIcon.setDepth(60);
      this.cursorIcon.setSize(32, 32);
      const g = this.add.graphics();
      const colors: Record<TowerType, number> = { laser: 0xff3366, scatter: 0x66ffcc, gravity: 0x9966ff };
      const color = colors[type];

      if (type === 'laser') {
        g.fillTriangle(0, -14, 12, 11, -12, 11);
        g.lineStyle(2, color, 1);
        g.strokeTriangle(0, -14, 12, 11, -12, 11);
      } else if (type === 'scatter') {
        const sides = 6;
        g.beginPath();
        for (let i = 0; i < sides; i++) {
          const a = (i / sides) * Math.PI * 2 - Math.PI / 2;
          const px = Math.cos(a) * 14;
          const py = Math.sin(a) * 14;
          if (i === 0) g.moveTo(px, py);
          else g.lineTo(px, py);
        }
        g.closePath();
        g.fillPath();
        g.lineStyle(2, color, 1);
        g.strokePath();
      } else {
        g.fillCircle(0, 0, 14);
        g.lineStyle(2, color, 1);
        g.strokeCircle(0, 0, 14);
      }
      g.fillStyle(0x000000, 0.2);
      this.cursorIcon.add(g);
    }
    this.cursorIcon.setPosition(x, y);
  }

  private removeCursorIcon(): void {
    if (this.cursorIcon) {
      this.cursorIcon.destroy();
      this.cursorIcon = null;
    }
  }

  private findNearestSlot(x: number, y: number, maxDist: number): Slot | null {
    let nearest: Slot | null = null;
    let bestDist = maxDist;
    for (const slot of this.slots) {
      const dx = x - slot.x;
      const dy = y - slot.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < bestDist) {
        bestDist = d;
        nearest = slot;
      }
    }
    return nearest;
  }

  private handleClick(x: number, y: number): void {
    const selectedType = this.ui.getSelectedTowerType();

    if (selectedType) {
      const slot = this.findNearestSlot(x, y, 28);
      if (slot && !slot.occupied) {
        this.buildTower(selectedType, slot);
      }
      return;
    }

    let clickedTower: Tower | null = null;
    for (const tower of this.towers) {
      if (!tower.active) continue;
      const dx = x - tower.worldX;
      const dy = y - tower.worldY;
      if (dx * dx + dy * dy <= 900) {
        clickedTower = tower;
        break;
      }
    }

    for (const t of this.towers) t.setSelected(false);

    if (clickedTower) {
      this.selectedTowerForInfo = clickedTower;
      clickedTower.setSelected(true);
      this.ui.showTowerInfo(clickedTower, clickedTower.level < 2, this.energy);
    } else {
      this.selectedTowerForInfo = null;
      this.ui.hideTowerInfo();
    }
  }

  private buildTower(type: TowerType, slot: Slot): void {
    const cost = TOWER_CONFIG[type][0].cost;
    if (this.energy < cost) {
      this.flashMessage('能量不足!', 0xff6666);
      return;
    }
    if (this.towers.length >= GAME_CONFIG.TOWER.maxCount) {
      this.flashMessage(`炮塔数量已达上限(${GAME_CONFIG.TOWER.maxCount})!`, 0xff6666);
      return;
    }

    this.energy -= cost;
    this.ui.updateEnergy(this.energy, this.maxEnergy);

    const tower = new Tower(this, type, slot.ringIndex, slot.slotIndex, this.enemies);
    tower.setDepth(10);
    tower.on('pointerdown', () => {
      this.handleClick(tower.worldX, tower.worldY);
    });

    this.towers.push(tower);
    slot.occupied = true;
    if (slot.graphic) slot.graphic.setVisible(false);
    this.occupiedSlots.set(`${slot.ringIndex}_${slot.slotIndex}`, tower);

    this.spawnBuildEffect(slot.x, slot.y, type);
  }

  private spawnBuildEffect(x: number, y: number, type: TowerType): void {
    const colors = { laser: 0xff3366, scatter: 0x66ffcc, gravity: 0x9966ff };
    const color = colors[type];

    for (let i = 0; i < 3; i++) {
      this.time.delayedCall(i * 80, () => {
        const g = this.add.graphics();
        g.lineStyle(2, color, 0.8 - i * 0.2);
        g.strokeCircle(x, y, 20 + i * 15);
        this.tweens.add({
          targets: g,
          alpha: 0,
          scaleX: 2,
          scaleY: 2,
          duration: 500,
          onComplete: () => g.destroy()
        });
      });
    }

    this.cameras.main.shake(80, 0.003);
  }

  private handleTowerSelect(type: TowerType | null): void {
    this.hoverSlot = null;
    this.hoverIndicator.setVisible(false);
    if (!type) {
      this.removeCursorIcon();
    }
  }

  private cancelBuilding(): void {
    this.ui.cancelTowerSelect();
    this.hoverSlot = null;
    this.hoverIndicator.setVisible(false);
    this.removeCursorIcon();
  }

  private upgradeSelectedTower(): void {
    const tower = this.ui.getSelectedTower();
    if (!tower || tower.level >= 2) return;
    if (this.energy < tower.stats.upgradeCost) {
      this.flashMessage('能量不足!', 0xff6666);
      return;
    }
    this.energy -= tower.stats.upgradeCost;
    this.ui.updateEnergy(this.energy, this.maxEnergy);
    tower.upgrade();
    this.ui.showTowerInfo(tower, tower.level < 2, this.energy);
  }

  private sellSelectedTower(): void {
    const tower = this.ui.getSelectedTower();
    if (!tower) return;

    const key = `${tower.ringIndex}_${tower.slotIndex}`;
    this.occupiedSlots.delete(key);

    const slot = this.slots.find(s => s.ringIndex === tower.ringIndex && s.slotIndex === tower.slotIndex);
    if (slot) {
      slot.occupied = false;
      if (slot.graphic) slot.graphic.setVisible(true);
    }

    this.energy += tower.sell();
    this.ui.updateEnergy(this.energy, this.maxEnergy);

    const idx = this.towers.indexOf(tower);
    if (idx >= 0) this.towers.splice(idx, 1);

    this.ui.hideTowerInfo();
    this.selectedTowerForInfo = null;
  }

  private startWave(): void {
    if (this.waveInProgress || this.currentWave >= this.totalWaves || this.gameOver) return;

    this.currentWave++;
    this.waveInProgress = true;
    this.waveSpawnQueue = [];
    this.enemiesToSpawn = 0;

    const wave = WAVES[this.currentWave - 1];
    let timeCursor = 800;
    for (const group of wave.enemies) {
      for (let i = 0; i < group.count; i++) {
        this.waveSpawnQueue.push({ type: group.type, spawnAt: timeCursor });
        timeCursor += group.delay;
        this.enemiesToSpawn++;
      }
    }

    this.ui.updateWave(this.currentWave, this.totalWaves, this.waveInProgress);
    this.ui.updateEnemyCount(this.getActiveEnemiesCount(), this.enemiesToSpawn);
  }

  private getActiveEnemiesCount(): number {
    return this.enemies.filter(e => e.active && !e.isDead && e.visible).length;
  }

  private spawnEnemy(type: EnemyType, isMini: boolean = false, x?: number, y?: number): Enemy | null {
    if (!isMini && this.getActiveEnemiesCount() >= GAME_CONFIG.ENEMY.maxCount) {
      return null;
    }

    const enemy = new Enemy(this, type, isMini);
    if (x !== undefined && y !== undefined) {
      enemy.setStartPosition(x, y);
    }
    enemy.setDepth(20);
    this.enemies.push(enemy);
    return enemy;
  }

  private flashMessage(text: string, color: number): void {
    const t = this.add.text(GAME_CONFIG.CENTER.x, 110, text, {
      fontFamily: 'sans-serif',
      fontSize: '28px',
      color: '#ff6666',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(9000).setTint(color);

    this.tweens.add({
      targets: t,
      alpha: { from: 1, to: 0 },
      y: '-=40',
      duration: 1200,
      onComplete: () => t.destroy()
    });
  }

  private togglePause(): void {
    this.isPaused = !this.isPaused;
    this.ui.setPaused(this.isPaused);
  }

  public update(time: number, delta: number): void {
    if (this.gameOver || this.gameWon) return;
    if (this.isPaused) return;

    if (this.waveInProgress) {
      const before = this.waveSpawnQueue.length;
      while (this.waveSpawnQueue.length > 0 && this.waveSpawnQueue[0].spawnAt <= 0) {
        const item = this.waveSpawnQueue.shift()!;
        this.spawnEnemy(item.type);
      }
      if (before !== this.waveSpawnQueue.length) {
        this.ui.updateEnemyCount(this.getActiveEnemiesCount(), this.enemiesToSpawn);
      }
      for (const item of this.waveSpawnQueue) item.spawnAt -= delta;

      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        e.update(time, delta);

        if (e.reachedCenter() && !e.isDead) {
          this.coreDamaged(e.damage);
          e.isDead = true;
          e.setVisible(false);
        }

        if (e.isDead && !e.visible) {
          if (e.shouldSpawnSplits()) {
            const positions = e.getSplitPositions();
            for (const p of positions) {
              this.spawnEnemy('shadow', true, p.x, p.y);
            }
          }
          if (e.reward > 0 && e.active) {
            this.energy = Math.min(this.maxEnergy, this.energy + e.reward);
            this.ui.updateEnergy(this.energy, this.maxEnergy);
          }
          e.cleanup();
          e.destroy();
          this.enemies.splice(i, 1);
          this.ui.updateEnemyCount(this.getActiveEnemiesCount(), this.enemiesToSpawn);
        }
      }

      const allSpawned = this.waveSpawnQueue.length === 0;
      const allGone = this.getActiveEnemiesCount() === 0;
      if (allSpawned && allGone && this.waveInProgress) {
        this.waveInProgress = false;
        const reward = WAVES[this.currentWave - 1]?.reward || 0;
        if (reward > 0) {
          this.energy = Math.min(this.maxEnergy, this.energy + reward);
          this.ui.updateEnergy(this.energy, this.maxEnergy);
          this.flashMessage(`波次完成! +${reward}⚡`, 0x66ffaa);
        }
        this.ui.updateWave(this.currentWave, this.totalWaves, this.waveInProgress);
        this.ui.updateEnemyCount(0, 0);

        if (this.currentWave >= this.totalWaves) {
          this.gameWon = true;
          this.showGameEnd(true);
        }
      }
    }

    for (const tower of this.towers) {
      if (tower.active) tower.update(time, delta);
    }
  }

  private coreDamaged(amount: number): void {
    this.cameras.main.shake(400, 0.012);
    this.cameras.main.flash(300, 0xff, 0x33, 0x66, false);

    this.tweens.add({
      targets: this.coreGraphic,
      tint: 0xff4466,
      duration: 100,
      yoyo: true,
      repeat: 4
    });

    this.maxEnergy = Math.max(0, this.maxEnergy - amount * 3);
    this.energy = Math.min(this.energy, this.maxEnergy);
    this.ui.updateEnergy(this.energy, this.maxEnergy);

    if (this.maxEnergy <= 0) {
      this.gameOver = true;
      this.showGameEnd(false);
    }
  }

  private showGameEnd(won: boolean): void {
    const { BASE_WIDTH, BASE_HEIGHT } = GAME_CONFIG;
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
    overlay.setDepth(8000);

    const title = won ? '胜利！星痕闪耀' : '星痕陨落...核心被摧毁';
    const color = won ? '#66ffaa' : '#ff6688';

    const t = this.add.text(BASE_WIDTH / 2, BASE_HEIGHT / 2 - 40, title, {
      fontFamily: 'sans-serif',
      fontSize: '48px',
      color,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 6
    }).setOrigin(0.5).setDepth(8001);

    const sub = this.add.text(BASE_WIDTH / 2, BASE_HEIGHT / 2 + 30,
      won ? `成功抵御${this.currentWave}波怪物进攻` : `坚持了${this.currentWave}波`, {
        fontFamily: 'sans-serif',
        fontSize: '22px',
        color: '#cccccc'
      }).setOrigin(0.5).setDepth(8001);

    const btn = this.add.text(BASE_WIDTH / 2, BASE_HEIGHT / 2 + 100, '点击重新开始', {
      fontFamily: 'sans-serif',
      fontSize: '26px',
      color: '#cc99ff',
      fontStyle: 'bold',
      backgroundColor: '#1a0033',
      padding: { x: 30, y: 12 }
    }).setOrigin(0.5).setDepth(8001).setInteractive({ useHandCursor: true });

    btn.on('pointerdown', () => {
      this.cleanupAll();
      this.scene.restart();
    });
  }

  private cleanupAll(): void {
    for (const e of this.enemies) {
      e.cleanup();
      e.destroy();
    }
    this.enemies = [];
    for (const t of this.towers) t.destroy();
    this.towers = [];
    this.occupiedSlots.clear();
    this.ui.destroy();
  }
}
