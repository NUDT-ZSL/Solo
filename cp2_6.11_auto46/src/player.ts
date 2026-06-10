import type { ParticleSystem, Bullet } from './particle';

export class Player {
  x: number;
  y: number;
  width: number = 40;
  height: number = 30;
  baseSpeed: number = 300;
  speed: number = 300;
  energy: number = 100;
  maxEnergy: number = 100;
  isCharging: boolean = false;
  chargeTime: number = 0;
  chargeThreshold: number = 0.5;
  maxChargeTime: number = 1.5;
  isInvincible: boolean = false;
  invincibleTimer: number = 0;
  lastShotTime: number = 0;
  shotInterval: number = 0.2;
  energyRegenTimer: number = 0;
  energyRegenInterval: number = 2;
  lowEnergyFlashTimer: number = 0;
  chargeRingAngle: number = 0;
  blinkTimer: number = 0;
  thrusterTimer: number = 0;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  update(dt: number, keys: Set<string>, spaceJustPressed: boolean, spaceJustReleased: boolean, particles: ParticleSystem): Omit<Bullet, 'trail' | 'isReflected' | 'reflectedAt'> | null {
    if (this.isInvincible) {
      this.invincibleTimer -= dt;
      this.blinkTimer += dt;
      if (this.invincibleTimer <= 0) {
        this.isInvincible = false;
        this.blinkTimer = 0;
      }
    }

    if (!this.isCharging) {
      this.energyRegenTimer += dt;
      if (this.energyRegenTimer >= this.energyRegenInterval) {
        this.energyRegenTimer = 0;
        this.energy = Math.min(this.energy + 1, this.maxEnergy);
      }
    }

    if (this.energy < 20) {
      this.lowEnergyFlashTimer += dt;
    } else {
      this.lowEnergyFlashTimer = 0;
    }

    if (this.isCharging) {
      this.chargeTime += dt;
      this.chargeRingAngle += dt * Math.PI * 2;
      if (this.chargeTime >= this.chargeThreshold) {
        this.chargeTime = Math.min(this.chargeTime, this.maxChargeTime);
      }
      return null;
    }

    const moveX = (keys.has('a') || keys.has('arrowleft') ? -1 : 0) + 
                  (keys.has('d') || keys.has('arrowright') ? 1 : 0);
    const moveY = (keys.has('w') || keys.has('arrowup') ? -1 : 0) + 
                  (keys.has('s') || keys.has('arrowdown') ? 1 : 0);
    
    const isAccelerating = keys.has('w') || keys.has('arrowup');
    this.speed = isAccelerating ? this.baseSpeed * 1.5 : this.baseSpeed;

    if (moveX !== 0 || moveY !== 0) {
      const len = Math.sqrt(moveX * moveX + moveY * moveY);
      this.x += (moveX / len) * this.speed * dt;
      this.y += (moveY / len) * this.speed * dt;
    }

    this.x = Math.max(this.width / 2, Math.min(window.innerWidth - this.width / 2, this.x));
    this.y = Math.max(this.height / 2, Math.min(window.innerHeight - this.height / 2, this.y));

    this.thrusterTimer += dt;
    if (this.thrusterTimer >= 0.03) {
      this.thrusterTimer = 0;
      this.spawnThrusterParticles(particles);
    }

    if (spaceJustPressed && this.energy >= 20) {
      this.isCharging = true;
      this.chargeTime = 0;
      return null;
    }

    if (keys.has(' ') && !this.isCharging) {
      const now = performance.now() / 1000;
      if (now - this.lastShotTime >= this.shotInterval) {
        this.lastShotTime = now;
        return this.shoot();
      }
    }

    return null;
  }

