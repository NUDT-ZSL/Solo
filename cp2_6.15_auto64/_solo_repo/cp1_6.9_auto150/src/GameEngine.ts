import {
  Fragment,
  GravityBall,
  StarZone,
  GravityWave,
  Particle,
  Vector2,
  DragState,
  GAME_CONFIG,
  FragmentType
} from './types';

export interface EngineEvents {
  onAggregation: (pos: Vector2, hue: number) => void;
  onBallDissipate: (pos: Vector2, hue: number) => void;
  onZoneLit: () => void;
  onLevelUp: () => void;
}

export class GameEngine {
  private width: number;
  private height: number;
  private fragments: Fragment[] = [];
  private gravityBalls: GravityBall[] = [];
  private starZones: StarZone[] = [];
  private gravityWaves: GravityWave[] = [];
  private particles: Particle[] = [];
  private stars: Array<{ x: number; y: number; size: number; phase: number; period: number }> = [];
  private nextId = 1;
  private level = 1;
  private lastSpawnTime = 0;
  private lastAutoPulseTime = 0;
  private spawnInterval = GAME_CONFIG.FRAGMENT_SPAWN_INTERVAL;
  private litCount = 0;
  private totalZones = GAME_CONFIG.GRID_COLS * GAME_CONFIG.GRID_ROWS;
  private events: EngineEvents;
  private hoveredFragmentId: number | null = null;

  constructor(width: number, height: number, events: EngineEvents) {
    this.width = width;
    this.height = height;
    this.events = events;
    this.initStarZones();
    this.initBackgroundStars();
    this.spawnFragments(GAME_CONFIG.FRAGMENT_SPAWN_MIN + 5);
  }

  private initStarZones(): void {
    this.starZones = [];
    const zoneW = this.width / GAME_CONFIG.GRID_COLS;
    const zoneH = this.height / GAME_CONFIG.GRID_ROWS;
    for (let gy = 0; gy < GAME_CONFIG.GRID_ROWS; gy++) {
      for (let gx = 0; gx < GAME_CONFIG.GRID_COLS; gx++) {
        this.starZones.push({
          id: gy * GAME_CONFIG.GRID_COLS + gx,
          gridX: gx,
          gridY: gy,
          lit: false,
          litCount: 0,
          shape: null,
          hue: 240
        });
      }
    }
  }

