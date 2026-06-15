import { MazeGenerator, Cell } from './MazeGenerator';
import { Player, PlayerControls } from './Player';
import { Renderer } from './Renderer';

const CONFIG = {
  MAZE_SIZE: 15,
  CELL_SIZE: 40,
  PLAYER_SIZE: 28,
  PLAYER_SPEED: 120,
  KEY_COUNT: 3,
  TRAP_COUNT: 5,
  SLOW_DURATION: 2000,
  KEY_ANIMATION_DURATION: 500,
  VOLUME: 0.3,
  LEFT_PANEL_WIDTH: 160,
  RIGHT_PANEL_WIDTH: 200,
  MOBILE_BREAKPOINT: 800,
} as const;

const PLAYER_CONFIGS = [
  {
    name: '玩家1',
    color: '#e74c3c',
    controls: { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD' },
  },
  {
    name: '玩家2',
    color: '#3498db',
    controls: { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' },
  },
  {
    name: '玩家3',
    color: '#2ecc71',
    controls: { up: 'KeyI', down: 'KeyK', left: 'KeyJ', right: 'KeyL' },
  },
  {
    name: '玩家4',
    color: '#f39c12',
    controls: { up: 'Numpad8', down: 'Numpad5', left: 'Numpad4', right: 'Numpad6' },
  },
];

const NOTE_FREQUENCIES: Record<string, number> = {
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  G4: 392.00,
};

class AudioManager {
  private audioContext: AudioContext | null = null;
  private volume: number = CONFIG.VOLUME;

  private init(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
  }

  public playFootstep(): void {
    this.init();
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(150, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + 0.04);

    gainNode.gain.setValueAtTime(this.volume * 0.3, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.04);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.04);
  }

  public playKeyCollect(): void {
    this.init();
    if (!this.audioContext) return;

    const notes = [NOTE_FREQUENCIES.C4, NOTE_FREQUENCIES.D4, NOTE_FREQUENCIES.E4];
    const startTime = this.audioContext.currentTime;

    notes.forEach((freq, index) => {
      const oscillator = this.audioContext!.createOscillator();
      const gainNode = this.audioContext!.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext!.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq, startTime + index * 0.05);

      gainNode.gain.setValueAtTime(this.volume, startTime + index * 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + index * 0.05 + 0.05);

      oscillator.start(startTime + index * 0.05);
      oscillator.stop(startTime + index * 0.05 + 0.05);
    });
  }

  public playTrap(): void {
    this.init();
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(100, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + 0.2);

    gainNode.gain.setValueAtTime(this.volume, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.2);
  }

  public playVictory(): void {
    this.init();
    if (!this.audioContext) return;

    const notes = [
      NOTE_FREQUENCIES.C4,
      NOTE_FREQUENCIES.E4,
      NOTE_FREQUENCIES.G4,
      NOTE_FREQUENCIES.C4 * 2,
    ];
    const startTime = this.audioContext.currentTime;

    notes.forEach((freq, index) => {
      const oscillator = this.audioContext!.createOscillator();
      const gainNode = this.audioContext!.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext!.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq, startTime + index * 0.1);

      gainNode.gain.setValueAtTime(this.volume, startTime + index * 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + index * 0.1 + 0.15);

      oscillator.start(startTime + index * 0.1);
      oscillator.stop(startTime + index * 0.1 + 0.15);
    });
  }
}

class Game {
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private mazeGenerator: MazeGenerator;
  private maze: Cell[][];
  private players: Player[];
  private keys: Set<string>;
  private audioManager: AudioManager;
  private playerCount: number;

  private gameState: 'menu' | 'playing' | 'finished';
  private startTime: number;
  private elapsedTime: number;
  private lastFrameTime: number;
  private winner: Player | null;

  private offsetX: number;
  private offsetY: number;
  private cellSize: number;

  private isMobile: boolean;
  private showMobilePanel: boolean;

