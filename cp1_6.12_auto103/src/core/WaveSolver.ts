export interface WaveSolverParams {
  resolution: number;
  waveSpeed: number;
  damping: number;
}

export class WaveSolver {
  private resolution: number;
  private waveSpeed: number;
  private damping: number;

  private current: Float32Array;
  private previous: Float32Array;
  private next: Float32Array;

  private dx: number;
  private dt: number;

  constructor(params: WaveSolverParams) {
    this.resolution = params.resolution;
    this.waveSpeed = params.waveSpeed;
    this.damping = params.damping;

    const size = this.resolution * this.resolution;
    this.current = new Float32Array(size);
    this.previous = new Float32Array(size);
    this.next = new Float32Array(size);

    this.dx = 1.0 / this.resolution;
    this.dt = 0.5;
  }

  public setResolution(resolution: number): void {
    if (this.resolution === resolution) return;
    this.resolution = resolution;
    const size = resolution * resolution;
    this.current = new Float32Array(size);
    this.previous = new Float32Array(size);
    this.next = new Float32Array(size);
    this.dx = 1.0 / this.resolution;
  }

  public setWaveSpeed(speed: number): void {
    this.waveSpeed = speed;
  }

  public setDamping(damping: number): void {
    this.damping = damping;
  }

  public getResolution(): number {
    return this.resolution;
  }

  public addDrop(x: number, y: number, radius: number = 2.0, strength: number = 1.5): void {
    const gridRadius = Math.ceil((radius / 10) * this.resolution);
    const cx = Math.floor((x / 10 + 0.5) * this.resolution);
    const cy = Math.floor((y / 10 + 0.5) * this.resolution);

    for (let j = -gridRadius; j <= gridRadius; j++) {
      for (let i = -gridRadius; i <= gridRadius; i++) {
        const gx = cx + i;
        const gy = cy + j;
        if (gx < 0 || gx >= this.resolution || gy < 0 || gy >= this.resolution) continue;

        const dist = Math.sqrt(i * i + j * j);
        if (dist <= gridRadius) {
          const falloff = Math.cos((dist / gridRadius) * Math.PI * 0.5);
          const height = strength * falloff * falloff;
          const idx = gy * this.resolution + gx;
          this.current[idx] = Math.min(this.current[idx] + height, 1.2);
        }
      }
    }
  }

  public addEnergyRipple(x: number, y: number, radius: number, strength: number, alpha: number): void {
    const gridRadius = Math.ceil((radius / 10) * this.resolution);
    const cx = Math.floor((x / 10 + 0.5) * this.resolution);
    const cy = Math.floor((y / 10 + 0.5) * this.resolution);
    const ringWidth = Math.max(1, gridRadius * 0.3);

    for (let j = -gridRadius; j <= gridRadius; j++) {
      for (let i = -gridRadius; i <= gridRadius; i++) {
        const gx = cx + i;
        const gy = cy + j;
        if (gx < 0 || gx >= this.resolution || gy < 0 || gy >= this.resolution) continue;

        const dist = Math.sqrt(i * i + j * j);
        if (dist <= gridRadius && dist >= gridRadius - ringWidth) {
          const normalizedDist = (dist - (gridRadius - ringWidth)) / ringWidth;
          const ringFalloff = Math.sin(normalizedDist * Math.PI);
          const height = strength * ringFalloff * alpha;
          const idx = gy * this.resolution + gx;
          this.current[idx] = Math.min(this.current[idx] + height, 1.2);
        }
      }
    }
  }

  public step(): Float32Array {
    const c = this.waveSpeed * this.waveSpeed;
    const h2 = this.dx * this.dx;
    const cfl = c * this.dt * this.dt / h2;

    if (cfl > 0.25) {
      this.dt = Math.sqrt(0.25 * h2 / c) * 0.9;
    }

    for (let y = 1; y < this.resolution - 1; y++) {
      for (let x = 1; x < this.resolution - 1; x++) {
        const idx = y * this.resolution + x;
        const lap = (
          this.current[idx - 1] +
          this.current[idx + 1] +
          this.current[idx - this.resolution] +
          this.current[idx + this.resolution] -
          4.0 * this.current[idx]
        );

        this.next[idx] = (
          2.0 * this.current[idx] -
          this.previous[idx] +
          cfl * lap
        ) * (1.0 - this.damping);
      }
    }

    for (let x = 0; x < this.resolution; x++) {
      const top = x;
      const bottom = (this.resolution - 1) * this.resolution + x;
      this.next[top] = this.current[top] * (1.0 - this.damping);
      this.next[bottom] = this.current[bottom] * (1.0 - this.damping);
    }

    for (let y = 0; y < this.resolution; y++) {
      const left = y * this.resolution;
      const right = y * this.resolution + (this.resolution - 1);
      this.next[left] = this.current[left] * (1.0 - this.damping);
      this.next[right] = this.current[right] * (1.0 - this.damping);
    }

    const temp = this.previous;
    this.previous = this.current;
    this.current = this.next;
    this.next = temp;

    return this.current;
  }

  public getHeightMap(): Float32Array {
    return this.current;
  }

  public reset(): void {
    this.current.fill(0);
    this.previous.fill(0);
    this.next.fill(0);
  }
}
