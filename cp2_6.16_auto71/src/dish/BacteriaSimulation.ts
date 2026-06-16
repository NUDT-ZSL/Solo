export type BacteriaType = 'red' | 'blue';
export type InterventionType = 'antibiotic' | 'nutrient';

export interface Bacteria {
  id: number;
  type: BacteriaType;
  x: number;
  y: number;
  radius: number;
  speed: number;
  baseSpeed: number;
  angle: number;
  hp: number;
  maxHp: number;
  directionTimer: number;
  speedBoostTimer: number;
  active: boolean;
}

export interface NutrientParticle {
  id: number;
  x: number;
  y: number;
  radius: number;
  life: number;
  maxLife: number;
  active: boolean;
}

export interface Intervention {
  id: number;
  type: InterventionType;
  x: number;
  y: number;
  radius: number;
  life: number;
  maxLife: number;
  active: boolean;
}

export interface SimulationStats {
  redCount: number;
  blueCount: number;
  nutrientCount: number;
  elapsedSeconds: number;
  winner: BacteriaType | null;
}

const DISH_RADIUS = 300;
const DISH_CENTER = 300;
const DISH_DIAMETER = DISH_RADIUS * 2;

const RED_MIN_RADIUS = 4;
const RED_MAX_RADIUS = 6;
const BLUE_MIN_RADIUS = 3;
const BLUE_MAX_RADIUS = 5;

const MIN_SPEED = 0.3;
const MAX_SPEED = 0.8;

const MIN_HP = 100;
const MAX_HP = 150;

const DIRECTION_CHANGE_FRAMES = 30;
const MAX_DIRECTION_CHANGE = (Math.PI / 180) * 30;

const COLLISION_DISTANCE = 15;
const COLLISION_DISTANCE_SQ = COLLISION_DISTANCE * COLLISION_DISTANCE;
const MIN_DAMAGE_PER_SECOND = 5;
const MAX_DAMAGE_PER_SECOND = 8;

const ANTIBIOTIC_DAMAGE_PER_SECOND = 12;
const NUTRIENT_HEAL_PER_SECOND = 8;
const NUTRIENT_SPEED_MULTIPLIER = 1.5;

const NUTRIENT_PARTICLE_LIFE = 20;
const ANTIBIOTIC_LIFE = 15;
const NUTRIENT_LIFE = 10;

const SPATIAL_GRID_SIZE = 30;
const SPATIAL_GRID_COLS = Math.ceil(DISH_DIAMETER / SPATIAL_GRID_SIZE);
const SPATIAL_GRID_ROWS = Math.ceil(DISH_DIAMETER / SPATIAL_GRID_SIZE);

let nextId = 1;
const getId = () => nextId++;

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomPointInDish(): { x: number; y: number } {
  const angle = Math.random() * Math.PI * 2;
  const r = Math.sqrt(Math.random()) * (DISH_RADIUS - 10);
  return {
    x: DISH_CENTER + Math.cos(angle) * r,
    y: DISH_CENTER + Math.sin(angle) * r,
  };
}

function clampToDish(x: number, y: number): { x: number; y: number } {
  const dx = x - DISH_CENTER;
  const dy = y - DISH_CENTER;
  const distSq = dx * dx + dy * dy;
  const maxDist = DISH_RADIUS - 6;
  if (distSq <= maxDist * maxDist) return { x, y };
  const dist = Math.sqrt(distSq);
  const ratio = maxDist / dist;
  return {
    x: DISH_CENTER + dx * ratio,
    y: DISH_CENTER + dy * ratio,
  };
}

export class BacteriaSimulation {
  private bacteria: Bacteria[] = [];
  private nutrients: NutrientParticle[] = [];
  private interventions: Intervention[] = [];
  private bacteriaPool: Bacteria[] = [];
  private nutrientPool: NutrientParticle[] = [];
  private interventionPool: Intervention[] = [];
  private spatialGrid: Bacteria[][] = [];
  private frameCount = 0;
  private elapsedSeconds = 0;
  private winner: BacteriaType | null = null;
  private onStatsChange?: (stats: SimulationStats) => void;
  private redCountCache = 0;
  private blueCountCache = 0;
  private nutrientCountCache = 0;

