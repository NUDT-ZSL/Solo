import Phaser from 'phaser';
import { Tower, TowerType, TOWER_CONFIGS } from '../entities/Tower';
import { Monster, BezierPath } from '../entities/Monster';

const LIGHTHOUSE_X = 400;
const LIGHTHOUSE_Y = 300;
const INITIAL_ENERGY = 200;
const KILL_ENERGY = 10;
const ELITE_DROP_ENERGY = 30;
const LASER_COST = 50;
const LASER_DAMAGE = 150;
const WAVE_INTERVAL_MIN = 15000;
const WAVE_INTERVAL_MAX = 20000;
const TIDE_INTERVAL = 40000;
const TIDE_DURATION = 6000;
const TIDE_HEIGHT = 10;

const ISLAND_POINTS: Phaser.Geom.Point[] = [
  new Phaser.Geom.Point(280, 180),
  new Phaser.Geom.Point(340, 140),
  new Phaser.Geom.Point(420, 130),
  new Phaser.Geom.Point(500, 160),
  new Phaser.Geom.Point(540, 210),
  new Phaser.Geom.Point(555, 280),
  new Phaser.Geom.Point(540, 360),
  new Phaser.Geom.Point(500, 420),
  new Phaser.Geom.Point(430, 460),
  new Phaser.Geom.Point(350, 465),
  new Phaser.Geom.Point(290, 430),
  new Phaser.Geom.Point(255, 370),
  new Phaser.Geom.Point(245, 290),
  new Phaser.Geom.Point(255, 220)
];

interface UIState {
  energy: number;
  wave: number;
  aliveMonsters: number;
  isPaused: boolean;
  isGameOver: boolean;
}

interface BuildMenuState {
  visible: boolean;
  x: number;
  y: number;
}

interface TowerInfoState {
  visible: boolean;
  tower: Tower | null;
}

interface LaserState {
  aiming: boolean;
  line: Phaser.GameObjects.Graphics | null;
}

export class PlayScene extends Phaser.Scene {
  private sea!: Phaser.GameObjects.Graphics;
  private island!: Phaser.GameObjects.Graphics;
  private islandPolygon!: Phaser.Geom.Polygon;
  private seaWavesTime = 0;

  private lighthouseBody!: Phaser.GameObjects.Graphics;
  private lighthouseOrb!: Phaser.GameObjects.Arc;
  private orbGlow!: Phaser.GameObjects.Arc;
  private orbRotation = 0;

  private towers: Tower[] = [];
  private monsters: Monster[] = [];

  private energy = INITIAL_ENERGY;
  private waveNumber = 0;
  private nextWaveTime = 0;
  private monstersToSpawn = 0;
  private spawnTimer = 0;

  private tideActive = false;
  private tideStartTime = 0;
  private nextTideTime = TIDE_INTERVAL;

  private uiState: UIState = { energy: INITIAL_ENERGY, wave: 0, aliveMonsters: 0, isPaused: false, isGameOver: false };
  private buildMenu: BuildMenuState = { visible: false, x: 0, y: 0 };
  private towerInfo: TowerInfoState = { visible: false, tower: null };
  private laserState: LaserState = { aiming: false, line: null };

  private uiEnergyText!: Phaser.GameObjects.Text;
  private uiWaveText!: Phaser.GameObjects.Text;
  private uiMonstersText!: Phaser.GameObjects.Text;
  private uiPauseButton!: Phaser.GameObjects.Arc;
  private uiPauseOverlay!: Phaser.GameObjects.Graphics;
  private uiPauseText!: Phaser.GameObjects.Text;
  private uiBuildInfo!: Phaser.GameObjects.Container;
  private buildMenuContainer!: Phaser.GameObjects.Container;
  private towerInfoContainer!: Phaser.GameObjects.Container;
  private uiTopBar!: Phaser.GameObjects.Graphics;

  private selectedBuildTower: TowerType | null = null;

  constructor() {
    super({ key: 'PlayScene' });
  }

  create(): void {
    this.createIsland();
    this.createLighthouse();
    this.createUI();
    this.setupEventHandlers();
    this.scheduleFirstWave();
  }

  update(_time: number, delta: number): void {
    if (this.uiState.isPaused || this.uiState.isGameOver) return;

    this.seaWavesTime += delta * 0.003;
    this.updateSeaWaves();

    this.orbRotation += delta * 0.002;
    this.lighthouseOrb.setRotation(this.orbRotation);
    this.orbGlow.setRotation(this.orbRotation * 0.5);
    this.orbGlow.setAlpha(0.2 + Math.sin(this.orbRotation * 2) * 0.1);

    this.updateMonsters(delta);
    this.updateTowers();
    this.updateTide(delta);
    this.updateWaveSpawning(delta);
    this.updateLaserAim();
    this.updateAliveCount();
  }

