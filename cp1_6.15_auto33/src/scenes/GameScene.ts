import Phaser from 'phaser';
import { Tower, TowerType, TOWER_CONFIGS } from '../entities/Tower';
import { Enemy } from '../entities/Enemy';
import { WaveManager, EnemyType } from '../managers/WaveManager';
import { ResourceManager } from '../managers/ResourceManager';

const GRID_COLS = 8;
const GRID_ROWS = 6;
const TILE_WIDTH = 80;
const TILE_HEIGHT = 40;

const TILE_PATH = 0;
const TILE_BLOCKED = 1;
const TILE_PLACEABLE = 2;

const PATH_COORDS: [number, number][] = [
  [0, 2], [1, 2], [2, 2], [2, 1], [2, 0],
  [3, 0], [4, 0], [4, 1], [4, 2], [4, 3],
  [4, 4], [5, 4], [6, 4], [6, 3], [6, 2],
  [6, 1], [7, 1]
];

export class GameScene extends Phaser.Scene {
  private _resourceManager!: ResourceManager;
  private _waveManager!: WaveManager;

  private _gridMap: number[][] = [];
  private _mapOffsetX: number = 0;
  private _mapOffsetY: number = 0;

  private _tiles: Phaser.GameObjects.Graphics[] = [];
  private _tileHoverGraphics: Phaser.GameObjects.Graphics | null = null;
  private _hoveredTile: { col: number; row: number } | null = null;

  private _towers: Tower[] = [];
  private _enemies: Enemy[] = [];

  private _selectedTowerType: TowerType | null = null;
  private _placementGhost: Phaser.GameObjects.Container | null = null;
  private _selectedTower: Tower | null = null;

  private _uiLayer: Phaser.GameObjects.Container | null = null;
  private _waveLabel: Phaser.GameObjects.Text | null = null;
  private _livesLabel: Phaser.GameObjects.Text | null = null;
  private _goldLabel: Phaser.GameObjects.Text | null = null;
  private _scoreLabel: Phaser.GameObjects.Text | null = null;

  private _towerButtons: Map<TowerType, Phaser.GameObjects.Container> = new Map();
  private _nextWaveBtn: Phaser.GameObjects.Container | null = null;
  private _autoWaveBtn: Phaser.GameObjects.Container | null = null;

  private _countdownText: Phaser.GameObjects.Text | null = null;
  private _countdownRings: Phaser.GameObjects.Graphics[] = [];
  private _upgradePanel: Phaser.GameObjects.Container | null = null;

  private _minimapContainer: Phaser.GameObjects.Container | null = null;
  private _minimapGraphics: Phaser.GameObjects.Graphics | null = null;
  private _minimapViewport: Phaser.GameObjects.Graphics | null = null;
  private _minimapLastUpdate: number = 0;
  private _isDraggingMinimap: boolean = false;
  private _minimapCameraTargetX: number = 0;
  private _minimapCameraTargetY: number = 0;
  private _isCameraPanning: boolean = false;

  private _gameOverOverlay: Phaser.GameObjects.Container | null = null;
  private _pathPoints: Phaser.Geom.Point[] = [];

  private _displayValues = { gold: 200, lives: 20, score: 0, wave: 0 };
  private _animatingNumbers = new Set<string>();

  constructor() {
    super({ key: 'GameScene' });
  }

  public init(): void {
    ResourceManager.destroy();
    this._resourceManager = ResourceManager.getInstance();
    this._resourceManager.setScene(this);
    this._resourceManager.reset();
    this._displayValues = { gold: 200, lives: 20, score: 0, wave: 0 };
  }

  public create(): void {
    this._createBackground();
    this._initializeGridMap();
    this._calculateMapOffset();
    this._renderIsometricMap();
    this._buildPathPoints();
    this._createWaveManager();
    this._createUI();
    this._createTowerSelection();
    this._createMinimap();
    this._setupInputListeners();
    this._setupResourceListener();

    this._waveManager.startNextWave();
  }

  private _createBackground(): void {
    const { width, height } = this.cameras.main;
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0f0a2e, 0x1e1b4b, 0x1a1040, 0x2d2458, 1);
    bg.fillRect(0, 0, width, height);
    bg.setDepth(-10);

