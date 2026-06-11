import { TimeState, WeatherState, WeatherType } from '../types.js';
import { Player } from '../entities/Player.js';

const WEATHER_LABELS: Record<WeatherType, string> = {
  [WeatherType.SUNNY]: '晴天',
  [WeatherType.CLOUDY]: '多云',
  [WeatherType.RAINY]: '雨天',
  [WeatherType.SNOWY]: '雪天',
};

const WEATHER_ICONS: Record<WeatherType, string> = {
  [WeatherType.SUNNY]: '☀',
  [WeatherType.CLOUDY]: '☁',
  [WeatherType.RAINY]: '🌧',
  [WeatherType.SNOWY]: '❄',
};

export class HUD {
  private fontSize: number = 16;
  private cachedTimeState: TimeState | null = null;
  private cachedWeatherState: WeatherState | null = null;
  private cachedPlayer: { x: number; y: number; speed: number } | null = null;
  private displayedLight: number = 0;
  private displayTargetLight: number = 0;
  private barDisplayedWidth: number = 0;

  public recalculateFontSize(windowWidth: number): void {
    const min = 14;
    const max = 24;
    const base = 16;
    const scale = windowWidth / 1280;
    this.fontSize = Math.max(min, Math.min(max, Math.floor(base * scale)));
  }

  public update(
    timeState: TimeState,
    weatherState: WeatherState,
    player: Player
  ): void {
    this.cachedTimeState = timeState;
    this.cachedWeatherState = weatherState;
    this.cachedPlayer = {
      x: player.getX(),
      y: player.getY(),
      speed: player.getSpeedMultiplier(),
    };
    this.displayTargetLight = timeState.lightIntensity;
  }

  public render(
    ctx: CanvasRenderingContext2D,
    _viewWidth: number,
    _viewHeight: number
  ): void {
    if (!this.cachedTimeState || !this.cachedWeatherState || !this.cachedPlayer) return;

    this.displayedLight += (this.displayTargetLight - this.displayedLight) * 0.08;

    this.renderTopLeft(ctx);
    this.renderBottomRight(ctx);
  }

  private renderTopLeft(ctx: CanvasRenderingContext2D): void {
    const pad = 16;
    let y = pad;
    const fs = this.fontSize;

    ctx.font = `bold ${fs + 4}px sans-serif`;
    ctx.textBaseline = 'top';

    const timeText = this.cachedTimeState!.formattedTime;
    this.drawOutlinedText(ctx, `🕐 ${timeText}`, pad, y);
    y += fs + 10;

    const weatherType = this.getBlendedWeather();
    const icon = WEATHER_ICONS[weatherType];
    const label = WEATHER_LABELS[weatherType];
    this.drawOutlinedText(ctx, `${icon} ${label}`, pad, y);
    y += fs + 10;

    this.drawLightBar(ctx, pad, y, 180, fs);
  }

  private getBlendedWeather(): WeatherType {
    const ws = this.cachedWeatherState!;
    return ws.transitionProgress >= 0.5 ? ws.type : ws.previousType;
  }

  private drawLightBar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    fontSize: number
  ): void {
    const height = Math.max(10, Math.floor(fontSize * 0.7));
    const label = `光照: ${Math.round(this.displayedLight * 100)}%`;

    ctx.font = `bold ${fontSize}px sans-serif`;
    this.drawOutlinedText(ctx, label, x, y);

    const barY = y + fontSize + 4;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(x, barY, width, height);

    const progress = this.displayedLight;
    const r = Math.floor(255 * (1 - progress));
    const g = Math.floor(200 * progress + 50);
    const b = Math.floor(100);
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.fillRect(x, barY, width * progress, height);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, barY + 0.5, width - 1, height - 1);
  }

  private renderBottomRight(ctx: CanvasRenderingContext2D): void {
    const viewW = window.innerWidth;
    const viewH = window.innerHeight;
    const pad = 16;
    const fs = this.fontSize;

    ctx.font = `bold ${fs}px sans-serif`;
    ctx.textBaseline = 'bottom';
    ctx.textAlign = 'right';

    const px = this.cachedPlayer!.x.toFixed(0);
    const py = this.cachedPlayer!.y.toFixed(0);
    const speed = this.cachedPlayer!.speed.toFixed(1);

    const textY = viewH - pad;
    this.drawOutlinedText(ctx, `坐标: (${px}, ${py})`, viewW - pad, textY);
    this.drawOutlinedText(ctx, `速度: x${speed}`, viewW - pad, textY - fs - 6);

    ctx.textAlign = 'left';
  }

  private drawOutlinedText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number
  ): void {
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.strokeText(text, x, y);

    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, x, y);
  }
}
