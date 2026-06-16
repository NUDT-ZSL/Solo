import { GameState, Plant, Sprite, ALL_ELEMENTS, ElementType } from './entity';
import { Renderer } from './renderer';
import { InteractionManager } from './interaction';

export type { GameState };

const GRID_SIZE = 8;
const CELL_SIZE = 100;
const GARDEN_WIDTH = GRID_SIZE * CELL_SIZE;
const GARDEN_HEIGHT = GRID_SIZE * CELL_SIZE;
const MAX_PARTICLES = 300;
const MAX_SPRITES = 50;
const STAY_DURATION = 5000;
const REPEL_DISTANCE = 60;

class Game {
  private canvas: HTMLCanvasElement;
  private state: GameState;
  private renderer: Renderer;
  private interaction: InteractionManager;
  private lastTime: number = 0;
  private animationId: number = 0;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;

    this.state = {
      plants: [],
      sprites: [],
      particles: [],
      ripples: [],
      gridSize: GRID_SIZE,
      cellSize: CELL_SIZE,
      gardenWidth: GARDEN_WIDTH,
      gardenHeight: GARDEN_HEIGHT,
      selectedPlantElement: 'fire',
      selectedSprite: null,
      isDragging: false,
      dragOffset: { x: 0, y: 0 },
      mouseX: 0,
      mouseY: 0,
      totalPlanted: 0,
      lastSpriteSpawn: 0,
      spriteSpawnInterval: 3000
    };

    this.renderer = new Renderer(this.canvas);
    this.interaction = new InteractionManager(
      this.canvas,
      this.state,
      this.renderer,
      this.handlePlantCreated.bind(this),
      this.handleSpriteFed.bind(this)
    );

    this.init();
  }

  private init(): void {
    this.lastTime = performance.now();
    this.spawnInitialSprites();
    this.gameLoop();
  }

  private spawnInitialSprites(): void {
    for (let i = 0; i < 3; i++) {
      this.spawnSprite();
    }
  }

  private spawnSprite(): void {
    if (this.state.sprites.length >= MAX_SPRITES) return;

    const element = ALL_ELEMENTS[Math.floor(Math.random() * ALL_ELEMENTS.length)];
    const side = Math.floor(Math.random() * 4);
    let x: number, y: number;

    switch (side) {
      case 0:
        x = Math.random() * GARDEN_WIDTH;
        y = -20;
        break;
      case 1:
        x = GARDEN_WIDTH + 20;
        y = Math.random() * GARDEN_HEIGHT;
        break;
      case 2:
        x = Math.random() * GARDEN_WIDTH;
        y = GARDEN_HEIGHT + 20;
        break;
      default:
        x = -20;
        y = Math.random() * GARDEN_HEIGHT;
        break;
    }

    const sprite = new Sprite(x, y, element);
    this.state.sprites.push(sprite);
  }

  private handlePlantCreated(plant: Plant): void {
    this.state.plants.push(plant);
  }

  private handleSpriteFed(_sprite: Sprite, _plant: Plant): void {
  }

  private gameLoop(): void {
    const currentTime = performance.now();
    const deltaTime = Math.min(currentTime - this.lastTime, 50);
    this.lastTime = currentTime;

    this.update(deltaTime, currentTime);
    this.render();

    void this.animationId;
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update(deltaTime: number, currentTime: number): void {
    if (currentTime - this.state.lastSpriteSpawn > this.state.spriteSpawnInterval) {
      this.spawnSprite();
      this.state.lastSpriteSpawn = currentTime;
      this.state.spriteSpawnInterval = 2000 + Math.random() * 3000;
    }

    for (const plant of this.state.plants) {
      plant.update(deltaTime);
    }

    for (const sprite of this.state.sprites) {
      if (this.state.isDragging && this.state.selectedSprite?.id === sprite.id) continue;
      sprite.update(deltaTime, GARDEN_WIDTH, GARDEN_HEIGHT);

      if (sprite.stayTimer <= 0) {
        for (const plant of this.state.plants) {
          if (!plant.isFullyGrown()) continue;
          if (sprite.element !== plant.element) continue;

          const dx = plant.x - sprite.x;
          const dy = plant.y - sprite.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < plant.manaRadius) {
            sprite.stay(STAY_DURATION);
            sprite.x = plant.x + (Math.random() - 0.5) * 20;
            sprite.y = plant.y + (Math.random() - 0.5) * 20;
            break;
          }
        }
      }

      if (sprite.shouldEmitSpark()) {
        for (let i = 0; i < 2; i++) {
          if (this.state.particles.length >= MAX_PARTICLES) break;
          this.interaction.addSparkParticles(sprite);
        }
        sprite.resetSparkTimer();
      }
    }

    const evolvedSprites = this.state.sprites.filter(s => s.isEvolved);
    for (let i = 0; i < evolvedSprites.length; i++) {
      for (let j = i + 1; j < evolvedSprites.length; j++) {
        const s1 = evolvedSprites[i];
        const s2 = evolvedSprites[j];

        if (s1.element !== s2.element) {
          const dx = s2.x - s1.x;
          const dy = s2.y - s1.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < REPEL_DISTANCE && dist > 0) {
            const nx = dx / dist;
            const ny = dy / dist;
            const pushForce = (REPEL_DISTANCE - dist) * 0.5;

            if (!this.state.isDragging || this.state.selectedSprite?.id !== s1.id) {
              s1.x -= nx * pushForce * deltaTime / 16;
              s1.y -= ny * pushForce * deltaTime / 16;
              s1.targetAngle = Math.atan2(-ny, -nx);
            }
            if (!this.state.isDragging || this.state.selectedSprite?.id !== s2.id) {
              s2.x += nx * pushForce * deltaTime / 16;
              s2.y += ny * pushForce * deltaTime / 16;
              s2.targetAngle = Math.atan2(ny, nx);
            }

            if (Math.random() < 0.1) {
              const midX = (s1.x + s2.x) / 2;
              const midY = (s1.y + s2.y) / 2;
              this.interaction.addRepelParticle(midX, midY);
            }
          }
        }
      }
    }

    this.state.particles = this.state.particles.filter(p => p.update(deltaTime));
    this.state.ripples = this.state.ripples.filter(r => r.update(deltaTime));

    while (this.state.particles.length > MAX_PARTICLES) {
      this.state.particles.shift();
    }
  }

  private render(): void {
    const ecoHealth = this.calculateEcoHealth();
    const levelDistribution = this.calculateLevelDistribution();
    this.renderer.render(this.state, ecoHealth, levelDistribution);
  }

  private calculateEcoHealth(): number {
    const uniqueElements = new Set(this.state.sprites.map(s => s.element));
    const diversityIndex = uniqueElements.size / ALL_ELEMENTS.length;

    const survivalRate = this.state.totalPlanted > 0
      ? this.state.plants.length / this.state.totalPlanted
      : 1;

    return (diversityIndex * 0.5 + survivalRate * 0.5) * 100;
  }

  private calculateLevelDistribution(): Record<ElementType, number> {
    const distribution: Record<string, number> = {};
    for (const element of ALL_ELEMENTS) {
      distribution[element] = 0;
    }
    for (const sprite of this.state.sprites) {
      distribution[sprite.element] = (distribution[sprite.element] || 0) + 1;
    }
    return distribution as Record<ElementType, number>;
  }

  public getState(): GameState {
    return this.state;
  }
}

const game = new Game();
export default game;
