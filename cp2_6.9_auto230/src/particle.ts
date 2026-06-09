export type ParticleState = 'flowing' | 'cooled' | 'splash' | 'eruption';

export interface ParticleColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseVx: number;
  baseVy: number;
  size: number;
  baseSize: number;
  color: ParticleColor;
  targetColor: ParticleColor;
  state: ParticleState;
  life: number;
  maxLife: number;
  age: number;
  tubeX: number;
  tubeWidth: number;
  wobblePhase: number;
  wobbleSpeed: number;
  wobbleAmp: number;
  temperature: number;
  trail: Array<{ x: number; y: number; alpha: number }>;
  trailLength: number;
  heated: boolean;
  heatIntensity: number;

  constructor() {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.baseVx = 0;
    this.baseVy = 0;
    this.size = 4;
    this.baseSize = 4;
    this.color = { r: 255, g: 102, b: 0, a: 1 };
    this.targetColor = { r: 255, g: 102, b: 0, a: 1 };
    this.state = 'flowing';
    this.life = Infinity;
    this.maxLife = Infinity;
    this.age = 0;
    this.tubeX = 0;
    this.tubeWidth = 200;
    this.wobblePhase = Math.random() * Math.PI * 2;
    this.wobbleSpeed = 0.02 + Math.random() * 0.03;
    this.wobbleAmp = 10 + Math.random() * 30;
    this.temperature = 0.8;
    this.trail = [];
    this.trailLength = 0;
    this.heated = false;
    this.heatIntensity = 0;
  }

  initFlowing(tubeCenterX: number, tubeTop: number, tubeWidth: number, tubeLength: number): void {
    this.tubeWidth = tubeWidth;
    this.tubeX = tubeCenterX;
    this.state = 'flowing';
    this.life = Infinity;
    this.maxLife = Infinity;
    this.age = 0;

    const yPos = tubeTop + Math.random() * tubeLength;
    const xOffset = (Math.random() - 0.5) * tubeWidth * 0.7;

    this.x = tubeCenterX + xOffset;
    this.y = yPos;

    this.baseVx = (Math.random() - 0.5) * 2;
    this.baseVy = 2 + Math.random() * 3;
    this.vx = this.baseVx;
    this.vy = this.baseVy;

    this.baseSize = 2 + Math.random() * 6;
    this.size = this.baseSize;

    const temp = 0.6 + Math.random() * 0.4;
    this.temperature = temp;
    this.setTemperatureColor(temp);
    this.targetColor = { ...this.color };

    this.wobblePhase = Math.random() * Math.PI * 2;
    this.wobbleSpeed = 0.02 + Math.random() * 0.03;
    this.wobbleAmp = 10 + Math.random() * 30;

    this.trail = [];
    this.trailLength = 0;
    this.heated = false;
    this.heatIntensity = 0;
  }

  initSplash(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.state = 'splash';
    this.life = 30;
    this.maxLife = 30;
    this.age = 0;

    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 4;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed - 2;
    this.baseVx = this.vx;
    this.baseVy = this.vy;

    this.size = 1 + Math.random();
    this.baseSize = this.size;

    this.color = { r: 255, g: 160, b: 0, a: 1 };
    this.targetColor = { ...this.color };
    this.temperature = 0.9;

    this.trail = [];
    this.trailLength = 0;
    this.heated = false;
    this.heatIntensity = 0;
  }

  initEruption(tubeCenterX: number, tubeBottom: number): void {
    this.x = tubeCenterX + (Math.random() - 0.5) * 60;
    this.y = tubeBottom;
    this.state = 'eruption';
    this.life = 120;
    this.maxLife = 120;
    this.age = 0;

    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
    const speed = 10 + Math.random() * 5;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.baseVx = this.vx;
    this.baseVy = this.vy;

    this.baseSize = 6;
    this.size = 6;

    this.temperature = 1.0;
    this.color = { r: 255, g: 215, b: 0, a: 1 };
    this.targetColor = { ...this.color };

    this.trail = [];
    this.trailLength = 30;
    this.heated = false;
    this.heatIntensity = 0;
  }

  setTemperatureColor(temp: number): void {
    if (temp > 0.8) {
      const t = (temp - 0.8) / 0.2;
      this.color.r = 255;
      this.color.g = Math.floor(102 + t * 153);
      this.color.b = Math.floor(t * 160);
    } else if (temp > 0.3) {
      const t = (temp - 0.3) / 0.5;
      this.color.r = 255;
      this.color.g = Math.floor(32 + t * 70);
      this.color.b = 0;
    } else {
      const t = temp / 0.3;
      this.color.r = Math.floor(42 + t * 213);
      this.color.g = Math.floor(16 + t * 16);
      this.color.b = 0;
    }
    this.color.a = 1;
  }

  lerpColor(target: ParticleColor, factor: number): void {
    this.color.r += (target.r - this.color.r) * factor;
    this.color.g += (target.g - this.color.g) * factor;
    this.color.b += (target.b - this.color.b) * factor;
    this.color.a += (target.a - this.color.a) * factor;
  }

  update(
    tubeCenterX: number,
    tubeTop: number,
    tubeWidth: number,
    tubeLength: number,
    coolingStart: number,
    mouseX: number,
    mouseY: number,
    mouseInTube: boolean,
    deltaTime: number
  ): boolean {
    const dt = deltaTime / 16.67;

    if (this.state === 'cooled') {
      return true;
    }

    this.age += dt;

    if (this.state === 'flowing') {
      this.wobblePhase += this.wobbleSpeed * dt;
      const wobble = Math.sin(this.wobblePhase) * this.wobbleAmp * 0.3;

      if (mouseInTube) {
        const dx = this.x - mouseX;
        const dy = this.y - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 60) {
          this.heated = true;
          this.heatIntensity = Math.min(1, this.heatIntensity + 0.05 * dt);
        } else {
          this.heatIntensity = Math.max(0, this.heatIntensity - 0.03 * dt);
          if (this.heatIntensity <= 0) this.heated = false;
        }
      } else {
        this.heatIntensity = Math.max(0, this.heatIntensity - 0.05 * dt);
        if (this.heatIntensity <= 0) this.heated = false;
      }

      const speedMult = this.heated ? 1 + this.heatIntensity : 1;
      const targetVx = (this.baseVx + wobble * 0.1) * speedMult;
      const targetVy = this.baseVy * speedMult;
      this.vx += (targetVx - this.vx) * 0.1 * dt;
      this.vy += (targetVy - this.vy) * 0.1 * dt;

      const targetSize = this.heated
        ? this.baseSize * (1 + 0.3 * this.heatIntensity)
        : this.baseSize;
      this.size += (targetSize - this.size) * 0.1 * dt;

      if (this.heated && this.heatIntensity > 0.5) {
        this.targetColor = { r: 255, g: 240, b: 160, a: 1 };
        this.temperature = Math.min(1, this.temperature + 0.01 * dt);
      } else if (this.y > coolingStart) {
        const coolProgress = Math.min(1, (this.y - coolingStart) / (tubeLength - (coolingStart - tubeTop)));
        this.temperature = Math.max(0, 0.3 - coolProgress * 0.3);
        this.targetColor.r = Math.floor(74 - coolProgress * 32);
        this.targetColor.g = Math.floor(32 - coolProgress * 16);
        this.targetColor.b = 0;
        this.targetColor.a = 1;

        this.vx *= 1 - 0.02 * dt;
        this.vy *= 1 - 0.02 * dt;
        const minSpeed = 0.3;
        if (Math.abs(this.vy) < minSpeed) this.vy = minSpeed * Math.sign(this.vy || 1);

        const cooledSize = 1 + Math.random() * 2;
        const targetCoolSize = this.baseSize * (1 - coolProgress * 0.7);
        this.size += (Math.max(cooledSize, targetCoolSize) - this.size) * 0.05 * dt;

        if (coolProgress >= 0.95) {
          this.state = 'cooled';
          this.vx = 0;
          this.vy = 0;
          this.temperature = 0;
          this.color = { r: 42, g: 16, b: 0, a: 1 };
          return true;
        }
      } else {
        this.temperature = Math.max(0.6, Math.min(1, 0.7 + (this.baseVy - 2) / 6));
        this.setTemperatureColor(this.temperature);
        this.targetColor = { ...this.color };
      }

      this.lerpColor(this.targetColor, 0.05 * dt);

      this.x += this.vx * dt;
      this.y += this.vy * dt;

      const tubeLeft = tubeCenterX - tubeWidth / 2;
      const tubeRight = tubeCenterX + tubeWidth / 2;
      const tubeBottom = tubeTop + tubeLength;

      const margin = 10 + Math.sin(this.wobblePhase * 1.5) * 5;
      if (this.x < tubeLeft + margin) {
        this.x = tubeLeft + margin;
        this.vx = Math.abs(this.vx) * 0.5;
      }
      if (this.x > tubeRight - margin) {
        this.x = tubeRight - margin;
        this.vx = -Math.abs(this.vx) * 0.5;
      }

      if (this.y > tubeBottom) {
        if (this.temperature > 0.3) {
          this.y = tubeTop;
          this.x = tubeCenterX + (Math.random() - 0.5) * tubeWidth * 0.6;
        } else {
          this.state = 'cooled';
          this.vx = 0;
          this.vy = 0;
        }
      }
    } else if (this.state === 'splash') {
      this.vy += 0.15 * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;

      const lifeRatio = 1 - this.age / this.maxLife;
      this.color.a = lifeRatio;
      this.size = this.baseSize * (0.5 + lifeRatio * 0.5);

      if (this.age >= this.maxLife) {
        return false;
      }
    } else if (this.state === 'eruption') {
      this.vy += 0.08 * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;

      if (this.trailLength > 0) {
        this.trail.unshift({ x: this.x, y: this.y, alpha: 0.8 });
        if (this.trail.length > this.trailLength) {
          this.trail.pop();
        }
        for (let i = 0; i < this.trail.length; i++) {
          this.trail[i].alpha = 0.8 * (1 - i / this.trail.length);
        }
      }

      const lifeRatio = this.age / this.maxLife;
      this.size = 6 - lifeRatio * 5;
      this.temperature = 1 - lifeRatio;

      if (lifeRatio < 0.3) {
        const t = lifeRatio / 0.3;
        this.color.r = 255;
        this.color.g = Math.floor(215 - t * 70);
        this.color.b = 0;
      } else if (lifeRatio < 0.7) {
        const t = (lifeRatio - 0.3) / 0.4;
        this.color.r = 255;
        this.color.g = Math.floor(145 - t * 113);
        this.color.b = 0;
      } else {
        const t = (lifeRatio - 0.7) / 0.3;
        this.color.r = Math.floor(142 - t * 100);
        this.color.g = Math.floor(32 - t * 16);
        this.color.b = 0;
      }
      this.color.a = Math.max(0, 1 - lifeRatio * 0.5);

      if (this.age >= this.maxLife || this.y > 1200) {
        return false;
      }
    }

    return true;
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (this.state === 'eruption' && this.trail.length > 1) {
      for (let i = this.trail.length - 1; i >= 0; i--) {
        const t = this.trail[i];
        const trailSize = this.size * (1 - i / this.trail.length) * 0.8;
        ctx.beginPath();
        ctx.arc(t.x, t.y, Math.max(0.5, trailSize), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${Math.floor(this.color.r)}, ${Math.floor(this.color.g)}, ${Math.floor(this.color.b)}, ${t.alpha * this.color.a * 0.5})`;
        ctx.fill();
      }
    }

    if (this.color.a <= 0) return;

    if (this.state !== 'cooled' && this.temperature > 0.6) {
      const glowSize = this.size * (1.5 + this.temperature * 0.5);
      const gradient = ctx.createRadialGradient(
        this.x, this.y, 0,
        this.x, this.y, glowSize
      );
      const glowAlpha = Math.min(0.4, this.temperature * 0.4 * this.color.a);
      gradient.addColorStop(0, `rgba(${Math.floor(this.color.r)}, ${Math.floor(this.color.g)}, ${Math.floor(this.color.b)}, ${glowAlpha})`);
      gradient.addColorStop(1, `rgba(${Math.floor(this.color.r)}, ${Math.floor(this.color.g)}, ${Math.floor(this.color.b)}, 0)`);
      ctx.beginPath();
      ctx.arc(this.x, this.y, glowSize, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(this.x, this.y, Math.max(0.5, this.size), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${Math.floor(this.color.r)}, ${Math.floor(this.color.g)}, ${Math.floor(this.color.b)}, ${this.color.a})`;
    ctx.fill();
  }

  getTemperatureValue(): number {
    return this.temperature;
  }
}
