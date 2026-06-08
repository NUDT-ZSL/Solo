import { Blob, Genome } from './blob';

export interface Food {
  x: number;
  y: number;
  radius: number;
  eaten: boolean;
}

export interface Spike {
  x: number;
  y: number;
  size: number;
}

export interface GenerationStats {
  generation: number;
  avgFitness: number;
  bestFitness: number;
  foodSpawnInterval: number;
}

export class Environment {
  public blobs: Blob[] = [];
  public foods: Food[] = [];
  public spikes: Spike[] = [];
  public generation: number = 1;
  public generationTime: number = 0;
  public readonly generationDuration: number = 60;
  public stats: GenerationStats[] = [];
  public bounds: { w: number; h: number };

  private readonly foodRadius: number = 3;
  private readonly spikeSize: number = 8;
  private readonly foodSpawnInterval: number = 2;
  private foodSpawnTimer: number = 0;
  private readonly initialBlobCount: number = 8;
  private readonly mutationRate: number = 0.3;
  private readonly mutationStrength: number = 0.2;

  constructor(bounds: { w: number; h: number }) {
    this.bounds = bounds;
    this.generateInitialPopulation();
    this.spawnInitialFood();
    this.spawnInitialSpikes();
  }

  private generateInitialPopulation(): void {
    for (let i = 0; i < this.initialBlobCount; i++) {
      const genome: Genome = {
        springLength: 0.5 + Math.random() * 1.5,
        particleDistance: 0.8 + Math.random() * 0.7,
        moveSpeed: 0.5 + Math.random() * 1.5,
        sensitivity: 0.1 + Math.random() * 0.9
      };

      const x = 100 + Math.random() * (this.bounds.w - 200);
      const y = 100 + Math.random() * (this.bounds.h - 200);

      this.blobs.push(new Blob(x, y, genome, 100 + Math.floor(Math.random() * 100)));
    }
  }

  private spawnInitialFood(): void {
    for (let i = 0; i < 20; i++) {
      this.spawnFood();
    }
  }

  private spawnInitialSpikes(): void {
    for (let i = 0; i < 15; i++) {
      this.spawnSpike();
    }
  }

  private spawnFood(): void {
    let attempts = 0;
    while (attempts < 50) {
      const x = 50 + Math.random() * (this.bounds.w - 100);
      const y = 50 + Math.random() * (this.bounds.h - 100);

      let valid = true;
      for (const spike of this.spikes) {
        const dx = spike.x - x;
        const dy = spike.y - y;
        if (Math.sqrt(dx * dx + dy * dy) < 40) {
          valid = false;
          break;
        }
      }

      if (valid) {
        this.foods.push({
          x,
          y,
          radius: this.foodRadius,
          eaten: false
        });
        break;
      }
      attempts++;
    }
  }

  private spawnSpike(): void {
    let attempts = 0;
    while (attempts < 50) {
      const x = 80 + Math.random() * (this.bounds.w - 160);
      const y = 80 + Math.random() * (this.bounds.h - 160);

      let valid = true;
      for (const spike of this.spikes) {
        const dx = spike.x - x;
        const dy = spike.y - y;
        if (Math.sqrt(dx * dx + dy * dy) < 100) {
          valid = false;
          break;
        }
      }

      if (valid) {
        this.spikes.push({
          x,
          y,
          size: this.spikeSize
        });
        break;
      }
      attempts++;
    }
  }

  public update(dt: number): void {
    this.generationTime += dt;
    this.foodSpawnTimer += dt;

    if (this.foodSpawnTimer >= this.foodSpawnInterval) {
      this.foodSpawnTimer = 0;
      for (let i = 0; i < 5; i++) {
        if (this.foods.filter(f => !f.eaten).length < 50) {
          this.spawnFood();
        }
      }
    }

    this.updateBlobTargets();

    const steps = 1;

    for (let i = 0; i < steps; i++) {
      for (const blob of this.blobs) {
        if (blob.alive) {
          blob.update(dt, this.bounds);
        }
      }
    }

    this.checkCollisions();

    if (this.generationTime >= this.generationDuration || this.blobs.every(b => !b.alive)) {
      this.evolve();
    }
  }

  private updateBlobTargets(): void {
    for (const blob of this.blobs) {
      if (!blob.alive) continue;

      let nearestFood: Food | null = null;
      let nearestFoodDist = Infinity;
      let nearestSpike: Spike | null = null;
      let nearestSpikeDist = Infinity;

      for (const food of this.foods) {
        if (food.eaten) continue;
        const dx = food.x - blob.centerX;
        const dy = food.y - blob.centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < nearestFoodDist) {
          nearestFoodDist = dist;
          nearestFood = food;
        }
      }

      for (const spike of this.spikes) {
        const dx = spike.x - blob.centerX;
        const dy = spike.y - blob.centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < nearestSpikeDist) {
          nearestSpikeDist = dist;
          nearestSpike = spike;
        }
      }

