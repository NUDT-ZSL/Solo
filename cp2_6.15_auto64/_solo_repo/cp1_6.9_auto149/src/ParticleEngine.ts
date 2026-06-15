import type { PixelData } from './ImageProcessor';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  r: number;
  g: number;
  b: number;
  targetR: number;
  targetG: number;
  targetB: number;
  alpha: number;
  pulsePhase: number;
  pulseSpeed: number;
  haloRadius: number;
  colorTransitionProgress: number;
}

export interface EngineState {
  particles: Particle[];
  mouseX: number;
  mouseY: number;
  mouseActive: boolean;
  canvasWidth: number;
  canvasHeight: number;
  isTransitioning: boolean;
  aggregated: number;
}

const MOUSE_ATTRACTION = 0.015;
const MOUSE_MAX_OFFSET = 0.3;
const RETURN_SPEED = 0.012;
const COLOR_TRANSITION_DURATION = 1500;
const AGGREGATION_SPEED = 0.018;
const SCATTER_SPEED = 0.04;

export class ParticleEngine {
  public state: EngineState;
  private frameCount: number = 0;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.state = {
      particles: [],
      mouseX: canvasWidth / 2,
      mouseY: canvasHeight / 2,
      mouseActive: false,
      canvasWidth,
      canvasHeight,
      isTransitioning: false,
      aggregated: 0
    };
  }

  setCanvasSize(width: number, height: number): void {
    const oldW = this.state.canvasWidth;
    const oldH = this.state.canvasHeight;
    this.state.canvasWidth = width;
    this.state.canvasHeight = height;

    if (oldW > 0 && oldH > 0 && this.state.particles.length > 0) {
      const scaleX = width / oldW;
      const scaleY = height / oldH;
      for (const p of this.state.particles) {
        p.x *= scaleX;
        p.y *= scaleY;
        p.targetX *= scaleX;
        p.targetY *= scaleY;
      }
    }
  }

  setMousePosition(x: number, y: number): void {
    this.state.mouseX = x;
    this.state.mouseY = y;
    this.state.mouseActive = true;
  }

  clearMouse(): void {
    this.state.mouseActive = false;
  }

  initializeFromPixels(pixels: PixelData[], scatter: boolean = true): void {
    const { canvasWidth: cw, canvasHeight: ch } = this.state;
    const newParticles: Particle[] = [];

    for (let i = 0; i < pixels.length; i++) {
      const px = pixels[i];
      const { targetX, targetY } = this.mapPixelToCanvas(px, cw, ch);

      let startX: number, startY: number;
      if (scatter) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.max(cw, ch) * (0.5 + Math.random() * 0.5);
        startX = targetX + Math.cos(angle) * dist;
        startY = targetY + Math.sin(angle) * dist;
      } else {
        startX = Math.random() * cw;
        startY = Math.random() * ch;
      }

      newParticles.push(this.createParticle(
        startX, startY,
        targetX, targetY,
        px.r, px.g, px.b
      ));
    }

    this.state.particles = newParticles;
    this.state.aggregated = scatter ? 0 : 0.5;
  }

  transitionToPixels(pixels: PixelData[]): void {
    const { canvasWidth: cw, canvasHeight: ch, particles } = this.state;
    const targetCount = pixels.length;
    const currentCount = particles.length;

    if (targetCount > currentCount) {
      for (let i = currentCount; i < targetCount; i++) {
        const px = pixels[i];
        const { targetX, targetY } = this.mapPixelToCanvas(px, cw, ch);
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.max(cw, ch) * (0.5 + Math.random() * 0.5);
        particles.push(this.createParticle(
          targetX + Math.cos(angle) * dist,
          targetY + Math.sin(angle) * dist,
          targetX, targetY,
          Math.random() * 100 + 100,
          Math.random() * 100 + 100,
          Math.random() * 100 + 100
        ));
        particles[i].targetR = px.r;
        particles[i].targetG = px.g;
        particles[i].targetB = px.b;
        particles[i].colorTransitionProgress = 0;
      }
    } else if (targetCount < currentCount) {
      particles.length = targetCount;
    }

    for (let i = 0; i < targetCount; i++) {
      const px = pixels[i];
      const p = particles[i];
      const { targetX, targetY } = this.mapPixelToCanvas(px, cw, ch);

      const angle = Math.random() * Math.PI * 2;
      const dist = 80 + Math.random() * 60;
      p.x = p.targetX + Math.cos(angle) * dist;
      p.y = p.targetY + Math.sin(angle) * dist;
      p.targetX = targetX;
      p.targetY = targetY;
      p.targetR = px.r;
      p.targetG = px.g;
      p.targetB = px.b;
      p.colorTransitionProgress = 0;
    }

    this.state.isTransitioning = true;
    setTimeout(() => {
      this.state.isTransitioning = false;
    }, COLOR_TRANSITION_DURATION + 500);
  }

  update(deltaTime: number): void {
    const dt = Math.min(deltaTime, 33) / 16.67;
    const { particles, mouseX, mouseY, mouseActive } = this.state;
    const colorProgress = Math.min(1, dt * 16.67 / COLOR_TRANSITION_DURATION * 60);
    this.frameCount++;

    let totalDist = 0;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      p.pulsePhase += p.pulseSpeed * dt;
      const pulse = (Math.sin(p.pulsePhase) + 1) / 2;
      p.alpha = 0.4 + pulse * 0.6;
      p.haloRadius = 2 + pulse * 4;

      if (p.colorTransitionProgress < 1) {
        p.colorTransitionProgress = Math.min(1, p.colorTransitionProgress + colorProgress);
        const cp = p.colorTransitionProgress;
        p.r = p.r + (p.targetR - p.r) * cp;
        p.g = p.g + (p.targetG - p.g) * cp;
        p.b = p.b + (p.targetB - p.b) * cp;
      }

      let mouseDx = 0, mouseDy = 0;
      if (mouseActive) {
        const dx = mouseX - p.x;
        const dy = mouseY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy) + 0.001;
        const force = Math.min(1, 300 / dist) * MOUSE_ATTRACTION;
        mouseDx = dx * force;
        mouseDy = dy * force;
        const moveLen = Math.sqrt(mouseDx * mouseDx + mouseDy * mouseDy);
        if (moveLen > MOUSE_MAX_OFFSET) {
          mouseDx = (mouseDx / moveLen) * MOUSE_MAX_OFFSET;
          mouseDy = (mouseDy / moveLen) * MOUSE_MAX_OFFSET;
        }
      }

      const aggSpeed = this.state.isTransitioning ? SCATTER_SPEED : AGGREGATION_SPEED;
      const returnFactor = mouseActive ? RETURN_SPEED * 0.3 : aggSpeed;
      const dx = (p.targetX - p.x) * returnFactor;
      const dy = (p.targetY - p.y) * returnFactor;

      p.vx = p.vx * 0.92 + (dx + mouseDx) * 0.3;
      p.vy = p.vy * 0.92 + (dy + mouseDy) * 0.3;

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      const tdx = p.targetX - p.x;
      const tdy = p.targetY - p.y;
      totalDist += Math.sqrt(tdx * tdx + tdy * tdy);
    }

    const avgDist = particles.length > 0 ? totalDist / particles.length : 0;
    const maxDist = Math.max(this.state.canvasWidth, this.state.canvasHeight);
    this.state.aggregated = Math.max(0, Math.min(1, 1 - avgDist / maxDist));
  }

  getParticleCount(): number {
    return this.state.particles.length;
  }

  private createParticle(
    x: number, y: number,
    targetX: number, targetY: number,
    r: number, g: number, b: number
  ): Particle {
    return {
      x, y,
      vx: 0, vy: 0,
      targetX, targetY,
      r, g, b,
      targetR: r, targetG: g, targetB: b,
      alpha: 0.4 + Math.random() * 0.6,
      pulsePhase: Math.random() * Math.PI * 2,
      pulseSpeed: (0.02 + Math.random() * 0.03) / (60 / 1000),
      haloRadius: 2 + Math.random() * 4,
      colorTransitionProgress: 1
    };
  }

  private mapPixelToCanvas(px: PixelData, cw: number, ch: number) {
    const imgRatio = px.imgWidth / px.imgHeight;
    const canvasRatio = cw / ch;

    let drawW: number, drawH: number, offsetX: number, offsetY: number;

    if (imgRatio > canvasRatio) {
      drawW = cw * 0.85;
      drawH = drawW / imgRatio;
      offsetX = (cw - drawW) / 2;
      offsetY = (ch - drawH) / 2;
    } else {
      drawH = ch * 0.85;
      drawW = drawH * imgRatio;
      offsetX = (cw - drawW) / 2;
      offsetY = (ch - drawH) / 2;
    }

    return {
      targetX: offsetX + (px.imgX / px.imgWidth) * drawW,
      targetY: offsetY + (px.imgY / px.imgHeight) * drawH
    };
  }
}
