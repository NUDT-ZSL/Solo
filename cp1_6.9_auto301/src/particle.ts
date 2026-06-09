/**
 * Particle — 粒子类
 * 职责：封装单个粒子的属性、运动物理、生命周期、脉动、渲染
 * 被调用者：ParticleSystem
 *
 * 数据流向：
 *   ParticleSystem.update() → 遍历调用 Particle.update()
 *   ParticleSystem.render() → 遍历调用 Particle.render()
 *   ParticleSystem.resolveCollisions() → 访问粒子属性进行碰撞/融合
 */

export interface ParticleOptions {
  x: number;
  y: number;
  hue: number;
  birthTime: number;
}

export class Particle {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;

  public baseRadius: number;
  public radius: number;

  public hue: number;
  public saturation: number = 80;
  public lightness: number = 90;
  public alpha: number = 0.2;

  public birthTime: number;
  public lifespan: number;
  public pulsePhase: number;

  public markedForRemoval: boolean = false;
  public fadeOutMultiplier: number = 1;

  public constructor(options: ParticleOptions) {
    const { x, y, hue, birthTime } = options;

    this.x = x;
    this.y = y;
    this.hue = hue;
    this.birthTime = birthTime;

    this.baseRadius = 3 + Math.random() * 5;
    this.radius = this.baseRadius;
    this.lifespan = 8000 + Math.random() * 7000;
    this.pulsePhase = Math.random() * Math.PI * 2;

    const angle = Math.random() * Math.PI * 2;
    const speed = 20 + Math.random() * 60;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }

  public get mass(): number {
    return this.baseRadius * this.baseRadius;
  }

  /**
   * 更新粒子状态（位置、脉动、透明度、生命周期）
   * @param dt 秒
   * @param now 当前时间戳（毫秒）
   */
  public update(dt: number, now: number): void {
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    this.vx *= 0.995;
    this.vy *= 0.995;

    const elapsed = now - this.birthTime;
    const pulseT = (elapsed / 1000) * Math.PI + this.pulsePhase;
    const pulse = 1 + Math.sin(pulseT) * 0.2;
    this.radius = this.baseRadius * pulse;

    this.alpha = this.computeAlpha(elapsed) * this.fadeOutMultiplier;

    if (elapsed >= this.lifespan) {
      this.markedForRemoval = true;
    }
  }

  private computeAlpha(elapsed: number): number {
    const fadeInDuration = 3000;
    const fadeOutDuration = 2000;
    const peakAlpha = 0.9;
    const startAlpha = 0.2;

    if (elapsed < fadeInDuration) {
      const t = elapsed / fadeInDuration;
      return startAlpha + (peakAlpha - startAlpha) * t;
    } else if (elapsed > this.lifespan - fadeOutDuration) {
      const remaining = this.lifespan - elapsed;
      const t = remaining / fadeOutDuration;
      return peakAlpha * Math.max(0, t);
    } else {
      return peakAlpha;
    }
  }

  /**
   * 将另一个粒子融合进当前粒子
   * @param other 被吸收的粒子
   */
  public mergeWith(other: Particle): void {
    const totalMass = this.mass + other.mass;
    const weightedHue =
      (this.hue * this.mass + other.hue * other.mass) / totalMass;

    const newRadius = (this.baseRadius + other.baseRadius) * 0.7;
    this.baseRadius = newRadius;
    this.radius = newRadius;
    this.hue = weightedHue;

    const massRatio = other.mass / totalMass;
    this.vx = this.vx * (1 - massRatio * 0.5) + other.vx * massRatio * 0.5;
    this.vy = this.vy * (1 - massRatio * 0.5) + other.vy * massRatio * 0.5;
  }

  /**
   * 渲染单个粒子
   * @param ctx Canvas 2D 上下文
   * @param shadowBlur 发光模糊半径
   */
  public render(ctx: CanvasRenderingContext2D, shadowBlur: number): void {
    if (this.alpha <= 0.001) return;

    const color = `hsla(${this.hue.toFixed(1)}, ${this.saturation}%, ${this.lightness}%, ${this.alpha.toFixed(3)})`;

    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = shadowBlur;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
