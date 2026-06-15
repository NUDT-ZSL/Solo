import { GameMap, TILE_SIZE } from './map';
import { Player, PLAYER_BODY_LENGTH } from './player';
import { EntityManager, Teleport } from './entities';
import { Renderer, CANVAS_WIDTH, CANVAS_HEIGHT } from './renderer';

enum GameState {
  PLAYING = 'playing',
  GAME_OVER_FADE = 'game_over_fade',
  GAME_OVER = 'game_over',
}

class Game {
  canvas: HTMLCanvasElement;
  map: GameMap;
  player: Player;
  entities: EntityManager;
  renderer: Renderer;
  state: GameState;
  gameOverTimer: number;
  lastTime: number;
  animationFrameId: number | null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.map = new GameMap();
    const startRoom = this.map.rooms[0];
    const startPos = this.map.getRandomFloorInRoom(startRoom);
    this.player = new Player(startPos.x, startPos.y);
    this.entities = new EntityManager();
    this.entities.populateFromMap(this.map);
    this.renderer = new Renderer(canvas);
    this.state = GameState.PLAYING;
    this.gameOverTimer = 0;
    this.lastTime = performance.now();
    this.animationFrameId = null;
    this.map.markRoomExplored(this.player.x, this.player.y);
  }

  reset(): void {
    this.map = new GameMap();
    const startRoom = this.map.rooms[0];
    const startPos = this.map.getRandomFloorInRoom(startRoom);
    this.player.reset(startPos.x, startPos.y);
    this.entities.populateFromMap(this.map);
    this.renderer.reset();
    this.state = GameState.PLAYING;
    this.gameOverTimer = 0;
    this.map.markRoomExplored(this.player.x, this.player.y);
  }

  handleTeleport(tp: Teleport): void {
    const room = this.map.rooms[tp.targetRoomIndex];
    if (room) {
      const newPos = this.map.getRandomFloorInRoom(room);
      this.player.x = newPos.x;
      this.player.y = newPos.y + PLAYER_BODY_LENGTH;
      room.explored = true;
      tp.active = false;
    }
  }

  update(dt: number): void {
    if (this.state === GameState.PLAYING) {
      this.player.update(dt, this.map);
      this.map.markRoomExplored(this.player.x, this.player.y);
      const result = this.entities.update(dt, this.player, this.map);

      if (result.teleportTriggered) {
        this.handleTeleport(result.teleportTriggered);
      }

      if (this.player.lanternTime <= 0) {
        this.state = GameState.GAME_OVER_FADE;
        this.gameOverTimer = 0;
        this.renderer.triggerGameOver();
        this.showGameOverScreen(false);
      }
    } else if (this.state === GameState.GAME_OVER_FADE) {
      this.gameOverTimer += dt;
      const fadeDuration = 0.5;
      this.renderer.setGameOverAlpha(Math.min(1, this.gameOverTimer / fadeDuration));
      if (this.gameOverTimer >= fadeDuration) {
        this.state = GameState.GAME_OVER;
        this.renderer.setGameOverAlpha(1);
        this.showGameOverScreen(true);
      }
    }
  }

  render(dt: number): void {
    this.renderer.render(dt, this.map, this.player, this.entities);
  }

  loop(timestamp: number): void {
    const dt = Math.min(0.05, (timestamp - this.lastTime) / 1000);
    this.lastTime = timestamp;
    this.update(dt);
    this.render(dt);
    this.animationFrameId = requestAnimationFrame((t) => this.loop(t));
  }

  start(): void {
    this.lastTime = performance.now();
    this.animationFrameId = requestAnimationFrame((t) => this.loop(t));
  }

  stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  showGameOverScreen(visible: boolean): void {
    const el = document.getElementById('game-over-screen');
    if (el) {
      if (visible) {
        el.classList.add('visible');
      } else {
        el.classList.remove('visible');
      }
    }
  }

  setupInputHandlers(): void {
    const canvas = this.canvas;

    window.addEventListener('keydown', (e) => {
      this.player.handleKeyDown(e.code);
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.player.handleKeyUp(e.code);
    });

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      this.player.handleMouseMove(x, y);
    });

    canvas.addEventListener('click', (e) => {
      if (this.state !== GameState.PLAYING) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      this.player.handleClick(x, y);
    });

    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        this.showGameOverScreen(false);
        this.reset();
      });
    }
  }
}

function resizeCanvas(): void {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) return;

  const container = document.getElementById('game-container');
  if (!container) return;

  const baseWidth = CANVAS_WIDTH;
  const baseHeight = CANVAS_HEIGHT;
  const aspect = baseWidth / baseHeight;

  const availableW = container.clientWidth - 80;
  const availableH = container.clientHeight - 80;

  let targetW = availableW;
  let targetH = targetW / aspect;

  if (targetH > availableH) {
    targetH = availableH;
    targetW = targetH * aspect;
  }

  targetW = Math.max(400, Math.floor(targetW));
  targetH = Math.max(300, Math.floor(targetH));

  canvas.style.width = targetW + 'px';
  canvas.style.height = targetH + 'px';
}

function bootstrap(): void {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element not found!');
    return;
  }

  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  const game = new Game(canvas);
  game.setupInputHandlers();
  game.start();

  (window as any)._game = game;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
