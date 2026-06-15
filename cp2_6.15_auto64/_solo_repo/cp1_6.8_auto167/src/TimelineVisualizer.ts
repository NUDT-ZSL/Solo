import type { TimelineItem, OrbState, Particle } from "@/types";

const FLY_DURATION = 1200;
const HOVER_AMPLITUDE = 4;
const HOVER_PERIOD = 3000;
const GLOW_MIN = 0.3;
const GLOW_MAX = 0.7;
const GLOW_PERIOD = 2500;
const PARTICLE_COUNT = 65;
const HIT_RADIUS_EXTRA = 12;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function distributeOrbs(
  items: TimelineItem[],
  width: number,
  height: number
): OrbState[] {
  const padding = 80;
  const usableW = width - padding * 2;
  const usableH = height - padding * 2;
  const cols = Math.ceil(Math.sqrt(items.length * (usableW / usableH)));
  const rows = Math.ceil(items.length / cols);
  const cellW = usableW / cols;
  const cellH = usableH / rows;

  return items.map((item, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const targetX = padding + col * cellW + cellW / 2 + (Math.random() - 0.5) * cellW * 0.4;
    const targetY = padding + row * cellH + cellH / 2 + (Math.random() - 0.5) * cellH * 0.4;

    const edge = Math.floor(Math.random() * 4);
    let startX: number, startY: number;
    switch (edge) {
      case 0:
        startX = Math.random() * width;
        startY = -100;
        break;
      case 1:
        startX = width + 100;
        startY = Math.random() * height;
        break;
      case 2:
        startX = Math.random() * width;
        startY = height + 100;
        break;
      default:
        startX = -100;
        startY = Math.random() * height;
        break;
    }

    const baseRadius = item.isLocked ? 18 : 24;
    const radius = baseRadius + Math.random() * 8;

    return {
      x: startX,
      y: startY,
      targetX,
      targetY,
      radius,
      color: item.color,
      glowIntensity: GLOW_MIN,
      phase: "flying" as const,
      flyProgress: 0,
      hoverOffset: 0,
      itemId: item.id,
    };
  });
}

function createParticles(width: number, height: number): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 0.5) * 0.3,
    radius: 1.5 + Math.random() * 2,
    opacity: 0.2 + Math.random() * 0.4,
    opacityDir: Math.random() > 0.5 ? 1 : -1,
  }));
}

function drawOrb(
  ctx: CanvasRenderingContext2D,
  orb: OrbState,
  timestamp: number
) {
  const { x, y, radius, color, phase, isLocked } = orb as OrbState & {
    isLocked?: boolean;
  };

  if (phase === "flying") {
    const progress = Math.min(1, orb.flyProgress / FLY_DURATION);
    const eased = easeOutCubic(progress);
    const currentX = orb.x + (orb.targetX - orb.x) * eased;
    const currentY = orb.y + (orb.targetY - orb.y) * eased;
    orb.x = currentX;
    orb.y = currentY;
    if (progress >= 1) {
      orb.phase = "hovering";
      orb.x = orb.targetX;
      orb.y = orb.targetY;
    }
  }

  if (phase === "hovering") {
    orb.hoverOffset =
      Math.sin((timestamp / HOVER_PERIOD) * Math.PI * 2) * HOVER_AMPLITUDE;
    orb.glowIntensity =
      GLOW_MIN +
      ((GLOW_MAX - GLOW_MIN) *
        (Math.sin((timestamp / GLOW_PERIOD) * Math.PI * 2) + 1)) /
        2;
  }

  const drawY = y + (phase === "hovering" ? orb.hoverOffset : 0);

  ctx.save();

  const glowRadius = radius * 3;
  const gradient = ctx.createRadialGradient(x, drawY, 0, x, drawY, glowRadius);
  gradient.addColorStop(0, color + "CC");
  gradient.addColorStop(0.3, color + "66");
  gradient.addColorStop(0.6, color + "22");
  gradient.addColorStop(1, color + "00");
  ctx.globalAlpha = orb.glowIntensity;
  ctx.beginPath();
  ctx.arc(x, drawY, glowRadius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.globalAlpha = 1;
  const coreGradient = ctx.createRadialGradient(
    x - radius * 0.3,
    drawY - radius * 0.3,
    0,
    x,
    drawY,
    radius
  );
  coreGradient.addColorStop(0, "#FFF8E7");
  coreGradient.addColorStop(0.5, color);
  coreGradient.addColorStop(1, color + "AA");
  ctx.beginPath();
  ctx.arc(x, drawY, radius, 0, Math.PI * 2);
  ctx.fillStyle = coreGradient;
  ctx.fill();

  if (isLocked) {
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, drawY, radius * 0.5, 0, Math.PI * 2);
    ctx.stroke();

    const lockSize = radius * 0.35;
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.fillRect(x - lockSize / 2, drawY, lockSize, lockSize * 0.8);
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, drawY, lockSize * 0.4, Math.PI, 0);
    ctx.stroke();
  }

  ctx.restore();
}

