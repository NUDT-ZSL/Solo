export type DisplayMode = 'clock' | 'hourglass';

export interface TimeData {
  digits: string[];
  formatted: string;
  mode: DisplayMode;
}

export class TimeManager {
  private mode: DisplayMode = 'clock';
  private modeSwitchTimer: number = 0;
  private readonly MODE_SWITCH_INTERVAL = 10000;

  public update(deltaTime: number): TimeData {
    this.modeSwitchTimer += deltaTime;
    if (this.modeSwitchTimer >= this.MODE_SWITCH_INTERVAL) {
      this.modeSwitchTimer = 0;
      this.mode = this.mode === 'clock' ? 'hourglass' : 'clock';
    }

    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();

    if (this.mode === 'clock') {
      return this.formatClock(hours, minutes, seconds);
    } else {
      return this.formatHourglass(hours, minutes, seconds);
    }
  }

  public getMode(): DisplayMode {
    return this.mode;
  }

  public setMode(mode: DisplayMode): void {
    this.mode = mode;
    this.modeSwitchTimer = 0;
  }

  public toggleMode(): DisplayMode {
    this.mode = this.mode === 'clock' ? 'hourglass' : 'clock';
    this.modeSwitchTimer = 0;
    return this.mode;
  }

  private formatClock(hours: number, minutes: number, seconds: number): TimeData {
    const hh = hours.toString().padStart(2, '0');
    const mm = minutes.toString().padStart(2, '0');
    const ss = seconds.toString().padStart(2, '0');
    const formatted = `${hh}:${mm}:${ss}`;
    const digits = formatted.split('');
    return { digits, formatted, mode: 'clock' };
  }

  private formatHourglass(hours: number, minutes: number, seconds: number): TimeData {
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    const dayProgress = totalSeconds / 86400;
    const displayNum = Math.floor(dayProgress * 1000000);
    const formatted = displayNum.toString().padStart(6, '0');
    const digits = formatted.split('');
    digits.splice(2, 0, ':');
    digits.splice(5, 0, ':');
    return { digits, formatted: digits.join(''), mode: 'hourglass' };
  }

  public getCurrentTime(): TimeData {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();

    if (this.mode === 'clock') {
      return this.formatClock(hours, minutes, seconds);
    } else {
      return this.formatHourglass(hours, minutes, seconds);
    }
  }
}
