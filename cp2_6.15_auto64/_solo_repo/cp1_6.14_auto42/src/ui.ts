import type { GlacierRegion } from './data';
import { START_YEAR, END_YEAR } from './data';

export interface UICallbacks {
  onYearChange: (year: number) => void;
  onResetCamera: () => void;
  onPlayToggle: (playing: boolean) => void;
}

export class GlacierUI {
  private container: HTMLElement;
  private callbacks: UICallbacks;
  private currentYear: number = START_YEAR;
  private isPlaying: boolean = false;
  private playInterval: ReturnType<typeof setInterval> | null = null;

  private infoPanel!: HTMLElement;
  private yearLabel!: HTMLElement;
  private volumeLabel!: HTMLElement;
  private timelineContainer!: HTMLElement;
  private slider!: HTMLInputElement;
  private playBtn!: HTMLElement;
  private resetBtn!: HTMLElement;
  private detailPanel!: HTMLElement;
  private detailCanvas!: HTMLCanvasElement;
  private detailTitle!: HTMLElement;
  private detailRate!: HTMLElement;
  private detailElevation!: HTMLElement;
  private closeDetailBtn!: HTMLElement;
  private currentDetailRegion: GlacierRegion | null = null;

  constructor(container: HTMLElement, callbacks: UICallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.createInfoPanel();
    this.createTimeline();
    this.createResetButton();
    this.createDetailPanel();
    this.applyResponsive();
    window.addEventListener('resize', () => this.applyResponsive());
  }

  private createInfoPanel(): void {
    this.infoPanel = document.createElement('div');
    Object.assign(this.infoPanel.style, {
      position: 'absolute',
      top: '24px',
      left: '24px',
      background: 'rgba(26,26,46,0.85)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      border: '1px solid #333355',
      borderRadius: '8px',
      padding: '20px 24px',
      minWidth: '200px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
      zIndex: '10',
    });

    this.yearLabel = document.createElement('div');
    Object.assign(this.yearLabel.style, {
      fontSize: '48px',
      fontWeight: '800',
      color: '#ffffff',
      lineHeight: '1.1',
      letterSpacing: '-1px',
    });
    this.yearLabel.textContent = String(START_YEAR);

    const volumeTitle = document.createElement('div');
    Object.assign(volumeTitle.style, {
      fontSize: '11px',
      fontWeight: '400',
      color: '#8888aa',
      textTransform: 'uppercase',
      letterSpacing: '1.5px',
      marginTop: '12px',
      marginBottom: '4px',
    });
    volumeTitle.textContent = '累计消融总量（亿吨）';

    this.volumeLabel = document.createElement('div');
    Object.assign(this.volumeLabel.style, {
      fontSize: '28px',
      fontWeight: '700',
      color: '#ff6633',
      lineHeight: '1.2',
    });
    this.volumeLabel.textContent = '0';

    this.infoPanel.appendChild(this.yearLabel);
    this.infoPanel.appendChild(volumeTitle);
    this.infoPanel.appendChild(this.volumeLabel);
    this.container.appendChild(this.infoPanel);
  }

