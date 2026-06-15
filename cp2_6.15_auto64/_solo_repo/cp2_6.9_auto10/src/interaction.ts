import * as THREE from 'three';

export interface Transform {
  rotationX: number;
  rotationY: number;
  scale: number;
  position: THREE.Vector3;
}

export type InteractionMode = 'idle' | 'dragging' | 'pinching' | 'tapping' | 'flicking';

interface TouchPoint {
  id: number;
  x: number;
  y: number;
  startTime: number;
  lastX: number;
  lastY: number;
  lastTime: number;
}

export interface InteractionEvent {
  type: 'transform' | 'select' | 'flick' | 'pulse' | 'trail';
  transform?: Partial<Transform>;
  screenX?: number;
  screenY?: number;
  velocityX?: number;
  velocityY?: number;
  speed?: number;
  pointerWorld?: THREE.Vector3;
}

type EventCallback = (event: InteractionEvent) => void;

export class InteractionController {
  private element: HTMLElement;
  private camera: THREE.PerspectiveCamera;
  private raycaster: THREE.Raycaster;
  private listeners: Map<string, EventCallback[]> = new Map();

  private transform: Transform = {
    rotationX: 0,
    rotationY: 0,
    scale: 1,
    position: new THREE.Vector3(0, 0, 0)
  };

  private mode: InteractionMode = 'idle';
  private touches: Map<number, TouchPoint> = new Map();
  private lastFlickTime: number = 0;
  private holdStartTime: number = 0;
  private holdTimeoutId: number | null = null;
  private isMouseDown: boolean = false;
  private mouseDownTime: number = 0;
  private mouseStartX: number = 0;
  private mouseStartY: number = 0;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private lastMoveTime: number = 0;
  private initialPinchDistance: number = 0;
  private initialScale: number = 1;

  public readonly DRAG_SENSITIVITY = 0.008;
  public readonly SCALE_MIN = 0.5;
  public readonly SCALE_MAX = 3.0;
  public readonly FLICK_SPEED_THRESHOLD = 200;
  public readonly HOLD_DURATION = 2000;

  constructor(element: HTMLElement, camera: THREE.PerspectiveCamera) {
    this.element = element;
    this.camera = camera;
    this.raycaster = new THREE.Raycaster();
    this.bindEvents();
  }

  private bindEvents(): void {
    this.element.addEventListener('mousedown', this.onMouseDown);
    this.element.addEventListener('mousemove', this.onMouseMove);
    this.element.addEventListener('mouseup', this.onMouseUp);
    this.element.addEventListener('mouseleave', this.onMouseUp);

    this.element.addEventListener('touchstart', this.onTouchStart, { passive: false });
    this.element.addEventListener('touchmove', this.onTouchMove, { passive: false });
    this.element.addEventListener('touchend', this.onTouchEnd);
    this.element.addEventListener('touchcancel', this.onTouchEnd);

    this.element.addEventListener('wheel', this.onWheel, { passive: false });
    this.element.addEventListener('contextmenu', this.onContextMenu);
  }

  public destroy(): void {
    this.element.removeEventListener('mousedown', this.onMouseDown);
    this.element.removeEventListener('mousemove', this.onMouseMove);
    this.element.removeEventListener('mouseup', this.onMouseUp);
    this.element.removeEventListener('mouseleave', this.onMouseUp);
    this.element.removeEventListener('touchstart', this.onTouchStart);
    this.element.removeEventListener('touchmove', this.onTouchMove);
    this.element.removeEventListener('touchend', this.onTouchEnd);
    this.element.removeEventListener('touchcancel', this.onTouchEnd);
    this.element.removeEventListener('wheel', this.onWheel);
    this.element.removeEventListener('contextmenu', this.onContextMenu);
    this.clearHoldTimeout();
  }

  public on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  public off(event: string, callback?: EventCallback): void {
    if (!this.listeners.has(event)) return;
    if (!callback) {
      this.listeners.delete(event);
      return;
    }
    const callbacks = this.listeners.get(event)!;
    const index = callbacks.indexOf(callback);
    if (index !== -1) callbacks.splice(index, 1);
  }

  private emit(event: InteractionEvent): void {
    const callbacks = this.listeners.get(event.type) || [];
    callbacks.forEach(cb => cb(event));
    const allCallbacks = this.listeners.get('*') || [];
    allCallbacks.forEach(cb => cb(event));
  }

  public getTransform(): Transform {
    return { ...this.transform, position: this.transform.position.clone() };
  }

  public getMode(): InteractionMode {
    return this.mode;
  }

  private screenToNdc(x: number, y: number): THREE.Vector2 {
    const rect = this.element.getBoundingClientRect();
    return new THREE.Vector2(
      ((x - rect.left) / rect.width) * 2 - 1,
      -((y - rect.top) / rect.height) * 2 + 1
    );
  }

