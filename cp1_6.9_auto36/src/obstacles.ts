import {
  LaneIndex,
  Obstacle,
  ObstacleType,
  EnergyBlock,
  EnergyColor,
  ENERGY_COLORS,
  BoostPad,
  CollisionEvent,
  Particle,
  getLaneY,
  TRACK_TOP,
  TRACK_BOTTOM,
  CANVAS_WIDTH,
  LANE_HEIGHT
} from './types';

const OBSTACLE_MIN_INTERVAL = 2;
const OBSTACLE_MAX_INTERVAL = 3;
const ENERGY_MIN_INTERVAL = 1.2;
const ENERGY_MAX_INTERVAL = 2.5;
const BOOST_MIN_INTERVAL = 5;
const BOOST_MAX_INTERVAL = 9;
const BOOST_PAD_WIDTH = 120;
const ENERGY_BLOCK_SIZE = 22;

export class ObstacleManager {
  private obstacles: Obstacle[] = [];
  private energyBlocks: EnergyBlock[] = [];
  private boostPads: BoostPad[] = [];
  private nextObstacleId = 1;
  private nextEnergyId = 1;
  private nextBoostId = 1;
  private obstacleTimer = 1.5;
  private energyTimer = 0.8;
  private boostTimer = 4;

  reset(): void {
    this.obstacles = [];
    this.energyBlocks = [];
    this.boostPads = [];
    this.obstacleTimer = 1.5;
    this.energyTimer = 0.8;
    this.boostTimer = 4;
  }

  getObstacles(): Obstacle[] {
    return this.obstacles.filter(o => !o.destroyed);
  }
  getEnergyBlocks(): EnergyBlock[] {
    return this.energyBlocks.filter(e => !e.collected);
  }
  getBoostPads(): BoostPad[] {
    return this.boostPads;
  }

  destroyObstacle(id: number): Particle[] {
    const idx = this.obstacles.findIndex(o => o.id === id);
    if (idx === -1 || this.obstacles[idx].destroyed) return [];
    this.obstacles[idx].destroyed = true;
    const ob = this.obstacles[idx];
    return this.createExplosionParticles(ob);
  }