  private createTimeline(): void {
    this.timelineContainer = document.createElement('div');
    Object.assign(this.timelineContainer.style, {
      position: 'absolute',
      bottom: '32px',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      zIndex: '10',
    });

    this.playBtn = document.createElement('button');
    Object.assign(this.playBtn.style, {
      width: '36px',
      height: '36px',
      borderRadius: '50%',
      border: 'none',
      background: '#3366cc',
      color: '#ffffff',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: '0',
      transition: 'transform 0.15s ease, background 0.15s ease',
      boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
    });
    this.playBtn.innerHTML = this.playIcon();
    this.playBtn.addEventListener('mouseenter', () => {
      this.playBtn.style.transform = 'scale(1.1)';
      this.playBtn.style.background = '#4477dd';
    });
    this.playBtn.addEventListener('mouseleave', () => {
      this.playBtn.style.transform = 'scale(1)';
      this.playBtn.style.background = '#3366cc';
    });
    this.playBtn.addEventListener('click', () => this.togglePlay());

    const sliderWrapper = document.createElement('div');
    Object.assign(sliderWrapper.style, {
      position: 'relative',
      width: '600px',
      maxWidth: 'calc(100vw - 120px)',
    });

    const trackBg = document.createElement('div');
    Object.assign(trackBg.style, {
      position: 'absolute',
      top: '50%',
      left: '0',
      right: '0',
      height: '4px',
      transform: 'translateY(-50%)',
      background: '#444466',
      borderRadius: '2px',
      pointerEvents: 'none',
    });

    const trackFill = document.createElement('div');
    Object.assign(trackFill.style, {
      position: 'absolute',
      top: '50%',
      left: '0',
      height: '4px',
      transform: 'translateY(-50%)',
      background: 'linear-gradient(90deg, #3366cc, #6633ff)',
      borderRadius: '2px',
      pointerEvents: 'none',
      width: '0%',
      transition: 'width 0.1s ease-out',
    });
    trackFill.id = 'timeline-fill';

    this.slider = document.createElement('input');
    this.slider.type = 'range';
    this.slider.min = String(START_YEAR);
    this.slider.max = String(END_YEAR);
    this.slider.value = String(START_YEAR);
    this.slider.step = '1';
    Object.assign(this.slider.style, {
      width: '100%',
      height: '20px',
      appearance: 'none',
      WebkitAppearance: 'none',
      background: 'transparent',
      cursor: 'pointer',
      position: 'relative',
      zIndex: '2',
    });

    const sliderStyle = document.createElement('style');
    sliderStyle.textContent = `
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #ff6633;
        cursor: pointer;
        box-shadow: 0 0 8px rgba(255,102,51,0.5);
        transition: transform 0.1s ease;
      }
      input[type="range"]::-webkit-slider-thumb:hover {
        transform: scale(1.2);
      }
      input[type="range"]::-moz-range-thumb {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #ff6633;
        cursor: pointer;
        border: none;
        box-shadow: 0 0 8px rgba(255,102,51,0.5);
      }
      input[type="range"]::-moz-range-track {
        background: transparent;
        height: 4px;
      }
    `;
    document.head.appendChild(sliderStyle);

    this.slider.addEventListener('input', () => {
      const year = parseInt(this.slider.value);
      this.setYear(year);
      this.stopPlay();
      this.callbacks.onYearChange(year);
    });

    sliderWrapper.appendChild(trackBg);
    sliderWrapper.appendChild(trackFill);
    sliderWrapper.appendChild(this.slider);

    const yearMarkers = document.createElement('div');
    Object.assign(yearMarkers.style, {
      display: 'flex',
      justifyContent: 'space-between',
      marginTop: '6px',
      padding: '0 2px',
    });

    [1980, 1990, 2000, 2010, 2020, 2030].forEach(y => {
      const marker = document.createElement('span');
      Object.assign(marker.style, {
        fontSize: '10px',
        color: '#666688',
        fontWeight: '400',
      });
      marker.textContent = String(y);
      yearMarkers.appendChild(marker);
    });

    sliderWrapper.appendChild(yearMarkers);

    this.timelineContainer.appendChild(this.playBtn);
    this.timelineContainer.appendChild(sliderWrapper);
    this.container.appendChild(this.timelineContainer);
  }

  private createResetButton(): void {
    this.resetBtn = document.createElement('button');
    Object.assign(this.resetBtn.style, {
      position: 'absolute',
      bottom: '32px',
      right: '32px',
      width: '48px',
      height: '48px',
      borderRadius: '50%',
      border: 'none',
      background: 'rgba(255,102,51,0.8)',
      color: '#ffffff',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'background 0.2s ease, transform 0.15s ease',
      boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
      zIndex: '10',
    });
    this.resetBtn.innerHTML = this.resetIcon();
    this.resetBtn.addEventListener('mouseenter', () => {
      this.resetBtn.style.background = 'rgba(255,102,51,1)';
      this.resetBtn.style.transform = 'scale(1.08)';
    });
    this.resetBtn.addEventListener('mouseleave', () => {
      this.resetBtn.style.background = 'rgba(255,102,51,0.8)';
      this.resetBtn.style.transform = 'scale(1)';
    });
    this.resetBtn.addEventListener('click', () => this.callbacks.onResetCamera());
    this.container.appendChild(this.resetBtn);
  }

