export interface FragmentData {
  id: number;
  originalX: number;
  originalY: number;
  scatterX: number;
  scatterY: number;
  width: number;
  height: number;
  rotation: number;
  content: 'text' | 'shape' | 'mountain';
  text?: string;
  strokeColor: string;
  fillColor: string;
  points?: { x: number; y: number }[];
}

export interface ChapterData {
  id: number;
  title: string;
  fragments: FragmentData[];
}

export interface RenderOptions {
  brightnessMultiplier: number;
}

const FRAGMENT_COUNT = 50;
const TEXT_SAMPLES = [
  '山高水长', '云淡风轻', '松鹤延年', '月照孤松',
  '江流有声', '山色有无', '春风又绿', '秋水共长',
  '天地一沙鸥', '独钓寒江雪', '采菊东篱下', '悠然见南山'
];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function generateFragments(
  chapterId: number,
  canvasWidth: number,
  canvasHeight: number
): FragmentData[] {
  const rand = seededRandom(chapterId * 1000 + 42);
  const fragments: FragmentData[] = [];
  const padX = canvasWidth * 0.08;
  const padY = canvasHeight * 0.1;
  const usableW = canvasWidth - padX * 2;
  const usableH = canvasHeight - padY * 2;

  for (let i = 0; i < FRAGMENT_COUNT; i++) {
    const type = i < 20 ? 'text' : i < 40 ? 'mountain' : 'shape';
    const origX = padX + rand() * usableW;
    const origY = padY + rand() * usableH;
    const angle = rand() * Math.PI * 2;
    const dist = 80 + rand() * 200;

    const points: { x: number; y: number }[] = [];
    if (type === 'mountain') {
      const n = 5 + Math.floor(rand() * 4);
      const baseW = 40 + rand() * 120;
      const baseH = 20 + rand() * 80;
      for (let p = 0; p < n; p++) {
        points.push({
          x: (p / (n - 1) - 0.5) * baseW,
          y: -(rand() * 0.6 + 0.4) * baseH * Math.sin((p / (n - 1)) * Math.PI)
        });
      }
    } else if (type === 'shape') {
      const sides = 3 + Math.floor(rand() * 4);
      const r = 12 + rand() * 28;
      for (let p = 0; p < sides; p++) {
        const a = (p / sides) * Math.PI * 2 - Math.PI / 2;
        points.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
      }
    }

    const colorTone = rand();
    const strokeColor = colorTone < 0.5 ? '#5C4020' : '#3D2910';
    const fillColor = colorTone < 0.33
      ? 'rgba(180, 140, 90, 0.18)'
      : colorTone < 0.66
      ? 'rgba(139, 110, 78, 0.15)'
      : 'rgba(61, 41, 16, 0.22)';

    fragments.push({
      id: i,
      originalX: origX,
      originalY: origY,
      scatterX: origX + Math.cos(angle) * dist,
      scatterY: origY + Math.sin(angle) * dist,
      width: 40 + rand() * 100,
      height: 30 + rand() * 80,
      rotation: (rand() - 0.5) * Math.PI * 1.2,
      content: type,
      text: type === 'text' ? TEXT_SAMPLES[Math.floor(rand() * TEXT_SAMPLES.length)] : undefined,
      strokeColor,
      fillColor,
      points: points.length ? points : undefined
    });
  }

  return fragments;
}

