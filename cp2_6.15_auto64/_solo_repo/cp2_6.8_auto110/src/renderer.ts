import { RocketState } from './physics';
import { PlatformState, Particle } from './collision';

export interface Star {
  x: number;
  y: number;
  baseBrightness: number;
  phase: number;
}

export function createStars(width: number, height: number): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < 20; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height * 0.85,
      baseBrightness: 0.3 + Math.random() * 0.7,
      phase: Math.random() * Math.PI * 2
    });
  }
  return stars;
}

export interface PlatformDecoration {
  x: number;
  y: number;
  color: string;
}

export function createPlatformDecorations(platformWidth: number): PlatformDecoration[] {
  const colors = ['#EF5350', '#42A5F5', '#FFCA28', '#66BB6A'];
  const decorations: PlatformDecoration[] = [];
  const count = Math.floor(platformWidth / 12);
  for (let i = 0; i < count; i++) {
    decorations.push({
      x: -platformWidth / 2 + 6 + i * 12 + (Math.random() - 0.5) * 4,
      y: -2 + (Math.random() - 0.5) * 2,
      color: colors[Math.floor(Math.random() * colors.length)]
    });
  }
  return decorations;
}

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  stars: Star[],
  time: number
): void {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#0D1B2A');
  gradient.addColorStop(1, '#1B2838');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  stars.forEach((star) => {
    const twinkle = 0.5 + 0.5 * Math.sin(time * 2 + star.phase);
    const alpha = star.baseBrightness * twinkle;
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.fillRect(Math.floor(star.x), Math.floor(star.y), 2, 2);
  });
}

export function drawRocket(
  ctx: CanvasRenderingContext2D,
  rocket: RocketState,
  successFlash: number
): void {
  ctx.save();
  ctx.translate(rocket.x, rocket.y);
  ctx.rotate((rocket.angle * Math.PI) / 180);

  if (successFlash > 0) {
    const glowRadius = 45 * (1 + 0.2 * Math.sin(successFlash * 20));
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, glowRadius);
    glow.addColorStop(0, 'rgba(255, 215, 0, 0.6)');
    glow.addColorStop(1, 'rgba(255, 215, 0, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  if (rocket.thrust > 0) {
    const flameHeight = 8 + rocket.thrust * 2.5 + Math.random() * 4;
    ctx.fillStyle = '#FF6F00';
    ctx.beginPath();
    ctx.moveTo(-6, 28);
    ctx.lineTo(0, 28 + flameHeight);
    ctx.lineTo(6, 28);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#FFD54F';
    ctx.beginPath();
    ctx.moveTo(-3, 28);
    ctx.lineTo(0, 28 + flameHeight * 0.6);
    ctx.lineTo(3, 28);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = '#B0BEC5';
  ctx.fillRect(-10, -20, 20, 48);

  ctx.fillStyle = '#90A4AE';
  ctx.fillRect(-12, 10, 24, 18);

  ctx.fillStyle = '#78909C';
  ctx.beginPath();
  ctx.moveTo(-10, -20);
  ctx.lineTo(0, -32);
  ctx.lineTo(10, -20);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#42A5F5';
  ctx.fillRect(-5, -10, 10, 10);

  ctx.fillStyle = '#FF6F00';
  ctx.fillRect(-8, 22, 16, 6);

  ctx.fillStyle = '#607D8B';
  ctx.beginPath();
  ctx.moveTo(-12, 18);
  ctx.lineTo(-18, 28);
  ctx.lineTo(-10, 28);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(12, 18);
  ctx.lineTo(18, 28);
  ctx.lineTo(10, 28);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

export function drawPlatform(
  ctx: CanvasRenderingContext2D,
  platform: PlatformState,
  decorations: PlatformDecoration[]
): void {
  ctx.save();
  const glowGradient = ctx.createRadialGradient(
    platform.x,
    platform.y + 6,
    0,
    platform.x,
    platform.y + 6,
    20
  );
  glowGradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
  glowGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = glowGradient;
  ctx.fillRect(
    platform.x - platform.width / 2 - 20,
    platform.y - 6,
    platform.width + 40,
    40
  );

  ctx.fillStyle = '#00FF88';
  ctx.fillRect(
    platform.x - platform.width / 2,
    platform.y - platform.height / 2,
    platform.width,
    platform.height
  );

  ctx.fillStyle = '#00CC6A';
  ctx.fillRect(
    platform.x - platform.width / 2,
    platform.y,
    platform.width,
    platform.height / 2
  );

  decorations.forEach((dec) => {
    ctx.fillStyle = dec.color;
    ctx.fillRect(
      platform.x + dec.x - 2,
      platform.y + dec.y - 2,
      4,
      4
    );
  });

  ctx.restore();
}

export function drawFuelBar(
  ctx: CanvasRenderingContext2D,
  fuel: number,
  maxFuel: number,
  time: number
): void {
  const x = 20;
  const y = 100;
  const width = 200;
  const height = 16;
  const fuelRatio = fuel / maxFuel;

  ctx.fillStyle = '#37474F';
  ctx.fillRect(x, y, width, height);

  const gradient = ctx.createLinearGradient(x, y, x + width, y);
  gradient.addColorStop(0, '#E53935');
  gradient.addColorStop(0.5, '#FFCA28');
  gradient.addColorStop(1, '#43A047');

  let alpha = 1;
  if (fuelRatio < 0.2) {
    alpha = 0.5 + 0.5 * Math.sin(time * 4);
  }

  ctx.globalAlpha = alpha;
  ctx.fillStyle = gradient;
  ctx.fillRect(x + 2, y + 2, (width - 4) * fuelRatio, height - 4);
  ctx.globalAlpha = 1;

  ctx.strokeStyle = '#37474F';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '14px monospace';
  ctx.fillText(`Fuel: ${Math.ceil(fuel)}`, x, y - 6);
}

export function drawDashboard(
  ctx: CanvasRenderingContext2D,
  rocket: RocketState,
  platform: PlatformState,
  _elapsedTime: number
): void {
  const x = 20;
  const y = 20;
  const width = 220;
  const height = 68;
  const radius = 8;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '14px monospace';
  const altitude = Math.max(0, Math.floor(platform.y - 36 - rocket.y));
  ctx.fillText(`高度: ${altitude}`, x + 12, y + 22);
  const speed = Math.sqrt(rocket.vx * rocket.vx + rocket.vy * rocket.vy);
  ctx.fillText(`速度: ${speed.toFixed(1)}`, x + 12, y + 42);
  ctx.fillText(`角度: ${Math.round(rocket.angle)}°`, x + 12, y + 62);
}

export function drawAngleIndicator(
  ctx: CanvasRenderingContext2D,
  angle: number
): void {
  const centerX = 60;
  const centerY = 260;
  const radius = 40;

  ctx.strokeStyle = 'rgba(66, 165, 245, 0.3)';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, Math.PI, 0);
  ctx.stroke();

  ctx.strokeStyle = '#42A5F5';
  ctx.lineWidth = 3;
  const angleRad = Math.PI + ((angle + 30) / 60) * Math.PI;
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(
    centerX + Math.cos(angleRad) * (radius - 5),
    centerY + Math.sin(angleRad) * (radius - 5)
  );
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '12px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('-30°', centerX - radius, centerY + 15);
  ctx.fillText('0°', centerX, centerY - radius + 5);
  ctx.fillText('30°', centerX + radius, centerY + 15);
  ctx.textAlign = 'left';
}

export function drawThrustBar(
  ctx: CanvasRenderingContext2D,
  thrust: number,
  maxThrust: number,
  canvasWidth: number
): void {
  const x = canvasWidth - 60;
  const topY = 220;
  const bottomY = 300;
  const width = 20;

  ctx.fillStyle = '#37474F';
  ctx.fillRect(x, topY, width, bottomY - topY);

  const thrustRatio = thrust / maxThrust;
  const fillHeight = (bottomY - topY - 4) * thrustRatio;
  ctx.fillStyle = '#FFD54F';
  ctx.fillRect(x + 2, bottomY - 2 - fillHeight, width - 4, fillHeight);

  ctx.strokeStyle = '#37474F';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, topY, width, bottomY - topY);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '12px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('THRUST', x + width / 2, topY - 8);
  ctx.fillText(`${thrust}`, x + width / 2, bottomY + 16);
  ctx.textAlign = 'left';
}

