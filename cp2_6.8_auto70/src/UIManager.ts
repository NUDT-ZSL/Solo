import { BuildingType, BUILDING_CONFIGS } from './BuildingManager';
import { EnvironmentManager } from './EnvironmentManager';

export class UIManager {
  private sliderCanvas: HTMLCanvasElement;
  private sliderCtx: CanvasRenderingContext2D;
  private timeLabel: HTMLElement;
  private statsCounter: HTMLElement;
  private buildingCards: NodeListOf<HTMLElement>;

  private currentTime: number = 12;
  private isDraggingSlider: boolean = false;

  private readonly SLIDER_CENTER_X = 120;
  private readonly SLIDER_CENTER_Y = 75;
  private readonly SLIDER_RADIUS = 40;
  private readonly START_ANGLE = Math.PI;
  private readonly END_ANGLE = 0;

  private onTimeChange?: (time: number) => void;
  private onBuildingDragStart?: (type: BuildingType) => void;
  private onBuildingDragEnd?: () => void;

  constructor() {
    const sliderCanvas = document.getElementById('time-slider-canvas');
    if (!(sliderCanvas instanceof HTMLCanvasElement)) {
      throw new Error('Slider canvas not found');
    }
    this.sliderCanvas = sliderCanvas;

    const ctx = sliderCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context not available');
    }
    this.sliderCtx = ctx;

    const timeLabel = document.getElementById('time-label');
    if (!timeLabel) throw new Error('Time label not found');
    this.timeLabel = timeLabel;

    const statsCounter = document.getElementById('stats-counter');
    if (!statsCounter) throw new Error('Stats counter not found');
    this.statsCounter = statsCounter;

    this.buildingCards = document.querySelectorAll('.building-card');