  constructor(onStatsChange?: (stats: SimulationStats) => void) {
    this.onStatsChange = onStatsChange;
    this.initSpatialGrid();
    this.reset();
  }

  private initSpatialGrid(): void {
    this.spatialGrid = [];
    for (let i = 0; i < SPATIAL_GRID_COLS * SPATIAL_GRID_ROWS; i++) {
      this.spatialGrid.push([]);
    }
  }

  private clearSpatialGrid(): void {
    for (let i = 0; i < this.spatialGrid.length; i++) {
      this.spatialGrid[i].length = 0;
    }
  }

  private getGridIndex(x: number, y: number): number {
    const col = Math.floor(x / SPATIAL_GRID_SIZE);
    const row = Math.floor(y / SPATIAL_GRID_SIZE);
    const clampedCol = Math.max(0, Math.min(SPATIAL_GRID_COLS - 1, col));
    const clampedRow = Math.max(0, Math.min(SPATIAL_GRID_ROWS - 1, row));
    return clampedRow * SPATIAL_GRID_COLS + clampedCol;
  }

  reset(): void {
    for (let i = 0; i < this.bacteria.length; i++) {
      this.recycleBacteria(this.bacteria[i]);
    }
    for (let i = 0; i < this.nutrients.length; i++) {
      this.recycleNutrient(this.nutrients[i]);
    }
    for (let i = 0; i < this.interventions.length; i++) {
      this.recycleIntervention(this.interventions[i]);
    }
    this.bacteria.length = 0;
    this.nutrients.length = 0;
    this.interventions.length = 0;
    this.frameCount = 0;
    this.elapsedSeconds = 0;
    this.winner = null;
    this.redCountCache = 0;
    this.blueCountCache = 0;
    this.nutrientCountCache = 0;
    nextId = 1;

    for (let i = 0; i < 20; i++) {
      this.bacteria.push(this.createBacteria('red'));
      this.bacteria.push(this.createBacteria('blue'));
    }

    this.notifyStats();
  }

  private createBacteria(type: BacteriaType): Bacteria {
    const pos = randomPointInDish();
    const radius = type === 'red'
      ? rand(RED_MIN_RADIUS, RED_MAX_RADIUS)
      : rand(BLUE_MIN_RADIUS, BLUE_MAX_RADIUS);
    const speed = rand(MIN_SPEED, MAX_SPEED);
    const hp = rand(MIN_HP, MAX_HP);

    let b: Bacteria;
    if (this.bacteriaPool.length > 0) {
      b = this.bacteriaPool.pop()!;
      b.id = getId();
      b.type = type;
      b.x = pos.x;
      b.y = pos.y;
      b.radius = radius;
      b.speed = speed;
      b.baseSpeed = speed;
      b.angle = Math.random() * Math.PI * 2;
      b.hp = hp;
      b.maxHp = hp;
      b.directionTimer = Math.floor(Math.random() * DIRECTION_CHANGE_FRAMES);
      b.speedBoostTimer = 0;
      b.active = true;
    } else {
      b = {
        id: getId(),
        type,
        x: pos.x,
        y: pos.y,
        radius,
        speed,
        baseSpeed: speed,
        angle: Math.random() * Math.PI * 2,
        hp,
        maxHp: hp,
        directionTimer: Math.floor(Math.random() * DIRECTION_CHANGE_FRAMES),
        speedBoostTimer: 0,
        active: true,
      };
    }
    return b;
  }

  private recycleBacteria(b: Bacteria): void {
    b.active = false;
    if (this.bacteriaPool.length < 1000) {
      this.bacteriaPool.push(b);
    }
  }

  private createNutrient(x: number, y: number): NutrientParticle {
    let n: NutrientParticle;
    if (this.nutrientPool.length > 0) {
      n = this.nutrientPool.pop()!;
      n.id = getId();
      n.x = x;
      n.y = y;
      n.radius = 2;
      n.life = NUTRIENT_PARTICLE_LIFE;
      n.maxLife = NUTRIENT_PARTICLE_LIFE;
      n.active = true;
    } else {
      n = {
        id: getId(),
        x,
        y,
        radius: 2,
        life: NUTRIENT_PARTICLE_LIFE,
        maxLife: NUTRIENT_PARTICLE_LIFE,
        active: true,
      };
    }
    return n;
  }