export function drawParticles(
  ctx: CanvasRenderingContext2D,
  particles: Particle[]
): void {
  particles.forEach((p) => {
    const alpha = p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.globalAlpha = alpha;
    ctx.fillRect(Math.floor(p.x - p.size / 2), Math.floor(p.y - p.size / 2), p.size, p.size);
  });
  ctx.globalAlpha = 1;
}

export function drawStatusText(
  ctx: CanvasRenderingContext2D,
  text: string,
  color: string,
  alpha: number,
  canvasWidth: number,
  canvasHeight: number,
  fontSize: number = 32
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.font = `${fontSize}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvasWidth / 2, canvasHeight / 2);
  ctx.restore();
}

export function drawLowFuelVignette(
  ctx: CanvasRenderingContext2D,
  fuel: number,
  maxFuel: number,
  time: number,
  width: number,
  height: number
): void {
  if (fuel / maxFuel >= 0.2) return;

  const pulse = 0.5 + 0.5 * Math.sin(time * 4);
  const alpha = 0.15 * pulse;

  const gradient = ctx.createRadialGradient(
    width / 2,
    height / 2,
    Math.min(width, height) * 0.3,
    width / 2,
    height / 2,
    Math.max(width, height) * 0.7
  );
  gradient.addColorStop(0, 'rgba(229, 57, 53, 0)');
  gradient.addColorStop(1, `rgba(229, 57, 53, ${alpha})`);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

export function drawFadeOverlay(
  ctx: CanvasRenderingContext2D,
  alpha: number,
  width: number,
  height: number
): void {
  ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
  ctx.fillRect(0, 0, width, height);
}

export function drawTime(
  ctx: CanvasRenderingContext2D,
  elapsedTime: number,
  canvasWidth: number
): void {
  const x = canvasWidth - 120;
  const y = 36;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.beginPath();
  ctx.roundRect(x - 10, y - 18, 110, 28, 8);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '14px monospace';
  ctx.fillText(`时间: ${elapsedTime.toFixed(1)}s`, x, y);
}