  private createDetailPanel(): void {
    this.detailPanel = document.createElement('div');
    Object.assign(this.detailPanel.style, {
      position: 'absolute',
      top: '50%',
      right: '10%',
      transform: 'translateY(-50%)',
      width: '320px',
      background: 'rgba(26,26,46,0.9)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid #333355',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
      zIndex: '20',
      opacity: '0',
      pointerEvents: 'none',
      transition: 'opacity 0.2s ease',
    });

    this.closeDetailBtn = document.createElement('button');
    Object.assign(this.closeDetailBtn.style, {
      position: 'absolute',
      top: '12px',
      right: '12px',
      width: '24px',
      height: '24px',
      borderRadius: '50%',
      border: 'none',
      background: 'rgba(255,255,255,0.1)',
      color: '#aaaacc',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '14px',
      transition: 'background 0.15s ease',
    });
    this.closeDetailBtn.textContent = '✕';
    this.closeDetailBtn.addEventListener('mouseenter', () => {
      this.closeDetailBtn.style.background = 'rgba(255,255,255,0.2)';
    });
    this.closeDetailBtn.addEventListener('mouseleave', () => {
      this.closeDetailBtn.style.background = 'rgba(255,255,255,0.1)';
    });
    this.closeDetailBtn.addEventListener('click', () => this.hideDetail());

    this.detailTitle = document.createElement('div');
    Object.assign(this.detailTitle.style, {
      fontSize: '20px',
      fontWeight: '700',
      color: '#ffffff',
      marginBottom: '16px',
    });

    const infoRow = document.createElement('div');
    Object.assign(infoRow.style, {
      display: 'flex',
      gap: '16px',
      marginBottom: '16px',
    });

    const rateBox = document.createElement('div');
    Object.assign(rateBox.style, { flex: '1' });
    const rateLabel = document.createElement('div');
    Object.assign(rateLabel.style, {
      fontSize: '10px',
      color: '#8888aa',
      textTransform: 'uppercase',
      letterSpacing: '1px',
      marginBottom: '4px',
    });
    rateLabel.textContent = '消融速度 (吨/年)';
    this.detailRate = document.createElement('div');
    Object.assign(this.detailRate.style, {
      fontSize: '18px',
      fontWeight: '600',
      color: '#ff6633',
    });

    const elevBox = document.createElement('div');
    Object.assign(elevBox.style, { flex: '1' });
    const elevLabel = document.createElement('div');
    Object.assign(elevLabel.style, {
      fontSize: '10px',
      color: '#8888aa',
      textTransform: 'uppercase',
      letterSpacing: '1px',
      marginBottom: '4px',
    });
    elevLabel.textContent = '海拔变化 (米)';
    this.detailElevation = document.createElement('div');
    Object.assign(this.detailElevation.style, {
      fontSize: '18px',
      fontWeight: '600',
      color: '#6633ff',
    });

    rateBox.appendChild(rateLabel);
    rateBox.appendChild(this.detailRate);
    elevBox.appendChild(elevLabel);
    elevBox.appendChild(this.detailElevation);
    infoRow.appendChild(rateBox);
    infoRow.appendChild(elevBox);

    const chartLabel = document.createElement('div');
    Object.assign(chartLabel.style, {
      fontSize: '10px',
      color: '#8888aa',
      textTransform: 'uppercase',
      letterSpacing: '1px',
      marginBottom: '8px',
    });
    chartLabel.textContent = '年均速率历史趋势';

    this.detailCanvas = document.createElement('canvas');
    this.detailCanvas.width = 272;
    this.detailCanvas.height = 140;
    Object.assign(this.detailCanvas.style, {
      width: '100%',
      height: '140px',
      borderRadius: '4px',
    });

    this.detailPanel.appendChild(this.closeDetailBtn);
    this.detailPanel.appendChild(this.detailTitle);
    this.detailPanel.appendChild(infoRow);
    this.detailPanel.appendChild(chartLabel);
    this.detailPanel.appendChild(this.detailCanvas);
    this.container.appendChild(this.detailPanel);
  }

