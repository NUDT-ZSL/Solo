import { Constellation, ConstellationData } from './Constellation';
import { TimeControl } from './TimeControl';
import { StarData } from './StarField';

export interface UICallbacks {
  onConstellationSelect: (id: string) => void;
  onAutoRotateToggle: (enabled: boolean) => void;
  onResetView: () => void;
  onDateChange: (date: Date) => void;
}

export class UI {
  private constellationSelect: HTMLSelectElement;
  private autoRotateBtn: HTMLButtonElement;
  private resetViewBtn: HTMLButtonElement;
  private dateTimeDisplay: HTMLDivElement;
  private dateTimeInput: HTMLInputElement;
  private starTooltip: HTMLDivElement;
  private timeControl: TimeControl;
  private callbacks: UICallbacks;
  private isAutoRotate: boolean = false;
  private currentTooltipStar: StarData | null = null;

  constructor(
    constellation: Constellation,
    timeControl: TimeControl,
    callbacks: UICallbacks
  ) {
    this.timeControl = timeControl;
    this.callbacks = callbacks;

    this.constellationSelect = document.getElementById('constellation-select') as HTMLSelectElement;
    this.autoRotateBtn = document.getElementById('auto-rotate-btn') as HTMLButtonElement;
    this.resetViewBtn = document.getElementById('reset-view-btn') as HTMLButtonElement;
    this.dateTimeDisplay = document.getElementById('date-time-display') as HTMLDivElement;
    this.dateTimeInput = document.getElementById('date-time-input') as HTMLInputElement;
    this.starTooltip = document.getElementById('star-tooltip') as HTMLDivElement;

    this.populateConstellationSelect(constellation.getConstellationData());
    this.bindEvents();
    this.updateDateTimeDisplay();
  }

  private populateConstellationSelect(data: ConstellationData[]): void {
    data.forEach(constellation => {
      const option = document.createElement('option');
      option.value = constellation.id;
      option.textContent = `${constellation.nameZh} (${constellation.name})`;
      this.constellationSelect.appendChild(option);
    });
  }

  private bindEvents(): void {
    this.constellationSelect.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      this.callbacks.onConstellationSelect(target.value);
    });

    this.autoRotateBtn.addEventListener('click', () => {
      this.isAutoRotate = !this.isAutoRotate;
      this.autoRotateBtn.classList.toggle('active', this.isAutoRotate);
      this.autoRotateBtn.textContent = this.isAutoRotate ? '停止旋转' : '自动旋转';
      this.callbacks.onAutoRotateToggle(this.isAutoRotate);
    });

    this.resetViewBtn.addEventListener('click', () => {
      this.callbacks.onResetView();
    });

    this.dateTimeDisplay.addEventListener('click', () => {
      this.dateTimeInput.value = this.timeControl.getHTMLDateTimeValue();
      this.dateTimeInput.classList.toggle('visible');
      this.dateTimeInput.focus();
    });

    this.dateTimeInput.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.value) {
        const newDate = this.timeControl.parseHTMLDateTimeValue(target.value);
        this.callbacks.onDateChange(newDate);
        this.updateDateTimeDisplay();
      }
      this.dateTimeInput.classList.remove('visible');
    });

    this.dateTimeInput.addEventListener('blur', () => {
      this.dateTimeInput.classList.remove('visible');
    });

    this.dateTimeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const target = e.target as HTMLInputElement;
        if (target.value) {
          const newDate = this.timeControl.parseHTMLDateTimeValue(target.value);
          this.callbacks.onDateChange(newDate);
          this.updateDateTimeDisplay();
        }
        this.dateTimeInput.classList.remove('visible');
      }
      if (e.key === 'Escape') {
        this.dateTimeInput.classList.remove('visible');
      }
    });
  }

  public updateDateTimeDisplay(): void {
    this.dateTimeDisplay.textContent = this.timeControl.getFormattedDateTime();
  }

  public showStarTooltip(star: StarData, screenX: number, screenY: number): void {
    this.currentTooltipStar = star;
    this.starTooltip.innerHTML = `
      <strong>${star.name}</strong><br>
      视星等: ${star.magnitude.toFixed(2)}<br>
      距离: ${star.distance} 光年
    `;
    this.starTooltip.style.left = `${screenX + 15}px`;
    this.starTooltip.style.top = `${screenY + 15}px`;
    this.starTooltip.classList.add('visible');
  }

  public hideStarTooltip(): void {
    this.currentTooltipStar = null;
    this.starTooltip.classList.remove('visible');
  }

  public updateTooltipPosition(screenX: number, screenY: number): void {
    if (this.currentTooltipStar) {
      this.starTooltip.style.left = `${screenX + 15}px`;
      this.starTooltip.style.top = `${screenY + 15}px`;
    }
  }

  public getIsAutoRotate(): boolean {
    return this.isAutoRotate;
  }

  public setAutoRotate(enabled: boolean): void {
    this.isAutoRotate = enabled;
    this.autoRotateBtn.classList.toggle('active', this.isAutoRotate);
    this.autoRotateBtn.textContent = this.isAutoRotate ? '停止旋转' : '自动旋转';
  }
}