  private recycleNutrient(n: NutrientParticle): void {
    n.active = false;
    if (this.nutrientPool.length < 500) {
      this.nutrientPool.push(n);
    }
  }

  private createIntervention(type: InterventionType, x: number, y: number): Intervention {
    const radius = type === 'antibiotic' ? 40 : 30;
    const life = type === 'antibiotic' ? ANTIBIOTIC_LIFE : NUTRIENT_LIFE;

    let i: Intervention;
    if (this.interventionPool.length > 0) {
      i = this.interventionPool.pop()!;
      i.id = getId();
      i.type = type;
      i.x = x;
      i.y = y;
      i.radius = radius;
      i.life = life;
      i.maxLife = life;
      i.active = true;
    } else {
      i = {
        id: getId(),
        type,
        x,
        y,
        radius,
        life,
        maxLife: life,
        active: true,
      };
    }
    return i;
  }

  private recycleIntervention(i: Intervention): void {
    i.active = false;
    if (this.interventionPool.length < 50) {
      this.interventionPool.push(i);
    }
  }

  addIntervention(type: InterventionType, x: number, y: number): boolean {
    const dx = x - DISH_CENTER;
    const dy = y - DISH_CENTER;
    if (dx * dx + dy * dy > DISH_RADIUS * DISH_RADIUS) return false;

    this.interventions.push(this.createIntervention(type, x, y));
    return true;
  }

