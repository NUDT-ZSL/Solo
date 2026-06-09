export interface RenderState {
  text: string;
  fontFamily: string;
  fontSize: number;
  textColor: string;
  backgroundColor: string;
  shadowColor: string;
  shadowOffsetX: number;
  shadowOffsetY: number;
  shadowBlur: number;
  animation: 'none' | 'blink' | 'float' | 'rotate3d';
}

export interface FrameStats {
  fps: number;
  frameTime: number;
}

type AnimationKeyframes = {
  [key: string]: Keyframe[];
};

const ANIMATION_PRESETS: AnimationKeyframes = {
  blink: [
    { opacity: 1, offset: 0 },
    { opacity: 0, offset: 0.5 },
    { opacity: 1, offset: 1 }
  ],
  float: [
    { transform: 'translateY(0px)', offset: 0 },
    { transform: 'translateY(-10px)', offset: 0.5 },
    { transform: 'translateY(0px)', offset: 1 }
  ],
  rotate3d: [
    { transform: 'perspective(400px) rotateY(0deg)', offset: 0 },
    { transform: 'perspective(400px) rotateY(360deg)', offset: 1 }
  ]
};

const ANIMATION_DURATIONS: Record<string, number> = {
  blink: 1000,
  float: 2000,
  rotate3d: 3000
};

export class FontRenderer {
  private previewEl: HTMLElement;
  private previewTextEl: HTMLElement;
  private currentAnimation: Animation | null = null;
  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;
  private lastFrameTime: number = 0;
  private frameTimes: number[] = [];
  private rafId: number | null = null;
  private onStatsUpdate: ((stats: FrameStats) => void) | null = null;

  constructor(previewEl: HTMLElement, previewTextEl: HTMLElement) {
    this.previewEl = previewEl;
    this.previewTextEl = previewTextEl;
    this.startPerfLoop();
  }

  render(state: RenderState): void {
    const t0 = performance.now();

    this.previewEl.style.backgroundColor = state.backgroundColor;

    this.previewTextEl.textContent = state.text;
    this.previewTextEl.style.fontFamily = state.fontFamily;
    this.previewTextEl.style.fontSize = `${state.fontSize}px`;
    this.previewTextEl.style.color = state.textColor;

    if (state.shadowBlur > 0 || state.shadowOffsetX !== 0 || state.shadowOffsetY !== 0) {
      this.previewTextEl.style.textShadow = `${state.shadowOffsetX}px ${state.shadowOffsetY}px ${state.shadowBlur}px ${state.shadowColor}`;
    } else {
      this.previewTextEl.style.textShadow = 'none';
    }

    this.applyAnimation(state.animation);

    this.recordFrame(performance.now() - t0);
  }

  private applyAnimation(type: RenderState['animation']): void {
    if (this.currentAnimation) {
      this.currentAnimation.cancel();
      this.currentAnimation = null;
    }

    if (type === 'none') {
      this.previewTextEl.style.animation = '';
      this.previewTextEl.style.opacity = '1';
      this.previewTextEl.style.transform = 'none';
      return;
    }

    const keyframes = ANIMATION_PRESETS[type];
    const duration = ANIMATION_DURATIONS[type];

    if (!keyframes) return;

    this.currentAnimation = this.previewTextEl.animate(keyframes, {
      duration,
      iterations: Infinity,
      easing: 'ease-in-out'
    });
  }

  setOnStatsUpdate(callback: (stats: FrameStats) => void): void {
    this.onStatsUpdate = callback;
  }

  private startPerfLoop(): void {
    this.lastFrameTime = performance.now();
    this.lastFpsUpdate = performance.now();

    const tick = (now: number) => {
      const frameTime = now - this.lastFrameTime;
      this.lastFrameTime = now;

      this.frameTimes.push(frameTime);
      if (this.frameTimes.length > 60) {
        this.frameTimes.shift();
      }

      this.frameCount++;

      if (now - this.lastFpsUpdate >= 500) {
        const elapsed = (now - this.lastFpsUpdate) / 1000;
        const fps = Math.round(this.frameCount / elapsed);
        const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;

        if (this.onStatsUpdate) {
          this.onStatsUpdate({ fps, frameTime: avgFrameTime });
        }

        this.frameCount = 0;
        this.lastFpsUpdate = now;
      }

      this.rafId = requestAnimationFrame(tick);
    };

    this.rafId = requestAnimationFrame(tick);
  }

  private recordFrame(time: number): void {
    this.frameTimes.push(time);
    if (this.frameTimes.length > 60) {
      this.frameTimes.shift();
    }
  }

  async exportPNG(): Promise<string> {
    const width = this.previewEl.clientWidth;
    const height = this.previewEl.clientHeight;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    const computedStyle = window.getComputedStyle(this.previewEl);
    ctx.fillStyle = computedStyle.backgroundColor;
    ctx.fillRect(0, 0, width, height);

    const textStyle = window.getComputedStyle(this.previewTextEl);

    const rect = this.previewTextEl.getBoundingClientRect();
    const previewRect = this.previewEl.getBoundingClientRect();
    const x = rect.left - previewRect.left + rect.width / 2;
    const y = rect.top - previewRect.top + (rect.height - parseFloat(textStyle.fontSize) * 0.25);

    ctx.font = `${textStyle.fontStyle} ${textStyle.fontWeight} ${textStyle.fontSize} ${textStyle.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const shadowMatch = textStyle.textShadow.match(/([-\d.]+)px\s+([-\d.]+)px\s+([-\d.]+)px\s+(.*)/);
    if (shadowMatch) {
      ctx.shadowOffsetX = parseFloat(shadowMatch[1]);
      ctx.shadowOffsetY = parseFloat(shadowMatch[2]);
      ctx.shadowBlur = parseFloat(shadowMatch[3]);
      ctx.shadowColor = shadowMatch[4].trim();
    }

    ctx.fillStyle = textStyle.color;
    ctx.fillText(this.previewTextEl.textContent || '', x, y);

    return canvas.toDataURL('image/png');
  }

  destroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.currentAnimation) {
      this.currentAnimation.cancel();
    }
  }
}
