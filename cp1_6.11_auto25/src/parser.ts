export interface Particle {
  char: string;
  baseX: number;
  baseY: number;
  currentX: number;
  currentY: number;
  fontSize: number;
  colorIndex: number;
  phaseOffset: number;
  weight: number;
  scale: number;
  opacity: number;
}

interface ParseOptions {
  text: string;
  canvasWidth: number;
  canvasHeight: number;
  particleSize: number;
}

const PUNCTUATION = new Set([
  '，', '。', '、', '；', '：', '？', '！',
  ',', '.', ';', ':', '?', '!',
  '·', '…', '—', '-', ' '
]);

function getCharWeight(char: string): number {
  if (char.trim() === '') return 0.4;
  if (PUNCTUATION.has(char)) return 0.55;
  const code = char.charCodeAt(0);
  if (code >= 0x4E00 && code <= 0x9FFF) return 0.95;
  if (/[A-Z]/.test(char)) return 0.9;
  if (/[a-z]/.test(char)) return 0.75;
  if (/\d/.test(char)) return 0.8;
  return 0.7;
}

function isCJK(char: string): boolean {
  const code = char.charCodeAt(0);
  return code >= 0x4E00 && code <= 0x9FFF;
}

export function parseText(options: ParseOptions): Particle[] {
  const { text, canvasWidth, canvasHeight, particleSize } = options;
  const chars = Array.from(text.slice(0, 200));
  const particles: Particle[] = [];

  if (chars.length === 0) return particles;

  const padding = Math.max(80, canvasWidth * 0.1);
  const usableWidth = canvasWidth - padding * 2;

  const totalWidth = chars.reduce((sum, ch) => {
    return sum + (isCJK(ch) ? particleSize * 1.1 : particleSize * 0.62);
  }, 0);

  let gap = 0;
  if (chars.length > 1) {
    gap = Math.max(2, (usableWidth - totalWidth) / (chars.length - 1));
    gap = Math.min(gap, particleSize * 0.4);
  }

  const actualTotalWidth = totalWidth + gap * Math.max(0, chars.length - 1);
  let currentX = (canvasWidth - actualTotalWidth) / 2;
  const centerY = canvasHeight * 0.5;

  chars.forEach((char, index) => {
    const charWidth = isCJK(char) ? particleSize * 1.1 : particleSize * 0.62;
    const weight = getCharWeight(char);
    const fontSize = particleSize * (0.85 + weight * 0.25);

    particles.push({
      char,
      baseX: currentX + charWidth / 2,
      baseY: centerY,
      currentX: currentX + charWidth / 2,
      currentY: centerY,
      fontSize,
      colorIndex: chars.length === 1 ? 0.5 : index / (chars.length - 1),
      phaseOffset: index * 0.35 + (index % 5) * 0.12,
      weight,
      scale: 1,
      opacity: 0.5 + weight * 0.45
    });

    currentX += charWidth + gap;
  });

  return particles;
}

export function updateParticlePositions(
  particles: Particle[],
  canvasWidth: number,
  canvasHeight: number,
  particleSize: number
): void {
  if (particles.length === 0) return;

  const padding = Math.max(80, canvasWidth * 0.1);
  const usableWidth = canvasWidth - padding * 2;

  const totalWidth = particles.reduce((sum, p) => {
    return sum + (isCJK(p.char) ? particleSize * 1.1 : particleSize * 0.62);
  }, 0);

  let gap = 0;
  if (particles.length > 1) {
    gap = Math.max(2, (usableWidth - totalWidth) / (particles.length - 1));
    gap = Math.min(gap, particleSize * 0.4);
  }

  const actualTotalWidth = totalWidth + gap * Math.max(0, particles.length - 1);
  let currentX = (canvasWidth - actualTotalWidth) / 2;
  const centerY = canvasHeight * 0.5;

  particles.forEach((p, index) => {
    const charWidth = isCJK(p.char) ? particleSize * 1.1 : particleSize * 0.62;
    p.fontSize = particleSize * (0.85 + p.weight * 0.25);
    p.baseX = currentX + charWidth / 2;
    p.baseY = centerY;
    p.colorIndex = particles.length === 1 ? 0.5 : index / (particles.length - 1);
    currentX += charWidth + gap;
  });
}