    this.setupSliderEvents();
    this.setupBuildingCardEvents();
    this.drawSlider();
  }

  public setTimeChangeCallback(callback: (time: number) => void): void {
    this.onTimeChange = callback;
  }

  public setBuildingDragCallbacks(
    onStart: (type: BuildingType) => void,
    onEnd: () => void
  ): void {
    this.onBuildingDragStart = onStart;
    this.onBuildingDragEnd = onEnd;
  }

  public setTime(time: number): void {
    this.currentTime = time;
    this.timeLabel.textContent = EnvironmentManager.formatTime(time);
    this.drawSlider();
  }

  public updateBuildingCount(count: number, max: number): void {
    this.statsCounter.textContent = `建筑: ${count} / ${max}`;
  }

  private setupSliderEvents(): void {
    const onPointerDown = (e: PointerEvent) => {
      this.isDraggingSlider = true;
      this.sliderCanvas.setPointerCapture(e.pointerId);
      this.updateFromPointer(e);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!this.isDraggingSlider) return;
      this.updateFromPointer(e);
    };

    const onPointerUp = (e: PointerEvent) => {
      this.isDraggingSlider = false;
      try {
        this.sliderCanvas.releasePointerCapture(e.pointerId);
      } catch (_) {
        /* noop */
      }
    };

    this.sliderCanvas.addEventListener('pointerdown', onPointerDown);
    this.sliderCanvas.addEventListener('pointermove', onPointerMove);
    this.sliderCanvas.addEventListener('pointerup', onPointerUp);
    this.sliderCanvas.addEventListener('pointercancel', onPointerUp);
    this.sliderCanvas.addEventListener('pointerleave', onPointerUp);
  }

  private setupBuildingCardEvents(): void {
    this.buildingCards.forEach((card) => {
      card.addEventListener('dragstart', (e) => {
        const type = card.getAttribute('data-type') as BuildingType;
        if (!e.dataTransfer || !type) return;

        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('text/plain', type);

        if (this.onBuildingDragStart) {
          this.onBuildingDragStart(type);
        }
      });

      card.addEventListener('dragend', () => {
        if (this.onBuildingDragEnd) {
          this.onBuildingDragEnd();
        }
      });
    });
  }

  private updateFromPointer(e: PointerEvent): void {
    const rect = this.sliderCanvas.getBoundingClientRect();
    const scaleX = this.sliderCanvas.width / rect.width;
    const scaleY = this.sliderCanvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const dx = x - this.SLIDER_CENTER_X;
    const dy = y - this.SLIDER_CENTER_Y;
    let angle = Math.atan2(dy, dx);

    if (angle > this.START_ANGLE) angle = this.START_ANGLE;
    if (angle < this.END_ANGLE) angle = this.END_ANGLE;

    const t = (this.START_ANGLE - angle) / (this.START_ANGLE - this.END_ANGLE);
    let newTime = t * (EnvironmentManager.TIME_MAX - EnvironmentManager.TIME_MIN);
    newTime = Math.round(newTime / EnvironmentManager.TIME_STEP) * EnvironmentManager.TIME_STEP;
    newTime = Math.max(EnvironmentManager.TIME_MIN, Math.min(EnvironmentManager.TIME_MAX, newTime));

    if (newTime !== this.currentTime) {
      this.currentTime = newTime;
      this.timeLabel.textContent = EnvironmentManager.formatTime(newTime);
      this.drawSlider();
      if (this.onTimeChange) {
        this.onTimeChange(newTime);
      }
    }
  }

  private drawSlider(): void {
    const ctx = this.sliderCtx;
    const w = this.sliderCanvas.width;
    const h = this.sliderCanvas.height;

    ctx.clearRect(0, 0, w, h);

    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0F3460';
    ctx.beginPath();
    ctx.arc(
      this.SLIDER_CENTER_X,
      this.SLIDER_CENTER_Y,
      this.SLIDER_RADIUS,
      this.START_ANGLE,
      this.END_ANGLE,
      false
    );
    ctx.stroke();

    const t =
      (this.currentTime - EnvironmentManager.TIME_MIN) /
      (EnvironmentManager.TIME_MAX - EnvironmentManager.TIME_MIN);
    const currentAngle = this.START_ANGLE - t * (this.START_ANGLE - this.END_ANGLE);

    const gradient = ctx.createLinearGradient(
      this.SLIDER_CENTER_X - this.SLIDER_RADIUS,
      0,
      this.SLIDER_CENTER_X + this.SLIDER_RADIUS,
      0
    );
    gradient.addColorStop(0, '#0B0B2E');
    gradient.addColorStop(0.3, '#FF7F50');
    gradient.addColorStop(0.5, '#87CEEB');
    gradient.addColorStop(0.7, '#FF7F50');
    gradient.addColorStop(1, '#0B0B2E');

    ctx.lineWidth = 6;
    ctx.strokeStyle = gradient;
    ctx.beginPath();
    ctx.arc(
      this.SLIDER_CENTER_X,
      this.SLIDER_CENTER_Y,
      this.SLIDER_RADIUS,
      this.START_ANGLE,
      currentAngle,
      false
    );
    ctx.stroke();

    const handleX = this.SLIDER_CENTER_X + Math.cos(currentAngle) * this.SLIDER_RADIUS;
    const handleY = this.SLIDER_CENTER_Y + Math.sin(currentAngle) * this.SLIDER_RADIUS;

    ctx.shadowColor = 'rgba(255, 215, 0, 0.6)';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(handleX, handleY, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#FFF8DC';
    ctx.beginPath();
    ctx.arc(handleX - 2, handleY - 2, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#8892B0';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('0h', this.SLIDER_CENTER_X - this.SLIDER_RADIUS - 2, this.SLIDER_CENTER_Y + 4);
    ctx.fillText('24h', this.SLIDER_CENTER_X + this.SLIDER_RADIUS + 2, this.SLIDER_CENTER_Y + 4);
    ctx.fillText('12h', this.SLIDER_CENTER_X, this.SLIDER_CENTER_Y - this.SLIDER_RADIUS - 6);
  }
}
