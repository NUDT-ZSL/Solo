import {
    LEVELS,
    Level,
    GridPos,
    PixelPos,
    Direction,
    Port,
    Obstacle,
    EnergyLock,
    GridOffset,
    gridToPixel,
    pixelToGrid,
    isInsideGrid,
    checkCollision,
    checkPortCollision,
    checkAllLocksUnlocked,
    updateMovingObstacles,
    resetMovingObstacles,
    cloneLevel,
    getLevelById
} from './level';

import {
    Player,
    drawPlayer,
    AudioManager
} from './player';

import {
    UIManager,
    LEVEL_THEMES,
    drawReceiver,
    drawObstacle,
    drawGrid,
    drawGuideLine,
    GridOffset as UIGridOffset
} from './ui';

enum GameState {
    MENU = 'MENU',
    PLAYING = 'PLAYING',
    TRANSITION = 'TRANSITION',
    GAME_OVER = 'GAME_OVER'
}

class Game {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private uiManager: UIManager;
    private player: Player | null;
    private audioManager: AudioManager;

    private gameState: GameState;
    private currentLevel: Level | null;
    private currentLevelId: number;
    private maxUnlockedLevel: number;

    private gridOffset: GridOffset;
    private lastFrameTime: number;
    private animationFrameId: number | null;

    private lastProjectilePos: PixelPos | null;
    private receiverUnlockQueue: string[];

    private static readonly STORAGE_KEY = 'quantum_maze_max_unlocked';

    constructor() {
        this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
        if (!this.canvas) {
            throw new Error('Canvas element not found');
        }

        const ctx = this.canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Canvas 2D context not available');
        }
        this.ctx = ctx;

        this.setupCanvasSize();

        this.uiManager = new UIManager(this.canvas);
        this.audioManager = new AudioManager();
        this.player = null;

        this.gameState = GameState.MENU;
        this.currentLevel = null;
        this.currentLevelId = 1;
        this.maxUnlockedLevel = 1;

        this.gridOffset = {
            x: 0,
            y: 0,
            tileWidth: 60,
            tileHeight: 30
        };

        this.lastFrameTime = 0;
        this.animationFrameId = null;

        this.lastProjectilePos = null;
        this.receiverUnlockQueue = [];

