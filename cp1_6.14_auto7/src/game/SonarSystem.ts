import {
  SonarPulse,
  GRID_SIZE,
  BASE_SONAR_RADIUS,
  BASE_SONAR_DURATION,
  BASE_SONAR_COOLDOWN,
  UPGRADED_SONAR_COOLDOWN,
  MAX_SONAR_PARTICLES,
  CellType,
  Particle,
  AICreature
} from '../types/gameTypes';

export class SonarSystem {
  pulse: SonarPulse;
  cooldown: number;
  currentTime: number;

  constructor() {
    this.pulse = {
      active: false,
      x: 0,
      y: 0,
      currentRadius: 0,
      maxRadius: BASE_SONAR_RADIUS,
      startTime: 0,
      duration: BASE_SONAR_DURATION,
      highlightedCells: new Set()
    };
    this.cooldown = 0;
    this.currentTime = 0;
  }

  getCooldownTime(sonarRangeLevel: number): number {
    if (sonarRangeLevel >= 3) {
      return UPGRADED_SONAR_COOLDOWN;
    }
    return BASE_SONAR_COOLDOWN;
  }

  getMaxRadius(sonarRangeLevel: number): number {
    switch (sonarRangeLevel) {
      case 1: return 10;
      case 2: return 12;
      case 3: return 15;
      default: return BASE_SONAR_RADIUS;
    }
  }

  fire(x: number, y: number, sonarRangeLevel: number): boolean {
    if (this.cooldown > 0 || this.pulse.active) return false;

    this.pulse = {
      active: true,
      x,
      y,
      currentRadius: 0,
      maxRadius: this.getMaxRadius(sonarRangeLevel),
      startTime: this.currentTime,
      duration: BASE_SONAR_DURATION,
      highlightedCells: new Set()
    };
    return true;
  }

  getSpeedMultiplier(): number {
    return this.pulse.active ? 0.8 : 1.0;
  }

  update(
    dt: number,
    grid: { type: CellType }[][],
    explored: boolean[][],
    creatures: AICreature[]
  ): { sonarParticles: Particle[]; stunnedCreatures: string[] } {
    this.currentTime += dt;
    if (this.cooldown > 0) {
      this.cooldown = Math.max(0, this.cooldown - dt);
    }

    const sonarParticles: Particle[] = [];
    const stunnedCreatures: string[] = [];

    if (!this.pulse.active) {
      return { sonarParticles, stunnedCreatures };
    }

    const elapsed = this.currentTime - this.pulse.startTime;
    const progress = Math.min(1, elapsed / this.pulse.duration);
    this.pulse.currentRadius = this.pulse.maxRadius * progress;

    const minRadius = this.pulse.maxRadius * Math.max(0, progress - 0.05);

    for (let dy = -this.pulse.maxRadius; dy <= this.pulse.maxRadius; dy++) {
      for (let dx = -this.pulse.maxRadius; dx <= this.pulse.maxRadius; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist >= minRadius && dist <= this.pulse.currentRadius) {
          const gx = Math.floor(this.pulse.x) + dx;
          const gy = Math.floor(this.pulse.y) + dy;
          if (gx >= 0 && gx < GRID_SIZE && gy >= 0 && gy < GRID_SIZE) {
            const cell = grid[gy][gx];
            if (cell.type === CellType.WALL || cell.type === CellType.MINERAL ||
                cell.type === CellType.REEF || cell.type === CellType.EXIT) {
              const key = `${gx},${gy}`;
              this.pulse.highlightedCells.add(key);
              explored[gy][gx] = true;
            }
          }
        }
      }
    }

    for (const creature of creatures) {
      const dx = creature.x - this.pulse.x;
      const dy = creature.y - this.pulse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= this.pulse.currentRadius && dist >= minRadius) {
        stunnedCreatures.push(creature.id);
      }
    }

    const particleCount = Math.min(MAX_SONAR_PARTICLES, Math.floor(120 * progress));
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2 + Math.random() * 0.1;
      const r = this.pulse.currentRadius * (0.95 + Math.random() * 0.05);
      const life = BASE_SONAR_DURATION * (1 - progress) * 0.8;
      sonarParticles.push({
        x: this.pulse.x + Math.cos(angle) * r,
        y: this.pulse.y + Math.sin(angle) * r,
        vx: Math.cos(angle) * 0.3,
        vy: Math.sin(angle) * 0.3,
        life: life,
        maxLife: life,
        color: '#00faff',
        size: 2 + Math.random() * 2,
        type: 'sonar'
      });
    }

    if (progress >= 1) {
      this.pulse.active = false;
      this.cooldown = this.getCooldownTime(
        this.pulse.maxRadius > BASE_SONAR_RADIUS
          ? (this.pulse.maxRadius >= 15 ? 3 : (this.pulse.maxRadius >= 12 ? 2 : 1))
          : 0
      );
    }

    return { sonarParticles, stunnedCreatures };
  }
}
