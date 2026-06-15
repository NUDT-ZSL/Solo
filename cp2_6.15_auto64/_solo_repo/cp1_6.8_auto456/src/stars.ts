export interface Star {
  x: number;
  y: number;
  size: number;
  twinkleSpeed: number;
  twinkleOffset: number;
  baseBrightness: number;
}

export interface StarField {
  stars: Star[];
  offscreen: HTMLCanvasElement;
  offCtx: CanvasRenderingContext2D;
  width: number;
  height: number;
  brightnessBoost: number;
}

export function createStarField(width: number, height: number, count: number): StarField {
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2.5 + 0.5,
      twinkleSpeed: Math.random() * 2 + 0.5,
      twinkleOffset: Math.random() * Math.PI * 2,
      baseBrightness: Math.random() * 0.5 + 0.3,
    });
  }
  const offscreen = document.createElement('canvas');
  offscreen.width = width;
  offscreen.height = height;
  const offCtx = offscreen.getContext('2d')!;
  return { stars, offscreen, offCtx, width, height, brightnessBoost: 0 };
}

export function renderStarField(field: StarField, time: number, ctx: CanvasRenderingContext2D) {
  const gradient = ctx.createLinearGradient(0, 0, 0, field.height);
  gradient.addColorStop(0, '#1a0a2e');
  gradient.addColorStop(0.5, '#0f0d2e');
  gradient.addColorStop(1, '#0a0e27');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, field.width, field.height);

  for (const star of field.stars) {
    const twinkle = Math.sin(time * star.twinkleSpeed + star.twinkleOffset);
    const brightness = star.baseBrightness + twinkle * 0.3 + field.brightnessBoost;
    const alpha = Math.max(0.1, Math.min(1, brightness));
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(220, 230, 255, ${alpha})`;
    ctx.fill();
    if (star.size > 1.5) {
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size * 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200, 210, 255, ${alpha * 0.08})`;
      ctx.fill();
    }
  }
}

export function renderMilkyWay(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const cx = width / 2;
  const cy = height / 2;
  const rx = width * 0.35;
  const ry = height * 0.12;
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx);
  gradient.addColorStop(0, 'rgba(180, 160, 220, 0.08)');
  gradient.addColorStop(0.3, 'rgba(150, 130, 200, 0.05)');
  gradient.addColorStop(0.7, 'rgba(100, 80, 160, 0.02)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, ry / rx);
  ctx.translate(-cx, -cy);
  ctx.fillStyle = gradient;
  ctx.fillRect(cx - rx, cy - rx, rx * 2, rx * 2);
  ctx.restore();
}