    const gridPattern = this.add.graphics();
    gridPattern.lineStyle(1, 0xffffff, 0.03);
    for (let x = 0; x < width; x += 40) {
      gridPattern.moveTo(x, 0);
      gridPattern.lineTo(x, height);
    }
    for (let y = 0; y < height; y += 40) {
      gridPattern.moveTo(0, y);
      gridPattern.lineTo(width, y);
    }
    gridPattern.strokePath();
    gridPattern.setDepth(-5);
  }

  private _initializeGridMap(): void {
    this._gridMap = [];
    for (let r = 0; r < GRID_ROWS; r++) {
      const row: number[] = [];
      for (let c = 0; c < GRID_COLS; c++) {
        row.push(TILE_PLACEABLE);
      }
      this._gridMap.push(row);
    }

    for (const [c, r] of PATH_COORDS) {
      if (r >= 0 && r < GRID_ROWS && c >= 0 && c < GRID_COLS) {
        this._gridMap[r][c] = TILE_PATH;
      }
    }

    const blocked: [number, number][] = [
      [0, 0], [0, 1], [1, 0], [1, 1],
      [3, 2], [3, 3], [5, 0], [5, 1],
      [5, 2], [5, 3], [7, 0], [7, 2],
      [7, 3], [7, 4], [7, 5]
    ];
    for (const [c, r] of blocked) {
      if (r >= 0 && r < GRID_ROWS && c >= 0 && c < GRID_COLS) {
        if (this._gridMap[r][c] === TILE_PLACEABLE) {
          this._gridMap[r][c] = TILE_BLOCKED;
        }
      }
    }
  }

  private _calculateMapOffset(): void {
    const { width, height } = this.cameras.main;
    const mapPixelWidth = (GRID_COLS + GRID_ROWS) * (TILE_WIDTH / 2);
    const mapPixelHeight = (GRID_COLS + GRID_ROWS) * (TILE_HEIGHT / 2);
    this._mapOffsetX = width / 2;
    this._mapOffsetY = (height - mapPixelHeight) / 2 + 60;
  }

  private _gridToIso(col: number, row: number): { x: number; y: number } {
    const x = (col - row) * (TILE_WIDTH / 2) + this._mapOffsetX;
    const y = (col + row) * (TILE_HEIGHT / 2) + this._mapOffsetY;
    return { x, y };
  }

  private _isoToGrid(x: number, y: number): { col: number; row: number } {
    const px = x - this._mapOffsetX;
    const py = y - this._mapOffsetY;
    const col = (px / (TILE_WIDTH / 2) + py / (TILE_HEIGHT / 2)) / 2;
    const row = (py / (TILE_HEIGHT / 2) - px / (TILE_WIDTH / 2)) / 2;
    return { col: Math.floor(col), row: Math.floor(row) };
  }

  private _renderIsometricMap(): void {
    this._tiles.forEach((t) => t.destroy());
    this._tiles = [];

    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const { x, y } = this._gridToIso(c, r);
        const g = this.add.graphics();
        const tileType = this._gridMap[r][c];

        let topColor: number, sideColor: number;
        if (tileType === TILE_PATH) {
          topColor = 0x374151;
          sideColor = 0x1f2937;
        } else if (tileType === TILE_BLOCKED) {
          topColor = 0x4d7c0f;
          sideColor = 0x365314;
        } else {
          topColor = 0xfef08a;
          sideColor = 0xca8a04;
        }

        g.fillStyle(topColor, 1);
        g.beginPath();
        g.moveTo(x, y - TILE_HEIGHT / 2);
        g.lineTo(x + TILE_WIDTH / 2, y);
        g.lineTo(x, y + TILE_HEIGHT / 2);
        g.lineTo(x - TILE_WIDTH / 2, y);
        g.closePath();
        g.fillPath();

        g.fillStyle(sideColor, 1);
        g.beginPath();
        g.moveTo(x - TILE_WIDTH / 2, y);
        g.lineTo(x, y + TILE_HEIGHT / 2);
        g.lineTo(x, y + TILE_HEIGHT / 2 + 12);
        g.lineTo(x - TILE_WIDTH / 2, y + 12);
        g.closePath();
        g.fillPath();

        g.beginPath();
        g.moveTo(x + TILE_WIDTH / 2, y);
        g.lineTo(x, y + TILE_HEIGHT / 2);
        g.lineTo(x, y + TILE_HEIGHT / 2 + 12);
        g.lineTo(x + TILE_WIDTH / 2, y + 12);
        g.closePath();
        g.fillPath();

        g.lineStyle(1, 0xffffff, 0.12);
        g.beginPath();
        g.moveTo(x, y - TILE_HEIGHT / 2);
        g.lineTo(x + TILE_WIDTH / 2, y);
        g.lineTo(x, y + TILE_HEIGHT / 2);
        g.lineTo(x - TILE_WIDTH / 2, y);
        g.closePath();
        g.strokePath();

        g.setDepth((r + c) * 2);
        this._tiles.push(g);
      }
    }

    this._tileHoverGraphics = this.add.graphics();
    this._tileHoverGraphics.setDepth(900);
  }

  private _buildPathPoints(): void {
    this._pathPoints = [];
    for (const [c, r] of PATH_COORDS) {
      const { x, y } = this._gridToIso(c, r);
      this._pathPoints.push(new Phaser.Geom.Point(x, y - 10));
    }
  }

  private _createWaveManager(): void {
    this._waveManager = new WaveManager(this);
    this._waveManager.onCountdown((count) => this._showCountdown(count));
    this._waveManager.onCountdownComplete(() => this._hideCountdown());
    this._waveManager.onSpawnEnemy((type) => this._spawnEnemy(type));
    this._waveManager.onStateChange(() => this._updateWaveButton());
  }

  private _spawnEnemy(type: EnemyType): void {
    const enemy = new Enemy(this, 0, 0, type, this._pathPoints);
    enemy.onDeath(() => {
      this._waveManager.enemyDied();
      const idx = this._enemies.indexOf(enemy);
      if (idx > -1) this._enemies.splice(idx, 1);
    });
    enemy.onReachEnd(() => {
      this._waveManager.enemyReachedEnd();
      const idx = this._enemies.indexOf(enemy);
      if (idx > -1) this._enemies.splice(idx, 1);
      if (this._resourceManager.lives <= 0) {
        this._triggerGameOver();
      }
    });
    this._enemies.push(enemy);
  }

  private _createUI(): void {
    const { width } = this.cameras.main;

    const topBar = this.add.graphics();
    topBar.fillStyle(0x0f172a, 0.85);
    topBar.fillRect(0, 0, width, 60);
    topBar.lineStyle(2, 0x6366f1, 0.4);
    topBar.lineBetween(0, 60, width, 60);
    topBar.setDepth(1000);

    const createStat = (x: number, label: string, color: string) => {
      const txt = this.add.text(x, 30, `${label}: 0`, {
        fontSize: '18px',
        color,
        fontStyle: 'bold',
        stroke: '#0f172a',
        strokeThickness: 3
      });
      txt.setOrigin(0, 0.5);
      txt.setDepth(1001);
      return txt;
    };

    this._waveLabel = createStat(30, '波次', '#fbbf24');
    this._livesLabel = createStat(200, '生命', '#ef4444');
    this._goldLabel = createStat(380, '金币', '#22d3ee');
    this._scoreLabel = createStat(560, '得分', '#a78bfa');

    this._createBottomBar();
  }

  private _createBottomBar(): void {
    const { width, height } = this.cameras.main;
    const bottomBar = this.add.graphics();
    bottomBar.fillStyle(0x0f172a, 0.9);
    bottomBar.fillRect(0, height - 100, width, 100);
    bottomBar.lineStyle(2, 0x6366f1, 0.4);
    bottomBar.lineBetween(0, height - 100, width, height - 100);
    bottomBar.setDepth(1000);
  }

  private _createTowerSelection(): void {
    const { width, height } = this.cameras.main;
    const towerTypes: TowerType[] = [
      TowerType.ARROW, TowerType.CANNON, TowerType.MAGIC,
      TowerType.ICE, TowerType.ELECTRIC
    ];

    towerTypes.forEach((type, index) => {
      const config = TOWER_CONFIGS[type];
      const x = 30 + index * 110;
      const y = height - 50;

      const container = this.add.container(x, y);
      container.setDepth(1001);
      container.setSize(90, 70);
      container.setInteractive({ useHandCursor: true });

      const bg = this.add.graphics();
      bg.fillStyle(0x1e1b4b, 1);
      bg.fillRoundedRect(-45, -35, 90, 70, 8);
      bg.lineStyle(2, 0x4338ca, 1);
      bg.strokeRoundedRect(-45, -35, 90, 70, 8);
      container.add(bg);

      const icon = this.add.circle(0, -12, 16, config.color);
      icon.setStrokeStyle(2, 0x0f172a, 1);
      container.add(icon);

      const accent = this.add.circle(0, -14, 7, 0xffffff, 0.25);
      container.add(accent);

      const nameTxt = this.add.text(0, 12, config.name, {
        fontSize: '12px',
        color: '#e2e8f0',
        fontStyle: 'bold'
      });
      nameTxt.setOrigin(0.5);
      container.add(nameTxt);

      const costTxt = this.add.text(0, 26, `${config.cost}金`, {
        fontSize: '11px',
        color: '#22d3ee'
      });
      costTxt.setOrigin(0.5);
      container.add(costTxt);

      container.on('pointerover', () => {
        bg.lineStyle(3, 0x60a5fa, 1);
      });
      container.on('pointerout', () => {
        if (this._selectedTowerType !== type) {
          bg.lineStyle(2, 0x4338ca, 1);
        }
      });
      container.on('pointerdown', () => {
        this._selectTowerType(type);
      });

      this._towerButtons.set(type, container);
    });

    this._createWaveButtons();
  }

  private _selectTowerType(type: TowerType): void {
    if (this._selectedTowerType === type) {
      this._selectedTowerType = null;
      this._destroyPlacementGhost();
    } else {
      this._selectedTowerType = type;
    }

    this._towerButtons.forEach((container, t) => {
      const bg = container.first as Phaser.GameObjects.Graphics;
      if (bg) {
        if (t === this._selectedTowerType) {
          bg.lineStyle(3, 0xfbbf24, 1);
        } else {
          bg.lineStyle(2, 0x4338ca, 1);
        }
      }
    });

    this._hideUpgradePanel();
    this._deselectTower();
  }

  private _createWaveButtons(): void {
    const { width, height } = this.cameras.main;

    this._nextWaveBtn = this.add.container(width - 200, height - 50);
    this._nextWaveBtn.setDepth(1001);
    this._nextWaveBtn.setSize(140, 50);
    this._nextWaveBtn.setInteractive({ useHandCursor: true });

    const nextBg = this.add.graphics();
    nextBg.fillStyle(0x059669, 1);
    nextBg.fillRoundedRect(-70, -25, 140, 50, 8);
    this._nextWaveBtn.add(nextBg);

    const nextTxt = this.add.text(0, 0, '▶ 开始下一波', {
      fontSize: '15px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    nextTxt.setOrigin(0.5);
    this._nextWaveBtn.add(nextTxt);

    this._nextWaveBtn.on('pointerover', () => nextBg.fillStyle(0x10b981, 1));
    this._nextWaveBtn.on('pointerout', () => nextBg.fillStyle(0x059669, 1));
    this._nextWaveBtn.on('pointerdown', () => this._waveManager.startNextWave());

    this._autoWaveBtn = this.add.container(width - 60, height - 50);
    this._autoWaveBtn.setDepth(1001);
    this._autoWaveBtn.setSize(50, 50);
    this._autoWaveBtn.setInteractive({ useHandCursor: true });

    const autoBg = this.add.graphics();
    autoBg.fillStyle(0x1e1b4b, 1);
    autoBg.fillRoundedRect(-25, -25, 50, 50, 8);
    autoBg.lineStyle(2, 0x4338ca, 1);
    this._autoWaveBtn.add(autoBg);

    const autoTxt = this.add.text(0, 0, 'A', {
      fontSize: '18px',
      color: '#818cf8',
      fontStyle: 'bold'
    });
    autoTxt.setOrigin(0.5);
    this._autoWaveBtn.add(autoTxt);

    this._autoWaveBtn.on('pointerover', () => autoBg.lineStyle(3, 0x60a5fa, 1));
    this._autoWaveBtn.on('pointerout', () => {
      autoBg.lineStyle(2, this._waveManager.autoMode ? 0xfbbf24 : 0x4338ca, 1);
    });
    this._autoWaveBtn.on('pointerdown', () => {
      const enabled = this._waveManager.toggleAutoMode();
      autoBg.lineStyle(2, enabled ? 0xfbbf24 : 0x4338ca, 1);
      autoTxt.setColor(enabled ? '#fbbf24' : '#818cf8');
      autoTxt.setText(enabled ? 'AUTO' : 'A');
      autoTxt.setFontSize(enabled ? '11px' : '18px');
    });
  }

  private _updateWaveButton(): void {
    if (!this._nextWaveBtn) return;
    const state = this._waveManager.state;
    const bg = this._nextWaveBtn.first as Phaser.GameObjects.Graphics;
    const txt = this._nextWaveBtn.getAt(1) as Phaser.GameObjects.Text;
    if (!bg || !txt) return;

    let enabled = false;
    let label = '';
    if (state === 'idle' || state === 'completed') {
      enabled = true;
      label = '▶ 开始下一波';
    } else if (state === 'countdown') {
      label = '准备中...';
    } else if (state === 'spawning' || state === 'in_progress') {
      label = '⚔ 战斗中';
    }

    txt.setText(label);
    bg.fillStyle(enabled ? 0x059669 : 0x475569, 1);
    (this._nextWaveBtn as any).input.enabled = enabled;
  }

  private _showCountdown(count: number): void {
    const { width, height } = this.cameras.main;
    this._hideCountdown();

    for (let i = 0; i < 3; i++) {
      const ring = this.add.graphics();
      ring.setDepth(1999);
      ring.setPosition(width / 2, height / 2 - 100);
      ring.lineStyle(4, 0xfbbf24, 0.6 - i * 0.15);
      ring.strokeCircle(0, 0, 80 + i * 30);
      ring.setAlpha(0);
      this._countdownRings.push(ring);

      this.tweens.add({
        targets: ring,
        scaleX: { from: 0.5, to: 2 },
        scaleY: { from: 0.5, to: 2 },
        alpha: { from: 0.8, to: 0 },
        duration: 800,
        delay: i * 100,
        ease: 'Cubic.easeOut'
      });
    }

    this._countdownText = this.add.text(width / 2, height / 2 - 100, String(count), {
      fontSize: '120px',
      color: '#fbbf24',
      fontStyle: 'bold',
      stroke: '#0f172a',
      strokeThickness: 8
    });
    this._countdownText.setOrigin(0.5);
    this._countdownText.setDepth(2000);
    this._countdownText.setScale(0.2);
    this._countdownText.setAlpha(0);

    this.tweens.add({
      targets: this._countdownText,
      scaleX: { from: 0.2, to: 1.3 },
      scaleY: { from: 0.2, to: 1.3 },
      alpha: { from: 0, to: 1 },
      duration: 350,
      ease: 'Back.easeOut'
    });

    this.tweens.add({
      targets: this._countdownText,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      duration: 450,
      delay: 550,
      ease: 'Cubic.easeIn'
    });

    const flash = this.add.graphics();
    flash.fillStyle(0xfbbf24, 0.15);
    flash.fillCircle(width / 2, height / 2 - 100, 150);
    flash.setDepth(1998);
    flash.setAlpha(0);
    this.tweens.add({
      targets: flash,
      alpha: 0.3,
      scaleX: { from: 0.5, to: 1.2 },
      scaleY: { from: 0.5, to: 1.2 },
      duration: 300,
      ease: 'Cubic.easeOut',
      yoyo: true,
      hold: 0,
      onComplete: () => flash.destroy()
    });
  }

  private _hideCountdown(): void {
    if (this._countdownText) {
      this._countdownText.destroy();
      this._countdownText = null;
    }
    this._countdownRings.forEach((ring) => ring.destroy());
    this._countdownRings = [];
  }

  private _setupResourceListener(): void {
    this._resourceManager.onChange((gold, lives, score, wave) => {
      this._animateNumber('gold', this._goldLabel, gold, '金币');
      this._animateNumber('lives', this._livesLabel, lives, '生命');
      this._animateNumber('score', this._scoreLabel, score, '得分');
      this._animateNumber('wave', this._waveLabel, wave, '波次');
    });

    const rm = this._resourceManager;
    this._animateNumber('gold', this._goldLabel, rm.gold, '金币');
    this._animateNumber('lives', this._livesLabel, rm.lives, '生命');
    this._animateNumber('score', this._scoreLabel, rm.score, '得分');
    this._animateNumber('wave', this._waveLabel, rm.wave, '波次');
  }

  private _animateNumber(key: string, label: Phaser.GameObjects.Text | null, target: number, prefix: string): void {
    if (!label) return;
    if (this._animatingNumbers.has(key)) return;

    const start = (this._displayValues as any)[key] || 0;
    if (start === target) {
      label.setText(`${prefix}: ${target}`);
      return;
    }

    this._animatingNumbers.add(key);
    const duration = 300;
    const startTime = this.time.now;

    const update = () => {
      const elapsed = this.time.now - startTime;
      const t = Math.min(1, elapsed / duration);
      const eased = Phaser.Math.Easing.Cubic.Out(t);
      const current = Math.round(start + (target - start) * eased);
      label.setText(`${prefix}: ${current}`);

      if (t < 1) {
        this.time.delayedCall(16, update);
      } else {
        (this._displayValues as any)[key] = target;
        this._animatingNumbers.delete(key);
      }
    };
    update();
  }

  private _setupInputListeners(): void {
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this._handlePointerMove(pointer);
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.button !== 0) return;
      this._handlePointerDown(pointer);
    });

    this.input.keyboard?.on('keydown-ESC', () => {
      this._selectedTowerType = null;
      this._destroyPlacementGhost();
      this._deselectTower();
      this._selectTowerType(this._selectedTowerType!);
    });
  }

  private _handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (this._isDraggingMinimap) {
      this._handleMinimapDrag(pointer);
      return;
    }

    const { col, row } = this._isoToGrid(pointer.x, pointer.y);
    const isValid = col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS;

    const hoverChanged = !this._hoveredTile ||
      this._hoveredTile.col !== col ||
      this._hoveredTile.row !== row;

    if (hoverChanged) {
      this._hoveredTile = isValid ? { col, row } : null;
      this._updateHoverHighlight();
    }

    if (this._selectedTowerType && this._placementGhost) {
      if (isValid) {
        const { x, y } = this._gridToIso(col, row);
        this._placementGhost.setPosition(x, y - 20);
        const canPlace = this._canPlaceTower(col, row);
        this._placementGhost.setAlpha(canPlace ? 0.7 : 0.3);
      }
    }
  }

  private _handlePointerDown(pointer: Phaser.Input.Pointer): void {
    const { col, row } = this._isoToGrid(pointer.x, pointer.y);
    const isValid = col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS;

    if (this._selectedTowerType && isValid) {
      if (this._canPlaceTower(col, row)) {
        this._placeTower(col, row, this._selectedTowerType);
      }
      return;
    }

    if (isValid) {
      const tower = this._findTowerAt(col, row);
      if (tower) {
        this._selectExistingTower(tower);
      } else {
        this._deselectTower();
        this._hideUpgradePanel();
      }
    }
  }

  private _updateHoverHighlight(): void {
    if (!this._tileHoverGraphics) return;
    this._tileHoverGraphics.clear();

    if (!this._hoveredTile) return;
    const { col, row } = this._hoveredTile;
    const tileType = this._gridMap[row]?.[col];
    if (tileType === undefined) return;

    const { x, y } = this._gridToIso(col, row);

    if (tileType === TILE_PLACEABLE) {
      this._tileHoverGraphics.fillStyle(0xfde047, 0.15 + Math.sin(this.time.now / 200) * 0.05);
      this._tileHoverGraphics.beginPath();
      this._tileHoverGraphics.moveTo(x, y - TILE_HEIGHT / 2);
      this._tileHoverGraphics.lineTo(x + TILE_WIDTH / 2, y);
      this._tileHoverGraphics.lineTo(x, y + TILE_HEIGHT / 2);
      this._tileHoverGraphics.lineTo(x - TILE_WIDTH / 2, y);
      this._tileHoverGraphics.closePath();
      this._tileHoverGraphics.fillPath();
      this._tileHoverGraphics.lineStyle(2, 0xfde047, 0.5);
      this._tileHoverGraphics.strokePath();
    }
  }

  private _canPlaceTower(col: number, row: number): boolean {
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return false;
    if (this._gridMap[row][col] !== TILE_PLACEABLE) return false;
    if (this._findTowerAt(col, row)) return false;
    if (!this._resourceManager.canAfford(TOWER_CONFIGS[this._selectedTowerType!].cost)) return false;
    return true;
  }

  private _findTowerAt(col: number, row: number): Tower | null {
    return this._towers.find((t) => t.gridX === col && t.gridY === row) || null;
  }

  private _placeTower(col: number, row: number, type: TowerType): void {
    const config = TOWER_CONFIGS[type];
    if (!this._resourceManager.spendGold(config.cost)) return;

    const { x, y } = this._gridToIso(col, row);
    const tower = new Tower(this, x, y - 20, col, row, type, this._enemies);
    tower.setDepth((row + col) * 2 + 10);

    tower.onUpgrade = () => this._updateUpgradePanel(tower);

    this._towers.push(tower);

    if (this._selectedTowerType) {
      if (!this._resourceManager.canAfford(config.cost)) {
        this._selectedTowerType = null;
        this._destroyPlacementGhost();
        this._selectTowerType(this._selectedTowerType!);
      }
    }
  }

  private _destroyPlacementGhost(): void {
    if (this._placementGhost) {
      this._placementGhost.destroy();
      this._placementGhost = null;
    }
  }

  private _selectExistingTower(tower: Tower): void {
    this._selectedTowerType = null;
    this._destroyPlacementGhost();
    this._selectTowerType(this._selectedTowerType!);

    if (this._selectedTower) {
      this._selectedTower.setSelected(false);
    }
    this._selectedTower = tower;
    tower.setSelected(true);
    this._showUpgradePanel(tower);
  }

  private _deselectTower(): void {
    if (this._selectedTower) {
      this._selectedTower.setSelected(false);
      this._selectedTower = null;
    }
  }

  private _showUpgradePanel(tower: Tower): void {
    this._hideUpgradePanel();

    const { width, height } = this.cameras.main;
    this._upgradePanel = this.add.container(width - 280, 80);
    this._upgradePanel.setDepth(1500);

    const bg = this.add.graphics();
    bg.fillStyle(0x0f172a, 0.95);
    bg.fillRoundedRect(0, 0, 250, 200, 12);
    bg.lineStyle(3, 0x6366f1, 0.8);
    bg.strokeRoundedRect(0, 0, 250, 200, 12);
    this._upgradePanel.add(bg);

    const title = this.add.text(125, 20, `${tower.config.name} - Lv.${tower.level + 1}`, {
      fontSize: '18px',
      color: '#fbbf24',
      fontStyle: 'bold'
    });
    title.setOrigin(0.5);
    this._upgradePanel.add(title);

    const stats = tower.currentStats;
    const statLines = [
      `伤害: ${stats.damage}`,
      `范围: ${stats.range}`,
      `射速: ${(1000 / stats.fireRate).toFixed(1)}/s`
    ];

    statLines.forEach((line, i) => {
      const txt = this.add.text(20, 55 + i * 22, line, {
        fontSize: '14px',
        color: '#e2e8f0'
      });
      this._upgradePanel!.add(txt);
    });

    if (tower.type === TowerType.ICE && stats.slowAmount) {
      const slowTxt = this.add.text(20, 55 + 3 * 22, `减速: ${Math.round(stats.slowAmount * 100)}%`, {
        fontSize: '14px',
        color: '#7dd3fc'
      });
      this._upgradePanel!.add(slowTxt);
    }
    if (tower.type === TowerType.ELECTRIC && stats.chainCount) {
      const chainTxt = this.add.text(20, 55 + 3 * 22, `连锁: ${stats.chainCount}次`, {
        fontSize: '14px',
        color: '#fde047'
      });
      this._upgradePanel!.add(chainTxt);
    }

    if (!tower.isMaxLevel) {
      const upgradeCost = tower.upgradeCost;
      const canAfford = this._resourceManager.canAfford(upgradeCost);

      const btnContainer = this.add.container(125, 160);
      btnContainer.setSize(180, 40);
      btnContainer.setInteractive({ useHandCursor: true });

      const btnBg = this.add.graphics();
      btnBg.fillStyle(canAfford ? 0x059669 : 0x475569, 1);
      btnBg.fillRoundedRect(-90, -20, 180, 40, 8);
      btnContainer.add(btnBg);

      const btnTxt = this.add.text(0, 0, `升级 - ${upgradeCost}金`, {
        fontSize: '15px',
        color: '#ffffff',
        fontStyle: 'bold'
      });
      btnTxt.setOrigin(0.5);
      btnContainer.add(btnTxt);

      btnContainer.on('pointerdown', () => {
        if (this._resourceManager.spendGold(upgradeCost)) {
          tower.upgrade();
        }
      });

      this._upgradePanel.add(btnContainer);
    } else {
      const maxTxt = this.add.text(125, 160, '已达最高等级', {
        fontSize: '16px',
        color: '#a78bfa',
        fontStyle: 'bold'
      });
      maxTxt.setOrigin(0.5);
      this._upgradePanel.add(maxTxt);
    }

    this._upgradePanel.setScale(0.8);
    this._upgradePanel.setAlpha(0);
    this.tweens.add({
      targets: this._upgradePanel,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 250,
      ease: 'Back.easeOut'
    });
  }

  private _updateUpgradePanel(tower: Tower): void {
    if (this._selectedTower === tower) {
      this._showUpgradePanel(tower);
    }
  }

  private _hideUpgradePanel(): void {
    if (this._upgradePanel) {
      this.tweens.add({
        targets: this._upgradePanel,
        scaleX: 0.8,
        scaleY: 0.8,
        alpha: 0,
        duration: 200,
        ease: 'Cubic.easeIn',
        onComplete: () => {
          if (this._upgradePanel) {
            this._upgradePanel.destroy();
            this._upgradePanel = null;
          }
        }
      });
    }
  }

  private _createMinimap(): void {
    const { width } = this.cameras.main;
    const mmWidth = 200;
    const mmHeight = 120;
    const mmX = width - mmWidth - 20;
    const mmY = 90;

    this._minimapContainer = this.add.container(mmX, mmY);
    this._minimapContainer.setDepth(1000);

    const bg = this.add.graphics();
    bg.fillStyle(0x0f172a, 0.92);
    bg.fillRoundedRect(0, 0, mmWidth, mmHeight, 8);
    bg.lineStyle(2, 0x6366f1, 0.5);
    bg.strokeRoundedRect(0, 0, mmWidth, mmHeight, 8);
    this._minimapContainer.add(bg);

    this._minimapGraphics = this.add.graphics();
    this._minimapContainer.add(this._minimapGraphics);

    this._minimapViewport = this.add.graphics();
    this._minimapContainer.add(this._minimapViewport);

    this._minimapContainer.setSize(mmWidth, mmHeight);
    this._minimapContainer.setInteractive({ useHandCursor: true, draggable: false });

    this._minimapContainer.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.button !== 0) return;
      this._isDraggingMinimap = true;
      this._handleMinimapDrag(pointer);
    });

    this.input.on('pointerup', () => {
      this._isDraggingMinimap = false;
    });

    const title = this.add.text(mmWidth / 2, -18, '迷你地图', {
      fontSize: '13px',
      color: '#818cf8',
      fontStyle: 'bold'
    });
    title.setOrigin(0.5);
    this._minimapContainer.add(title);
  }

  private _getMinimapWorldBounds(): { minX: number; maxX: number; minY: number; maxY: number } {
    const mapPixelWidth = (GRID_COLS + GRID_ROWS) * (TILE_WIDTH / 2);
    const mapPixelHeight = (GRID_COLS + GRID_ROWS) * (TILE_HEIGHT / 2);
    return {
      minX: this._mapOffsetX - mapPixelWidth / 2 - 50,
      maxX: this._mapOffsetX + mapPixelWidth / 2 + 50,
      minY: this._mapOffsetY - 50,
      maxY: this._mapOffsetY + mapPixelHeight + 50
    };
  }

  private _worldToMinimap(worldX: number, worldY: number): { x: number; y: number } {
    const bounds = this._getMinimapWorldBounds();
    const mmWidth = 200;
    const mmHeight = 120;
    const x = ((worldX - bounds.minX) / (bounds.maxX - bounds.minX)) * mmWidth;
    const y = ((worldY - bounds.minY) / (bounds.maxY - bounds.minY)) * mmHeight;
    return { x, y };
  }

  private _minimapToWorld(mmX: number, mmY: number): { x: number; y: number } {
    const bounds = this._getMinimapWorldBounds();
    const mmWidth = 200;
    const mmHeight = 120;
    const x = bounds.minX + (mmX / mmWidth) * (bounds.maxX - bounds.minX);
    const y = bounds.minY + (mmY / mmHeight) * (bounds.maxY - bounds.minY);
    return { x, y };
  }

  private _handleMinimapDrag(pointer: Phaser.Input.Pointer): void {
    if (!this._minimapContainer || !this._minimapGraphics) return;

    const bounds = (this._minimapContainer as any).getBounds();
    const localX = Phaser.Math.Clamp(pointer.x - bounds.x, 0, 200);
    const localY = Phaser.Math.Clamp(pointer.y - bounds.y, 0, 120);

    const world = this._minimapToWorld(localX, localY);
    const { width, height } = this.cameras.main;

    const targetScrollX = world.x - width / 2;
    const targetScrollY = world.y - height / 2;

    const bounds2 = this._getMinimapWorldBounds();
    const maxScrollX = bounds2.maxX - width;
    const maxScrollY = bounds2.maxY - height;
    const clampedX = Phaser.Math.Clamp(targetScrollX, 0, Math.max(0, maxScrollX));
    const clampedY = Phaser.Math.Clamp(targetScrollY, 0, Math.max(0, maxScrollY));

    if (this._isCameraPanning) {
      this.tweens.killTweensOf(this.cameras.main);
    }

    this._isCameraPanning = true;
    this.tweens.add({
      targets: this.cameras.main,
      scrollX: clampedX,
      scrollY: clampedY,
      duration: 200,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this._isCameraPanning = false;
      }
    });
  }

  private _updateMinimapViewport(): void {
    if (!this._minimapViewport) return;
    this._minimapViewport.clear();

    const { width, height } = this.cameras.main;
    const scrollX = this.cameras.main.scrollX;
    const scrollY = this.cameras.main.scrollY;

    const topLeft = this._worldToMinimap(scrollX, scrollY);
    const bottomRight = this._worldToMinimap(scrollX + width, scrollY + height);

    this._minimapViewport.lineStyle(2, 0xfbbf24, 0.9);
    this._minimapViewport.strokeRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
    this._minimapViewport.fillStyle(0xfbbf24, 0.1);
    this._minimapViewport.fillRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
  }

  private _updateMinimap(): void {
    if (!this._minimapGraphics) return;
    const now = this.time.now;
    if (now - this._minimapLastUpdate < 200) {
      this._updateMinimapViewport();
      return;
    }
    this._minimapLastUpdate = now;

    this._minimapGraphics.clear();

    const mmWidth = 200;
    const mmHeight = 120;
    const cellW = mmWidth / GRID_COLS;
    const cellH = mmHeight / GRID_ROWS;

    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const tileType = this._gridMap[r][c];
        let color = 0xfef08a;
        if (tileType === TILE_PATH) color = 0x374151;
        else if (tileType === TILE_BLOCKED) color = 0x4d7c0f;

        this._minimapGraphics.fillStyle(color, 0.7);
        this._minimapGraphics.fillRect(c * cellW + 2, r * cellH + 2, cellW - 4, cellH - 4);
      }
    }

    for (const tower of this._towers) {
      const x = tower.gridX * cellW + cellW / 2 + 2;
      const y = tower.gridY * cellH + cellH / 2 + 2;
      this._minimapGraphics.fillStyle(tower.config.color, 1);
      this._minimapGraphics.fillCircle(x, y, 4);
    }

    for (const enemy of this._enemies) {
      if (!enemy.active || !enemy.isAlive) continue;
      const nearest = this._findNearestPathPoint(enemy.x, enemy.y);
      if (nearest) {
        const x = nearest.col * cellW + cellW / 2 + 2;
        const y = nearest.row * cellH + cellH / 2 + 2;
        this._minimapGraphics.fillStyle(0xef4444, 1);
        this._minimapGraphics.fillCircle(x, y, 3);
      }
    }
  }

  private _findNearestPathPoint(x: number, y: number): { col: number; row: number } | null {
    let nearest: { col: number; row: number } | null = null;
    let minDist = Infinity;

    for (let i = 0; i < PATH_COORDS.length; i++) {
      const [c, r] = PATH_COORDS[i];
      const pt = this._pathPoints[i];
      const dx = pt.x - x;
      const dy = pt.y - y;
      const dist = dx * dx + dy * dy;
      if (dist < minDist) {
        minDist = dist;
        nearest = { col: c, row: r };
      }
    }
    return nearest;
  }

  private _triggerGameOver(): void {
    if (this._gameOverOverlay) return;
    const { width, height } = this.cameras.main;

    this._gameOverOverlay = this.add.container(0, 0);
    this._gameOverOverlay.setDepth(5000);

    const mask = this.add.graphics();
    mask.fillStyle(0x000000, 0.8);
    mask.fillRect(0, 0, width, height);
    this._gameOverOverlay.add(mask);

    const title = this.add.text(width / 2, height / 2 - 60, 'GAME OVER', {
      fontSize: '96px',
      color: '#ef4444',
      fontStyle: 'bold',
      stroke: '#ffffff',
      strokeThickness: 6
    });
    title.setOrigin(0.5);
    this._gameOverOverlay.add(title);

    const scoreTxt = this.add.text(width / 2, height / 2 + 30, `最终得分: ${this._resourceManager.score}`, {
      fontSize: '32px',
      color: '#fbbf24',
      fontStyle: 'bold'
    });
    scoreTxt.setOrigin(0.5);
    this._gameOverOverlay.add(scoreTxt);

    const waveTxt = this.add.text(width / 2, height / 2 + 80, `存活波次: ${this._resourceManager.wave}`, {
      fontSize: '22px',
      color: '#a78bfa'
    });
    waveTxt.setOrigin(0.5);
    this._gameOverOverlay.add(waveTxt);

    const restartBtn = this.add.container(width / 2, height / 2 + 160);
    restartBtn.setSize(200, 56);
    restartBtn.setInteractive({ useHandCursor: true });

    const btnBg = this.add.graphics();
    btnBg.fillStyle(0x6366f1, 1);
    btnBg.fillRoundedRect(-100, -28, 200, 56, 12);
    restartBtn.add(btnBg);

    const btnTxt = this.add.text(0, 0, '重新开始', {
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    btnTxt.setOrigin(0.5);
    restartBtn.add(btnTxt);

    restartBtn.on('pointerover', () => btnBg.fillStyle(0x818cf8, 1));
    restartBtn.on('pointerout', () => btnBg.fillStyle(0x6366f1, 1));
    restartBtn.on('pointerdown', () => {
      this.scene.restart();
    });
    this._gameOverOverlay.add(restartBtn);

    title.setScale(0);
    title.setAlpha(0);
    scoreTxt.setAlpha(0);
    waveTxt.setAlpha(0);
    restartBtn.setAlpha(0);
    mask.setAlpha(0);

    this.tweens.add({
      targets: mask,
      alpha: 0.8,
      duration: 400
    });

    this.tweens.add({
      targets: title,
      scaleX: { from: 0, to: 1 },
      scaleY: { from: 0, to: 1 },
      alpha: { from: 0, to: 1 },
      duration: 800,
      delay: 200,
      ease: 'Back.easeOut'
    });

    this.tweens.add({
      targets: [scoreTxt, waveTxt, restartBtn],
      alpha: 1,
      duration: 500,
      delay: 800
    });
  }

  public update(time: number, delta: number): void {
    if (this._resourceManager.gameOver) return;

    for (const tower of this._towers) {
      tower.update(time, delta);
    }

    for (const enemy of this._enemies) {
      enemy.update(time, delta);
    }

    this._updateHoverHighlight();

    if (this._selectedTowerType && !this._placementGhost) {
      this._createPlacementGhost();
    } else if (!this._selectedTowerType && this._placementGhost) {
      this._destroyPlacementGhost();
    }

    this._updateMinimap();
  }

  private _createPlacementGhost(): void {
    if (!this._selectedTowerType || this._placementGhost) return;
    const config = TOWER_CONFIGS[this._selectedTowerType];

    this._placementGhost = this.add.container(0, 0);
    this._placementGhost.setDepth(800);
    this._placementGhost.setAlpha(0.7);

    const range = this.add.circle(0, 0, config.levels[0].range, 0x60a5fa, 0.12);
    range.setStrokeStyle(2, 0x60a5fa, 0.5);
    this._placementGhost.add(range);

    const body = this.add.circle(0, 0, config.levels[0].size, config.color);
    body.setStrokeStyle(3, 0x60a5fa, 1);
    this._placementGhost.add(body);

    const accent = this.add.circle(0, -2, config.levels[0].size * 0.45, 0xffffff, 0.25);
    this._placementGhost.add(accent);
  }
}
