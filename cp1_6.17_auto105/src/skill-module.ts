export type SkillId = 'fireball' | 'frost' | 'lightning';

export interface SkillState {
  id: SkillId;
  name: string;
  cooldown: number;
  currentCooldown: number;
  ready: boolean;
  flashing: boolean;
  flashTimer: number;
  color: string;
  key: string;
}

export interface FireballEffect {
  id: number;
  type: 'fireball';
  x: number;
  y: number;
  vx: number;
  vy: number;
  traveled: number;
  maxDistance: number;
  radius: number;
  explosionRadius: number;
  damage: number;
  particles: FireParticle[];
  exploded: boolean;
  explosionTimer: number;
  hitEnemies: Set<number>;
}

export interface FireParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  radius: number;
  color: string;
}

export interface FrostEffect {
  id: number;
  type: 'frost';
  x: number;
  y: number;
  radius: number;
  duration: number;
  life: number;
  slowFactor: number;
  slowDuration: number;
  damage: number;
  hitEnemies: Set<number>;
  maxLife: number;
}

export interface LightningEffect {
  id: number;
  type: 'lightning';
  segments: { from: { x: number; y: number }; to: { x: number; y: number } }[];
  bounces: number;
  maxBounces: number;
  bounceInterval: number;
  timeSinceLastBounce: number;
  currentTarget: number | null;
  hitEnemies: Set<number>;
  damage: number;
  life: number;
  maxLife: number;
  startX: number;
  startY: number;
  completed: boolean;
}

export type SkillEffect = FireballEffect | FrostEffect | LightningEffect;

export interface SkillHitData {
  skillId: SkillId;
  effectId: number;
  enemyIds: number[];
  damage: number;
  x: number;
  y: number;
  radius?: number;
  slowFactor?: number;
  slowDuration?: number;
}

export type SkillEventName =
  | 'skill:hit'
  | 'skill:cooldown-update'
  | 'skill:cast'
  | 'skill:effects-update';

export interface SkillEvents {
  'skill:hit': (data: SkillHitData) => void;
  'skill:cooldown-update': (states: SkillState[]) => void;
  'skill:cast': (skillId: SkillId) => void;
  'skill:effects-update': (effects: SkillEffect[]) => void;
}

export interface EnemyForCollision {
  id: number;
  x: number;
  y: number;
  size: number;
}

export class SkillModule {
  private listeners: Map<SkillEventName, Set<Function>> = new Map();
  private skills: Map<SkillId, SkillState> = new Map();
  private effects: SkillEffect[] = [];
  private effectIdCounter: number = 0;
  private playerDirection: { x: number; y: number } = { x: 1, y: 0 };

  constructor() {
    for (const name of [
      'skill:hit',
      'skill:cooldown-update',
      'skill:cast',
      'skill:effects-update'
    ] as SkillEventName[]) {
      this.listeners.set(name, new Set());
    }

    this.skills.set('fireball', {
      id: 'fireball',
      name: '火球',
      cooldown: 3000,
      currentCooldown: 0,
      ready: true,
      flashing: false,
      flashTimer: 0,
      color: '#FFD700',
      key: 'J'
    });
    this.skills.set('frost', {
      id: 'frost',
      name: '冰霜光环',
      cooldown: 5000,
      currentCooldown: 0,
      ready: true,
      flashing: false,
      flashTimer: 0,
      color: '#3498DB',
      key: 'K'
    });
    this.skills.set('lightning', {
      id: 'lightning',
      name: '闪电链',
      cooldown: 8000,
      currentCooldown: 0,
      ready: true,
      flashing: false,
      flashTimer: 0,
      color: '#9B59B6',
      key: 'L'
    });
  }

  on<K extends SkillEventName>(event: K, callback: SkillEvents[K]): void {
    this.listeners.get(event)?.add(callback as Function);
  }

  off<K extends SkillEventName>(event: K, callback: SkillEvents[K]): void {
    this.listeners.get(event)?.delete(callback as Function);
  }

  private emit<K extends SkillEventName>(event: K, ...args: Parameters<SkillEvents[K]>): void {
    this.listeners.get(event)?.forEach(cb => (cb as Function)(...args));
  }

