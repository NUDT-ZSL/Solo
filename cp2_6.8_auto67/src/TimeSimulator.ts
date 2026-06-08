export interface LineFlowData {
  lineId: string;
  passengerVolume: number;
}

export interface SegmentRenderData {
  lineId: string;
  thickness: number;
  opacity: number;
  effectiveVolume: number;
}

export interface StationRenderData {
  stationId: string;
  color: string;
  glowIntensity: number;
  totalVolume: number;
}

export class TimeSimulator {
  private currentMinutes: number = 480;
  private isPlaying: boolean = false;
  private playSpeed: number = 1;
  private lastTimestamp: number = 0;
  private animationId: number | null = null;
  private onTimeChange: (() => void) | null = null;

  private readonly PEAK_MORNING_START = 420;
  private readonly PEAK_MORNING_END = 540;
  private readonly PEAK_EVENING_START = 1020;
  private readonly PEAK_EVENING_END = 1140;
  private readonly PEAK_COEFFICIENT = 1.0;
  private readonly OFF_PEAK_COEFFICIENT = 0.3;

  private readonly MIN_THICKNESS = 2;
  private readonly MAX_THICKNESS = 16;
  private readonly MIN_OPACITY = 0.2;
  private readonly MAX_OPACITY = 1.0;

  constructor(initialMinutes: number = 480) {
    this.currentMinutes = initialMinutes;
  }

  setOnTimeChange(callback: () => void): void {
    this.onTimeChange = callback;
  }

  getCurrentMinutes(): number {
    return this.currentMinutes;
  }

  setCurrentMinutes(minutes: number): void {
    this.currentMinutes = Math.max(0, Math.min(1439, minutes));
    if (this.onTimeChange) {
      this.onTimeChange();
    }
  }

  getTimeString(): string {
    const hours = Math.floor(this.currentMinutes / 60);
    const mins = Math.floor(this.currentMinutes % 60);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  getTimeProgress(): number {
    return this.currentMinutes / 1440;
  }

  setTimeProgress(progress: number): void {
    this.setCurrentMinutes(progress * 1440);
  }

  getDecayCoefficient(): number {
    const m = this.currentMinutes;
    const fade = 30;

    if (m >= this.PEAK_MORNING_START - fade && m < this.PEAK_MORNING_START) {
      return this.OFF_PEAK_COEFFICIENT +
        (this.PEAK_COEFFICIENT - this.OFF_PEAK_COEFFICIENT) *
        (m - (this.PEAK_MORNING_START - fade)) / fade;
    }
    if (m >= this.PEAK_MORNING_START && m < this.PEAK_MORNING_END) {
      return this.PEAK_COEFFICIENT;
    }
    if (m >= this.PEAK_MORNING_END && m < this.PEAK_MORNING_END + fade) {
      return this.PEAK_COEFFICIENT -
        (this.PEAK_COEFFICIENT - this.OFF_PEAK_COEFFICIENT) *
        (m - this.PEAK_MORNING_END) / fade;
    }

    if (m >= this.PEAK_EVENING_START - fade && m < this.PEAK_EVENING_START) {
      return this.OFF_PEAK_COEFFICIENT +
        (this.PEAK_COEFFICIENT - this.OFF_PEAK_COEFFICIENT) *
        (m - (this.PEAK_EVENING_START - fade)) / fade;
    }
    if (m >= this.PEAK_EVENING_START && m < this.PEAK_EVENING_END) {
      return this.PEAK_COEFFICIENT;
    }
    if (m >= this.PEAK_EVENING_END && m < this.PEAK_EVENING_END + fade) {
      return this.PEAK_COEFFICIENT -
        (this.PEAK_COEFFICIENT - this.OFF_PEAK_COEFFICIENT) *
        (m - this.PEAK_EVENING_END) / fade;
    }

    return this.OFF_PEAK_COEFFICIENT;
  }

  isPeakHour(): boolean {
    const m = this.currentMinutes;
    return (m >= this.PEAK_MORNING_START && m < this.PEAK_MORNING_END) ||
           (m >= this.PEAK_EVENING_START && m < this.PEAK_EVENING_END);
  }

  play(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.lastTimestamp = performance.now();
    this.loop();
  }

  pause(): void {
    this.isPlaying = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  togglePlay(): boolean {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
    return this.isPlaying;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  setPlaySpeed(speed: number): void {
    this.playSpeed = speed;
  }

  forward(minutes: number = 30): void {
    this.setCurrentMinutes(this.currentMinutes + minutes);
  }

  rewind(minutes: number = 30): void {
    this.setCurrentMinutes(this.currentMinutes - minutes);
  }

  private loop = (): void => {
    if (!this.isPlaying) return;

    const now = performance.now();
    const delta = (now - this.lastTimestamp) / 1000;
    this.lastTimestamp = now;

    const simulatedMinutes = delta * 10 * this.playSpeed;
    let newTime = this.currentMinutes + simulatedMinutes;
    if (newTime >= 1440) {
      newTime = newTime - 1440;
    }
    this.currentMinutes = newTime;

    if (this.onTimeChange) {
      this.onTimeChange();
    }

    this.animationId = requestAnimationFrame(this.loop);
  };

  computeSegmentRender(lineData: LineFlowData): SegmentRenderData {
    const coefficient = this.getDecayCoefficient();
    const effectiveVolume = lineData.passengerVolume * coefficient;
    const normalizedVolume = Math.min(effectiveVolume / 100, 1);

    const thickness = this.MIN_THICKNESS +
      (this.MAX_THICKNESS - this.MIN_THICKNESS) * normalizedVolume;
    const opacity = this.MIN_OPACITY +
      (this.MAX_OPACITY - this.MIN_OPACITY) * normalizedVolume;

    return {
      lineId: lineData.lineId,
      thickness,
      opacity,
      effectiveVolume
    };
  }

  computeStationRender(
    stationId: string,
    connectedLinesVolumes: number[]
  ): StationRenderData {
    const coefficient = this.getDecayCoefficient();
    const totalVolume = connectedLinesVolumes.reduce((sum, v) => sum + v * coefficient, 0);
    const normalized = Math.min(totalVolume / 200, 1);

    const baseColor = { r: 107, g: 114, b: 128 };
    const targetColor = { r: 255, g: 87, b: 34 };

    const r = Math.round(baseColor.r + (targetColor.r - baseColor.r) * normalized);
    const g = Math.round(baseColor.g + (targetColor.g - baseColor.g) * normalized);
    const b = Math.round(baseColor.b + (targetColor.b - baseColor.b) * normalized);

    return {
      stationId,
      color: `rgb(${r}, ${g}, ${b})`,
      glowIntensity: normalized,
      totalVolume
    };
  }

  destroy(): void {
    this.pause();
  }
}
