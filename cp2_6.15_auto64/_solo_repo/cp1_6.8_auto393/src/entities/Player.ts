import { ParticleSystem } from '../effects/ParticleSystem';

export type PlayerState = 'idle' | 'run' | 'attack' | 'heavy' | 'block' | 'hurt' | 'ultimate';
export type AttackType = 'light' | 'heavy' | 'ultimate';

export interface PlayerStats {
  combo: number;
  health: number;
  maxHealth: number;
  swordEnergy: number;
  maxSwordEnergy: number;
}

export class Player {
  x: number = 200;
  y: number = 0;
  width: number = 40;
  height: number = 70;
  vx: number = 0;
  vy: number = 0;
  facing: number = 1;
  grounded: boolean = false;

  state: PlayerState = 'idle';
  stateTimer: number = 0;
  attackComboStep: number = 0;

  combo: number = 0;
  comboTimer: number = 0;
  comboDecayTime: number = 2.0;

  health: number = 3;
  maxHealth: number = 3;
  invincible: number = 0;

  swordEnergy: number = 0;
  maxSwordEnergy: number = 100;
  isCharging: boolean = false;
  chargeTime: number = 0;

  moveSpeed: number = 280;
  jumpForce: number = -520;
  gravity: number = 1400;
  attackDuration: number = 0.25;
  heavyDuration: number = 0.45;
  blockDuration: number = 0.4;
  hurtDuration: number = 0.3;
  ultimateDuration: number = 0.8;

  trailTimer: number = 0;
  lightParticleTimer: number = 0;

  hasHitThisAttack: boolean = false;
  attackHitbox: { x: number; y: number; w: number; h: number } | null = null;

  get stats(): PlayerStats {
    return {
      combo: this.combo,
      health: this.health,
      maxHealth: this.maxHealth,
      swordEnergy: this.swordEnergy,
      maxSwordEnergy: this.maxSwordEnergy,
    };
  }

  update(dt: number, keys: Set<string>, particles: ParticleSystem, canvasWidth: number, groundY: number): void {
    if (this.invincible > 0) this.invincible -= dt;
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }

    this.stateTimer -= dt;

    switch (this.state) {
      case 'idle':
      case 'run': {
        let moveDir = 0;
        if (keys.has('a') || keys.has('arrowleft')) moveDir -= 1;
        if (keys.has('d') || keys.has('arrowright')) moveDir += 1;

        if (moveDir !== 0) {
          this.facing = moveDir;
          this.vx = moveDir * this.moveSpeed;
          this.state = 'run';
        } else {
          this.vx = 0;
          this.state = 'idle';
        }

        if (keys.has('j')) {
          this.startAttack('light', particles);
        } else if (keys.has('k')) {
          this.startAttack('heavy', particles);
        } else if (keys.has('l')) {
          this.startBlock();
        } else if (keys.has('u') && this.swordEnergy >= this.maxSwordEnergy) {
          this.startUltimate(particles);
        }

        if ((keys.has('w') || keys.has('arrowup') || keys.has(' ')) && this.grounded) {
          this.vy = this.jumpForce;
          this.grounded = false;
        }

        if (keys.has('i') && this.grounded) {
          this.isCharging = true;
          this.chargeTime += dt;
          this.swordEnergy = Math.min(this.maxSwordEnergy, this.swordEnergy + dt * 25);
        } else {
          if (this.isCharging && this.chargeTime > 0.3) {
            this.swordEnergy = Math.min(this.maxSwordEnergy, this.swordEnergy + this.chargeTime * 15);
          }
          this.isCharging = false;
          this.chargeTime = 0;
        }
        break;
      }
      case 'attack': {
        this.vx *= 0.85;
        if (this.stateTimer <= 0) {
          this.state = 'idle';
          this.hasHitThisAttack = false;
        }
        break;
      }
      case 'heavy': {
        this.vx *= 0.8;
        if (this.stateTimer <= 0) {
          this.state = 'idle';
          this.hasHitThisAttack = false;
        }
        break;
      }
      case 'block': {
        this.vx *= 0.7;
        if (this.stateTimer <= 0) {
          this.state = 'idle';
        }
        break;
      }
      case 'hurt': {
        this.vx *= 0.9;
        if (this.stateTimer <= 0) {
          this.state = 'idle';
        }
        break;
      }
      case 'ultimate': {
        this.vx = 0;
        if (this.stateTimer <= 0) {
          this.state = 'idle';
          this.hasHitThisAttack = false;
        }
        break;
      }
    }

    if (!this.grounded) {
      this.vy += this.gravity * dt;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.y + this.height >= groundY) {
      this.y = groundY - this.height;
      this.vy = 0;
      this.grounded = true;
    }

    if (this.x < 0) this.x = 0;
    if (this.x + this.width > canvasWidth) this.x = canvasWidth - this.width;

    if (this.swordEnergy >= this.maxSwordEnergy * 0.5) {
      this.lightParticleTimer -= dt;
      if (this.lightParticleTimer <= 0) {
        this.lightParticleTimer = 0.15;
        particles.emitLightPoints(this.x + this.width / 2, this.y + this.height / 2, 3);
      }
    }

    if (this.state === 'run' || this.state === 'attack' || this.state === 'heavy') {
      this.trailTimer -= dt;
      if (this.trailTimer <= 0) {
        this.trailTimer = 0.05;
        particles.emitSwordTrail(this.x + this.width / 2, this.y + this.height / 2, this.facing);
      }
    }

