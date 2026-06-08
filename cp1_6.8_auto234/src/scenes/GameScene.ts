import Phaser from 'phaser';
import { Tower, TowerType } from '../entities/Tower';
import { Enemy, EnemyType } from '../entities/Enemy';
import { SpellManager, SpellResult } from '../utils/SpellManager';

const GAME_W = 1280;
const GAME_H = 720;
const CASTLE_X = 80;
const SPAWN_X = 1220;
const DRAW_AREA_Y = 520;
const DRAW_AREA_H = 200;

interface WaveConfig {
  enemies: { type: EnemyType; count: number; interval: number }[];
  delay: number;
}

export class GameScene extends Phaser.Scene {
  private gold: number = 100;
  private lives: number = 20;
  private currentWave: number = 0;
  private isPaused: boolean = false;
  private isWaveActive: boolean = false;
  private isGameOver: boolean = false;

  private towers: Tower[] = [];
  private enemies: Enemy[] = [];
  private spellManager: SpellManager = new SpellManager();

  private drawGraphics!: Phaser.GameObjects.Graphics;
  private runeGlowGraphics!: Phaser.GameObjects.Graphics;
  private drawAreaOverlay!: Phaser.GameObjects.Graphics;
  private ripples: { x: number; y: number; r: number; alpha: number; color: number }[] = [];

  private goldText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private spellResultText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;

  private pauseBtn!: Phaser.GameObjects.Text;
  private upgradeBtn!: Phaser.GameObjects.Text;
  private nextWaveBtn!: Phaser.GameObjects.Text;
  private selectedTower: Tower | null = null;

  private waveTimer: Phaser.Time.TimerEvent | null = null;
  private enemySpawnQueue: EnemyType[] = [];

  private backgroundStars: { x: number; y: number; alpha: number; speed: number }[] = [];

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.cameras.main.fadeIn(600, 10, 0, 18);

    this.createBackground();
    this.createCastle();
    this.createSpawnArea();
    this.createDrawArea();
    this.createUI();
    this.setupInput();

