import {
  GRID_SIZE,
  CELL_SIZE,
  CANVAS_SIZE,
  COLORS,
  LOG_ICONS,
  GameState,
  ITEM_CONFIG,
  ItemType
} from './entities';
import { GameEngine } from './game-engine';

export class UIRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private logPanel: HTMLElement;
  private hudFloor: HTMLElement;
  private hudHp: HTMLElement;
  private hudDef: HTMLElement;
  private hudAtk: HTMLElement;
  private gameOver: HTMLElement;
  private finalFloor: HTMLElement;
  private finalKills: HTMLElement;
  private fadeOverlay: HTMLElement;
  private gameContainer: HTMLElement;
  private audioContext: AudioContext | null;
  private engine: GameEngine;

  constructor(engine: GameEngine) {
    this.engine = engine;
    this.canvas = document.getElementById('dungeon-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;
    this.logPanel = document.getElementById('log-panel')!;
    this.hudFloor = document.getElementById('floor-display')!;
    this.hudHp = document.getElementById('hp-display')!;
    this.hudDef = document.getElementById('def-display')!;
    this.hudAtk = document.getElementById('atk-display')!;
    this.gameOver = document.getElementById('game-over')!;
    this.finalFloor = document.getElementById('final-floor')!;
    this.finalKills = document.getElementById('final-kills')!;
    this.fadeOverlay = document.getElementById('fade-overlay')!;
    this.gameContainer = document.getElementById('game-container')!;
    this.audioContext = null;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    window.addEventListener('showDamage', ((e: CustomEvent) => {
      this.showDamageNumber(e.detail.x, e.detail.y, e.detail.damage);
    }) as EventListener);

    window.addEventListener('floorTransition', () => {
      this.fadeOverlay.classList.add('fading');
      setTimeout(() => {
        this.fadeOverlay.classList.remove('fading');
      }, 300);
    });

    document.addEventListener('keydown', (e) => {
      if (this.engine.getState().isGameOver) {
        this.engine.reset();
        this.gameOver.classList.remove('active');
        return;
      }

      let moved = false;
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          moved = this.engine.movePlayer(0, -1);
          e.preventDefault();
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          moved = this.engine.movePlayer(0, 1);
          e.preventDefault();
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          moved = this.engine.movePlayer(-1, 0);
          e.preventDefault();
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          moved = this.engine.movePlayer(1, 0);
          e.preventDefault();
          break;
      }

      if (moved) {
        this.playMoveSound();
      }
    });
  }

  private playMoveSound(): void {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.type = 'square';
      oscillator.frequency.value = 440;

      gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.05);

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.05);
    } catch (e) {
    }
  }

  private showDamageNumber(gridX: number, gridY: number, damage: number): void {
    const rect = this.canvas.getBoundingClientRect();
    const pixelX = rect.left + gridX * CELL_SIZE + CELL_SIZE / 2;
    const pixelY = rect.top + gridY * CELL_SIZE;

    const div = document.createElement('div');
    div.className = 'damage-number';
    div.textContent = `-${damage}`;
    div.style.left = `${pixelX}px`;
    div.style.top = `${pixelY}px`;
    div.style.transform = 'translateX(-50%)';

    document.body.appendChild(div);

    setTimeout(() => {
      div.remove();
    }, 500);
  }

  public render(state: GameState): void {
    this.ctx.fillStyle = COLORS.BACKGROUND;
    this.ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    this.renderGrid(state);
    this.renderStairs(state);
    this.renderItems(state);
    this.renderEnemies(state);
    this.renderPlayer(state);
    this.renderHUD(state);
    this.renderLogs(state);
    this.renderGameOver(state);
  }

  private renderGrid(state: GameState): void {
    const layer = this.engine.getCurrentLayer();

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const tile = layer.tiles[y][x];
        const isHighlighted =
          state.highlightedTile &&
          state.highlightedTile.x === x &&
          state.highlightedTile.y === y;

        if (tile === 1) {
          this.ctx.fillStyle = COLORS.WALL;
        } else {
          this.ctx.fillStyle = isHighlighted ? COLORS.FLOOR_HIGHLIGHT : COLORS.FLOOR;
        }

        this.ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);

        if (tile === 1) {
          this.ctx.fillStyle = '#2a3840';
          this.ctx.fillRect(x * CELL_SIZE + 2, y * CELL_SIZE + 2, CELL_SIZE - 4, 2);
          this.ctx.fillRect(x * CELL_SIZE + 2, y * CELL_SIZE + 2, 2, CELL_SIZE - 4);
          this.ctx.fillStyle = '#4a5a64';
          this.ctx.fillRect(x * CELL_SIZE + CELL_SIZE - 4, y * CELL_SIZE + 4, 2, CELL_SIZE - 6);
          this.ctx.fillRect(x * CELL_SIZE + 4, y * CELL_SIZE + CELL_SIZE - 4, CELL_SIZE - 6, 2);
        } else {
          this.ctx.fillStyle = '#b8c0c4';
          this.ctx.fillRect(x * CELL_SIZE + 5, y * CELL_SIZE + 5, 2, 2);
          this.ctx.fillRect(x * CELL_SIZE + 20, y * CELL_SIZE + 30, 2, 2);
          this.ctx.fillRect(x * CELL_SIZE + 40, y * CELL_SIZE + 15, 2, 2);
        }
      }
    }
  }

  private renderPlayer(state: GameState): void {
    const { player, playerOffset, playerOffsetTime } = state;
    const offsetFactor = playerOffsetTime > 0 ? playerOffsetTime / 100 : 0;
    const ox = playerOffset.x * offsetFactor;
    const oy = playerOffset.y * offsetFactor;

    const px = player.position.x * CELL_SIZE + (CELL_SIZE - 16) / 2 - ox;
    const py = player.position.y * CELL_SIZE + (CELL_SIZE - 16) / 2 - oy;

    this.ctx.fillStyle = COLORS.PLAYER;
    this.ctx.fillRect(px + 4, py + 2, 8, 4);
    this.ctx.fillRect(px + 2, py + 6, 12, 8);
    this.ctx.fillRect(px + 4, py + 14, 3, 2);
    this.ctx.fillRect(px + 9, py + 14, 3, 2);

    this.ctx.fillStyle = '#1b5e20';
    this.ctx.fillRect(px + 5, py + 3, 2, 2);
    this.ctx.fillRect(px + 9, py + 3, 2, 2);
    this.ctx.fillRect(px + 3, py + 7, 1, 6);
    this.ctx.fillRect(px + 12, py + 7, 1, 6);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(px + 5, py + 4, 1, 1);
    this.ctx.fillRect(px + 9, py + 4, 1, 1);
  }

  private renderEnemies(state: GameState): void {
    const layer = this.engine.getCurrentLayer();

    for (const enemy of layer.enemies) {
      const ex = enemy.position.x * CELL_SIZE + (CELL_SIZE - 16) / 2;
      const ey = enemy.position.y * CELL_SIZE + (CELL_SIZE - 16) / 2;

      this.ctx.fillStyle = COLORS.ENEMY;
      this.ctx.fillRect(ex + 4, ey + 1, 8, 4);
      this.ctx.fillRect(ex + 2, ey + 5, 12, 9);
      this.ctx.fillRect(ex + 4, ey + 14, 3, 2);
      this.ctx.fillRect(ex + 9, ey + 14, 3, 2);

      this.ctx.fillStyle = '#b71c1c';
      this.ctx.fillRect(ex + 5, ey + 2, 2, 2);
      this.ctx.fillRect(ex + 9, ey + 2, 2, 2);
      this.ctx.fillRect(ex + 3, ey + 6, 1, 7);
      this.ctx.fillRect(ex + 12, ey + 6, 1, 7);

      this.ctx.fillStyle = '#000000';
      this.ctx.fillRect(ex + 5, ey + 3, 2, 1);
      this.ctx.fillRect(ex + 9, ey + 3, 2, 1);

      const barWidth = CELL_SIZE - 8;
      const barHeight = 3;
      const barX = enemy.position.x * CELL_SIZE + 4;
      const barY = enemy.position.y * CELL_SIZE + 3;
      const hpPercent = enemy.hp / enemy.maxHp;

      this.ctx.fillStyle = '#000000';
      this.ctx.fillRect(barX, barY, barWidth, barHeight);
      this.ctx.fillStyle = hpPercent > 0.5 ? '#66bb6a' : hpPercent > 0.25 ? '#fdd835' : '#e53935';
      this.ctx.fillRect(barX, barY, Math.floor(barWidth * hpPercent), barHeight);
    }
  }

  private renderStairs(state: GameState): void {
    const layer = this.engine.getCurrentLayer();
    const sx = layer.stairs.x * CELL_SIZE;
    const sy = layer.stairs.y * CELL_SIZE;

    this.ctx.fillStyle = COLORS.FLOOR;
    this.ctx.fillRect(sx, sy, CELL_SIZE, CELL_SIZE);

    this.ctx.fillStyle = COLORS.STAIRS;
    this.ctx.fillRect(sx + 8, sy + 8, 34, 34);

    this.ctx.fillStyle = '#f9a825';
    this.ctx.fillRect(sx + 8, sy + 8, 34, 4);
    this.ctx.fillRect(sx + 8, sy + 8, 4, 34);

    this.ctx.fillStyle = '#fff59d';
    this.ctx.fillRect(sx + 14, sy + 14, 8, 22);
    this.ctx.fillRect(sx + 28, sy + 14, 8, 22);

    this.ctx.fillStyle = '#fbc02d';
    this.ctx.fillRect(sx + 14, sy + 20, 22, 4);
    this.ctx.fillRect(sx + 14, sy + 30, 22, 4);
  }

  private renderItems(state: GameState): void {
    const layer = this.engine.getCurrentLayer();

    for (const item of layer.items) {
      const ix = item.position.x * CELL_SIZE + CELL_SIZE / 2;
      const iy = item.position.y * CELL_SIZE + CELL_SIZE / 2;
      const config = ITEM_CONFIG[item.type];

      this.ctx.save();
      this.ctx.translate(ix, iy);

      if (item.type === 'heal') {
        this.ctx.fillStyle = config.color;
        this.ctx.beginPath();
        this.ctx.moveTo(0, 4);
        this.ctx.bezierCurveTo(-12, -4, -10, -14, 0, -8);
        this.ctx.bezierCurveTo(10, -14, 12, -4, 0, 4);
        this.ctx.closePath();
        this.ctx.fill();

        this.ctx.fillStyle = '#ff8a80';
        this.ctx.beginPath();
        this.ctx.moveTo(-2, -2);
        this.ctx.bezierCurveTo(-6, -6, -5, -10, -2, -7);
        this.ctx.bezierCurveTo(0, -9, 1, -7, -2, -2);
        this.ctx.closePath();
        this.ctx.fill();

        this.ctx.fillStyle = '#c62828';
        this.ctx.beginPath();
        this.ctx.moveTo(0, 4);
        this.ctx.bezierCurveTo(4, 0, 6, -2, 4, -4);
        this.ctx.lineTo(0, 0);
        this.ctx.closePath();
        this.ctx.fill();
      } else if (item.type === 'defense') {
        this.ctx.fillStyle = config.color;
        this.ctx.beginPath();
        this.ctx.moveTo(0, -14);
        this.ctx.lineTo(12, -10);
        this.ctx.lineTo(12, 2);
        this.ctx.lineTo(0, 14);
        this.ctx.lineTo(-12, 2);
        this.ctx.lineTo(-12, -10);
        this.ctx.closePath();
        this.ctx.fill();

        this.ctx.fillStyle = '#90caf9';
        this.ctx.beginPath();
        this.ctx.moveTo(0, -12);
        this.ctx.lineTo(8, -8);
        this.ctx.lineTo(8, 0);
        this.ctx.lineTo(0, 8);
        this.ctx.lineTo(-8, 0);
        this.ctx.lineTo(-8, -8);
        this.ctx.closePath();
        this.ctx.fill();

        this.ctx.fillStyle = '#1565c0';
        this.ctx.fillRect(-2, -6, 4, 10);
        this.ctx.fillRect(-6, -2, 12, 4);
      } else if (item.type === 'attack') {
        this.ctx.fillStyle = config.color;
        this.ctx.beginPath();
        this.ctx.moveTo(-2, -14);
        this.ctx.lineTo(6, -4);
        this.ctx.lineTo(1, -2);
        this.ctx.lineTo(4, 14);
        this.ctx.lineTo(-4, 6);
        this.ctx.lineTo(1, 4);
        this.ctx.lineTo(-6, -6);
        this.ctx.closePath();
        this.ctx.fill();

        this.ctx.fillStyle = '#fff9c4';
        this.ctx.beginPath();
        this.ctx.moveTo(-1, -12);
        this.ctx.lineTo(4, -4);
        this.ctx.lineTo(0, -2);
        this.ctx.lineTo(2, 8);
        this.ctx.lineTo(-2, 4);
        this.ctx.lineTo(0, 2);
        this.ctx.lineTo(-4, -4);
        this.ctx.closePath();
        this.ctx.fill();

        this.ctx.fillStyle = '#f57f17';
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        this.ctx.lineTo(3, 10);
        this.ctx.lineTo(-1, 3);
        this.ctx.closePath();
        this.ctx.fill();
      }

      this.ctx.restore();
    }
  }

  private renderHUD(state: GameState): void {
    this.hudFloor.textContent = `FLOOR: ${state.currentFloor}`;
    this.hudHp.textContent = `HP: ${state.player.hp}/${state.player.maxHp}`;
    this.hudDef.textContent = `DEF: ${state.player.defense}`;
    this.hudAtk.textContent = `ATK: ${state.player.attack}`;
  }

  private renderLogs(state: GameState): void {
    const logs = state.logs;
    const currentHTML = this.logPanel.innerHTML;
    if (logs.length === 0) {
      this.logPanel.innerHTML = '<div class="log-entry" style="color:#78909c;justify-content:center;">等待行动...</div>';
      return;
    }

    const firstLogTimestamp = logs[0]?.timestamp;
    const lastLogInDOM = this.logPanel.querySelector('.log-entry');
    const lastTimestamp = lastLogInDOM?.getAttribute('data-timestamp');

    if (lastTimestamp && String(firstLogTimestamp) === lastTimestamp) {
      return;
    }

    let html = '';
    logs.forEach((log, index) => {
      const icon = LOG_ICONS[log.type];
      let iconColor = log.type === 'move' ? COLORS.PLAYER :
                      log.type === 'battle' ? COLORS.ENEMY :
                      log.type === 'floor' ? COLORS.STAIRS : '#ffffff';

      if (log.type === 'pickup') {
        if (log.message.includes('❤')) iconColor = COLORS.ITEM_HEAL;
        else if (log.message.includes('🛡')) iconColor = COLORS.ITEM_DEFENSE;
        else if (log.message.includes('⚡')) iconColor = COLORS.ITEM_ATTACK;
        else iconColor = COLORS.ITEM;
      }

      const bgClass = index % 2 === 0 ? 'log-odd' : 'log-even';
      html += `<div class="log-entry ${bgClass}" data-timestamp="${log.timestamp}">
        <span class="log-icon" style="color:${iconColor}">${icon}</span>
        <span class="log-text">${this.escapeHtml(log.message)}</span>
      </div>`;
    });
    this.logPanel.innerHTML = html;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private renderGameOver(state: GameState): void {
    if (state.isGameOver && !this.gameOver.classList.contains('active')) {
      this.finalFloor.textContent = `FLOOR REACHED: ${state.currentFloor}`;
      this.finalKills.textContent = `ENEMIES DEFEATED: ${state.enemiesDefeated}`;
      this.gameOver.classList.add('active');
    }
  }
}
