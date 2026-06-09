import type { StoryState, ActiveCardState, EndingState } from './story';
import { ENDING_TEXT } from './story';
import {
  easeOutQuad,
  easeOutCubic,
  lerp,
  clamp,
  rgba,
  drawRoundedDiamond,
  drawRoundedRect,
  wrapText,
  pointInDiamond,
  pointInRect,
  type Point,
  type Rect,
} from './utils';

const CANVAS_W = 900;
const CANVAS_H = 650;
const CARD_W = 360;
const CARD_H = 220;
const BUTTON_W = 120;
const BUTTON_H = 36;

interface SceneData {
  lightBeamAngle: number;
  lightPulse: number;
  mistPulse: number;
  mistDisturbance: number;
  mistDisturbanceTarget: number;
  lastFrameTime: number;
  noiseOffsetX: number;
  noiseOffsetY: number;
}

export function createSceneData(): SceneData {
  return {
    lightBeamAngle: 0,
    lightPulse: 0,
    mistPulse: 0,
    mistDisturbance: 2,
    mistDisturbanceTarget: 2,
    lastFrameTime: performance.now(),
    noiseOffsetX: 0,
    noiseOffsetY: 0,
  };
}

export function triggerMistDisturbance(data: SceneData): void {
  data.mistDisturbanceTarget = 5;
  setTimeout(() => {
    data.mistDisturbanceTarget = 2;
  }, 800);
}

export function updateScene(data: SceneData, now: number): void {
  const dt = (now - data.lastFrameTime) / 1000;
  data.lastFrameTime = now;

  data.lightBeamAngle += dt * 0.8;
  data.lightPulse += dt * 1.5;
  data.mistPulse += dt * 0.6;
  data.noiseOffsetX += dt * 8;
  data.noiseOffsetY += dt * 6;

  data.mistDisturbance = lerp(data.mistDisturbance, data.mistDisturbanceTarget, 0.05);
}

export function renderScene(
  ctx: CanvasRenderingContext2D,
  state: StoryState,
  scene: SceneData,
  now: number
): void {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  drawBackground(ctx);
  drawLighthouse(ctx, state, scene, now);
  drawFragments(ctx, state, scene, now);
  drawMist(ctx, scene, now);

  if (state.activeCard) {
    drawActiveCard(ctx, state, state.activeCard, now);
  }

  if (state.endingState) {
    drawEnding(ctx, state, state.endingState, now);
  }
}

function drawBackground(ctx: CanvasRenderingContext2D): void {
  const gradient = ctx.createRadialGradient(
    CANVAS_W / 2, CANVAS_H / 2, 50,
    CANVAS_W / 2, CANVAS_H / 2, CANVAS_W * 0.7
  );
  gradient.addColorStop(0, '#2C3E50');
  gradient.addColorStop(1, '#1A2333');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
}

