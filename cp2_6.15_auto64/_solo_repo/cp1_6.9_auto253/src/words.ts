export interface WordBlock {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseX: number;
  baseY: number;
  char: string;
  size: number;
  isDragging: boolean;
  hoverFlash: number;
  tremorPhase: number;
  tremorSpeed: number;
  tremorAmp: number;
  dragScale: number;
}

interface Pointer {
  x: number;
  y: number;
  isDown: boolean;
  draggedWord: WordBlock | null;
  hoveredWord: WordBlock | null;
}

const CHAR_LIST = [
  '风', '光', '雨', '雾', '星', '月', '云', '海', '山', '林',
  '雪', '花', '露', '霜', '霞', '浪', '虹', '岚', '潮', '烟'
];

const PRESET_PHRASES = [
  ['星', '垂', '平', '野', '阔'],
  ['月', '落', '霜', '天'],
  ['风', '起', '云', '涌'],
  ['山', '高', '水', '长'],
  ['雪', '落', '无', '声'],
  ['海', '阔', '天', '空'],
  ['云', '淡', '风', '轻'],
  ['雨', '过', '天', '晴'],
  ['烟', '波', '浩', '渺'],
  ['春', '暖', '花', '开'],
  ['月', '明', '星', '稀'],
  ['霞', '光', '万', '丈']
];

