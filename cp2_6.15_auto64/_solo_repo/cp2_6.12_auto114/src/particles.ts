import { EmotionType } from './plant';

export type ParticleType = 'butterfly' | 'raindrop' | 'fire' | 'glow';

export interface Particle {
  type: ParticleType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  lifespan: number;
  alive: boolean;
  size: number;
  rotation: number;
  opacity: number;
  custom: any;
}

interface ParticlePool {
  pool: Particle[];
  pointer: number;
}

const POOL_SIZE = 200;

function createEmptyParticle(): Particle {
  return {
    type: 'butterfly',
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    age: 0,
    lifespan: 0,
    alive: false,
    size: 0,
    rotation: 0,
    opacity: 1,
    custom: {},
  };
}

class ParticleObjectPool {
  private pools: Record<ParticleType, ParticlePool> = {
    butterfly: this.createPool(),
    raindrop: this.createPool(),
    fire: this.createPool(),
    glow: this.createPool(),
  };

  private createPool(): ParticlePool {
    const pool: Particle[] = [];
    for (let i = 0; i < POOL_SIZE; i++) {
      pool.push(createEmptyParticle());
    }
    return { pool, pointer: 0 };
  }

  acquire(type: ParticleType): Particle {
    const p = this.pools[type];
    for (let i = 0; i < POOL_SIZE; i++) {
      const idx = (p.pointer + i) % POOL_SIZE;
      if (!p.pool[idx].alive) {
        p.pointer = (idx + 1) % POOL_SIZE;
        const particle = p.pool[idx];
        particle.type = type;
        particle.age = 0;
        particle.alive = true;
        particle.opacity = 1;
        particle.custom = {};
        return particle;
      }
    }
    const idx = p.pointer;
    p.pointer = (p.pointer + 1) % POOL_SIZE;
    const particle = p.pool[idx];
    particle.type = type;
    particle.age = 0;
    particle.alive = true;
    particle.opacity = 1;
    particle.custom = {};
    return particle;
  }

  release(p: Particle) {
    p.alive = false;
  }

  getAllParticles(): Particle[] {
    const result: Particle[] = [];
    for (const key of Object.keys(this.pools) as ParticleType[]) {
      for (const p of this.pools[key].pool) {
        if (p.alive) result.push(p);
      }
    }
    return result;
  }
}

export class ParticleSystem {
  private pool = new ParticleObjectPool();
  private particles: Particle[] = [];

  private butterflySpawnTimer = 0;
  private fireSpawnTimer = 0;
  private glowSpawnTimer = 0;
  private raindropAccumulator = 0;

  private canvasWidth = 800;
  private canvasHeight = 600;
  private gardenBounds = { x: 0, y: 80, width: 800, height: 440 };

  setCanvasSize(w: number, h: number) {
    this.canvasWidth = w;
    this.canvasHeight = h;
    this.gardenBounds = { x: 0, y: h * 0.1, width: w, height: h * 0.72 };
  }

  update(
    deltaTime: number,
    currentEmotion: EmotionType,
    emotionValues: Record<EmotionType, number>
  ) {
    this.spawnParticles(deltaTime, currentEmotion, emotionValues);

    const active = this.pool.getAllParticles();
    for (const p of active) {
      p.age += deltaTime;
      if (p.age >= p.lifespan) {
        p.alive = false;
        continue;
      }

      this.updateParticle(p, deltaTime, emotionValues);
    }

    this.particles = this.pool.getAllParticles();
  }

  private spawnParticles(
    deltaTime: number,
    currentEmotion: EmotionType,
    emotionValues: Record<EmotionType, number>
  ) {
    const happyVal = emotionValues.happy / 100;
    const sadVal = emotionValues.sad / 100;
    const angryVal = emotionValues.angry / 100;
    const calmVal = emotionValues.calm / 100;

    if (happyVal > 0.05) {
      this.butterflySpawnTimer += deltaTime;
      const minInterval = 3000;
      const maxInterval = 5000;
      const interval = maxInterval - (maxInterval - minInterval) * happyVal;
      if (this.butterflySpawnTimer >= interval) {
        this.butterflySpawnTimer = 0;
        this.spawnButterfly(happyVal);
      }
    } else {
      this.butterflySpawnTimer = 0;
    }

    if (sadVal > 0.05) {
      this.raindropAccumulator += deltaTime;
      const spawnRate = 0.02 + 0.08 * sadVal;
      const spawnCount = Math.floor(this.raindropAccumulator * spawnRate);
      this.raindropAccumulator -= spawnCount / spawnRate;
      for (let i = 0; i < spawnCount; i++) {
        this.spawnRaindrop(sadVal);
      }
    } else {
      this.raindropAccumulator = 0;
    }

    if (angryVal > 0.05) {
      this.fireSpawnTimer += deltaTime;
      const minInterval = 800;
      const maxInterval = 1200;
      const interval = maxInterval - (maxInterval - minInterval) * angryVal;
      if (this.fireSpawnTimer >= interval) {
        this.fireSpawnTimer = 0;
        this.spawnFire(angryVal);
      }
    } else {
      this.fireSpawnTimer = 0;
    }

    if (calmVal > 0.05) {
      this.glowSpawnTimer += deltaTime;
      const interval = 400 - 200 * calmVal;
      if (this.glowSpawnTimer >= interval) {
        this.glowSpawnTimer = 0;
        this.spawnGlow(calmVal);
      }
    } else {
      this.glowSpawnTimer = 0;
    }
  }

