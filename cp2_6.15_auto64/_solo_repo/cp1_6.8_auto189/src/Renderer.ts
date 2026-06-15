import { FragmentData } from './ImageProcessor';
import { FragmentState, Particle } from './FragmentEngine';

export function renderBackground(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  gradient.addColorStop(0, '#0a0a0a');
  gradient.addColorStop(1, '#1a1a2e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
}

export function renderFragment(
  ctx: CanvasRenderingContext2D,
  state: FragmentState,
  data: FragmentData,
  image: HTMLImageElement
): void {
  ctx.save();
  ctx.translate(state.x, state.y);
  ctx.rotate(state.rotation);

  ctx.beginPath();
  for (let i = 0; i < data.vertices.length; i++) {
    const v = data.vertices[i];
    if (i === 0) {
      ctx.moveTo(v.x, v.y);
    } else {
      ctx.lineTo(v.x, v.y);
    }
  }
  ctx.closePath();
  ctx.clip();

  ctx.drawImage(
    image,
    data.sourceX,
    data.sourceY,
    data.width,
    data.height,
    -data.width / 2,
    -data.height / 2,
    data.width,
    data.height
  );

  if (state.dragging) {
    ctx.shadowBlur = 20;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
  }

  ctx.beginPath();
  for (let i = 0; i < data.vertices.length; i++) {
    const v = data.vertices[i];
    if (i === 0) {
      ctx.moveTo(v.x, v.y);
    } else {
      ctx.lineTo(v.x, v.y);
    }
  }
  ctx.closePath();
  ctx.shadowBlur = 8;
  ctx.shadowColor = 'rgba(255,255,255,0.3)';
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  ctx.restore();
}

export function renderGlow(
  ctx: CanvasRenderingContext2D,
  state: FragmentState,
  data: FragmentData
): void {
  if (state.snapped) return;

  ctx.save();
  ctx.translate(state.x, state.y);
  ctx.rotate(state.rotation);

  ctx.beginPath();
  for (let i = 0; i < data.vertices.length; i++) {
    const v = data.vertices[i];
    if (i === 0) {
      ctx.moveTo(v.x, v.y);
    } else {
      ctx.lineTo(v.x, v.y);
    }
  }
  ctx.closePath();

  ctx.shadowBlur = 15;
  ctx.shadowColor = data.color + '4d';
  ctx.strokeStyle = data.color;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();
}

export function renderFlash(
  ctx: CanvasRenderingContext2D,
  state: FragmentState,
  data: FragmentData
): void {
  if (state.flashAlpha <= 0) return;

  ctx.save();
  ctx.translate(state.x, state.y);
  ctx.rotate(state.rotation);

  ctx.beginPath();
  for (let i = 0; i < data.vertices.length; i++) {
    const v = data.vertices[i];
    if (i === 0) {
      ctx.moveTo(v.x, v.y);
    } else {
      ctx.lineTo(v.x, v.y);
    }
  }
  ctx.closePath();

  ctx.fillStyle = `rgba(255,255,255,${state.flashAlpha})`;
  ctx.fill();

  ctx.restore();
}

export function renderConnection(
  ctx: CanvasRenderingContext2D,
  state: FragmentState,
  data: FragmentData,
  neighbors: FragmentState[]
): void {
  if (!state.snapped) return;

  const alpha = state.connectionAlpha;
  if (alpha <= 0) return;

  ctx.save();
  ctx.globalAlpha = alpha;

  for (const neighbor of neighbors) {
    if (!neighbor.snapped) continue;

    const gradient = ctx.createLinearGradient(
      state.x, state.y, neighbor.x, neighbor.y
    );
    gradient.addColorStop(0, data.color);
    gradient.addColorStop(1, (neighbor as any).color || data.color);

    ctx.beginPath();
    ctx.moveTo(state.x, state.y);
    ctx.lineTo(neighbor.x, neighbor.y);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 1;
    ctx.stroke();

    const midX = (state.x + neighbor.x) / 2;
    const midY = (state.y + neighbor.y) / 2;
    ctx.beginPath();
    ctx.moveTo(midX - 4, midY - 4);
    ctx.lineTo(midX + 4, midY + 4);
    ctx.moveTo(midX + 4, midY - 4);
    ctx.lineTo(midX - 4, midY + 4);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  ctx.restore();
}

export function renderParticles(ctx: CanvasRenderingContext2D, particles: Particle[]): void {
  for (const p of particles) {
    const lifeRatio = p.life / p.maxLife;
    const size = p.size * lifeRatio;
    if (size <= 0) continue;

    const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size);
    gradient.addColorStop(0, p.color);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.save();
    ctx.globalAlpha = lifeRatio;
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export function renderCompletion(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  alpha: number,
  canvasW: number,
  canvasH: number
): void {
  if (alpha <= 0) return;

  ctx.save();
  ctx.globalAlpha = alpha;

  const scale = Math.min(canvasW / image.width, canvasH / image.height);
  const drawW = image.width * scale;
  const drawH = image.height * scale;
  const dx = (canvasW - drawW) / 2;
  const dy = (canvasH - drawH) / 2;

  ctx.drawImage(image, dx, dy, drawW, drawH);
  ctx.restore();
}

export function renderProgressBar(
  ctx: CanvasRenderingContext2D,
  progress: number,
  canvasW: number,
  canvasH: number
): void {
  const barH = 3;
  const barW = canvasW * progress;
  const y = canvasH - barH;

  if (barW <= 0) return;

  const gradient = ctx.createLinearGradient(0, 0, canvasW, 0);
  gradient.addColorStop(0, '#4a9eff');
  gradient.addColorStop(1, '#a855f7');

  ctx.save();

  ctx.shadowBlur = 8;
  ctx.shadowColor = 'rgba(74,158,255,0.5)';

  ctx.fillStyle = gradient;
  ctx.fillRect(0, y, barW, barH);

  ctx.restore();
}
