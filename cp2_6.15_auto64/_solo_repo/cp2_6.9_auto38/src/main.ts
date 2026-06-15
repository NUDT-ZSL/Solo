import { GameMap, type HexCoord } from './gameMap';
import { TowerSystem, TOWER_CONFIGS, TowerType, type Enemy, getWeatherModifier } from './towerSystem';
import { WeatherSystem, WeatherType, WEATHER_CONFIGS } from './weatherSystem';
import { EnemySpawner } from './enemySpawner';

interface GameState {
  health: number;
  coins: number;
  isRunning: boolean;
}

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gameMap: GameMap;
  private towerSystem: TowerSystem;
  private weatherSystem: WeatherSystem;
  private enemySpawner: EnemySpawner;

  private state: GameState = {
    health: 10,
    coins: 100,
    isRunning: true
  };

  private selectedCell: HexCoord | null = null;
  private hoveredCell: HexCoord | null = null;
  private menuVisible: boolean = false;
  private lastFrameTime: number = 0;
  private animationId: number | null = null;

  private longPressTimer: number | null = null;
  private longPressTriggered: boolean = false;
  private isTouchDevice: boolean = false;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (!this.canvas) throw new Error('Canvas element not found');

    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;

    this.gameMap = new GameMap(this.canvas);
    this.towerSystem = new TowerSystem(this.canvas);
    this.weatherSystem = new WeatherSystem(this.canvas);
    this.enemySpawner = new EnemySpawner(this.canvas);

    this.init();
  }

  private init(): void {
    this.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    this.setupWeatherListeners();
    this.setupEnemyListeners();
    this.setupInputListeners();
    this.setupTowerStatsListener();

    this.enemySpawner.setPath(this.gameMap.getPathPixelPoints());
    this.enemySpawner.start();
    this.weatherSystem.start();

    this.lastFrameTime = performance.now();
    this.loop();
  }

  private resizeCanvas(): void {
    const container = document.getElementById('canvas-container');
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const maxWidth = Math.min(rect.width, 900);
    const maxHeight = Math.min(rect.height, 800);
    const size = Math.min(maxWidth, maxHeight);

    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = size * dpr;
    this.canvas.height = size * dpr;
    this.canvas.style.width = `${size}px`;
    this.canvas.style.height = `${size}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.gameMap.resize(size, size);
    this.towerSystem.setHexSize(this.gameMap.getHexSize());
    this.enemySpawner.setHexSize(this.gameMap.getHexSize());
    this.enemySpawner.setPath(this.gameMap.getPathPixelPoints());
  }

  private setupWeatherListeners(): void {
    this.weatherSystem.onChange((newWeather) => {
      this.towerSystem.setWeather(newWeather);
      this.showWeatherBanner(newWeather);
      this.refreshMenuStats();
    });
  }

  private setupEnemyListeners(): void {
    this.enemySpawner.setOnEnemyDied((enemy: Enemy) => {
      const reward = enemy.isElite ? 50 : 10;
      this.addCoins(reward);
    });

    this.enemySpawner.setOnEnemyReachedEnd(() => {
      this.deductHealth(1);
    });

    this.enemySpawner.setOnWaveChanged((wave: number) => {
      this.updateHUD('wave', wave);
    });
  }

  private setupTowerStatsListener(): void {
    this.towerSystem.onStatsChange(() => {
      this.refreshMenuStats();
    });
  }

  private setupInputListeners(): void {
    this.canvas.addEventListener('click', (e) => this.handleClick(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mouseleave', () => {
      this.hoveredCell = null;
    });

    if (this.isTouchDevice) {
      this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
      this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
      this.canvas.addEventListener('touchmove', (e) => {
        if (this.longPressTimer) {
          clearTimeout(this.longPressTimer);
          this.longPressTimer = null;
        }
      }, { passive: false });
    }

    document.addEventListener('click', (e) => {
      const towerMenu = document.getElementById('tower-menu');
      if (towerMenu && !towerMenu.contains(e.target as Node) && e.target !== this.canvas) {
        this.hideTowerMenu();
      }
    });
  }

  private handleClick(e: MouseEvent): void {
    if (this.isTouchDevice && this.longPressTriggered) {
      this.longPressTriggered = false;
      return;
    }

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.processCellInteraction(x, y, e.clientX, e.clientY);
  }

  private handleMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.hoveredCell = this.gameMap.pixelToHex(x, y);
  }

  private handleTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length !== 1) return;

    const touch = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    this.longPressTriggered = false;
    this.longPressTimer = window.setTimeout(() => {
      this.longPressTriggered = true;
      this.processCellInteraction(x, y, touch.clientX, touch.clientY);
    }, 500);
  }

  private handleTouchEnd(e: TouchEvent): void {
    e.preventDefault();
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    if (!this.longPressTriggered && e.changedTouches.length === 1) {
      const touch = e.changedTouches[0];
      const rect = this.canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      this.processCellInteraction(x, y, touch.clientX, touch.clientY);
    }
  }

  private processCellInteraction(canvasX: number, canvasY: number, screenX: number, screenY: number): void {
    const coord = this.gameMap.pixelToHex(canvasX, canvasY);
    if (!coord) {
      this.hideTowerMenu();
      this.selectedCell = null;
      return;
    }

    const cell = this.gameMap.getCell(coord.q, coord.r);
    if (!cell || cell.isPath || cell.isSpawn) {
      this.hideTowerMenu();
      this.selectedCell = null;
      return;
    }

    this.selectedCell = coord;

    if (this.towerSystem.hasTowerAt(coord.q, coord.r)) {
      this.showTowerPropertyPanel(coord, screenX, screenY);
    } else {
      this.showTowerMenu(coord, screenX, screenY);
    }
  }

  private showWeatherBanner(weather: WeatherType): void {
    const banner = document.getElementById('weather-banner');
    if (!banner) return;

    const config = WEATHER_CONFIGS[weather];
    banner.className = '';
    banner.textContent = `${config.label} 天气生效！`;
    banner.classList.add(config.name);

    requestAnimationFrame(() => {
      banner.classList.add('show');
    });

    setTimeout(() => {
      banner.classList.remove('show');
    }, 1500);
  }

  private showTowerMenu(coord: HexCoord, screenX: number, screenY: number): void {
    const menu = document.getElementById('tower-menu');
    if (!menu) return;

    menu.innerHTML = '';
    menu.classList.remove('show', 'hide');

    const towerTypes = Object.values(TowerType);
    for (const type of towerTypes) {
      const config = TOWER_CONFIGS[type];
      const stats = this.towerSystem.getTowerStats(type);
      const modifier = stats.modifier;
      const canAfford = this.state.coins >= config.cost;

      const card = document.createElement('div');
      card.className = `tower-card${canAfford ? '' : ' disabled'}`;

      const dmgBuff = modifier.damageMult > 1;
      const dmgNerf = modifier.damageMult < 1;
      const rangeBuff = modifier.rangeMult > 1;
      const rangeNerf = modifier.rangeMult < 1;
      const spdBuff = modifier.speedMult > 1;
      const spdNerf = modifier.speedMult < 1;

      card.innerHTML = `
        <div class="tower-icon">${config.icon}</div>
        <div class="tower-name">${config.name}</div>
        <div class="tower-stats">
          <div class="tower-stat-row">
            <span>攻击</span>
            <span class="${dmgBuff ? 'stat-buff' : dmgNerf ? 'stat-nerf' : ''}">${stats.damage}</span>
          </div>
          <div class="tower-stat-row">
            <span>射程</span>
            <span class="${rangeBuff ? 'stat-buff' : rangeNerf ? 'stat-nerf' : ''}">${stats.range}</span>
          </div>
          <div class="tower-stat-row">
            <span>速度</span>
            <span class="${spdBuff ? 'stat-buff' : spdNerf ? 'stat-nerf' : ''}">${stats.speed}</span>
          </div>
          <div class="tower-stat-row" style="margin-top:4px;">
            <span class="tower-cost">🪙 ${config.cost}</span>
          </div>
        </div>
      `;

      if (canAfford) {
        card.addEventListener('click', () => this.placeTower(coord, type));
      }

      menu.appendChild(card);
    }

    const menuWidth = towerTypes.length * 102 + 20;
    let posX = screenX;
    let posY = screenY - 80;

    if (posX - menuWidth / 2 < 10) posX = menuWidth / 2 + 10;
    if (posX + menuWidth / 2 > window.innerWidth - 10) posX = window.innerWidth - menuWidth / 2 - 10;
    if (posY < 100) posY = screenY + 80;
    if (posY > window.innerHeight - 130) posY = window.innerHeight - 130;

    menu.style.left = `${posX}px`;
    menu.style.top = `${posY}px`;

    requestAnimationFrame(() => {
      menu.classList.add('show');
    });

    this.menuVisible = true;
    this.hideTowerPropertyPanel();
  }

  private refreshMenuStats(): void {
    if (!this.menuVisible || !this.selectedCell) return;
    const coord = this.selectedCell;

    const menu = document.getElementById('tower-menu');
    if (!menu || !menu.classList.contains('show')) return;

    const rect = menu.getBoundingClientRect();
    this.showTowerMenu(coord, rect.left + rect.width / 2, rect.top + rect.height / 2 + 80);
  }

  private hideTowerMenu(): void {
    const menu = document.getElementById('tower-menu');
    if (!menu) return;

    if (menu.classList.contains('show')) {
      menu.classList.remove('show');
      menu.classList.add('hide');
      setTimeout(() => {
        menu.classList.remove('hide');
        menu.style.display = 'none';
      }, 200);
    }
    this.menuVisible = false;
  }

  private showTowerPropertyPanel(coord: HexCoord, _screenX: number, _screenY: number): void {
    const panel = document.getElementById('tower-property-panel');
    const tower = this.towerSystem.getTowerAt(coord.q, coord.r);
    if (!panel || !tower) return;

    const config = TOWER_CONFIGS[tower.type];
    const stats = this.towerSystem.getTowerStats(tower.type);
    const modifier = stats.modifier;

    const dmgBuff = modifier.damageMult > 1;
    const dmgNerf = modifier.damageMult < 1;
    const rangeBuff = modifier.rangeMult > 1;
    const rangeNerf = modifier.rangeMult < 1;
    const spdBuff = modifier.speedMult > 1;
    const spdNerf = modifier.speedMult < 1;

    panel.innerHTML = `
      <div style="text-align:center;margin-bottom:10px;">
        <div style="font-size:36px;">${config.icon}</div>
        <div style="font-weight:600;margin-top:4px;">${config.name}</div>
        <div style="font-size:11px;opacity:0.6;margin-top:2px;">Lv.${tower.level}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;font-size:13px;">
        <div class="tower-stat-row" style="display:flex;justify-content:space-between;">
          <span>⚔️ 攻击</span>
          <span class="${dmgBuff ? 'stat-buff' : dmgNerf ? 'stat-nerf' : ''}">${stats.damage}</span>
        </div>
        <div class="tower-stat-row" style="display:flex;justify-content:space-between;">
          <span>🎯 射程</span>
          <span class="${rangeBuff ? 'stat-buff' : rangeNerf ? 'stat-nerf' : ''}">${stats.range}</span>
        </div>
        <div class="tower-stat-row" style="display:flex;justify-content:space-between;">
          <span>⚡ 速度</span>
          <span class="${spdBuff ? 'stat-buff' : spdNerf ? 'stat-nerf' : ''}">${stats.speed}</span>
        </div>
      </div>
      <div style="margin-top:14px;display:flex;gap:8px;">
        <button id="sell-tower-btn" style="flex:1;padding:8px;background:rgba(255,82,82,0.2);border:1px solid #ff5252;border-radius:8px;color:#ff6b6b;cursor:pointer;font-weight:600;font-size:12px;transition:all 0.15s;">
          出售 (+${Math.floor(config.cost * 0.6)}🪙)
        </button>
      </div>
    `;

    panel.classList.add('show');
    this.hideTowerMenu();

    const sellBtn = document.getElementById('sell-tower-btn');
    if (sellBtn) {
      sellBtn.addEventListener('click', () => {
        this.towerSystem.removeTower(coord.q, coord.r);
        this.gameMap.setTowerAt(coord.q, coord.r, false);
        this.addCoins(Math.floor(config.cost * 0.6));
        this.hideTowerPropertyPanel();
        this.selectedCell = null;
      });
    }
  }

  private hideTowerPropertyPanel(): void {
    const panel = document.getElementById('tower-property-panel');
    if (panel) {
      panel.classList.remove('show');
    }
  }

  private placeTower(coord: HexCoord, type: TowerType): void {
    const config = TOWER_CONFIGS[type];
    if (this.state.coins < config.cost) return;

    const cell = this.gameMap.getCell(coord.q, coord.r);
    if (!cell) return;

    const tower = this.towerSystem.placeTower(coord, cell.x, cell.y, type);
    if (tower) {
      this.gameMap.setTowerAt(coord.q, coord.r, true);
      this.state.coins -= config.cost;
      this.updateHUD('coin', this.state.coins);
      this.hideTowerMenu();
    }
  }

  private addCoins(amount: number): void {
    this.state.coins += amount;
    this.updateHUD('coin', this.state.coins, true);
    if (this.menuVisible) this.refreshMenuStats();
  }

  private deductHealth(amount: number): void {
    this.state.health = Math.max(0, this.state.health - amount);
    this.updateHUD('health', this.state.health, true);

    if (this.state.health <= 0) {
      this.gameOver();
    }
  }

  private updateHUD(type: 'health' | 'coin' | 'wave', value: number, animate: boolean = false): void {
    const el = document.getElementById(`${type}-value`);
    if (!el) return;

    el.textContent = String(value);

    if (animate) {
      el.classList.remove('bounce');
      void el.offsetWidth;
      el.classList.add('bounce');
      setTimeout(() => el.classList.remove('bounce'), 200);
    }
  }

  private gameOver(): void {
    this.state.isRunning = false;
  }

  private loop = (): void => {
    if (!this.state.isRunning) return;

    const now = performance.now();
    let dt = (now - this.lastFrameTime) / 1000;
    if (dt > 0.1) dt = 0.1;
    this.lastFrameTime = now;

    this.update(dt, now);
    this.render();

    this.animationId = requestAnimationFrame(this.loop);
  };

  private update(dt: number, now: number): void {
    this.weatherSystem.update(dt, now);
    this.enemySpawner.update(dt);
    const hits = this.towerSystem.update(dt, this.enemySpawner.getEnemies());

    for (const hit of hits) {
      this.enemySpawner.damageEnemy(hit.enemyId, hit.damageDealt, hit.slow);
    }
  }

  private render(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.gameMap.render();

    if (this.hoveredCell && !this.gameMap.getCell(this.hoveredCell.q, this.hoveredCell.r)?.isPath) {
      const cell = this.gameMap.getCell(this.hoveredCell.q, this.hoveredCell.r);
      if (cell && !cell.hasTower && !cell.isSpawn) {
        this.gameMap.highlightCell(this.hoveredCell.q, this.hoveredCell.r, 'rgba(0, 245, 212, 0.15)');
      }
    }

    if (this.selectedCell && !this.towerSystem.hasTowerAt(this.selectedCell.q, this.selectedCell.r)) {
      this.gameMap.highlightCell(this.selectedCell.q, this.selectedCell.r, 'rgba(0, 245, 212, 0.3)');
    }

    this.enemySpawner.render();
    this.towerSystem.render(this.selectedCell);
    this.weatherSystem.render();

    if (!this.state.isRunning) {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      this.ctx.fillStyle = '#ff5252';
      this.ctx.font = 'bold 48px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('游戏结束', this.canvas.width / 2 / (window.devicePixelRatio || 1), this.canvas.height / 2 / (window.devicePixelRatio || 1) - 30);

      this.ctx.fillStyle = '#e0e0e0';
      this.ctx.font = '20px sans-serif';
      this.ctx.fillText(
        `坚持到了第 ${this.enemySpawner.getWave()} 波`,
        this.canvas.width / 2 / (window.devicePixelRatio || 1),
        this.canvas.height / 2 / (window.devicePixelRatio || 1) + 20
      );
    }
  }

  destroy(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    this.weatherSystem.destroy();
    this.towerSystem.destroy();
    this.enemySpawner.destroy();
  }
}

let game: Game | null = null;

window.addEventListener('DOMContentLoaded', () => {
  try {
    game = new Game();
  } catch (err) {
    console.error('Failed to start game:', err);
  }
});

window.addEventListener('beforeunload', () => {
  if (game) {
    game.destroy();
    game = null;
  }
});
