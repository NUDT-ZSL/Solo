export interface Bubble {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  maxRadius: number;
  hue: number;
  saturation: number;
  value: number;
  pulsePhase: number;
  pulseSpeed: number;
  lifeTime: number;
  state: 'growing' | 'holding' | 'bursting';
  holdTime: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  startRadius: number;
  hue: number;
  saturation: number;
  value: number;
  life: number;
  maxLife: number;
}

export interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  hue: number;
  opacity: number;
}

export interface Flash {
  x: number;
  y: number;
  radius: number;
  life: number;
  maxLife: number;
}

export interface MouseState {
  x: number;
  y: number;
  isDown: boolean;
  lastGenTime: number;
}

const INITIAL_RADIUS = 5;
const GROW_SPEED = 20;
const MAX_RADIUS = 120;
const HOLD_DURATION = 0.5;
const MAX_BUBBLES = 20;
const DRAG_GEN_INTERVAL = 1000 / 3;
const PARTICLE_MIN_COUNT = 60;
const PARTICLE_MAX_COUNT = 100;
const PARTICLE_MIN_SPEED = 30;
const PARTICLE_MAX_SPEED = 80;
const PARTICLE_LIFE = 1.5;
const FLASH_LIFE = 0.2;
const FLASH_RADIUS = 25;
const REPULSE_STRENGTH = 800;
const MERGE_RATIO = 0.5;

let bubbleIdCounter = 0;

export class BubbleManager {
  bubbles: Bubble[] = [];
  particles: Particle[] = [];
  ripples: Ripple[] = [];
  flashes: Flash[] = [];
  mouse: MouseState = { x: 0, y: 0, isDown: false, lastGenTime: 0 };
  canvasWidth = 0;
  canvasHeight = 0;
  time = 0;

  setSize(w: number, h: number): void {
    this.canvasWidth = w;
    this.canvasHeight = h;
  }

  private randomRange(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  private hueToRgb(p: number, q: number, t: number): number {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  }

  hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
    h = ((h % 360) + 360) % 360 / 360;
    if (s === 0) return { r: v * 255, g: v * 255, b: v * 255 };
    const q = v < 0.5 ? v * (1 + s) : v + s - v * s;
    const p = 2 * v - q;
    return {
      r: Math.round(this.hueToRgb(p, q, h + 1 / 3) * 255),
      g: Math.round(this.hueToRgb(p, q, h) * 255),
      b: Math.round(this.hueToRgb(p, q, h - 1 / 3) * 255)
    };
  }

  private generateBaseHue(): number {
    return this.randomRange(200, 350);
  }

  createBubble(x: number, y: number, customHue?: number): void {
    if (this.bubbles.length >= MAX_BUBBLES) return;

    const hue = customHue ?? this.generateBaseHue();
    const bubble: Bubble = {
      id: ++bubbleIdCounter,
      x,
      y,
      vx: 0,
      vy: 0,
      radius: INITIAL_RADIUS,
      maxRadius: MAX_RADIUS,
      hue,
      saturation: 0.75,
      value: 0.85,
      pulsePhase: Math.random() * Math.PI * 2,
      pulseSpeed: 2.5,
      lifeTime: 0,
      state: 'growing',
      holdTime: 0
    };
    this.bubbles.push(bubble);
    this.addFlash(x, y);
  }

  addFlash(x: number, y: number): void {
    this.flashes.push({
      x,
      y,
      radius: FLASH_RADIUS,
      life: FLASH_LIFE,
      maxLife: FLASH_LIFE
    });
  }