  private collectedKeys: Set<string>;
  private triggeredTraps: Set<string>;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.renderer = new Renderer(this.canvas);
    this.mazeGenerator = new MazeGenerator(CONFIG.MAZE_SIZE);
    this.maze = [];
    this.players = [];
    this.keys = new Set();
    this.audioManager = new AudioManager();
    this.playerCount = 3;

    this.gameState = 'menu';
    this.startTime = 0;
    this.elapsedTime = 0;
    this.lastFrameTime = 0;
    this.winner = null;

    this.offsetX = 0;
    this.offsetY = 0;
    this.cellSize = CONFIG.CELL_SIZE;

    this.isMobile = false;
    this.showMobilePanel = false;

    this.collectedKeys = new Set();
    this.triggeredTraps = new Set();

    this.init();
  }

  private init(): void {
    this.setupEventListeners();
    this.resize();
    this.gameLoop(0);
  }

  private setupEventListeners(): void {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);

      if (e.code === 'Space' && this.gameState === 'finished') {
        this.restart();
      }

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });

    window.addEventListener('resize', () => {
      this.resize();
    });

    const playerButtons = document.querySelectorAll('.player-btn');
    playerButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const count = parseInt(target.dataset.players || '3');
        this.playerCount = count;

        playerButtons.forEach((b) => b.classList.remove('selected'));
        target.classList.add('selected');
      });
    });

    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        this.startGame();
      });
    }

    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    if (mobileMenuBtn) {
      mobileMenuBtn.addEventListener('click', () => {
        this.showMobilePanel = !this.showMobilePanel;
        mobileMenuBtn.classList.toggle('active', this.showMobilePanel);
      });
    }
  }

  private resize(): void {
    const container = document.getElementById('game-container');
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    this.isMobile = width < CONFIG.MOBILE_BREAKPOINT;

    this.renderer.resize(width, height);

    const availableWidth = this.isMobile
      ? width - 40
      : width - CONFIG.LEFT_PANEL_WIDTH - CONFIG.RIGHT_PANEL_WIDTH - 40;
    const availableHeight = height - 100;

    const maxMazeWidth = availableWidth;
    const maxMazeHeight = availableHeight;

    this.cellSize = Math.min(
      Math.floor(maxMazeWidth / CONFIG.MAZE_SIZE),
      Math.floor(maxMazeHeight / CONFIG.MAZE_SIZE)
    );

    const mazeWidth = CONFIG.MAZE_SIZE * this.cellSize;
    const mazeHeight = CONFIG.MAZE_SIZE * this.cellSize;

    if (this.isMobile) {
      this.offsetX = (width - mazeWidth) / 2;
    } else {
      this.offsetX = CONFIG.LEFT_PANEL_WIDTH + (width - CONFIG.LEFT_PANEL_WIDTH - CONFIG.RIGHT_PANEL_WIDTH - mazeWidth) / 2;
    }
    this.offsetY = 70 + (availableHeight - mazeHeight) / 2;
  }

  private startGame(): void {
    const menuOverlay = document.getElementById('menu-overlay');
    if (menuOverlay) {
      menuOverlay.style.display = 'none';
    }

    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    if (mobileMenuBtn && this.isMobile) {
      mobileMenuBtn.style.display = 'flex';
    }

    const generateStartTime = performance.now();
    this.mazeGenerator = new MazeGenerator(CONFIG.MAZE_SIZE);
    this.maze = this.mazeGenerator.generate();
    this.mazeGenerator.placeItems(CONFIG.KEY_COUNT, CONFIG.TRAP_COUNT);
    const generateEndTime = performance.now();

    console.log(`迷宫生成时间: ${(generateEndTime - generateStartTime).toFixed(2)}ms`);

    this.players = [];
    for (let i = 0; i < this.playerCount; i++) {
      const config = PLAYER_CONFIGS[i];
      const startX = this.cellSize / 2 + (i % 2) * this.cellSize * 0.3;
      const startY = this.cellSize / 2 + Math.floor(i / 2) * this.cellSize * 0.3;

      const player = new Player({
        id: i,
        name: config.name,
        color: config.color,
        startX,
        startY,
        controls: config.controls as PlayerControls,
        speed: CONFIG.PLAYER_SPEED,
        size: CONFIG.PLAYER_SIZE,
      });

      this.players.push(player);
    }

    this.collectedKeys = new Set();
    this.triggeredTraps = new Set();
    this.gameState = 'playing';
    this.startTime = performance.now();
    this.elapsedTime = 0;
    this.lastFrameTime = this.startTime;
    this.winner = null;
  }

  private restart(): void {
    this.gameState = 'menu';
    this.showMobilePanel = false;

    const menuOverlay = document.getElementById('menu-overlay');
    if (menuOverlay) {
      menuOverlay.style.display = 'flex';
    }

    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    if (mobileMenuBtn) {
      mobileMenuBtn.style.display = 'none';
      mobileMenuBtn.classList.remove('active');
    }
  }

  private gameLoop(timestamp: number): void {
    const deltaTime = timestamp - this.lastFrameTime;
    this.lastFrameTime = timestamp;

    if (this.gameState === 'playing') {
      this.update(deltaTime, timestamp);
    } else if (this.gameState === 'finished') {
      this.renderer.updateParticles(deltaTime);
    }

    this.render(timestamp);

    requestAnimationFrame((t) => this.gameLoop(t));
  }

  private update(deltaTime: number, currentTime: number): void {
    this.elapsedTime = currentTime - this.startTime;

    for (const player of this.players) {
      if (player.finished) continue;

      const shouldPlayFootstep = player.update(
        deltaTime,
        this.keys,
        currentTime,
        this.maze,
        this.cellSize
      );

      if (shouldPlayFootstep) {
        this.audioManager.playFootstep();
      }

      const cell = player.getCurrentCell(this.maze, this.cellSize);
      if (cell) {
        const cellKey = `${cell.x}-${cell.y}`;

        if (cell.hasKey && !this.collectedKeys.has(cellKey)) {
          player.collectKey(currentTime);
          this.collectedKeys.add(cellKey);
          cell.hasKey = false;
          this.audioManager.playKeyCollect();
        }

        if (cell.hasTrap && !this.triggeredTraps.has(cellKey)) {
          player.triggerSlow(currentTime, CONFIG.SLOW_DURATION);
          this.triggeredTraps.add(cellKey);
          this.audioManager.playTrap();
        }

        if (cell.isExit && player.keysCollected >= CONFIG.KEY_COUNT) {
          player.finish(currentTime);

          if (!this.winner) {
            this.winner = player;
            this.gameState = 'finished';
            this.audioManager.playVictory();

            const centerX = this.offsetX + CONFIG.MAZE_SIZE * this.cellSize / 2;
            const centerY = this.offsetY + CONFIG.MAZE_SIZE * this.cellSize / 2;

            for (let i = 0; i < 5; i++) {
              setTimeout(() => {
                this.renderer.createFireworks(
                  centerX + (Math.random() - 0.5) * 300,
                  centerY + (Math.random() - 0.5) * 200,
                  60
                );
              }, i * 300);
            }
          }
        }
      }
    }
  }

  private render(currentTime: number): void {
    this.renderer.clear();

    if (this.gameState !== 'menu') {
      this.renderer.drawMaze(this.maze, this.cellSize, this.offsetX, this.offsetY, currentTime);

      const sortedPlayers = [...this.players].sort((a, b) => {
        if (a.finished && !b.finished) return -1;
        if (!a.finished && b.finished) return 1;
        return b.keysCollected - a.keysCollected;
      });

      for (const player of sortedPlayers) {
        this.renderer.drawPlayer(
          player,
          this.cellSize,
          this.offsetX,
          this.offsetY,
          currentTime
        );
      }

      this.renderer.drawUI(
        this.players,
        this.elapsedTime,
        CONFIG.KEY_COUNT,
        this.isMobile,
        CONFIG.LEFT_PANEL_WIDTH,
        CONFIG.RIGHT_PANEL_WIDTH,
        this.showMobilePanel,
        currentTime
      );
    }

    if (this.gameState === 'finished' && this.winner) {
      this.renderer.drawVictory(this.winner, this.elapsedTime, currentTime);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
