import type { WindProvider } from './rainSystem';

const INITIAL_WIND = 0.3;
const MIN_WIND = -1;
const MAX_WIND = 1;

export class WindControl implements WindProvider {
  private windForce: number = INITIAL_WIND;
  private wrapperEl!: HTMLElement;
  private trackEl!: HTMLElement;
  private fillEl!: HTMLElement;
  private thumbEl!: HTMLElement;
  private valueEl!: HTMLElement;
  private isDragging: boolean = false;
  private readonly normalizedMin: number = MIN_WIND;
  private readonly normalizedMax: number = MAX_WIND;

  constructor() {
    this.bindElements();
    this.attachEventListeners();
    this.updateUI();
  }

  private bindElements(): void {
    const wrapper = document.getElementById('sliderWrapper');
    const track = document.getElementById('sliderTrack');
    const fill = document.getElementById('sliderFill');
    const thumb = document.getElementById('sliderThumb');
    const value = document.getElementById('windValue');

    if (!wrapper || !track || !fill || !thumb || !value) {
      throw new Error('Wind control elements not found in DOM');
    }

    this.wrapperEl = wrapper;
    this.trackEl = track;
    this.fillEl = fill;
    this.thumbEl = thumb;
    this.valueEl = value;
  }

  private attachEventListeners(): void {
    this.trackEl.addEventListener('mousedown', (e) => this.onTrackMouseDown(e));
    this.thumbEl.addEventListener('mousedown', (e) => this.onThumbMouseDown(e));
    document.addEventListener('mousemove', (e) => this.onMouseMove(e));
    document.addEventListener('mouseup', () => this.onMouseUp());

    this.trackEl.addEventListener('touchstart', (e) => this.onTrackTouchStart(e), { passive: false });
    this.thumbEl.addEventListener('touchstart', (e) => this.onThumbTouchStart(e), { passive: false });
    document.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    document.addEventListener('touchend', () => this.onMouseUp());
  }

  private onTrackMouseDown(e: MouseEvent): void {
    e.preventDefault();
    this.isDragging = true;
    this.updateFromClientX(e.clientX);
  }

  private onThumbMouseDown(e: MouseEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging = true;
  }

  private onMouseMove(e: MouseEvent): void {
    if (this.isDragging) {
      this.updateFromClientX(e.clientX);
    }
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private onTrackTouchStart(e: TouchEvent): void {
    e.preventDefault();
    this.isDragging = true;
    if (e.touches.length > 0) {
      this.updateFromClientX(e.touches[0].clientX);
    }
  }

  private onThumbTouchStart(e: TouchEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging = true;
  }

  private onTouchMove(e: TouchEvent): void {
    if (this.isDragging && e.touches.length > 0) {
      this.updateFromClientX(e.touches[0].clientX);
    }
  }

  private updateFromClientX(clientX: number): void {
    const rect = this.wrapperEl.getBoundingClientRect();
    let ratio = (clientX - rect.left) / rect.width;
    ratio = Math.max(0, Math.min(1, ratio));
    const newValue = this.normalizedMin + ratio * (this.normalizedMax - this.normalizedMin);
    this.setWindForce(newValue);
  }

  setWindForce(value: number): void {
    this.windForce = Math.max(this.normalizedMin, Math.min(this.normalizedMax, value));
    this.updateUI();
  }

  getWindForce(): number {
    return this.windForce;
  }

  private updateUI(): void {
    const ratio = (this.windForce - this.normalizedMin) / (this.normalizedMax - this.normalizedMin);
    const percent = ratio * 100;
    this.thumbEl.style.left = `${percent}%`;

    const centerPercent = 50;
    const fillWidth = Math.abs(percent - centerPercent);
    if (percent >= centerPercent) {
      this.fillEl.style.left = `${centerPercent}%`;
      this.fillEl.style.width = `${fillWidth}%`;
      this.fillEl.style.transform = 'none';
    } else {
      this.fillEl.style.left = `${percent}%`;
      this.fillEl.style.width = `${fillWidth}%`;
      this.fillEl.style.transform = 'none';
    }

    if (this.valueEl) {
      this.valueEl.textContent = this.windForce >= 0
        ? `+${this.windForce.toFixed(2)}`
        : this.windForce.toFixed(2);
    }
  }
}
