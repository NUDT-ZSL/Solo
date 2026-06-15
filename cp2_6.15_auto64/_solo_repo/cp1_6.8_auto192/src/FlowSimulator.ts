export class FlowSimulator {
  private time: number = 0;
  private readonly timeSpeed: number = 0.0003;
  private vortices: { x: number; y: number; strength: number; frequency: number; phase: number }[] = [];

  constructor() {
    this.initVortices();
  }

  private initVortices(): void {
    for (let i = 0; i < 5; i++) {
      this.vortices.push({
        x: (Math.random() - 0.5) * 40,
        y: (Math.random() - 0.5) * 40,
        strength: (Math.random() * 0.8 + 0.3) * (Math.random() > 0.5 ? 1 : -1),
        frequency: Math.random() * 0.5 + 0.2,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  update(deltaTime: number): void {
    this.time += deltaTime * this.timeSpeed;
  }

  getFlowAt(x: number, y: number): { vx: number; vy: number } {
    let vx = 0;
    let vy = 0;

    const nx1 = x * 0.08 + this.time * 0.7;
    const ny1 = y * 0.08 + this.time * 0.5;
    vx += this.noise2D(nx1, ny1) * 0.6;
    vy += this.noise2D(nx1 + 100, ny1 + 100) * 0.6;

    const nx2 = x * 0.03 + this.time * 0.3;
    const ny2 = y * 0.03 + this.time * 0.2;
    vx += this.noise2D(nx2 + 200, ny2 + 200) * 1.2;
    vy += this.noise2D(nx2 + 300, ny2 + 300) * 1.2;

    for (const v of this.vortices) {
      const dx = x - v.x;
      const dy = y - v.y;
      const distSq = dx * dx + dy * dy + 10;
      const dist = Math.sqrt(distSq);
      const falloff = v.strength / (1 + distSq * 0.01);
      const pulse = 0.7 + 0.3 * Math.sin(this.time * v.frequency * 60 + v.phase);
      vx += (-dy / dist) * falloff * pulse;
      vy += (dx / dist) * falloff * pulse;
    }

    return { vx, vy };
  }

  private noise2D(x: number, y: number): number {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;

    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);

    const n00 = this.hash2D(ix, iy);
    const n10 = this.hash2D(ix + 1, iy);
    const n01 = this.hash2D(ix, iy + 1);
    const n11 = this.hash2D(ix + 1, iy + 1);

    const nx0 = n00 + (n10 - n00) * sx;
    const nx1 = n01 + (n11 - n01) * sx;

    return nx0 + (nx1 - nx0) * sy;
  }

  private hash2D(x: number, y: number): number {
    let n = x * 127.1 + y * 311.7;
    n = Math.sin(n) * 43758.5453;
    return n - Math.floor(n);
  }
}
