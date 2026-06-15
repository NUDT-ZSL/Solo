export interface ColorTheme {
  name: string;
  colors: string[];
}

export const THEMES: ColorTheme[] = [
  {
    name: '极光',
    colors: ['#FF6B35', '#F7C59F', '#EFEFD0', '#00A896', '#028090', '#7B2CBF', '#9D4EDD']
  },
  {
    name: '熔岩',
    colors: ['#FF4500', '#FF6347', '#FF8C00', '#FFD700', '#DC143C', '#B22222', '#8B0000']
  },
  {
    name: '深海',
    colors: ['#00FFFF', '#00CED1', '#20B2AA', '#5F9EA0', '#4682B4', '#6A5ACD', '#8A2BE2']
  },
  {
    name: '幻彩',
    colors: ['#FF69B4', '#FFB6C1', '#DDA0DD', '#BA55D3', '#9370DB', '#87CEEB', '#98FB98']
  }
];

export class Feather {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  angle: number;
  angularVel: number;
  phase: number;
  hueOffset: number;
  length: number;
  curvature: number;
  opacity: number;
  targetX: number | null;
  targetY: number | null;
  scatterForce: number;
  trail: { x: number; y: number; alpha: number }[];
  maxTrailLength: number;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.x = Math.random() * canvasWidth;
    this.y = Math.random() * canvasHeight;
    this.vx = (Math.random() - 0.5) * 2;
    this.vy = (Math.random() - 0.5) * 2;
    this.size = Math.random() * 0.6 + 0.7;
    this.angle = Math.random() * Math.PI * 2;
    this.angularVel = (Math.random() - 0.5) * 0.02;
    this.phase = Math.random() * Math.PI * 2;
    this.hueOffset = Math.random();
    this.length = (Math.random() * 20 + 15) * this.size;
    this.curvature = (Math.random() - 0.5) * 0.3;
    this.opacity = Math.random() * 0.3 + 0.6;
    this.targetX = null;
    this.targetY = null;
    this.scatterForce = 0;
    this.trail = [];
    this.maxTrailLength = 12;
  }

  update(
    speedMultiplier: number,
    mouseX: number | null,
    mouseY: number | null,
    isDragging: boolean,
    mouseVx: number,
    mouseVy: number,
    canvasWidth: number,
    canvasHeight: number,
    time: number
  ) {
    const baseSpeed = 0.8 * speedMultiplier;

    const waveX = Math.sin(time * 0.001 * speedMultiplier + this.phase) * 0.3;
    const waveY = Math.cos(time * 0.0008 * speedMultiplier + this.phase * 1.3) * 0.3;
    this.vx += waveX * 0.08;
    this.vy += waveY * 0.08;

    if (mouseX !== null && mouseY !== null && isDragging) {
      const dx = mouseX - this.x;
      const dy = mouseY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 250 && dist > 0) {
        const force = (1 - dist / 250) * 0.5;
        const perpX = -dy / dist;
        const perpY = dx / dist;
        const swirl = Math.sin(time * 0.003 + this.phase) * 0.8 + 0.2;
        this.vx += (dx / dist * force + perpX * swirl * force) * speedMultiplier;
        this.vy += (dy / dist * force + perpY * swirl * force) * speedMultiplier;
      }
      this.vx += mouseVx * 0.015;
      this.vy += mouseVy * 0.015;
    }

    if (this.scatterForce > 0.01) {
      this.vx *= 1 + this.scatterForce * 0.05;
      this.vy *= 1 + this.scatterForce * 0.05;
      this.scatterForce *= 0.96;
    }

    if (this.targetX !== null && this.targetY !== null) {
      const dx = this.targetX - this.x;
      const dy = this.targetY - this.y;
      this.vx += dx * 0.003;
      this.vy += dy * 0.003;
    }

    const maxSpeed = 4 * speedMultiplier;
    const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (currentSpeed > maxSpeed) {
      this.vx = (this.vx / currentSpeed) * maxSpeed;
      this.vy = (this.vy / currentSpeed) * maxSpeed;
    }

    this.vx *= 0.96;
    this.vy *= 0.96;

    this.vx += (Math.random() - 0.5) * 0.15;
    this.vy += (Math.random() - 0.5) * 0.15;

    this.x += this.vx * baseSpeed;
    this.y += this.vy * baseSpeed;

    this.angle = Math.atan2(this.vy, this.vx) + Math.sin(time * 0.002 + this.phase) * 0.2;
    this.angularVel = Math.sin(time * 0.0015 + this.phase * 2) * 0.015;

    const margin = 60;
    if (this.x < -margin) this.x = canvasWidth + margin;
    if (this.x > canvasWidth + margin) this.x = -margin;
    if (this.y < -margin) this.y = canvasHeight + margin;
    if (this.y > canvasHeight + margin) this.y = -margin;

    this.trail.unshift({ x: this.x, y: this.y, alpha: 1 });
    if (this.trail.length > this.maxTrailLength) {
      this.trail.pop();
    }
    for (let i = 0; i < this.trail.length; i++) {
      this.trail[i].alpha *= 0.92;
    }
  }

  getColor(theme: ColorTheme, time: number): { r: number; g: number; b: number } {
    const t = (time * 0.0003 + this.hueOffset) % 1;
    const idx = t * (theme.colors.length - 1);
    const i = Math.floor(idx);
    const f = idx - i;
    const c1 = this.hexToRgb(theme.colors[i]);
    const c2 = this.hexToRgb(theme.colors[(i + 1) % theme.colors.length]);
    return {
      r: c1.r + (c2.r - c1.r) * f,
      g: c1.g + (c2.g - c1.g) * f,
      b: c1.b + (c2.b - c1.b) * f
    };
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 };
  }

  render(ctx: CanvasRenderingContext2D, theme: ColorTheme, time: number) {
    const color = this.getColor(theme, time);
    const glowSize = this.length * 2.5;

    for (let i = this.trail.length - 1; i >= 0; i--) {
      const t = this.trail[i];
      const alpha = t.alpha * this.opacity * 0.4;
      const size = this.length * (1 - i / this.trail.length) * 0.5;
      const gradient = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, size);
      gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`);
      gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(t.x, t.y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, glowSize);
    glow.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${this.opacity * 0.5})`);
    glow.addColorStop(0.4, `rgba(${color.r}, ${color.g}, ${color.b}, ${this.opacity * 0.15})`);
    glow.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
    ctx.fill();

    const featherGrad = ctx.createLinearGradient(0, 0, this.length, 0);
    featherGrad.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${this.opacity * 0.95})`);
    featherGrad.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, ${this.opacity * 0.7})`);
    featherGrad.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, ${this.opacity * 0.2})`);

    ctx.strokeStyle = featherGrad;
    ctx.lineWidth = 2.5 * this.size;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-this.length * 0.1, 0);
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const x = -this.length * 0.1 + this.length * 1.1 * t;
      const y = Math.sin(t * Math.PI * 2 + this.phase + time * 0.002) * this.curvature * this.length;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.lineWidth = 1.2 * this.size;
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 1; i <= 6; i++) {
        const t = i / 7;
        const baseX = -this.length * 0.1 + this.length * t;
        const baseY = Math.sin(t * Math.PI * 2 + this.phase + time * 0.002) * this.curvature * this.length;
        const barbLength = this.length * (0.35 + 0.15 * Math.sin(t * Math.PI)) * (1 - t * 0.3);
        const barbAngle = this.angularVel * 30 + side * (Math.PI / 3 + 0.3 * Math.sin(time * 0.003 + this.phase + t * 5));
        const endX = baseX + Math.cos(barbAngle) * barbLength;
        const endY = baseY + side * Math.abs(Math.sin(barbAngle)) * barbLength * 0.8;
        
        const barbGrad = ctx.createLinearGradient(baseX, baseY, endX, endY);
        barbGrad.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${this.opacity * 0.8})`);
        barbGrad.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, ${this.opacity * 0.1})`);
        ctx.strokeStyle = barbGrad;
        
        ctx.beginPath();
        ctx.moveTo(baseX, baseY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      }
    }

    const tipGrad = ctx.createRadialGradient(this.length, 0, 0, this.length, 0, this.length * 0.25);
    tipGrad.addColorStop(0, `rgba(255, 255, 255, ${this.opacity * 0.9})`);
    tipGrad.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, ${this.opacity * 0.6})`);
    tipGrad.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
    ctx.fillStyle = tipGrad;
    ctx.beginPath();
    ctx.arc(this.length, 0, this.length * 0.25, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  scatter(centerX: number, centerY: number, force: number) {
    const dx = this.x - centerX;
    const dy = this.y - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy) + 1;
    const factor = Math.max(0, 1 - dist / 400) * force;
    this.vx += (dx / dist) * factor;
    this.vy += (dy / dist) * factor;
    this.scatterForce = factor * 0.5;
  }

  setTarget(x: number | null, y: number | null) {
    this.targetX = x;
    this.targetY = y;
  }
}
