import type { ViewState, TimelineRange } from './types';
import { clamp, lerp, easeOutCubic } from './eventManager';

type ViewStateCallback = (state: ViewState) => void;
type DragStateCallback = (isDragging: boolean) => void;

export class InteractionController {
  private viewState: ViewState;
  private initialState: ViewState;

  private isDragging = false;
  private isRightDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private lastDragX = 0;
  private totalDragDistance = 0;
  private dragStartTime = 0;

  private animatingReset = false;
  private resetStartState: ViewState | null = null;
  private resetStartTime = 0;
  private readonly RESET_DURATION = 500;

  private readonly MIN_ZOOM_YEARS = 5;
  private readonly MAX_ZOOM_YEARS = 100;

  private viewCallbacks: ViewStateCallback[] = [];
  private dragCallbacks: DragStateCallback[] = [];
  private clickCallbacks: Array<(x: number, y: number) => boolean> = [];

  constructor(initialRange: TimelineRange) {
    this.initialState = {
      range: { ...initialRange },
      offsetX: 0,
      zoom: 1
    };
    this.viewState = {
      range: { ...initialRange },
      offsetX: 0,
      zoom: 1
    };
    this.updateZoomFromRange();
  }

  getViewState(): ViewState {
    return {
      range: { ...this.viewState.range },
      offsetX: this.viewState.offsetX,
      zoom: this.viewState.zoom
    };
  }

  isDragInProgress(): boolean {
    return this.isRightDragging;
  }

  onViewStateChange(cb: ViewStateCallback): void {
    this.viewCallbacks.push(cb);
  }

  onDragStateChange(cb: DragStateCallback): void {
    this.dragCallbacks.push(cb);
  }

  onClick(cb: (x: number, y: number) => boolean): void {
    this.clickCallbacks.push(cb);
  }

  handleMouseDown(e: MouseEvent, canvasRect: DOMRect): void {
    const x = e.clientX - canvasRect.left;
    const y = e.clientY - canvasRect.top;

    if (e.button === 2) {
      this.isRightDragging = true;
      this.dragStartX = x;
      this.dragStartY = y;
      this.lastDragX = x;
      this.totalDragDistance = 0;
      this.dragStartTime = performance.now();
      this.notifyDragState(true);
    } else if (e.button === 0) {
      this.isDragging = true;
      this.dragStartX = x;
      this.dragStartY = y;
      this.lastDragX = x;
      this.totalDragDistance = 0;
      this.dragStartTime = performance.now();
    }
  }

  handleMouseMove(e: MouseEvent, canvasRect: DOMRect): { x: number; y: number } {
    const x = e.clientX - canvasRect.left;
    const y = e.clientY - canvasRect.top;

    if (this.isRightDragging) {
      const dx = x - this.lastDragX;
      this.totalDragDistance += Math.abs(dx);
      this.applyPanDelta(dx);
      this.lastDragX = x;
      this.notifyViewChange();
    } else if (this.isDragging) {
      const dx = x - this.lastDragX;
      this.totalDragDistance += Math.abs(dx);
      this.lastDragX = x;
    }

    return { x, y };
  }

  handleMouseUp(e: MouseEvent, canvasRect: DOMRect): boolean {
    const x = e.clientX - canvasRect.left;
    const y = e.clientY - canvasRect.top;
    const wasRightDrag = this.isRightDragging;

    if (this.isRightDragging) {
      this.isRightDragging = false;
      this.notifyDragState(false);
      if (this.totalDragDistance <= 50) {
        this.triggerClick(x, y);
      }
    }

    if (this.isDragging) {
      this.isDragging = false;
      if (!wasRightDrag && this.totalDragDistance <= 50) {
        return this.triggerClick(x, y);
      }
    }

    return false;
  }

  handleWheel(e: WheelEvent, canvasRect: DOMRect, canvasWidth: number): void {
    const x = e.clientX - canvasRect.left;
    const delta = e.deltaY > 0 ? 1 : -1;
    this.zoomAt(x, delta, canvasWidth);
    this.notifyViewChange();
  }

  resetView(): void {
    this.resetStartState = {
      range: { ...this.viewState.range },
      offsetX: this.viewState.offsetX,
      zoom: this.viewState.zoom
    };
    this.resetStartTime = performance.now();
    this.animatingReset = true;
  }

  animate(now: number): void {
    if (this.animatingReset && this.resetStartState) {
      const t = clamp((now - this.resetStartTime) / this.RESET_DURATION, 0, 1);
      const eased = easeOutCubic(t);

      this.viewState.range.startYear = lerp(
        this.resetStartState.range.startYear,
        this.initialState.range.startYear,
        eased
      );
      this.viewState.range.endYear = lerp(
        this.resetStartState.range.endYear,
        this.initialState.range.endYear,
        eased
      );
      this.viewState.offsetX = lerp(this.resetStartState.offsetX, this.initialState.offsetX, eased);
      this.updateZoomFromRange();

      if (t >= 1) {
        this.animatingReset = false;
        this.resetStartState = null;
        this.viewState.range = { ...this.initialState.range };
        this.viewState.offsetX = this.initialState.offsetX;
        this.updateZoomFromRange();
      }
      this.notifyViewChange();
    }
  }

  private applyPanDelta(dx: number): void {
    const yearSpan = this.viewState.range.endYear - this.viewState.range.startYear;
    const canvasWidth = window.innerWidth - 200;
    const yearsPerPixel = yearSpan / Math.max(1, canvasWidth);
    const yearDelta = -dx * yearsPerPixel;

    this.viewState.range.startYear += yearDelta;
    this.viewState.range.endYear += yearDelta;

    if (this.viewState.range.startYear < 500) {
      const diff = 500 - this.viewState.range.startYear;
      this.viewState.range.startYear += diff;
      this.viewState.range.endYear += diff;
    }
    if (this.viewState.range.endYear > 2100) {
      const diff = this.viewState.range.endYear - 2100;
      this.viewState.range.startYear -= diff;
      this.viewState.range.endYear -= diff;
    }
  }

  private zoomAt(mouseX: number, direction: number, canvasWidth: number): void {
    const zoomFactor = 1 + direction * 0.1;
    const { startYear, endYear } = this.viewState.range;
    const currentSpan = endYear - startYear;
    const newSpan = clamp(currentSpan * zoomFactor, this.MIN_ZOOM_YEARS, this.MAX_ZOOM_YEARS);

    if (Math.abs(newSpan - currentSpan) < 0.1) return;

    const paddingLeft = 100;
    const relX = clamp((mouseX - paddingLeft) / Math.max(1, canvasWidth - paddingLeft * 2), 0, 1);
    const anchorYear = startYear + relX * currentSpan;

    this.viewState.range.startYear = anchorYear - relX * newSpan;
    this.viewState.range.endYear = anchorYear + (1 - relX) * newSpan;

    this.updateZoomFromRange();
  }

  private updateZoomFromRange(): void {
    const initialSpan = this.initialState.range.endYear - this.initialState.range.startYear;
    const currentSpan = this.viewState.range.endYear - this.viewState.range.startYear;
    this.viewState.zoom = initialSpan / currentSpan;
  }

  private triggerClick(x: number, y: number): boolean {
    for (const cb of this.clickCallbacks) {
      if (cb(x, y)) return true;
    }
    return false;
  }

  private notifyViewChange(): void {
    const state = this.getViewState();
    for (const cb of this.viewCallbacks) cb(state);
  }

  private notifyDragState(isDragging: boolean): void {
    for (const cb of this.dragCallbacks) cb(isDragging);
  }
}
