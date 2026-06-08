import type { Target, Particle, SkillEffect, SkillType, DamageEvent } from './types';

let targetIdCounter = 0;
let particleIdCounter = 0;
let effectIdCounter = 0;

const TARGET_COLOR = '#2ECC71';
const TARGET_MAX = '#27AE60';
const MAX_TARGETS = 5;
const TARGET_RADIUS = 20;
const TARGET_SPEED = 1;
const TARGET_HP = 100;
const SPAWN_INTERVAL = 3;
const MAX_PARTICLES = 50;
const EXPLOSION_PARTICLES = 8;

export class EntityManager {
  targets: Target[] = [];
  particles: Particle[] = [];
  skillEffects: SkillEffect[] = [];

  private spawnTimer = 0;
  private canvasWidth = 800;
  private canvasHeight = 600;

  setCanvasSize(w: number, h: number): void {
    this.canvasWidth = w;
    this.canvasHeight = h;
  }

  reset(): void {
    this.targets = [];
    this.particles = [];
    this.skillEffects = [];
    this.spawnTimer = 0;
  }

  private generateTarget(): void {
    if (this.targets.length >= MAX_TARGETS) return;
    const margin = 60;
    const y = margin + Math.random() * (this.canvasHeight - margin * 2);
    const target: Target = {
      id: `t_${++targetIdCounter}`,
      x: this.canvasWidth + TARGET_RADIUS,
      y,
      radius: TARGET_RADIUS,
      hp: TARGET_HP,
      maxHp: TARGET_HP,
      speed: TARGET_SPEED,
      frozen: false,
      frozenTime: 0,
      burning: false,
      burnTime: 0,
      burnDamage: 0,
      hitFlash: 0,
    };
    this.targets.push(target);
  }

  spawnExplosion(x: number, y: number, color: string): void {
    for (let i = 0; i < EXPLOSION_PARTICLES; i++) {
      if (this.particles.length >= MAX_PARTICLES) {
        this.particles.shift();
      }
      const angle = (i / EXPLOSION_PARTICLES) * Math.PI * 2;
      const speed = 50 + Math.random() * 80;
      this.particles.push({
        id: `p_${++particleIdCounter}`,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5,
        maxLife: 0.5,
        color,
        radius: 3 + Math.random() * 2,
      });
    }
  }

  spawnSkillEffect(type: SkillType, x: number, y: number, maxRadius: number, color: string): void {
    const maxLife = type === 'fire' ? 0.3 : type === 'ice' ? 0.4 : 0.5;
    this.skillEffects.push({
      id: `e_${++effectIdCounter}`,
      type,
      x,
      y,
      radius: 0,
      maxRadius,
      life: 0,
      maxLife,
      color,
    });
  }

  applyDamage(events: DamageEvent[]): number {
    let killCount = 0;
    for (const evt of events) {
      const target = this.targets.find((t) => t.id === evt.targetId);
      if (!target) continue;
      target.hp -= evt.amount;
      if (!evt.isDot) {
        target.hitFlash = 0.1;
      }
      if (target.hp <= 0) {
        this.spawnExplosion(target.x, target.y, TARGET_COLOR);
        killCount++;
      }
    }
    if (killCount > 0) {
      this.targets = this.targets.filter((t) => t.hp > 0);
    }
    return killCount;
  }

  update(dt: number): DamageEvent[] {
    const dotEvents: DamageEvent[] = [];

    this.spawnTimer += dt;
    if (this.spawnTimer >= SPAWN_INTERVAL) {
      this.spawnTimer = 0;
      this.generateTarget();
    }

    for (const target of this.targets) {
      if (target.hitFlash > 0) {
        target.hitFlash = Math.max(0, target.hitFlash - dt);
      }

      if (target.frozen) {
        target.frozenTime -= dt;
        if (target.frozenTime <= 0) {
          target.frozen = false;
          target.frozenTime = 0;
        }
      } else {
        target.x -= target.speed;
      }

      if (target.burning) {
        target.burnTime -= dt;
        if (target.burnTime > 0) {
          const dotDamage = target.burnDamage * dt;
          target.hp -= dotDamage;
          dotEvents.push({
            targetId: target.id,
            amount: dotDamage,
            isDot: true,
          });
          if (target.hp <= 0) {
            this.spawnExplosion(target.x, target.y, TARGET_COLOR);
          }
        } else {
          target.burning = false;
          target.burnTime = 0;
          target.burnDamage = 0;
        }
      }
    }

    this.targets = this.targets.filter((t) => t.hp > 0 && t.x + t.radius > -20);

    for (const particle of this.particles) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);

    for (const effect of this.skillEffects) {
      effect.life += dt;
      const t = Math.min(1, effect.life / effect.maxLife);
      effect.radius = effect.maxRadius * t;
    }
    this.skillEffects = this.skillEffects.filter((e) => e.life < e.maxLife);

    return dotEvents;
  }

  getTargetAt(x: number, y: number): Target | null {
    for (const target of this.targets) {
      const dx = target.x - x;
      const dy = target.y - y;
      if (dx * dx + dy * dy <= target.radius * target.radius) {
        return target;
      }
    }
    return null;
  }

  getTargetColor(): string {
    return TARGET_COLOR;
  }
}
