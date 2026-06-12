import type { SpellManager } from './spellManager';

export const SPELL_SPEED = 800;
export const SPELL_BASE_DAMAGE = 10;
export const ULTIMATE_EXTRA_DAMAGE = 15;
export const HIT_RECOVERY_DURATION = 0.3;
export const CHAIN_SLOW_DURATION = 2;
export const SPEED_BOOST_DURATION = 1.5;
export const ULTIMATE_RUNE_DURATION = 1.5;

export interface Projectile {
  id: number;
  x: number;
  y: number;
  vx: number;
  owner: 'blue' | 'red';
  size: number;
  isUltimate: boolean;
  trail: Particle[];
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface HitEffect {
  target: 'blue' | 'red';
  time: number;
  duration: number;
}

export interface ScreenFlash {
  time: number;
  duration: number;
  color: string;
}

export interface CombatState {
  projectiles: Projectile[];
  particles: Particle[];
  hitEffects: HitEffect[];
  screenFlashes: ScreenFlash[];
  blueHealth: number;
  redHealth: number;
}

let projectileIdCounter = 0;

export class CombatSystem {
  private state: CombatState = {
    projectiles: [],
    particles: [],
    hitEffects: [],
    screenFlashes: [],
    blueHealth: 100,
    redHealth: 100
  };

  private blueX: number;
  private redX: number;
  private mageY: number;
  private mageRadius: number = 35;

  constructor(
    private canvasWidth: number,
    private canvasHeight: number,
    private spellManager: SpellManager
  ) {
    this.blueX = 150;
    this.redX = canvasWidth - 150;
    this.mageY = canvasHeight / 2;
  }

  reset(): void {
    this.state = {
      projectiles: [],
      particles: [],
      hitEffects: [],
      screenFlashes: [],
      blueHealth: 100,
      redHealth: 100
    };
  }

  getState(): Readonly<CombatState> {
    return this.state;
  }

  getHealth(player: 'blue' | 'red'): number {
    return player === 'blue' ? this.state.blueHealth : this.state.redHealth;
  }

  fireSpell(owner: 'blue' | 'red', isUltimate: boolean): void {
    const startX = owner === 'blue' ? this.blueX + 40 : this.redX - 40;
    const startY = this.mageY - 10;
    const vx = owner === 'blue' ? SPELL_SPEED : -SPELL_SPEED;
    const baseSize = isUltimate ? 24 : 16;

    const projectile: Projectile = {
      id: projectileIdCounter++,
      x: startX,
      y: startY,
      vx,
      owner,
      size: baseSize,
      isUltimate,
      trail: []
    };

    this.state.projectiles.push(projectile);
  }

  addScreenFlash(color: string, duration: number): void {
    this.state.screenFlashes.push({
      time: 0,
      duration,
      color
    });
  }

  update(dt: number): void {
    this.state.projectiles.forEach(p => {
      p.x += p.vx * dt;

      if (p.isUltimate) {
        const trailColor = p.owner === 'blue' ? '#60a5fa' : '#f87171';
        for (let i = 0; i < 2; i++) {
          this.state.particles.push({
            x: p.x + (Math.random() - 0.5) * 5,
            y: p.y + (Math.random() - 0.5) * 5,
            vx: -p.vx * 0.2 + (Math.random() - 0.5) * 30,
            vy: (Math.random() - 0.5) * 60,
            life: 0,
            maxLife: 0.5,
            color: trailColor,
            size: 4 + Math.random() * 3
          });
        }
      }
    });

    this.state.particles = this.state.particles.filter(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life += dt;
      return p.life < p.maxLife;
    });

    this.state.hitEffects = this.state.hitEffects.filter(e => {
      e.time += dt;
      return e.time < e.duration;
    });

    this.state.screenFlashes = this.state.screenFlashes.filter(f => {
      f.time += dt;
      return f.time < f.duration;
    });

    this.checkCollisions();

    this.state.projectiles = this.state.projectiles.filter(p =>
      p.x > -50 && p.x < this.canvasWidth + 50
    );
  }

  private checkCollisions(): void {
    const blueCenter = { x: this.blueX, y: this.mageY };
    const redCenter = { x: this.redX, y: this.mageY };

    for (let i = this.state.projectiles.length - 1; i >= 0; i--) {
      const p = this.state.projectiles[i];
      const target = p.owner === 'blue' ? redCenter : blueCenter;
      const targetPlayer = p.owner === 'blue' ? 'red' : 'blue';
      const targetRadius = this.mageRadius;

      const dx = p.x - target.x;
      const dy = p.y - target.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < targetRadius + p.size / 2) {
        this.state.projectiles.splice(i, 1);

        let damage = SPELL_BASE_DAMAGE;
        if (p.isUltimate) {
          damage += ULTIMATE_EXTRA_DAMAGE;
          this.addScreenFlash('rgba(255, 255, 255, 0.9)', 0.1);
        }

        if (targetPlayer === 'blue') {
          this.state.blueHealth = Math.max(0, this.state.blueHealth - damage);
        } else {
          this.state.redHealth = Math.max(0, this.state.redHealth - damage);
        }

        this.state.hitEffects.push({
          target: targetPlayer,
          time: 0,
          duration: HIT_RECOVERY_DURATION
        });

        this.spellManager.resetProgressHalf(targetPlayer);

        this.spawnHitParticles(target.x, target.y, targetPlayer);

        if (p.isUltimate) {
          this.spawnUltimateBurst(target.x, target.y);
        }
      }
    }
  }

  private spawnHitParticles(x: number, y: number, target: 'blue' | 'red'): void {
    const color = target === 'blue' ? '#60a5fa' : '#f87171';
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      this.state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * (100 + Math.random() * 100),
        vy: Math.sin(angle) * (100 + Math.random() * 100),
        life: 0,
        maxLife: 0.4,
        color,
        size: 3 + Math.random() * 3
      });
    }
  }

  private spawnUltimateBurst(x: number, y: number): void {
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 150 + Math.random() * 200;
      this.state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 0.6,
        color: '#fbbf24',
        size: 4 + Math.random() * 4
      });
    }
  }

  spawnUltimateTrail(x: number, y: number, owner: 'blue' | 'red'): void {
    const baseColor = owner === 'blue' ? '#60a5fa' : '#f87171';
    for (let i = 0; i < 20; i++) {
      this.state.particles.push({
        x: x + (Math.random() - 0.5) * 5,
        y: y + (Math.random() - 0.5) * 5,
        vx: (Math.random() - 0.5) * 40,
        vy: (Math.random() - 0.5) * 40,
        life: 0,
        maxLife: 0.5,
        color: i % 2 === 0 ? baseColor : '#fbbf24',
        size: 3 + Math.random() * 3
      });
    }
  }

  isHitRecovering(player: 'blue' | 'red'): boolean {
    return this.state.hitEffects.some(e => e.target === player);
  }

  resize(width: number, height: number): void {
    this.blueX = 150;
    this.redX = width - 150;
    this.mageY = height / 2;
  }

  getMagePosition(player: 'blue' | 'red'): { x: number; y: number } {
    return {
      x: player === 'blue' ? this.blueX : this.redX,
      y: this.mageY
    };
  }
}