      if (nearestSpike && nearestSpikeDist < 100 * blob.genome.sensitivity) {
        const dx = blob.centerX - nearestSpike.x;
        const dy = blob.centerY - nearestSpike.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const escapeX = blob.centerX + (dx / dist) * 200;
        const escapeY = blob.centerY + (dy / dist) * 200;
        blob.setTarget(escapeX, escapeY);
      } else if (nearestFood) {
        blob.setTarget(nearestFood.x, nearestFood.y);
      } else {
        if (Math.random() < 0.01) {
          blob.setTarget(
            100 + Math.random() * (this.bounds.w - 200),
            100 + Math.random() * (this.bounds.h - 200)
          );
        }
      }
    }
  }

  private checkCollisions(): void {
    for (const blob of this.blobs) {
      if (!blob.alive) continue;

      for (const food of this.foods) {
        if (food.eaten) continue;

        const blobRadius = blob.getBoundingRadius();
        const dx = food.x - blob.centerX;
        const dy = food.y - blob.centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < blobRadius + food.radius) {
          let particleHit = false;
          for (const p of blob.particles) {
            const pdx = food.x - p.x;
            const pdy = food.y - p.y;
            if (Math.sqrt(pdx * pdx + pdy * pdy) < p.radius + food.radius + 5) {
              particleHit = true;
              break;
            }
          }
          if (particleHit || dist < blobRadius * 0.8) {
            food.eaten = true;
            blob.eatFood();
          }
        }
      }

      for (const spike of this.spikes) {
        const spikeRadius = spike.size * 0.6;
        for (const p of blob.particles) {
          const dx = spike.x - p.x;
          const dy = spike.y - p.y;
          if (Math.sqrt(dx * dx + dy * dy) < p.radius + spikeRadius) {
            blob.takeDamage();
            const pushX = (p.x - spike.x);
            const pushY = (p.y - spike.y);
            const pushDist = Math.sqrt(pushX * pushX + pushY * pushY) || 1;
            p.vx += (pushX / pushDist) * 3;
            p.vy += (pushY / pushDist) * 3;
            break;
          }
        }
      }
    }

    this.foods = this.foods.filter(f => !f.eaten);
  }

  private evolve(): void {
    for (const blob of this.blobs) {
      blob.calculateFitness();
    }

    const aliveBlobs = this.blobs.filter(b => b.alive);
    const avgFitness = this.blobs.reduce((sum, b) => sum + b.fitness, 0) / this.blobs.length;
    const bestFitness = Math.max(...this.blobs.map(b => b.fitness));

    this.stats.push({
      generation: this.generation,
      avgFitness,
      bestFitness,
      foodSpawnInterval: this.foodSpawnInterval
    });

    const sortedBlobs = [...this.blobs].sort((a, b) => b.fitness - a.fitness);
    const survivors = sortedBlobs.slice(0, Math.ceil(sortedBlobs.length / 2));

    const newGenomes: Genome[] = [];

    while (newGenomes.length < this.initialBlobCount) {
      const parent1 = this.selectParent(survivors);
      const parent2 = this.selectParent(survivors);
      const childGenome = this.crossover(parent1.genome, parent2.genome);
      const mutatedGenome = this.mutate(childGenome);
      newGenomes.push(mutatedGenome);
    }

    const usedGenomes: Genome[] = [];
    if (survivors.length > 0 && survivors[0].fitness > 0) {
      usedGenomes.push({ ...survivors[0].genome });
    }
    usedGenomes.push(...newGenomes.slice(0, this.initialBlobCount - usedGenomes.length));

    this.blobs = [];
    for (let i = 0; i < usedGenomes.length; i++) {
      const x = 100 + Math.random() * (this.bounds.w - 200);
      const y = 100 + Math.random() * (this.bounds.h - 200);
      this.blobs.push(new Blob(x, y, usedGenomes[i], 100 + Math.floor(Math.random() * 100)));
    }

    this.foods = [];
    this.spawnInitialFood();

    this.spikes = [];
    this.spawnInitialSpikes();

    this.generation++;
    this.generationTime = 0;
  }

  private selectParent(pool: Blob[]): Blob {
    if (pool.length === 0) {
      return new Blob(this.bounds.w / 2, this.bounds.h / 2, {
        springLength: 1.2,
        particleDistance: 1.15,
        moveSpeed: 1.2,
        sensitivity: 0.5
      }, 150);
    }

    const totalFitness = pool.reduce((sum, b) => sum + Math.max(1, b.fitness), 0);
    let rand = Math.random() * totalFitness;

    for (const blob of pool) {
      rand -= Math.max(1, blob.fitness);
      if (rand <= 0) {
        return blob;
      }
    }

    return pool[pool.length - 1];
  }

  private crossover(g1: Genome, g2: Genome): Genome {
    return {
      springLength: Math.random() < 0.5 ? g1.springLength : g2.springLength,
      particleDistance: Math.random() < 0.5 ? g1.particleDistance : g2.particleDistance,
      moveSpeed: Math.random() < 0.5 ? g1.moveSpeed : g2.moveSpeed,
      sensitivity: Math.random() < 0.5 ? g1.sensitivity : g2.sensitivity
    };
  }

  private mutate(genome: Genome): Genome {
    const mutateValue = (value: number, min: number, max: number): number => {
      if (Math.random() < this.mutationRate) {
        const change = (Math.random() - 0.5) * 2 * this.mutationStrength * (max - min);
        return Math.max(min, Math.min(max, value + change));
      }
      return value;
    };

    return {
      springLength: mutateValue(genome.springLength, 0.5, 2.0),
      particleDistance: mutateValue(genome.particleDistance, 0.8, 1.5),
      moveSpeed: mutateValue(genome.moveSpeed, 0.5, 2.0),
      sensitivity: mutateValue(genome.sensitivity, 0.1, 1.0)
    };
  }

  public render(ctx: CanvasRenderingContext2D): void {
    for (const food of this.foods) {
      ctx.beginPath();
      ctx.arc(food.x, food.y, food.radius, 0, Math.PI * 2);
      const gradient = ctx.createRadialGradient(
        food.x, food.y, 0,
        food.x, food.y, food.radius * 2
      );
      gradient.addColorStop(0, 'rgba(0, 255, 136, 1)');
      gradient.addColorStop(1, 'rgba(0, 200, 100, 0.5)');
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.shadowColor = '#00FF88';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    for (const spike of this.spikes) {
      ctx.save();
      ctx.translate(spike.x, spike.y);

      ctx.beginPath();
      ctx.moveTo(0, -spike.size);
      ctx.lineTo(spike.size * 0.866, spike.size * 0.5);
      ctx.lineTo(-spike.size * 0.866, spike.size * 0.5);
      ctx.closePath();

      const gradient = ctx.createLinearGradient(0, -spike.size, 0, spike.size);
      gradient.addColorStop(0, '#FF4444');
      gradient.addColorStop(1, '#CC0000');
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.strokeStyle = '#FF6666';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.shadowColor = '#FF0000';
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.restore();
    }

    for (const blob of this.blobs) {
      blob.render(ctx);
    }
  }

  public getAliveCount(): number {
    return this.blobs.filter(b => b.alive).length;
  }

  public getAvgFitness(): number {
    const alive = this.blobs.filter(b => b.alive);
    if (alive.length === 0) return 0;
    return alive.reduce((sum, b) => sum + b.calculateFitness(), 0) / alive.length;
  }

  public getBestFitness(): number {
    if (this.blobs.length === 0) return 0;
    return Math.max(...this.blobs.map(b => b.calculateFitness()));
  }

  public getTimeLeft(): number {
    return Math.max(0, this.generationDuration - this.generationTime);
  }

  public setGenomeParams(params: Partial<Genome>): void {
    for (const blob of this.blobs) {
      if (params.springLength !== undefined) {
        blob.genome.springLength = params.springLength;
      }
      if (params.particleDistance !== undefined) {
        blob.genome.particleDistance = params.particleDistance;
      }
      if (params.moveSpeed !== undefined) {
        blob.genome.moveSpeed = params.moveSpeed;
      }
      if (params.sensitivity !== undefined) {
        blob.genome.sensitivity = params.sensitivity;
      }
    }
  }

  public reset(): void {
    this.blobs = [];
    this.foods = [];
    this.spikes = [];
    this.generation = 1;
    this.generationTime = 0;
    this.stats = [];
    this.foodSpawnTimer = 0;
    this.generateInitialPopulation();
    this.spawnInitialFood();
    this.spawnInitialSpikes();
  }

  public resize(width: number, height: number): void {
    this.bounds = { w: width, h: height };
  }
}