    this.time.delayedCall(1500, () => {
      this.startNextWave();
    });
  }

  private createBackground(): void {
    const bg = this.add.graphics();

    bg.fillGradientStyle(0x0a0012, 0x0a0012, 0x1a0a2e, 0x1a0a2e, 1);
    bg.fillRect(0, 0, GAME_W, GAME_H);

    for (let i = 0; i < 60; i++) {
      const sx = Phaser.Math.Between(0, GAME_W);
      const sy = Phaser.Math.Between(0, GAME_H);
      const alpha = Phaser.Math.FloatBetween(0.1, 0.5);
      bg.fillStyle(0xd4a6ff, alpha);
      bg.fillCircle(sx, sy, Phaser.Math.Between(1, 2));
      this.backgroundStars.push({ x: sx, y: sy, alpha, speed: Phaser.Math.FloatBetween(0.005, 0.02) });
    }

    const ground = this.add.graphics();
    ground.fillStyle(0x120825, 0.8);
    ground.fillRect(0, GAME_H - 8, GAME_W, 8);
    ground.lineStyle(1, 0x9b59b6, 0.3);
    ground.beginPath();
    ground.moveTo(CASTLE_X, 0);
    ground.lineTo(CASTLE_X, GAME_H);
    ground.strokePath();

    const fog = this.add.graphics();
    fog.fillStyle(0x2d0a4e, 0.15);
    fog.fillRect(SPAWN_X - 80, 0, 160, GAME_H);
    fog.fillStyle(0x0a0012, 0.3);
    fog.fillRect(SPAWN_X - 20, 0, 80, GAME_H);
  }

  private createCastle(): void {
    const cg = this.add.graphics();

    cg.fillStyle(0x3d1f6d, 1);
    cg.fillRect(CASTLE_X - 40, GAME_H - 200, 50, 200);
    cg.fillStyle(0x4a2a7a, 1);
    cg.fillRect(CASTLE_X - 35, GAME_H - 220, 40, 30);
    cg.fillStyle(0x5c3d8f, 1);
    cg.fillRect(CASTLE_X - 30, GAME_H - 240, 30, 30);

    cg.fillStyle(0x9b59b6, 0.6);
    cg.fillTriangle(CASTLE_X - 40, GAME_H - 220, CASTLE_X - 15, GAME_H - 270, CASTLE_X + 10, GAME_H - 220);

    cg.fillStyle(0xffd700, 0.8);
    cg.fillCircle(CASTLE_X - 22, GAME_H - 240, 5);

    cg.fillStyle(0xd4a6ff, 0.3);
    for (let i = 0; i < 3; i++) {
      cg.fillRect(CASTLE_X - 35, GAME_H - 190 + i * 50, 10, 20);
      cg.fillRect(CASTLE_X - 10, GAME_H - 190 + i * 50, 10, 20);
    }

    if (this.textures.exists('particle_fire')) {
      const glow = this.add.particles(CASTLE_X - 22, GAME_H - 250, 'particle_fire', {
        speed: { min: 5, max: 20 },
        scale: { start: 0.4, end: 0 },
        lifespan: 800,
        frequency: 150,
        quantity: 1,
        blendMode: 'ADD',
        alpha: { start: 0.6, end: 0 },
      });
      glow.setDepth(2);
    }
  }

  private createSpawnArea(): void {
    const pulseAlpha = { val: 0.2 };
    this.tweens.add({
      targets: pulseAlpha,
      val: 0.5,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      onUpdate: () => {
        const sg = this.add.graphics();
        sg.fillStyle(0xe040fb, pulseAlpha.val * 0.1);
        sg.fillRect(SPAWN_X - 15, 50, 30, GAME_H - 100);
        sg.destroy();
      },
    });
  }

  private createDrawArea(): void {
    this.drawAreaOverlay = this.add.graphics();
    this.drawAreaOverlay.fillStyle(0x1a0a2e, 0.5);
    this.drawAreaOverlay.fillRoundedRect(20, DRAW_AREA_Y, GAME_W - 40, DRAW_AREA_H, 12);
    this.drawAreaOverlay.lineStyle(1, 0x9b59b6, 0.3);
    this.drawAreaOverlay.strokeRoundedRect(20, DRAW_AREA_Y, GAME_W - 40, DRAW_AREA_H, 12);
    this.drawAreaOverlay.setDepth(15);

    this.drawGraphics = this.add.graphics();
    this.drawGraphics.setDepth(16);

    this.runeGlowGraphics = this.add.graphics();
    this.runeGlowGraphics.setDepth(17);

    const drawHint = this.add.text(GAME_W / 2, DRAW_AREA_Y + DRAW_AREA_H / 2, '在此区域绘制符文召唤防御塔', {
      fontSize: '16px',
      fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
      color: '#8e6aad',
    }).setOrigin(0.5).setDepth(15);
    this.tweens.add({
      targets: drawHint,
      alpha: 0.3,
      duration: 1500,
      yoyo: true,
      repeat: -1,
    });
  }

  private createUI(): void {
    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x1a0a2e, 0.8);
    panelBg.fillRoundedRect(10, 10, 240, 90, 8);
    panelBg.lineStyle(1, 0x9b59b6, 0.4);
    panelBg.strokeRoundedRect(10, 10, 240, 90, 8);
    panelBg.setDepth(20);

    this.goldText = this.add.text(30, 22, '💰 100', {
      fontSize: '18px',
      fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
      color: '#ffd700',
      fontStyle: 'bold',
    }).setDepth(20);

    this.livesText = this.add.text(30, 48, '❤️ 20', {
      fontSize: '18px',
      fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
      color: '#ff5252',
      fontStyle: 'bold',
    }).setDepth(20);

    this.waveText = this.add.text(30, 74, '🌊 波次 0', {
      fontSize: '16px',
      fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
      color: '#d4a6ff',
    }).setDepth(20);

    this.spellResultText = this.add.text(GAME_W / 2, DRAW_AREA_Y - 30, '', {
      fontSize: '24px',
      fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
      color: '#ffd700',
      fontStyle: 'bold',
      stroke: '#2d0a4e',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(20).setAlpha(0);

    this.hintText = this.add.text(GAME_W / 2, DRAW_AREA_Y + 20, '', {
      fontSize: '14px',
      fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
      color: '#9b59b6',
    }).setOrigin(0.5).setDepth(20).setAlpha(0);

    const ctrlBg = this.add.graphics();
    ctrlBg.fillStyle(0x1a0a2e, 0.8);
    ctrlBg.fillRoundedRect(GAME_W - 220, GAME_H - 60, 210, 50, 8);
    ctrlBg.lineStyle(1, 0x9b59b6, 0.4);
    ctrlBg.strokeRoundedRect(GAME_W - 220, GAME_H - 60, 210, 50, 8);
    ctrlBg.setDepth(20);

    this.pauseBtn = this.add.text(GAME_W - 200, GAME_H - 40, '⏸ 暂停', {
      fontSize: '16px',
      fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
      color: '#d4a6ff',
      backgroundColor: '#2d0a4e',
      padding: { x: 8, y: 4 },
    }).setDepth(20).setInteractive({ useHandCursor: true });

    this.upgradeBtn = this.add.text(GAME_W - 110, GAME_H - 40, '⬆ 升级', {
      fontSize: '16px',
      fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
      color: '#ffd700',
      backgroundColor: '#2d0a4e',
      padding: { x: 8, y: 4 },
    }).setDepth(20).setInteractive({ useHandCursor: true });

    this.nextWaveBtn = this.add.text(GAME_W - 200, GAME_H - 85, '⚔ 下一波', {
      fontSize: '18px',
      fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
      color: '#bb86fc',
      backgroundColor: '#3d1f6d',
      padding: { x: 16, y: 8 },
    }).setDepth(20).setInteractive({ useHandCursor: true }).setAlpha(0);

    this.setupUIEvents();
    this.showSpellHints();
  }

  private setupUIEvents(): void {
    this.pauseBtn.on('pointerdown', () => {
      this.isPaused = !this.isPaused;
      this.pauseBtn.setText(this.isPaused ? '▶ 继续' : '⏸ 暂停');
      if (this.isPaused) {
        this.physics.world.pause();
      } else {
        this.physics.world.resume();
      }
    });

    this.upgradeBtn.on('pointerdown', () => {
      if (!this.selectedTower) return;
      const cost = this.selectedTower.getUpgradeCost();
      if (this.gold >= cost) {
        this.gold -= cost;
        this.selectedTower.upgrade();
        this.updateUI();
        this.showFloatingText(`升级! -${cost}💰`, this.selectedTower.x, this.selectedTower.y - 30, '#ffd700');
      } else {
        this.showFloatingText('金币不足!', this.upgradeBtn.x, this.upgradeBtn.y - 20, '#ff5252');
      }
    });

    this.nextWaveBtn.on('pointerdown', () => {
      if (!this.isWaveActive && !this.isGameOver) {
        this.startNextWave();
      }
    });
  }

  private showSpellHints(): void {
    const spells = SpellManager.getSpellInfo();
    const hintY = DRAW_AREA_Y + DRAW_AREA_H - 25;

    spells.forEach((spell, i) => {
      const color = spell.type === 'fire' ? '#ff6b35' : spell.type === 'ice' ? '#4fc3f7' : '#bb86fc';
      this.add.text(100 + i * 400, hintY, `${spell.word}: ${spell.hint}`, {
        fontSize: '13px',
        fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
        color,
      }).setOrigin(0.5).setDepth(15);
    });
  }

  private setupInput(): void {
    const drawZone = this.add.zone(GAME_W / 2, DRAW_AREA_Y + DRAW_AREA_H / 2, GAME_W - 40, DRAW_AREA_H);
    drawZone.setInteractive();
    drawZone.setDepth(14);

    drawZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isPaused || this.isGameOver) return;
      this.spellManager.startDrawing();
      this.spellManager.addPoint(pointer.x, pointer.y);
      this.drawGraphics.clear();
      this.ripples.push({ x: pointer.x, y: pointer.y, r: 5, alpha: 0.8, color: 0xd4a6ff });
    });

    drawZone.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.spellManager.getIsDrawing() || this.isPaused) return;
      this.spellManager.addPoint(pointer.x, pointer.y);
      this.drawRuneTrail();
    });

    drawZone.on('pointerup', () => {
      if (this.isPaused) return;
      this.onSpellComplete();
    });

    drawZone.on('pointerout', () => {
      if (this.spellManager.getIsDrawing()) {
        this.onSpellComplete();
      }
    });

    this.input.on('gameobjectdown', (pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject) => {
      if (obj instanceof Phaser.GameObjects.Image) {
        for (const tower of this.towers) {
          if (tower.sprite === obj) {
            this.selectedTower = tower;
            this.showFloatingText(
              `${tower.towerType.toUpperCase()} Lv.${tower.level} 升级:${tower.getUpgradeCost()}💰`,
              tower.x,
              tower.y - 40,
              '#ffd700'
            );
            return;
          }
        }
      }
    });
  }

  private drawRuneTrail(): void {
    this.drawGraphics.clear();
    const points = this.spellManager.getPoints();
    if (points.length < 2) return;

    this.drawGraphics.lineStyle(3, 0xd4a6ff, 0.8);
    this.drawGraphics.beginPath();
    this.drawGraphics.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      this.drawGraphics.lineTo(points[i].x, points[i].y);
    }
    this.drawGraphics.strokePath();

    this.drawGraphics.lineStyle(6, 0x9b59b6, 0.3);
    this.drawGraphics.beginPath();
    this.drawGraphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      this.drawGraphics.lineTo(points[i].x, points[i].y);
    }
    this.drawGraphics.strokePath();

    const last = points[points.length - 1];
    this.ripples.push({ x: last.x, y: last.y, r: 3, alpha: 0.6, color: 0xd4a6ff });
  }

  private onSpellComplete(): void {
    const result = this.spellManager.endDrawing();

    this.time.delayedCall(400, () => {
      this.drawGraphics.clear();
    });

    if (result.matched && result.type) {
      this.onSpellSuccess(result);
    } else {
      this.showSpellFail();
    }
  }

  private onSpellSuccess(result: SpellResult): void {
    if (!result.type) return;

    const typeColors: Record<TowerType, number> = {
      fire: 0xff6b35,
      ice: 0x4fc3f7,
      lightning: 0xbb86fc,
    };

    const typeColorsHex: Record<TowerType, string> = {
      fire: '#ff6b35',
      ice: '#4fc3f7',
      lightning: '#bb86fc',
    };

    const color = typeColors[result.type];
    const points = this.spellManager.getPoints();

    if (points.length > 0) {
      const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
      const cy = points.reduce((s, p) => s + p.y, 0) / points.length;

      this.drawGraphics.clear();
      this.drawGraphics.lineStyle(4, color, 1);
      this.drawGraphics.beginPath();
      this.drawGraphics.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        this.drawGraphics.lineTo(points[i].x, points[i].y);
      }
      this.drawGraphics.strokePath();

      for (let i = 0; i < 3; i++) {
        this.ripples.push({ x: cx, y: cy, r: 10 + i * 15, alpha: 0.8 - i * 0.2, color });
      }

      const towerX = Phaser.Math.Clamp(cx, CASTLE_X + 60, SPAWN_X - 60);
      const towerY = Phaser.Math.Clamp(cy, 60, DRAW_AREA_Y - 60);

      this.summonTower(result.type, towerX, towerY);

      this.spellResultText.setText(`✦ ${result.word} ✦`);
      this.spellResultText.setColor(typeColorsHex[result.type]);
      this.spellResultText.setAlpha(1);
      this.tweens.add({
        targets: this.spellResultText,
        alpha: 0,
        y: this.spellResultText.y - 30,
        duration: 1200,
        ease: 'Power2',
        onComplete: () => {
          this.spellResultText.y = DRAW_AREA_Y - 30;
        },
      });
    }
  }

  private showSpellFail(): void {
    this.spellResultText.setText('符文未识别...');
    this.spellResultText.setColor('#ff5252');
    this.spellResultText.setAlpha(1);
    this.tweens.add({
      targets: this.spellResultText,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
    });
  }

  private summonTower(type: TowerType, x: number, y: number): void {
    const cost = type === 'fire' ? 30 : type === 'ice' ? 25 : 40;
    if (this.gold < cost) {
      this.showFloatingText('金币不足!', x, y - 20, '#ff5252');
      return;
    }

    const tooClose = this.towers.some(
      (t) => Phaser.Math.Distance.Between(t.x, t.y, x, y) < 50
    );
    if (tooClose) {
      this.showFloatingText('距离太近!', x, y - 20, '#ff5252');
      return;
    }

    this.gold -= cost;
    const tower = new Tower(this, x, y, type);
    tower.setDepth(8);
    this.towers.push(tower);
    this.updateUI();

    const typeColors: Record<TowerType, number> = {
      fire: 0xff6b35,
      ice: 0x4fc3f7,
      lightning: 0xbb86fc,
    };
    const ring = this.add.graphics();
    ring.lineStyle(3, typeColors[type], 1);
    ring.strokeCircle(x, y, 5);
    this.tweens.add({
      targets: ring,
      alpha: 0,
      scaleX: 4,
      scaleY: 4,
      duration: 600,
      ease: 'Power2',
      onComplete: () => ring.destroy(),
    });
  }

  private startNextWave(): void {
    this.currentWave++;
    this.isWaveActive = true;
    this.nextWaveBtn.setAlpha(0);
    this.updateUI();

    this.showFloatingText(`第 ${this.currentWave} 波来袭!`, GAME_W / 2, GAME_H / 2 - 50, '#e040fb');

    const wave = this.generateWave(this.currentWave);
    this.enemySpawnQueue = [];
    for (const group of wave.enemies) {
      for (let i = 0; i < group.count; i++) {
        this.enemySpawnQueue.push(group.type);
      }
    }

    Phaser.Utils.Array.Shuffle(this.enemySpawnQueue);

    this.spawnEnemyFromQueue(wave.enemies[0].interval);
  }

  private spawnEnemyFromQueue(interval: number): void {
    if (this.enemySpawnQueue.length === 0) {
      this.checkWaveComplete();
      return;
    }

    const type = this.enemySpawnQueue.shift()!;
    this.spawnEnemy(type);

    this.waveTimer = this.time.delayedCall(interval, () => {
      this.spawnEnemyFromQueue(interval);
    });
  }

  private generateWave(waveNum: number): WaveConfig {
    const baseCount = 3 + waveNum * 2;
    const baseInterval = Math.max(400, 1500 - waveNum * 100);

    const enemies: { type: EnemyType; count: number; interval: number }[] = [];

    enemies.push({ type: 'normal', count: baseCount, interval: baseInterval });

    if (waveNum >= 2) {
      enemies.push({ type: 'fast', count: Math.floor(waveNum * 1.5), interval: baseInterval * 0.7 });
    }

    if (waveNum >= 3) {
      enemies.push({ type: 'tank', count: Math.floor(waveNum * 0.8), interval: baseInterval * 1.3 });
    }

    if (waveNum % 5 === 0 && waveNum > 0) {
      enemies.push({ type: 'boss', count: Math.ceil(waveNum / 5), interval: 2000 });
    }

    return { enemies, delay: 3000 };
  }

  private spawnEnemy(type: EnemyType): void {
    const y = Phaser.Math.Between(80, DRAW_AREA_Y - 40);
    const enemy = new Enemy(this, SPAWN_X, y, type);
    this.enemies.push(enemy);
  }

  private checkWaveComplete(): void {
    const aliveEnemies = this.enemies.filter((e) => e.isAlive);
    if (aliveEnemies.length === 0 && this.enemySpawnQueue.length === 0) {
      this.isWaveActive = false;
      this.gold += 20 + this.currentWave * 5;
      this.updateUI();

      this.showFloatingText(`波次完成! +${20 + this.currentWave * 5}💰`, GAME_W / 2, GAME_H / 2, '#ffd700');

      this.tweens.add({
        targets: this.nextWaveBtn,
        alpha: 1,
        duration: 500,
        delay: 1000,
      });
    }
  }

  private showFloatingText(text: string, x: number, y: number, color: string): void {
    const ft = this.add.text(x, y, text, {
      fontSize: '18px',
      fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
      color,
      fontStyle: 'bold',
      stroke: '#0a0012',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(25);

    this.tweens.add({
      targets: ft,
      alpha: 0,
      y: y - 40,
      duration: 1200,
      ease: 'Power2',
      onComplete: () => ft.destroy(),
    });
  }

  private updateUI(): void {
    this.goldText.setText(`💰 ${this.gold}`);
    this.livesText.setText(`❤️ ${this.lives}`);
    this.waveText.setText(`🌊 波次 ${this.currentWave}`);
  }

  update(time: number, delta: number): void {
    if (this.isPaused || this.isGameOver) return;

    this.updateRipples();
    this.updateBackgroundStars();

    const activeEnemySprites = this.enemies
      .filter((e) => e.isAlive)
      .map((e) => e.sprite)
      .filter((s) => s.active);

    for (const tower of this.towers) {
      const target = tower.findTarget(activeEnemySprites);
      if (target) {
        const fireTarget = tower.tryFire(time);
        if (fireTarget) {
          tower.fireProjectile(fireTarget);
        }
      }
    }

    const toRemove: number[] = [];
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (!enemy.isAlive) {
        toRemove.push(i);
        continue;
      }

      const reachedCastle = enemy.update(delta, CASTLE_X);
      if (reachedCastle) {
        this.lives--;
        this.updateUI();
        toRemove.push(i);

        if (this.lives <= 0) {
          this.gameOver();
          return;
        }
      }
    }

    for (const idx of toRemove) {
      if (this.enemies[idx].isAlive) {
        this.enemies[idx]['cleanup']?.();
      }
      this.enemies.splice(idx, 1);
    }

    this.checkWaveComplete();
  }

  private updateRipples(): void {
    this.runeGlowGraphics.clear();
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const rp = this.ripples[i];
      rp.r += 1.5;
      rp.alpha -= 0.02;
      if (rp.alpha <= 0) {
        this.ripples.splice(i, 1);
        continue;
      }
      this.runeGlowGraphics.lineStyle(2, rp.color, rp.alpha);
      this.runeGlowGraphics.strokeCircle(rp.x, rp.y, rp.r);
    }
  }

  private updateBackgroundStars(): void {
    for (const star of this.backgroundStars) {
      star.alpha += star.speed;
      if (star.alpha > 0.7 || star.alpha < 0.1) {
        star.speed = -star.speed;
      }
    }
  }

  private gameOver(): void {
    this.isGameOver = true;

    const overlay = this.add.graphics();
    overlay.fillStyle(0x0a0012, 0);
    overlay.fillRect(0, 0, GAME_W, GAME_H);
    overlay.setDepth(30);
    this.tweens.add({
      targets: overlay,
      alpha: 0.8,
      duration: 800,
      onUpdate: (_tween, target: Phaser.GameObjects.Graphics) => {
        target.clear();
        target.fillStyle(0x0a0012, (target as any).alpha || 0);
        target.fillRect(0, 0, GAME_W, GAME_H);
      },
    });

    this.add.text(GAME_W / 2, GAME_H / 2 - 40, '游戏结束', {
      fontSize: '48px',
      fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
      color: '#ff5252',
      fontStyle: 'bold',
      stroke: '#0a0012',
      strokeThickness: 6,
    }).setOrigin(0.5).setDepth(31);

    this.add.text(GAME_W / 2, GAME_H / 2 + 30, `坚持到第 ${this.currentWave} 波`, {
      fontSize: '24px',
      fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
      color: '#d4a6ff',
      stroke: '#0a0012',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(31);

    const restartBtn = this.add.text(GAME_W / 2, GAME_H / 2 + 90, '🔄 重新开始', {
      fontSize: '22px',
      fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
      color: '#ffd700',
      backgroundColor: '#3d1f6d',
      padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setDepth(31).setInteractive({ useHandCursor: true });

    restartBtn.on('pointerdown', () => {
      this.scene.restart();
    });
  }
}