    this.updateHitbox();
  }

  private startAttack(type: 'light' | 'heavy', particles: ParticleSystem): void {
    if (type === 'light') {
      this.state = 'attack';
      this.stateTimer = this.attackDuration;
      this.attackComboStep = (this.attackComboStep + 1) % 3;
    } else {
      this.state = 'heavy';
      this.stateTimer = this.heavyDuration;
      this.attackComboStep = 0;
    }
    this.hasHitThisAttack = false;
    const dir = this.facing;
    const cx = this.x + this.width / 2 + dir * 30;
    const cy = this.y + this.height / 2;
    particles.emitInkBurst(cx, cy, 8, dir === 1 ? 0 : Math.PI);
  }

  private startBlock(): void {
    this.state = 'block';
    this.stateTimer = this.blockDuration;
  }

  private startUltimate(particles: ParticleSystem): void {
    this.state = 'ultimate';
    this.stateTimer = this.ultimateDuration;
    this.swordEnergy = 0;
    this.hasHitThisAttack = false;
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;
    particles.emitSplashFan(cx, cy, this.facing, 30);
    particles.emitRipple(cx, cy);
  }

  private updateHitbox(): void {
    if (this.state === 'attack') {
      const reach = 55 + this.attackComboStep * 10;
      this.attackHitbox = {
        x: this.facing === 1 ? this.x + this.width : this.x - reach,
        y: this.y + 5,
        w: reach,
        h: this.height - 10,
      };
    } else if (this.state === 'heavy') {
      this.attackHitbox = {
        x: this.facing === 1 ? this.x + this.width : this.x - 70,
        y: this.y - 10,
        w: 70,
        h: this.height + 20,
      };
    } else if (this.state === 'ultimate') {
      this.attackHitbox = {
        x: this.x - 80,
        y: this.y - 30,
        w: this.width + 160,
        h: this.height + 60,
      };
    } else {
      this.attackHitbox = null;
    }
  }

  takeDamage(particles: ParticleSystem): boolean {
    if (this.invincible > 0) return false;
    if (this.state === 'block') {
      particles.emitShieldBurst(this.x + this.width / 2, this.y + this.height / 2);
      this.swordEnergy = Math.min(this.maxSwordEnergy, this.swordEnergy + 10);
      return false;
    }
    this.health -= 1;
    this.invincible = 1.0;
    this.state = 'hurt';
    this.stateTimer = this.hurtDuration;
    this.vx = -this.facing * 150;
    this.vy = -200;
    this.grounded = false;
    this.combo = 0;
    return true;
  }

  onHitEnemy(type: AttackType, particles: ParticleSystem): void {
    if (this.hasHitThisAttack) return;
    this.hasHitThisAttack = true;
    this.combo += 1;
    this.comboTimer = this.comboDecayTime;
    const energyGain = type === 'light' ? 8 : type === 'heavy' ? 15 : 0;
    this.swordEnergy = Math.min(this.maxSwordEnergy, this.swordEnergy + energyGain);
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    const flash = this.invincible > 0 && Math.sin(this.invincible * 20) > 0;

    if (flash) {
      ctx.globalAlpha = 0.5;
    }

    ctx.shadowColor = 'rgba(180,210,255,0.6)';
    ctx.shadowBlur = 12;
    ctx.strokeStyle = 'rgba(200,220,255,0.7)';
    ctx.lineWidth = 1.5;

    const bx = this.x;
    const by = this.y;

    ctx.fillStyle = '#0a0a0a';
    ctx.beginPath();
    ctx.ellipse(bx + this.width / 2, by + 8, 10, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(bx + this.width / 2 - 2, by + 16);
    ctx.lineTo(bx + this.width / 2 + 2, by + 16);
    ctx.lineTo(bx + this.width / 2 + 4, by + 45);
    ctx.lineTo(bx + this.width / 2 - 4, by + 45);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(bx + this.width / 2, by + 18);
    ctx.lineTo(bx + this.width / 2 + this.facing * 18, by + 25);
    ctx.lineTo(bx + this.width / 2 + this.facing * 20, by + 35);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(bx + this.width / 2 - 2, by + 45);
    ctx.lineTo(bx + this.width / 2 - 8, by + this.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(bx + this.width / 2 + 2, by + 45);
    ctx.lineTo(bx + this.width / 2 + 8, by + this.height);
    ctx.stroke();

    if (this.state === 'attack' || this.state === 'heavy' || this.state === 'ultimate') {
      const swordAngle = this.facing === 1 ? -0.5 : Math.PI + 0.5;
      const sx = bx + this.width / 2 + this.facing * 18;
      const sy = by + 22;
      const sLen = this.state === 'ultimate' ? 60 : this.state === 'heavy' ? 50 : 40;
      const swingOffset = this.stateTimer * 6 * this.facing;

      ctx.strokeStyle = 'rgba(200,220,255,0.9)';
      ctx.shadowColor = 'rgba(100,180,255,0.8)';
      ctx.shadowBlur = 15;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(
        sx + Math.cos(swordAngle + swingOffset) * sLen * this.facing,
        sy + Math.sin(swordAngle + swingOffset) * sLen,
      );
      ctx.stroke();
    }

    if (this.state === 'block') {
      ctx.strokeStyle = 'rgba(255,215,0,0.6)';
      ctx.shadowColor = 'rgba(255,215,0,0.5)';
      ctx.shadowBlur = 20;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(bx + this.width / 2, by + this.height / 2, 30, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }
}
