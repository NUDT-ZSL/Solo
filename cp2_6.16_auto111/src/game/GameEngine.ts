import { MapGenerator } from './MapGenerator';
import { Player } from './Player';
import { EnemyAI } from './Enemy';
import type { GameState, InputState, LightSource, Enemy, Vector2, LightSource as Light } from './types';

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 640;

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private mapGenerator: MapGenerator;
  private player!: Player;
  private enemies: EnemyAI[] = [];
  private gameState: GameState;
  private inputState: InputState;
  private lastTime: number = 0;
  private animationFrameId: number | null = null;
  private listeners: Set<(state: GameState) => void> = new Set();
  private targetFps: number = 60;
  private frameInterval: number = 1000 / this.targetFps;
  private accumulatedTime: number = 0;
  private tileSize: number = 16;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;
    
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    this.ctx = ctx;

    this.mapGenerator = new MapGenerator(CANVAS_WIDTH, CANVAS_HEIGHT);
    const map = this.mapGenerator.generate();

    const spawnPos = this.mapGenerator.getRandomFloorPosition();
    this.player = new Player(spawnPos.x, spawnPos.y, map);

    this.enemies = this.spawnEnemies(map);

    this.inputState = {
      up: false,
      down: false,
      left: false,
      right: false,
      sneak: false,
      usePotion: false,
    };

    this.gameState = {
      player: this.player.state,
      enemies: this.enemies.map(e => e.enemy),
      map,
      lightSources: [],
      lightIntensityAtPlayer: 0,
      screenEffect: {
        type: null,
        timer: 0,
        intensity: 0,
      },
      score: 0,
      time: 0,
      isPaused: false,
    };

    this.setupInputListeners();
  }

  private spawnEnemies(map: GameState['map']): EnemyAI[] {
    const enemies: EnemyAI[] = [];
    const rooms = map.rooms;
    
    for (let i = 0; i < 4; i++) {
      const room = rooms[(i + 1) % rooms.length];
      const centerX = (room.x + room.width / 2) * this.tileSize;
      const centerY = (room.y + room.height / 2) * this.tileSize;
      
      const patrolPoints: Vector2[] = [];
      const numPoints = 2 + Math.floor(Math.random() * 3);
      
      for (let j = 0; j < numPoints; j++) {
        const offsetX = (Math.random() - 0.5) * room.width * this.tileSize * 0.6;
        const offsetY = (Math.random() - 0.5) * room.height * this.tileSize * 0.6;
        patrolPoints.push({
          x: centerX + offsetX,
          y: centerY + offsetY,
        });
      }
      
      const enemy = new EnemyAI(
        i,
        centerX,
        centerY,
        patrolPoints,
        map
      );
      enemies.push(enemy);
    }
    
    return enemies;
  }

  private setupInputListeners(): void {
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('keyup', this.handleKeyUp.bind(this));
  }

  private handleKeyDown(e: KeyboardEvent): void {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.inputState.up = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.inputState.down = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.inputState.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.inputState.right = true;
        break;
      case 'Space':
        e.preventDefault();
        this.inputState.sneak = !this.inputState.sneak;
        break;
      case 'KeyE':
        this.inputState.usePotion = true;
        break;
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.inputState.up = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.inputState.down = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.inputState.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.inputState.right = false;
        break;
      case 'KeyE':
        this.inputState.usePotion = false;
        break;
    }
  }

  start(): void {
    this.lastTime = performance.now();
    this.gameLoop();
  }

  stop(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    window.removeEventListener('keydown', this.handleKeyDown.bind(this));
    window.removeEventListener('keyup', this.handleKeyUp.bind(this));
  }

  private gameLoop(): void {
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    if (!this.gameState.isPaused) {
      this.accumulatedTime += deltaTime;

      while (this.accumulatedTime >= this.frameInterval) {
        const dt = this.frameInterval / 1000;
        this.update(dt);
        this.accumulatedTime -= this.frameInterval;
      }
    }

    this.render();
    this.notifyListeners();

    this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
  }

  private update(dt: number): void {
    this.gameState.time += dt;

    const lightSources = this.collectLightSources();
    this.gameState.lightSources = lightSources;

    this.player.update(this.inputState, lightSources, dt, this.gameState.map.potions);
    this.gameState.player = this.player.state;

    this.gameState.lightIntensityAtPlayer = this.player.getLightIntensity(lightSources);

    const playerAverageOpacity = this.player.getAverageOpacity();

    for (const enemyAI of this.enemies) {
      const result = enemyAI.update(this.player.state, playerAverageOpacity, dt);
      if (result.triggered) {
        this.triggerScreenEffect('danger');
      }
      if (result.lostTarget) {
        this.triggerScreenEffect('success');
        this.gameState.score += 100;
      }
    }
    this.gameState.enemies = this.enemies.map(e => e.enemy);

    if (this.gameState.screenEffect.timer > 0) {
      this.gameState.screenEffect.timer -= dt;
      if (this.gameState.screenEffect.timer <= 0) {
        this.gameState.screenEffect.type = null;
      }
    }

    if (this.gameState.screenEffect.type === 'danger') {
      this.gameState.screenEffect.intensity = 0.1 + 0.3 * Math.abs(Math.sin(this.gameState.time * Math.PI * 2 / 0.8));
    } else if (this.gameState.screenEffect.type === 'success') {
      this.gameState.screenEffect.intensity = 0.05 + 0.15 * Math.abs(Math.sin(this.gameState.time * Math.PI * 2 / 1));
    }

    for (const mushroom of this.gameState.map.mushrooms) {
      mushroom.phase += dt * Math.PI;
    }
  }

  private collectLightSources(): Light[] {
    const sources: LightSource[] = [];

    sources.push({
      x: this.player.state.x,
      y: this.player.state.y,
      type: 'flashlight',
      radius: 120,
      angle: 60,
      direction: this.player.state.facing,
      color: '#ffe066',
      intensity: 0.8,
    });

    for (const torch of this.gameState.map.torches) {
      sources.push({
        x: torch.x,
        y: torch.y,
        type: 'torch',
        radius: torch.radius,
        color: torch.color,
        intensity: 0.9,
      });
    }

    for (const mushroom of this.gameState.map.mushrooms) {
      const brightness = 0.5 + 0.5 * Math.sin(mushroom.phase);
      sources.push({
        x: mushroom.x,
        y: mushroom.y,
        type: 'mushroom',
        radius: mushroom.radius * 3,
        color: mushroom.colorEnd,
        intensity: 0.3 * brightness,
      });
    }

    return sources;
  }

  private triggerScreenEffect(type: 'danger' | 'success'): void {
    this.gameState.screenEffect.type = type;
    this.gameState.screenEffect.timer = type === 'danger' ? 2 : 1.5;
  }

  private render(): void {
    const ctx = this.ctx;
    const time = this.gameState.time;

    ctx.fillStyle = '#0f0f1a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    this.renderFloor();
    this.renderWalls();
    this.renderMushrooms(time);
    this.renderPotions();
    this.renderTorches(time);
    this.renderLighting();
    this.renderEnemies();
    this.renderPlayer();
    this.renderEnemyVision();
    this.renderScreenEffect();
  }

  private renderFloor(): void {
    const ctx = this.ctx;
    for (const tile of this.gameState.map.floorTiles) {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(tile.x, tile.y, this.tileSize, this.tileSize);
    }
  }

  private renderWalls(): void {
    const ctx = this.ctx;
    for (const wall of this.gameState.map.walls) {
      ctx.fillStyle = '#2a1a0a';
      ctx.fillRect(wall.x, wall.y, this.tileSize, this.tileSize);

      ctx.strokeStyle = 'rgba(74, 58, 42, 0.6)';
      ctx.lineWidth = 1;

      const brickWidth = this.tileSize / 2;
      const brickHeight = this.tileSize / 2;

      for (let row = 0; row < 2; row++) {
        const offset = row % 2 === 0 ? 0 : brickWidth / 2;
        for (let col = 0; col < 3; col++) {
          const x = wall.x + offset + col * brickWidth;
          const y = wall.y + row * brickHeight;
          ctx.strokeRect(x, y, brickWidth - 0.5, brickHeight - 0.5);
        }
      }
    }
  }

  private renderMushrooms(time: number): void {
    const ctx = this.ctx;
    
    for (const mushroom of this.gameState.map.mushrooms) {
      const brightness = 0.5 + 0.5 * Math.sin(mushroom.phase);
      const pulseRadius = mushroom.radius * (0.8 + 0.4 * brightness);

      const gradient = ctx.createRadialGradient(
        mushroom.x, mushroom.y, 0,
        mushroom.x, mushroom.y, pulseRadius * 2
      );
      
      const r = Math.floor(0 + brightness * 0);
      const g = Math.floor(255);
      const b = Math.floor(136 + brightness * (204 - 136));
      
      gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.8)`);
      gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.3)`);
      gradient.addColorStop(1, 'rgba(0, 255, 136, 0)');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(mushroom.x, mushroom.y, pulseRadius * 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(0, 255, 170, ${0.6 + 0.4 * brightness})';
      ctx.beginPath();
      ctx.arc(mushroom.x, mushroom.y, pulseRadius * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private renderPotions(): void {
    const ctx = this.ctx;
    
    for (const potion of this.gameState.map.potions) {
      if (potion.collected) continue;

      const floatY = Math.sin(this.gameState.time * 3) * 2;
      const py = potion.y + floatY;

      ctx.save();
      ctx.translate(potion.x, py);

      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, potion.radius * 2);
      glow.addColorStop(0, 'rgba(100, 200, 255, 0.4)');
      glow.addColorStop(1, 'rgba(100, 200, 255, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, potion.radius * 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(100, 200, 255, 0.7)';
      ctx.beginPath();
      ctx.moveTo(-potion.radius * 0.6, -potion.radius * 0.8);
      ctx.lineTo(potion.radius * 0.6, -potion.radius * 0.8);
      ctx.lineTo(potion.radius * 0.4, potion.radius);
      ctx.lineTo(-potion.radius * 0.4, potion.radius);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(200, 230, 255, 0.5)';
      ctx.fillRect(-potion.radius * 0.3, -potion.radius, potion.radius * 0.6, potion.radius * 0.3);

      ctx.restore();
    }
  }

  private renderTorches(time: number): void {
    const ctx = this.ctx;
    
    for (const torch of this.gameState.map.torches) {
      const flicker = 0.8 + 0.2 * Math.sin(time * 10 + torch.x);

      const gradient = ctx.createRadialGradient(
        torch.x, torch.y, 0,
        torch.x, torch.y, torch.radius
      );
      gradient.addColorStop(0, `rgba(255, 107, 53, ${0.6 * flicker})`);
      gradient.addColorStop(0.3, `rgba(255, 107, 53, 0.2)');
      gradient.addColorStop(1, 'rgba(255, 107, 53, 0)');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(torch.x, torch.y, torch.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(255, 200, 100, ${flicker})`;
      ctx.beginPath();
      ctx.arc(torch.x, torch.y, 6, 0, Math.PI * 2);
      ctx.fill();

      const flameHeight = 8 + 3 * Math.sin(time * 15 + torch.y);
      ctx.fillStyle = '#ff6b35';
      ctx.beginPath();
      ctx.moveTo(torch.x - 4, torch.y);
      ctx.quadraticCurveTo(torch.x, torch.y - flameHeight, torch.x + 4, torch.y);
      ctx.fill();
    }
  }

  private renderLighting(): void {
    const ctx = this.ctx;
    ctx.save();
    
    ctx.globalCompositeOperation = 'source-over';
    
    for (const light of this.gameState.lightSources) {
      if (light.type === 'flashlight') {
        const gradient = ctx.createRadialGradient(
          light.x, light.y, 0,
          light.x, light.y, light.radius
        );
        gradient.addColorStop(0, 'rgba(255, 224, 102, 0.15)');
        gradient.addColorStop(1, 'rgba(255, 224, 102, 0)');
        
        ctx.save();
        ctx.translate(light.x, light.y);
        ctx.rotate(light.direction || 0);
        
        ctx.beginPath();
        ctx.moveTo(0, 0);
        const halfAngle = ((light.angle || 60) * Math.PI / 180) / 2;
        ctx.arc(0, 0, light.radius, -halfAngle, halfAngle);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();
        
        ctx.restore();
      }
    }
    
    ctx.restore();
  }

  private renderPlayer(): void {
    const ctx = this.ctx;
    const player = this.player.state;

    ctx.save();
    ctx.globalAlpha = player.opacity;

    const renderHeight = player.height;
    const renderY = player.y + (player.baseHeight - renderHeight) / 2;

    ctx.fillStyle = player.potionActive ? '#88ccff' : '#d4a574';
    ctx.fillRect(
      player.x - player.width / 2,
      renderY - renderHeight / 2,
      player.width,
      renderHeight
    );

    ctx.fillStyle = player.potionActive ? '#aaeeff' : '#e8c9a0';
    ctx.fillRect(
      player.x - 8,
      renderY - renderHeight / 2 - 8,
      16,
      12
    );

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(player.x - 5,
      renderY - renderHeight / 2 - 4,
      3,
      3
    );
    ctx.fillRect(player.x + 2,
      renderY - renderHeight / 2 - 4,
      3,
      3
    );

    ctx.restore();

    const indicatorWidth = 48;
    const indicatorHeight = 8;
    const indicatorX = player.x - indicatorWidth / 2;
    const indicatorY = renderY - renderHeight / 2 - 20;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.ellipse(
      player.x,
      indicatorY + indicatorHeight / 2,
      indicatorWidth / 2,
      indicatorHeight,
      0,
      Math.PI,
      0,
      true
    );
    ctx.fill();

    const visibility = 1 - player.visibility;
    const progress = Math.max(0, Math.min(1, visibility));

    const r = Math.floor(34 + (239 - 34) * progress);
    const g = Math.floor(197 + (68 - 197) * (1 - progress));
    const b = Math.floor(94 + (68 - 94) * (1 - progress));

    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.beginPath();
    ctx.ellipse(
      player.x,
      indicatorY + indicatorHeight / 2,
      indicatorWidth / 2,
      indicatorHeight,
      0,
      Math.PI,
      Math.PI * (1 - progress),
      0,
      true
    );
    ctx.fill();

    ctx.strokeStyle = 'rgba(201, 169, 89, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(
      player.x,
      indicatorY + indicatorHeight / 2,
      indicatorWidth / 2,
      indicatorHeight,
      0,
      Math.PI,
      0,
      true
    );
    ctx.stroke();
  }

  private renderEnemies(): void {
    const ctx = this.ctx;

    for (const enemy of this.gameState.enemies) {
      ctx.fillStyle = '#8b4513';
      ctx.fillRect(
        enemy.x - enemy.width / 2,
        enemy.y - enemy.height / 2,
        enemy.width,
        enemy.height
      );

      ctx.fillStyle = '#654321';
      ctx.fillRect(
        enemy.x - 6,
        enemy.y - enemy.height / 2 - 8,
        12,
        10
      );

      ctx.fillStyle = '#ff0000';
      ctx.fillRect(enemy.x - 4, enemy.y - enemy.height / 2 - 4, 2, 2);
      ctx.fillRect(enemy.x + 2, enemy.y - enemy.height / 2 - 4, 2, 2);

      if (enemy.state === 'alert' || enemy.state === 'chase') {
        const scale = 1 + 0.3 * Math.abs(Math.sin(enemy.alertAnimation));
        ctx.save();
        ctx.translate(enemy.x, enemy.y - enemy.height / 2 - 20);
        ctx.scale(scale, scale);

        ctx.fillStyle = '#ff0000';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('!', 0, 0);

        ctx.restore();
      }
    }
  }

  private renderEnemyVision(): void {
    const ctx = this.ctx;

    for (const enemy of this.gameState.enemies) {
      ctx.save();
      ctx.translate(enemy.x, enemy.y);
      ctx.rotate(enemy.facing);

      const halfAngle = (enemy.viewAngle * Math.PI / 180) / 2;

      const gradient = ctx.createRadialGradient(
        0, 0, 0,
        0, 0, enemy.viewDistance
      );
      
      const alpha = enemy.state === 'chase' ? 'rgba(255, 100, 100, 0.15)' : 'rgba(255, 255, 255, 0.08)';
      
      gradient.addColorStop(0, alpha);
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, enemy.viewDistance, -halfAngle, halfAngle);
      ctx.closePath();
      ctx.fillStyle = gradient;

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, enemy.viewDistance, -halfAngle, halfAngle);
      ctx.closePath();
      ctx.stroke();

      ctx.restore();
    }
  }

  private renderScreenEffect(): void {
    const ctx = this.ctx;
    const effect = this.gameState.screenEffect;

    if (effect.type === 'danger') {
      const gradient = ctx.createRadialGradient(
        CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, Math.min(CANVAS_WIDTH, CANVAS_HEIGHT) / 3,
        CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, Math.max(CANVAS_WIDTH, CANVAS_HEIGHT) / 1.5
      );
      gradient.addColorStop(0, 'rgba(255, 0, 0, 0)');
      gradient.addColorStop(1, `rgba(255, 0, 0, ${effect.intensity})`);
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    } else if (effect.type === 'success') {
      const gradient = ctx.createRadialGradient(
        CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, Math.min(CANVAS_WIDTH, CANVAS_HEIGHT) / 3,
        CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, Math.max(CANVAS_WIDTH, CANVAS_HEIGHT) / 1.5
      );
      gradient.addColorStop(0, 'rgba(100, 200, 255, 0)');
      gradient.addColorStop(1, `rgba(100, 200, 255, ${effect.intensity})`);
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
  }

  subscribe(callback: (state: GameState) => void): () => void {
    this.listeners.add(callback);
    callback(this.gameState);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.gameState);
    }
  }

  getState(): GameState {
    return this.gameState;
  }

  setInput(input: Partial<InputState>): void {
    Object.assign(this.inputState, input);
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }
}
