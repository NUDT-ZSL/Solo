import type { Platform, Enemy, FragmentDrop, Trap, ExitPortal } from './DungeonGenerator';
import type { SkillTreeManager, ActiveSkillBoost } from './SkillTreeManager';

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  damage: number;
  lifetime: number;
  fromPlayer: boolean;
  hitEnemies: Set<number>;
  trail: { x: number; y: number; alpha: number }[];
  color: string;
  hasBurn: boolean;
  hasFreeze: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  lifetime: number;
  maxLifetime: number;
  size: number;
  color: string;
  alpha: number;
}

export type PlayerState = 'idle' | 'run' | 'jump' | 'fall' | 'attack' | 'dash' | 'hurt' | 'dead';

export class PlayerController {
  x: number = 100;
  y: number = 400;
  width: number = 36;
  height: number = 56;
  vx: number = 0;
  vy: number = 0;
  speed: number = 280;
  jumpForce: number = -520;
  gravity: number = 1400;
  facingRight: boolean = true;
  grounded: boolean = false;
  wallSliding: boolean = false;

  hp: number = 100;
  maxHp: number = 100;
  alive: boolean = true;
  invincible: boolean = false;
  invincibleTimer: number = 0;
  shadowWalkTimer: number = 0;
  hurtCooldown: number = 0;

  state: PlayerState = 'idle';
  attackCombo: number = 0;
  attackTimer: number = 0;
  attackCooldown: number = 0;
  comboWindow: number = 0;
  isAttacking: boolean = false;

  dashTimer: number = 0;
  dashCooldown: number = 0;
  isDashing: boolean = false;
  dashDirection: number = 1;

  projectiles: Projectile[] = [];
  shootCooldown: number = 0;

  particles: Particle[] = [];

  animFrame: number = 0;
  animTimer: number = 0;

  chaosFragments: number = 0;
  currentLevel: number = 1;

  private keys: Set<string> = new Set();
  private justPressed: Set<string> = new Set();
  private skillBoosts: ActiveSkillBoost;
  private skillManager: SkillTreeManager;

  constructor(skillManager: SkillTreeManager) {
    this.skillManager = skillManager;
    this.skillBoosts = skillManager.getActiveBoosts();
    this.setupInput();
  }