function drawLighthouse(
  ctx: CanvasRenderingContext2D,
  state: StoryState,
  scene: SceneData,
  _now: number
): void {
  const centerX = CANVAS_W / 2;
  const baseY = CANVAS_H - 80;
  const lighthouseH = 200;
  const baseW = 80;
  const topW = 40;
  const topY = baseY - lighthouseH;

  ctx.save();

  const alpha = 0.35;
  ctx.fillStyle = rgba('#3D4A5C', alpha);
  ctx.beginPath();
  ctx.moveTo(centerX - baseW / 2, baseY);
  ctx.lineTo(centerX - topW / 2, topY);
  ctx.lineTo(centerX + topW / 2, topY);
  ctx.lineTo(centerX + baseW / 2, baseY);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = rgba('#2D3A4C', alpha * 0.8);
  ctx.fillRect(centerX - topW / 2 - 5, topY - 15, topW + 10, 15);

  const beamAlpha = state.allCollected && !state.activeCard
    ? 0.8
    : 0.2 + Math.sin(scene.lightPulse) * 0.2 + 0.2;
  const beamColor = state.allCollected && !state.activeCard ? '#FFD700' : '#FFD700';

  ctx.save();
  ctx.translate(centerX, topY - 15);

  ctx.strokeStyle = rgba(beamColor, beamAlpha * 0.5);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 15, 0, Math.PI * 2);
  ctx.stroke();

  const beamLength = 120;
  const gradient = ctx.createLinearGradient(0, 0, beamLength, 0);
  gradient.addColorStop(0, rgba(beamColor, beamAlpha * 0.6));
  gradient.addColorStop(1, rgba(beamColor, 0));

  ctx.rotate(scene.lightBeamAngle);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(beamLength, -3);
  ctx.lineTo(beamLength, 3);
  ctx.lineTo(0, 8);
  ctx.closePath();
  ctx.fill();

  ctx.rotate(Math.PI);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(beamLength * 0.6, -3);
  ctx.lineTo(beamLength * 0.6, 3);
  ctx.lineTo(0, 8);
  ctx.closePath();
  ctx.fill();

  ctx.restore();

  ctx.fillStyle = rgba(beamColor, beamAlpha);
  ctx.beginPath();
  ctx.arc(0, 0, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
  ctx.restore();
}

