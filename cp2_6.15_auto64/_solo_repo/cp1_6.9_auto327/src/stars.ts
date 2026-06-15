import type { Star } from './types';

export function createStars(width: number, height: number, count: number = 40): Star[] {
  const stars: Star[] = [];
  const actualCount = Math.floor(Math.random() * 21) + 30;
  for (let i = 0; i < Math.min(count, actualCount); i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 1.2 + 0.4,
      opacity: Math.random() * 0.6 + 0.2,
      minOpacity: 0.2,
      maxOpacity: 0.8,
      twinkleSpeed: Math.random() * 0.02 + 0.005,
      twinklePhase: Math.random() * Math.PI * 2,
    });
  }
  return stars;
}

export function updateStars(stars: Star[], deltaTime: number): void {
  for (const star of stars) {
    star.twinklePhase += star.twinkleSpeed * deltaTime * 0.06;
    const t = (Math.sin(star.twinklePhase) + 1) / 2;
    star.opacity = star.minOpacity + t * (star.maxOpacity - star.minOpacity);
  }
}

export function renderStars(ctx: CanvasRenderingContext2D, stars: Star[]): void {
  for (const star of stars) {
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
    ctx.fill();
  }
}

export function regenerateStars(stars: Star[], width: number, height: number): Star[] {
  return createStars(width, height, stars.length);
}