  private setupInput(): void {
    window.addEventListener('keydown', (e) => {
      if (!this.keys.has(e.code)) {
        this.justPressed.add(e.code);
      }
      this.keys.add(e.code);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyJ', 'KeyK', 'KeyL'].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });
  }

  refreshBoosts(): void {
    this.skillBoosts = this.skillManager.getActiveBoosts();
  }

  update(dt: number, platforms: Platform[], enemies: Enemy[], traps: Trap[]): void {
    if (!this.alive) return;

    this.skillBoosts = this.skillManager.getActiveBoosts();
    const moveSpeed = this.speed * this.skillBoosts.speedMultiplier;

    if (this.invincibleTimer > 0) {
      this.invincibleTimer -= dt;
      if (this.invincibleTimer <= 0) {
        this.invincible = false;
      }
    }

    if (this.shadowWalkTimer > 0) {
      this.shadowWalkTimer -= dt;
    }

    if (this.hurtCooldown > 0) {
      this.hurtCooldown -= dt;
    }

    if (this.isDashing) {
      this.dashTimer -= dt;
      if (this.dashTimer <= 0) {
        this.isDashing = false;
        this.vx = 0;
      } else {
        this.vx = this.dashDirection * this.skillBoosts.dashDistance * 3;
        this.vy = 0;
      }
    } else {
      let moveX = 0;
      if (this.keys.has('ArrowLeft') || this.keys.has('KeyA')) moveX -= 1;
      if (this.keys.has('ArrowRight') || this.keys.has('KeyD')) moveX += 1;

      if (moveX !== 0) {
        this.facingRight = moveX > 0;
        this.vx = moveX * moveSpeed;
      } else {
        this.vx = 0;
      }

      if (this.justPressed.has('Space') || this.justPressed.has('ArrowUp') || this.justPressed.has('KeyW')) {
        if (this.grounded) {
          this.vy = this.jumpForce;
          this.grounded = false;
          this.spawnParticleBurst(this.x + this.width / 2, this.y + this.height, 5, '#8b5cf6');
        }
      }

      if (this.justPressed.has('KeyK') || this.justPressed.has('ShiftLeft') || this.justPressed.has('ShiftRight')) {
        if (this.dashCooldown <= 0) {
          this.isDashing = true;
          this.dashTimer = 0.15;
          this.dashDirection = this.facingRight ? 1 : -1;
          this.dashCooldown = this.skillBoosts.dashCooldown;
          this.invincible = true;
          this.invincibleTimer = 0.15;
          if (this.skillBoosts.hasShadowWalk) {
            this.shadowWalkTimer = this.skillBoosts.shadowWalkDuration;
          }
          this.spawnParticleBurst(this.x + this.width / 2, this.y + this.height / 2, 8, '#a78bfa');
        }
      }

      if (this.justPressed.has('KeyJ')) {
        if (this.attackCooldown <= 0) {
          this.performAttack();
        }
      }

      if (this.justPressed.has('KeyL')) {
        if (this.shootCooldown <= 0) {
          this.performRangedAttack();
        }
      }
    }

    if (this.attackTimer > 0) {
      this.attackTimer -= dt;
      if (this.attackTimer <= 0) {
        this.isAttacking = false;
        this.comboWindow = 0.3;
      }
    }

    if (this.comboWindow > 0) {
      this.comboWindow -= dt;
      if (this.comboWindow <= 0) {
        this.attackCombo = 0;
      }
    }

    if (this.dashCooldown > 0) this.dashCooldown -= dt;
    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;

    if (!this.grounded && !this.isDashing) {
      this.vy += this.gravity * dt;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    this.resolveCollisions(platforms);
    this.checkTraps(traps, dt);

    this.updateState();
    this.updateAnimation(dt);
    this.updateProjectiles(dt, enemies);
    this.updateParticles(dt);
    this.collectNearbyFragments();

    this.justPressed.clear();
  }

  private performAttack(): void {
    this.isAttacking = true;
    this.attackTimer = 0.2;
    this.attackCooldown = 0.15;
    this.attackCombo = (this.attackCombo + 1) % this.skillBoosts.comboLength;

    const attackRange = 55;
    const attackX = this.facingRight ? this.x + this.width : this.x - attackRange;
    const attackY = this.y + 5;
    const attackW = attackRange;
    const attackH = this.height - 10;
    const damage = Math.round((15 + this.attackCombo * 5) * this.skillBoosts.damageMultiplier);

    this.spawnParticleBurst(
      this.facingRight ? this.x + this.width + 15 : this.x - 15,
      this.y + this.height / 2,
      6,
      this.attackCombo === this.skillBoosts.comboLength - 1 ? '#f59e0b' : '#c084fc'
    );

    return { attackX, attackY, attackW, attackH, damage } as any;
  }

  getAttackHitbox(): { x: number; y: number; w: number; h: number; damage: number } | null {
    if (!this.isAttacking || this.attackTimer < 0.1) return null;
    const attackRange = 55;
    return {
      x: this.facingRight ? this.x + this.width : this.x - attackRange,
      y: this.y + 5,
      w: attackRange,
      h: this.height - 10,
      damage: Math.round((15 + this.attackCombo * 5) * this.skillBoosts.damageMultiplier),
    };
  }

  private performRangedAttack(): void {
    this.shootCooldown = 0.4;
    const dir = this.facingRight ? 1 : -1;
    const count = this.skillBoosts.projectileCount;
    const spread = count > 1 ? 0.15 : 0;

    for (let i = 0; i < count; i++) {
      const angle = spread > 0 ? (i - (count - 1) / 2) * spread : 0;
      const pvx = Math.cos(angle) * 500 * dir;
      const pvy = Math.sin(angle) * 500;
      this.projectiles.push({
        x: this.x + this.width / 2 + dir * 20,
        y: this.y + this.height / 3,
        vx: pvx,
        vy: pvy,
        width: 12,
        height: 6,
        damage: Math.round(12 * this.skillBoosts.damageMultiplier * this.skillBoosts.projectileDamage),
        lifetime: 2,
        fromPlayer: true,
        hitEnemies: new Set(),
        trail: [],
        color: this.skillBoosts.hasBurn ? '#ef4444' : this.skillBoosts.hasFreeze ? '#38bdf8' : '#a78bfa',
        hasBurn: this.skillBoosts.hasBurn,
        hasFreeze: this.skillBoosts.hasFreeze,
      });
    }

    this.spawnParticleBurst(this.x + this.width / 2 + dir * 20, this.y + this.height / 3, 3, '#c084fc');
  }

  private updateProjectiles(dt: number, enemies: Enemy[]): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.lifetime -= dt;

      p.trail.push({ x: p.x + p.width / 2, y: p.y + p.height / 2, alpha: 1 });
      if (p.trail.length > 10) p.trail.shift();
      for (const t of p.trail) t.alpha -= dt * 3;

      if (p.fromPlayer) {
        for (const enemy of enemies) {
          if (!enemy.alive || p.hitEnemies.has(enemy.hp)) continue;
          if (this.rectOverlap(p.x, p.y, p.width, p.height, enemy.x, enemy.y, enemy.width, enemy.height)) {
            p.hitEnemies.add(enemy.hp);
            p.lifetime = 0;
            break;
          }
        }
      }

      if (p.lifetime <= 0 || p.x < -50 || p.x > 3500 || p.y < -50 || p.y > 900) {
        this.projectiles.splice(i, 1);
      }
    }
  }

  private resolveCollisions(platforms: Platform[]): void {
    this.grounded = false;
    this.wallSliding = false;

    for (const p of platforms) {
      if (!this.rectOverlap(this.x, this.y, this.width, this.height, p.x, p.y, p.width, p.height)) continue;

      const overlapLeft = (this.x + this.width) - p.x;
      const overlapRight = (p.x + p.width) - this.x;
      const overlapTop = (this.y + this.height) - p.y;
      const overlapBottom = (p.y + p.height) - this.y;

      const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

      if (minOverlap === overlapTop && this.vy >= 0) {
        this.y = p.y - this.height;
        this.vy = 0;
        this.grounded = true;
      } else if (minOverlap === overlapBottom && this.vy < 0) {
        this.y = p.y + p.height;
        this.vy = 0;
      } else if (minOverlap === overlapLeft) {
        this.x = p.x - this.width;
        if (!this.grounded && this.vy > 0 && p.type === 'wall') {
          this.wallSliding = true;
          this.vy = Math.min(this.vy, 60);
        }
      } else if (minOverlap === overlapRight) {
        this.x = p.x + p.width;
        if (!this.grounded && this.vy > 0 && p.type === 'wall') {
          this.wallSliding = true;
          this.vy = Math.min(this.vy, 60);
        }
      }
    }

    if (this.x < 0) this.x = 0;
    if (this.x > 3200 - this.width) this.x = 3200 - this.width;
    if (this.y > 800) {
      this.takeDamage(30);
      this.y = 100;
      this.vy = 0;
    }
  }

  private checkTraps(traps: Trap[], dt: number): void {
    for (const trap of traps) {
      trap.timer -= dt;
      if (trap.timer <= 0) {
        trap.active = !trap.active;
        trap.timer = trap.interval;
      }
      if (trap.active && this.rectOverlap(this.x, this.y, this.width, this.height, trap.x, trap.y, trap.width, trap.height)) {
        this.takeDamage(trap.damage * dt * 3);
      }
    }
  }

  takeDamage(amount: number): void {
    if (this.invincible || this.shadowWalkTimer > 0 || !this.alive) return;
    const finalDamage = amount / this.skillBoosts.defenseMultiplier;
    this.hp -= finalDamage;
    this.invincible = true;
    this.invincibleTimer = 0.8;
    this.hurtCooldown = 0.3;
    this.state = 'hurt';
    this.spawnParticleBurst(this.x + this.width / 2, this.y + this.height / 2, 8, '#ef4444');

    if (this.hp <= 0) {
      if (this.skillManager.hasPhoenixRevive()) {
        this.skillManager.usePhoenixRevive();
        this.hp = this.maxHp * 0.5;
        this.spawnParticleBurst(this.x + this.width / 2, this.y + this.height / 2, 20, '#f59e0b');
      } else {
        this.hp = 0;
        this.alive = false;
        this.state = 'dead';
      }
    }
  }

  heal(amount: number): void {
    if (!this.alive) return;
    this.hp = Math.min(this.hp + amount, this.maxHp);
  }

  private collectNearbyFragments(): void {
    // handled externally via game engine
  }

  tryCollectFragment(drop: FragmentDrop): boolean {
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;
    const dx = cx - drop.x;
    const dy = cy - drop.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 50) {
      this.chaosFragments += drop.value;
      this.skillManager.addFragments(drop.value);
      drop.collected = true;
      this.spawnParticleBurst(drop.x, drop.y, 4, '#a78bfa');
      return true;
    }
    return false;
  }

