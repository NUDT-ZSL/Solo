export interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  trail: { x: number; y: number; z: number }[];
  colorIndex: number;
}

export interface ChaosParams {
  sigma: number;
  rho: number;
  beta: number;
}

const PARTICLE_COUNT = 3000;
const TRAIL_LENGTH = 30;
const DT = 0.005;

class ChaosAttractor {
  private particles: Particle[] = [];
  private params: ChaosParams = {
    sigma: 10,
    rho: 28,
    beta: 8 / 3
  };

  constructor() {
    this.initParticles();
  }

  private initParticles(): void {
    this.particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const x = (Math.random() - 0.5) * 20;
      const y = (Math.random() - 0.5) * 20;
      const z = (Math.random() - 0.5) * 20;
      const particle: Particle = {
        x,
        y,
        z,
        vx: 0,
        vy: 0,
        vz: 0,
        trail: [],
        colorIndex: Math.random()
      };
      this.particles.push(particle);
    }
  }

  private lorenz(x: number, y: number, z: number): { dx: number; dy: number; dz: number } {
    const { sigma, rho, beta } = this.params;
    const dx = sigma * (y - x);
    const dy = x * (rho - z) - y;
    const dz = x * y - beta * z;
    return { dx, dy, dz };
  }

  private rungeKutta4(x: number, y: number, z: number, dt: number): { x: number; y: number; z: number } {
    const k1 = this.lorenz(x, y, z);
    
    const k2 = this.lorenz(
      x + k1.dx * dt / 2,
      y + k1.dy * dt / 2,
      z + k1.dz * dt / 2
    );
    
    const k3 = this.lorenz(
      x + k2.dx * dt / 2,
      y + k2.dy * dt / 2,
      z + k2.dz * dt / 2
    );
    
    const k4 = this.lorenz(
      x + k3.dx * dt,
      y + k3.dy * dt,
      z + k3.dz * dt
    );

    return {
      x: x + (k1.dx + 2 * k2.dx + 2 * k3.dx + k4.dx) * dt / 6,
      y: y + (k1.dy + 2 * k2.dy + 2 * k3.dy + k4.dy) * dt / 6,
      z: z + (k1.dz + 2 * k2.dz + 2 * k3.dz + k4.dz) * dt / 6
    };
  }

  update(): void {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      
      p.trail.unshift({ x: p.x, y: p.y, z: p.z });
      if (p.trail.length > TRAIL_LENGTH) {
        p.trail.pop();
      }

      const result = this.rungeKutta4(p.x, p.y, p.z, DT);
      p.vx = (result.x - p.x) / DT;
      p.vy = (result.y - p.y) / DT;
      p.vz = (result.z - p.z) / DT;
      p.x = result.x;
      p.y = result.y;
      p.z = result.z;

      if (!isFinite(p.x) || !isFinite(p.y) || !isFinite(p.z)) {
        p.x = (Math.random() - 0.5) * 20;
        p.y = (Math.random() - 0.5) * 20;
        p.z = (Math.random() - 0.5) * 20;
        p.trail = [];
      }
    }
  }

  getParticles(): Particle[] {
    return this.particles;
  }

  setParams(params: Partial<ChaosParams>): void {
    this.params = { ...this.params, ...params };
  }

  getParams(): ChaosParams {
    return { ...this.params };
  }

  getAveragePosition(): { x: number; y: number; z: number } {
    let sumX = 0, sumY = 0, sumZ = 0;
    const count = this.particles.length;
    for (let i = 0; i < count; i++) {
      sumX += this.particles[i].x;
      sumY += this.particles[i].y;
      sumZ += this.particles[i].z;
    }
    return {
      x: sumX / count,
      y: sumY / count,
      z: sumZ / count
    };
  }

  getAverageVelocity(): { x: number; y: number; z: number } {
    let sumVx = 0, sumVy = 0, sumVz = 0;
    const count = this.particles.length;
    for (let i = 0; i < count; i++) {
      sumVx += Math.abs(this.particles[i].vx);
      sumVy += Math.abs(this.particles[i].vy);
      sumVz += Math.abs(this.particles[i].vz);
    }
    return {
      x: sumVx / count,
      y: sumVy / count,
      z: sumVz / count
    };
  }

  reset(): void {
    this.initParticles();
  }
}

export const chaosAttractor = new ChaosAttractor();
export default ChaosAttractor;