  step(deltaTime: number): void {
    if (this.winner) return;
    if (deltaTime <= 0) return;

    this.frameCount++;
    this.elapsedSeconds += deltaTime;

    for (let i = 0; i < this.interventions.length; i++) {
      const inv = this.interventions[i];
      if (!inv.active) continue;
      inv.life -= deltaTime;
      if (inv.life <= 0) {
        this.recycleIntervention(inv);
      }
    }
    this.compactInterventions();

    this.clearSpatialGrid();

    const bacteriaCount = this.bacteria.length;

    for (let i = 0; i < bacteriaCount; i++) {
      const b = this.bacteria[i];
      if (!b.active) continue;

      let inAntibiotic = false;
      let inNutrient = false;

      for (let j = 0; j < this.interventions.length; j++) {
        const inv = this.interventions[j];
        if (!inv.active) continue;
        const dx = b.x - inv.x;
        const dy = b.y - inv.y;
        const radiusSum = inv.radius + b.radius;
        if (dx * dx + dy * dy <= radiusSum * radiusSum) {
          if (inv.type === 'antibiotic') inAntibiotic = true;
          else if (inv.type === 'nutrient') inNutrient = true;
          if (inAntibiotic && inNutrient) break;
        }
      }

      if (inAntibiotic) {
        b.hp -= ANTIBIOTIC_DAMAGE_PER_SECOND * deltaTime;
      }

      if (inNutrient) {
        b.hp = Math.min(b.maxHp, b.hp + NUTRIENT_HEAL_PER_SECOND * deltaTime);
        b.speed = b.baseSpeed * NUTRIENT_SPEED_MULTIPLIER;
        b.speedBoostTimer = 0.1;
      } else if (b.speedBoostTimer > 0) {
        b.speedBoostTimer -= deltaTime;
        if (b.speedBoostTimer <= 0) {
          b.speed = b.baseSpeed;
        }
      }

      b.directionTimer++;
      if (b.directionTimer >= DIRECTION_CHANGE_FRAMES) {
        b.directionTimer = 0;
        b.angle += rand(-MAX_DIRECTION_CHANGE, MAX_DIRECTION_CHANGE);
      }

      const moveSpeed = b.speed * deltaTime * 60;
      b.x += Math.cos(b.angle) * moveSpeed;
      b.y += Math.sin(b.angle) * moveSpeed;

      const clamped = clampToDish(b.x, b.y);
      if (clamped.x !== b.x || clamped.y !== b.y) {
        const dx = clamped.x - DISH_CENTER;
        const dy = clamped.y - DISH_CENTER;
        const normalAngle = Math.atan2(dy, dx);
        b.angle = normalAngle + Math.PI + rand(-Math.PI / 4, Math.PI / 4);
        b.x = clamped.x;
        b.y = clamped.y;
      }

      const gridIdx = this.getGridIndex(b.x, b.y);
      this.spatialGrid[gridIdx].push(b);
    }

    this.processCollisions();

    let red = 0;
    let blue = 0;
    let deadIdx = bacteriaCount;

    for (let i = 0; i < deadIdx; i++) {
      const b = this.bacteria[i];
      if (!b.active) continue;
      if (b.hp <= 0) {
        b.hp = 0;
        this.nutrients.push(this.createNutrient(b.x, b.y));
        this.recycleBacteria(b);
        deadIdx--;
        if (i < deadIdx) {
          const tmp = this.bacteria[i];
          this.bacteria[i] = this.bacteria[deadIdx];
          this.bacteria[deadIdx] = tmp;
          i--;
        }
      } else {
        if (b.type === 'red') red++;
        else blue++;
      }
    }

    if (deadIdx < bacteriaCount) {
      this.bacteria.length = deadIdx;
    }

    this.redCountCache = red;
    this.blueCountCache = blue;

    const nutrientCount = this.nutrients.length;
    let deadNutrientIdx = nutrientCount;
    for (let i = 0; i < deadNutrientIdx; i++) {
      const n = this.nutrients[i];
      if (!n.active) continue;
      n.life -= deltaTime;
      if (n.life <= 0) {
        this.recycleNutrient(n);
        deadNutrientIdx--;
        if (i < deadNutrientIdx) {
          const tmp = this.nutrients[i];
          this.nutrients[i] = this.nutrients[deadNutrientIdx];
          this.nutrients[deadNutrientIdx] = tmp;
          i--;
        }
      }
    }
    if (deadNutrientIdx < nutrientCount) {
      this.nutrients.length = deadNutrientIdx;
    }
    this.nutrientCountCache = deadNutrientIdx;

    if (!this.winner) {
      if (red === 0 && blue > 0) {
        this.winner = 'blue';
      } else if (blue === 0 && red > 0) {
        this.winner = 'red';
      }
    }

    this.notifyStats();
  }

  private compactInterventions(): void {
    let write = 0;
    for (let read = 0; read < this.interventions.length; read++) {
      if (this.interventions[read].active) {
        if (write !== read) {
          this.interventions[write] = this.interventions[read];
        }
        write++;
      }
    }
    this.interventions.length = write;
  }