  private screenToWorld(x: number, y: number, depth: number = 0): THREE.Vector3 {
    const ndc = this.screenToNdc(x, y);
    const vector = new THREE.Vector3(ndc.x, ndc.y, 0.5);
    vector.unproject(this.camera);
    const dir = vector.sub(this.camera.position).normalize();
    const distance = -this.camera.position.z / dir.z;
    return this.camera.position.clone().add(dir.multiplyScalar(distance));
  }

  private onContextMenu = (e: MouseEvent): void => {
    e.preventDefault();
  };

  private onMouseDown = (e: MouseEvent): void => {
    if (e.button !== 0) return;
    e.preventDefault();
    this.isMouseDown = true;
    this.mouseDownTime = performance.now();
    this.mouseStartX = e.clientX;
    this.mouseStartY = e.clientY;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
    this.lastMoveTime = performance.now();
    this.mode = 'tapping';
    this.startHoldTimer(e.clientX, e.clientY);
  };

  private onMouseMove = (e: MouseEvent): void => {
    const now = performance.now();
    const worldPos = this.screenToWorld(e.clientX, e.clientY);

    this.emit({
      type: 'trail',
      screenX: e.clientX,
      screenY: e.clientY,
      pointerWorld: worldPos
    });

    if (!this.isMouseDown) return;
    e.preventDefault();

    const dx = e.clientX - this.lastMouseX;
    const dy = e.clientY - this.lastMouseY;
    const dt = now - this.lastMoveTime;
    const moveDistance = Math.hypot(e.clientX - this.mouseStartX, e.clientY - this.mouseStartY);

    if (moveDistance > 5 && this.mode === 'tapping') {
      this.mode = 'dragging';
      this.clearHoldTimeout();
    }

    if (this.mode === 'dragging') {
      this.transform.rotationY += dx * this.DRAG_SENSITIVITY;
      this.transform.rotationX += dy * this.DRAG_SENSITIVITY;
      this.transform.rotationX = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, this.transform.rotationX));

      this.emit({
        type: 'transform',
        transform: {
          rotationX: this.transform.rotationX,
          rotationY: this.transform.rotationY
        }
      });

