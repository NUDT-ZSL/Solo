import { EventBus, GameState, Platform, Obstacle, Note, Player } from './EventBus';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;
const PLAYER_SIZE = 40;
const PLATFORM_WIDTH = 120;
const PLATFORM_HEIGHT = 20;
const OBSTACLE_BASE = 60;
const JUMP_HEIGHT = 120;
const GRAVITY = 1200;
const INITIAL_SPEED = 200;
const INITIAL_PLATFORM_INTERVAL = 1.5;
const MIN_PLATFORM_INTERVAL = 0.3;
const INITIAL_OBSTACLE_INTERVAL = 4;
const MIN_OBSTACLE_INTERVAL = 0.8;
const NOTE_RADIUS = 15;
const NOTE_INTERVAL = 5;
const DIFFICULTY_STEP_TIME = 10;
const SPEED_INCREMENT = 0.05;
const OBSTACLE_DECREMENT = 0.3;

export class GameEngine {
  private state: GameState;
  private eventBus: EventBus;
  private animationFrameId: number | null = null;
  private lastTime: number = 0;
  private platformTimer: number = 0;
  private obstacleTimer: number = 0;
  private noteTimer: number = 0;
  private difficultyTimer: number = 0;
  private platformInterval: number = INITIAL_PLATFORM_INTERVAL;
  private obstacleInterval: number = INITIAL_OBSTACLE_INTERVAL;
  private groundY: number = 420;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    const player: Player = {
      x: 100,
      y: this.groundY - PLAYER_SIZE,
      width: PLAYER_SIZE,
      height: PLAYER_SIZE,
      velocityY: 0,
      isJumping: false,
      isOnPlatform: true,
    };

    const platforms: Platform[] = [];
    let currentX = 0;
    for (let i = 0; i < 8; i++) {
      platforms.push({
        x: currentX,
        y: this.groundY + (Math.random() - 0.5) * 40,
        width: PLATFORM_WIDTH,
        height: PLATFORM_HEIGHT,
      });
      currentX += PLATFORM_WIDTH + 60;
    }

