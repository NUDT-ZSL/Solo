import {
  Jellyfish, NutrientBall, MatingPair, DisturbanceLine, Vec2, RGB,
  MAX_JELLYFISH, COLLISION_THRESHOLD, MATING_DISTANCE, MATING_REQUIRED_TIME,
  MATING_LINE_DURATION, ADULT_RADIUS, OFFSPRING_SPEED_MULTIPLIER, PARENT_SHRINK_FACTOR,
  MIN_PARENT_RADIUS, SPEED_BOOST_DURATION, SPEED_BOOST_MULTIPLIER, GLOW_BOOST_MULTIPLIER,
  DISTURBANCE_DURATION, DISTURBANCE_WIDTH
} from './types';

function hexToRgb(hex: string): RGB {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpColor(c1: RGB, c2: RGB, t: number): RGB {
  return {
    r: Math.round(lerp(c1.r, c2.r, t)),
    g: Math.round(lerp(c1.g, c2.g, t)),
    b: Math.round(lerp(c1.b, c2.b, t))
  };
}

function mixColor(c1: RGB, c2: RGB, w1 = 0.5, w2 = 0.5): RGB {
  return {
    r: Math.round(c1.r * w1 + c2.r * w2),
    g: Math.round(c1.g * w1 + c2.g * w2),
    b: Math.round(c1.b * w1 + c2.b * w2)
  };
}

function dist(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

let nextJellyfishId = 1;
let nextNutrientId = 1;

export class JellyfishManager {
  jellyfish: Jellyfish[] = [];
  nutrientBalls: NutrientBall[] = [];
  matingPairs: Map<string, MatingPair> = new Map();
  disturbances: DisturbanceLine[] = [];
  deadCount = 0;
  private canvasWidth: number;
  private canvasHeight: number;

  constructor(w: number, h: number) {
    this.canvasWidth = w;
    this.canvasHeight = h;
    this.spawnInitialJellyfish();
  }

  resize(w: number, h: number): void {
    this.canvasWidth = w;
    this.canvasHeight = h;
  }

  private spawnInitialJellyfish(): void {
    const colors = [
      hexToRgb('#FF6B6B'),
      hexToRgb('#4ECDC4'),
      hexToRgb('#9B59B6')
    ];
    for (let i = 0; i < 3; i++) {
      const x = 100 + Math.random() * (this.canvasWidth - 300);
      const y = 100 + Math.random() * (this.canvasHeight - 300);
      this.jellyfish.push(this.createJellyfish(x, y, colors[i % colors.length], 15 + Math.random() * 10));
    }
  }

  private createJellyfish(x: number, y: number, color: RGB, radius: number, vel?: Vec2): Jellyfish {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.3 + Math.random() * 0.4;
    return {
      id: nextJellyfishId++,
      pos: { x, y },
      vel: vel ? { x: vel.x, y: vel.y } : {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed
      },
      radius,
      baseRadius: radius,
      color: { ...color },
      targetColor: { ...color },
      colorBlendProgress: 1,
      glowPhase: Math.random() * Math.PI * 2,
      glowFrequency: 0.5 + Math.random() * 1.0,
      baseGlowFrequency: 0,
      energy: 100,
      maxEnergy: 100,
      age: 0,
      lifespan: 30 + Math.random() * 30,
      isDead: false,
      deathProgress: 0,
      tentaclePhase: Math.random() * Math.PI * 2,
      speedBoostTime: 0,
      colorTransitionTime: 0,
      warningPulsePhase: 0
    };
  }

  spawnNutrient(x: number, y: number, color: RGB): void {
    const offset = 20 + Math.random() * 30;
    const angle = Math.random() * Math.PI * 2;
    this.nutrientBalls.push({
      id: nextNutrientId++,
      pos: {
        x: x + Math.cos(angle) * offset,
        y: y + Math.sin(angle) * offset
      },
      targetPos: { x, y },
      color: { ...color },
      radius: 0,
      pulsePhase: 0,
      spawnProgress: 0,
      absorbed: false
    });
  }

  addDisturbance(points: Vec2[], direction: Vec2): void {
    this.disturbances.push({
      points: points.map(p => ({ x: p.x, y: p.y })),
      startTime: performance.now(),
      duration: DISTURBANCE_DURATION,
      direction
    });
    for (const jf of this.jellyfish) {
      if (jf.isDead) continue;
      for (const p of points) {
        if (dist(p, jf.pos) < DISTURBANCE_WIDTH / 2 + jf.radius) {
          const jfDir = { x: -direction.x, y: -direction.y };
          const deflection = (Math.random() - 0.5) * (Math.PI / 6);
          const currentAngle = Math.atan2(jf.vel.y, jf.vel.x);
          const targetAngle = Math.atan2(jfDir.y, jfDir.x) + deflection;
          const newAngle = lerp(currentAngle, targetAngle, 0.8);
          const speed = Math.sqrt(jf.vel.x ** 2 + jf.vel.y ** 2) * 1.2;
          jf.vel.x = Math.cos(newAngle) * speed;
          jf.vel.y = Math.sin(newAngle) * speed;
          jf.speedBoostTime = SPEED_BOOST_DURATION;
          jf.baseGlowFrequency = jf.glowFrequency;
          jf.glowFrequency = jf.baseGlowFrequency * GLOW_BOOST_MULTIPLIER;
          break;
        }
      }
    }
  }

  update(dt: number): void {
    this.updateJellyfish(dt);
    this.updateNutrientBalls(dt);
    this.updateMating(dt);
    this.updateDisturbances();
    this.enforcePopulationLimit();
  }

  private updateJellyfish(dt: number): void {
    for (let i = this.jellyfish.length - 1; i >= 0; i--) {
      const jf = this.jellyfish[i];
      jf.age += dt;

      if (jf.isDead) {
        jf.deathProgress += dt;
        jf.radius = Math.max(0, jf.baseRadius - 5 * jf.deathProgress);
        if (jf.radius <= 0 && jf.deathProgress > 1) {
          this.jellyfish.splice(i, 1);
          this.deadCount++;
        }
        continue;
      }

      if (jf.speedBoostTime > 0) {
        jf.speedBoostTime -= dt;
        if (jf.speedBoostTime <= 0) {
          jf.glowFrequency = jf.baseGlowFrequency || jf.glowFrequency;
        }
      }

      let speedMult = 1;
      if (jf.speedBoostTime > 0) speedMult = SPEED_BOOST_MULTIPLIER;

      jf.pos.x += jf.vel.x * speedMult * dt * 60;
      jf.pos.y += jf.vel.y * speedMult * dt * 60;

      const margin = 20;
      if (jf.pos.x < jf.radius + margin) { jf.pos.x = jf.radius + margin; jf.vel.x = Math.abs(jf.vel.x); }
      if (jf.pos.x > this.canvasWidth - jf.radius - margin) { jf.pos.x = this.canvasWidth - jf.radius - margin; jf.vel.x = -Math.abs(jf.vel.x); }
      if (jf.pos.y < jf.radius + margin) { jf.pos.y = jf.radius + margin; jf.vel.y = Math.abs(jf.vel.y); }
      if (jf.pos.y > this.canvasHeight - jf.radius - 100) { jf.pos.y = this.canvasHeight - jf.radius - 100; jf.vel.y = -Math.abs(jf.vel.y); }

      if (Math.random() < 0.01) {
        const angle = Math.atan2(jf.vel.y, jf.vel.x) + (Math.random() - 0.5) * 0.5;
        const speed = 0.3 + Math.random() * 0.4;
        jf.vel.x = Math.cos(angle) * speed;
        jf.vel.y = Math.sin(angle) * speed;
      }

      jf.glowPhase += jf.glowFrequency * dt * Math.PI * 2;
      jf.tentaclePhase += dt * 2;

      jf.energy -= (jf.radius / 10) * dt;
      if (jf.energy <= 0) {
        jf.energy = 0;
        jf.isDead = true;
        jf.baseRadius = jf.radius;
        jf.deathProgress = 0;
      }
      jf.warningPulsePhase += dt * 10;

      if (jf.colorTransitionTime > 0) {
        jf.colorTransitionTime -= dt;
        jf.colorBlendProgress = Math.min(1, jf.colorBlendProgress + 0.05);
        jf.color = lerpColor(jf.color, jf.targetColor, 0.05);
      }

      if (jf.age >= jf.lifespan) {
        jf.energy = Math.max(0, jf.energy - 10 * dt);
      }
    }
  }

  private updateNutrientBalls(dt: number): void {
    for (let i = this.nutrientBalls.length - 1; i >= 0; i--) {
      const ball = this.nutrientBalls[i];

      if (ball.spawnProgress < 1) {
        ball.spawnProgress = Math.min(1, ball.spawnProgress + dt * 2);
        ball.radius = 8 * ball.spawnProgress;
        ball.pos.x = lerp(ball.pos.x, ball.targetPos.x, 0.1);
        ball.pos.y = lerp(ball.pos.y, ball.targetPos.y, 0.1);
      } else {
        ball.radius = 8 + Math.sin(ball.pulsePhase) * 2;
        ball.pulsePhase += dt * Math.PI * 2;
      }

      for (const jf of this.jellyfish) {
        if (jf.isDead) continue;
        const d = dist(ball.pos, jf.pos);
        if (d < jf.radius + ball.radius + COLLISION_THRESHOLD) {
          const grow = 3 + Math.random() * 2;
          jf.radius += grow;
          jf.targetColor = { ...ball.color };
          jf.colorBlendProgress = 0;
          jf.colorTransitionTime = 5;
          jf.energy = Math.min(jf.maxEnergy, jf.energy + 15);
          ball.absorbed = true;
          break;
        }
      }

      if (ball.absorbed) {
        this.nutrientBalls.splice(i, 1);
      }
    }
  }

  private updateMating(dt: number): void {
    const activePairs = new Set<string>();
    for (let i = 0; i < this.jellyfish.length; i++) {
      for (let j = i + 1; j < this.jellyfish.length; j++) {
        const a = this.jellyfish[i];
        const b = this.jellyfish[j];
        if (a.isDead || b.isDead) continue;
        if (a.radius < ADULT_RADIUS || b.radius < ADULT_RADIUS) continue;

        const pairKey = a.id < b.id ? `${a.id}-${b.id}` : `${b.id}-${a.id}`;
        const d = dist(a.pos, b.pos);

        if (d < MATING_DISTANCE) {
          activePairs.add(pairKey);
          let pair = this.matingPairs.get(pairKey);
          if (!pair) {
            pair = { id1: a.id, id2: b.id, proximityTime: 0, lineActive: false, lineTime: 0, offspringCreated: false };
            this.matingPairs.set(pairKey, pair);
          }

          if (!pair.offspringCreated) {
            pair.proximityTime += dt;
            if (pair.proximityTime >= MATING_REQUIRED_TIME && !pair.lineActive) {
              pair.lineActive = true;
              pair.lineTime = 0;
            }
            if (pair.lineActive) {
              pair.lineTime += dt;
              if (pair.lineTime >= MATING_LINE_DURATION) {
                this.createOffspring(a, b);
                pair.offspringCreated = true;
                pair.lineActive = false;
              }
            }
          }
        }
      }
    }

    for (const [key, pair] of this.matingPairs) {
      if (!activePairs.has(key)) {
        pair.proximityTime = Math.max(0, pair.proximityTime - dt * 0.5);
        if (pair.proximityTime === 0 && pair.offspringCreated) {
          this.matingPairs.delete(key);
        }
      }
    }
  }

  private createOffspring(parent1: Jellyfish, parent2: Jellyfish): void {
    const midX = (parent1.pos.x + parent2.pos.x) / 2;
    const midY = (parent1.pos.y + parent2.pos.y) / 2;
    const avgRadius = (parent1.radius + parent2.radius) / 2;
    const offspringRadius = avgRadius * 0.6;
    const offspringColor = mixColor(parent1.color, parent2.color);
    const offspringFreq = (parent1.glowFrequency + parent2.glowFrequency) / 2;

    const angle = Math.random() * Math.PI * 2;
    const baseSpeed = 0.3 + Math.random() * 0.4;
    const vel: Vec2 = {
      x: Math.cos(angle) * baseSpeed * OFFSPRING_SPEED_MULTIPLIER,
      y: Math.sin(angle) * baseSpeed * OFFSPRING_SPEED_MULTIPLIER
    };

    const offspring = this.createJellyfish(midX, midY, offspringColor, offspringRadius, vel);
    offspring.glowFrequency = offspringFreq;
    this.jellyfish.push(offspring);

    parent1.radius = Math.max(MIN_PARENT_RADIUS, parent1.radius * PARENT_SHRINK_FACTOR);
    parent2.radius = Math.max(MIN_PARENT_RADIUS, parent2.radius * PARENT_SHRINK_FACTOR);
  }

  private updateDisturbances(): void {
    const now = performance.now();
    this.disturbances = this.disturbances.filter(d => {
      return (now - d.startTime) / 1000 < d.duration;
    });
  }

  private enforcePopulationLimit(): void {
    while (this.jellyfish.filter(j => !j.isDead).length > MAX_JELLYFISH) {
      const alive = this.jellyfish.filter(j => !j.isDead);
      alive.sort((a, b) => a.energy - b.energy);
      const weakest = alive[0];
      weakest.energy = 0;
      weakest.isDead = true;
      weakest.baseRadius = weakest.radius;
      weakest.deathProgress = 0;
    }
  }

  getStats() {
    const alive = this.jellyfish.filter(j => !j.isDead);
    const total = alive.length;
    const avgRadius = total > 0 ? alive.reduce((s, j) => s + j.radius, 0) / total : 0;
    const maxFreq = total > 0 ? Math.max(...alive.map(j => j.glowFrequency)) : 0;
    return { total, avgRadius, maxFreq, deadCount: this.deadCount };
  }
}
