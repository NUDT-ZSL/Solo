import { Plant, LightBeam, Particle } from './plant';

export class Environment {
  plants: Plant[] = [];
  lightBeams: LightBeam[] = [];
  particles: Particle[] = [];
  width: number;
  height: number;
  soilY: number;

  private selectedPlant: Plant | null = null;
  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private plantStartX: number = 0;
  private plantStartY: number = 0;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.soilY = height - 80;
    this.initLightBeams();
  }

  private initLightBeams(): void {
    const beamCount = 8;
    for (let i = 0; i < beamCount; i++) {
      this.lightBeams.push({
        x: (i / beamCount) * this.width + Math.random() * 50,
        y: 0,
        height: this.soilY,
        opacity: 0.3 + Math.random() * 0.2,
      });
    }
  }

  update(deltaTime: number): void {
    this.updateLightBeams(deltaTime);
    this.updatePlants(deltaTime);
    this.updateParticles(deltaTime);
  }

  private updateLightBeams(deltaTime: number): void {
    const moveSpeed = 60;

    for (const beam of this.lightBeams) {
      beam.x += moveSpeed * deltaTime;

      if (beam.x > this.width + 20) {
        beam.x = -20;
        beam.opacity = 0.3 + Math.random() * 0.2;
      }
    }
  }

  private updatePlants(deltaTime: number): void {
    for (const plant of this.plants) {
      plant.grow(deltaTime, this.plants);
      plant.updateLight(this.lightBeams, deltaTime);
    }
  }

  private updateParticles(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * deltaTime * 60;
      p.y += p.vy * deltaTime * 60;
      p.life -= deltaTime;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  handleCanvasClick(x: number, y: number): void {
    if (this.isDragging) return;

    for (const plant of this.plants) {
      if (plant.containsPoint(x, y)) {
        return;
      }
    }

    if (y > 0 && y < this.soilY + 20) {
      const soilY = Math.max(y, this.soilY - 10);
      this.plantSeed(x, soilY);
    }
  }

  handleMouseDown(x: number, y: number): boolean {
    for (const plant of this.plants) {
      if (plant.containsPoint(x, y)) {
        this.selectedPlant = plant;
        this.isDragging = true;
        this.dragStartX = x;
        this.dragStartY = y;
        this.plantStartX = plant.seedX;
        this.plantStartY = plant.seedY;
        plant.isSelected = true;
        return true;
      }
    }
    return false;
  }

  handleMouseMove(x: number, y: number): void {
    if (this.isDragging && this.selectedPlant) {
      const dx = x - this.dragStartX;
      const dy = y - this.dragStartY;
      const newX = Math.max(20, Math.min(this.width - 20, this.plantStartX + dx));
      const newY = Math.max(100, Math.min(this.soilY + 30, this.plantStartY + dy));
      this.selectedPlant.moveTo(newX, newY);
    }
  }

  handleMouseUp(): void {
    if (this.selectedPlant) {
      this.selectedPlant.isSelected = false;
    }
    this.selectedPlant = null;
    this.isDragging = false;
  }

  reset(): void {
    this.plants = [];
    this.particles = [];
    this.selectedPlant = null;
    this.isDragging = false;
  }

  private plantSeed(x: number, y: number): void {
    const plant = new Plant(x, y);
    this.plants.push(plant);
    this.createSeedParticles(x, y);
  }

  private createSeedParticles(x: number, y: number): void {
    const count = 8;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = 1 + Math.random() * 2;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2 + Math.random() * 2,
        life: 0.3,
        maxLife: 0.3,
        color: '#8bc34a',
      });
    }
  }

  getPlantCount(): number {
    return this.plants.length;
  }

  shouldUseLowDetailLeaves(): boolean {
    return this.plants.length > 20;
  }
}