      if (dt > 0) {
        const speed = Math.hypot(dx, dy) / dt * 1000;
        if (speed > this.FLICK_SPEED_THRESHOLD && now - this.lastFlickTime > 500) {
          this.lastFlickTime = now;
          this.mode = 'flicking';
          this.emit({
            type: 'flick',
            screenX: e.clientX,
            screenY: e.clientY,
            velocityX: dx / dt * 1000,
            velocityY: dy / dt * 1000,
            speed: speed,
            pointerWorld: worldPos
          });
          setTimeout(() => { if (this.isMouseDown) this.mode = 'dragging'; }, 100);
        }
      }
    }

    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
    this.lastMoveTime = now;
  };

  private onMouseUp = (e: MouseEvent): void => {
    if (!this.isMouseDown) return;
    this.isMouseDown = false;
    this.clearHoldTimeout();

    const now = performance.now();
    const tapDuration = now - this.mouseDownTime;
    const moveDistance = Math.hypot(e.clientX - this.mouseStartX, e.clientY - this.mouseStartY);

    if (this.mode === 'tapping' && tapDuration < 300 && moveDistance < 10) {
      const worldPos = this.screenToWorld(e.clientX, e.clientY);
      this.emit({
        type: 'select',
        screenX: e.clientX,
        screenY: e.clientY,
        pointerWorld: worldPos
      });
    }

    this.mode = 'idle';
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    const newScale = this.applyNonlinearScale(this.transform.scale + delta);
    if (newScale !== this.transform.scale) {
      this.transform.scale = newScale;
      this.emit({
        type: 'transform',
        transform: { scale: this.transform.scale }
      });
    }
  };

  private applyNonlinearScale(value: number): number {
    const clamped = Math.max(this.SCALE_MIN, Math.min(this.SCALE_MAX, value));
    const t = (clamped - this.SCALE_MIN) / (this.SCALE_MAX - this.SCALE_MIN);
    const eased = Math.pow(t, 1.5);
    return this.SCALE_MIN + eased * (this.SCALE_MAX - this.SCALE_MIN);
  }

  private onTouchStart = (e: TouchEvent): void => {
    e.preventDefault();
    const now = performance.now();

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      this.touches.set(touch.identifier, {
        id: touch.identifier,
        x: touch.clientX,
        y: touch.clientY,
        startTime: now,
        lastX: touch.clientX,
        lastY: touch.clientY,
        lastTime: now
      });
    }

    if (this.touches.size === 1) {
      const [touch] = this.touches.values();
      this.mouseStartX = touch.x;
      this.mouseStartY = touch.y;
      this.lastMouseX = touch.x;
      this.lastMouseY = touch.y;
      this.lastMoveTime = now;
      this.mode = 'tapping';
      this.startHoldTimer(touch.x, touch.y);
    } else if (this.touches.size === 2) {
      this.mode = 'pinching';
      this.clearHoldTimeout();
      const points = Array.from(this.touches.values());
      this.initialPinchDistance = Math.hypot(
        points[0].x - points[1].x,
        points[0].y - points[1].y
      );
      this.initialScale = this.transform.scale;
    }
  };

  private onTouchMove = (e: TouchEvent): void => {
    e.preventDefault();
    const now = performance.now();

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const existing = this.touches.get(touch.identifier);
      if (existing) {
        existing.lastX = existing.x;
        existing.lastY = existing.y;
        existing.lastTime = existing.lastTime || now;
        existing.x = touch.clientX;
        existing.y = touch.clientY;
        existing.lastTime = now;
      }
    }

    if (this.touches.size === 1) {
      const [touch] = this.touches.values();
      const worldPos = this.screenToWorld(touch.x, touch.y);

      this.emit({
        type: 'trail',
        screenX: touch.x,
        screenY: touch.y,
        pointerWorld: worldPos
      });

      const dx = touch.x - touch.lastX;
      const dy = touch.y - touch.lastY;
      const moveDistance = Math.hypot(touch.x - this.mouseStartX, touch.y - this.mouseStartY);
      const dt = now - (touch.lastTime || now);

      if (moveDistance > 10 && this.mode === 'tapping') {
        this.mode = 'dragging';
        this.clearHoldTimeout();
      }

      if (this.mode === 'dragging') {
        this.transform.rotationY += dx * this.DRAG_SENSITIVITY;
        this.transform.rotationX += dy * this.DRAG_SENSITIVITY;
        this.transform.rotationX = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, this.transform.rotationX));

        this.emit({
          type: 'transform',
          transform: {
            rotationX: this.transform.rotationX,
            rotationY: this.transform.rotationY
          }
        });

        if (dt > 0) {
          const speed = Math.hypot(dx, dy) / dt * 1000;
          if (speed > this.FLICK_SPEED_THRESHOLD && now - this.lastFlickTime > 500) {
            this.lastFlickTime = now;
            this.mode = 'flicking';
            this.emit({
              type: 'flick',
              screenX: touch.x,
              screenY: touch.y,
              velocityX: dx / dt * 1000,
              velocityY: dy / dt * 1000,
              speed: speed,
              pointerWorld: worldPos
            });
            setTimeout(() => { if (this.touches.size === 1) this.mode = 'dragging'; }, 100);
          }
        }
      }
    } else if (this.touches.size === 2) {
      const points = Array.from(this.touches.values());
      const currentDistance = Math.hypot(
        points[0].x - points[1].x,
        points[0].y - points[1].y
      );

      if (this.initialPinchDistance > 0) {
        const ratio = currentDistance / this.initialPinchDistance;
        const newScale = this.applyNonlinearScale(this.initialScale * ratio);
        if (Math.abs(newScale - this.transform.scale) > 0.001) {
          this.transform.scale = newScale;
          this.emit({
            type: 'transform',
            transform: { scale: this.transform.scale }
          });
        }
      }
    }
  };

  private onTouchEnd = (e: TouchEvent): void => {
    const now = performance.now();

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const existing = this.touches.get(touch.identifier);

      if (existing && this.touches.size === 1 && this.mode === 'tapping') {
        const tapDuration = now - existing.startTime;
        const moveDistance = Math.hypot(touch.clientX - this.mouseStartX, touch.clientY - this.mouseStartY);
        if (tapDuration < 300 && moveDistance < 15) {
          const worldPos = this.screenToWorld(touch.clientX, touch.clientY);
          this.emit({
            type: 'select',
            screenX: touch.clientX,
            screenY: touch.clientY,
            pointerWorld: worldPos
          });
        }
      }

      this.touches.delete(touch.identifier);
    }

    this.clearHoldTimeout();

    if (this.touches.size === 0) {
      this.mode = 'idle';
    } else if (this.touches.size === 1) {
      const [remaining] = this.touches.values();
      this.mouseStartX = remaining.x;
      this.mouseStartY = remaining.y;
      this.mode = 'tapping';
    }
  };

  private startHoldTimer(x: number, y: number): void {
    this.clearHoldTimeout();
    this.holdStartTime = performance.now();
    this.holdTimeoutId = window.setTimeout(() => {
      const worldPos = this.screenToWorld(x, y);
      this.emit({
        type: 'pulse',
        screenX: x,
        screenY: y,
        pointerWorld: worldPos
      });
    }, this.HOLD_DURATION);
  }

  private clearHoldTimeout(): void {
    if (this.holdTimeoutId !== null) {
      clearTimeout(this.holdTimeoutId);
      this.holdTimeoutId = null;
    }
  }
}