export class WordManager {
  private words: WordBlock[] = [];
  private width: number;
  private height: number;
  private pointer: Pointer;
  private readonly BLOCK_SIZE = 30;
  private readonly HALF_BLOCK = 15;
  private readonly ATTRACT_DIST = 80;
  private readonly REPEL_DIST = 30;
  private readonly CONNECT_DIST = 120;
  private readonly MAX_ATTRACT_SPEED = 0.3;
  private readonly SPRING_STIFFNESS = 0.02;
  private readonly SPRING_DAMPING = 0.8;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.pointer = {
      x: 0,
      y: 0,
      isDown: false,
      draggedWord: null,
      hoveredWord: null
    };
  }

  resize(width: number, height: number): void {
    const scaleX = width / this.width;
    const scaleY = height / this.height;
    this.width = width;
    this.height = height;
    for (const w of this.words) {
      w.x *= scaleX;
      w.y *= scaleY;
      w.baseX *= scaleX;
      w.baseY *= scaleY;
    }
  }

  private randomChar(): string {
    return CHAR_LIST[Math.floor(Math.random() * CHAR_LIST.length)];
  }

  addWord(x: number, y: number, char?: string): WordBlock {
    const word: WordBlock = {
      x,
      y,
      vx: 0,
      vy: 0,
      baseX: x,
      baseY: y,
      char: char ?? this.randomChar(),
      size: this.BLOCK_SIZE,
      isDragging: false,
      hoverFlash: 0,
      tremorPhase: Math.random() * Math.PI * 2,
      tremorSpeed: 0.5 + Math.random() * 1.5,
      tremorAmp: 1 + Math.random() * 1,
      dragScale: 1
    };
    this.words.push(word);
    return word;
  }

  clearAll(): void {
    this.words = [];
  }

  generatePreset(): void {
    const phrase = PRESET_PHRASES[Math.floor(Math.random() * PRESET_PHRASES.length)];
    const count = phrase.length;
    const spacing = 50;
    const totalWidth = (count - 1) * spacing;
    const startX = this.width / 2 - totalWidth / 2;
    const centerY = this.height / 2;
    const useArc = Math.random() > 0.5;
    const arcRadius = 300;

    for (let i = 0; i < count; i++) {
      let x: number, y: number;
      if (useArc) {
        const totalAngle = Math.min(count * 0.15, Math.PI / 3);
        const angle = -totalAngle / 2 + (totalAngle * i) / Math.max(count - 1, 1);
        x = this.width / 2 + Math.sin(angle) * arcRadius;
        y = centerY - (Math.cos(angle) - 1) * arcRadius;
      } else {
        x = startX + i * spacing;
        y = centerY + (Math.random() - 0.5) * 10;
      }
      this.addWord(x, y, phrase[i]);
    }
  }

  handlePointerDown(x: number, y: number): void {
    this.pointer.x = x;
    this.pointer.y = y;
    this.pointer.isDown = true;

    const word = this.findWordAt(x, y);
    if (word) {
      word.isDragging = true;
      this.pointer.draggedWord = word;
    } else {
      this.addWord(x, y);
    }
  }

  handlePointerMove(x: number, y: number): void {
    this.pointer.x = x;
    this.pointer.y = y;

    if (this.pointer.draggedWord) {
      this.pointer.draggedWord.x = x;
      this.pointer.draggedWord.y = y;
      this.pointer.draggedWord.baseX = x;
      this.pointer.draggedWord.baseY = y;
      this.pointer.draggedWord.dragScale = Math.min(1.2, this.pointer.draggedWord.dragScale + 0.04);
    }

    const hovered = this.findWordAt(x, y);
    if (this.pointer.hoveredWord !== hovered) {
      this.pointer.hoveredWord = hovered;
      if (hovered) {
        hovered.hoverFlash = 0.3;
      }
    }
  }

  handlePointerUp(): void {
    this.pointer.isDown = false;
    if (this.pointer.draggedWord) {
      this.pointer.draggedWord.isDragging = false;
      this.pointer.draggedWord.baseX = this.pointer.draggedWord.x;
      this.pointer.draggedWord.baseY = this.pointer.draggedWord.y;
      this.pointer.draggedWord = null;
    }
  }

  private findWordAt(x: number, y: number): WordBlock | null {
    for (let i = this.words.length - 1; i >= 0; i--) {
      const w = this.words[i];
      if (Math.abs(w.x - x) < this.HALF_BLOCK * 1.3 && Math.abs(w.y - y) < this.HALF_BLOCK * 1.3) {
        return w;
      }
    }
    return null;
  }

  update(dt: number): void {
    const frameScale = Math.min(dt * 60, 2.5);

    for (const w of this.words) {
      w.tremorPhase += w.tremorSpeed * dt * Math.PI * 2;
      if (w.hoverFlash > 0) {
        w.hoverFlash = Math.max(0, w.hoverFlash - dt);
      }
      if (!w.isDragging && w.dragScale > 1) {
        w.dragScale = Math.max(1, w.dragScale - 0.04 * frameScale);
      }
    }

    for (let i = 0; i < this.words.length; i++) {
      const a = this.words[i];
      if (a.isDragging) continue;

      for (let j = i + 1; j < this.words.length; j++) {
        const b = this.words[j];
        if (b.isDragging) continue;

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) + 0.001;

        if (dist < this.ATTRACT_DIST) {
          const nx = dx / dist;
          const ny = dy / dist;

          let force: number;
          if (dist < this.REPEL_DIST) {
            const overlap = this.REPEL_DIST - dist;
            force = -overlap * 0.15;
          } else {
            const normDist = 1 - dist / this.ATTRACT_DIST;
            force = Math.min(this.MAX_ATTRACT_SPEED, normDist * normDist * 0.5);
          }

          const scaledForce = force * frameScale;
          a.vx += nx * scaledForce;
          a.vy += ny * scaledForce;
          b.vx -= nx * scaledForce;
          b.vy -= ny * scaledForce;
        }
      }
    }

    if (this.pointer.draggedWord) {
      const dragged = this.pointer.draggedWord;
      for (const w of this.words) {
        if (w.isDragging) continue;
        const dx = dragged.x - w.x;
        const dy = dragged.y - w.y;
        const dist = Math.sqrt(dx * dx + dy * dy) + 0.001;
        if (dist < this.ATTRACT_DIST) {
          const stretch = dist - this.REPEL_DIST;
          if (stretch > 0) {
            const nx = dx / dist;
            const ny = dy / dist;
            const springForce = stretch * this.SPRING_STIFFNESS * frameScale;
            const dampingPow = Math.pow(this.SPRING_DAMPING, frameScale);
            w.vx = w.vx * dampingPow + nx * springForce;
            w.vy = w.vy * dampingPow + ny * springForce;
          }
        }
      }
    }

    const velocityDamping = Math.pow(0.88, frameScale);
    for (const w of this.words) {
      if (w.isDragging) continue;

      w.baseX += w.vx * frameScale;
      w.baseY += w.vy * frameScale;
      w.vx *= velocityDamping;
      w.vy *= velocityDamping;

      const margin = this.HALF_BLOCK;
      if (w.baseX < margin) { w.baseX = margin; w.vx *= -0.5; }
      if (w.baseX > this.width - margin) { w.baseX = this.width - margin; w.vx *= -0.5; }
      if (w.baseY < margin) { w.baseY = margin; w.vy *= -0.5; }
      if (w.baseY > this.height - margin) { w.baseY = this.height - margin; w.vy *= -0.5; }

      const tremorX = Math.sin(w.tremorPhase) * w.tremorAmp;
      const tremorY = Math.cos(w.tremorPhase * 0.8 + 1) * w.tremorAmp * 0.7;
      w.x = w.baseX + tremorX;
      w.y = w.baseY + tremorY;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    this.renderConnections(ctx);
    this.renderWords(ctx);
  }

  private renderConnections(ctx: CanvasRenderingContext2D): void {
    const hovered = this.pointer.hoveredWord;
    const hoverFlash = hovered ? hovered.hoverFlash : 0;

    for (let i = 0; i < this.words.length; i++) {
      const a = this.words[i];
      for (let j = i + 1; j < this.words.length; j++) {
        const b = this.words[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.CONNECT_DIST) {
          const t = 1 - dist / this.CONNECT_DIST;
          const baseAlpha = t * 0.6;

          let lineWidth = 2;
          let r1: number, g1: number, b1: number;
          let r2: number, g2: number, b2: number;

          const isHoverConn = hovered && (hovered === a || hovered === b);

          if (isHoverConn && hoverFlash > 0) {
            const flashT = hoverFlash / 0.3;
            r1 = r2 = 255;
            g1 = g2 = 255;
            b1 = b2 = 255;
            lineWidth = 2 + flashT * 2;
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = `rgba(180, 200, 255, ${baseAlpha * flashT})`;
            ctx.lineWidth = lineWidth + 4;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
            ctx.restore();
          } else {
            const hueA = 220;
            const hueB = 270;
            const colA = hslToRgb(hueA / 360, 0.8, 0.65);
            const colB = hslToRgb(hueB / 360, 0.8, 0.65);
            r1 = colA[0]; g1 = colA[1]; b1 = colA[2];
            r2 = colB[0]; g2 = colB[1]; b2 = colB[2];
          }

          const gradient = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
          if (isHoverConn && hoverFlash > 0) {
            const flashAlpha = baseAlpha + (1 - baseAlpha) * (hoverFlash / 0.3);
            gradient.addColorStop(0, `rgba(255, 255, 255, ${flashAlpha})`);
            gradient.addColorStop(1, `rgba(255, 255, 255, ${flashAlpha})`);
          } else {
            gradient.addColorStop(0, `rgba(${r1}, ${g1}, ${b1}, ${baseAlpha})`);
            gradient.addColorStop(1, `rgba(${r2}, ${g2}, ${b2}, ${baseAlpha})`);
          }

          ctx.strokeStyle = gradient;
          ctx.lineWidth = lineWidth;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
  }

  private renderWords(ctx: CanvasRenderingContext2D): void {
    for (const w of this.words) {
      const scale = w.dragScale;
      const isDragged = w.isDragging;
      const glowIntensity = isDragged ? 25 : 12;

      ctx.save();
      ctx.translate(w.x, w.y);
      ctx.scale(scale, scale);

      ctx.save();
      ctx.shadowColor = 'rgba(150, 180, 255, 0.8)';
      ctx.shadowBlur = glowIntensity;
      ctx.fillStyle = 'rgba(20, 30, 60, 0.6)';
      ctx.strokeStyle = `rgba(150, 200, 255, ${isDragged ? 0.9 : 0.5})`;
      ctx.lineWidth = isDragged ? 2 : 1.5;
      this.roundRect(ctx, -this.HALF_BLOCK, -this.HALF_BLOCK, this.BLOCK_SIZE, this.BLOCK_SIZE, 6);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.font = '600 24px "Noto Serif SC", "SimSun", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.shadowColor = 'rgba(150, 200, 255, 0.9)';
      ctx.shadowBlur = glowIntensity;
      ctx.lineWidth = 2;
      ctx.strokeStyle = isDragged ? 'rgba(200, 220, 255, 0.95)' : 'rgba(150, 200, 255, 0.7)';
      ctx.strokeText(w.char, 0, 1);

      ctx.shadowBlur = glowIntensity * 0.5;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
      ctx.fillText(w.char, 0, 1);
      ctx.restore();

      ctx.restore();
    }
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}
