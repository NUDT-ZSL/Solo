export interface CharacterState {
  char: string;
  x: number;
  y: number;
  opacity: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
  appearProgress: number;
  shakePhase: number;
  appearStartMs: number;
  fontSize: number;
}

export const CHAR_APPEAR_DURATION_MS = 300;
export const CHAR_INTERVAL_MIN_MS = 200;
export const CHAR_INTERVAL_MAX_MS = 300;
export const CHAR_POSITION_JITTER_PX = 1;
export const CHAR_ROTATION_JITTER_DEG = 2;
export const TOTAL_DURATION_TARGET_MIN_MS = 5000;
export const TOTAL_DURATION_TARGET_MAX_MS = 8000;

export class TextAnimation {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private characters: CharacterState[] = [];
  private animFrameId: number = 0;
  private lastTime: number = 0;
  private elapsed: number = 0;
  private isWriting: boolean = false;
  private width: number = 0;
  private height: number = 0;
  private dpr: number = 1;
  private onComplete?: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.initCanvas();
  }

  private initCanvas(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(this.dpr, this.dpr);
  }

  resize(): void {
    this.initCanvas();
  }

  clear(): void {
    this.characters = [];
    this.isWriting = false;
    this.elapsed = 0;
    this.render();
  }

  generate(text: string, onComplete?: () => void): boolean {
    if (text.length < 20 || text.length > 100) return false;
    this.onComplete = onComplete;
    this.characters = this.layoutText(text);
    this.isWriting = true;
    this.elapsed = 0;
    this.lastTime = performance.now();
    if (!this.animFrameId) this.startLoop();
    return true;
  }

  private layoutText(text: string): CharacterState[] {
    const padding = this.width * 0.12;
    const contentWidth = this.width - padding * 2;
    const centerY = this.height * 0.5;
    const fontSize = Math.min(this.width * 0.035, 26);
    const lineHeight = fontSize * 1.8;
    const charsPerLine = Math.max(4, Math.floor(contentWidth / (fontSize * 1.05)));

    const lines: string[] = [];
    for (let i = 0; i < text.length; i += charsPerLine) {
      lines.push(text.slice(i, i + charsPerLine));
    }
    const totalLines = lines.length;
    const startY = centerY - ((totalLines - 1) * lineHeight) / 2;

    const totalChars = text.length;
    const targetDuration = TOTAL_DURATION_TARGET_MIN_MS
      + Math.random() * (TOTAL_DURATION_TARGET_MAX_MS - TOTAL_DURATION_TARGET_MIN_MS);
    const avgInterval = Math.max(
      CHAR_INTERVAL_MIN_MS,
      Math.min(CHAR_INTERVAL_MAX_MS, targetDuration / Math.max(1, totalChars))
    );

    const result: CharacterState[] = [];
    let cumulativeDelay = 0;

    lines.forEach((line, lineIdx) => {
      const lineWidth = line.length * fontSize * 1.05;
      const startX = (this.width - lineWidth) / 2 + fontSize * 0.5;
      for (let i = 0; i < line.length; i++) {
        const jitterX = (Math.random() - 0.5) * CHAR_POSITION_JITTER_PX * 2;
        const jitterY = (Math.random() - 0.5) * CHAR_POSITION_JITTER_PX * 2;
        const jitterRot = (Math.random() - 0.5) * CHAR_ROTATION_JITTER_DEG * 2;
        result.push({
          char: line[i],
          x: startX + i * fontSize * 1.05,
          y: startY + lineIdx * lineHeight,
          opacity: 0,
          offsetX: jitterX,
          offsetY: jitterY,
          rotation: jitterRot * (Math.PI / 180),
          appearProgress: 0,
          shakePhase: Math.random() * Math.PI * 2,
          appearStartMs: cumulativeDelay,
          fontSize
        });
        cumulativeDelay += CHAR_INTERVAL_MIN_MS
          + Math.random() * (avgInterval * 2 - CHAR_INTERVAL_MIN_MS);
      }
    });

    return result;
  }

  start(): void {
    if (!this.animFrameId) {
      this.lastTime = performance.now();
      this.startLoop();
    }
  }

  stop(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = 0;
    }
  }

  private startLoop(): void {
    const loop = (time: number) => {
      const dt = Math.min(time - this.lastTime, 33);
      this.lastTime = time;
      this.update(dt);
      this.render();
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  private update(dt: number): void {
    if (this.characters.length === 0) return;

    if (this.isWriting) {
      this.elapsed += dt;
      let anyActive = false;

      for (const ch of this.characters) {
        if (this.elapsed >= ch.appearStartMs) {
          const localT = this.elapsed - ch.appearStartMs;
          const progress = Math.min(1, localT / CHAR_APPEAR_DURATION_MS);
          const eased = 1 - Math.pow(1 - progress, 3);
          ch.appearProgress = progress;
          ch.opacity = eased;

          if (progress < 1) {
            ch.offsetX = (Math.random() - 0.5) * 2 * (1 - eased);
            ch.offsetY = (Math.random() - 0.5) * 2 * (1 - eased);
            anyActive = true;
          } else {
            ch.shakePhase += dt * 0.003;
            ch.offsetX = Math.sin(ch.shakePhase) * 0.3
              + (Math.random() - 0.5) * CHAR_POSITION_JITTER_PX;
            ch.offsetY = Math.cos(ch.shakePhase * 0.8) * 0.2
              + (Math.random() - 0.5) * CHAR_POSITION_JITTER_PX;
          }
        } else {
          anyActive = true;
        }
      }

      if (!anyActive) {
        this.isWriting = false;
        if (this.onComplete) {
          const cb = this.onComplete;
          this.onComplete = undefined;
          cb();
        }
      }
    } else {
      for (const ch of this.characters) {
        ch.shakePhase += dt * 0.003;
        ch.offsetX = Math.sin(ch.shakePhase) * 0.3;
        ch.offsetY = Math.cos(ch.shakePhase * 0.8) * 0.2;
      }
    }
  }

  private render(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    if (this.characters.length === 0) return;

    for (const ch of this.characters) {
      if (ch.opacity <= 0.01) continue;
      ctx.save();
      const px = ch.x + ch.offsetX;
      const py = ch.y + ch.offsetY;
      ctx.translate(px, py);
      ctx.rotate(ch.rotation);
      ctx.globalAlpha = ch.opacity;

      ctx.shadowColor = 'rgba(0,0,0,0.08)';
      ctx.shadowBlur = 2;
      ctx.shadowOffsetY = 1;

      const fs = ch.fontSize;
      ctx.font = `${fs}px "Ma Shan Zheng", "KaiTi", "STKaiti", "楷体", cursive`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const progress = ch.appearProgress;
      if (progress < 1) {
        const grad = ctx.createLinearGradient(0, -fs, 0, fs);
        grad.addColorStop(0, `rgba(51, 34, 17, ${ch.opacity})`);
        grad.addColorStop(1, `rgba(85, 68, 51, ${ch.opacity * 0.95})`);
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = '#2D2416';
      }

      ctx.fillText(ch.char, 0, 0);
      ctx.restore();
    }
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  isAnimating(): boolean {
    return this.isWriting;
  }

  getCharCount(): number {
    return this.characters.length;
  }
}