  showDetail(region: GlacierRegion, year: number): void {
    this.currentDetailRegion = region;
    this.detailTitle.textContent = region.name;

    const yearData = region.yearlyData.find(d => d.year === year);
    this.detailRate.textContent = yearData ? `${yearData.annualRate}` : '—';
    this.detailElevation.textContent = yearData ? `${yearData.elevationChange}` : '—';

    this.drawChart(region, year);

    this.detailPanel.style.pointerEvents = 'auto';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.detailPanel.style.opacity = '1';
      });
    });
  }

  hideDetail(): void {
    this.detailPanel.style.opacity = '0';
    const after = () => {
      if (this.detailPanel.style.opacity === '0') {
        this.detailPanel.style.pointerEvents = 'none';
      }
    };
    setTimeout(after, 220);
    this.currentDetailRegion = null;
  }

  updateDetailYear(year: number): void {
    if (!this.currentDetailRegion) return;
    const yearData = this.currentDetailRegion.yearlyData.find(d => d.year === year);
    this.detailRate.textContent = yearData ? `${yearData.annualRate}` : '—';
    this.detailElevation.textContent = yearData ? `${yearData.elevationChange}` : '—';
    this.drawChart(this.currentDetailRegion, year);
  }

  private drawChart(region: GlacierRegion, currentYear: number): void {
    const canvas = this.detailCanvas;
    const ctx = canvas.getContext('2d')!;
    const w = canvas.width;
    const h = canvas.height;
    const pad = { top: 10, right: 10, bottom: 24, left: 36 };
    const plotW = w - pad.left - pad.right;
    const plotH = h - pad.top - pad.bottom;

    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(10,10,26,0.6)';
    ctx.fillRect(0, 0, w, h);

    const data = region.yearlyData;
    const maxRate = Math.max(...data.map(d => d.annualRate)) * 1.1;
    const minRate = 0;

    ctx.strokeStyle = 'rgba(51,51,85,0.5)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (i / 4) * plotH;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + plotW, y);
      ctx.stroke();
    }

    const xScale = (i: number) => pad.left + (i / (data.length - 1)) * plotW;
    const yScale = (v: number) => pad.top + plotH - ((v - minRate) / (maxRate - minRate)) * plotH;

    ctx.strokeStyle = 'rgba(51,102,204,0.3)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 5; i++) {
      const idx = Math.floor((i / 5) * (data.length - 1));
      const x = xScale(idx);
      ctx.beginPath();
      ctx.moveTo(x, pad.top);
      ctx.lineTo(x, pad.top + plotH);
      ctx.stroke();

      ctx.fillStyle = '#666688';
      ctx.font = '9px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(data[idx].year), x, h - 4);
    }

    const gradient = ctx.createLinearGradient(pad.left, 0, pad.left + plotW, 0);
    gradient.addColorStop(0, '#0044cc');
    gradient.addColorStop(1, '#ff6633');

    ctx.beginPath();
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';

    const areaGradient = ctx.createLinearGradient(0, pad.top, 0, pad.top + plotH);
    areaGradient.addColorStop(0, 'rgba(51,102,204,0.25)');
    areaGradient.addColorStop(1, 'rgba(51,102,204,0)');

    ctx.beginPath();
    data.forEach((d, i) => {
      const x = xScale(i);
      const y = yScale(d.annualRate);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    ctx.beginPath();
    data.forEach((d, i) => {
      const x = xScale(i);
      const y = yScale(d.annualRate);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo(xScale(data.length - 1), pad.top + plotH);
    ctx.lineTo(xScale(0), pad.top + plotH);
    ctx.closePath();
    ctx.fillStyle = areaGradient;
    ctx.fill();

    const currentIdx = data.findIndex(d => d.year === currentYear);
    if (currentIdx >= 0) {
      const cx = xScale(currentIdx);
      const cy = yScale(data[currentIdx].annualRate);

      ctx.strokeStyle = '#ff6633';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(cx, pad.top);
      ctx.lineTo(cx, pad.top + plotH);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#ff6633';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  setYear(year: number): void {
    this.currentYear = year;
    this.yearLabel.textContent = String(year);
    const fill = document.getElementById('timeline-fill');
    if (fill) {
      const pct = ((year - START_YEAR) / (END_YEAR - START_YEAR)) * 100;
      fill.style.width = `${pct}%`;
    }
  }

  setVolume(volume: number): void {
    this.volumeLabel.textContent = String(volume);
  }

  getYear(): number {
    return this.currentYear;
  }

  togglePlay(): void {
    if (this.isPlaying) {
      this.stopPlay();
    } else {
      this.startPlay();
    }
  }

  startPlay(): void {
    this.isPlaying = true;
    this.playBtn.innerHTML = this.pauseIcon();
    this.playBtn.style.background = '#6633ff';

    this.playInterval = setInterval(() => {
      let nextYear = this.currentYear + 1;
      if (nextYear > END_YEAR) {
        nextYear = START_YEAR;
      }
      this.setYear(nextYear);
      this.slider.value = String(nextYear);
      this.callbacks.onYearChange(nextYear);
    }, 1000);
  }

  stopPlay(): void {
    this.isPlaying = false;
    this.playBtn.innerHTML = this.playIcon();
    this.playBtn.style.background = '#3366cc';
    if (this.playInterval) {
      clearInterval(this.playInterval);
      this.playInterval = null;
    }
  }

  isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }

  private applyResponsive(): void {
    const width = window.innerWidth;
    if (width < 768) {
      this.timelineContainer.style.flexDirection = 'column';
      this.infoPanel.style.padding = '12px 16px';
      this.detailPanel.style.right = '5%';
      this.detailPanel.style.width = '280px';
    } else {
      this.timelineContainer.style.flexDirection = 'row';
      this.infoPanel.style.padding = '20px 24px';
      this.detailPanel.style.right = '10%';
      this.detailPanel.style.width = '320px';
    }
  }

  private playIcon(): string {
    return `<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M3 1.5L12 7L3 12.5V1.5Z" fill="currentColor"/>
    </svg>`;
  }

  private pauseIcon(): string {
    return `<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="2" y="1" width="3.5" height="12" rx="1" fill="currentColor"/>
      <rect x="8.5" y="1" width="3.5" height="12" rx="1" fill="currentColor"/>
    </svg>`;
  }

  private resetIcon(): string {
    return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
      <path d="M3 3v5h5"/>
    </svg>`;
  }
}
