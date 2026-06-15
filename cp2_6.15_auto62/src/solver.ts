export interface FluidSolverConfig {
  gridSize: number;
  timeStep: number;
  viscosity: number;
  diffusion: number;
  pressureIterations: number;
  sorOmega: number;
}

export interface FluidState {
  u: Float32Array;
  v: Float32Array;
  uPrev: Float32Array;
  vPrev: Float32Array;
  density: Float32Array;
  densityPrev: Float32Array;
  pressure: Float32Array;
  divergence: Float32Array;
}

export class FluidSolver {
  public readonly gridSize: number;
  public readonly timeStep: number;
  public viscosity: number;
  public diffusion: number;
  public readonly pressureIterations: number;
  public sorOmega: number;

  private state: FluidState;
  private windAngle: number = 0;
  private windStrength: number = 2.0;
  private densityDecay: number = 0.998;
  private velocityDecay: number = 0.999;

  constructor(config: Partial<FluidSolverConfig> = {}) {
    this.gridSize = config.gridSize ?? 100;
    this.timeStep = config.timeStep ?? 0.008;
    this.viscosity = config.viscosity ?? 0.00005;
    this.diffusion = config.diffusion ?? 0.00005;
    this.pressureIterations = Math.min(config.pressureIterations ?? 20, 20);
    this.sorOmega = config.sorOmega ?? 1.7;

    const totalCells = this.gridSize * this.gridSize;
    this.state = {
      u: new Float32Array(totalCells),
      v: new Float32Array(totalCells),
      uPrev: new Float32Array(totalCells),
      vPrev: new Float32Array(totalCells),
      density: new Float32Array(totalCells),
      densityPrev: new Float32Array(totalCells),
      pressure: new Float32Array(totalCells),
      divergence: new Float32Array(totalCells),
    };
  }

