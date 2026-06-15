export interface KeyInputData {
  key: string;
  x: number;
  y: number;
  duration: number;
  type: 'keydown' | 'keypress' | 'keyup';
}

export type InputCallback = (data: KeyInputData) => void;

const KEY_POSITIONS: Record<string, { x: number; y: number }> = {
  q: { x: 0.15, y: 0.2 }, w: { x: 0.27, y: 0.2 }, e: { x: 0.39, y: 0.2 },
  r: { x: 0.51, y: 0.2 }, t: { x: 0.63, y: 0.2 }, y: { x: 0.75, y: 0.2 },
  u: { x: 0.87, y: 0.2 }, i: { x: 0.78, y: 0.2 }, o: { x: 0.65, y: 0.2 },
  p: { x: 0.5, y: 0.2 },
  a: { x: 0.12, y: 0.5 }, s: { x: 0.24, y: 0.5 }, d: { x: 0.36, y: 0.5 },
  f: { x: 0.48, y: 0.5 }, g: { x: 0.6, y: 0.5 }, h: { x: 0.72, y: 0.5 },
  j: { x: 0.84, y: 0.5 }, k: { x: 0.76, y: 0.5 }, l: { x: 0.88, y: 0.5 },
  z: { x: 0.18, y: 0.8 }, x: { x: 0.3, y: 0.8 }, c: { x: 0.42, y: 0.8 },
  v: { x: 0.54, y: 0.8 }, b: { x: 0.66, y: 0.8 }, n: { x: 0.78, y: 0.8 },
  m: { x: 0.7, y: 0.8 },
};

const PRESS_INTERVAL_MS = 100;

export class InputManager {
  private target: HTMLElement;
  private callback: InputCallback;
  private keyDownTimes: Map<string, number> = new Map();
  private pressIntervals: Map<string, number> = new Map();
  private charCount: number = 0;
  private lastSpaceTime: number = 0;
  private onDoubleSpace?: () => void;

  constructor(targetElement: HTMLElement, callback: InputCallback, onDoubleSpace?: () => void) {
    this.target = targetElement;
    this.callback = callback;
    this.onDoubleSpace = onDoubleSpace;
  }

  start(): void {
    this.target.addEventListener('keydown', this.handleKeyDown);
    this.target.addEventListener('keyup', this.handleKeyUp);
  }

  stop(): void {
    this.target.removeEventListener('keydown', this.handleKeyDown);
    this.target.removeEventListener('keyup', this.handleKeyUp);
    this.pressIntervals.forEach((id) => clearInterval(id));
    this.pressIntervals.clear();
  }

  getCharCount(): number {
    return this.charCount;
  }

  setCharCount(count: number): void {
    this.charCount = count;
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    const key = e.key.toLowerCase();

    if (e.key === ' ' || e.code === 'Space') {
      const now = performance.now();
      if (now - this.lastSpaceTime < 300) {
        this.onDoubleSpace?.();
      }
      this.lastSpaceTime = now;
    }

    if (!this.isLetterKey(key)) return;

    const now = performance.now();
    const isFirstPress = !this.keyDownTimes.has(key);

    if (isFirstPress) {
      this.keyDownTimes.set(key, now);
      this.charCount++;
      const pos = this.getKeyPosition(key);
      this.callback({
        key,
        x: pos.x,
        y: pos.y,
        duration: 0,
        type: 'keydown',
      });
      this.startPressInterval(key);
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    const key = e.key.toLowerCase();
    if (!this.isLetterKey(key)) return;

    const downTime = this.keyDownTimes.get(key);
    if (downTime !== undefined) {
      const duration = performance.now() - downTime;
      const pos = this.getKeyPosition(key);
      this.callback({
        key,
        x: pos.x,
        y: pos.y,
        duration,
        type: 'keyup',
      });
      this.keyDownTimes.delete(key);
    }

    const intervalId = this.pressIntervals.get(key);
    if (intervalId !== undefined) {
      clearInterval(intervalId);
      this.pressIntervals.delete(key);
    }
  };

  private startPressInterval(key: string): void {
    const intervalId = window.setInterval(() => {
      const downTime = this.keyDownTimes.get(key);
      if (downTime !== undefined) {
        const duration = performance.now() - downTime;
        const pos = this.getKeyPosition(key);
        this.callback({
          key,
          x: pos.x + (Math.random() - 0.5) * 0.05,
          y: pos.y + (Math.random() - 0.5) * 0.05,
          duration,
          type: 'keypress',
        });
      }
    }, PRESS_INTERVAL_MS);
    this.pressIntervals.set(key, intervalId);
  }

  private isLetterKey(key: string): boolean {
    return /^[a-z]$/.test(key);
  }

  private getKeyPosition(key: string): { x: number; y: number } {
    return KEY_POSITIONS[key] || { x: 0.5, y: 0.5 };
  }

  destroy(): void {
    this.stop();
    this.keyDownTimes.clear();
  }
}