  private initBackgroundStars(): void {
    this.stars = [];
    const starCount = Math.floor((this.width * this.height) / 4000);
    for (let i = 0; i < starCount; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: Math.random() * 1.5 + 0.5,
        phase: Math.random() * Math.PI * 2,
        period: 3000 + Math.random() * 2000
      });
    }
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.initStarZones();
    this.initBackgroundStars();
  }

  getLevel(): number {
    return this.level;
  }

  getLitCount(): number {
    return this.litCount;
  }

  getTotalZones(): number {
    return this.totalZones;
  }

  setHoveredFragment(pos: Vector2 | null): void {
    if (!pos) {
      this.hoveredFragmentId = null;
      for (const f of this.fragments) f.hovered = false;
      return;
    }
    let found: Fragment | null = null;
    for (const f of this.fragments) {
      const dx = pos.x - f.pos.x;
      const dy = pos.y - f.pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < f.radius + 4) {
        found = f;
        break;
      }
    }
    if (found) {
      this.hoveredFragmentId = found.id;
      found.hovered = true;
      for (const f of this.fragments) {
        if (f.id !== found!.id) f.hovered = false;
      }
    } else {
      this.hoveredFragmentId = null;
      for (const f of this.fragments) f.hovered = false;
    }
  }

  releaseGravityBall(startPos: Vector2, endPos: Vector2): void {
    const dx = endPos.x - startPos.x;
    const dy = endPos.y - startPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    let mass = Math.floor(dist / 100) + GAME_CONFIG.GRAVITY_BALL_MIN_MASS;
    mass = Math.max(GAME_CONFIG.GRAVITY_BALL_MIN_MASS, Math.min(GAME_CONFIG.GRAVITY_BALL_MAX_MASS, mass));

    const radius = GAME_CONFIG.GRAVITY_BALL_MIN_RADIUS +
      (mass - GAME_CONFIG.GRAVITY_BALL_MIN_MASS) *
      (GAME_CONFIG.GRAVITY_BALL_MAX_RADIUS - GAME_CONFIG.GRAVITY_BALL_MIN_RADIUS) /
      (GAME_CONFIG.GRAVITY_BALL_MAX_MASS - GAME_CONFIG.GRAVITY_BALL_MIN_MASS);

    const speed = dist > 0 ? 8 : 0;
    const vx = dist > 0 ? (dx / dist) * speed : 0;
    const vy = dist > 0 ? (dy / dist) * speed : 0;

    const ball: GravityBall = {
      id: this.nextId++,
      pos: { x: startPos.x, y: startPos.y },
      vel: { x: vx, y: vy },
      targetPos: { x: endPos.x, y: endPos.y },
      radius,
      mass,
      active: true,
      arrived: dist < 20,
      lifeTime: GAME_CONFIG.GRAVITY_BALL_DURATION,
      maxLifeTime: GAME_CONFIG.GRAVITY_BALL_DURATION
    };

    if (this.gravityBalls.length >= GAME_CONFIG.MAX_GRAVITY_BALLS) {
      const oldest = this.gravityBalls.shift();
      if (oldest) {
        this.spawnParticles(oldest.pos, 120, 0.5);
      }
    }
    this.gravityBalls.push(ball);
  }

  private spawnFragments(count: number): void {
    for (let i = 0; i < count; i++) {
      const type: FragmentType = this.getRandomFragmentType();
      const baseRadius = GAME_CONFIG.FRAGMENT_RADIUS_MIN +
        Math.random() * (GAME_CONFIG.FRAGMENT_RADIUS_MAX - GAME_CONFIG.FRAGMENT_RADIUS_MIN);
      const radius = type === 'dark' ? baseRadius * 1.1 : baseRadius;
      const mass = type === 'dark'
        ? Math.pow(radius, 2) * GAME_CONFIG.DARK_MASS_MULTIPLIER
        : Math.pow(radius, 2);
      const speed = GAME_CONFIG.FRAGMENT_SPEED_MIN +
        Math.random() * (GAME_CONFIG.FRAGMENT_SPEED_MAX - GAME_CONFIG.FRAGMENT_SPEED_MIN);
      const angle = Math.random() * Math.PI * 2;

      let hue: number;
      if (type === 'dark') {
        hue = 0;
      } else {
        hue = GAME_CONFIG.HUE_MIN + Math.random() * (GAME_CONFIG.HUE_MAX - GAME_CONFIG.HUE_MIN);
      }

      this.fragments.push({
        id: this.nextId++,
        pos: {
          x: 30 + Math.random() * (this.width - 60),
          y: 30 + Math.random() * (this.height - 60)
        },
        vel: {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed
        },
        radius,
        hue,
        mass,
        type,
        pulsePhase: Math.random() * Math.PI * 2,
        inGravityZone: false,
        gravityZoneTimer: 0,
        hovered: false,
        assignedZoneId: null
      });
    }
  }

  private getRandomFragmentType(): FragmentType {
    if (this.level < 2) return 'normal';
    const rand = Math.random();
    if (this.level >= 2) {
      if (rand < 0.08) return 'pulse';
      if (rand < 0.16) return 'dark';
    }
    return 'normal';
  }

  update(dt: number, currentTime: number): void {
    const spawnInterval = this.spawnInterval * Math.pow(1 - GAME_CONFIG.LEVEL_SPEED_INCREASE, this.level - 1);
    if (currentTime - this.lastSpawnTime >= spawnInterval) {
      this.lastSpawnTime = currentTime;
      const count = GAME_CONFIG.FRAGMENT_SPAWN_MIN +
        Math.floor(Math.random() * (GAME_CONFIG.FRAGMENT_SPAWN_MAX - GAME_CONFIG.FRAGMENT_SPAWN_MIN + 1));
      this.spawnFragments(count);
    }

    if (this.level >= 5) {
      if (currentTime - this.lastAutoPulseTime >= GAME_CONFIG.AUTO_PULSE_INTERVAL) {
        this.lastAutoPulseTime = currentTime;
        this.triggerAutoPulses();
      }
    }

    this.updatePulseFragments(dt);
    this.updateGravityBalls(dt, currentTime);
    this.updateFragments(dt);
    this.mergeFragmentsIfNeeded();
    this.checkAggregations(currentTime);
    this.updateGravityWaves(dt);
    this.updateParticles(dt);
    this.checkLevelUp();
  }

  private triggerAutoPulses(): void {
    const pulseFragments = this.fragments.filter(f => f.type === 'pulse');
    const count = Math.min(pulseFragments.length, 1 + Math.floor(Math.random() * 2));
    const shuffled = pulseFragments.sort(() => Math.random() - 0.5);
    for (let i = 0; i < count && i < shuffled.length; i++) {
      const pf = shuffled[i];
      for (const other of this.fragments) {
        if (other.id === pf.id) continue;
        const dx = other.pos.x - pf.pos.x;
        const dy = other.pos.y - pf.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 200 && dist > 5) {
          const force = 2 / (dist * 0.01);
          other.vel.x -= (dx / dist) * force;
          other.vel.y -= (dy / dist) * force;
        }
      }
    }
  }

  private updatePulseFragments(dt: number): void {
    for (const f of this.fragments) {
      if (f.type === 'pulse') {
        f.pulsePhase += dt / 1500 * Math.PI * 2;
        const pulseStrength = Math.sin(f.pulsePhase);
        if (pulseStrength > 0.3) {
          for (const other of this.fragments) {
            if (other.id === f.id) continue;
            const dx = other.pos.x - f.pos.x;
            const dy = other.pos.y - f.pos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 150 && dist > 5) {
              const force = (pulseStrength - 0.3) * 0.02;
              other.vel.x -= (dx / dist) * force;
              other.vel.y -= (dy / dist) * force;
            }
          }
        }
      }
    }
  }

  private updateGravityBalls(dt: number, currentTime: number): void {
    for (let i = this.gravityBalls.length - 1; i >= 0; i--) {
      const ball = this.gravityBalls[i];
      if (!ball.arrived) {
        ball.pos.x += ball.vel.x;
        ball.pos.y += ball.vel.y;
        const dx = ball.targetPos.x - ball.pos.x;
        const dy = ball.targetPos.y - ball.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 10) {
          ball.arrived = true;
          ball.vel.x = 0;
          ball.vel.y = 0;
        }
      } else {
        ball.lifeTime -= dt;
        if (ball.lifeTime <= 0) {
          this.spawnParticles(ball.pos, GAME_CONFIG.PARTICLE_COUNT, GAME_CONFIG.PARTICLE_DURATION / 1000);
          this.events.onBallDissipate(ball.pos, 0);
          this.gravityBalls.splice(i, 1);
        }
      }
    }
  }

  private updateFragments(dt: number): void {
    let physicsCalcs = 0;

    for (const f of this.fragments) {
      let ax = 0, ay = 0;

      for (const ball of this.gravityBalls) {
        if (!ball.arrived) continue;
        if (physicsCalcs >= GAME_CONFIG.MAX_PHYSICS_CALCS) break;

        const dx = ball.pos.x - f.pos.x;
        const dy = ball.pos.y - f.pos.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);

        const effectRadius = GAME_CONFIG.GRAVITY_BALL_MIN_RADIUS_EFFECT +
          (ball.mass - GAME_CONFIG.GRAVITY_BALL_MIN_MASS) *
          (GAME_CONFIG.GRAVITY_BALL_MAX_RADIUS_EFFECT - GAME_CONFIG.GRAVITY_BALL_MIN_RADIUS_EFFECT) /
          (GAME_CONFIG.GRAVITY_BALL_MAX_MASS - GAME_CONFIG.GRAVITY_BALL_MIN_MASS);

        if (dist < effectRadius && dist > 2) {
          const sign = f.type === 'dark' ? -1 : 1;
          const G = 50 * ball.mass;
          const force = sign * G / Math.max(distSq, 100);
          ax += (dx / dist) * force;
          ay += (dy / dist) * force;
          physicsCalcs++;
        }
      }

      if (f.type === 'dark') {
        for (const other of this.fragments) {
          if (other.id === f.id) continue;
          if (physicsCalcs >= GAME_CONFIG.MAX_PHYSICS_CALCS) break;
          const dx = f.pos.x - other.pos.x;
          const dy = f.pos.y - other.pos.y;
          const distSq = dx * dx + dy * dy;
          const dist = Math.sqrt(distSq);
          if (dist < 80 && dist > 2) {
            const force = 20 / Math.max(distSq, 50);
            ax -= (dx / dist) * force;
            ay -= (dy / dist) * force;
            physicsCalcs++;
          }
        }
      }

      f.vel.x += ax * (dt / 16);
      f.vel.y += ay * (dt / 16);

      const maxSpeed = 8;
      const speed = Math.sqrt(f.vel.x * f.vel.x + f.vel.y * f.vel.y);
      if (speed > maxSpeed) {
        f.vel.x = (f.vel.x / speed) * maxSpeed;
        f.vel.y = (f.vel.y / speed) * maxSpeed;
      }

      f.pos.x += f.vel.x * (dt / 16);
      f.pos.y += f.vel.y * (dt / 16);

      const margin = f.radius;
      if (f.pos.x < margin) {
        f.pos.x = margin;
        f.vel.x *= -0.8;
      }
      if (f.pos.x > this.width - margin) {
        f.pos.x = this.width - margin;
        f.vel.x *= -0.8;
      }
      if (f.pos.y < margin) {
        f.pos.y = margin;
        f.vel.y *= -0.8;
      }
      if (f.pos.y > this.height - margin) {
        f.pos.y = this.height - margin;
        f.vel.y *= -0.8;
      }

      this.updateGravityZoneStatus(f, dt);
    }
  }

  private updateGravityZoneStatus(f: Fragment, dt: number): void {
    let inAnyZone = false;
    for (const ball of this.gravityBalls) {
      if (!ball.arrived) continue;
      const dx = ball.pos.x - f.pos.x;
      const dy = ball.pos.y - f.pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < GAME_CONFIG.AGGREGATION_RADIUS) {
        inAnyZone = true;
        break;
      }
    }
    if (inAnyZone) {
      f.inGravityZone = true;
      f.gravityZoneTimer += dt;
    } else {
      f.inGravityZone = false;
      f.gravityZoneTimer = 0;
    }
  }

  private mergeFragmentsIfNeeded(): void {
    if (this.fragments.length <= GAME_CONFIG.FRAGMENT_MERGE_TRIGGER) return;

    const merged = new Set<number>();
    const toRemove = new Set<number>();

    for (let i = 0; i < this.fragments.length; i++) {
      const a = this.fragments[i];
      if (toRemove.has(a.id) || merged.has(a.id)) continue;

      for (let j = i + 1; j < this.fragments.length; j++) {
        const b = this.fragments[j];
        if (toRemove.has(b.id) || merged.has(b.id)) continue;

        const dx = a.pos.x - b.pos.x;
        const dy = a.pos.y - b.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < GAME_CONFIG.FRAGMENT_MERGE_THRESHOLD) {
          const totalMass = a.mass + b.mass;
          a.pos.x = (a.pos.x * a.mass + b.pos.x * b.mass) / totalMass;
          a.pos.y = (a.pos.y * a.mass + b.pos.y * b.mass) / totalMass;
          a.vel.x = (a.vel.x * a.mass + b.vel.x * b.mass) / totalMass;
          a.vel.y = (a.vel.y * a.mass + b.vel.y * b.mass) / totalMass;
          a.radius = (a.radius + b.radius) / 2;
          a.mass = totalMass;
          a.hue = (a.hue * a.mass + b.hue * b.mass) / totalMass;
          toRemove.add(b.id);
          merged.add(a.id);
        }
      }
    }

    if (toRemove.size > 0) {
      this.fragments = this.fragments.filter(f => !toRemove.has(f.id));
    }
  }

  private checkAggregations(currentTime: number): void {
    for (const ball of this.gravityBalls) {
      if (!ball.arrived) continue;

      const nearby = this.fragments.filter(f => {
        if (f.gravityZoneTimer < GAME_CONFIG.AGGREGATION_TIME) return false;
        const dx = ball.pos.x - f.pos.x;
        const dy = ball.pos.y - f.pos.y;
        return Math.sqrt(dx * dx + dy * dy) < GAME_CONFIG.AGGREGATION_RADIUS;
      });

      if (nearby.length >= GAME_CONFIG.AGGREGATION_MIN_COUNT) {
        const groups: Fragment[][] = [];
        const used = new Set<number>();

        for (const start of nearby) {
          if (used.has(start.id)) continue;
          const group: Fragment[] = [start];
          used.add(start.id);

          let changed = true;
          while (changed) {
            changed = false;
            for (const candidate of nearby) {
              if (used.has(candidate.id)) continue;
              for (const member of group) {
                const dx = candidate.pos.x - member.pos.x;
                const dy = candidate.pos.y - member.pos.y;
                if (Math.sqrt(dx * dx + dy * dy) < GAME_CONFIG.AGGREGATION_SPACING) {
                  group.push(candidate);
                  used.add(candidate.id);
                  changed = true;
                  break;
                }
              }
            }
          }

          if (group.length >= GAME_CONFIG.AGGREGATION_MIN_COUNT &&
              group.length <= GAME_CONFIG.AGGREGATION_MAX_COUNT) {
            groups.push(group);
          }
        }

        for (const group of groups) {
          this.performAggregation(group, ball);
        }
      }
    }
  }

  private performAggregation(group: Fragment[], ball: GravityBall): void {
    const cx = group.reduce((s, f) => s + f.pos.x, 0) / group.length;
    const cy = group.reduce((s, f) => s + f.pos.y, 0) / group.length;
    const avgHue = group.reduce((s, f) => s + f.hue, 0) / group.length;

    const shape: 'hexagon' | 'star' = Math.random() < 0.5 ? 'hexagon' : 'star';

    const zoneIdx = this.getZoneAt(cx, cy);
    if (zoneIdx >= 0) {
      const zone = this.starZones[zoneIdx];
      zone.lit = true;
      zone.litCount++;
      zone.shape = shape;
      zone.hue = Math.max(0, 240 - zone.litCount * 30);
      this.litCount = this.starZones.filter(z => z.lit).length;
      this.events.onZoneLit();
    }

    this.gravityWaves.push({
      id: this.nextId++,
      pos: { x: cx, y: cy },
      radius: 0,
      maxRadius: GAME_CONFIG.WAVE_MAX_RADIUS,
      alpha: 0.8,
      hue: 260 + Math.random() * 40,
      life: GAME_CONFIG.WAVE_DURATION,
      maxLife: GAME_CONFIG.WAVE_DURATION
    });

    this.spawnParticles({ x: cx, y: cy }, 15, 0.6);

    const ids = new Set(group.map(f => f.id));
    this.fragments = this.fragments.filter(f => !ids.has(f.id));

    this.events.onAggregation({ x: cx, y: cy }, avgHue);
  }

  private getZoneAt(x: number, y: number): number {
    const zoneW = this.width / GAME_CONFIG.GRID_COLS;
    const zoneH = this.height / GAME_CONFIG.GRID_ROWS;
    const gx = Math.floor(x / zoneW);
    const gy = Math.floor(y / zoneH);
    if (gx < 0 || gx >= GAME_CONFIG.GRID_COLS || gy < 0 || gy >= GAME_CONFIG.GRID_ROWS) return -1;
    return gy * GAME_CONFIG.GRID_COLS + gx;
  }

  private spawnParticles(pos: Vector2, count: number, durationSec: number): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      this.particles.push({
        id: this.nextId++,
        pos: { x: pos.x, y: pos.y },
        vel: {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed
        },
        life: durationSec * 1000,
        maxLife: durationSec * 1000,
        radius: 1 + Math.random() * 3,
        hue: Math.random() * 360
      });
    }
  }

  private updateGravityWaves(dt: number): void {
    for (let i = this.gravityWaves.length - 1; i >= 0; i--) {
      const w = this.gravityWaves[i];
      w.life -= dt;
      const t = 1 - w.life / w.maxLife;
      w.radius = w.maxRadius * t;
      w.alpha = 0.8 * (1 - t);
      if (w.life <= 0) {
        this.gravityWaves.splice(i, 1);
      }
    }
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.pos.x += p.vel.x * (dt / 16);
      p.pos.y += p.vel.y * (dt / 16);
      p.vel.x *= 0.96;
      p.vel.y *= 0.96;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private checkLevelUp(): void {
    const litForLevel = (this.level - 1) * GAME_CONFIG.ZONES_PER_LEVEL;
    const target = litForLevel + GAME_CONFIG.ZONES_PER_LEVEL;
    if (this.litCount >= target) {
      this.level++;
      this.events.onLevelUp();
    }
  }

  reset(): void {
    this.fragments = [];
    this.gravityBalls = [];
    this.gravityWaves = [];
    this.particles = [];
    this.level = 1;
    this.litCount = 0;
    this.lastSpawnTime = 0;
    this.lastAutoPulseTime = 0;
    this.initStarZones();
    this.spawnFragments(GAME_CONFIG.FRAGMENT_SPAWN_MIN + 5);
  }

  nextLevel(): void {
    this.fragments = [];
    this.gravityBalls = [];
    this.gravityWaves = [];
    this.particles = [];
    this.lastSpawnTime = 0;
    this.lastAutoPulseTime = 0;
    this.level++;
    this.spawnFragments(GAME_CONFIG.FRAGMENT_SPAWN_MIN + 5);
  }

  getRenderData(dragState: DragState) {
    return {
      fragments: this.fragments,
      gravityBalls: this.gravityBalls,
      starZones: this.starZones,
      gravityWaves: this.gravityWaves,
      particles: this.particles,
      stars: this.stars,
      dragState,
      level: this.level,
      litCount: this.litCount,
      totalZones: this.totalZones,
      canvasWidth: this.width,
      canvasHeight: this.height
    };
  }
}