const CHAPTER_TITLES = [
  '山水序',
  '云烟记',
  '松风篇',
  '寒江卷'
];

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private chapters: ChapterData[] = [];
  private canvasWidth = 0;
  private canvasHeight = 0;
  private brightnessMultiplier = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;
    this.resize();
    this.initChapters();
  }

  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvasWidth = rect.width;
    this.canvasHeight = rect.height;
    this.canvas.width = Math.floor(rect.width * dpr);
    this.canvas.height = Math.floor(rect.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.initChapters();
  }

  private initChapters(): void {
    this.chapters = CHAPTER_TITLES.map((title, idx) => ({
      id: idx,
      title,
      fragments: generateFragments(idx, this.canvasWidth, this.canvasHeight)
    }));
  }

  getChapters(): ChapterData[] {
    return this.chapters;
  }

  setBrightness(multiplier: number): void {
    this.brightnessMultiplier = multiplier;
  }

  renderInitial(): void {
    this.render(0, 0);
  }

  render(progress: number, chapterIndex: number): void {
    const ctx = this.ctx;
    const { canvasWidth: W, canvasHeight: H } = this;

    ctx.clearRect(0, 0, W, H);

    const scrollW = Math.max(4, W * Math.max(0, Math.min(1, progress)));

    this.drawPaperBackground(scrollW, H);
    this.drawBorder(scrollW, H);

    if (progress > 0.02) {
      const chapter = this.chapters[chapterIndex] || this.chapters[0];
      this.drawFragments(chapter, progress, scrollW);
    }

    if (this.brightnessMultiplier !== 1) {
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = `rgba(255, 240, 200, ${(this.brightnessMultiplier - 1) * 0.4})`;
      ctx.fillRect(0, 0, scrollW, H);
      ctx.restore();
    }
  }

  private drawPaperBackground(w: number, h: number): void {
    const ctx = this.ctx;
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#3A2C1A');
    grad.addColorStop(0.5, '#2A1F10');
    grad.addColorStop(1, '#3A2C1A');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.globalAlpha = 0.06;
    for (let i = 0; i < 40; i++) {
      const x = (i * 37 + 13) % w;
      const y = (i * 53 + 29) % h;
      const r = 20 + (i % 5) * 12;
      const radial = ctx.createRadialGradient(x, y, 0, x, y, r);
      radial.addColorStop(0, 'rgba(212, 175, 55, 0.8)');
      radial.addColorStop(1, 'rgba(212, 175, 55, 0)');
      ctx.fillStyle = radial;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.restore();
  }

  private drawBorder(w: number, h: number): void {
    if (w < 12) return;
    const ctx = this.ctx;
    const borderW = 6;
    ctx.fillStyle = '#4A3520';
    ctx.fillRect(0, 0, w, borderW);
    ctx.fillRect(0, h - borderW, w, borderW);
    ctx.fillRect(0, 0, borderW, h);
    ctx.fillRect(w - borderW, 0, borderW, h);

    ctx.strokeStyle = 'rgba(212, 175, 55, 0.7)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(borderW + 0.25, borderW + 0.25, w - borderW * 2 - 0.5, h - borderW * 2 - 0.5);
  }

  private drawFragments(
    chapter: ChapterData,
    progress: number,
    scrollW: number
  ): void {
    const ctx = this.ctx;
    const revealRight = scrollW - 6;

    for (const frag of chapter.fragments) {
      const t = Math.max(0, Math.min(1, progress));
      const easeT = t * t * (3 - 2 * t);

      const cx = frag.scatterX + (frag.originalX - frag.scatterX) * easeT;
      const cy = frag.scatterY + (frag.originalY - frag.scatterY) * easeT;
      const rot = frag.rotation * (1 - easeT);
      const alpha = 0.3 + easeT * 0.7;

      if (cx < -100 || cx > revealRight + 100) continue;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(cx, cy);
      ctx.rotate(rot);

      if (frag.content === 'text' && frag.text) {
        ctx.font = `600 ${16 + (frag.id % 4) * 4}px "Noto Serif SC", serif`;
        ctx.fillStyle = frag.strokeColor;
        ctx.shadowColor = 'rgba(212, 175, 55, 0.3)';
        ctx.shadowBlur = 4;
        ctx.fillText(frag.text, -frag.width / 2, frag.height / 4);
        ctx.shadowBlur = 0;
      } else if (frag.content === 'mountain' && frag.points) {
        ctx.beginPath();
        ctx.moveTo(frag.points[0].x, 0);
        for (const p of frag.points) {
          ctx.lineTo(p.x, p.y);
        }
        ctx.lineTo(frag.points[frag.points.length - 1].x, 0);
        ctx.closePath();
        ctx.fillStyle = frag.fillColor;
        ctx.fill();
        ctx.strokeStyle = frag.strokeColor;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      } else if (frag.content === 'shape' && frag.points) {
        ctx.beginPath();
        const pts = frag.points;
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.closePath();
        ctx.fillStyle = frag.fillColor;
        ctx.fill();
        ctx.strokeStyle = frag.strokeColor;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.restore();
    }
  }
}
