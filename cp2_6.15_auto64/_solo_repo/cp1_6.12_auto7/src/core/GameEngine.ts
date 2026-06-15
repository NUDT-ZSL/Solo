import {
  TimePhase,
  TimeState,
  WeatherType,
  WeatherState,
  Particle,
  GameInput,
  CameraState,
} from '../types.js';
import { ClockSystem } from '../systems/ClockSystem.js';
import { WeatherSystem } from '../systems/WeatherSystem.js';
import { WorldMap } from '../entities/WorldMap.js';
import { Player } from '../entities/Player.js';
import { HUD } from '../ui/HUD.js';

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private clockSystem: ClockSystem;
  private weatherSystem: WeatherSystem;
  private worldMap: WorldMap;
  private player: Player;
  private hud: HUD;
  private input: GameInput;
  private camera: CameraState;
  private particles: Particle[];
  private lastTime: number = 0;
  private animationId: number = 0;
  private isRunning: boolean = false;
  private skyColorCache: {
    top: { r: number; g: number; b: number };
    bottom: { r: number; g: number; b: number };
  } | null = null;
  private lastSkyWeatherType: WeatherType | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context');
    this.ctx = ctx;

    this.input = { keys: new Set<string>() };
    this.camera = { x: 0, y: 0 };
    this.particles = [];

    this.clockSystem = new ClockSystem();
    this.weatherSystem = new WeatherSystem();
    this.worldMap = new WorldMap(50, 50);
    this.player = new Player(25 * this.worldMap.getTileSize(), 25 * this.worldMap.getTileSize());
    this.hud = new HUD();

    this.setupEventListeners();
    this.resize();
  }

  private setupEventListeners(): void {
    window.addEventListener('keydown', (e) => {
      this.input.keys.add(e.key.toLowerCase());
    });
    window.addEventListener('keyup', (e) => {
      this.input.keys.delete(e.key.toLowerCase());
    });

    const resizeObserver = new ResizeObserver(() => {
      this.resize();
    });
    resizeObserver.observe(this.canvas);
  }

  private resize(): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.canvas.style.width = window.innerWidth + 'px';
    this.canvas.style.height = window.innerHeight + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.hud.recalculateFontSize(window.innerWidth);
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = 0;
    }
  }

  private loop = (currentTime: number): void => {
    if (!this.isRunning) return;
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    this.update(deltaTime);
    this.render();

    this.animationId = requestAnimationFrame(this.loop);
  };

  private update(deltaTime: number): void {
    this.clockSystem.update(deltaTime);
    this.weatherSystem.updateWithParticleCheck(deltaTime, this.particles);

    const timeState = this.clockSystem.getTimeState();
    const weatherState = this.weatherSystem.getState();

    this.player.update(deltaTime, this.input, weatherState, this.worldMap);
    this.updateCamera();
    this.worldMap.update(deltaTime, timeState, weatherState);
    this.updateParticles(deltaTime, timeState, weatherState);
    this.hud.update(timeState, weatherState, this.player);
  }

  private updateCamera(): void {
    const viewWidth = window.innerWidth;
    const viewHeight = window.innerHeight;
    this.camera.x = this.player.getX() - viewWidth / 2;
    this.camera.y = this.player.getY() - viewHeight / 2;

    const mapWidth = this.worldMap.getWidth();
    const mapHeight = this.worldMap.getHeight();
    this.camera.x = Math.max(0, Math.min(this.camera.x, mapWidth - viewWidth));
    this.camera.y = Math.max(0, Math.min(this.camera.y, mapHeight - viewHeight));
  }

  private updateParticles(
    deltaTime: number,
    timeState: TimeState,
    weatherState: WeatherState
  ): void {
    this.weatherSystem.spawnParticles(this.particles, this.camera, window.innerWidth, window.innerHeight);

    if (this.player.isMoving()) {
      this.spawnStepParticles(weatherState);
    }

    const MAX_PARTICLES = 200;
    const removedByLimit = this.weatherSystem.checkParticleLimit(this.particles, MAX_PARTICLES);
    if (removedByLimit > 0) {
      console.warn(`[GameEngine] Force removed ${removedByLimit} particles due to overflow limit ${MAX_PARTICLES}`);
    }

    let removedExpired = 0;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      if (!p) continue;

      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.life -= deltaTime;

      if (p.type === 'snow') {
        p.vx = weatherState.windX + Math.sin(p.y * 0.01 + p.x * 0.005) * 20;
      }

      if (p.type === 'rain' && p.y > this.camera.y + window.innerHeight + 50) {
        p.life = 0;
      }

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        removedExpired++;
      }
    }

    if (removedExpired > 0 && Math.random() < 0.02) {
      console.log(`[GameEngine] Removed ${removedExpired} expired particles, remaining: ${this.particles.length}`);
    }
  }

  private spawnStepParticles(weatherState: WeatherState): void {
    if (Math.random() > 0.15) return;

    const px = this.player.getX();
    const py = this.player.getY() + 10;
    const weatherType = weatherState.type;
    const blendT = weatherState.transitionProgress;

    if (weatherType === WeatherType.RAINY) {
      for (let i = 0; i < 3; i++) {
        this.particles.push({
          x: px + (Math.random() - 0.5) * 16,
          y: py,
          vx: (Math.random() - 0.5) * 40,
          vy: -40 - Math.random() * 40,
          life: 0.8,
          maxLife: 0.8,
          type: 'splash',
          size: 2 + Math.random() * 2,
        });
      }
    } else if (weatherType === WeatherType.SUNNY) {
      for (let i = 0; i < 2; i++) {
        this.particles.push({
          x: px + (Math.random() - 0.5) * 12,
          y: py,
          vx: (Math.random() - 0.5) * 25,
          vy: -15 - Math.random() * 15,
          life: 1.0,
          maxLife: 1.0,
          type: 'dust',
          size: 1.5 + Math.random() * 1.5,
        });
      }
    }
  }

  private render(): void {
    const ctx = this.ctx;
    const viewWidth = window.innerWidth;
    const viewHeight = window.innerHeight;

    const timeState = this.clockSystem.getTimeState();
    const weatherState = this.weatherSystem.getState();

    this.drawSkyGradient(ctx, viewWidth, viewHeight, timeState, weatherState);
    this.worldMap.render(ctx, this.camera, timeState, weatherState);
    this.player.render(ctx, this.camera, timeState);
    this.renderParticles(ctx, this.camera);
    this.drawLightOverlay(ctx, viewWidth, viewHeight, timeState, weatherState);
    this.player.renderLightSpot(ctx, this.camera, timeState);
    this.hud.render(ctx, viewWidth, viewHeight);
  }

  private drawSkyGradient(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    timeState: TimeState,
    weatherState: WeatherState
  ): void {
    const sky = this.getInterpolatedSkyColor(timeState, weatherState);
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, sky.top);
    gradient.addColorStop(1, sky.bottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  private getSkyColorForPhaseAndWeather(
    phase: TimePhase,
    weather: WeatherType
  ): { top: string; bottom: string } {
    const phaseSkies: Record<TimePhase, Record<WeatherType, { top: string; bottom: string }>> = {
      [TimePhase.DAWN]: {
        [WeatherType.SUNNY]: { top: '#4a6fa5', bottom: '#e8a87c' },
        [WeatherType.CLOUDY]: { top: '#6b7a90', bottom: '#c8a89a' },
        [WeatherType.RAINY]: { top: '#4a5568', bottom: '#8b7355' },
        [WeatherType.SNOWY]: { top: '#8b95a5', bottom: '#d0d5e0' },
      },
      [TimePhase.NOON]: {
        [WeatherType.SUNNY]: { top: '#4a90d9', bottom: '#a8d8ea' },
        [WeatherType.CLOUDY]: { top: '#6b88a8', bottom: '#b0c4d4' },
        [WeatherType.RAINY]: { top: '#4a5a6e', bottom: '#7a8a9a' },
        [WeatherType.SNOWY]: { top: '#95a0b5', bottom: '#d8dde8' },
      },
      [TimePhase.DUSK]: {
        [WeatherType.SUNNY]: { top: '#5c4a7a', bottom: '#e07a5f' },
        [WeatherType.CLOUDY]: { top: '#5a556a', bottom: '#b07a65' },
        [WeatherType.RAINY]: { top: '#3d3a4a', bottom: '#6a5550' },
        [WeatherType.SNOWY]: { top: '#7a7585', bottom: '#c0b5c5' },
      },
      [TimePhase.NIGHT]: {
        [WeatherType.SUNNY]: { top: '#0a1628', bottom: '#1a2a4a' },
        [WeatherType.CLOUDY]: { top: '#151a28', bottom: '#252d3a' },
        [WeatherType.RAINY]: { top: '#0d1220', bottom: '#1d2230' },
        [WeatherType.SNOWY]: { top: '#1a2030', bottom: '#2a3040' },
      },
    };
    return phaseSkies[phase][weather];
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    if (hex.startsWith('rgb')) {
      const match = hex.match(/\d+/g);
      if (match) {
        return { r: +match[0], g: +match[1], b: +match[2] };
      }
    }
    const h = hex.replace('#', '');
    return {
      r: parseInt(h.substring(0, 2), 16),
      g: parseInt(h.substring(2, 4), 16),
      b: parseInt(h.substring(4, 6), 16),
    };
  }

  private lerpColor(
    c1: { r: number; g: number; b: number },
    c2: { r: number; g: number; b: number },
    t: number
  ): { r: number; g: number; b: number } {
    return {
      r: Math.round(c1.r + (c2.r - c1.r) * t),
      g: Math.round(c1.g + (c2.g - c1.g) * t),
      b: Math.round(c1.b + (c2.b - c1.b) * t),
    };
  }

  private rgbToString(c: { r: number; g: number; b: number }): string {
    return `rgb(${c.r}, ${c.g}, ${c.b})`;
  }

  private getInterpolatedSkyColor(
    timeState: TimeState,
    weatherState: WeatherState
  ): { top: string; bottom: string } {
    const timeOrder = [TimePhase.DAWN, TimePhase.NOON, TimePhase.DUSK, TimePhase.NIGHT];
    const currentIdx = timeOrder.indexOf(timeState.phase);
    const nextIdx = (currentIdx + 1) % timeOrder.length;

    const prevWeather = weatherState.previousType;
    const currWeather = weatherState.type;
    const weatherT = weatherState.transitionProgress;

    const lerpSkyBetweenWeathers = (phase: TimePhase, t: number) => {
      const prevColor = this.getSkyColorForPhaseAndWeather(phase, prevWeather);
      const currColor = this.getSkyColorForPhaseAndWeather(phase, currWeather);
      const prevTop = this.hexToRgb(prevColor.top);
      const prevBottom = this.hexToRgb(prevColor.bottom);
      const currTop = this.hexToRgb(currColor.top);
      const currBottom = this.hexToRgb(currColor.bottom);
      return {
        top: this.lerpColor(prevTop, currTop, t),
        bottom: this.lerpColor(prevBottom, currBottom, t),
      };
    };

    const currentPhaseSky = lerpSkyBetweenWeathers(timeOrder[currentIdx], weatherT);
    const nextPhaseSky = lerpSkyBetweenWeathers(timeOrder[nextIdx], weatherT);

    const phaseT = timeState.phaseProgress;
    const finalTop = this.lerpColor(currentPhaseSky.top, nextPhaseSky.top, phaseT * 0.5);
    const finalBottom = this.lerpColor(currentPhaseSky.bottom, nextPhaseSky.bottom, phaseT * 0.5);

    if (weatherT < 1.0) {
      const blendSpeed = 0.08;
      if (!this.skyColorCache || this.lastSkyWeatherType !== weatherState.type) {
        this.skyColorCache = { top: finalTop, bottom: finalBottom };
        this.lastSkyWeatherType = weatherState.type;
      } else {
        this.skyColorCache.top = this.lerpColor(this.skyColorCache.top, finalTop, blendSpeed);
        this.skyColorCache.bottom = this.lerpColor(this.skyColorCache.bottom, finalBottom, blendSpeed);
      }
      return {
        top: this.rgbToString(this.skyColorCache.top),
        bottom: this.rgbToString(this.skyColorCache.bottom),
      };
    }

    this.skyColorCache = { top: finalTop, bottom: finalBottom };
    return {
      top: this.rgbToString(finalTop),
      bottom: this.rgbToString(finalBottom),
    };
  }

  private getWeatherDarkness(weatherState: WeatherState): number {
    const factors: Record<WeatherType, number> = {
      [WeatherType.SUNNY]: 1.0,
      [WeatherType.CLOUDY]: 0.75,
      [WeatherType.RAINY]: 0.55,
      [WeatherType.SNOWY]: 0.65,
    };

    const prev = factors[weatherState.previousType];
    const curr = factors[weatherState.type];
    return prev + (curr - prev) * weatherState.transitionProgress;
  }

  private drawLightOverlay(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    timeState: TimeState,
    weatherState: WeatherState
  ): void {
    const light = timeState.lightIntensity;
    const darkness = 1 - light;

    let overlayColor: string;
    if (timeState.phase === TimePhase.NIGHT) {
      overlayColor = `rgba(5, 10, 30, ${darkness * 0.7})`;
    } else if (timeState.phase === TimePhase.DUSK) {
      overlayColor = `rgba(60, 20, 40, ${darkness * 0.35})`;
    } else if (timeState.phase === TimePhase.DAWN) {
      overlayColor = `rgba(255, 150, 100, ${darkness * 0.25})`;
    } else {
      overlayColor = `rgba(0, 0, 0, ${darkness * 0.3})`;
    }

    const wf = this.weatherSystem.getInterpolatedDarkness();
    if (wf < 1.0) {
      const extraDark = (1 - wf) * 0.25;
      ctx.fillStyle = `rgba(20, 25, 40, ${extraDark})`;
      ctx.fillRect(0, 0, width, height);
    }

    ctx.fillStyle = overlayColor;
    ctx.fillRect(0, 0, width, height);
  }

  private renderParticles(ctx: CanvasRenderingContext2D, camera: CameraState): void {
    for (const p of this.particles) {
      const alpha = Math.min(1, p.life / p.maxLife);
      const screenX = p.x - camera.x;
      const screenY = p.y - camera.y;

      if (screenX < -50 || screenX > window.innerWidth + 50) continue;
      if (screenY < -50 || screenY > window.innerHeight + 50) continue;

      ctx.save();
      ctx.globalAlpha = alpha;

      switch (p.type) {
        case 'rain':
          ctx.strokeStyle = '#4682B4';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(screenX, screenY);
          ctx.lineTo(screenX + p.vx * 0.02, screenY + p.vy * 0.02);
          ctx.stroke();
          break;
        case 'snow':
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(screenX, screenY, p.size, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'dust':
          ctx.fillStyle = '#D3D3D3';
          ctx.beginPath();
          ctx.arc(screenX, screenY, p.size, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'splash':
          ctx.fillStyle = '#87CEEB';
          ctx.beginPath();
          ctx.arc(screenX, screenY, p.size, 0, Math.PI * 2);
          ctx.fill();
          break;
      }

      ctx.restore();
    }
  }
}