function drawParticles(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
  width: number,
  height: number
) {
  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;

    if (p.x < 0) p.x = width;
    if (p.x > width) p.x = 0;
    if (p.y < 0) p.y = height;
    if (p.y > height) p.y = 0;

    p.opacity += p.opacityDir * 0.002;
    if (p.opacity > 0.6) {
      p.opacity = 0.6;
      p.opacityDir = -1;
    }
    if (p.opacity < 0.15) {
      p.opacity = 0.15;
      p.opacityDir = 1;
    }

    ctx.save();
    ctx.globalAlpha = p.opacity;
    ctx.fillStyle = "rgba(212,165,116,1)";
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export class TimelineVisualizer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private orbs: OrbState[] = [];
  private particles: Particle[] = [];
  private animationId: number | null = null;
  private items: TimelineItem[] = [];
  private onOrbClick: ((itemId: string) => void) | null = null;
  private startTime: number = 0;
  private width = 0;
  private height = 0;

  init(
    canvas: HTMLCanvasElement,
    items: TimelineItem[],
    onOrbClick: (itemId: string) => void
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.items = items;
    this.onOrbClick = onOrbClick;
    this.startTime = performance.now();

    this.resize();
    this.orbs = distributeOrbs(items, this.width, this.height);
    this.particles = createParticles(this.width, this.height);

    this.canvas.addEventListener("click", this.handleClick);
    this.canvas.addEventListener("mousemove", this.handleMouseMove);
    window.addEventListener("resize", this.resize);

    this.startAnimation();
  }

  private resize = () => {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    if (this.ctx) {
      this.ctx.scale(dpr, dpr);
    }

    if (this.items.length > 0) {
      this.orbs = distributeOrbs(this.items, this.width, this.height);
      this.particles = createParticles(this.width, this.height);
    }
  };

  updateItems(items: TimelineItem[]) {
    this.items = items;
    this.orbs = distributeOrbs(items, this.width, this.height);
    this.startTime = performance.now();
  }

  private handleClick = (e: MouseEvent) => {
    if (!this.canvas || !this.onOrbClick) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    for (const orb of this.orbs) {
      if (orb.phase === "flying") continue;
      const dx = x - orb.x;
      const dy = y - orb.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= orb.radius + HIT_RADIUS_EXTRA) {
        this.onOrbClick(orb.itemId);
        return;
      }
    }
  };

  private handleMouseMove = (e: MouseEvent) => {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let hovering = false;
    for (const orb of this.orbs) {
      if (orb.phase === "flying") continue;
      const dx = x - orb.x;
      const dy = y - (orb.y + orb.hoverOffset);
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= orb.radius + HIT_RADIUS_EXTRA) {
        hovering = true;
        break;
      }
    }
    this.canvas.style.cursor = hovering ? "pointer" : "default";
  };

  private startAnimation() {
    const animate = (timestamp: number) => {
      if (!this.ctx || !this.canvas) return;

      this.ctx.clearRect(0, 0, this.width, this.height);

      drawParticles(this.ctx, this.particles, this.width, this.height);

      const elapsed = timestamp - this.startTime;
      for (const orb of this.orbs) {
        if (orb.phase === "flying") {
          orb.flyProgress = elapsed;
        }
        const item = this.items.find((i) => i.id === orb.itemId);
        (orb as OrbState & { isLocked?: boolean }).isLocked = item?.isLocked;
        drawOrb(this.ctx, orb, timestamp);
      }

      this.animationId = requestAnimationFrame(animate);
    };

    this.animationId = requestAnimationFrame(animate);
  }

  destroy() {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.canvas) {
      this.canvas.removeEventListener("click", this.handleClick);
      this.canvas.removeEventListener("mousemove", this.handleMouseMove);
    }
    window.removeEventListener("resize", this.resize);
    this.canvas = null;
    this.ctx = null;
  }
}