function drawFragments(
  ctx: CanvasRenderingContext2D,
  state: StoryState,
  scene: SceneData,
  now: number
): void {
  for (const fragment of state.fragments) {
    if (fragment.collected && state.activeCard?.fragmentId !== fragment.id) continue;
    if (state.activeCard?.fragmentId === fragment.id) continue;

    const baseSize = 30;
    const hoverSize = 38;
    const targetSize = fragment.hovered ? hoverSize : baseSize;
    const size = lerp(baseSize, targetSize, fragment.hovered ? 1 : 0);

    const baseAlpha = 0.3;
    const hoverAlpha = 0.9;
    const targetAlpha = fragment.hovered ? hoverAlpha : baseAlpha;
    const alpha = lerp(baseAlpha, targetAlpha, fragment.hovered ? 1 : 0);

    const pulse = Math.sin(scene.mistPulse * 2 + fragment.id) * 0.05;
    const finalAlpha = clamp(alpha + pulse, 0.1, 1);

    ctx.save();
    ctx.translate(fragment.position.x, fragment.position.y);

    if (fragment.hovered) {
      const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 12 + size / 2);
      glowGradient.addColorStop(0, rgba('#A4C2F4', 0.4));
      glowGradient.addColorStop(0.5, rgba('#C3B1E1', 0.2));
      glowGradient.addColorStop(1, rgba('#C3B1E1', 0));

      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(0, 0, 12 + size / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    const gradient = ctx.createLinearGradient(-size / 2, -size / 2, size / 2, size / 2);
    gradient.addColorStop(0, rgba('#A4C2F4', finalAlpha));
    gradient.addColorStop(1, rgba('#C3B1E1', finalAlpha));

    ctx.fillStyle = gradient;
    drawRoundedDiamond(ctx, 0, 0, size, 4);
    ctx.fill();

    ctx.strokeStyle = rgba('#FFFFFF', finalAlpha * 0.3);
    ctx.lineWidth = 1;
    drawRoundedDiamond(ctx, 0, 0, size, 4);
    ctx.stroke();

    ctx.restore();
  }
  void now;
}

function drawMist(
  ctx: CanvasRenderingContext2D,
  scene: SceneData,
  _now: number
): void {
  const imgData = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H);
  const data = imgData.data;
  const disturbance = scene.mistDisturbance;

  for (let y = 0; y < CANVAS_H; y += 2) {
    for (let x = 0; x < CANVAS_W; x += 2) {
      const nx = x + Math.sin((x + scene.noiseOffsetX) * 0.02 + y * 0.01) * disturbance;
      const ny = y + Math.cos((y + scene.noiseOffsetY) * 0.015 + x * 0.015) * disturbance;

      const noise = Math.sin(nx * 0.05) * Math.cos(ny * 0.05) * 0.5 + 0.5;
      const noise2 = Math.sin(nx * 0.025 + 100) * Math.cos(ny * 0.03 + 50) * 0.5 + 0.5;
      const combined = (noise + noise2) / 2;

      if (combined > 0.55 && Math.random() < 0.08) {
        const alpha = Math.floor((combined - 0.55) * 255 * 0.35);
        const idx = (y * CANVAS_W + x) * 4;
        const mistAlpha = Math.min(255, data[idx + 3] + alpha);
        data[idx] = Math.min(255, Math.floor(data[idx] * 0.7 + 200 * 0.3));
        data[idx + 1] = Math.min(255, Math.floor(data[idx + 1] * 0.7 + 210 * 0.3));
        data[idx + 2] = Math.min(255, Math.floor(data[idx + 2] * 0.7 + 220 * 0.3));
        data[idx + 3] = mistAlpha;

        if (x + 1 < CANVAS_W) {
          const idx2 = idx + 4;
          data[idx2] = data[idx];
          data[idx2 + 1] = data[idx + 1];
          data[idx2 + 2] = data[idx + 2];
          data[idx2 + 3] = mistAlpha;
        }
        if (y + 1 < CANVAS_H) {
          const idx3 = idx + CANVAS_W * 4;
          data[idx3] = data[idx];
          data[idx3 + 1] = data[idx + 1];
          data[idx3 + 2] = data[idx + 2];
          data[idx3 + 3] = mistAlpha;
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

function drawActiveCard(
  ctx: CanvasRenderingContext2D,
  state: StoryState,
  card: ActiveCardState,
  now: number
): void {
  const elapsed = now - card.startTime;
  const t = clamp(elapsed / card.duration, 0, 1);
  const eased = easeOutCubic(t);

  const startX = card.startPosition.x;
  const startY = card.startPosition.y;
  const centerX = CANVAS_W / 2;
  const centerY = CANVAS_H / 2;

  if (t < 1 || !state.activeFragment) {
    const fragX = lerp(startX, centerX, eased);
    const fragY = lerp(startY, centerY, eased);
    const fragScale = lerp(1, 1.2, eased);
    const fragAlpha = lerp(0.9, 0, clamp(t / 0.8, 0, 1));

    ctx.save();
    ctx.translate(fragX, fragY);
    ctx.scale(fragScale, fragScale);

    const gradient = ctx.createLinearGradient(-15, -15, 15, 15);
    gradient.addColorStop(0, rgba('#A4C2F4', fragAlpha));
    gradient.addColorStop(1, rgba('#C3B1E1', fragAlpha));

    ctx.fillStyle = gradient;
    drawRoundedDiamond(ctx, 0, 0, 30, 4);
    ctx.fill();
    ctx.restore();
  }

  const cardT = clamp((now - card.cardAppearTime) / 500, 0, 1);
  if (cardT <= 0) return;

  const cardEased = easeOutQuad(cardT);
  const cardX = centerX - CARD_W / 2;
  const cardY = centerY - CARD_H / 2;

  ctx.save();
  ctx.globalAlpha = cardEased;

  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 4;

  ctx.fillStyle = '#1F2A3AEE';
  drawRoundedRect(ctx, cardX, cardY, CARD_W, CARD_H, 16);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#5A7A9A';
  ctx.lineWidth = 1;
  drawRoundedRect(ctx, cardX, cardY, CARD_W, CARD_H, 16);
  ctx.stroke();

  if (state.activeFragment && cardT >= 0.5) {
    const textAlpha = clamp((cardT - 0.5) / 0.5, 0, 1);
    ctx.globalAlpha = cardEased * textAlpha;

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textBaseline = 'top';

    const textX = cardX + 30;
    const textY = cardY + 30;
    const maxWidth = CARD_W - 60;

    wrapText(ctx, state.activeFragment.text, textX, textY, maxWidth, 26);

    const lineY = cardY + 145;
    ctx.strokeStyle = '#B8944A';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cardX + CARD_W * 0.1, lineY);
    ctx.lineTo(cardX + CARD_W * 0.9, lineY);
    ctx.stroke();

    const btnX = centerX - BUTTON_W / 2;
    const btnY = lineY + 20;

    ctx.fillStyle = '#3A5A7A';
    drawRoundedRect(ctx, btnX, btnY, BUTTON_W, BUTTON_H, 8);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('探索下一个', centerX, btnY + BUTTON_H / 2);
    ctx.textAlign = 'start';
  }

  ctx.restore();
}

function drawEnding(
  ctx: CanvasRenderingContext2D,
  _state: StoryState,
  ending: EndingState,
  _now: number
): void {
  const waveT = ending.waveProgress;
  const textT = ending.textProgress;

  if (waveT > 0) {
    ctx.save();
    ctx.translate(CANVAS_W / 2, CANVAS_H / 2 - 30);

    const waveW = 800;
    const waveH = 120;
    const visibleW = waveW * easeOutCubic(waveT);

    ctx.beginPath();
    ctx.moveTo(-waveW / 2, 0);

    const steps = 100;
    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      const x = -waveW / 2 + progress * waveW;
      if (x > -waveW / 2 + visibleW) break;

      const y = Math.sin(progress * Math.PI * 6) * 15 * Math.sin(progress * Math.PI)
        + Math.sin(progress * Math.PI * 3 + 1) * 8;
      ctx.lineTo(x, y);
    }

    ctx.lineWidth = 3;
    const gradient = ctx.createLinearGradient(-waveW / 2, 0, waveW / 2, 0);
    gradient.addColorStop(0, 'rgba(150, 160, 180, 0.3)');
    gradient.addColorStop(0.3, 'rgba(180, 180, 200, 0.5)');
    gradient.addColorStop(0.6, 'rgba(218, 185, 130, 0.7)');
    gradient.addColorStop(1, 'rgba(255, 215, 0, 0.9)');

    ctx.strokeStyle = gradient;
    ctx.stroke();

    ctx.lineWidth = 8;
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.1)';
    ctx.stroke();

    ctx.restore();
  }

  if (textT > 0) {
    ctx.save();
    ctx.globalAlpha = easeOutQuad(textT);
    ctx.fillStyle = '#E8D5B7';
    ctx.font = '28px "Georgia", "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ENDING_TEXT, CANVAS_W / 2, CANVAS_H / 2 + 60);
    ctx.restore();
  }
}

export function getHitFragment(
  state: StoryState,
  x: number,
  y: number
): number | null {
  for (let i = state.fragments.length - 1; i >= 0; i--) {
    const f = state.fragments[i];
    if (f.collected) continue;

    const size = f.hovered ? 38 : 30;
    if (pointInDiamond(x, y, f.position.x, f.position.y, size)) {
      return f.id;
    }
  }
  return null;
}

export function getNextButtonRect(): Rect {
  return {
    x: CANVAS_W / 2 - BUTTON_W / 2,
    y: CANVAS_H / 2 - CARD_H / 2 + 165,
    w: BUTTON_W,
    h: BUTTON_H,
  };
}

export function isNextButtonHit(x: number, y: number): boolean {
  return pointInRect(x, y, getNextButtonRect());
}

export function updateHoverState(
  state: StoryState,
  mouseX: number,
  mouseY: number
): boolean {
  let changed = false;
  for (const fragment of state.fragments) {
    if (fragment.collected) continue;

    const size = fragment.hovered ? 38 : 30;
    const isHit = pointInDiamond(mouseX, mouseY, fragment.position.x, fragment.position.y, size);

    if (isHit !== fragment.hovered) {
      fragment.hovered = isHit;
      changed = true;
    }
  }
  return changed;
}

export type { Point, Rect };
