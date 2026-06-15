import {
  LaneIndex,
  EnergyColor,
  ENERGY_COLORS,
  ENERGY_HUE,
  CarState,
  Particle,
  InputState,
  CollisionEvent,
  getLaneY,
  Shockwave
} from './types';

const BASE_SPEED = 180;
const LANE_SWITCH_SPEED = 600;
const SKILL_COOLDOWN = 3;
const SKILL_BOOST_MULTIPLIER = 1.3;
const SKILL_BOOST_DURATION = 2;

function createEmptyEnergy(): Record<EnergyColor, number> {
  return { red: 0, orange: 0, yellow: 0, green: 0, blue: 0, purple: 0 };
}

export class CarController {
  private state: CarState;
  private wasEnergyFull = false;

  constructor(startX: number, startLane: LaneIndex = 1) {
    this.state = {
      x: startX,
      y: getLaneY(startLane),
      targetLane: startLane,
      speed: BASE_SPEED,
      baseSpeed: BASE_SPEED,
      energy: createEmptyEnergy(),
      energyFull: false,
      skillCooldown: 0,
      boostTimer: 0,
      boostMultiplier: 1,
      slowTimer: 0,
      slowMultiplier: 1,
      currentHue: 0
    };
  }

  getState(): CarState {
    return { ...this.state, energy: { ...this.state.energy } };
  }

  reset(): void {
    this.state = {
      x: this.state.x,
      y: getLaneY(1),
      targetLane: 1,
      speed: BASE_SPEED,
      baseSpeed: BASE_SPEED,
      energy: createEmptyEnergy(),
      energyFull: false,
      skillCooldown: 0,
      boostTimer: 0,
      boostMultiplier: 1,
      slowTimer: 0,
      slowMultiplier: 1,
      currentHue: 0
    };
    this.wasEnergyFull = false;
  }

  switchLane(direction: 'up' | 'down'): void {
    const next = direction === 'up'
      ? Math.max(0, this.state.targetLane - 1) as LaneIndex
      : Math.min(2, this.state.targetLane + 1) as LaneIndex;
    this.state.targetLane = next;
  }

  collectEnergy(color: EnergyColor): void {
    if (this.state.energyFull) return;
    this.state.energy[color] = Math.min(100, this.state.energy[color] + 20);
    this.checkEnergyFull();
  }

  private checkEnergyFull(): boolean {
    const allFull = ENERGY_COLORS.every(c => this.state.energy[c] >= 100);
    this.state.energyFull = allFull && this.state.skillCooldown <= 0;
    if (allFull && !this.wasEnergyFull) {
      this.wasEnergyFull = true;
      return true;
    }
    return false;
  }

  applySlowdown(): void {
    this.state.slowTimer = 1;
    this.state.slowMultiplier = 0.5;
  }

  applyBoost(multiplier: number, duration: number): void {
    if (this.state.boostTimer <= 0 || multiplier > this.state.boostMultiplier) {
      this.state.boostMultiplier = multiplier;
    }
    this.state.boostTimer = Math.max(this.state.boostTimer, duration);
  }

  tryActivateSkill(): { activated: boolean; shockwave: Shockwave | null; energyBecameFull: boolean } {
    const energyBecameFull = this.checkEnergyFull();

    if (this.state.energyFull && this.state.skillCooldown <= 0) {
      this.state.energy = createEmptyEnergy();
      this.state.energyFull = false;
      this.wasEnergyFull = false;
      this.state.skillCooldown = SKILL_COOLDOWN;
      this.applyBoost(SKILL_BOOST_MULTIPLIER, SKILL_BOOST_DURATION);

      const shockwave: Shockwave = {
        active: true,
        x: this.state.x,
        y: this.state.y,
        radius: 0,
        maxRadius: 300,
        progress: 0,
        hits: new Set<number>()
      };
      return { activated: true, shockwave, energyBecameFull };
    }
    return { activated: false, shockwave: null, energyBecameFull };
  }

  private updateEffectiveSpeed(): void {
    const multiplier = this.state.boostMultiplier * this.state.slowMultiplier;
    this.state.speed = this.state.baseSpeed * multiplier;
  }

  update(dt: number, input: InputState): { state: CarState; trailParticles: Particle[]; energyBecameFull: boolean } {
    if (input.upPressed) this.switchLane('up');
    if (input.downPressed) this.switchLane('down');

    const targetY = getLaneY(this.state.targetLane);
    const dy = targetY - this.state.y;
    const moveAmount = LANE_SWITCH_SPEED * dt;
    if (Math.abs(dy) <= moveAmount) {
      this.state.y = targetY;
    } else {
      this.state.y += Math.sign(dy) * moveAmount;
    }

    if (this.state.boostTimer > 0) {
      this.state.boostTimer -= dt;
      if (this.state.boostTimer <= 0) {
        this.state.boostTimer = 0;
        this.state.boostMultiplier = 1;
      }
    }
    if (this.state.slowTimer > 0) {
      this.state.slowTimer -= dt;
      if (this.state.slowTimer <= 0) {
        this.state.slowTimer = 0;
        this.state.slowMultiplier = 1;
      }
    }
    if (this.state.skillCooldown > 0) {
      this.state.skillCooldown -= dt;
      if (this.state.skillCooldown <= 0) {
        this.state.skillCooldown = 0;
        this.checkEnergyFull();
      }
    }

    this.updateEffectiveSpeed();

    this.state.currentHue = (this.state.currentHue + 180 * dt) % 360;

    const trailParticles = this.generateTrailParticles(dt);

    const energyBecameFull = this.checkEnergyFull();

    return {
      state: this.getState(),
      trailParticles,
      energyBecameFull
    };
  }

  private generateTrailParticles(dt: number): Particle[] {
    const count = 2;
    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const hue = (this.state.currentHue + Math.random() * 60 - 30 + 360) % 360;
      particles.push({
        x: this.state.x - 15 - Math.random() * 8,
        y: this.state.y + (Math.random() - 0.5) * 14,
        vx: -20 - Math.random() * 40,
        vy: (Math.random() - 0.5) * 10,
        size: 3 + Math.random() * 3,
        color: `hsl(${hue}, 100%, 65%)`,
        alpha: 0.2 + Math.random() * 0.15,
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.6,
        type: 'trail'
      });
    }
    return particles;
  }

  getEffectiveSpeed(): number {
    return this.state.speed;
  }
}
