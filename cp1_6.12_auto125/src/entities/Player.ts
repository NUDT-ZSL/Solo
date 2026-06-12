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
  public currentHitboxes: Hitbox[] = [];
  public hitEnemies: Set<number> = new Set();
  public animFrame: number = 0;
  public animTimer: number = 0;

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
  }

  private rectIntersect(
    ax: number, ay: number, aw: number, ah: number,
    bx: number, by: number, bw: number, bh: number
  ): boolean {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  private startAttack(type: AttackType): void