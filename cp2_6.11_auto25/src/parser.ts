import type { Particle } from './types';

const MAX_CHARS = 200;

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

  const spacingScale = Math.min(Math.max(canvasWidth / 1200, 0.7), 1.3);
  const fontScale = Math.min(Math.max(canvasWidth / 1400, 0.8), 1.3);
  const fontSize = baseFontSize * fontScale;

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

  const paddingX = Math.max(40, canvasWidth * 0.06);
  const availableWidth = canvasWidth - paddingX * 2;
  let startX: number;
  let actualSpacing = 1;

  if (totalWidth <= availableWidth) {
    startX = paddingX + (availableWidth - totalWidth) / 2;
  } else {
    actualSpacing = availableWidth / totalWidth;
    startX = paddingX;
    for (let i = 0; i < totalChars; i++) {
      charWidths[i] *= actualSpacing;
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

    particles.push({
      char: ch,
      x: centerX,
      baseY,
      offsetY: 0,
      fontSize,
      colorIndex: i / totalColorRange,
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
  const baseSize = particles[0].fontSize;
  return parseText(chars, canvasWidth, canvasHeight, baseSize / Math.min(Math.max(canvasWidth / 1400, 0.8), 1.3));
}

export { MAX_CHARS };