  spawnRandom(count: number): void {
    const slots: { x: number; y: number }[] = [];
    let attempts = 0;
    const maxAttempts = count * 30;

    while (slots.length < count && attempts < maxAttempts) {
      attempts++;
      const padding = MAX_RADIUS + 20;
      const x = this.randomRange(padding, this.canvasWidth - padding);
      const y = this.randomRange(padding, this.canvasHeight - padding);

      let overlaps = false;
      for (const b of this.bubbles) {
        const dx = x - b.x;
        const dy = y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < b.radius + MAX_RADIUS * 0.5 + 10) {
          overlaps = true;
          break;
        }
      }
      for (const s of slots) {
        const dx = x - s.x;
        const dy = y - s.y;
        if (Math.sqrt(dx * dx + dy * dy) < MAX_RADIUS + 10) {
          overlaps = true;
          break;
        }
      }
      if (!overlaps) slots.push({ x, y });
    }

    for (const slot of slots) {
      this.createBubble(slot.x, slot.y);
    }
  }

  handleClick(x: number, y: number): void {
    this.createBubble(x, y);
    const extra = Math.floor(Math.random() * 3);
    if (extra > 0) this.spawnRandom(extra);
  }

  handleDrag(x: number, y: number, currentTime: number): void {
    if (currentTime - this.mouse.lastGenTime >= DRAG_GEN_INTERVAL) {
      this.createBubble(x, y);
      this.mouse.lastGenTime = currentTime;
    }
  }

  private burstBubble(bubble: Bubble): void {
    const count = Math.floor(this.randomRange(PARTICLE_MIN_COUNT, PARTICLE_MAX_COUNT + 1));
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = this.randomRange(PARTICLE_MIN_SPEED, PARTICLE_MAX_SPEED);
      const angleJitter = (bubble.hue / 360) * Math.PI * 2 + this.randomRange(-0.3, 0.3);
      const particleHue = (bubble.hue + this.randomRange(-25, 25) + Math.sin(angleJitter) * 15 + 360) % 360;
      const radius = this.randomRange(1.2, 3.2);
      this.particles.push({
        x: bubble.x + Math.cos(angle) * bubble.radius * 0.5,
        y: bubble.y + Math.sin(angle) * bubble.radius * 0.5,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius,
        startRadius: radius,
        hue: particleHue,
        saturation: 0.8 + Math.random() * 0.2,
        value: 0.85 + Math.random() * 0.15,
        life: PARTICLE_LIFE,
        maxLife: PARTICLE_LIFE
      });
    }

    const rippleCount = 3;
    for (let i = 0; i < rippleCount; i++) {
      this.ripples.push({
        x: bubble.x,
        y: bubble.y,
        radius: bubble.radius * (0.6 + i * 0.2),
        maxRadius: bubble.radius * (2.2 + i * 0.8),
        hue: (bubble.hue + i * 10) % 360,
        opacity: 0.5 - i * 0.12
      });
    }
  }

  private mergeBubbles(a: Bubble, b: Bubble): Bubble {
    const totalAreaA = Math.PI * a.radius * a.radius;
    const totalAreaB = Math.PI * b.radius * b.radius;
    const newArea = totalAreaA + totalAreaB;
    const newRadius = Math.sqrt(newArea / Math.PI);

    const ratioA = totalAreaA / newArea;
    const ratioB = totalAreaB / newArea;

    let newHue = a.hue * ratioA + b.hue * ratioB;
    if (Math.abs(a.hue - b.hue) > 180) {
      const minHue = Math.min(a.hue, b.hue);
      const maxHue = Math.max(a.hue, b.hue);
      newHue = ((minHue + 360) * (minHue === a.hue ? ratioA : ratioB) + maxHue * (maxHue === a.hue ? ratioA : ratioB)) % 360;
    }

    const fasterPulse = Math.min(a.pulseSpeed, b.pulseSpeed) * 2;

    const merged: Bubble = {
      id: ++bubbleIdCounter,
      x: a.x * ratioA + b.x * ratioB,
      y: a.y * ratioA + b.y * ratioB,
      vx: a.vx * ratioA + b.vx * ratioB,
      vy: a.vy * ratioA + b.vy * ratioB,
      radius: Math.min(newRadius, MAX_RADIUS),
      maxRadius: MAX_RADIUS,
      hue: newHue,
      saturation: Math.min(1, (a.saturation + b.saturation) * 0.5 + 0.05),
      value: Math.min(1, (a.value + b.value) * 0.5),
      pulsePhase: (a.pulsePhase + b.pulsePhase) * 0.5,
      pulseSpeed: Math.min(fasterPulse, 8),
      lifeTime: Math.max(a.lifeTime, b.lifeTime) * 0.5,
      state: newRadius >= MAX_RADIUS ? 'holding' : 'growing',
      holdTime: 0
    };
    return merged;
  }

  update(dt: number, currentTime: number): void {
    this.time += dt;

    if (this.mouse.isDown) {
      this.handleDrag(this.mouse.x, this.mouse.y, currentTime);
    }

    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      b.lifeTime += dt;
      b.pulsePhase += b.pulseSpeed * dt;

      if (b.state === 'growing') {
        b.radius += GROW_SPEED * dt;
        if (b.radius >= b.maxRadius) {
          b.radius = b.maxRadius;
          b.state = 'holding';
        }
      } else if (b.state === 'holding') {
        b.holdTime += dt;
        if (b.holdTime >= HOLD_DURATION) {
          this.burstBubble(b);
          this.bubbles.splice(i, 1);
          continue;
        }
      }

      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.vx *= 0.92;
      b.vy *= 0.92;

      const padding = b.radius + 4;
      if (b.x < padding) { b.x = padding; b.vx = Math.abs(b.vx) * 0.6; }
      if (b.x > this.canvasWidth - padding) { b.x = this.canvasWidth - padding; b.vx = -Math.abs(b.vx) * 0.6; }
      if (b.y < padding) { b.y = padding; b.vy = Math.abs(b.vy) * 0.6; }
      if (b.y > this.canvasHeight - padding) { b.y = this.canvasHeight - padding; b.vy = -Math.abs(b.vy) * 0.6; }
    }

    for (let i = 0; i < this.bubbles.length; i++) {
      for (let j = i + 1; j < this.bubbles.length; j++) {
        const a = this.bubbles[i];
        const b = this.bubbles[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distSq = dx * dx + dy * dy;
        const minDist = a.radius + b.radius;

        if (distSq < minDist * minDist) {
          const dist = Math.sqrt(distSq) || 0.001;
          const nx = dx / dist;
          const ny = dy / dist;
          const smallerRadius = Math.min(a.radius, b.radius);

          if (dist < smallerRadius * MERGE_RATIO) {
            const merged = this.mergeBubbles(a, b);
            const removeIdxA = i;
            const removeIdxB = j;
            this.bubbles.splice(Math.max(removeIdxA, removeIdxB), 1);
            this.bubbles.splice(Math.min(removeIdxA, removeIdxB), 1);
            this.bubbles.push(merged);
            this.addFlash(merged.x, merged.y);
            i = -1;
            break;
          } else {
            const overlap = minDist - dist;
            const forceMag = REPULSE_STRENGTH * overlap / (dist * (a.radius + b.radius));
            const forceX = nx * forceMag * dt * 60;
            const forceY = ny * forceMag * dt * 60;
            a.vx -= forceX * (b.radius / (a.radius + b.radius));
            a.vy -= forceY * (b.radius / (a.radius + b.radius));
            b.vx += forceX * (a.radius / (a.radius + b.radius));
            b.vy += forceY * (a.radius / (a.radius + b.radius));
          }
        }
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vx *= 0.985;
      p.vy *= 0.985;
      p.vy += 6 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const lifeRatio = p.life / p.maxLife;
      p.radius = p.startRadius * lifeRatio;
    }

    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      const expandSpeed = (r.maxRadius - r.radius) * 2.2 * dt + 20 * dt;
      r.radius += expandSpeed;
      r.opacity *= 0.965;
      if (r.radius >= r.maxRadius || r.opacity < 0.01) {
        this.ripples.splice(i, 1);
      }
    }

    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i];
      f.life -= dt;
      if (f.life <= 0) {
        this.flashes.splice(i, 1);
      }
    }
  }
}
