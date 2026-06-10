export interface FragmentData {
  id: number;
  originalX: number;
  originalY: number;
  scatterX: number;
  scatterY: number;
  width: number;
  height: number;
  rotation: number;
  scatterRotation: number;
  cachedCanvas: HTMLCanvasElement | null;
  avgColor: string;
  opacity: number;
}

export interface ChapterData {
  id: number;
  title: string;
  offscreenCanvas: HTMLCanvasElement | null;
  fragments: FragmentData[];
}

const FRAGMENT_COUNT = 50;
const FRAGMENT_MIN_SIZE = 18;
const FRAGMENT_MAX_SIZE = 60;

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 0, g: 0, b: 0 };
}

const CHAPTER_TITLES = ['山水序', '云烟记', '松风篇', '寒江卷'];
const CHAPTER_ACCENTS = ['#6B8E5A', '#7C9BB8', '#5C6B4A', '#4A5568'];

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private chapters: ChapterData[] = [];
  private canvasWidth = 0;
  private canvasHeight = 0;
  private dpr = 1;
  private brightnessMultiplier = 1;
  private paperCache: HTMLCanvasElement | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;
    this.dpr = window.devicePixelRatio || 1;
    this.resize();
    this.initChapters();
  }

  resize(): void {
    this.dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvasWidth = rect.width;
    this.canvasHeight = rect.height;
    this.canvas.width = Math.floor(rect.width * this.dpr);
    this.canvas.height = Math.floor(rect.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.paperCache = null;
    this.initChapters();
  }

  private initChapters(): void {
    if (this.canvasWidth <= 0 || this.canvasHeight <= 0) {
      this.chapters = CHAPTER_TITLES.map((title, id) => ({
        id, title, offscreenCanvas: null, fragments: []
      }));
      return;
    }

    this.chapters = CHAPTER_TITLES.map((title, idx) =>
      this.buildChapter(idx, title)
    );
  }

  private buildChapter(id: number, title: string): ChapterData {
    const W = this.canvasWidth;
    const H = this.canvasHeight;
    const rand = seededRandom(id * 7919 + 131);

    const off = document.createElement('canvas');
    off.width = Math.floor(W * this.dpr);
    off.height = Math.floor(H * this.dpr);
    const octx = off.getContext('2d');
    if (!octx) return { id, title, offscreenCanvas: null, fragments: [] };

    octx.scale(this.dpr, this.dpr);

    this.paintChapterContent(octx, id, W, H, rand);

    const fragments = this.sampleFragments(off, id, W, H, rand);

    return { id, title, offscreenCanvas: off, fragments };
  }

  private paintChapterContent(
    ctx: CanvasRenderingContext2D,
    chapterId: number,
    W: number,
    H: number,
    rand: () => number
  ): void {
    const padL = W * 0.08;
    const padR = W * 0.08;
    const padT = H * 0.12;
    const padB = H * 0.12;
    const accent = CHAPTER_ACCENTS[chapterId % CHAPTER_ACCENTS.length];
    const { r, g, b } = hexToRgb(accent);

    ctx.save();

    for (let layer = 0; layer < 3; layer++) {
      const alpha = 0.08 + layer * 0.06;
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      ctx.beginPath();
      const baseY = padT + (H - padT - padB) * (0.4 + layer * 0.2);
      const peakCount = 4 + layer + Math.floor(rand() * 3);
      ctx.moveTo(padL - 20, H - padB + 20);
      for (let i = 0; i <= peakCount; i++) {
        const x = padL + ((W - padL - padR) / peakCount) * i + (rand() - 0.5) * 30;
        const peakH = (H * 0.15 + rand() * H * 0.15) * (1 - layer * 0.25);
        const y = baseY - peakH * (0.5 + rand() * 0.5);
        if (i === 0) {
          ctx.lineTo(x, baseY);
        }
        const cpx = x + (rand() - 0.5) * 40;
        const cpy = y - (rand() * 20);
        ctx.quadraticCurveTo(cpx, cpy, x + (rand() - 0.5) * 20, y);
      }
      ctx.lineTo(W - padR + 20, H - padB + 20);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = `rgba(${r + 20}, ${g + 15}, ${b - 10}, 0.55)`;
    ctx.strokeStyle = `rgba(40, 30, 15, 0.7)`;
    ctx.lineWidth = 1.2;

    for (let t = 0; t < 2; t++) {
      const treeX = padL + rand() * (W - padL - padR);
      const treeBaseY = padT + H * 0.5 + rand() * (H * 0.25);
      const treeH = 40 + rand() * 60;
      const treeW = 12 + rand() * 10;

      ctx.beginPath();
      ctx.moveTo(treeX, treeBaseY);
      ctx.lineTo(treeX - treeW / 2, treeBaseY);
      ctx.lineTo(treeX, treeBaseY - treeH * 0.35);
      ctx.lineTo(treeX - treeW * 0.7, treeBaseY - treeH * 0.35);
      ctx.lineTo(treeX, treeBaseY - treeH * 0.65);
      ctx.lineTo(treeX - treeW * 0.5, treeBaseY - treeH * 0.65);
      ctx.lineTo(treeX, treeBaseY - treeH);
      ctx.lineTo(treeX + treeW * 0.5, treeBaseY - treeH * 0.65);
      ctx.lineTo(treeX, treeBaseY - treeH * 0.65);
      ctx.lineTo(treeX + treeW * 0.7, treeBaseY - treeH * 0.35);
      ctx.lineTo(treeX, treeBaseY - treeH * 0.35);
      ctx.lineTo(treeX + treeW / 2, treeBaseY);
      ctx.closePath();
      ctx.fillStyle = `rgba(${r + 10}, ${g + 25}, ${b}, 0.5)`;
      ctx.fill();
      ctx.stroke();
    }

    const calligraphy = [
      '山高水长', '云淡风轻', '松鹤延年', '月照孤松',
      '江流有声', '山色有无', '春风又绿', '秋水共长'
    ];

    ctx.font = '600 22px "Noto Serif SC", serif';
    ctx.fillStyle = 'rgba(30, 20, 8, 0.85)';
    ctx.shadowColor = 'rgba(212, 175, 55, 0.35)';
    ctx.shadowBlur = 6;

    const textCount = 3 + Math.floor(rand() * 2);
    for (let i = 0; i < textCount; i++) {
      const text = calligraphy[(chapterId * 3 + i) % calligraphy.length];
      const tx = padL + 20 + rand() * (W - padL - padR - 150);
      const ty = padT + 30 + i * 45 + rand() * 20;
      ctx.fillText(text, tx, ty);
    }

    ctx.shadowBlur = 0;

    const stampX = W - padR - 50 - rand() * 30;
    const stampY = padT + 40 + rand() * 40;
    ctx.strokeStyle = 'rgba(180, 60, 50, 0.75)';
    ctx.lineWidth = 2;
    ctx.strokeRect(stampX, stampY, 36, 36);
    ctx.font = '500 11px "Noto Serif SC", serif';
    ctx.fillStyle = 'rgba(180, 60, 50, 0.8)';
    ctx.fillText('残章', stampX + 6, stampY + 16);
    ctx.fillText('之印', stampX + 6, stampY + 30);

    ctx.restore();
  }

  private sampleFragments(
    offscreen: HTMLCanvasElement,
    chapterId: number,
    W: number,
    H: number,
    rand: () => number
  ): FragmentData[] {
    const fragments: FragmentData[] = [];
    const octx = offscreen.getContext('2d');
    if (!octx) return fragments;

    const padX = W * 0.06;
    const padY = H * 0.08;
    const imgDataFull = octx.getImageData(0, 0, offscreen.width, offscreen.height);
    const data = imgDataFull.data;

    let attempts = 0;
    const maxAttempts = FRAGMENT_COUNT * 15;

    while (fragments.length < FRAGMENT_COUNT && attempts < maxAttempts) {
      attempts++;
      const fw = FRAGMENT_MIN_SIZE + rand() * (FRAGMENT_MAX_SIZE - FRAGMENT_MIN_SIZE);
      const fh = FRAGMENT_MIN_SIZE * 0.7 + rand() * (FRAGMENT_MAX_SIZE * 0.7 - FRAGMENT_MIN_SIZE * 0.7);
      const fx = padX + rand() * (W - padX * 2 - fw);
      const fy = padY + rand() * (H - padY * 2 - fh);

      const sx = Math.floor(fx * this.dpr);
      const sy = Math.floor(fy * this.dpr);
      const sw = Math.max(1, Math.floor(fw * this.dpr));
      const sh = Math.max(1, Math.floor(fh * this.dpr));

      if (sx < 0 || sy < 0 || sx + sw > offscreen.width || sy + sh > offscreen.height) continue;

      let alphaSum = 0;
      let rSum = 0, gSum = 0, bSum = 0, pixelCount = 0;
      const step = Math.max(1, Math.floor(sw / 8));

      for (let y = 0; y < sh; y += step) {
        for (let x = 0; x < sw; x += step) {
          const idx = ((sy + y) * offscreen.width + (sx + x)) * 4;
          const a = data[idx + 3];
          if (a > 15) {
            alphaSum += a;
            rSum += data[idx];
            gSum += data[idx + 1];
            bSum += data[idx + 2];
            pixelCount++;
          }
        }
      }

      if (pixelCount < 4) continue;

      const avgR = Math.round(rSum / pixelCount);
      const avgG = Math.round(gSum / pixelCount);
      const avgB = Math.round(bSum / pixelCount);
      const avgColor = `rgb(${avgR}, ${avgG}, ${avgB})`;

      if (avgR < 20 && avgG < 15 && avgB < 10 && alphaSum / pixelCount < 50) continue;

      let cached: HTMLCanvasElement | null = null;
      try {
        const imgData = octx.getImageData(sx, sy, sw, sh);
        const tmp = document.createElement('canvas');
        tmp.width = sw;
        tmp.height = sh;
        const tctx = tmp.getContext('2d');
        if (tctx) {
          tctx.putImageData(imgData, 0, 0);
          cached = tmp;
        }
      } catch (e) {
        cached = null;
      }

      const angle = rand() * Math.PI * 2;
      const dist = 80 + rand() * 220;

      fragments.push({
        id: fragments.length,
        originalX: fx + fw / 2,
        originalY: fy + fh / 2,
        scatterX: fx + fw / 2 + Math.cos(angle) * dist,
        scatterY: fy + fh / 2 + Math.sin(angle) * dist,
        width: fw,
        height: fh,
        rotation: 0,
        scatterRotation: (rand() - 0.5) * Math.PI * 1.6,
        cachedCanvas: cached,
        avgColor,
        opacity: 1
      });
    }

    if (fragments.length < FRAGMENT_COUNT) {
      for (let i = fragments.length; i < FRAGMENT_COUNT; i++) {
        const fw = FRAGMENT_MIN_SIZE + rand() * (FRAGMENT_MAX_SIZE - FRAGMENT_MIN_SIZE);
        const fh = FRAGMENT_MIN_SIZE * 0.7 + rand() * (FRAGMENT_MAX_SIZE * 0.7 - FRAGMENT_MIN_SIZE * 0.7);
        const fx = padX + rand() * (W - padX * 2 - fw);
        const fy = padY + rand() * (H - padY * 2 - fh);
        const angle = rand() * Math.PI * 2;
        const dist = 80 + rand() * 220;

        fragments.push({
          id: i,
          originalX: fx + fw / 2,
          originalY: fy + fh / 2,
          scatterX: fx + fw / 2 + Math.cos(angle) * dist,
          scatterY: fy + fh / 2 + Math.sin(angle) * dist,
          width: fw,
          height: fh,
          rotation: 0,
          scatterRotation: (rand() - 0.5) * Math.PI * 1.6,
          cachedCanvas: null,
          avgColor: `rgba(${120 + rand() * 40}, ${100 + rand() * 30}, ${60 + rand() * 20}, 0.6)`,
          opacity: 0.7
        });
      }
    }

    return fragments;
  }

  getChapters(): ChapterData[] {
    return this.chapters;
  }

  setBrightness(multiplier: number): void {
    this.brightnessMultiplier = multiplier;
  }

  renderInitial(): void {
    this.render(0, 0, 0);
  }

  render(
    scrollProgress: number,
    chapterIndex: number,
    shatterProgress: number
  ): void {
    const ctx = this.ctx;
    const W = this.canvasWidth;
    const H = this.canvasHeight;

    ctx.clearRect(0, 0, W, H);

    const scrollW = Math.max(2, W * Math.max(0, Math.min(1, scrollProgress)));

    this.drawPaperBackground(scrollW, H);
    this.drawBorder(scrollW, H);

    const fragmentT = Math.max(0, Math.min(1, 1 - shatterProgress));
    if (scrollProgress > 0.02 && fragmentT > 0.01) {
      const chapter = this.chapters[chapterIndex] || this.chapters[0];
      this.drawFragments(chapter, fragmentT, scrollW);
    }

    if (this.brightnessMultiplier !== 1) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, scrollW, H);
      ctx.clip();
      ctx.fillStyle = `rgba(255, 245, 210, ${(this.brightnessMultiplier - 1) * 0.5})`;
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
    ctx.globalAlpha = 0.05;
    for (let i = 0; i < 35; i++) {
      const x = (i * 37 + 13) % w;
      const y = (i * 53 + 29) % h;
      const r = 18 + (i % 5) * 14;
      const radial = ctx.createRadialGradient(x, y, 0, x, y, r);
      radial.addColorStop(0, 'rgba(212, 175, 55, 0.7)');
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
    ctx.strokeRect(
      borderW + 0.25, borderW + 0.25,
      w - borderW * 2 - 0.5, h - borderW * 2 - 0.5
    );
  }

  private drawFragments(
    chapter: ChapterData,
    t: number,
    scrollW: number
  ): void {
    const ctx = this.ctx;
    const easeT = t * t * (3 - 2 * t);
    const revealRight = scrollW - 6;

    for (const frag of chapter.fragments) {
      const cx = frag.scatterX + (frag.originalX - frag.scatterX) * easeT;
      const cy = frag.scatterY + (frag.originalY - frag.scatterY) * easeT;
      const rot = frag.scatterRotation * (1 - easeT);
      const alpha = 0.25 + easeT * 0.75;

      if (cx < -150 || cx > revealRight + 150) continue;

      ctx.save();
      ctx.globalAlpha = alpha * frag.opacity;
      ctx.translate(cx, cy);
      ctx.rotate(rot);

      const hw = frag.width / 2;
      const hh = frag.height / 2;

      if (frag.cachedCanvas) {
        ctx.drawImage(frag.cachedCanvas, -hw, -hh, frag.width, frag.height);
      } else {
        ctx.fillStyle = frag.avgColor;
        ctx.fillRect(-hw, -hh, frag.width, frag.height);
      }

      ctx.restore();
    }
  }
}
