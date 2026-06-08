export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PhysicsBody extends Rect {
  vx: number;
  vy: number;
  onGround: boolean;
  jumpsLeft: number;
  wasOnGround: boolean;
}

export interface CollisionResult {
  collided: boolean;
  side: 'top' | 'bottom' | 'left' | 'right' | null;
  platform: Platform | null;
}

export interface Platform extends Rect {
  type: 'platform';
}

export interface Spike extends Rect {
  type: 'spike';
}

export interface Coin extends Rect {
  type: 'coin';
  collected: boolean;
  animPhase: number;
}

export type WorldObject = Platform | Spike | Coin;

export class PhysicsEngine {
  gravity: number;
  moveAcceleration: number;
  maxSpeed: number;
  airControl: number;
  friction: number;
  jumpForce: number;
  doubleJumpForce: number;
  maxFallSpeed: number;

  constructor() {
    this.gravity = 1800;
    this.moveAcceleration = 2400;
    this.maxSpeed = 420;
    this.airControl = 0.65;
    this.friction = 1800;
    this.jumpForce = 720;
    this.doubleJumpForce = 600;
    this.maxFallSpeed = 1200;
  }

  applyInput(
    body: PhysicsBody,
    input: { left: boolean; right: boolean; jumpPressed: boolean; crouching: boolean },
    dt: number
  ): void {
    const accel = body.onGround ? this.moveAcceleration : this.moveAcceleration * this.airControl;
    const targetSpeed = input.crouching && body.onGround ? this.maxSpeed * 0.35 : this.maxSpeed;

    if (input.left && !input.right) {
      body.vx -= accel * dt;
    } else if (input.right && !input.left) {
      body.vx += accel * dt;
    } else if (body.onGround) {
      const frictionAmount = this.friction * dt;
      if (body.vx > 0) {
        body.vx = Math.max(0, body.vx - frictionAmount);
      } else if (body.vx < 0) {
        body.vx = Math.min(0, body.vx + frictionAmount);
      }
    }

    body.vx = Math.max(-targetSpeed, Math.min(targetSpeed, body.vx));

    if (input.jumpPressed && body.jumpsLeft > 0) {
      if (body.onGround) {
        body.vy = -this.jumpForce;
      } else {
        body.vy = -this.doubleJumpForce;
      }
      body.jumpsLeft--;
      body.onGround = false;
    }
  }

  integrate(body: PhysicsBody, dt: number): void {
    body.vy += this.gravity * dt;
    if (body.vy > this.maxFallSpeed) {
      body.vy = this.maxFallSpeed;
    }
    body.wasOnGround = body.onGround;
  }

  resolveCollisions(body: PhysicsBody, platforms: Platform[], dt: number): CollisionResult[] {
    const results: CollisionResult[] = [];

    body.x += body.vx * dt;
    for (const plat of platforms) {
      if (this.rectIntersect(body, plat)) {
        if (body.vx > 0) {
          body.x = plat.x - body.w;
          const isOnEdge = body.y + body.h > plat.y + 4 && body.y + body.h < plat.y + plat.h;
          if (isOnEdge) {
            body.x += 20 * dt;
          } else {
            body.vx = 0;
          }
        } else if (body.vx < 0) {
          body.x = plat.x + plat.w;
          const isOnEdge = body.y + body.h > plat.y + 4 && body.y + body.h < plat.y + plat.h;
          if (isOnEdge) {
            body.x -= 20 * dt;
          } else {
            body.vx = 0;
          }
        }
        results.push({ collided: true, side: body.vx > 0 ? 'right' : 'left', platform: plat });
      }
    }

    body.y += body.vy * dt;
    body.onGround = false;
    for (const plat of platforms) {
      if (this.rectIntersect(body, plat)) {
        if (body.vy > 0) {
          body.y = plat.y - body.h;
          body.vy = 0;
          body.onGround = true;
          body.jumpsLeft = 2;
          results.push({ collided: true, side: 'top', platform: plat });
        } else if (body.vy < 0) {
          body.y = plat.y + plat.h;
          body.vy = 0;
          results.push({ collided: true, side: 'bottom', platform: plat });
        }
      }
    }

    return results;
  }

  rectIntersect(a: Rect, b: Rect): boolean {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  checkSpikeCollision(body: PhysicsBody, spikes: Spike[]): boolean {
    const shrink = 6;
    const hitbox = {
      x: body.x + shrink,
      y: body.y + shrink,
      w: body.w - shrink * 2,
      h: body.h - shrink * 2,
    };
    for (const spike of spikes) {
      const spikeHitbox = {
        x: spike.x + 4,
        y: spike.y + 6,
        w: spike.w - 8,
        h: spike.h - 6,
      };
      if (this.rectIntersect(hitbox, spikeHitbox)) {
        return true;
      }
    }
    return false;
  }

  checkCoinCollisions(body: PhysicsBody, coins: Coin[]): Coin[] {
    const collected: Coin[] = [];
    const shrink = 4;
    const hitbox = {
      x: body.x + shrink,
      y: body.y + shrink,
      w: body.w - shrink * 2,
      h: body.h - shrink * 2,
    };
    for (const coin of coins) {
      if (!coin.collected && this.rectIntersect(hitbox, coin)) {
        coin.collected = true;
        collected.push(coin);
      }
    }
    return collected;
  }
}