    return {
      player,
      platforms,
      obstacles: [],
      notes: [],
      score: 0,
      elapsedTime: 0,
      speed: INITIAL_SPEED,
      isRunning: false,
      isGameOver: false,
    };
  }

  start(): void {
    this.state = this.createInitialState();
    this.platformTimer = 0;
    this.obstacleTimer = 0;
    this.noteTimer = 0;
    this.difficultyTimer = 0;
    this.platformInterval = INITIAL_PLATFORM_INTERVAL;
    this.obstacleInterval = INITIAL_OBSTACLE_INTERVAL;
    this.state.isRunning = true;
    this.state.isGameOver = false;
    this.lastTime = performance.now();
    this.eventBus.emit('gameStart', undefined);
    this.gameLoop();
  }

  stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.state.isRunning = false;
  }

  jump(): void {
    if (!this.state.isRunning || this.state.isGameOver) return;
    if (this.state.player.isOnPlatform) {
      this.state.player.velocityY = -Math.sqrt(2 * GRAVITY * JUMP_HEIGHT);
      this.state.player.isJumping = true;
      this.state.player.isOnPlatform = false;
    }
    this.checkNoteCollection();
  }

  private checkNoteCollection(): void {
    const { player, notes } = this.state;
    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;
    const collectRange = 60;

    for (const note of notes) {
      if (note.collected) continue;
      const dx = playerCenterX - note.x;
      const dy = playerCenterY - note.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < collectRange + note.radius) {
        note.collected = true;
        this.state.score += 50;
        this.eventBus.emit('scoreUpdate', { score: this.state.score });
        this.eventBus.emit('noteCollected', { x: note.x, y: note.y });
      }
    }
  }

  private gameLoop = (): void => {
    if (!this.state.isRunning) return;

    const now = performance.now();
    const deltaTime = Math.min((now - this.lastTime) / 1000, 1 / 30);
    this.lastTime = now;

    this.update(deltaTime);
    this.eventBus.emit('stateUpdate', { ...this.state });

    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };

  private update(dt: number): void {
    if (this.state.isGameOver) return;

    this.state.elapsedTime += dt;
    this.eventBus.emit('timeUpdate', { time: Math.floor(this.state.elapsedTime) });

    this.difficultyTimer += dt;
    if (this.difficultyTimer >= DIFFICULTY_STEP_TIME) {
      this.difficultyTimer -= DIFFICULTY_STEP_TIME;
      this.increaseDifficulty();
    }

    this.updatePlayer(dt);
    this.updatePlatforms(dt);
    this.updateObstacles(dt);
    this.updateNotes(dt);

    this.platformTimer += dt;
    if (this.platformTimer >= this.platformInterval) {
      this.platformTimer = 0;
      this.spawnPlatform();
    }

    this.obstacleTimer += dt;
    if (this.obstacleTimer >= this.obstacleInterval) {
      this.obstacleTimer = 0;
      this.spawnObstacle();
    }

    this.noteTimer += dt;
    if (this.noteTimer >= NOTE_INTERVAL) {
      this.noteTimer = 0;
      this.spawnNote();
    }

    this.state.score += Math.floor(this.state.speed * dt * 0.1);
    this.eventBus.emit('scoreUpdate', { score: this.state.score });

    if (this.checkObstacleCollision()) {
      this.gameOver();
    }
  }

  private increaseDifficulty(): void {
    this.platformInterval = Math.max(MIN_PLATFORM_INTERVAL, this.platformInterval * 0.9);
    this.obstacleInterval = Math.max(MIN_OBSTACLE_INTERVAL, this.obstacleInterval - OBSTACLE_DECREMENT);
    this.state.speed = this.state.speed * (1 + SPEED_INCREMENT);
  }

  private updatePlayer(dt: number): void {
    const { player } = this.state;

    player.velocityY += GRAVITY * dt;
    player.y += player.velocityY * dt;

    player.isOnPlatform = false;

    for (const platform of this.state.platforms) {
      if (
        player.x + player.width > platform.x &&
        player.x < platform.x + platform.width &&
        player.y + player.height >= platform.y &&
        player.y + player.height <= platform.y + platform.height + 10 &&
        player.velocityY >= 0
      ) {
        player.y = platform.y - player.height;
        player.velocityY = 0;
        player.isJumping = false;
        player.isOnPlatform = true;
        break;
      }
    }

    if (player.y > CANVAS_HEIGHT + 100) {
      this.gameOver();
    }
  }

  private updatePlatforms(dt: number): void {
    const speed = this.state.speed;
    this.state.platforms.forEach((p) => {
      p.x -= speed * dt;
    });
    this.state.platforms = this.state.platforms.filter((p) => p.x + p.width > -50);
  }

  private updateObstacles(dt: number): void {
    const speed = this.state.speed;
    this.state.obstacles.forEach((o) => {
      o.x -= speed * dt;
    });
    this.state.obstacles = this.state.obstacles.filter((o) => o.x + o.baseWidth > -50);
  }

  private updateNotes(dt: number): void {
    const speed = this.state.speed;
    this.state.notes.forEach((n) => {
      n.x -= speed * dt;
    });
    this.state.notes = this.state.notes.filter((n) => n.x + n.radius > -50 && !n.collected);
  }

  private spawnPlatform(): void {
    const rightmost = this.state.platforms.reduce(
      (max, p) => (p.x + p.width > max.x + max.width ? p : max),
      this.state.platforms[0]
    );
    const gap = 80 + Math.random() * 60;
    const y = this.groundY + (Math.random() - 0.5) * 80;
    const platform: Platform = {
      x: rightmost.x + rightmost.width + gap,
      y: Math.max(280, Math.min(450, y)),
      width: PLATFORM_WIDTH,
      height: PLATFORM_HEIGHT,
    };
    this.state.platforms.push(platform);
  }

  private spawnObstacle(): void {
    const lastPlatform = this.state.platforms.find(
      (p) => p.x + p.width > CANVAS_WIDTH - 100 && p.x < CANVAS_WIDTH + 200
    );
    if (!lastPlatform) return;

    const obstacleHeight = 50;
    const obstacle: Obstacle = {
      x: lastPlatform.x + Math.random() * (lastPlatform.width - OBSTACLE_BASE),
      y: lastPlatform.y - obstacleHeight,
      baseWidth: OBSTACLE_BASE,
      height: obstacleHeight,
    };
    this.state.obstacles.push(obstacle);
  }

  private spawnNote(): void {
    const note: Note = {
      x: CANVAS_WIDTH + 100,
      y: 200 + Math.random() * 150,
      radius: NOTE_RADIUS,
      collected: false,
    };
    this.state.notes.push(note);
  }

  private checkObstacleCollision(): boolean {
    const { player, obstacles } = this.state;
    const playerRect = {
      left: player.x,
      right: player.x + player.width,
      top: player.y,
      bottom: player.y + player.height,
    };

    for (const obstacle of obstacles) {
      const triPoints = [
        { x: obstacle.x + obstacle.baseWidth / 2, y: obstacle.y },
        { x: obstacle.x, y: obstacle.y + obstacle.height },
        { x: obstacle.x + obstacle.baseWidth, y: obstacle.y + obstacle.height },
      ];

      if (this.rectTriangleCollision(playerRect, triPoints)) {
        return true;
      }
    }
    return false;
  }

  private rectTriangleCollision(
    rect: { left: number; right: number; top: number; bottom: number },
    triangle: { x: number; y: number }[]
  ): boolean {
    const rectPoints = [
      { x: rect.left, y: rect.top },
      { x: rect.right, y: rect.top },
      { x: rect.right, y: rect.bottom },
      { x: rect.left, y: rect.bottom },
    ];

    const triEdges = [
      [triangle[0], triangle[1]],
      [triangle[1], triangle[2]],
      [triangle[2], triangle[0]],
    ];

    const rectEdges = [
      [rectPoints[0], rectPoints[1]],
      [rectPoints[1], rectPoints[2]],
      [rectPoints[2], rectPoints[3]],
      [rectPoints[3], rectPoints[0]],
    ];

    const allEdges = [...triEdges, ...rectEdges];

    for (const edge of allEdges) {
      const axis = { x: -(edge[1].y - edge[0].y), y: edge[1].x - edge[0].x };
      const len = Math.sqrt(axis.x * axis.x + axis.y * axis.y);
      if (len === 0) continue;
      axis.x /= len;
      axis.y /= len;

      let triMin = Infinity, triMax = -Infinity;
      for (const p of triangle) {
        const proj = p.x * axis.x + p.y * axis.y;
        triMin = Math.min(triMin, proj);
        triMax = Math.max(triMax, proj);
      }

      let rectMin = Infinity, rectMax = -Infinity;
      for (const p of rectPoints) {
        const proj = p.x * axis.x + p.y * axis.y;
        rectMin = Math.min(rectMin, proj);
        rectMax = Math.max(rectMax, proj);
      }

      if (triMax < rectMin || rectMax < triMin) {
        return false;
      }
    }

    return true;
  }

  private gameOver(): void {
    this.state.isGameOver = true;
    this.state.isRunning = false;
    this.stop();
    this.eventBus.emit('gameEnd', {
      score: this.state.score,
      time: Math.floor(this.state.elapsedTime),
    });
  }

  getState(): GameState {
    return { ...this.state };
  }
}
