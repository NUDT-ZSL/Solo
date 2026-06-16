export type GestureType = 'tap' | 'swipeLeft' | 'swipeRight' | 'swipeUp' | 'swipeDown' | 'longPress' | 'pinch' | 'unknown';

export interface TouchPoint {
  x: number;
  y: number;
  time: number;
}

export interface GestureEvent {
  type: GestureType;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  duration: number;
  velocity: number;
}

export interface GyroscopeData {
  alpha: number;
  beta: number;
  gamma: number;
  timestamp: number;
}

export type GestureListener = (event: GestureEvent) => void;
export type GyroscopeListener = (data: GyroscopeData) => void;

const SWIPE_THRESHOLD = 50;
const SWIPE_VELOCITY_THRESHOLD = 0.3;
const LONG_PRESS_DURATION = 500;
const TAP_THRESHOLD = 10;

export class TouchGestureRecognizer {
  private touchPoints: TouchPoint[] = [];
  private listeners: Set<GestureListener> = new Set();
  private element: HTMLElement | null = null;
  private longPressTimer: ReturnType<typeof setTimeout> | null = null;
  private longPressFired = false;

  attach(element: HTMLElement): void {
    this.element = element;
    element.addEventListener('touchstart', this.handleTouchStart, { passive: true });
    element.addEventListener('touchmove', this.handleTouchMove, { passive: true });
    element.addEventListener('touchend', this.handleTouchEnd, { passive: true });
    element.addEventListener('touchcancel', this.handleTouchCancel, { passive: true });
  }

  detach(): void {
    if (!this.element) return;
    this.element.removeEventListener('touchstart', this.handleTouchStart);
    this.element.removeEventListener('touchmove', this.handleTouchMove);
    this.element.removeEventListener('touchend', this.handleTouchEnd);
    this.element.removeEventListener('touchcancel', this.handleTouchCancel);
    this.element = null;
    this.clearLongPressTimer();
  }

  addListener(listener: GestureListener): void {
    this.listeners.add(listener);
  }

  removeListener(listener: GestureListener): void {
    this.listeners.delete(listener);
  }

  private emit(event: GestureEvent): void {
    this.listeners.forEach(l => l(event));
  }

  private handleTouchStart = (e: TouchEvent): void => {
    const touch = e.touches[0];
    this.touchPoints = [{ x: touch.clientX, y: touch.clientY, time: Date.now() }];
    this.longPressFired = false;
    this.clearLongPressTimer();
    this.longPressTimer = setTimeout(() => {
      this.longPressFired = true;
      const point = this.touchPoints[0];
      if (point) {
        this.emit({
          type: 'longPress',
          startX: point.x,
          startY: point.y,
          endX: point.x,
          endY: point.y,
          duration: LONG_PRESS_DURATION,
          velocity: 0
        });
      }
    }, LONG_PRESS_DURATION);
  };

  private handleTouchMove = (e: TouchEvent): void => {
    const touch = e.touches[0];
    this.touchPoints.push({ x: touch.clientX, y: touch.clientY, time: Date.now() });
    if (this.touchPoints.length > 10) {
      this.touchPoints.shift();
    }
    const first = this.touchPoints[0];
    const last = this.touchPoints[this.touchPoints.length - 1];
    const distance = Math.hypot(last.x - first.x, last.y - first.y);
    if (distance > TAP_THRESHOLD) {
      this.clearLongPressTimer();
    }
  };

  private handleTouchEnd = (e: TouchEvent): void => {
    this.clearLongPressTimer();
    if (this.longPressFired) {
      this.touchPoints = [];
      return;
    }
    const touch = e.changedTouches[0];
    const endPoint: TouchPoint = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    const startPoint = this.touchPoints[0] || endPoint;
    const gesture = this.recognize(startPoint, endPoint);
    this.emit(gesture);
    this.touchPoints = [];
  };

  private handleTouchCancel = (): void => {
    this.clearLongPressTimer();
    this.touchPoints = [];
  };

