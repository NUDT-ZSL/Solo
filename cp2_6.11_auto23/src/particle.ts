export interface Vec2 {
  x: number;
  y: number;
}

export interface ParticleState {
  phase: 'flowing' | 'locked' | 'victory' | 'fading';
}

export class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  baseColor: string;
  life: number;
  maxLife: number;
  opacity: number;
  locked: boolean;
  lockedX: number;
  lockedY: number;
  victoryVx: number;
  victoryVy: number;
  victoryColor: string;
  gridX: number;
  gridY: number;

  constructor(canvasWidth: number, canvasHeight: number) {
    const cx = canvasWidth / 2;
    const cy = canvasHeight / 2;
    const spread = Math.min(canvasWidth, canvasHeight) * 0.35;
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * spread;

    this.x = cx + Math.cos(angle) * dist;
    this.y = cy + Math.sin(angle) * dist;

    const speed = 0.5 + Math.random() * 1.5;
    const velAngle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(velAngle) * speed;
    this.vy = Math.sin(velAngle) * speed;

    this.radius = 1 + Math.random() * 2;

    const t = Math.random();
    const r = Math.floor(0x4A + (0x7A - 0x4A) * t);
    const g = Math.floor(0x4A + (0x7A - 0x4A) * t);
    const b = Math.floor(0x4A + (0x7A - 0x4A) * t);
    this.baseColor = `rgb(${r},${g},${b})`;
    this.color = this.baseColor;

    this.life = 1;
    this.maxLife = 1;
    this.opacity = 1;
    this.locked = false;
    this.lockedX = 0;
    this.lockedY = 0;
    this.victoryVx = 0;
    this.victoryVy = 0;
    this.victoryColor = '#FFD700';
    this.gridX = 0;
    this.gridY = 0;
  }

  isInHourglass(cx: number, cy: number, side: number, gap: number): boolean {
    const halfSide = side / 2;
    const halfGap = gap / 2;
    const localX = this.x - cx;
    const localY = this.y - cy;

    const topY = -halfGap;
    const topLeftX = -halfSide;
    const topRightX = halfSide;

    const topInTriangle =
      localY <= topY &&
      localY >= topY - halfSide &&
      localX >= topLeftX * (1 + (localY - topY) / halfSide) &&
      localX <= topRightX * (1 + (localY - topY) / halfSide);

    const bottomY = halfGap;
    const bottomLeftX = -halfSide;
    const bottomRightX = halfSide;

    const bottomInTriangle =
      localY >= bottomY &&
      localY <= bottomY + halfSide &&
      localX >= bottomLeftX * (1 - (localY - bottomY) / halfSide) &&
      localX <= bottomRightX * (1 - (localY - bottomY) / halfSide);

    return topInTriangle || bottomInTriangle;
  }

  applyForces(
    particles: Particle[],
    grid: Map<string, Particle[]>,
    gridCellSize: number,
    cx: number,
    cy: number,
    mouseActive: boolean,
    mouseX: number,
    mouseY: number,
    deltaTime: number,
    state: ParticleState
  ) {
    if (state.phase === 'locked' || this.locked) {
      this.x = this.lockedX;
      this.y = this.lockedY;
      return;
    }

    if (state.phase === 'victory') {
      this.x += this.victoryVx * deltaTime;
      this.y += this.victoryVy * deltaTime;
      this.victoryVx *= 0.98;
      this.victoryVy *= 0.98;
      this.opacity = Math.max(0, this.opacity - deltaTime / 2);
      this.color = this.victoryColor;
      return;
    }

    if (state.phase === 'fading') {
      this.opacity = Math.max(0, this.opacity - deltaTime / 3);
      this.x += this.vx * deltaTime * 0.3;
      this.y += this.vy * deltaTime * 0.3;
      return;
    }

    const dt = deltaTime;

    const centerDx = cx - this.x;
    const centerDy = cy - this.y;
    const centerDist = Math.sqrt(centerDx * centerDx + centerDy * centerDy);
    if (centerDist > 0.001) {
      const centerForce = 0.08;
      this.vx += (centerDx / centerDist) * centerForce * dt;
      this.vy += (centerDy / centerDist) * centerForce * dt;
    }

    const repelRadius = 25;
    const repelForce = 1.2;

    const gx = Math.floor(this.x / gridCellSize);
    const gy = Math.floor(this.y / gridCellSize);

    for (let ogx = gx - 1; ogx <= gx + 1; ogx++) {
      for (let ogy = gy - 1; ogy <= gy + 1; ogy++) {
        const key = `${ogx},${ogy}`;
        const cell = grid.get(key);
        if (!cell) continue;

        for (let i = 0; i < cell.length; i++) {
          const other = cell[i];
          if (other === this) continue;

          const dx = this.x - other.x;
          const dy = this.y - other.y;
          const distSq = dx * dx + dy * dy;

          if (distSq > 0.01 && distSq < repelRadius * repelRadius) {
            const dist = Math.sqrt(distSq);
            const overlap = (repelRadius - dist) / repelRadius;
            const force = overlap * overlap * repelForce;
            this.vx += (dx / dist) * force * dt;
            this.vy += (dy / dist) * force * dt;
          }
        }
      }
    }

    if (mouseActive) {
      const mx = mouseX;
      const my = mouseY;
      const mdx = mx - this.x;
      const mdy = my - this.y;
      const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
      const magRadius = 50;

      if (mDist < magRadius && mDist > 0.001) {
        const strength = 1 - mDist / magRadius;
        const pull = strength * strength * 80;
        this.vx += (mdx / mDist) * pull * dt;
        this.vy += (mdy / mDist) * pull * dt;
      }
    }

    const damping = 0.985;
    this.vx *= damping;
    this.vy *= damping;

    const maxSpeed = 200;
    const speedSq = this.vx * this.vx + this.vy * this.vy;
    if (speedSq > maxSpeed * maxSpeed) {
      const speed = Math.sqrt(speedSq);
      this.vx = (this.vx / speed) * maxSpeed;
      this.vy = (this.vy / speed) * maxSpeed;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  lockPosition() {
    this.locked = true;
    this.lockedX = this.x;
    this.lockedY = this.y;
  }

  triggerVictoryBurst(canvasWidth: number, canvasHeight: number) {
    const cx = canvasWidth / 2;
    const cy = canvasHeight / 2;
    const dx = this.x - cx;
    const dy = this.y - cy;
    let angle: number;

    if (dx === 0 && dy === 0) {
      angle = Math.random() * Math.PI * 2;
    } else {
      const baseAngle = Math.atan2(dy, dx);
      angle = baseAngle + (Math.random() - 0.5) * Math.PI * 0.4;
    }

    const speed = 80 + Math.random() * 180;
    this.victoryVx = Math.cos(angle) * speed;
    this.victoryVy = Math.sin(angle) * speed;
    this.opacity = 1;
    this.color = this.victoryColor;
  }

  render(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    breathIntensity: number,
    frameCount: number,
    state: ParticleState
  ) {
    if (this.opacity <= 0.01) return;

    const edgeMargin = 50;
    const nearEdge =
      this.x < edgeMargin ||
      this.x > canvasWidth - edgeMargin ||
      this.y < edgeMargin ||
      this.y > canvasHeight - edgeMargin;

    if (nearEdge && frameCount % 4 !== 0 && state.phase === 'flowing') {
      return;
    }

    ctx.globalAlpha = this.opacity;

    if (state.phase === 'flowing') {
      const glowRadius = this.radius * 3 * (0.2 + breathIntensity * 0.3);
      const gradient = ctx.createRadialGradient(
        this.x, this.y, 0,
        this.x, this.y, glowRadius
      );
      gradient.addColorStop(0, this.baseColor);
      gradient.addColorStop(1, 'rgba(122,122,122,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(this.x, this.y, glowRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
  }
}

export class SpatialHashGrid {
  cellSize: number;
  cells: Map<string, Particle[]>;

  constructor(cellSize: number) {
    this.cellSize = cellSize;
    this.cells = new Map();
  }

  clear() {
    this.cells.clear();
  }

  insert(particle: Particle) {
    const gx = Math.floor(particle.x / this.cellSize);
    const gy = Math.floor(particle.y / this.cellSize);
    particle.gridX = gx;
    particle.gridY = gy;
    const key = `${gx},${gy}`;
    let cell = this.cells.get(key);
    if (!cell) {
      cell = [];
      this.cells.set(key, cell);
    }
    cell.push(particle);
  }

  getGrid() {
    return this.cells;
  }
}