  private processCollisions(): void {
    const checked = new Set<number>();

    for (let row = 0; row < SPATIAL_GRID_ROWS; row++) {
      for (let col = 0; col < SPATIAL_GRID_COLS; col++) {
        const cellIdx = row * SPATIAL_GRID_COLS + col;
        const cell = this.spatialGrid[cellIdx];
        if (cell.length === 0) continue;

        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = row + dr;
            const nc = col + dc;
            if (nr < 0 || nr >= SPATIAL_GRID_ROWS || nc < 0 || nc >= SPATIAL_GRID_COLS) continue;
            if (dr < 0 || (dr === 0 && dc < 0)) continue;

            const neighborIdx = nr * SPATIAL_GRID_COLS + nc;
            const neighbor = this.spatialGrid[neighborIdx];
            if (neighbor.length === 0) continue;

            this.checkCellCollisions(cell, neighbor, cellIdx === neighborIdx, checked);
          }
        }
      }
    }
  }

  private checkCellCollisions(
    cellA: Bacteria[],
    cellB: Bacteria[],
    sameCell: boolean,
    checked: Set<number>,
  ): void {
    const lenA = cellA.length;
    const lenB = cellB.length;

    if (sameCell) {
      for (let i = 0; i < lenA; i++) {
        const a = cellA[i];
        for (let j = i + 1; j < lenB; j++) {
          const b = cellB[j];
          this.checkPairCollision(a, b, checked);
        }
      }
    } else {
      for (let i = 0; i < lenA; i++) {
        const a = cellA[i];
        for (let j = 0; j < lenB; j++) {
          const b = cellB[j];
          this.checkPairCollision(a, b, checked);
        }
      }
    }
  }

  private checkPairCollision(a: Bacteria, b: Bacteria, _checked: Set<number>): void {
    if (!a.active || !b.active) return;
    if (a.type === b.type) return;

    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const distSq = dx * dx + dy * dy;

    if (distSq < COLLISION_DISTANCE_SQ) {
      const damageA = rand(MIN_DAMAGE_PER_SECOND, MAX_DAMAGE_PER_SECOND);
      const damageB = rand(MIN_DAMAGE_PER_SECOND, MAX_DAMAGE_PER_SECOND);
      const deltaTime = 1 / 60;
      a.hp -= damageA * deltaTime * 60 * (1 / 60);
      b.hp -= damageB * deltaTime * 60 * (1 / 60);
    }
  }

  private notifyStats(): void {
    if (!this.onStatsChange) return;

    this.onStatsChange({
      redCount: this.redCountCache,
      blueCount: this.blueCountCache,
      nutrientCount: this.nutrientCountCache,
      elapsedSeconds: this.elapsedSeconds,
      winner: this.winner,
    });
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.clearRect(0, 0, DISH_DIAMETER, DISH_DIAMETER);

    ctx.save();
    ctx.beginPath();
    ctx.arc(DISH_CENTER, DISH_CENTER, DISH_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = '#fefae0';
    ctx.fill();

    ctx.strokeStyle = 'rgba(142, 202, 230, 0.5)';
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(DISH_CENTER, DISH_CENTER, DISH_RADIUS - 3, 0, Math.PI * 2);
    ctx.clip();

    for (let i = 0; i < this.interventions.length; i++) {
      const inv = this.interventions[i];
      if (!inv.active) continue;
      const alpha = inv.life / inv.maxLife;
      if (inv.type === 'antibiotic') {
        ctx.fillStyle = `rgba(42, 157, 143, ${0.22 * alpha})`;
        ctx.strokeStyle = `rgba(42, 157, 143, ${0.45 * alpha})`;
      } else {
        ctx.fillStyle = `rgba(244, 162, 97, ${0.3 * alpha})`;
        ctx.strokeStyle = `rgba(244, 162, 97, ${0.5 * alpha})`;
      }
      ctx.beginPath();
      ctx.arc(inv.x, inv.y, inv.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    for (let i = 0; i < this.nutrients.length; i++) {
      const n = this.nutrients[i];
      if (!n.active) continue;
      const alpha = n.life / n.maxLife;
      ctx.fillStyle = `rgba(255, 209, 102, ${alpha * 0.75})`;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    const bacteriaCount = this.bacteria.length;
    for (let i = 0; i < bacteriaCount; i++) {
      const b = this.bacteria[i];
      if (!b.active) continue;

      const glowColor = b.type === 'red' ? '#e63946' : '#457b9d';
      const fillColor = b.type === 'red' ? '#e63946' : '#457b9d';

      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 6;
      ctx.fillStyle = fillColor;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
      const hpRatio = b.hp / b.maxHp;
      if (hpRatio < 1) {
        const hpBarWidth = b.radius * 2;
        const hpBarHeight = 2;
        const hpBarX = b.x - b.radius;
        const hpBarY = b.y - b.radius - 5;

        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(hpBarX, hpBarY, hpBarWidth, hpBarHeight);
        ctx.fillStyle = hpRatio > 0.5 ? '#2a9d8f' : hpRatio > 0.25 ? '#f4a261' : '#e63946';
        ctx.fillRect(hpBarX, hpBarY, hpBarWidth * hpRatio, hpBarHeight);
      }
    }

    ctx.restore();
  }

  getWinner(): BacteriaType | null {
    return this.winner;
  }

  getBacteriaCount(): { red: number; blue: number } {
    return { red: this.redCountCache, blue: this.blueCountCache };
  }
}
