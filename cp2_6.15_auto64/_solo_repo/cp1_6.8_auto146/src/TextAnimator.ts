export interface CharState {
  char: string;
  scale: number;
  rotation: number;
  color: string;
  opacity: number;
  glowIntensity: number;
}

export interface AnimatorOptions {
  startColor: string;
  endColor: string;
  duration: number;
  charSpacing: number;
}

function hexToRgb(hex: string): [number, number, number] {
  const cleaned = hex.replace('#', '');
  const r = parseInt(cleaned.substring(0, 2), 16);
  const g = parseInt(cleaned.substring(2, 4), 16);
  const b = parseInt(cleaned.substring(4, 6), 16);
  return [r, g, b];
}

function rgbToString(r: number, g: number, b: number, a: number = 1): string {
  return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a})`;
}

function lerpColor(c1: string, c2: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(c1);
  const [r2, g2, b2] = hexToRgb(c2);
  return rgbToString(
    r1 + (r2 - r1) * t,
    g1 + (g2 - g1) * t,
    b1 + (b2 - b1) * t,
  );
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

const MAX_CHARS = 50;

export class TextAnimator {
  private rafId: number | null = null;
  private startTime: number | null = null;
  private text: string = '';
  private options: AnimatorOptions;
  private onUpdate: (states: CharState[]) => void;
  private cachedStates: CharState[] = [];
  private lastRenderedKeys: string = '';

  constructor(onUpdate: (states: CharState[]) => void) {
    this.onUpdate = onUpdate;
    this.options = {
      startColor: '#ff6b6b',
      endColor: '#4ecdc4',
      duration: 600,
      charSpacing: 4,
    };
  }

  updateOptions(options: Partial<AnimatorOptions>): void {
    this.options = { ...this.options, ...options };
    if (this.text) {
      this.start(this.text);
    }
  }

  start(text: string): void {
    this.stop();
    this.text = text.slice(0, MAX_CHARS);
    this.startTime = null;
    this.cachedStates = [];
    this.lastRenderedKeys = '';
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private tick = (timestamp: number): void => {
    if (this.startTime === null) {
      this.startTime = timestamp;
    }

    const elapsed = timestamp - this.startTime;
    const chars = this.text.split('');
    const len = chars.length;

    if (len === 0) {
      this.cachedStates = [];
      this.onUpdate([]);
      this.rafId = null;
      return;
    }

    const staggerDelay = Math.max(30, this.options.duration / 6);
    const newStates: CharState[] = new Array(len);
    let allDone = true;
    let stateKey = '';

    for (let i = 0; i < len; i++) {
      const charStartTime = i * staggerDelay;
      const charElapsed = elapsed - charStartTime;
      const progress = Math.min(1, Math.max(0, charElapsed / this.options.duration));

      if (progress < 1) allDone = false;

      const easedScale = easeOutBack(progress);
      const easedRotation = easeOutCubic(progress);
      const easedOpacity = easeOutCubic(progress);

      const colorT = len > 1 ? i / (len - 1) : 0;
      const animColorT = colorT * easeOutCubic(progress);

      const scale = 0.5 + 0.5 * easedScale;
      const rotation = -10 + 10 * easedRotation;
      const opacity = easedOpacity;
      const color = lerpColor(this.options.startColor, this.options.endColor, animColorT);

      const glowPhase = progress < 1 ? progress : (Math.sin(elapsed / 800 + i * 0.5) * 0.3 + 0.7);
      const glowIntensity = progress < 1 ? easeOutCubic(progress) * 0.8 : glowPhase * 0.3;

      newStates[i] = { char: chars[i], scale, rotation, color, opacity, glowIntensity };
      stateKey += `${scale.toFixed(3)}${rotation.toFixed(3)}${opacity.toFixed(3)}${glowIntensity.toFixed(3)}`;
    }

    if (stateKey !== this.lastRenderedKeys) {
      this.lastRenderedKeys = stateKey;
      this.cachedStates = newStates;
      this.onUpdate(newStates);
    }

    if (!allDone) {
      this.rafId = requestAnimationFrame(this.tick);
    } else {
      this.rafId = requestAnimationFrame(this.glowTick);
    }
  };

  private glowTick = (timestamp: number): void => {
    if (this.startTime === null) return;

    const elapsed = timestamp - this.startTime;
    const chars = this.text.split('');
    const len = chars.length;

    const newStates: CharState[] = new Array(len);
    let stateKey = '';

    for (let i = 0; i < len; i++) {
      const colorT = len > 1 ? i / (len - 1) : 0;
      const color = lerpColor(this.options.startColor, this.options.endColor, colorT);
      const glowIntensity = Math.sin(elapsed / 800 + i * 0.5) * 0.3 + 0.3;

      newStates[i] = { char: chars[i], scale: 1, rotation: 0, color, opacity: 1, glowIntensity };
      stateKey += glowIntensity.toFixed(3);
    }

    if (stateKey !== this.lastRenderedKeys) {
      this.lastRenderedKeys = stateKey;
      this.cachedStates = newStates;
      this.onUpdate(newStates);
    }

    this.rafId = requestAnimationFrame(this.glowTick);
  };

  getCurrentStates(): CharState[] {
    return this.cachedStates;
  }

  getOptions(): AnimatorOptions {
    return { ...this.options };
  }
}
