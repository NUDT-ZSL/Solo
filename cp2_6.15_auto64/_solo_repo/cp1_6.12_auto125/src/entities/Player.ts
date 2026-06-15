import { PlayerState, GameParams, InputState, Hitbox, AttackType, AttackPhase, PlatformData } from '../types';

const MOVE_SPEED = 250;
const MAX_JUMPS = 2;

const ATTACK_TIMINGS: Record<AttackType, { startup: number; active: number; recovery: number }> = {
  light: { startup: 0.12, active: 0.04, recovery: 0.08 },
  heavy: { startup: 0.25, active: 0.06, recovery: 0.20 },
  dash: { startup: 0.20, active: 0.15, recovery: 0.15 },
};

const ATTACK_BOXES: Record<AttackType, { width: number; height: number; offsetX: number; offsetY: number; knockback: number; dashDistance?: number }> = {
  light: { width: 40, height: 30, offsetX: 16, offsetY: 10, knockback: 0 },
  heavy: { width: 60, height: 40, offsetX: 16, offsetY: 5, knockback: 50 },
  dash: { width: 80, height: 20, offsetX: 0, offsetY: 14, knockback: 30, dashDistance: 120 },
};

export class Player {
  public state: PlayerState;
  public params: GameParams;
  public hitEnemies: Set<number> = new Set();
  public animFrame: number = 0;
  public animTimer: number = 0;
  private wasOnGround: boolean = true;

  constructor(x: number, y: number, params: GameParams) {
    this.params = params;
    this.state = {
      x,
      y,
      vx: 0,
      vy: 0,
      width: 32,
      height: 48,
      facing: 1,
      onGround: false,
      jumpsRemaining: MAX_JUMPS,
      health: 100,
      maxHealth: 100,
      isAttacking: false,
      attackPhase: 'none',
      attackType: null,
      attackTimer: 0,
      dashCooldownTimer: 0,
      isDashing: false,
      dashDistance: 0,
      invincible: false,
      invincibleTimer: 0,
    };
  }

  public update(dt: number, input: InputState, platforms: PlatformData[]): Hitbox[] {
    const s = this.state;

    if (s.invincible) {
      s.invincibleTimer -= dt;
      if (s.invincibleTimer <= 0) {
        s.invincible = false;
      }
    }

    if (s.dashCooldownTimer > 0) {
      s.dashCooldownTimer -= dt;
    }

    if (s.isAttacking) {
      this.updateAttack(dt);
    } else {
      if (input.left) {
        s.vx = -MOVE_SPEED;
        s.facing = -1;
      } else if (input.right) {
        s.vx = MOVE_SPEED;
        s.facing = 1;
      } else {
        s.vx = 0;
      }

      if (input.jumpPressed && s.jumpsRemaining > 0) {
        const jumpVelocity = -Math.sqrt(2 * this.params.gravity * (this.params.jumpHeight / 2));
        s.vy = jumpVelocity;
        s.jumpsRemaining--;
        s.onGround = false;
      }

      if (input.lightPressed) {
        this.startAttack('light');
      } else if (input.heavyPressed) {
        this.startAttack('heavy');
      } else if (input.dashPressed && s.dashCooldownTimer <= 0) {
        this.startAttack('dash');
      }
    }

    if (s.isDashing && s.attackType === 'dash') {
      const dashData = ATTACK_BOXES.dash;
      const dashSpeed = dashData.dashDistance! / ATTACK_TIMINGS.dash.active;
      s.vx = s.facing * dashSpeed;
    }

    if (!s.isDashing) {
      s.vy += this.params.gravity * dt;
      if (s.vy > 1500) s.vy = 1500;
    } else {
      s.vy = 0;
    }

    s.x += s.vx * dt;
    this.handleHorizontalCollision(platforms);

    s.y += s.vy * dt;
    this.handleVerticalCollision(platforms);

    this.updateAnim(dt);

    return this.getCurrentHitboxes();
  }

