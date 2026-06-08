export interface Particle {
  x: number;
  y: number;
  originX: number;
  originY: number;
  size: number;
  color: string;
  alpha: number;
  targetAlpha: number;
  vx: number;
  vy: number;
  brightness: number;
  targetBrightness: number;
}

export interface SentenceParticleGroup {
  particles: Particle[];
  sentenceIndex: number;
  centerX: number;
  centerY: number;
  bounds: { left: number; top: number; right: number; bottom: number };
  fadeInStart: number;
  isHovered: boolean;
}

interface TextToParticlesOptions {
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  gap?: number;
  maxParticles?: number;
  offsetX?: number;
  offsetY?: number;
  canvasWidth: number;
  canvasHeight: number;
}

const DEFAULT_OPTIONS: Required<Omit<TextToParticlesOptions, 'canvasWidth' | 'canvasHeight'>> = {
  fontSize: 22,
  fontFamily: '"ZCOOL XiaoWei", "Noto Serif SC", serif',
  color: '#e8e8e8',
  gap: 3,
  maxParticles: 300,
  offsetX: 0,
  offsetY: 0,
};

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function adjustColor(color: string, offset: number): string {
  const hex = color.replace('#', '');
  const r = Math.min(255, Math.max(0, parseInt(hex.substring(0, 2), 16) + offset));
  const g = Math.min(255, Math.max(0, parseInt(hex.substring(2, 4), 16) + offset));
  const b = Math.min(255, Math.max(0, parseInt(hex.substring(4, 6), 16) + offset));
  return `rgb(${r},${g},${b})`;
}

export function textToParticles(
  text: string,
  options: TextToParticlesOptions
): Particle[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const offscreen = document.createElement('canvas');
  offscreen.width = opts.canvasWidth;
  offscreen.height = opts.canvasHeight;
  const ctx = offscreen.getContext('2d');
  if (!ctx) return [];

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, offscreen.width, offscreen.height);

  ctx.font = `${opts.fontSize}px ${opts.fontFamily}`;
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'top';
  ctx.fillText(text, opts.offsetX, opts.offsetY);

  const imageData = ctx.getImageData(0, 0, offscreen.width, offscreen.height);
  const data = imageData.data;
  const particles: Particle[] = [];
  const candidates: { x: number; y: number }[] = [];

  for (let y = 0; y < offscreen.height; y += opts.gap) {
    for (let x = 0; x < offscreen.width; x += opts.gap) {
      const idx = (y * offscreen.width + x) * 4;
      if (data[idx] > 128) {
        candidates.push({ x, y });
      }
    }
  }

  if (candidates.length > opts.maxParticles) {
    const step = candidates.length / opts.maxParticles;
    const sampled: typeof candidates = [];
    for (let i = 0; i < candidates.length; i += step) {
      sampled.push(candidates[Math.floor(i)]);
    }
    candidates.length = 0;
    candidates.push(...sampled);
  }

  for (const pos of candidates) {
    const colorOffset = Math.floor(randomInRange(-15, 15));
    const particle: Particle = {
      x: pos.x + randomInRange(-2, 2),
      y: pos.y + randomInRange(-2, 2),
      originX: pos.x,
      originY: pos.y,
      size: randomInRange(1.0, 2.2),
      color: adjustColor(opts.color, colorOffset),
      alpha: 0,
      targetAlpha: randomInRange(0.6, 0.95),
      vx: 0,
      vy: 0,
      brightness: 0,
      targetBrightness: 0,
    };
    particles.push(particle);
  }

  return particles;
}

