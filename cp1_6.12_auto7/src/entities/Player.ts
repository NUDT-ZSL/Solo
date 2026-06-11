import { WeatherState, WeatherType, GameInput, CameraState, TimeState } from '../types.js';
import { WorldMap } from './WorldMap.js';

const BASE_SPEED = 180;
const PLAYER_RADIUS = 14;

const WEATHER_SPEED_MOD: Record<WeatherType, number> = {
  [WeatherType.SUNNY]: 1.0,
  [WeatherType.CLOUDY]: 0.95,
  [WeatherType.RAINY]: 0.7,
  [WeatherType.SNOWY]: 0.5,
};

export class Player {
  private x: number;
  private y: number;
  private moving: boolean = false;
  private direction: { x: number; y: number } = { x: 0, y: -1 };
  private walkCycle: number = 0;
  private speedMultiplier: number = 1.0;

  constructor(startX: number, startY: number) {
    this.x = startX;
    this.y = startY;
  }

  public getX(): number {
    return this.x;
  }

  public getY(): number {
    return this.y;
  }

  public isMoving(): boolean {
    return this.moving;
  }

  public getSpeedMultiplier(): number {
    return this.speedMultiplier;
  }

  public update(
    deltaTime: number,
    input: GameInput,
    weather: WeatherState,
    worldMap: WorldMap
  ): void {
    const prevT = weather.transitionProgress;
    const prevMod = WEATHER_SPEED_MOD[weather.previousType];
    const currMod = WEATHER_SPEED_MOD[weather.type];
    this.speedMultiplier = prevMod + (currMod - prevMod) * prevT;

    let dx = 0;
    let dy = 0;

    if (input.keys.has('w') || input.keys.has('arrowup')) dy -= 1;
    if (input.keys.has('s') || input.keys.has('arrowdown')) dy += 1;
    if (input.keys.has('a') || input.keys.has('arrowleft')) dx -= 1;
    if (input.keys.has('d') || input.keys.has('arrowright')) dx += 1;

    const length = Math.hypot(dx, dy);
    this.moving = length > 0;

    if (this.moving) {
      dx /= length;
      dy /= length;
      this.direction = { x: dx, y: dy };

      const speed = BASE_SPEED * this.speedMultiplier;
      this.x += dx * speed * deltaTime;
      this.y += dy * speed * deltaTime;

      const clamped = worldMap.clampPosition(this.x, this.y, PLAYER_RADIUS);
      this.x = clamped.x;
      this.y = clamped.y;

      this.walkCycle += deltaTime * 8;
    } else {
      this.walkCycle = 0;
    }
  }

  public render(
    ctx: CanvasRenderingContext2D,
    camera: CameraState,
    _timeState: TimeState
  ): void {
    const x = this.x - camera.x;
    const y = this.y - camera.y;

    const bobOffset = this.moving ? Math.sin(this.walkCycle) * 2 : 0;

    ctx.save();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(x, y + 2, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    const bodyY = y - 10 + bobOffset;
    ctx.fillStyle = '#4a90d9';
    ctx.beginPath();
    ctx.roundRect(x - 10, bodyY - 12, 20, 20, 4);
    ctx.fill();

    ctx.fillStyle = '#ffd9a0';
    ctx.beginPath();
    ctx.arc(x, bodyY - 20, 9, 0, Math.PI * 2);
    ctx.fill();

    if (this.direction.x < 0) {
      ctx.fillStyle = '#222';
      ctx.beginPath();
      ctx.arc(x - 3, bodyY - 21, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + 3, bodyY - 21, 1.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.direction.x > 0) {
      ctx.fillStyle = '#222';
      ctx.beginPath();
      ctx.arc(x - 3, bodyY - 21, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + 3, bodyY - 21, 1.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#222';
      ctx.beginPath();
      ctx.arc(x - 3, bodyY - 21, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + 3, bodyY - 21, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    const legSwing = this.moving ? Math.sin(this.walkCycle) * 5 : 0;
    ctx.fillStyle = '#3d5a80';
    ctx.fillRect(x - 8, bodyY + 8, 6, 10 + legSwing);
    ctx.fillRect(x + 2, bodyY + 8, 6, 10 - legSwing);

    ctx.restore();
  }

  public renderLightSpot(
    ctx: CanvasRenderingContext2D,
    camera: CameraState,
    timeState: TimeState
  ): void {
    if (timeState.lightIntensity >= 0.3) return;

    const x = this.x - camera.x;
    const y = this.y - camera.y;
    const spotRadius = 150 * (1 - timeState.lightIntensity) + 60;
    const alpha = Math.min(0.6, (0.3 - timeState.lightIntensity) * 2);

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, spotRadius);
    gradient.addColorStop(0, `rgba(255, 230, 180, ${alpha * 0.8})`);
    gradient.addColorStop(0.4, `rgba(255, 200, 120, ${alpha * 0.3})`);
    gradient.addColorStop(1, 'rgba(255, 200, 120, 0)');

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = gradient;
    ctx.fillRect(x - spotRadius, y - spotRadius, spotRadius * 2, spotRadius * 2);
    ctx.restore();
  }
}