  private handleHorizontalCollision(platforms: PlatformData[]): void {
    const s = this.state;
    for (const p of platforms) {
      if (this.rectIntersect(s.x, s.y, s.width, s.height, p.x, p.y, p.width, p.height)) {
        if (s.vx > 0) {
          s.x = p.x - s.width;
        } else if (s.vx < 0) {
          s.x = p.x + p.width;
        }
        if (!p.isGround) s.vx = 0;
      }
    }
  }

  private handleVerticalCollision(platforms: PlatformData[]): void {
    const s = this.state;
    this.wasOnGround = s.onGround;
    s.onGround = false;
    for (const p of platforms) {
      if (this.rectIntersect(s.x, s.y, s.width, s.height, p.x, p.y, p.width, p.height)) {
        if (s.vy > 0) {
          s.y = p.y - s.height;
          s.vy = 0;
          s.onGround = true;
          s.jumpsRemaining = MAX_JUMPS;
        } else if (s.vy < 0) {
          s.y = p.y + p.height;
          s.vy = 0;
        }
      }
    }
    if (!s.onGround && this.wasOnGround && s.vy >= 0 && s.jumpsRemaining === MAX_JUMPS) {
      s.jumpsRemaining = MAX_JUMPS - 1;
    }
  }

  private rectIntersect(
    ax: number, ay: number, aw: number, ah: number,
    bx: number, by: number, bw: number, bh: number
  ): boolean {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  private startAttack(type: AttackType): void {
    const s = this.state;
    s.isAttacking = true;
    s.attackPhase = 'startup';
    s.attackType = type;
    s.attackTimer = ATTACK_TIMINGS[type].startup;
    s.isDashing = false;
    this.hitEnemies.clear();
  }

  private updateAttack(dt: number): void {
    const s = this.state;
    if (!s.attackType) return;

    s.attackTimer -= dt;

    if (s.attackPhase === 'startup' && s.attackTimer <= 0) {
      s.attackPhase = 'active';
      s.attackTimer = ATTACK_TIMINGS[s.attackType].active;
      if (s.attackType === 'dash') {
        s.isDashing = true;
      }
    } else if (s.attackPhase === 'active' && s.attackTimer <= 0) {
      s.attackPhase = 'recovery';
      s.attackTimer = ATTACK_TIMINGS[s.attackType].recovery;
      if (s.attackType === 'dash') {
        s.isDashing = false;
        s.dashCooldownTimer = this.params.dashCooldown;
      }
    } else if (s.attackPhase === 'recovery' && s.attackTimer <= 0) {
      s.isAttacking = false;
      s.attackPhase = 'none';
      s.attackType = null;
      s.attackTimer = 0;
      s.isDashing = false;
    }
  }

  public getCurrentHitboxes(): Hitbox[] {
    const s = this.state;
    if (!s.isAttacking || s.attackPhase !== 'active' || !s.attackType) {
      return [];
    }

    const box = ATTACK_BOXES[s.attackType];
    const hitbox: Hitbox = {
      x: s.facing === 1 ? s.x + s.width + box.offsetX : s.x - box.offsetX - box.width,
      y: s.y + box.offsetY,
      width: box.width,
      height: box.height,
      damage: this.getDamageForType(s.attackType),
      knockback: box.knockback,
      active: true,
    };

    return [hitbox];
  }

  private getDamageForType(type: AttackType): number {
    switch (type) {
      case 'light': return this.params.lightDamage;
      case 'heavy': return this.params.heavyDamage;
      case 'dash': return 20;
    }
  }

  private updateAnim(dt: number): void {
    this.animTimer += dt;
    if (this.animTimer > 0.1) {
      this.animTimer = 0;
      this.animFrame = (this.animFrame + 1) % 4;
    }
  }

  public takeDamage(amount: number): void {
    if (this.state.invincible) return;
    this.state.health -= amount;
    this.state.invincible = true;
    this.state.invincibleTimer = 1.0;
    if (this.state.health < 0) this.state.health = 0;
  }

  public isDead(): boolean {
    return this.state.health <= 0;
  }

  public reset(x: number, y: number): void {
    this.state.x = x;
    this.state.y = y;
    this.state.vx = 0;
    this.state.vy = 0;
    this.state.health = this.state.maxHealth;
    this.state.isAttacking = false;
    this.state.attackPhase = 'none';
    this.state.attackType = null;
    this.state.attackTimer = 0;
    this.state.dashCooldownTimer = 0;
    this.state.isDashing = false;
    this.state.invincible = false;
    this.state.invincibleTimer = 0;
    this.state.jumpsRemaining = MAX_JUMPS;
    this.hitEnemies.clear();
  }

  public render(ctx: CanvasRenderingContext2D): void {
    const s = this.state;
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    if (s.invincible && Math.floor(performance.now() / 100) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    const cx = s.x + s.width / 2;
    const bodyY = s.y + 12;
    const bodyH = 28;

    ctx.fillStyle = '#4A90D9';
    ctx.fillRect(s.x + 8, bodyY, 16, bodyH);

    ctx.fillStyle = '#FFD9B3';
    ctx.fillRect(s.x + 8, s.y, 16, 14);

    ctx.fillStyle = '#333';
    const eyeOffset = s.facing === 1 ? 4 : -4;
    ctx.fillRect(s.x + 16 + eyeOffset, s.y + 5, 3, 3);

    ctx.fillStyle = '#2d5a8a';
    const legOffset = Math.sin(this.animFrame * Math.PI / 2) * 3;
    if (s.onGround && Math.abs(s.vx) > 10) {
      ctx.fillRect(s.x + 8, s.y + 40, 6, 8 + legOffset);
      ctx.fillRect(s.x + 18, s.y + 40, 6, 8 - legOffset);
    } else {
      ctx.fillRect(s.x + 8, s.y + 40, 6, 8);
      ctx.fillRect(s.x + 18, s.y + 40, 6, 8);
    }

    ctx.strokeStyle = '#4A90D9';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    if (s.isAttacking && s.attackType) {
      this.renderAttack(ctx);
    } else {
      const armY = s.y + 20;
      if (s.facing === 1) {
        ctx.beginPath();
        ctx.moveTo(s.x + 22, armY);
        ctx.lineTo(s.x + 30, armY + 8);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(s.x + 10, armY);
        ctx.lineTo(s.x + 2, armY + 8);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  private renderAttack(ctx: CanvasRenderingContext2D): void {
    const s = this.state;
    if (!s.attackType) return;

    const swordX = s.facing === 1 ? s.x + s.width : s.x;
    const swordY = s.y + 18;

    ctx.save();
    ctx.translate(swordX, swordY);
    if (s.facing === -1) ctx.scale(-1, 1);

    let angle = 0;
    let swordLen = 24;

    if (s.attackPhase === 'startup') {
      const t = 1 - s.attackTimer / ATTACK_TIMINGS[s.attackType].startup;
      angle = -Math.PI / 3 + t * Math.PI / 4;
    } else if (s.attackPhase === 'active') {
      const t = s.attackTimer / ATTACK_TIMINGS[s.attackType].active;
      angle = Math.PI / 6 + t * Math.PI / 3;
      swordLen = s.attackType === 'heavy' ? 36 : s.attackType === 'dash' ? 40 : 28;
    } else if (s.attackPhase === 'recovery') {
      const t = 1 - s.attackTimer / ATTACK_TIMINGS[s.attackType].recovery;
      angle = Math.PI / 2 - t * Math.PI / 3;
    }

    ctx.rotate(angle);

    ctx.fillStyle = '#C0C0C0';
    ctx.beginPath();
    ctx.moveTo(0, -3);
    ctx.lineTo(swordLen, 0);
    ctx.lineTo(0, 3);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#E8E8E8';
    ctx.beginPath();
    ctx.moveTo(2, -1);
    ctx.lineTo(swordLen * 0.7, 0);
    ctx.lineTo(2, 1);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#8B4513';
    ctx.fillRect(-6, -4, 8, 8);

    ctx.restore();
  }
}
