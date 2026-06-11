import type { Particle } from './types';

const MAX_CHARS = 200;

const MIN_VIEWPORT = 320;
const MAX_VIEWPORT = 2000;
const MIN_FONT_SCALE = 0.75;
const MAX_FONT_SCALE = 1.8;

function getCharWeight(char: string): number {
  if (char === ' ' || char === '\u3000') return 0.3;
  if (/[\u4e00-\u9fa5]/.test(char)) return 1.2;
  if (/[a-zA-Z0-9]/.test(char)) return 1.0;
  if (/[\u3000-\u303f\uff00-\uffef\u2000-\u206f\p{P}]/u.test(char)) return 0.8;
  return 0.9;
}

function isCJK(char: string): boolean {
  return /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/.test(char);
}

function viewportScale(vw: number): number {
  const t = (vw - MIN_VIEWPORT) / (MAX_VIEWPORT - MIN_VIEWPORT);
  const clamped = Math.max(0, Math.min(1, t));
  return MIN_FONT_SCALE + clamped * (MAX_FONT_SCALE - MIN_FONT_SCALE);
}

export function parseText(
  text: string,
  canvasWidth: number,
  canvasHeight: number,
  baseFontSize: number = 14
): Particle[] {
  const cleanText = Array.from(text.slice(0, MAX_CHARS));
  if (cleanText.length === 0) return [];

  const particles: Particle[] = [];
  const totalChars = cleanText.length;

  const scale = viewportScale(canvasWidth);
  const fontSize = baseFontSize * scale;
  const spacingScale = 0.85 + scale * 0.3;

  let totalWidth = 0;
  const charWidths: number[] = [];
  for (let i = 0; i < totalChars; i++) {
    const ch = cleanText[i];
    const w = isCJK(ch)
      ? fontSize * 1.05 * spacingScale
      : fontSize * 0.6 * spacingScale;
    charWidths.push(w);
    totalWidth += w;
  }

  const paddingX = Math.max(24, canvasWidth * 0.05);
  const availableWidth = canvasWidth - paddingX * 2;
  let startX: number;

  if (totalWidth <= availableWidth) {
    startX = paddingX + (availableWidth - totalWidth) / 2;
  } else {
    const compress = availableWidth / totalWidth;
    startX = paddingX;
    for (let i = 0; i < totalChars; i++) {
      charWidths[i] *= compress;
    }
  }

  const baseY = canvasHeight / 2;
  const totalColorRange = Math.max(totalChars - 1, 1);

  let cursorX = startX;
  for (let i = 0; i < totalChars; i++) {
    const ch = cleanText[i];
    const weight = getCharWeight(ch);
    const charW = charWidths[i];
    const centerX = cursorX + charW / 2;

    const phase = (i / totalChars) * Math.PI * 2;
    const frequency = 0.6 + (i / totalChars) * 0.8;

    const colorPhase = (i / totalChars) * 360 + Math.random() * 40;
    const colorSpeed = 0.6 + (i / totalChars) * 0.8;

    particles.push({
      char: ch,
      x: centerX,
      baseY,
      offsetY: 0,
      fontSize,
      colorIndex: i / totalColorRange,
      colorPhase,
      colorSpeed,
      opacity: 0.4 + weight * 0.55,
      scale: 1,
      weight,
      phase,
      frequency
    });

    cursorX += charW;
  }

  return particles;
}

export function repositionParticles(
  particles: Particle[],
  canvasWidth: number,
  canvasHeight: number
): Particle[] {
  if (particles.length === 0) return particles;
  const chars = particles.map(p => p.char).join('');
  const scale = viewportScale(canvasWidth);
  const baseSize = particles[0].fontSize / scale;
  return parseText(chars, canvasWidth, canvasHeight, baseSize);
}

export { MAX_CHARS, viewportScale };
