import { Network, Node, Point } from './network';
import { Renderer, ControlPanelState } from './renderer';

export interface ControlsCallbacks {
  onColorModeChange: (mode: 'gradient' | 'random') => void;
  onClearCanvas: () => void;
  onTrajectoryStart: (point: Point, hue: number) => void;
  onTrajectoryMove: (point: Point, hue: number) => void;
  onTrajectoryEnd: () => void;
  onNodeHover: (node: Node | null) => void;
  onMouseMove: (point: Point) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export class Controls {
  private canvas: HTMLCanvasElement;
  private network: Network;
  private renderer: Renderer;
  private callbacks: ControlsCallbacks;

  public state: ControlPanelState;

  private isDragging: boolean;
  private isSliderDragging: boolean;
  private hueTimeOffset: number;
  private randomHue: number;

  constructor(
    canvas: HTMLCanvasElement,
    network: Network,
    renderer: Renderer,
    callbacks: ControlsCallbacks
  ) {
    this.canvas = canvas;
    this.network = network;
    this.renderer = renderer;
    this.callbacks = callbacks;

    this.state = {
      speedMultiplier: 1,
      colorMode: 'gradient',
      clearButtonHover: false,
      panelHover: false,
      colorModeTransition: 1,
    };

    this.isDragging = false;
    this.isSliderDragging = false;
    this.hueTimeOffset = 0;
    this.randomHue = Math.random() * 360;

    this.bindEvents();
  }

  private bindEvents(): void {
    const c = this.canvas;

    c.addEventListener('mousedown', this.onMouseDown);
    c.addEventListener('mousemove', this.onMouseMove);
    c.addEventListener('mouseup', this.onMouseUp);
    c.addEventListener('mouseleave', this.onMouseLeave);
    c.addEventListener('mouseenter', this.onMouseEnter);

    c.addEventListener('touchstart', this.onTouchStart, { passive: false });
    c.addEventListener('touchmove', this.onTouchMove, { passive: false });
    c.addEventListener('touchend', this.onTouchEnd);
  }

  private getCanvasPoint(clientX: number, clientY: number): Point {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  private getCurrentHue(point: Point): number {
    if (this.state.colorMode === 'random') {
      return this.randomHue;
    }

    const time = performance.now();
    const timeHue = ((time / 2000) * 360 + this.hueTimeOffset) % 360;
    const posHue = ((point.x + point.y) * 0.1) % 360;
    return (timeHue + posHue * 0.3) % 360;
  }

  private onMouseDown = (e: MouseEvent): void => {
    const point = this.getCanvasPoint(e.clientX, e.clientY);

    const sliderHit = this.renderer.isPointInSpeedSlider(point.x, point.y);
    if (sliderHit.hit) {
      this.isSliderDragging = true;
      this.updateSliderFromPoint(point.x, sliderHit.x, sliderHit.width);
      return;
    }

    if (this.renderer.isPointInClearButton(point.x, point.y)) {
      this.callbacks.onClearCanvas();
      return;
    }

    if (this.renderer.isPointInColorToggle(point.x, point.y)) {
      this.toggleColorMode();
      return;
    }

    if (!this.renderer.isPointInPanel(point.x, point.y)) {
      this.isDragging = true;
      if (this.state.colorMode === 'random') {
        this.randomHue = Math.random() * 360;
      }
      const hue = this.getCurrentHue(point);
      this.callbacks.onTrajectoryStart(point, hue);
    }
  };

  private onMouseMove = (e: MouseEvent): void => {
    const point = this.getCanvasPoint(e.clientX, e.clientY);

    this.callbacks.onMouseMove(point);

    if (this.isSliderDragging) {
      const sliderHit = this.renderer.isPointInSpeedSlider(point.x, point.y);
      this.updateSliderFromPoint(point.x, sliderHit.x, sliderHit.width);
      return;
    }

    if (this.isDragging) {
      const hue = this.getCurrentHue(point);
      this.callbacks.onTrajectoryMove(point, hue);
    } else if (!this.renderer.isPointInPanel(point.x, point.y)) {
      const hovered = this.network.findHoveredNode(point.x, point.y);
      this.callbacks.onNodeHover(hovered);
    }

    this.updateHoverStates(point);
  };

  private onMouseUp = (): void => {
    if (this.isDragging) {
      this.isDragging = false;
      this.callbacks.onTrajectoryEnd();
    }
    this.isSliderDragging = false;
  };

  private onMouseLeave = (): void => {
    if (this.isDragging) {
      this.isDragging = false;
      this.callbacks.onTrajectoryEnd();
    }
    this.isSliderDragging = false;
    this.callbacks.onMouseLeave();
    this.state.clearButtonHover = false;
    this.state.panelHover = false;
  };

  private onMouseEnter = (): void => {
    this.callbacks.onMouseEnter();
  };

  private onTouchStart = (e: TouchEvent): void => {
    e.preventDefault();
    const touch = e.touches[0];
    const point = this.getCanvasPoint(touch.clientX, touch.clientY);

    const sliderHit = this.renderer.isPointInSpeedSlider(point.x, point.y);
    if (sliderHit.hit) {
      this.isSliderDragging = true;
      this.updateSliderFromPoint(point.x, sliderHit.x, sliderHit.width);
      return;
    }

    if (this.renderer.isPointInClearButton(point.x, point.y)) {
      this.callbacks.onClearCanvas();
      return;
    }

    if (this.renderer.isPointInColorToggle(point.x, point.y)) {
      this.toggleColorMode();
      return;
    }

    if (!this.renderer.isPointInPanel(point.x, point.y)) {
      this.isDragging = true;
      if (this.state.colorMode === 'random') {
        this.randomHue = Math.random() * 360;
      }
      const hue = this.getCurrentHue(point);
      this.callbacks.onTrajectoryStart(point, hue);
    }
  };

  private onTouchMove = (e: TouchEvent): void => {
    e.preventDefault();
    const touch = e.touches[0];
    const point = this.getCanvasPoint(touch.clientX, touch.clientY);

    if (this.isSliderDragging) {
      const sliderHit = this.renderer.isPointInSpeedSlider(point.x, point.y);
      this.updateSliderFromPoint(point.x, sliderHit.x, sliderHit.width);
      return;
    }

    if (this.isDragging) {
      const hue = this.getCurrentHue(point);
      this.callbacks.onTrajectoryMove(point, hue);
    } else if (!this.renderer.isPointInPanel(point.x, point.y)) {
      const hovered = this.network.findHoveredNode(point.x, point.y);
      this.callbacks.onNodeHover(hovered);
    }
  };

  private onTouchEnd = (): void => {
    if (this.isDragging) {
      this.isDragging = false;
      this.callbacks.onTrajectoryEnd();
    }
    this.isSliderDragging = false;
  };

  private updateHoverStates(point: Point): void {
    this.state.clearButtonHover = this.renderer.isPointInClearButton(point.x, point.y);
    this.state.panelHover = this.renderer.isPointInPanel(point.x, point.y);
  }

  private updateSliderFromPoint(px: number, sliderX: number, sliderWidth: number): void {
    const relativeX = Math.max(0, Math.min(px - sliderX, sliderWidth));
    const t = relativeX / sliderWidth;
    this.state.speedMultiplier = 0.5 + t * 2.5;
  }

  private toggleColorMode(): void {
    const newMode = this.state.colorMode === 'gradient' ? 'random' : 'gradient';
    this.state.colorMode = newMode;
    this.state.colorModeTransition = 0;
    this.callbacks.onColorModeChange(newMode);
  }

  update(deltaTime: number): void {
    if (this.state.colorModeTransition < 1) {
      this.state.colorModeTransition = Math.min(1, this.state.colorModeTransition + deltaTime / 800);
    }
  }
}