  private idx(i: number, j: number): number {
    return i + j * this.gridSize;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  private swapFields(field: 'u' | 'v' | 'density'): void {
    if (field === 'u') {
      const temp = this.state.u;
      this.state.u = this.state.uPrev;
      this.state.uPrev = temp;
    } else if (field === 'v') {
      const temp = this.state.v;
      this.state.v = this.state.vPrev;
      this.state.vPrev = temp;
    } else {
      const temp = this.state.density;
      this.state.density = this.state.densityPrev;
      this.state.densityPrev = temp;
    }
  }

  private setBoundary(b: number, x: Float32Array): void {
    const n = this.gridSize;

    for (let i = 1; i < n - 1; i++) {
      x[this.idx(i, 0)] = b === 2 ? -x[this.idx(i, 1)] : x[this.idx(i, 1)];
      x[this.idx(i, n - 1)] = b === 2 ? -x[this.idx(i, n - 2)] : x[this.idx(i, n - 2)];
    }

    for (let j = 1; j < n - 1; j++) {
      x[this.idx(0, j)] = b === 1 ? -x[this.idx(1, j)] : x[this.idx(1, j)];
      x[this.idx(n - 1, j)] = b === 1 ? -x[this.idx(n - 2, j)] : x[this.idx(n - 2, j)];
    }

    x[this.idx(0, 0)] = 0.5 * (x[this.idx(1, 0)] + x[this.idx(0, 1)]);
    x[this.idx(0, n - 1)] = 0.5 * (x[this.idx(1, n - 1)] + x[this.idx(0, n - 2)]);
    x[this.idx(n - 1, 0)] = 0.5 * (x[this.idx(n - 2, 0)] + x[this.idx(n - 1, 1)]);
    x[this.idx(n - 1, n - 1)] = 0.5 * (x[this.idx(n - 2, n - 1)] + x[this.idx(n - 1, n - 2)]);
  }

  private diffuse(b: number, x: Float32Array, x0: Float32Array, diff: number, dt: number): void {
    const n = this.gridSize;
    const a = dt * diff * (n - 2) * (n - 2);

    if (a < 0.00001) {
      x.set(x0);
      return;
    }

    for (let k = 0; k < 20; k++) {
      for (let i = 1; i < n - 1; i++) {
        for (let j = 1; j < n - 1; j++) {
          const idx = this.idx(i, j);
          x[idx] = (x0[idx] + a * (
            x[this.idx(i - 1, j)] +
            x[this.idx(i + 1, j)] +
            x[this.idx(i, j - 1)] +
            x[this.idx(i, j + 1)]
          )) / (1 + 4 * a);
        }
      }
      this.setBoundary(b, x);
    }
  }

  private advect(b: number, d: Float32Array, d0: Float32Array, u: Float32Array, v: Float32Array, dt: number): void {
    const n = this.gridSize;
    const dt0 = dt * (n - 2);

    for (let i = 1; i < n - 1; i++) {
      for (let j = 1; j < n - 1; j++) {
        const idx = this.idx(i, j);
        let x = i - dt0 * u[idx];
        let y = j - dt0 * v[idx];

        x = this.clamp(x, 0.5, n - 1.5);
        y = this.clamp(y, 0.5, n - 1.5);

        const i0 = Math.floor(x);
        const i1 = i0 + 1;
        const j0 = Math.floor(y);
        const j1 = j0 + 1;

        const s1 = x - i0;
        const s0 = 1 - s1;
        const t1 = y - j0;
        const t0 = 1 - t1;

        d[idx] = s0 * (t0 * d0[this.idx(i0, j0)] + t1 * d0[this.idx(i0, j1)]) +
                 s1 * (t0 * d0[this.idx(i1, j0)] + t1 * d0[this.idx(i1, j1)]);
      }
    }
    this.setBoundary(b, d);
  }

  private project(u: Float32Array, v: Float32Array, p: Float32Array, div: Float32Array): void {
    const n = this.gridSize;
    const h = 1.0 / (n - 2);

    for (let i = 1; i < n - 1; i++) {
      for (let j = 1; j < n - 1; j++) {
        const idx = this.idx(i, j);
        const dudx = (u[this.idx(i + 1, j)] - u[this.idx(i - 1, j)]) * 0.5;
        const dvdy = (v[this.idx(i, j + 1)] - v[this.idx(i, j - 1)]) * 0.5;
        div[idx] = (dudx + dvdy) * h;
        p[idx] *= 0.8;
      }
    }

    this.setBoundary(0, div);
    this.setBoundary(0, p);

    const omega = this.sorOmega;

    for (let k = 0; k < this.pressureIterations; k++) {
      for (let i = 1; i < n - 1; i++) {
        for (let j = 1; j < n - 1; j++) {
          const idx = this.idx(i, j);
          const pLeft = p[this.idx(i - 1, j)];
          const pRight = p[this.idx(i + 1, j)];
          const pDown = p[this.idx(i, j - 1)];
          const pUp = p[this.idx(i, j + 1)];

          const pGS = (pLeft + pRight + pDown + pUp - div[idx]) * 0.25;
          p[idx] = p[idx] + omega * (pGS - p[idx]);
        }
      }
      this.setBoundary(0, p);
    }

    const hInv = 0.5 / h;

    for (let i = 1; i < n - 1; i++) {
      for (let j = 1; j < n - 1; j++) {
        const idx = this.idx(i, j);
        u[idx] -= hInv * (p[this.idx(i + 1, j)] - p[this.idx(i - 1, j)]);
        v[idx] -= hInv * (p[this.idx(i, j + 1)] - p[this.idx(i, j - 1)]);
      }
    }

    this.setBoundary(1, u);
    this.setBoundary(2, v);
  }

  private addWind(): void {
    const n = this.gridSize;
    const windX = Math.cos(this.windAngle * Math.PI / 180) * this.windStrength;
    const windY = Math.sin(this.windAngle * Math.PI / 180) * this.windStrength;

    for (let i = 1; i < n - 1; i++) {
      for (let j = 1; j < n - 1; j++) {
        const idx = this.idx(i, j);
        this.state.u[idx] += windX * this.timeStep;
        this.state.v[idx] += windY * this.timeStep;
      }
    }
  }

  public setWindAngle(angle: number): void {
    this.windAngle = ((angle % 360) + 360) % 360;
  }

  public setWindStrength(strength: number): void {
    this.windStrength = Math.max(0, strength);
  }

  public setDiffusion(diffusion: number): void {
    this.diffusion = this.clamp(diffusion, 0, 0.5);
  }

  public setViscosity(viscosity: number): void {
    this.viscosity = this.clamp(viscosity, 0, 0.1);
  }

  public injectDensity(x: number, y: number, radius: number, amount: number): void {
    const n = this.gridSize;
    const gridX = Math.floor(x * (n - 2)) + 1;
    const gridY = Math.floor(y * (n - 2)) + 1;
    const gridRadius = Math.max(1, Math.ceil(radius * (n - 2)));

    for (let i = gridX - gridRadius; i <= gridX + gridRadius; i++) {
      for (let j = gridY - gridRadius; j <= gridY + gridRadius; j++) {
        if (i < 1 || i >= n - 1 || j < 1 || j >= n - 1) continue;

        const dx = i - gridX;
        const dy = j - gridY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= gridRadius) {
          const t = 1 - dist / gridRadius;
          const falloff = t * t * (3 - 2 * t);
          const idx = this.idx(i, j);
          this.state.density[idx] = Math.min(1, this.state.density[idx] + amount * falloff);
        }
      }
    }
  }