  private spawnButterfly(happyVal: number) {
    const b = this.gardenBounds;
    const p = this.pool.acquire('butterfly');
    p.x = Math.random() < 0.5 ? b.x : b.x + b.width;
    p.y = b.y + Math.random() * b.height * 0.7;
    p.vx = p.x < b.x + b.width / 2 ? 1 : -1;
    p.vy = 0;
    p.size = 15;
    p.lifespan = 4000 + 2000 * Math.random();
    p.custom.wingPhase = 0;
    p.custom.happyVal = happyVal;
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    p.custom.bezierPoints = [
      { x: p.x, y: p.y },
      { x: cx + (Math.random() - 0.5) * b.width * 0.6, y: cy + (Math.random() - 0.5) * b.height * 0.4 },
      { x: cx + (Math.random() - 0.5) * b.width * 0.4, y: cy + (Math.random() - 0.5) * b.height * 0.5 },
      { x: p.x < b.x + b.width / 2 ? b.x + b.width : b.x, y: b.y + Math.random() * b.height * 0.6 },
    ];
  }

  private spawnRaindrop(sadVal: number) {
    const b = this.gardenBounds;
    const p = this.pool.acquire('raindrop');
    p.x = b.x + Math.random() * b.width;
    p.y = b.y - 10;
    p.vx = -0.5 + Math.random() * 0.3;
    p.vy = 1 + 0.5 * sadVal;
    p.size = 3 + 2 * Math.random();
    p.lifespan = 10000;
    p.opacity = 0.3 * (0.5 + 0.5 * sadVal);
  }

  private spawnFire(angryVal: number) {
    const b = this.gardenBounds;
    const p = this.pool.acquire('fire');
    p.x = b.x + 50 + Math.random() * (b.width - 100);
    p.y = b.y + b.height - 10;
    p.vx = (Math.random() - 0.5) * 0.5;
    p.vy = -(0.8 + 0.4 * angryVal);
    p.size = 8 + 6 * angryVal;
    p.lifespan = 500;
    p.custom.maxHeight = 20 + 10 * angryVal;
    p.custom.startY = p.y;
  }

  private spawnGlow(calmVal: number) {
    const b = this.gardenBounds;
    const p = this.pool.acquire('glow');
    p.x = b.x + Math.random() * b.width;
    p.y = b.y + b.height - 20 - Math.random() * 50;
    p.vx = (Math.random() - 0.5) * 0.1;
    p.vy = -0.3 * (0.5 + 0.5 * calmVal);
    p.size = 4 + 2 * Math.random();
    p.lifespan = 8000 + 4000 * Math.random();
    p.opacity = 0.5 * (0.6 + 0.4 * calmVal);
    p.custom.phase = Math.random() * Math.PI * 2;
  }

  private updateParticle(p: Particle, deltaTime: number, emotionValues: Record<EmotionType, number>) {
    switch (p.type) {
      case 'butterfly':
        this.updateButterfly(p, deltaTime);
        break;
      case 'raindrop':
        this.updateRaindrop(p, deltaTime);
        break;
      case 'fire':
        this.updateFire(p, deltaTime);
        break;
      case 'glow':
        this.updateGlow(p, deltaTime);
        break;
    }
  }

  private bezierPoint(t: number, p0: number, p1: number, p2: number, p3: number): number {
    const u = 1 - t;
    return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
  }

  private updateButterfly(p: Particle, deltaTime: number) {
    const t = p.age / p.lifespan;
    const pts = p.custom.bezierPoints;
    p.x = this.bezierPoint(t, pts[0].x, pts[1].x, pts[2].x, pts[3].x);
    p.y = this.bezierPoint(t, pts[0].y, pts[1].y, pts[2].y, pts[3].y);

    const happyVal = p.custom.happyVal || 0.5;
    const wingFreq = 4 + 4 * happyVal;
    p.custom.wingPhase += deltaTime * 0.001 * wingFreq * Math.PI * 2;
    p.rotation = Math.sin(t * Math.PI * 4) * 0.2;
  }

  private updateRaindrop(p: Particle, deltaTime: number) {
    p.x += p.vx * deltaTime * 0.1;
    p.y += p.vy * deltaTime * 0.1;

    const b = this.gardenBounds;
    if (p.y > b.y + b.height + 10) {
      p.alive = false;
    }
  }

  private updateFire(p: Particle, deltaTime: number) {
    p.x += p.vx * deltaTime * 0.05;
    p.y += p.vy * deltaTime * 0.05;

    const progress = p.age / p.lifespan;
    p.opacity = Math.sin(progress * Math.PI);
    p.size *= 1 - 0.002 * deltaTime;

    if (p.custom.startY - p.y > p.custom.maxHeight) {
      p.alive = false;
    }
  }

  private updateGlow(p: Particle, deltaTime: number) {
    p.custom.phase += deltaTime * 0.002;
    p.x += (p.vx + Math.sin(p.custom.phase) * 0.05) * deltaTime * 0.05;
    p.y += p.vy * deltaTime * 0.05;

    const progress = p.age / p.lifespan;
    const fadeIn = Math.min(1, progress * 5);
    const fadeOut = Math.min(1, (1 - progress) * 5);
    p.opacity = 0.5 * fadeIn * fadeOut;

    const b = this.gardenBounds;
    if (p.y < b.y - 10) {
      p.alive = false;
    }
  }

  getParticles(): Particle[] {
    return this.particles;
  }

  clear() {
    const all = this.pool.getAllParticles();
    for (const p of all) {
      p.alive = false;
    }
    this.particles = [];
  }
}