        this.loadProgress();
        this.setupEventListeners();
        this.uiManager.levelMenu.maxUnlockedLevel = this.maxUnlockedLevel;
        this.uiManager.initLevelMenuButtons();
    }

    private setupCanvasSize(): void {
        const container = this.canvas.parentElement;
        if (!container) return;

        const dpr = window.devicePixelRatio || 1;
        const displayWidth = Math.floor(window.innerWidth * 0.8);
        const displayHeight = Math.floor(displayWidth * 9 / 16);

        this.canvas.style.width = `${displayWidth}px`;
        this.canvas.style.height = `${displayHeight}px`;

        this.canvas.width = displayWidth * dpr;
        this.canvas.height = displayHeight * dpr;

        this.ctx.scale(dpr, dpr);
        this.canvas.width = displayWidth;
        this.canvas.height = displayHeight;
    }

    private loadProgress(): void {
        try {
            const saved = localStorage.getItem(Game.STORAGE_KEY);
            if (saved) {
                const level = parseInt(saved, 10);
                if (!isNaN(level) && level >= 1 && level <= 9) {
                    this.maxUnlockedLevel = level;
                }
            }
        } catch (e) {
            console.warn('Failed to load progress:', e);
        }
    }

    private saveProgress(): void {
        try {
            localStorage.setItem(Game.STORAGE_KEY, this.maxUnlockedLevel.toString());
        } catch (e) {
            console.warn('Failed to save progress:', e);
        }
    }

    private setupEventListeners(): void {
        window.addEventListener('keydown', (e) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
                e.preventDefault();
            }

            if (this.gameState === GameState.PLAYING && this.player) {
                this.player.handleKeyDown(e.key);
            }
        });

        window.addEventListener('keyup', (e) => {
            if (this.gameState === GameState.PLAYING && this.player) {
                this.player.handleKeyUp(e.key);
            }
        });

        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            if (this.gameState === GameState.MENU) {
                this.handleMenuClick(x, y);
            } else if (this.gameState === GameState.GAME_OVER) {
                if (this.uiManager.handleGameOverClick(x, y)) {
                    this.returnToMenu();
                }
            } else if (this.gameState === GameState.PLAYING) {
                if (this.uiManager.handleResetClick(x, y)) {
                    this.resetLevel();
                }
            }
        });

        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            if (this.gameState === GameState.MENU) {
                this.uiManager.handleMenuHover(x, y);
            } else if (this.gameState === GameState.GAME_OVER) {
                this.uiManager.handleGameOverHover(x, y);
            }
        });

        window.addEventListener('resize', () => {
            this.setupCanvasSize();
            this.uiManager.resize();
            if (this.currentLevel) {
                this.calculateGridOffset();
            }
        });
    }

    private handleMenuClick(x: number, y: number): void {
        const result = this.uiManager.handleMenuClick(x, y);
        if (result === null) return;

        if (result > 0) {
            this.loadLevel(result);
        } else {
            this.audioManager.playErrorSound();
        }
    }

    private loadLevel(levelId: number): void {
        const levelData = getLevelById(levelId);
        if (!levelData) return;

        this.currentLevel = cloneLevel(levelData);
        this.currentLevelId = levelId;
        this.currentLevel.obstacles = resetMovingObstacles(this.currentLevel.obstacles);

        for (const port of this.currentLevel.ports) {
            port.unlocked = false;
        }

        this.calculateGridOffset();

        const emitter = this.currentLevel.ports.find(p => p.type === 'emitter');
        if (!emitter) return;

        const emitterPixel = gridToPixel(emitter.position, this.gridOffset);
        this.player = new Player(emitterPixel);

        this.player.onProjectileHit = (receiverId: string) => {
            this.handleReceiverHit(receiverId);
        };

        this.player.onProjectileFail = () => {
            this.handleProjectileFail();
        };

        this.lastProjectilePos = null;
        this.receiverUnlockQueue = [];

        const theme = LEVEL_THEMES.find(t => t.id === levelId);
        if (theme) {
            this.uiManager.showLevelTheme(theme.name);
            this.uiManager.updateTopBar(theme.name, this.player.state.lives);
        }

        this.uiManager.setCurrentLevel(levelId);
        this.uiManager.setLevelMenuActive(false);
        this.uiManager.clearLockUnlockAnimations();
        this.gameState = GameState.PLAYING;
    }

    private calculateGridOffset(): void {
        if (!this.currentLevel) return;

        const { rows, cols } = this.currentLevel.gridSize;
        const tileWidth = Math.min(
            (this.canvas.width * 0.7) / Math.max(rows, cols),
            70
        );
        const tileHeight = tileWidth / 2;

        const gridPixelWidth = (cols + rows) * (tileWidth / 2);
        const gridPixelHeight = (cols + rows) * (tileHeight / 2);

        const offsetX = (this.canvas.width - gridPixelWidth) / 2 + (rows * tileWidth / 2);
        const offsetY = (this.canvas.height - gridPixelHeight) / 2 + 50;

        this.gridOffset = {
            x: offsetX,
            y: offsetY,
            tileWidth,
            tileHeight
        };
    }

    private handleReceiverHit(receiverId: string): void {
        if (!this.currentLevel || !this.player) return;

        const receiver = this.currentLevel.ports.find(p => p.id === receiverId);
        if (!receiver || receiver.unlocked) return;

        receiver.unlocked = true;

        const receiverPixel = gridToPixel(receiver.position, this.gridOffset);
        this.player.createLockUnlockParticles(receiverPixel);
        this.uiManager.startLockUnlockAnimation(receiverPixel);

        if (checkAllLocksUnlocked(this.currentLevel.locks, this.currentLevel.ports)) {
            this.handleLevelComplete();
        }
    }

    private handleProjectileFail(): void {
        if (!this.player) return;

        this.uiManager.updateTopBar(this.uiManager.topBar.levelName, this.player.state.lives);

        if (this.player.state.lives <= 0) {
            this.gameState = GameState.GAME_OVER;
            this.uiManager.setGameOverActive(true);
        }
    }

    private handleLevelComplete(): void {
        if (!this.currentLevel) return;

        if (this.currentLevelId >= this.maxUnlockedLevel && this.currentLevelId < 9) {
            this.maxUnlockedLevel = this.currentLevelId + 1;
            this.uiManager.unlockLevel(this.maxUnlockedLevel);
            this.saveProgress();
        }

        this.gameState = GameState.TRANSITION;
        this.uiManager.startWaveTransition();

        setTimeout(() => {
            if (this.currentLevelId >= 9) {
                this.returnToMenu();
            } else {
                this.loadLevel(this.currentLevelId + 1);
            }
        }, 1500);
    }

    private resetLevel(): void {
        if (this.currentLevelId > 0) {
            this.loadLevel(this.currentLevelId);
        }
    }

    private returnToMenu(): void {
        this.gameState = GameState.MENU;
        this.currentLevel = null;
        this.player = null;
        this.uiManager.setLevelMenuActive(true);
        this.uiManager.setGameOverActive(false);
        this.uiManager.levelMenu.maxUnlockedLevel = this.maxUnlockedLevel;
        this.uiManager.initLevelMenuButtons();
    }

    private checkProjectileCollision(pos: PixelPos): {
        hit: boolean;
        absorbed?: boolean;
        normalX?: number;
        normalY?: number;
        reachedReceiver?: boolean;
        receiverId?: string;
        outOfBounds?: boolean;
    } {
        if (!this.currentLevel) {
            return { hit: false, outOfBounds: true };
        }

        const gridPos = pixelToGrid(pos, this.gridOffset);

        if (!isInsideGrid(gridPos, this.currentLevel.gridSize)) {
            return { hit: false, outOfBounds: true };
        }

        const port = checkPortCollision(gridPos, this.currentLevel.ports);
        if (port && port.type === 'receiver' && !port.unlocked) {
            return {
                hit: false,
                reachedReceiver: true,
                receiverId: port.id
            };
        }

        const collision = checkCollision(
            pos,
            this.currentLevel.obstacles,
            this.gridOffset,
            this.lastProjectilePos || undefined
        );

        if (collision.hit) {
            return {
                hit: true,
                absorbed: collision.absorbed,
                normalX: collision.normalX,
                normalY: collision.normalY
            };
        }

        this.lastProjectilePos = { ...pos };
        return { hit: false };
    }

    private update(deltaTime: number): void {
        this.uiManager.update(deltaTime);

        if (this.gameState === GameState.PLAYING && this.currentLevel) {
            const now = Date.now();
            this.currentLevel.obstacles = updateMovingObstacles(this.currentLevel.obstacles, now);

            if (this.player) {
                if (!this.player.state.projectile?.active) {
                    this.lastProjectilePos = null;
                }
                this.player.update(deltaTime, (pos) => this.checkProjectileCollision(pos));
                this.uiManager.updateTopBar(this.uiManager.topBar.levelName, this.player.state.lives);
            }
        }
    }

    private render(): void {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        ctx.fillStyle = '#0A0A0F';
        ctx.fillRect(0, 0, width, height);

        this.uiManager.draw();

        if (this.gameState === GameState.PLAYING || this.gameState === GameState.TRANSITION) {
            this.renderGameScene();
        }

        if (this.gameState === GameState.PLAYING) {
            this.uiManager.drawTopBar();
        }

        if (this.gameState === GameState.GAME_OVER) {
            this.uiManager.drawGameOver();
        }
    }

    private renderGameScene(): void {
        if (!this.currentLevel) return;

        const ctx = this.ctx;
        const uiOffset: UIGridOffset = {
            x: this.gridOffset.x,
            y: this.gridOffset.y,
            tileWidth: this.gridOffset.tileWidth,
            tileHeight: this.gridOffset.tileHeight
        };

        drawGrid(ctx, this.currentLevel.gridSize, uiOffset);

        const emitters = this.currentLevel.ports.filter(p => p.type === 'emitter');
        const receivers = this.currentLevel.ports.filter(p => p.type === 'receiver');

        for (const emitter of emitters) {
            for (const receiver of receivers) {
                if (!receiver.unlocked) {
                    const start = gridToPixel(emitter.position, this.gridOffset);
                    const end = gridToPixel(receiver.position, this.gridOffset);
                    drawGuideLine(ctx, start, end);
                }
            }
        }

        for (const obstacle of this.currentLevel.obstacles) {
            const pos = gridToPixel(obstacle.position, this.gridOffset);
            drawObstacle(ctx, pos, obstacle.type, this.gridOffset.tileWidth * 0.6);
        }

        for (const receiver of receivers) {
            const pos = gridToPixel(receiver.position, this.gridOffset);
            const hasLock = !!receiver.lockId;
            drawReceiver(ctx, pos, receiver.unlocked || false, hasLock);
        }

        if (this.player) {
            drawPlayer(ctx, this.player);
        }

        if (this.gameState === GameState.TRANSITION) {
            this.uiManager.drawGridWithWave(this.currentLevel.gridSize, uiOffset);
        }
    }

    private gameLoop(timestamp: number): void {
        const deltaTime = timestamp - this.lastFrameTime;
        this.lastFrameTime = timestamp;

        const clampedDelta = Math.min(deltaTime, 33);

        this.update(clampedDelta);
        this.render();

        this.animationFrameId = requestAnimationFrame((t) => this.gameLoop(t));
    }

    start(): void {
        this.lastFrameTime = performance.now();
        this.animationFrameId = requestAnimationFrame((t) => this.gameLoop(t));
    }

    stop(): void {
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        const game = new Game();
        game.start();

        (window as unknown as { game?: Game }).game = game;
    } catch (e) {
        console.error('Failed to initialize game:', e);
    }
});