  private createIsland(): void {
    this.sea = this.add.graphics();

    this.island = this.add.graphics();
    this.islandPolygon = new Phaser.Geom.Polygon(ISLAND_POINTS.map(p => ({ x: p.x, y: p.y })));

    this.drawIsland();
    this.updateSeaWaves();
  }

  private drawIsland(): void {
    this.island.clear();

    const gradientColors = [
      { dist: 0, color: 0x4a7c3f },
      { dist: 0.5, color: 0x8ab36b },
      { dist: 0.85, color: 0xd4c08a },
      { dist: 1, color: 0xe8d5a3 }
    ];

    const centerX = LIGHTHOUSE_X;
    const centerY = LIGHTHOUSE_Y;
    const maxDist = 180;

    this.island.fillStyle(0xe8d5a3, 1);
    this.island.fillPoints(this.islandPolygon.points as any, true);

    for (let y = 130; y < 470; y += 3) {
      for (let x = 240; x < 560; x += 3) {
        if (!this.islandPolygon.contains(x, y)) continue;

        const dist = Phaser.Math.Distance.Between(centerX, centerY, x, y) / maxDist;
        let color = 0x4a7c3f;

        for (let i = gradientColors.length - 1; i >= 0; i--) {
          if (dist >= gradientColors[i].dist) {
            color = gradientColors[i].color;
            break;
          }
        }

        this.island.fillStyle(color, 1);
        this.island.fillRect(x, y, 3, 3);
      }
    }

    this.island.lineStyle(2, 0xc4a060, 1);
    this.island.strokePoints(this.islandPolygon.points as any, true);

    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const dist = 50 + Math.random() * 60;
      const rx = centerX + Math.cos(angle) * dist;
      const ry = centerY + Math.sin(angle) * dist;
      if (this.islandPolygon.contains(rx, ry)) {
        this.island.fillStyle(0x3a6c2f, 0.5 + Math.random() * 0.3);
        this.island.fillCircle(rx, ry, 3 + Math.random() * 4);
      }
    }
  }

  private updateSeaWaves(): void {
    this.sea.clear();

    this.sea.fillStyle(0x0a3d6b, 1);
    this.sea.fillRect(0, 0, 800, 600);

    for (let y = 0; y < 600; y += 15) {
      const offset1 = Math.sin(this.seaWavesTime + y * 0.05) * 2;
      const offset2 = Math.cos(this.seaWavesTime * 0.7 + y * 0.03) * 1.5;

      this.sea.lineStyle(1, 0x1a5d8b, 0.3);
      this.sea.beginPath();
      this.sea.moveTo(0, y + offset1);
      for (let x = 0; x < 800; x += 20) {
        const wave = Math.sin((x + this.seaWavesTime * 30) * 0.03) * 2 + offset2;
        this.sea.lineTo(x, y + wave);
      }
      this.sea.strokePath();
    }
  }

  private createLighthouse(): void {
    this.lighthouseBody = this.add.graphics();
    this.drawHexagonTower();

    this.orbGlow = this.add.circle(LIGHTHOUSE_X, LIGHTHOUSE_Y - 60, 20, 0xffdd00, 0.25);
    this.orbGlow.setStrokeStyle(2, 0xffee66, 0.5);

    this.lighthouseOrb = this.add.circle(LIGHTHOUSE_X, LIGHTHOUSE_Y - 60, 8, 0xffd700, 1);
    this.lighthouseOrb.setStrokeStyle(2, 0xffee88, 1);

    const inner = this.add.circle(LIGHTHOUSE_X - 2, LIGHTHOUSE_Y - 62, 3, 0xffffff, 0.8);

    this.lighthouseOrb.setInteractive({ useHandCursor: true });
  }

  private drawHexagonTower(): void {
    this.lighthouseBody.clear();

    const baseSizes = [40, 30, 20];
    const baseY = [LIGHTHOUSE_Y + 30, LIGHTHOUSE_Y - 5, LIGHTHOUSE_Y - 35];
    const colors = [0x6a6a7a, 0x7a7a8a, 0x8a8a9a];
    const strokeColors = [0x4a4a5a, 0x5a5a6a, 0x6a6a7a];

    for (let layer = 0; layer < 3; layer++) {
      const size = baseSizes[layer];
      const cy = baseY[layer];
      this.lighthouseBody.fillStyle(colors[layer], 1);
      this.lighthouseBody.lineStyle(2, strokeColors[layer], 1);
      this.drawHexagon(LIGHTHOUSE_X, cy, size);
    }

    this.lighthouseBody.fillStyle(0x3a3a4a, 0.6);
    this.drawHexagon(LIGHTHOUSE_X, baseY[0] + 2, baseSizes[0] * 0.92);

    for (let layer = 0; layer < 3; layer++) {
      const size = baseSizes[layer] * 0.5;
      const cy = baseY[layer];
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 + Math.PI / 6;
        const wx = LIGHTHOUSE_X + Math.cos(angle) * size;
        const wy = cy + Math.sin(angle) * size * 0.6;
        this.lighthouseBody.fillStyle(0x5a5a6a, 0.5);
        this.lighthouseBody.fillCircle(wx, wy, 2);
      }
    }
  }

  private drawHexagon(cx: number, cy: number, size: number): void {
    this.lighthouseBody.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(angle) * size;
      const y = cy + Math.sin(angle) * size * 0.6;
      if (i === 0) this.lighthouseBody.moveTo(x, y);
      else this.lighthouseBody.lineTo(x, y);
    }
    this.lighthouseBody.closePath();
    this.lighthouseBody.fillPath();
    this.lighthouseBody.strokePath();
  }

  private createUI(): void {
    this.uiTopBar = this.add.graphics();
    this.uiTopBar.fillStyle(0x000000, 0.3);
    this.uiTopBar.fillRoundedRect(10, 5, 780, 38, 8);
    this.uiTopBar.lineStyle(1, 0xffffff, 0.1);
    this.uiTopBar.strokeRoundedRect(10, 5, 780, 38, 8);

    this.uiEnergyText = this.add.text(30, 24, '能量: 200', {
      font: 'bold 18px Microsoft YaHei',
      color: '#ffd700',
      stroke: '#886600',
      strokeThickness: 1
    }).setOrigin(0, 0.5);

    this.uiWaveText = this.add.text(250, 24, '波次: 1', {
      font: 'bold 16px Microsoft YaHei',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 1
    }).setOrigin(0, 0.5);

    this.uiMonstersText = this.add.text(420, 24, '存活: 0', {
      font: 'bold 16px Microsoft YaHei',
      color: '#ff4444',
      stroke: '#440000',
      strokeThickness: 1
    }).setOrigin(0, 0.5);

    this.uiPauseButton = this.add.circle(765, 24, 14, 0x333333, 0.8);
    this.uiPauseButton.setStrokeStyle(2, 0xffffff, 0.5);
    this.uiPauseButton.setInteractive({ useHandCursor: true });

    const pauseIcon = this.add.graphics();
    pauseIcon.fillStyle(0xffffff, 0.9);
    pauseIcon.fillRect(760, 18, 3, 12);
    pauseIcon.fillRect(767, 18, 3, 12);

    this.uiPauseOverlay = this.add.graphics();
    this.uiPauseOverlay.fillStyle(0xffffff, 0.4);
    this.uiPauseOverlay.fillRect(0, 0, 800, 600);
    this.uiPauseOverlay.setVisible(false);
    this.uiPauseOverlay.setDepth(1000);

    this.uiPauseText = this.add.text(400, 300, '游戏已暂停\n点击继续', {
      font: 'bold 32px Microsoft YaHei',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
      align: 'center'
    }).setOrigin(0.5);
    this.uiPauseText.setVisible(false);
    this.uiPauseText.setDepth(1001);
    this.uiPauseText.setInteractive({ useHandCursor: true });

    this.uiBuildInfo = this.add.container(600, 560);
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.3);
    bg.fillRoundedRect(-100, -30, 200, 55, 8);
    bg.lineStyle(1, 0xffffff, 0.1);
    bg.strokeRoundedRect(-100, -30, 200, 55, 8);

    const buildIcon = this.add.circle(-70, -5, 14, 0xffffff, 0.15);
    const buildText = this.add.text(-45, -5, '点击空地建造', {
      font: 'bold 13px Microsoft YaHei',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 1
    }).setOrigin(0, 0.5);

    this.uiBuildInfo.add([bg, buildIcon, buildText]);
    this.uiBuildInfo.setVisible(false);

    this.buildMenuContainer = this.add.container(0, 0);
    this.buildMenuContainer.setDepth(500);
    this.buildMenuContainer.setVisible(false);

    this.towerInfoContainer = this.add.container(0, 0);
    this.towerInfoContainer.setDepth(500);
    this.towerInfoContainer.setVisible(false);
  }

  private setupEventHandlers(): void {
    this.uiPauseButton.on('pointerdown', () => this.togglePause());
    this.uiPauseText.on('pointerdown', () => this.togglePause());
    this.uiPauseOverlay.on('pointerdown', () => this.togglePause());

    this.lighthouseOrb.on('pointerdown', () => this.startLaserAim());
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.laserState.aiming) {
        this.fireLaser(pointer.x, pointer.y);
      }
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.uiState.isPaused || this.uiState.isGameOver) return;
      this.handleGroundClick(pointer.x, pointer.y);
    });
  }

  private handleGroundClick(x: number, y: number): void {
    if (y < 48) return;

    const clickedTower = this.findTowerAt(x, y);
    if (clickedTower) {
      this.showTowerInfo(clickedTower);
      this.hideBuildMenu();
      return;
    }

    if (this.isOnIsland(x, y) && !this.isFloodedPoint(x, y) && !this.isOnLighthouse(x, y)) {
      this.showBuildMenu(x, y);
      this.hideTowerInfo();
    } else {
      this.hideBuildMenu();
      this.hideTowerInfo();
    }
  }

  private findTowerAt(x: number, y: number): Tower | null {
    for (const t of this.towers) {
      const d = Phaser.Math.Distance.Between(x, y, t.x, t.y);
      if (d <= 20) return t;
    }
    return null;
  }

  private isOnIsland(x: number, y: number): boolean {
    return this.islandPolygon.contains(x, y);
  }

  private isOnLighthouse(x: number, y: number): boolean {
    return Phaser.Math.Distance.Between(x, y, LIGHTHOUSE_X, LIGHTHOUSE_Y - 15) < 50;
  }

  private isFloodedPoint(x: number, y: number): boolean {
    if (!this.tideActive) return false;
    const edgeDist = this.distanceToIslandEdge(x, y);
    return edgeDist < TIDE_HEIGHT;
  }

  private distanceToIslandEdge(x: number, y: number): number {
    const points = this.islandPolygon.points as Phaser.Geom.Point[];
    let minDist = Infinity;
    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      const dist = this.pointToSegmentDistance(x, y, p1.x, p1.y, p2.x, p2.y);
      if (dist < minDist) minDist = dist;
    }
    return minDist;
  }

  private pointToSegmentDistance(
    px: number, py: number,
    x1: number, y1: number,
    x2: number, y2: number
  ): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Phaser.Math.Distance.Between(px, py, x1, y1);

    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));

    return Phaser.Math.Distance.Between(px, py, x1 + t * dx, y1 + t * dy);
  }

  private showBuildMenu(x: number, y: number): void {
    this.buildMenu = { visible: true, x, y };
    this.buildMenuContainer.removeAll(true);
    this.buildMenuContainer.setVisible(true);

    const menuW = 240;
    const menuH = 90;
    let mx = x + 30;
    let my = y - menuH / 2;

    if (mx + menuW > 790) mx = x - menuW - 30;
    if (my < 50) my = 50;
    if (my + menuH > 590) my = 590 - menuH;

    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.6);
    bg.fillRoundedRect(mx, my, menuW, menuH, 8);
    bg.lineStyle(1, 0xffffff, 0.2);
    bg.strokeRoundedRect(mx, my, menuW, menuH, 8);

    const towerTypes: TowerType[] = ['fire', 'ice', 'lightning'];
    const names = ['火焰塔', '冰霜塔', '闪电塔'];
    const btnW = 72;
    const gap = 6;

    towerTypes.forEach((type, i) => {
      const cfg = TOWER_CONFIGS[type];
      const bx = mx + 10 + i * (btnW + gap);
      const by = my + 12;

      const btn = this.add.graphics();
      btn.fillStyle(cfg.color, 0.85);
      btn.fillRoundedRect(bx, by, btnW, 44, 6);
      btn.lineStyle(2, 0xffffff, 0.3);
      btn.strokeRoundedRect(bx, by, btnW, 44, 6);
      btn.setInteractive(new Phaser.Geom.Rectangle(bx, by, btnW, 44), Phaser.Geom.Rectangle.Contains);

      btn.on('pointerover', () => btn.setAlpha(1.2));
      btn.on('pointerout', () => btn.setAlpha(1));
      btn.on('pointerdown', () => {
        if (this.energy >= cfg.cost) {
          this.buildTower(type, x, y);
          this.hideBuildMenu();
        }
      });

      const icon = this.add.circle(bx + btnW / 2, by + 14, 8, cfg.color, 1);
      icon.setStrokeStyle(2, 0xffffff, 0.6);

      const nameText = this.add.text(bx + btnW / 2, by + 34, `${names[i]} ${cfg.cost}`, {
        font: 'bold 10px Microsoft YaHei',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 1
      }).setOrigin(0.5);

      this.buildMenuContainer.add([btn, icon, nameText]);
    });

    this.buildMenuContainer.add(bg);
  }

  private hideBuildMenu(): void {
    this.buildMenu.visible = false;
    this.buildMenuContainer.setVisible(false);
    this.buildMenuContainer.removeAll(true);
  }

  private buildTower(type: TowerType, x: number, y: number): void {
    const cfg = TOWER_CONFIGS[type];
    if (this.energy < cfg.cost) return;

    this.energy -= cfg.cost;
    this.updateUI();

    const tower = new Tower(this, x, y, type);
    this.towers.push(tower);
  }

  private showTowerInfo(tower: Tower): void {
    this.towerInfo = { visible: true, tower };
    this.towerInfoContainer.removeAll(true);
    this.towerInfoContainer.setVisible(true);

    this.towers.forEach(t => t.showRange(t === tower));

    const cfg = TOWER_CONFIGS[tower.type];
    const infoW = 200;
    const infoH = 150;
    let ix = tower.x + 35;
    let iy = tower.y - infoH / 2;
    if (ix + infoW > 790) ix = tower.x - infoW - 35;
    if (iy < 50) iy = 50;
    if (iy + infoH > 590) iy = 590 - infoH;

    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.65);
    bg.fillRoundedRect(ix, iy, infoW, infoH, 8);
    bg.lineStyle(1, 0xffffff, 0.2);
    bg.strokeRoundedRect(ix, iy, infoW, infoH, 8);

    const title = this.add.text(ix + infoW / 2, iy + 18, `${cfg.name} Lv.${tower.level}`, {
      font: 'bold 15px Microsoft YaHei',
      color: '#' + cfg.color.toString(16).padStart(6, '0'),
      stroke: '#000000',
      strokeThickness: 1
    }).setOrigin(0.5);

    const line1 = this.add.text(ix + 12, iy + 42, `攻击力: ${tower.damage}`, {
      font: '12px Microsoft YaHei', color: '#ffffff', stroke: '#000000', strokeThickness: 1
    });
    const line2 = this.add.text(ix + 12, iy + 58, `攻击范围: ${tower.range}`, {
      font: '12px Microsoft YaHei', color: '#ffffff', stroke: '#000000', strokeThickness: 1
    });
    const line3 = this.add.text(ix + 12, iy + 74, tower.isFlooded ? '状态: 浸水(减速50%)' : '状态: 正常', {
      font: '12px Microsoft YaHei',
      color: tower.isFlooded ? '#66ccff' : '#88ff88',
      stroke: '#000000',
      strokeThickness: 1
    });

    const btnH = 26;
    const btnW = 84;
    const gap = 8;
    const startX = ix + (infoW - btnW * 2 - gap) / 2;
    const btnY = iy + infoH - 38;

    const upgCost = tower.getUpgradeCost();
    const upgText = upgCost > 0 ? `升级 ${upgCost}` : '已满级';
    const upgEnabled = upgCost > 0 && this.energy >= upgCost;

    const upgBtn = this.add.graphics();
    upgBtn.fillStyle(upgEnabled ? 0x44aa44 : 0x555555, 0.9);
    upgBtn.fillRoundedRect(startX, btnY, btnW, btnH, 5);
    upgBtn.lineStyle(1, 0xffffff, 0.2);
    upgBtn.strokeRoundedRect(startX, btnY, btnW, btnH, 5);
    if (upgEnabled) {
      upgBtn.setInteractive(new Phaser.Geom.Rectangle(startX, btnY, btnW, btnH), Phaser.Geom.Rectangle.Contains);
      upgBtn.on('pointerdown', () => {
        if (tower.upgrade()) {
          this.energy -= upgCost;
          this.updateUI();
          this.showTowerInfo(tower);
        }
      });
    }
    const upgLabel = this.add.text(startX + btnW / 2, btnY + btnH / 2, upgText, {
      font: 'bold 11px Microsoft YaHei',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 1
    }).setOrigin(0.5);

    const sellX = startX + btnW + gap;
    const sellValue = tower.getSellValue();
    const sellBtn = this.add.graphics();
    sellBtn.fillStyle(0xaa4444, 0.9);
    sellBtn.fillRoundedRect(sellX, btnY, btnW, btnH, 5);
    sellBtn.lineStyle(1, 0xffffff, 0.2);
    sellBtn.strokeRoundedRect(sellX, btnY, btnW, btnH, 5);
    sellBtn.setInteractive(new Phaser.Geom.Rectangle(sellX, btnY, btnW, btnH), Phaser.Geom.Rectangle.Contains);
    sellBtn.on('pointerdown', () => {
      this.energy += sellValue;
      this.updateUI();
      const idx = this.towers.indexOf(tower);
      if (idx >= 0) this.towers.splice(idx, 1);
      tower.showRange(false);
      tower.destroy();
      this.hideTowerInfo();
    });
    const sellLabel = this.add.text(sellX + btnW / 2, btnY + btnH / 2, `出售 +${sellValue}`, {
      font: 'bold 11px Microsoft YaHei',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 1
    }).setOrigin(0.5);

    this.towerInfoContainer.add([
      bg, title, line1, line2, line3,
      upgBtn, upgLabel, sellBtn, sellLabel
    ]);
  }

  private hideTowerInfo(): void {
    this.towerInfo.visible = false;
    this.towerInfo.tower = null;
    this.towerInfoContainer.setVisible(false);
    this.towerInfoContainer.removeAll(true);
    this.towers.forEach(t => t.showRange(false));
  }

  private startLaserAim(): void {
    if (this.energy < LASER_COST || this.uiState.isPaused || this.uiState.isGameOver) return;

    this.laserState.aiming = true;
    this.game.canvas.style.cursor = 'crosshair';

    this.laserState.line = this.add.graphics();
    this.laserState.line.setDepth(900);
  }

  private updateLaserAim(): void {
    if (!this.laserState.aiming || !this.laserState.line) return;

    const pointer = this.input.activePointer;
    const g = this.laserState.line;
    g.clear();

    const startX = LIGHTHOUSE_X;
    const startY = LIGHTHOUSE_Y - 60;

    const dx = pointer.x - startX;
    const dy = pointer.y - startY;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return;

    const nx = dx / len;
    const ny = dy / len;
    const endX = startX + nx * 2000;
    const endY = startY + ny * 2000;

    g.lineStyle(2, 0xffffff, 0.6);
    g.beginPath();
    g.moveTo(startX, startY);
    g.lineTo(endX, endY);
    g.strokePath();

    g.lineStyle(1, 0xffffcc, 0.3);
    g.strokePath();
  }

  private fireLaser(px: number, py: number): void {
    if (!this.laserState.aiming) return;

    this.laserState.aiming = false;
    this.game.canvas.style.cursor = 'default';
    if (this.laserState.line) {
      this.laserState.line.destroy();
      this.laserState.line = null;
    }

    if (this.energy < LASER_COST) return;
    this.energy -= LASER_COST;
    this.updateUI();

    const startX = LIGHTHOUSE_X;
    const startY = LIGHTHOUSE_Y - 60;
    const dx = px - startX;
    const dy = py - startY;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return;

    const nx = dx / len;
    const ny = dy / len;

    const beam = this.add.graphics();
    beam.setDepth(950);
    beam.lineStyle(4, 0xffffff, 1);
    beam.beginPath();
    beam.moveTo(startX, startY);
    beam.lineTo(startX + nx * 2000, startY + ny * 2000);
    beam.strokePath();

    beam.lineStyle(8, 0xffffaa, 0.4);
    beam.strokePath();

    let hitMonster: Monster | null = null;
    let hitDist = Infinity;

    for (const m of this.monsters) {
      if (!m.active) continue;
      const d = this.pointToRayDistance(m.x, m.y, startX, startY, nx, ny);
      const alongRay = (m.x - startX) * nx + (m.y - startY) * ny;
      if (alongRay < 0) continue;

      const hitRadius = m.isElite ? 16 : 12;
      if (d < hitRadius && alongRay < hitDist) {
        hitMonster = m;
        hitDist = alongRay;
      }
    }

    this.tweens.add({
      targets: beam,
      alpha: { from: 1, to: 0 },
      duration: 100,
      onComplete: () => beam.destroy()
    });

    if (hitMonster) {
      this.createLaserExplosion(hitMonster.x, hitMonster.y);
      hitMonster.takeDamage(LASER_DAMAGE);

      for (const m of this.monsters) {
        if (m === hitMonster || !m.active) continue;
        const d = Phaser.Math.Distance.Between(hitMonster.x, hitMonster.y, m.x, m.y);
        if (d <= 20) {
          m.takeDamage(LASER_DAMAGE * 0.3);
        }
      }
    }
  }

  private pointToRayDistance(
    px: number, py: number,
    rx: number, ry: number,
    nx: number, ny: number
  ): number {
    const vx = px - rx;
    const vy = py - ry;
    const t = vx * nx + vy * ny;
    if (t < 0) return Infinity;
    const closestX = rx + nx * t;
    const closestY = ry + ny * t;
    return Phaser.Math.Distance.Between(px, py, closestX, closestY);
  }

  private createLaserExplosion(x: number, y: number): void {
    const flash = this.add.circle(x, y, 20, 0xffffff, 0.9);
    flash.setDepth(960);
    this.tweens.add({
      targets: flash,
      alpha: { from: 0.9, to: 0 },
      scale: { from: 1, to: 0.3 },
      duration: 100,
      onComplete: () => flash.destroy()
    });

    const shock = this.add.circle(x, y, 5, 0xffdd88, 0.8);
    shock.setStrokeStyle(3, 0xffaa44, 0.8);
    shock.setDepth(955);
    this.tweens.add({
      targets: shock,
      radius: 40,
      alpha: { from: 0.8, to: 0 },
      duration: 400,
      ease: 'Cubic.easeOut',
      onComplete: () => shock.destroy()
    });
  }

  private updateMonsters(delta: number): void {
    for (let i = this.monsters.length - 1; i >= 0; i--) {
      const m = this.monsters[i];
      const wasActive = m.active;
      const wasReached = m.reachedEnd;

      m.update(delta, LIGHTHOUSE_X, LIGHTHOUSE_Y);

      if (wasActive && !m.active) {
        if (wasReached) {
          this.energy -= m.isElite ? 30 : 10;
          if (this.energy < 0) this.energy = 0;
          this.updateUI();
          this.checkGameOver();
        } else {
          this.energy += KILL_ENERGY;
          if (m.isElite) {
            this.energy += ELITE_DROP_ENERGY;
            this.createEnergyDrop(m.x, m.y);
          }
          this.updateUI();
        }
      }

      if (!m.active && !m.body.scene) {
        this.monsters.splice(i, 1);
      }
    }

    this.monsters = this.monsters.filter(m => m.body.scene !== null);
  }

  private createEnergyDrop(x: number, y: number): void {
    const drop = this.add.circle(x, y, 6, 0x88ff88, 1);
    drop.setStrokeStyle(2, 0xffffff, 0.6);
    drop.setDepth(200);

    this.tweens.add({
      targets: drop,
      y: y - 30,
      alpha: { from: 1, to: 0 },
      scale: { from: 1, to: 0.5 },
      duration: 600,
      ease: 'Cubic.easeOut',
      onComplete: () => drop.destroy()
    });

    const plusText = this.add.text(x, y - 40, '+30', {
      font: 'bold 14px Microsoft YaHei',
      color: '#88ff88',
      stroke: '#004400',
      strokeThickness: 1
    }).setOrigin(0.5);
    plusText.setDepth(201);
    this.tweens.add({
      targets: plusText,
      y: y - 70,
      alpha: { from: 1, to: 0 },
      duration: 800,
      onComplete: () => plusText.destroy()
    });
  }

  private updateTowers(): void {
    for (const tower of this.towers) {
      const target = tower.findTarget(this.monsters);
      if (target) {
        tower.attack(target, this.monsters);
      }
    }
  }

  private updateTide(_delta: number): void {
    const now = this.time.now;

    if (!this.tideActive && now >= this.nextTideTime) {
      this.tideActive = true;
      this.tideStartTime = now;
      this.nextTideTime = now + TIDE_DURATION + TIDE_INTERVAL;
      this.onTideStart();
    }

    if (this.tideActive && now - this.tideStartTime >= TIDE_DURATION) {
      this.tideActive = false;
      this.onTideEnd();
    }
  }

  private onTideStart(): void {
    this.updateFloodedTowers();
    this.createFoamParticles();
  }

  private onTideEnd(): void {
    for (const t of this.towers) t.setFlooded(false);
    this.createFoamParticles();
  }

  private updateFloodedTowers(): void {
    for (const t of this.towers) {
      const isEdge = this.distanceToIslandEdge(t.x, t.y) < TIDE_HEIGHT + 15;
      t.setFlooded(isEdge);
    }
  }

  private createFoamParticles(): void {
    const points = this.islandPolygon.points as Phaser.Geom.Point[];
    for (let i = 0; i < 10; i++) {
      const idx = Math.floor(Math.random() * points.length);
      const p = points[idx];
      const inward = 5 + Math.random() * 10;
      const cx = (p.x - LIGHTHOUSE_X);
      const cy = (p.y - LIGHTHOUSE_Y);
      const clen = Math.sqrt(cx * cx + cy * cy);
      const nx = cx / clen;
      const ny = cy / clen;

      const startX = p.x + nx * 8;
      const startY = p.y + ny * 8;
      const endX = p.x - nx * inward;
      const endY = p.y - ny * inward;

      const foam = this.add.circle(startX, startY, 1 + Math.random(), 0xffffff, 0.9);
      foam.setDepth(150);
      this.tweens.add({
        targets: foam,
        x: endX,
        y: endY,
        alpha: { from: 0.9, to: 0 },
        scale: { from: 1, to: 0.2 },
        duration: 1500 + Math.random() * 500,
        onComplete: () => foam.destroy()
      });
    }
  }

  private scheduleFirstWave(): void {
    this.nextWaveTime = this.time.now + 5000;
  }

  private updateWaveSpawning(_delta: number): void {
    const now = this.time.now;

    if (this.monstersToSpawn > 0) {
      this.spawnTimer--;
      if (this.spawnTimer <= 0) {
        this.spawnMonster();
        this.monstersToSpawn--;
        this.spawnTimer = 500 + Math.floor(Math.random() * 300);
      }
      return;
    }

    if (this.monsters.length === 0 && now >= this.nextWaveTime) {
      this.startNextWave();
    }
  }

  private startNextWave(): void {
    this.waveNumber++;
    this.uiState.wave = this.waveNumber;
    this.monstersToSpawn = 5 + (this.waveNumber - 1) * 2;

    const interval = WAVE_INTERVAL_MIN + Math.random() * (WAVE_INTERVAL_MAX - WAVE_INTERVAL_MIN);
    this.nextWaveTime = this.time.now + interval;

    this.updateUI();

    const banner = this.add.text(400, 100, `第 ${this.waveNumber} 波`, {
      font: 'bold 36px Microsoft YaHei',
      color: '#ff4444',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5);
    banner.setDepth(800);
    this.tweens.add({
      targets: banner,
      alpha: { from: 1, to: 0 },
      scale: { from: 1.2, to: 1 },
      duration: 2000,
      onComplete: () => banner.destroy()
    });
  }

  private spawnMonster(): void {
    const startY = 100 + Math.random() * 400;
    const path = this.generateBezierPath(startY);

    const isElite = this.waveNumber % 5 === 0 && Math.random() < 0.3;
    const baseHealth = 80 + (this.waveNumber - 1) * 15;
    const baseSpeed = 60;

    const monster = new Monster(this, path, baseHealth, baseSpeed, isElite);
    this.monsters.push(monster);
  }

  private generateBezierPath(startY: number): BezierPath {
    const endX = LIGHTHOUSE_X;
    const endY = LIGHTHOUSE_Y;

    const startX = 820;

    const cp1x = 700 + Math.random() * 50;
    const cp1y = startY + (Math.random() - 0.5) * 100;

    const cp2x = 550 + Math.random() * 50;
    const cp2y = endY + (startY - endY) * 0.5 + (Math.random() - 0.5) * 80;

    return {
      startX,
      startY,
      controlX1: cp1x,
      controlY1: cp1y,
      controlX2: cp2x,
      controlY2: cp2y,
      endX,
      endY
    };
  }

  private updateAliveCount(): void {
    const alive = this.monsters.filter(m => m.active).length;
    this.uiState.aliveMonsters = alive;
    this.uiMonstersText.setText('存活: ' + alive);
  }

  private togglePause(): void {
    if (this.uiState.isGameOver) return;

    this.uiState.isPaused = !this.uiState.isPaused;
    this.uiPauseOverlay.setVisible(this.uiState.isPaused);
    this.uiPauseText.setVisible(this.uiState.isPaused);
  }

  private checkGameOver(): void {
    if (this.energy <= 0) {
      this.triggerGameOver();
    }
  }

  private triggerGameOver(): void {
    this.uiState.isGameOver = true;

    const overlay = this.add.graphics();
    overlay.setDepth(2000);
    overlay.fillStyle(0x000000, 0.75);
    overlay.fillRect(0, 0, 800, 600);

    const title = this.add.text(400, 250, '灯塔熄灭', {
      font: 'bold 48px Microsoft YaHei',
      color: '#ff4444',
      stroke: '#440000',
      strokeThickness: 4
    }).setOrigin(0.5);
    title.setDepth(2001);

    const sub = this.add.text(400, 310, `你坚守了 ${this.waveNumber} 波暗影潮汐`, {
      font: '20px Microsoft YaHei',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);
    sub.setDepth(2001);

    const restartBtn = this.add.graphics();
    restartBtn.setDepth(2001);
    restartBtn.fillStyle(0x4488ff, 0.9);
    restartBtn.fillRoundedRect(320, 360, 160, 50, 8);
    restartBtn.lineStyle(2, 0xffffff, 0.4);
    restartBtn.strokeRoundedRect(320, 360, 160, 50, 8);
    restartBtn.setInteractive(new Phaser.Geom.Rectangle(320, 360, 160, 50), Phaser.Geom.Rectangle.Contains);

    const restartLabel = this.add.text(400, 385, '重新开始', {
      font: 'bold 20px Microsoft YaHei',
      color: '#ffffff',
      stroke: '#000044',
      strokeThickness: 2
    }).setOrigin(0.5);
    restartLabel.setDepth(2002);

    restartBtn.on('pointerdown', () => {
      this.scene.restart();
    });
  }

  private updateUI(): void {
    this.uiState.energy = this.energy;
    this.uiEnergyText.setText('能量: ' + this.energy);
    this.uiWaveText.setText('波次: ' + this.waveNumber);
  }
}