export function buildPageParticleGroups(
  page: { sentences: { text: string; delay: number }[] },
  canvasWidth: number,
  canvasHeight: number,
  theme: 'dark' | 'parchment'
): SentenceParticleGroup[] {
  const groups: SentenceParticleGroup[] = [];
  const fontSize = Math.min(22, canvasWidth / 30);
  const lineSpacing = fontSize * 2.8;
  const totalSentences = page.sentences.length;
  const totalHeight = totalSentences * lineSpacing;
  const startY = Math.max(60, (canvasHeight - totalHeight) / 2);
  const color = theme === 'dark' ? '#e8e8e8' : '#3d2b1f';

  for (let i = 0; i < page.sentences.length; i++) {
    const sentence = page.sentences[i];
    const textWidth = sentence.text.length * fontSize;
    const offsetX = Math.max(20, (canvasWidth - textWidth) / 2);
    const offsetY = startY + i * lineSpacing;

    const particles = textToParticles(sentence.text, {
      fontSize,
      fontFamily: '"ZCOOL XiaoWei", "Noto Serif SC", serif',
      color,
      gap: 3,
      maxParticles: 300,
      offsetX,
      offsetY,
      canvasWidth,
      canvasHeight,
    });

    if (particles.length === 0) continue;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let sumX = 0, sumY = 0;
    for (const p of particles) {
      if (p.originX < minX) minX = p.originX;
      if (p.originY < minY) minY = p.originY;
      if (p.originX > maxX) maxX = p.originX;
      if (p.originY > maxY) maxY = p.originY;
      sumX += p.originX;
      sumY += p.originY;
    }

    groups.push({
      particles,
      sentenceIndex: i,
      centerX: sumX / particles.length,
      centerY: sumY / particles.length,
      bounds: { left: minX, top: minY, right: maxX, bottom: maxY },
      fadeInStart: sentence.delay,
      isHovered: false,
    });
  }

  return groups;
}

export function isPointInGroupBounds(
  x: number,
  y: number,
  group: SentenceParticleGroup,
  padding: number = 15
): boolean {
  return (
    x >= group.bounds.left - padding &&
    x <= group.bounds.right + padding &&
    y >= group.bounds.top - padding &&
    y <= group.bounds.bottom + padding
  );
}

export function updateParticles(
  groups: SentenceParticleGroup[],
  elapsed: number,
  mouseX: number,
  mouseY: number,
  hoveredGroup: number | null
): void {
  for (let gi = 0; gi < groups.length; gi++) {
    const group = groups[gi];
    const timeSinceStart = elapsed - group.fadeInStart;
    const isThisHovered = hoveredGroup === gi;

    for (const p of group.particles) {
      if (timeSinceStart < 0) {
        p.targetAlpha = 0;
        p.alpha += (0 - p.alpha) * 0.05;
      } else {
        const fadeInProgress = Math.min(1, timeSinceStart / 1500);
        p.targetAlpha = p.targetAlpha * fadeInProgress;
        p.alpha += (p.targetAlpha - p.alpha) * 0.08;

        if (isThisHovered) {
          p.targetBrightness = 1;
          const dx = p.x - group.centerX;
          const dy = p.y - group.centerY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = 100;
          if (dist < maxDist) {
            const force = (1 - dist / maxDist) * 0.15;
            p.vx += (dx / (dist || 1)) * force;
            p.vy += (dy / (dist || 1)) * force;
          }
        } else {
          p.targetBrightness = 0;
          p.vx += (p.originX - p.x) * 0.03;
          p.vy += (p.originY - p.y) * 0.03;
        }
      }

      p.brightness += (p.targetBrightness - p.brightness) * 0.1;

      p.vx *= 0.92;
      p.vy *= 0.92;
      p.x += p.vx;
      p.y += p.vy;

      if (!isThisHovered) {
        p.x += (p.originX - p.x) * 0.02;
        p.y += (p.originY - p.y) * 0.02;
      }
    }
  }
}

export function drawParticles(
  ctx: CanvasRenderingContext2D,
  groups: SentenceParticleGroup[],
  theme: 'dark' | 'parchment'
): void {
  for (const group of groups) {
    for (const p of group.particles) {
      if (p.alpha < 0.01) continue;

      ctx.save();

      if (p.brightness > 0.05) {
        const glowRadius = p.size * (3 + p.brightness * 4);
        const glowColor =
          theme === 'dark'
            ? `rgba(180, 200, 255, ${p.alpha * p.brightness * 0.3})`
            : `rgba(160, 120, 60, ${p.alpha * p.brightness * 0.3})`;
        const gradient = ctx.createRadialGradient(
          p.x, p.y, 0,
          p.x, p.y, glowRadius
        );
        gradient.addColorStop(0, glowColor);
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = Math.min(1, p.alpha + p.brightness * 0.3);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }
}