  setPlayerDirection(dx: number, dy: number): void {
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0.01) {
      this.playerDirection = { x: dx / len, y: dy / len };
    }
  }

  castSkill(skillId: SkillId, playerX: number, playerY: number): boolean {
    const skill = this.skills.get(skillId);
    if (!skill || !skill.ready) return false;

    skill.ready = false;
    skill.currentCooldown = skill.cooldown;
    skill.flashing = true;
    skill.flashTimer = 300;

    this.emit('skill:cast', skillId);
    this.createSkillEffect(skillId, playerX, playerY);
    this.emitCooldownUpdate();
    return true;
  }

  private createSkillEffect(skillId: SkillId, playerX: number, playerY: number): void {
    const id = ++this.effectIdCounter;
    switch (skillId) {
      case 'fireball': {
        const speed = 400;
        const fireball: FireballEffect = {
          id,
          type: 'fireball',
          x: playerX,
          y: playerY,
          vx: this.playerDirection.x * speed,
          vy: this.playerDirection.y * speed,
          traveled: 0,
          maxDistance: 200,
          radius: 8,
          explosionRadius: 40,
          damage: 20,
          particles: [],
          exploded: false,
          explosionTimer: 0,
          hitEnemies: new Set()
        };
        this.effects.push(fireball);
        break;
      }
      case 'frost': {
        const frost: FrostEffect = {
          id,
          type: 'frost',
          x: playerX,
          y: playerY,
          radius: 80,
          duration: 3000,
          life: 0.5,
          maxLife: 0.5,
          slowFactor: 0.5,
          slowDuration: 3000,
          damage: 10,
          hitEnemies: new Set()
        };
        this.effects.push(frost);
        break;
      }
      case 'lightning': {
        const lightning: LightningEffect = {
          id,
          type: 'lightning',
          segments: [],
          bounces: 0,
          maxBounces: 3,
          bounceInterval: 0.2,
          timeSinceLastBounce: 0,
          currentTarget: null,
          hitEnemies: new Set(),
          damage: 15,
          life: 0,
          maxLife: 0.8,
          startX: playerX,
          startY: playerY,
          completed: false
        };
        this.effects.push(lightning);
        break;
      }
    }
  }

  update(
    dt: number,
    playerX: number,
    playerY: number,
    enemies: EnemyForCollision[],
    isWalkable: (x: number, y: number, r: number) => boolean
  ): void {
    const dtMs = dt * 1000;

    for (const skill of this.skills.values()) {
      if (!skill.ready) {
        skill.currentCooldown = Math.max(0, skill.currentCooldown - dtMs);
        if (skill.currentCooldown <= 0) {
          skill.ready = true;
        }
      }
      if (skill.flashing) {
        skill.flashTimer = Math.max(0, skill.flashTimer - dtMs);
        if (skill.flashTimer <= 0) {
          skill.flashing = false;
        }
      }
    }
    this.emitCooldownUpdate();

    for (let i = this.effects.length - 1; i >= 0; i--) {
      const effect = this.effects[i];
      switch (effect.type) {
        case 'fireball':
          this.updateFireball(effect, dt, enemies, isWalkable);
          break;
        case 'frost':
          this.updateFrost(effect, dt, enemies);
          break;
        case 'lightning':
          this.updateLightning(effect, dt, playerX, playerY, enemies);
          break;
      }
    }

    this.effects = this.effects.filter(e => {
      if (e.type === 'fireball') {
        return !e.exploded || e.explosionTimer > 0;
      }
      if (e.type === 'frost') {
        return e.life > 0;
      }
      if (e.type === 'lightning') {
        return e.life < e.maxLife || !e.completed;
      }
      return false;
    });

    this.emit('skill:effects-update', [...this.effects]);
  }

  private updateFireball(
    fb: FireballEffect,
    dt: number,
    enemies: EnemyForCollision[],
    isWalkable: (x: number, y: number, r: number) => boolean
  ): void {
    if (fb.exploded) {
      fb.explosionTimer -= dt;
      return;
    }

    const stepX = fb.vx * dt;
    const stepY = fb.vy * dt;
    const dist = Math.sqrt(stepX * stepX + stepY * stepY);
    fb.traveled += dist;
    fb.x += stepX;
    fb.y += stepY;

    for (let i = 0; i < 3; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 50;
      const colors = ['#FF4500', '#FF6347', '#FF8C00', '#FFA500', '#FFD700'];
      fb.particles.push({
        x: fb.x,
        y: fb.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3,
        maxLife: 0.3,
        radius: 2,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }

    for (let i = fb.particles.length - 1; i >= 0; i--) {
      const p = fb.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) fb.particles.splice(i, 1);
    }

    let shouldExplode = false;
    for (const enemy of enemies) {
      const dx = fb.x - enemy.x;
      const dy = fb.y - enemy.y;
      const half = enemy.size / 2 + fb.radius;
      if (Math.abs(dx) < half && Math.abs(dy) < half) {
        if (dx * dx + dy * dy < half * half) {
          shouldExplode = true;
          break;
        }
      }
    }

    if (!isWalkable(fb.x, fb.y, fb.radius)) {
      shouldExplode = true;
    }

    if (fb.traveled >= fb.maxDistance) {
      shouldExplode = true;
    }

    if (shouldExplode) {
      fb.exploded = true;
      fb.explosionTimer = 0.3;
      const hitIds: number[] = [];
      for (const enemy of enemies) {
        const dx = fb.x - enemy.x;
        const dy = fb.y - enemy.y;
        const half = enemy.size / 2;
        const er = fb.explosionRadius;
        if (Math.abs(dx) < er + half && Math.abs(dy) < er + half) {
          const closestX = Math.max(enemy.x - half, Math.min(fb.x, enemy.x + half));
          const closestY = Math.max(enemy.y - half, Math.min(fb.y, enemy.y + half));
          const dist2 = (fb.x - closestX) ** 2 + (fb.y - closestY) ** 2;
          if (dist2 < er * er && !fb.hitEnemies.has(enemy.id)) {
            fb.hitEnemies.add(enemy.id);
            hitIds.push(enemy.id);
          }
        }
      }
      if (hitIds.length > 0) {
        this.emit('skill:hit', {
          skillId: 'fireball',
          effectId: fb.id,
          enemyIds: hitIds,
          damage: fb.damage,
          x: fb.x,
          y: fb.y,
          radius: fb.explosionRadius
        });
      }
    }
  }

  private updateFrost(frost: FrostEffect, dt: number, enemies: EnemyForCollision[]): void {
    frost.life -= dt;
    const hitIds: number[] = [];
    for (const enemy of enemies) {
      const dx = frost.x - enemy.x;
      const dy = frost.y - enemy.y;
      const half = enemy.size / 2;
      if (Math.abs(dx) < frost.radius + half && Math.abs(dy) < frost.radius + half) {
        const closestX = Math.max(enemy.x - half, Math.min(frost.x, enemy.x + half));
        const closestY = Math.max(enemy.y - half, Math.min(frost.y, enemy.y + half));
        const dist2 = (frost.x - closestX) ** 2 + (frost.y - closestY) ** 2;
        if (dist2 < frost.radius * frost.radius && !frost.hitEnemies.has(enemy.id)) {
          frost.hitEnemies.add(enemy.id);
          hitIds.push(enemy.id);
        }
      }
    }
    if (hitIds.length > 0) {
      this.emit('skill:hit', {
        skillId: 'frost',
        effectId: frost.id,
        enemyIds: hitIds,
        damage: frost.damage,
        x: frost.x,
        y: frost.y,
        radius: frost.radius,
        slowFactor: frost.slowFactor,
        slowDuration: frost.slowDuration
      });
    }
  }

  private updateLightning(
    lt: LightningEffect,
    dt: number,
    playerX: number,
    playerY: number,
    enemies: EnemyForCollision[]
  ): void {
    lt.life += dt;
    lt.timeSinceLastBounce += dt;

    if (!lt.completed && lt.bounces < lt.maxBounces && lt.timeSinceLastBounce >= lt.bounceInterval) {
      lt.timeSinceLastBounce = 0;
      const source = lt.segments.length === 0
        ? { x: playerX, y: playerY }
        : lt.segments[lt.segments.length - 1].to;

      let nearest: EnemyForCollision | null = null;
      let nearestDist = Infinity;
      for (const enemy of enemies) {
        if (lt.hitEnemies.has(enemy.id)) continue;
        const dx = enemy.x - source.x;
        const dy = enemy.y - source.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < nearestDist && d2 < 300 * 300) {
          nearestDist = d2;
          nearest = enemy;
        }
      }

      if (nearest) {
        lt.hitEnemies.add(nearest.id);
        const seg = {
          from: { x: source.x, y: source.y },
          to: {
            x: nearest.x + (Math.random() - 0.5) * nearest.size * 0.3,
            y: nearest.y + (Math.random() - 0.5) * nearest.size * 0.3
          }
        };
        const steps = 5;
        for (let i = 0; i < steps; i++) {
          const t = (i + 1) / (steps + 1);
          const bx = seg.from.x + (seg.to.x - seg.from.x) * t;
          const by = seg.from.y + (seg.to.y - seg.from.y) * t;
          const jitter = 8;
          lt.segments.push({
            from: {
              x: i === 0 ? seg.from.x : bx - (seg.to.x - seg.from.x) / (steps + 1) + (Math.random() - 0.5) * jitter,
              y: i === 0 ? seg.from.y : by - (seg.to.y - seg.from.y) / (steps + 1) + (Math.random() - 0.5) * jitter
            },
            to: {
              x: bx + (Math.random() - 0.5) * jitter,
              y: by + (Math.random() - 0.5) * jitter
            }
          });
        }
        lt.segments.push({
          from: lt.segments[lt.segments.length - 1].to,
          to: seg.to
        });
        lt.currentTarget = nearest.id;
        lt.bounces++;
        this.emit('skill:hit', {
          skillId: 'lightning',
          effectId: lt.id,
          enemyIds: [nearest.id],
          damage: lt.damage,
          x: nearest.x,
          y: nearest.y
        });
      } else {
        lt.completed = true;
      }

      if (lt.bounces >= lt.maxBounces) {
        lt.completed = true;
      }
    }
  }

  getSkills(): SkillState[] {
    return Array.from(this.skills.values());
  }

  getEffects(): SkillEffect[] {
    return [...this.effects];
  }

  private emitCooldownUpdate(): void {
    this.emit('skill:cooldown-update', this.getSkills());
  }
}