  public injectVelocity(x: number, y: number, vx: number, vy: number, radius: number): void {
    const n = this.gridSize;
    const gridX = Math.floor(x * (n - 2)) + 1;
    const gridY = Math.floor(y * (n - 2)) + 1;
    const gridRadius = Math.max(1, Math.ceil(radius * (n - 2)));

    for (let i = gridX - gridRadius; i <= gridX + gridRadius; i++) {
      for (let j = gridY - gridRadius; j <= gridY + gridRadius; j++) {
        if (i < 1 || i >= n - 1 || j < 1 || j >= n - 1) continue;

        const dx = i - gridX;
        const dy = j - gridY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= gridRadius) {
          const t = 1 - dist / gridRadius;
          const falloff = t * t * (3 - 2 * t);
          const idx = this.idx(i, j);
          this.state.u[idx] += vx * falloff;
          this.state.v[idx] += vy * falloff;
        }
      }
    }
  }

  public createShockwave(x: number, y: number, strength: number, radius: number): void {
    const n = this.gridSize;
    const gridX = Math.floor(x * (n - 2)) + 1;
    const gridY = Math.floor(y * (n - 2)) + 1;
    const gridRadius = Math.max(1, Math.ceil(radius * (n - 2)));

    for (let i = gridX - gridRadius; i <= gridX + gridRadius; i++) {
      for (let j = gridY - gridRadius; j <= gridY + gridRadius; j++) {
        if (i < 1 || i >= n - 1 || j < 1 || j >= n - 1) continue;

        const dx = i - gridX;
        const dy = j - gridY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= gridRadius && dist > 0) {
          const t = 1 - dist / gridRadius;
          const falloff = t * t;
          const dirX = dx / dist;
          const dirY = dy / dist;
          const idx = this.idx(i, j);

          this.state.density[idx] = Math.min(1, this.state.density[idx] + 0.95 * falloff);
          this.state.u[idx] += dirX * strength * falloff;
          this.state.v[idx] += dirY * strength * falloff;
          this.state.pressure[idx] += strength * 0.5 * falloff;
        }
      }
    }
  }

  public step(): void {
    const dt = this.timeStep;

    this.addWind();

    for (let i = 0; i < this.state.u.length; i++) {
      this.state.u[i] *= this.velocityDecay;
      this.state.v[i] *= this.velocityDecay;
    }

    this.swapFields('u');
    this.diffuse(1, this.state.u, this.state.uPrev, this.viscosity, dt);

    this.swapFields('v');
    this.diffuse(2, this.state.v, this.state.vPrev, this.viscosity, dt);

    this.project(this.state.u, this.state.v, this.state.pressure, this.state.divergence);

    this.swapFields('u');
    this.swapFields('v');
    this.advect(1, this.state.u, this.state.uPrev, this.state.uPrev, this.state.vPrev, dt);
    this.advect(2, this.state.v, this.state.vPrev, this.state.uPrev, this.state.vPrev, dt);

    this.project(this.state.u, this.state.v, this.state.pressure, this.state.divergence);

    this.swapFields('density');
    this.diffuse(0, this.state.density, this.state.densityPrev, this.diffusion, dt);

    this.swapFields('density');
    this.advect(0, this.state.density, this.state.densityPrev, this.state.u, this.state.v, dt);

    const density = this.state.density;
    for (let i = 0; i < density.length; i++) {
      density[i] = Math.max(0, density[i] * this.densityDecay);
    }
  }

  public getDensity(): Float32Array {
    return this.state.density;
  }

  public getVelocity(): { u: Float32Array; v: Float32Array } {
    return { u: this.state.u, v: this.state.v };
  }

  public getPressure(): Float32Array {
    return this.state.pressure;
  }

  public getDivergence(): Float32Array {
    return this.state.divergence;
  }

  public getParticleCount(): number {
    let count = 0;
    const density = this.state.density;
    for (let i = 0; i < density.length; i++) {
      if (density[i] > 0.01) count++;
    }
    return count;
  }

  public getMaxDensity(): number {
    let max = 0;
    const density = this.state.density;
    for (let i = 0; i < density.length; i++) {
      if (density[i] > max) max = density[i];
    }
    return max;
  }

  public clear(): void {
    this.state.u.fill(0);
    this.state.v.fill(0);
    this.state.uPrev.fill(0);
    this.state.vPrev.fill(0);
    this.state.density.fill(0);
    this.state.densityPrev.fill(0);
    this.state.pressure.fill(0);
    this.state.divergence.fill(0);
  }

  public setDensityDecay(decay: number): void {
    this.densityDecay = this.clamp(decay, 0.9, 1);
  }
}
