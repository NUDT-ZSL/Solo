import { Vortex } from './vortex';

export class InteractionManager {
  private canvas: HTMLCanvasElement;
  private vortex: Vortex;
  private isDragging: boolean = false;
  private lastX: number = 0;
  private lastY: number = 0;
  private momentumX: number = 0;
  private momentumY: number = 0;
  private momentumActive: boolean = false;

  constructor(canvas: HTMLCanvasElement, vortex: Vortex) {
    this.canvas = canvas;
    this.vortex = vortex;
    this.bindEvents();
  }

  private bindEvents() {
    const c = this.canvas;

    c.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
    c.addEventListener('mouseleave', this.onMouseLeave);

    c.addEventListener('touchstart', this.onTouchStart, { passive: false });
    window.addEventListener('touchmove', this.onTouchMove, { passive: false });
    window.addEventListener('touchend', this.onTouchEnd);

    c.addEventListener('wheel', this.onWheel, { passive: false });
    c.addEventListener('click', this.onClick);
  }

  destroy() {
    const c = this.canvas;

    c.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    c.removeEventListener('mouseleave', this.onMouseLeave);

    c.removeEventListener('touchstart', this.onTouchStart);
    window.removeEventListener('touchmove', this.onTouchMove);
    window.removeEventListener('touchend', this.onTouchEnd);

    c.removeEventListener('wheel', this.onWheel);
    c.removeEventListener('click', this.onClick);
  }

  private onMouseDown = (e: MouseEvent) => {
    this.isDragging = true;
    this.momentumActive = false;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.momentumX = 0;
    this.momentumY = 0;
  };

  private onMouseMove = (e: MouseEvent) => {
    if (!this.isDragging) {
      if (this.momentumActive) {
        this.applyMomentum();
      }
      return;
    }

    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;

    this.momentumX = dx * 0.5;
    this.momentumY = dy * 0.5;

    this.applyDragDelta(dx, dy);

    this.lastX = e.clientX;
    this.lastY = e.clientY;
  };

  private onMouseUp = () => {
    if (this.isDragging) {
      this.isDragging = false;
      this.momentumActive = true;
    }
  };

  private onMouseLeave = () => {
    if (this.isDragging) {
      this.isDragging = false;
      this.momentumActive = true;
    }
  };

  private onTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 0) return;
    e.preventDefault();
    this.isDragging = true;
    this.momentumActive = false;
    const t = e.touches[0];
    this.lastX = t.clientX;
    this.lastY = t.clientY;
    this.momentumX = 0;
    this.momentumY = 0;
  };

  private onTouchMove = (e: TouchEvent) => {
    if (e.touches.length === 0) return;
    e.preventDefault();
    if (!this.isDragging) return;

    const t = e.touches[0];
    const dx = t.clientX - this.lastX;
    const dy = t.clientY - this.lastY;

    this.momentumX = dx * 0.5;
    this.momentumY = dy * 0.5;

    this.applyDragDelta(dx, dy);

    this.lastX = t.clientX;
    this.lastY = t.clientY;
  };

  private onTouchEnd = (e: TouchEvent) => {
    if (e.touches.length === 0 && this.isDragging) {
      this.isDragging = false;
      this.momentumActive = true;
    }
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    const currentScale = this.vortex.state.targetScale;
    this.vortex.setScale(currentScale * (1 + delta));
  };

  private onClick = (_e: MouseEvent) => {
    const currentSpeed = this.vortex.state.speedMultiplier;
    const pulse = currentSpeed > 1.5 ? 0.5 : 1.8;
    this.vortex.setSpeed(currentSpeed * pulse);
    setTimeout(() => {
      this.vortex.setSpeed(currentSpeed);
    }, 400);
  };

  private applyDragDelta(dx: number, dy: number) {
    const rect = this.canvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;

    const relX = this.lastX - rect.left - cx;
    const relY = this.lastY - rect.top - cy;
    const dist = Math.sqrt(relX * relX + relY * relY);

    let rotationDelta: number;
    if (dist < 1) {
      rotationDelta = (dx * 0.01) + (dy * 0.01);
    } else {
      const cross = (relX * dy - relY * dx) / (dist * dist);
      rotationDelta = cross * 2;
    }

    this.vortex.addRotation(rotationDelta);
  }

  private applyMomentum() {
    if (Math.abs(this.momentumX) < 0.05 && Math.abs(this.momentumY) < 0.05) {
      this.momentumActive = false;
      return;
    }

    this.applyDragDelta(this.momentumX, this.momentumY);
    this.momentumX *= 0.94;
    this.momentumY *= 0.94;
  }
}
