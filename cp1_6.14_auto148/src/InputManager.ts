import { EventEmitter } from 'events';
import type { InputState } from './PhysicsEngine';

export class InputManager extends EventEmitter {
  private input: InputState = {
    accelerate: false,
    brake: false,
    steerLeft: false,
    steerRight: false,
  };

  private element: HTMLElement | null = null;
  private touchControls: Map<number, { type: string }> = new Map();
  private boundOnKeyDown: (e: KeyboardEvent) => void;
  private boundOnKeyUp: (e: KeyboardEvent) => void;
  private boundOnTouchStart: (e: TouchEvent) => void;
  private boundOnTouchMove: (e: TouchEvent) => void;
  private boundOnTouchEnd: (e: TouchEvent) => void;

  constructor() {
    super();
    this.boundOnKeyDown = this.onKeyDown.bind(this);
    this.boundOnKeyUp = this.onKeyUp.bind(this);
    this.boundOnTouchStart = this.onTouchStart.bind(this);
    this.boundOnTouchMove = this.onTouchMove.bind(this);
    this.boundOnTouchEnd = this.onTouchEnd.bind(this);
  }

  attach(element: HTMLElement): void {
    this.detach();
    this.element = element;

    window.addEventListener('keydown', this.boundOnKeyDown);
    window.addEventListener('keyup', this.boundOnKeyUp);

    element.addEventListener('touchstart', this.boundOnTouchStart, { passive: false });
    element.addEventListener('touchmove', this.boundOnTouchMove, { passive: false });
    element.addEventListener('touchend', this.boundOnTouchEnd);
    element.addEventListener('touchcancel', this.boundOnTouchEnd);
  }

  detach(): void {
    window.removeEventListener('keydown', this.boundOnKeyDown);
    window.removeEventListener('keyup', this.boundOnKeyUp);

    if (this.element) {
      this.element.removeEventListener('touchstart', this.boundOnTouchStart);
      this.element.removeEventListener('touchmove', this.boundOnTouchMove);
      this.element.removeEventListener('touchend', this.boundOnTouchEnd);
      this.element.removeEventListener('touchcancel', this.boundOnTouchEnd);
    }
    this.touchControls.clear();
    this.element = null;
    this.resetInput();
  }

  getInput(): InputState {
    return { ...this.input };
  }

  private emitInputChange(): void {
    this.emit('InputChange', this.getInput());
  }

  private resetInput(): void {
    this.input = {
      accelerate: false,
      brake: false,
      steerLeft: false,
      steerRight: false,
    };
  }

  private onKeyDown(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    let changed = false;

    switch (key) {
      case 'w':
      case 'arrowup':
        if (!this.input.accelerate) {
          this.input.accelerate = true;
          changed = true;
        }
        break;
      case 's':
      case 'arrowdown':
        if (!this.input.brake) {
          this.input.brake = true;
          changed = true;
        }
        break;
      case 'a':
      case 'arrowleft':
        if (!this.input.steerLeft) {
          this.input.steerLeft = true;
          changed = true;
        }
        break;
      case 'd':
      case 'arrowright':
        if (!this.input.steerRight) {
          this.input.steerRight = true;
          changed = true;
        }
        break;
    }

    if (changed) {
      e.preventDefault();
      this.emitInputChange();
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    let changed = false;

    switch (key) {
      case 'w':
      case 'arrowup':
        if (this.input.accelerate) {
          this.input.accelerate = false;
          changed = true;
        }
        break;
      case 's':
      case 'arrowdown':
        if (this.input.brake) {
          this.input.brake = false;
          changed = true;
        }
        break;
      case 'a':
      case 'arrowleft':
        if (this.input.steerLeft) {
          this.input.steerLeft = false;
          changed = true;
        }
        break;
      case 'd':
      case 'arrowright':
        if (this.input.steerRight) {
          this.input.steerRight = false;
          changed = true;
        }
        break;
    }

    if (changed) {
      e.preventDefault();
      this.emitInputChange();
    }
  }

  private onTouchStart(e: TouchEvent): void {
    if (!this.element) return;
    e.preventDefault();

    const rect = this.element.getBoundingClientRect();

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      const isLeftSide = x < rect.width / 2;
      const isTopHalf = y < rect.height / 2;

      if (isLeftSide) {
        if (x < rect.width / 4) {
          this.touchControls.set(touch.identifier, { type: 'steerLeft' });
          this.input.steerLeft = true;
        } else {
          this.touchControls.set(touch.identifier, { type: 'steerRight' });
          this.input.steerRight = true;
        }
      } else {
        if (isTopHalf) {
          this.touchControls.set(touch.identifier, { type: 'accelerate' });
          this.input.accelerate = true;
        } else {
          this.touchControls.set(touch.identifier, { type: 'brake' });
          this.input.brake = true;
        }
      }
    }
    this.emitInputChange();
  }

  private onTouchMove(e: TouchEvent): void {
    if (!this.element) return;
    e.preventDefault();

    const rect = this.element.getBoundingClientRect();
    const activeTouches = new Set<number>();

    for (let i = 0; i < e.touches.length; i++) {
      activeTouches.add(e.touches[i].identifier);
    }

    for (const [id] of Array.from(this.touchControls)) {
      if (!activeTouches.has(id)) {
        this.touchControls.delete(id);
      }
    }

    this.rebuildInputFromTouches(rect);
    this.emitInputChange();
  }

  private onTouchEnd(e: TouchEvent): void {
    if (!this.element) return;
    e.preventDefault();

    for (let i = 0; i < e.changedTouches.length; i++) {
      this.touchControls.delete(e.changedTouches[i].identifier);
    }

    const rect = this.element.getBoundingClientRect();
    this.rebuildInputFromTouches(rect);
    this.emitInputChange();
  }

  private rebuildInputFromTouches(rect: DOMRect): void {
    this.input = {
      accelerate: false,
      brake: false,
      steerLeft: false,
      steerRight: false,
    };

    for (const [, control] of Array.from(this.touchControls)) {
      switch (control.type) {
        case 'accelerate':
          this.input.accelerate = true;
          break;
        case 'brake':
          this.input.brake = true;
          break;
        case 'steerLeft':
          this.input.steerLeft = true;
          break;
        case 'steerRight':
          this.input.steerRight = true;
          break;
      }
    }
  }
}