  checkExitPortal(portal: ExitPortal): boolean {
    if (!portal.active) return false;
    return this.rectOverlap(
      this.x, this.y, this.width, this.height,
      portal.x, portal.y, portal.width, portal.height
    );
  }

  private rectOverlap(x1: number, y1: number, w1: number, h1: number, x2: number, y2: number, w2: number, h2: number): boolean {
    return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
  }

  private updateState(): void {
    if (this.state === 'dead') return;
    if (this.hurtCooldown > 0) return;
    if (this.isDashing) { this.state = 'dash'; return; }
    if (this.isAttacking) { this.state = 'attack'; return; }
    if (!this.grounded) {
      this.state = this.vy < 0 ? 'jump' : 'fall';
    } else if (Math.abs(this.vx) > 10) {
      this.state = 'run';
    } else {
      this.state = 'idle';
    }
  }

  private updateAnimation(dt: number): void {
    this.animTimer += dt;
    if (this.animTimer > 0.1) {
      this.animTimer = 0;
      this.animFrame = (this.animFrame + 1) % 8;
    }
  }

  private spawnParticleBurst(x: number, y: number, count: number, color: string): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 150;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        lifetime: 0.3 + Math.random() * 0.5,
        maxLifetime: 0.8,
        size: 2 + Math.random() * 4,
        color,
        alpha: 1,
      });
    }
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 200 * dt;
      p.lifetime -= dt;
      p.alpha = Math.max(0, p.lifetime / p.maxLifetime);
      if (p.lifetime <= 0) this.particles.splice(i, 1);
    }
  }

  render(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number): void {
    const sx = this.x - cameraX;
    const sy = this.y - cameraY;

    ctx.save();

    if (this.invincible && Math.floor(this.invincibleTimer * 15) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }

    if (this.shadowWalkTimer > 0) {
      ctx.globalAlpha = 0.3;
      ctx.shadowColor = '#8b5cf6';
      ctx.shadowBlur = 20;
    }

    if (!this.facingRight) {
      ctx.translate(sx + this.width / 2, 0);
      ctx.scale(-1, 1);
      ctx.translate(-(sx + this.width / 2), 0);
    }

    const bodyColor = this.state === 'hurt' ? '#ff6b6b' : '#2d1b4e';
    const armorColor = '#4a1a6b';
    const eyeColor = this.shadowWalkTimer > 0 ? '#8b5cf6' : '#c084fc';

    ctx.fillStyle = bodyColor;
    ctx.fillRect(sx + 6, sy + 16, 24, 28);

    ctx.fillStyle = armorColor;
    ctx.fillRect(sx + 8, sy + 18, 20, 10);

    ctx.fillStyle = '#1a0a2e';
    ctx.beginPath();
    ctx.arc(sx + this.width / 2, sy + 10, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = eyeColor;
    ctx.shadowColor = eyeColor;
    ctx.shadowBlur = 8;
    ctx.fillRect(sx + 13, sy + 7, 4, 3);
    ctx.fillRect(sx + 20, sy + 7, 4, 3);

    ctx.shadowBlur = 0;

    ctx.fillStyle = armorColor;
    ctx.fillRect(sx + 4, sy + 44, 12, 12);
    ctx.fillRect(sx + 20, sy + 44, 12, 12);

    if (this.isAttacking) {
      const weaponColor = this.attackCombo === this.skillBoosts.comboLength - 1 ? '#f59e0b' : '#c084fc';
      ctx.fillStyle = weaponColor;
      ctx.shadowColor = weaponColor;
      ctx.shadowBlur = 12;
      const swordX = sx + this.width - 2;
      const swordY = sy + 20;
      ctx.fillRect(swordX, swordY - 2, 20, 4);
      ctx.fillRect(swordX - 4, swordY - 6, 4, 12);
      ctx.shadowBlur = 0;
    }

    ctx.restore();

    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x - cameraX, p.y - cameraY, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const proj of this.projectiles) {
      const px = proj.x - cameraX;
      const py = proj.y - cameraY;

      for (const t of proj.trail) {
        if (t.alpha > 0) {
          ctx.save();
          ctx.globalAlpha = t.alpha * 0.5;
          ctx.fillStyle = proj.color;
          ctx.beginPath();
          ctx.arc(t.x - cameraX, t.y - cameraY, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      ctx.save();
      ctx.fillStyle = proj.color;
      ctx.shadowColor = proj.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.ellipse(px + proj.width / 2, py + proj.height / 2, proj.width / 2, proj.height / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  reset(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.hp = this.maxHp;
    this.alive = true;
    this.state = 'idle';
    this.attackCombo = 0;
    this.attackTimer = 0;
    this.attackCooldown = 0;
    this.isAttacking = false;
    this.isDashing = false;
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.invincible = false;
    this.invincibleTimer = 0;
    this.shadowWalkTimer = 0;
    this.hurtCooldown = 0;
    this.projectiles = [];
    this.particles = [];
    this.chaosFragments = 0;
  }
}
