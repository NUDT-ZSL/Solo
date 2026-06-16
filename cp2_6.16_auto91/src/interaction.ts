import { GameState, IPlant, ISprite, Plant, Sprite, Particle, Ripple, PlantElement, ELEMENT_COLORS } from './entity';
import { Renderer } from './renderer';

const MAX_PARTICLES = 300;

export class InteractionManager {
  private canvas: HTMLCanvasElement;
  private state: GameState;
  private renderer: Renderer;
  private onPlantCreated: (plant: IPlant) => void;
  private onSpriteFed: (sprite: ISprite, plant: IPlant) => void;

  constructor(
    canvas: HTMLCanvasElement,
    state: GameState,
    renderer: Renderer,
    onPlantCreated: (plant: IPlant) => void,
    onSpriteFed: (sprite: ISprite, plant: IPlant) => void
  ) {
    this.canvas = canvas;
    this.state = state;
    this.renderer = renderer;
    this.onPlantCreated = onPlantCreated;
    this.onSpriteFed = onSpriteFed;

    this.bindEvents();
    this.bindPlantButtons();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));
  }

  private bindPlantButtons(): void {
    const buttons = document.querySelectorAll('.plant-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const element = (btn as HTMLElement).dataset.element as PlantElement;
        if (element) {
          this.state.selectedPlantElement = element;
          buttons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        }
      });
    });
  }

  private handleMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.state.mouseX = e.clientX - rect.left;
    this.state.mouseY = e.clientY - rect.top;

    if (this.state.isDragging && this.state.selectedSprite) {
      const offset = this.renderer.getGardenOffset();
      this.state.selectedSprite.x = this.state.mouseX - offset.x - this.state.dragOffset.x;
      this.state.selectedSprite.y = this.state.mouseY - offset.y - this.state.dragOffset.y;
    }
  }

  private handleMouseDown(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.state.mouseX = e.clientX - rect.left;
    this.state.mouseY = e.clientY - rect.top;

    const hoveredSprite = this.renderer.getHoveredSprite(this.state);
    if (hoveredSprite) {
      this.state.isDragging = true;
      this.state.selectedSprite = hoveredSprite;
      const offset = this.renderer.getGardenOffset();
      this.state.dragOffset = {
        x: this.state.mouseX - offset.x - hoveredSprite.x,
        y: this.state.mouseY - offset.y - hoveredSprite.y
      };
      this.canvas.style.cursor = 'grabbing';
      return;
    }

    const gridPos = this.renderer.getGridPosition(this.state);
    if (gridPos) {
      const existingPlant = this.state.plants.find(
        p => p.gridX === gridPos.gridX && p.gridY === gridPos.gridY
      );
      if (!existingPlant) {
        this.createPlant(gridPos.gridX, gridPos.gridY);
      }
    }
  }

  private handleMouseUp(): void {
    if (this.state.isDragging && this.state.selectedSprite) {
      const hoveredPlant = this.renderer.getHoveredPlant(this.state);
      if (hoveredPlant && this.state.selectedSprite) {
        this.feedSprite(this.state.selectedSprite, hoveredPlant);
      }

      if (this.state.selectedSprite) {
        this.state.selectedSprite.x = Math.max(10, Math.min(this.state.gardenWidth - 10, this.state.selectedSprite.x));
        this.state.selectedSprite.y = Math.max(10, Math.min(this.state.gardenHeight - 10, this.state.selectedSprite.y));
      }
    }

    this.state.isDragging = false;
    this.state.selectedSprite = null;
    this.canvas.style.cursor = 'pointer';
  }

  private createPlant(gridX: number, gridY: number): void {
    const plant = new Plant(gridX, gridY, this.state.selectedPlantElement, this.state.cellSize);
    this.onPlantCreated(plant);

    const ripple = new Ripple(
      plant.x,
      plant.y,
      this.state.cellSize * 0.8,
      ELEMENT_COLORS[plant.element]
    );
    this.state.ripples.push(ripple);

    this.state.totalPlanted++;

    this.addPlantParticles(plant);
  }

  private addPlantParticles(plant: Plant): void {
    for (let i = 0; i < 10; i++) {
      if (this.state.particles.length >= MAX_PARTICLES) break;
      const particle = new Particle(plant.x, plant.y, plant.color);
      this.state.particles.push(particle);
    }
  }

  private feedSprite(sprite: Sprite, plant: Plant): void {
    const shouldEvolve = sprite.feed();
    this.onSpriteFed(sprite, plant);

    for (let i = 0; i < 15; i++) {
      if (this.state.particles.length >= MAX_PARTICLES) break;
      const particle = new Particle(
        sprite.x + (Math.random() - 0.5) * 20,
        sprite.y + (Math.random() - 0.5) * 20,
        sprite.color
      );
      this.state.particles.push(particle);
    }

    if (shouldEvolve) {
      this.evolveSprite(sprite);
    }
  }

  private evolveSprite(sprite: Sprite): void {
    const index = this.state.sprites.findIndex(s => s.id === sprite.id);
    if (index === -1) return;

    const [child1, child2] = sprite.evolve();

    for (let i = 0; i < 20; i++) {
      if (this.state.particles.length >= MAX_PARTICLES) break;
      const particle = new Particle(sprite.x, sprite.y, sprite.color);
      particle.vx *= 1.5;
      particle.vy *= 1.5;
      this.state.particles.push(particle);
    }

    this.state.sprites.splice(index, 1, child1, child2);

    const ripple1 = new Ripple(child1.x, child1.y, 60, child1.color);
    const ripple2 = new Ripple(child2.x, child2.y, 60, child2.color);
    this.state.ripples.push(ripple1, ripple2);
  }

  addSparkParticles(sprite: Sprite): void {
    if (this.state.particles.length >= MAX_PARTICLES) return;

    for (let i = 0; i < 2; i++) {
      if (this.state.particles.length >= MAX_PARTICLES) break;
      const particle = new Particle(
        sprite.x + (Math.random() - 0.5) * 10,
        sprite.y + (Math.random() - 0.5) * 10,
        sprite.color
      );
      particle.maxLife = 600;
      particle.life = 600;
      this.state.particles.push(particle);
    }
  }

  addRipple(x: number, y: number, maxRadius: number, color: string): void {
    const ripple = new Ripple(x, y, maxRadius, color);
    this.state.ripples.push(ripple);
  }

  addRepelParticle(x: number, y: number): void {
    if (this.state.particles.length >= MAX_PARTICLES) return;
    const particle = new Particle(x, y, '#e53170', 'repel');
    this.state.particles.push(particle);
  }
}