  private spawnThrusterParticles(particles: ParticleSystem): void {
    const count = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      const side = Math.random() < 0.5 ? -1 : 1;
      const px = this.x + side * 12;
      const py = this.y + this.height / 2;
      const pvx = (Math.random() - 0.5) * 30;
      const pvy = 80 + Math.random() * 60;
      const t = Math.random();
      const color = t < 0.5 ? '#FFD700' : '#FF6B6B';
      particles.addThrusterParticle({
        x: px,
        y: py,
        vx: pvx,
        vy: pvy,
        life: 0.5,
        maxLife: 0.5,
        color: color,
        size: 3 + Math.random() * 2
      });
    }
  }

  handleSpaceRelease(): boolean {
    if (this.isCharging && this.chargeTime >= this.maxChargeTime) {
      this.isCharging = false;
      this.chargeTime = 0;
      this.energy = Math.max(0, this.energy - 20);
      return true;
    }
    this.isCharging = false;
    this.chargeTime = 0;
    return false;
  }

  private shoot(): Omit<Bullet, 'trail' | 'isReflected' | 'reflectedAt'> {
    return {
      x: this.x,
      y: this.y - this.height / 2 - 8,
      vx: 0,
      vy: -500,
      radius: 4,
      color: '#FFB86C'
    };
  }

  startCharge(): void {
    this.isCharging = true;
    this.chargeTime = 0;
  }

  releaseCharge(): boolean {
    if (this.chargeTime >= this.maxChargeTime && this.energy >= 20) {
      this.energy -= 20;
      this.isCharging = false;
      this.chargeTime = 0;
      return true;
    }
    this.isCharging = false;
    this.chargeTime = 0;
    return false;
  }

  takeDamage(): void {
    if (this.isInvincible) return;
    this.energy = Math.max(0, this.energy - 10);
    this.isInvincible = true;
    this.invincibleTimer = 0.5;
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (this.isInvincible && Math.floor(this.blinkTimer * 10) % 2 === 0) {
      return;
    }

    ctx.save();
    ctx.translate(this.x, this.y);

    ctx.shadowColor = '#66D9EF';
    ctx.shadowBlur = 15;

    ctx.strokeStyle = '#66D9EF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -this.height / 2);
    ctx.lineTo(this.width / 2, this.height / 2);
    ctx.lineTo(this.width / 4, this.height / 3);
    ctx.lineTo(-this.width / 4, this.height / 3);
    ctx.lineTo(-this.width / 2, this.height / 2);
    ctx.closePath();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#66D9EF';
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.restore();

    if (this.isCharging && this.chargeTime >= this.chargeThreshold) {
      this.renderChargeRing(ctx);
    }
  }

  renderEnergyBar(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const barWidth = 200;
    const barHeight = 12;
    const barX = (width - barWidth) / 2;
    const barY = height - 40;
    const radius = 6;

    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth, barHeight, radius);
    ctx.fillStyle = '#333333AA';
    ctx.fill();

    const fillPercent = this.energy / this.maxEnergy;
    const fillWidth = Math.max(0, barWidth * fillPercent - 4);
    
    if (fillWidth > 0) {
      const isLowEnergy = this.energy < 20;
      
      ctx.beginPath();
      ctx.roundRect(barX + 2, barY + 2, fillWidth, barHeight - 4, radius - 2);
      
      if (isLowEnergy) {
        const flash = Math.sin(this.lowEnergyFlashTimer * 8) > 0 ? 1 : 0.5;
        const barColor = `#FF5555${Math.floor(128 + flash * 127).toString(16).padStart(2, '0')}`;
        ctx.fillStyle = barColor;
      } else {
        const gradient = ctx.createLinearGradient(barX + 2, 0, barX + barWidth - 2, 0);
        gradient.addColorStop(0, '#50FA7B');
        gradient.addColorStop(1, '#8BE9FD');
        ctx.fillStyle = gradient;
      }
      ctx.fill();
    }

    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth, barHeight, radius);
    ctx.strokeStyle = '#66D9EF66';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  renderChargeRing(ctx: CanvasRenderingContext2D): void {
    const ringRadius = 40;
    const segments = 8;
    
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.chargeRingAngle);

    const chargeProgress = (this.chargeTime - this.chargeThreshold) / (this.maxChargeTime - this.chargeThreshold);
    const alpha = Math.min(1, chargeProgress * 2);

    ctx.strokeStyle = `#FF79C6${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
    ctx.lineWidth = 3;
    ctx.shadowColor = '#FF79C6';
    ctx.shadowBlur = 10;

    for (let i = 0; i < segments; i++) {
      const startAngle = (Math.PI * 2 * i) / segments;
      const endAngle = startAngle + Math.PI / segments;
      ctx.beginPath();
      ctx.arc(0, 0, ringRadius, startAngle, endAngle);
      ctx.stroke();
    }

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  getBounds(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.x - this.width / 2,
      y: this.y - this.height / 2,
      width: this.width,
      height: this.height
    };
  }
}