  private clearLongPressTimer(): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  private recognize(start: TouchPoint, end: TouchPoint): GestureEvent {
    const deltaX = end.x - start.x;
    const deltaY = end.y - start.y;
    const distance = Math.hypot(deltaX, deltaY);
    const duration = Math.max(end.time - start.time, 1);
    const velocity = distance / duration;

    if (distance < TAP_THRESHOLD && duration < LONG_PRESS_DURATION) {
      return {
        type: 'tap',
        startX: start.x,
        startY: start.y,
        endX: end.x,
        endY: end.y,
        duration,
        velocity
      };
    }

    if (distance >= SWIPE_THRESHOLD || velocity >= SWIPE_VELOCITY_THRESHOLD) {
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      let type: GestureType = 'unknown';

      if (absX > absY) {
        type = deltaX > 0 ? 'swipeRight' : 'swipeLeft';
      } else {
        type = deltaY > 0 ? 'swipeDown' : 'swipeUp';
      }

      return {
        type,
        startX: start.x,
        startY: start.y,
        endX: end.x,
        endY: end.y,
        duration,
        velocity
      };
    }

    return {
      type: 'unknown',
      startX: start.x,
      startY: start.y,
      endX: end.x,
      endY: end.y,
      duration,
      velocity
    };
  }
}

export class GyroscopeProvider {
  private listeners: Set<GyroscopeListener> = new Set();
  private isListening = false;
  private simulationInterval: ReturnType<typeof setInterval> | null = null;
  private simulatedData: GyroscopeData = { alpha: 0, beta: 0, gamma: 0, timestamp: 0 };
  private useMock = false;

  isSupported(): boolean {
    return typeof DeviceOrientationEvent !== 'undefined';
  }

  async requestPermission(): Promise<boolean> {
    const event = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };
    if (typeof event.requestPermission === 'function') {
      try {
        const state = await event.requestPermission();
        return state === 'granted';
      } catch {
        return false;
      }
    }
    return true;
  }

  start(useMockFallback = true): void {
    if (this.isListening) return;

    if (this.isSupported()) {
      window.addEventListener('deviceorientation', this.handleOrientation);
      this.isListening = true;
    } else if (useMockFallback) {
      this.useMock = true;
      this.startSimulation();
    }
  }

  stop(): void {
    if (this.isListening) {
      window.removeEventListener('deviceorientation', this.handleOrientation);
      this.isListening = false;
    }
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
    this.useMock = false;
  }

  addListener(listener: GyroscopeListener): void {
    this.listeners.add(listener);
  }

  removeListener(listener: GyroscopeListener): void {
    this.listeners.delete(listener);
  }

  private handleOrientation = (e: DeviceOrientationEvent): void => {
    const data: GyroscopeData = {
      alpha: e.alpha || 0,
      beta: e.beta || 0,
      gamma: e.gamma || 0,
      timestamp: Date.now()
    };
    this.emit(data);
  };

  private startSimulation(): void {
    this.simulationInterval = setInterval(() => {
      const now = Date.now() / 1000;
      this.simulatedData = {
        alpha: Math.sin(now * 0.5) * 10,
        beta: Math.cos(now * 0.3) * 15,
        gamma: Math.sin(now * 0.7) * 8,
        timestamp: Date.now()
      };
      this.emit(this.simulatedData);
    }, 50);
  }

  private emit(data: GyroscopeData): void {
    this.listeners.forEach(l => l(data));
  }

  isMockActive(): boolean {
    return this.useMock;
  }
}

export const createGestureRecognizer = (): TouchGestureRecognizer => {
  return new TouchGestureRecognizer();
};

export const createGyroscopeProvider = (): GyroscopeProvider => {
  return new GyroscopeProvider();
};

export const parseSwipeDirection = (event: GestureEvent): 'horizontal' | 'vertical' | 'none' => {
  if (!event.type.startsWith('swipe')) return 'none';
  if (event.type === 'swipeLeft' || event.type === 'swipeRight') return 'horizontal';
  return 'vertical';
};