  private createExplosionParticles(ob: Obstacle): Particle[] {
    const particles: Particle[] = [];
    const cx = ob.x + ob.width / 2;
    const cy = getLaneY(ob.lane);
    const count = 14;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 80 + Math.random() * 160;
      const hue = Math.floor(Math.random() * 360);
      particles.push({
        x: cx + (Math.random() - 0.5) * ob.width,
        y: cy + (Math.random() - 0.5) * ob.height,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 4,
        color: `hsl(${hue}, 100%, 60%)`,
        alpha: 1,
        life: 0.5 + Math.random() * 0.5,
        maxLife: 1,
        type: 'explosion'
      });
    }
    return particles;
  }

  createCollisionDebris(lane: LaneIndex, x: number): Particle[] {
    const particles: Particle[] = [];
    const cy = getLaneY(lane);
    const colors = ['#8B4513', '#A0522D', '#6B3410', '#5D2906', '#7A3A0F'];
    for (let i = 0; i < 10; i++) {
      const angle = Math.PI + (Math.random() - 0.5) * Math.PI;
      const speed = 40 + Math.random() * 80;
      particles.push({
        x,
        y: cy + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        size: 2 + Math.random() * 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        life: 0.4 + Math.random() * 0.4,
        maxLife: 0.8,
        type: 'debris'
      });
    }
    return particles;
  }

  private randRange(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }

  private randomLane(): LaneIndex {
    return Math.floor(Math.random() * 3) as LaneIndex;
  }

  private randomEnergyColor(): EnergyColor {
    return ENERGY_COLORS[Math.floor(Math.random() * ENERGY_COLORS.length)];
  }

  private randomObstacleType(): ObstacleType {
    const r = Math.random();
    if (r < 0.45) return 'block';
    if (r < 0.8) return 'cone';
    return 'fence';
  }

  private spawnObstacle(): void {
    const type = this.randomObstacleType();
    const lane = this.randomLane();
    let width = 32;
    let height = 28;
    if (type === 'cone') { width = 26; height = 32; }
    if (type === 'fence') { width = 50; height = 24; }

    const ob: Obstacle = {
      id: this.nextObstacleId++,
      type,
      x: CANVAS_WIDTH + 20,
      lane,
      width,
      height,
      ...(type === 'fence'
        ? { moveOffset: 0, moveSpeed: 60 + Math.random() * 40 }
        : {})
    };
    this.obstacles.push(ob);
  }

  private spawnEnergyBlock(): void {
    const block: EnergyBlock = {
      id: this.nextEnergyId++,
      color: this.randomEnergyColor(),
      x: CANVAS_WIDTH + 20,
      lane: this.randomLane(),
      collected: false
    };
    this.energyBlocks.push(block);
  }

  private spawnBoostPad(): void {
    const pad: BoostPad = {
      id: this.nextBoostId++,
      x: CANVAS_WIDTH + 20,
      width: BOOST_PAD_WIDTH,
      activated: false
    };
    this.boostPads.push(pad);
  }

  update(
    dt: number,
    worldSpeed: number,
    carX: number,
    carY: number,
    carW: number,
    carH: number
  ): { collisions: CollisionEvent[]; destroyedOffscreen: boolean } {
    const collisions: CollisionEvent[] = [];

    this.obstacleTimer -= dt;
    if (this.obstacleTimer <= 0) {
      this.spawnObstacle();
      this.obstacleTimer = this.randRange(OBSTACLE_MIN_INTERVAL, OBSTACLE_MAX_INTERVAL);
    }
    this.energyTimer -= dt;
    if (this.energyTimer <= 0) {
      this.spawnEnergyBlock();
      this.energyTimer = this.randRange(ENERGY_MIN_INTERVAL, ENERGY_MAX_INTERVAL);
    }
    this.boostTimer -= dt;
    if (this.boostTimer <= 0) {
      this.spawnBoostPad();
      this.boostTimer = this.randRange(BOOST_MIN_INTERVAL, BOOST_MAX_INTERVAL);
    }

    const moveX = worldSpeed * dt;

    for (const ob of this.obstacles) {
      if (ob.destroyed) continue;
      ob.x -= moveX;
      if (ob.type === 'fence' && ob.moveOffset !== undefined && ob.moveSpeed !== undefined) {
        ob.moveOffset += ob.moveSpeed * dt;
      }
      if (!ob.destroyed && this.checkObstacleCollision(ob, carX, carY, carW, carH)) {
        collisions.push({ type: 'obstacle', obstacleId: ob.id });
      }
    }
    const prevLen = this.obstacles.length;
    this.obstacles = this.obstacles.filter(o => !o.destroyed && o.x + o.width > -60);
    const destroyedOffscreen = prevLen !== this.obstacles.length;

    for (const eb of this.energyBlocks) {
      if (eb.collected) continue;
      eb.x -= moveX;
      if (!eb.collected && this.checkEnergyCollision(eb, carX, carY, carW, carH)) {
        eb.collected = true;
        collisions.push({ type: 'energy', energyColor: eb.color });
      }
    }
    this.energyBlocks = this.energyBlocks.filter(e => !e.collected && e.x + ENERGY_BLOCK_SIZE > -20);

    for (const pad of this.boostPads) {
      pad.x -= moveX;
      if (!pad.activated && this.checkBoostCollision(pad, carX, carY, carW, carH)) {
        pad.activated = true;
        collisions.push({ type: 'boost', padId: pad.id });
      }
    }
    this.boostPads = this.boostPads.filter(p => p.x + p.width > -60);

    return { collisions, destroyedOffscreen };
  }

  private checkObstacleCollision(
    ob: Obstacle,
    carX: number, carY: number, carW: number, carH: number
  ): boolean {
    const obY = getLaneY(ob.lane);
    let yOffset = 0;
    if (ob.type === 'fence' && ob.moveOffset !== undefined) {
      yOffset = Math.sin(ob.moveOffset * 0.08) * (LANE_HEIGHT * 0.45);
    }
    const obTop = (obY + yOffset) - ob.height / 2;
    const obBottom = (obY + yOffset) + ob.height / 2;
    const obLeft = ob.x;
    const obRight = ob.x + ob.width;
    const carTop = carY - carH / 2;
    const carBottom = carY + carH / 2;
    const carLeft = carX - carW / 2;
    const carRight = carX + carW / 2;
    return obLeft < carRight && obRight > carLeft && obTop < carBottom && obBottom > carTop;
  }

  private checkEnergyCollision(
    eb: EnergyBlock,
    carX: number, carY: number, carW: number, carH: number
  ): boolean {
    const ebY = getLaneY(eb.lane);
    const s = ENERGY_BLOCK_SIZE;
    const ebTop = ebY - s / 2;
    const ebBottom = ebY + s / 2;
    const ebLeft = eb.x;
    const ebRight = eb.x + s;
    const carTop = carY - carH / 2;
    const carBottom = carY + carH / 2;
    const carLeft = carX - carW / 2;
    const carRight = carX + carW / 2;
    return ebLeft < carRight && ebRight > carLeft && ebTop < carBottom && ebBottom > carTop;
  }

  private checkBoostCollision(
    pad: BoostPad,
    carX: number, carY: number, carW: number, carH: number
  ): boolean {
    const padTop = TRACK_TOP + 4;
    const padBottom = TRACK_BOTTOM - 4;
    const padLeft = pad.x;
    const padRight = pad.x + pad.width;
    const carTop = carY - carH / 2;
    const carBottom = carY + carH / 2;
    const carLeft = carX - carW / 2;
    const carRight = carX + carW / 2;
    return padLeft < carRight && padRight > carLeft && padTop < carBottom && padBottom > carTop;
  }

  checkShockwaveHits(
    sx: number, sy: number, radius: number, hits: Set<number>
  ): { hitIds: number[]; explosionParticles: Particle[] } {
    const hitIds: number[] = [];
    let explosionParticles: Particle[] = [];
    for (const ob of this.obstacles) {
      if (ob.destroyed) continue;
      if (hits.has(ob.id)) continue;
      const cx = ob.x + ob.width / 2;
      const cy = getLaneY(ob.lane);
      const dx = cx - sx;
      const dy = cy - sy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= radius + Math.max(ob.width, ob.height) / 2) {
        hitIds.push(ob.id);
        hits.add(ob.id);
        explosionParticles = explosionParticles.concat(this.destroyObstacle(ob.id));
      }
    }
    return { hitIds, explosionParticles };
  }
}
