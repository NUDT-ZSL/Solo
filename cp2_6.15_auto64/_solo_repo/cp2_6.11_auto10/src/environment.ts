import { Renderer } from './renderer';

export type WeatherType = 'sunny' | 'cloudy' | 'rain' | 'snow';
export type FoodShape = 'circle' | 'square' | 'triangle';

export interface Food {
  x: number; y: number;
  shape: FoodShape;
  color: string;
  size: number;
  isDragging: boolean;
}

export class Environment {
  private width: number;
  private height: number;
  private grassStartY: number;
  private grassTileSize: number = 16;
  private grassTiles: { hueOffset: number; frameCounter: number }[][] = [];
  private grassCanvas: HTMLCanvasElement | null = null;
  private grassDirty: boolean = true;

  public timeOfDay: number = 8 * 60;
  public weather: WeatherType = 'sunny';
  private realStartTime: number = Date.now();
  private lastWeatherSwitchAt: number = Date.now();
  private weatherSwitchIntervalMs: number = 30 * 60 * 1000;

  public foods: Food[] = [];
  private foodSpawnTimer: number = 0;
  private foodSpawnInterval: number = 3200;
  private maxFoods: number = 5;

  private warmColors = ['#FF6B6B', '#FFA94D', '#FFD93D', '#FF8C42', '#E25822', '#F5D442', '#FFBE76', '#FF7F50', '#FF9F43', '#EE5A24'];

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.grassStartY = Math.floor(height * 0.65);
    this.initGrass();
    this.grassCanvas = document.createElement('canvas');
    this.grassCanvas.width = width;
    this.grassCanvas.height = height - this.grassStartY;
    this.renderGrassToCanvas();
    void this.realStartTime;
  }

  private initGrass(): void {
    const cols = Math.ceil(this.width / this.grassTileSize);
    const rows = Math.ceil((this.height - this.grassStartY) / this.grassTileSize);
    for (let r = 0; r < rows; r++) {
      const row: { hueOffset: number; frameCounter: number }[] = [];
      for (let c = 0; c < cols; c++) {
        row.push({
          hueOffset: (Math.random() - 0.5) * 0.18,
          frameCounter: Math.floor(Math.random() * 120)
        });
      }
      this.grassTiles.push(row);
    }
  }

  public update(dt: number, renderer: Renderer, forceWeather: WeatherType | null = null): void {
    this.timeOfDay = (this.timeOfDay + dt / 380) % 1440;

    const now = Date.now();
    if (now - this.lastWeatherSwitchAt >= this.weatherSwitchIntervalMs) {
      this.lastWeatherSwitchAt = now;
      if (forceWeather) {
        this.weather = forceWeather;
      } else {
        const weathers: WeatherType[] = ['sunny', 'sunny', 'cloudy', 'rain', 'snow'];
        this.weather = weathers[Math.floor(Math.random() * weathers.length)];
      }
    }

    this.updateGrass(dt);
    if (this.grassDirty) {
      this.renderGrassToCanvas();
      this.grassDirty = false;
    }

    this.foodSpawnTimer += dt;
    if (this.foodSpawnTimer >= this.foodSpawnInterval && this.foods.length < this.maxFoods) {
      this.spawnFood();
      this.foodSpawnTimer = 0;
    }

    renderer.addWeatherParticles(this.weather, dt);
  }

  private updateGrass(dt: number): void {
    for (const row of this.grassTiles) {
      for (const tile of row) {
        tile.frameCounter += dt;
        if (tile.frameCounter >= 950) {
          tile.frameCounter = 0;
          tile.hueOffset = (Math.random() - 0.5) * 0.2;
          this.grassDirty = true;
        }
      }
    }
    void dt;
  }

  private renderGrassToCanvas(): void {
    if (!this.grassCanvas) return;
    const ctx = this.grassCanvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    const base = '#4A7C59';
    const dark = '#3A6349';
    const light = '#5A9C69';
    const bright = '#6AAF79';

    for (let r = 0; r < this.grassTiles.length; r++) {
      for (let c = 0; c < this.grassTiles[r].length; c++) {
        const tile = this.grassTiles[r][c];
        const x = c * this.grassTileSize;
        const y = r * this.grassTileSize;
        const sh = tile.hueOffset;
        let color = base;
        if (sh < -0.08) color = dark;
        else if (sh > 0.08) color = light;
        ctx.fillStyle = color;
        ctx.fillRect(x, y, this.grassTileSize, this.grassTileSize);

        ctx.fillStyle = sh > 0 ? light : dark;
        for (let i = 0; i < 2; i++) {
          const gx = x + ((c * 3 + i * 7) % this.grassTileSize);
          const gy = y + ((r * 5 + i * 11) % this.grassTileSize);
          ctx.fillRect(Math.floor(gx), Math.floor(gy), 1, 2);
        }

        if ((c + r) % 5 === 0) {
          ctx.fillStyle = bright;
          ctx.fillRect(x + 4, y + 12, 1, 3);
          ctx.fillRect(x + 5, y + 11, 1, 4);
          ctx.fillRect(x + 6, y + 12, 1, 3);
        }
      }
    }
  }

  private spawnFood(): void {
    const shapes: FoodShape[] = ['circle', 'square', 'triangle'];
    const margin = 44;
    const x = margin + Math.random() * (this.width - margin * 2);
    const y = this.grassStartY + 16 + Math.random() * (this.height - this.grassStartY - 56);
    this.foods.push({
      x, y,
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      color: this.warmColors[Math.floor(Math.random() * this.warmColors.length)],
      size: 9 + Math.floor(Math.random() * 4),
      isDragging: false
    });
  }

  public drawSkyAndGrass(renderer: Renderer): void {
    this.drawSky(renderer);
    if (this.grassCanvas) {
      renderer.drawCachedGrass(this.grassCanvas, this.grassStartY);
    }
  }

  private drawSky(renderer: Renderer): void {
    const ctx = renderer.getContext();
    const { w, h } = renderer.getBaseDimensions();
    const grassH = this.grassStartY;
    const cols = this.getTimeGradient();
    const grad = ctx.createLinearGradient(0, 0, 0, grassH);
    grad.addColorStop(0, cols.top);
    grad.addColorStop(0.6, cols.mid);
    grad.addColorStop(1, cols.bottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, grassH);
    void h;

    if (this.weather === 'cloudy' || this.weather === 'rain') {
      ctx.fillStyle = 'rgba(140, 140, 155, 0.28)';
      for (let i = 0; i < 6; i++) {
        const cx = (i * 140 + 60) % w;
        const cy = 44 + (i % 2) * 34;
        ctx.beginPath();
        ctx.arc(cx, cy, 38, 0, Math.PI * 2);
        ctx.arc(cx + 32, cy + 6, 30, 0, Math.PI * 2);
        ctx.arc(cx - 30, cy + 10, 28, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const sp = this.timeOfDay / 1440;
    if ((this.weather === 'sunny' || this.weather === 'snow') && sp > 0.18 && sp < 0.88) {
      const sunX = w * 0.12 + sp * w * 0.76;
      const sunY = 40 + Math.sin((sp - 0.18) / 0.7 * Math.PI) * 70 + 30;
      ctx.fillStyle = this.weather === 'sunny' ? '#FFE066' : '#F0F0F0';
      ctx.beginPath();
      ctx.arc(sunX, sunY, 20, 0, Math.PI * 2);
      ctx.fill();
      if (this.weather === 'sunny') {
        ctx.save();
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = '#FFE066';
        ctx.lineWidth = 2;
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(sunX + Math.cos(a) * 26, sunY + Math.sin(a) * 26);
          ctx.lineTo(sunX + Math.cos(a) * 34, sunY + Math.sin(a) * 34);
          ctx.stroke();
        }
        ctx.restore();
      }
    } else if (sp < 0.22 || sp > 0.82) {
      const moonX = w * 0.82;
      const moonY = 70;
      ctx.fillStyle = '#F8F8E8';
      ctx.beginPath();
      ctx.arc(moonX, moonY, 16, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private getTimeGradient(): { top: string; mid: string; bottom: string } {
    const t = this.timeOfDay / 1440;
    if (t < 0.2) return { top: '#0a1628', mid: '#1a2a4a', bottom: '#2a3a5a' };
    if (t < 0.32) { const p = (t - 0.2) / 0.12; return { top: this.mix('#0a1628', '#3c528a', p), mid: this.mix('#1a2a4a', '#f0975e', p), bottom: this.mix('#2a3a5a', '#fad1a6', p) }; }
    if (t < 0.46) return { top: '#3c528a', mid: '#f0975e', bottom: '#fad1a6' };
    if (t < 0.56) { const p = (t - 0.46) / 0.1; return { top: this.mix('#3c528a', '#5da5dc', p), mid: this.mix('#f0975e', '#8fd4f5', p), bottom: this.mix('#fad1a6', '#c6e8f5', p) }; }
    if (t < 0.74) return { top: '#5da5dc', mid: '#8fd4f5', bottom: '#c6e8f5' };
    if (t < 0.86) { const p = (t - 0.74) / 0.12; return { top: this.mix('#5da5dc', '#4e4274', p), mid: this.mix('#8fd4f5', '#ec7e58', p), bottom: this.mix('#c6e8f5', '#f5b694', p) }; }
    if (t < 0.94) { const p = (t - 0.86) / 0.08; return { top: this.mix('#4e4274', '#16253f', p), mid: this.mix('#ec7e58', '#2a3a5a', p), bottom: this.mix('#f5b694', '#2a3a5a', p) }; }
    return { top: '#16253f', mid: '#1a2a4a', bottom: '#2a3a5a' };
  }

  private mix(c1: string, c2: string, ratio: number): string {
    const n1 = parseInt(c1.replace('#', ''), 16);
    const n2 = parseInt(c2.replace('#', ''), 16);
    const r = Math.floor(((n1 >> 16) * (1 - ratio) + (n2 >> 16) * ratio));
    const g = Math.floor((((n1 >> 8) & 0xFF) * (1 - ratio) + ((n2 >> 8) & 0xFF) * ratio));
    const b = Math.floor(((n1 & 0xFF) * (1 - ratio) + ((n2 & 0xFF) * ratio)));
    return '#' + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
  }

  public drawFoods(renderer: Renderer): void {
    const ctx = renderer.getContext();
    for (const f of this.foods) {
      ctx.fillStyle = f.color;
      const s = f.size;
      const x = Math.floor(f.x - s / 2);
      const y = Math.floor(f.y - s / 2);
      const sd = this.shade(f.color, -0.25);

      switch (f.shape) {
        case 'square': {
          ctx.fillRect(x, y, s, s);
          ctx.fillStyle = sd;
          ctx.fillRect(x + s - 2, y, 2, s);
          ctx.fillRect(x, y + s - 2, s, 2);
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(x + 1, y + 1, 1, 1);
          break;
        }
        case 'circle': {
          const r = s / 2;
          for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
            if (dx * dx + dy * dy <= r * r + 0.5) {
              ctx.fillRect(Math.floor(f.x + dx), Math.floor(f.y + dy), 1, 1);
            }
          }
          ctx.fillStyle = sd;
          for (let dy = 0; dy <= r; dy++) for (let dx = 0; dx <= r; dx++) {
            if (dx * dx + dy * dy <= r * r + 0.5) {
              ctx.fillRect(Math.floor(f.x + dx), Math.floor(f.y + dy), 1, 1);
            }
          }
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(Math.floor(f.x - r / 2), Math.floor(f.y - r / 2), 1, 1);
          break;
        }
        case 'triangle': {
          for (let i = 0; i < s; i++) {
            const w = s - i;
            ctx.fillRect(Math.floor(f.x - w / 2), Math.floor(y + i), w, 1);
          }
          break;
        }
      }

      if (f.isDragging) {
        ctx.strokeStyle = '#F5D442';
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 3, y - 3, s + 6, s + 6);
      }
    }
  }

  private shade(hex: string, pct: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * pct * 100);
    const R = Math.max(0, Math.min(255, (num >> 16) + amt));
    const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amt));
    const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt));
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  }

  public getFoodAt(x: number, y: number): Food | null {
    for (let i = this.foods.length - 1; i >= 0; i--) {
      const f = this.foods[i];
      const dx = x - f.x, dy = y - f.y;
      if (dx * dx + dy * dy <= f.size * f.size) return f;
    }
    return null;
  }

  public removeFood(food: Food): void {
    const i = this.foods.indexOf(food);
    if (i >= 0) this.foods.splice(i, 1);
  }

  public getGrassStartY(): number { return this.grassStartY; }

  public getTimeIndicatorColor(): string {
    const t = this.timeOfDay / 1440;
    if (t < 0.25 || t > 0.9) return '#0a1628';
    if (t < 0.36) return '#e8956a';
    if (t < 0.74) return '#87CEEB';
    return '#e87858';
  }

  public getWeatherLabel(): string {
    switch (this.weather) {
      case 'sunny': return '☀️ 晴天';
      case 'cloudy': return '☁️ 阴天';
      case 'rain': return '🌧️ 小雨';
      case 'snow': return '❄️ 下雪';
    }
  }

  public getTimeText(): string {
    const h = Math.floor(this.timeOfDay / 60);
    const m = Math.floor(this.timeOfDay % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  public forceWeatherChange(nw: WeatherType): void {
    this.weather = nw;
    this.lastWeatherSwitchAt = Date.now();
  }
}
