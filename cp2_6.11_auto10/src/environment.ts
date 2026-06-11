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
  private grassTiles: { color: string; hueOffset: number; frameCounter: number }[][] = [];
  private grassCanvas: HTMLCanvasElement | null = null;
  private grassDirty: boolean = true;

  public timeOfDay: number = 8 * 60;
  public weather: WeatherType = 'sunny';
  private weatherTimer: number = 0;
  private weatherSwitchInterval: number = 30 * 60 * 1000;

  public foods: Food[] = [];
  private foodSpawnTimer: number = 0;
  private foodSpawnInterval: number = 3000;
  private maxFoods: number = 5;

  private warmColors = ['#FF6B6B', '#FFA94D', '#FFD93D', '#FF8C42', '#E25822', '#F5D442', '#FFBE76', '#FF7F50'];

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.grassStartY = Math.floor(height * 0.65);
    this.initGrassTiles();
    this.grassCanvas = document.createElement('canvas');
    this.grassCanvas.width = width;
    this.grassCanvas.height = height - this.grassStartY;
  }

  private initGrassTiles(): void {
    const cols = Math.ceil(this.width / this.grassTileSize);
    const rows = Math.ceil((this.height - this.grassStartY) / this.grassTileSize);
    const baseGreen = '#4A7C59';
    for (let r = 0; r < rows; r++) {
      const row: { color: string; hueOffset: number; frameCounter: number }[] = [];
      for (let c = 0; c < cols; c++) {
        const hueOff = (Math.random() - 0.5) * 0.15;
        row.push({
          color: baseGreen,
          hueOffset: hueOff,
          frameCounter: Math.floor(Math.random() * 60)
        });
      }
      this.grassTiles.push(row);
    }
  }

  public update(dt: number, renderer: Renderer, forceWeather: WeatherType | null = null): void {
    this.timeOfDay = (this.timeOfDay + dt / 400) % 1440;

    this.weatherTimer += dt;
    if (this.weatherTimer >= this.weatherSwitchInterval) {
      this.weatherTimer = 0;
      if (forceWeather) {
        this.weather = forceWeather;
      } else {
        const weathers: WeatherType[] = ['sunny', 'cloudy', 'rain', 'snow'];
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
        if (tile.frameCounter >= 1000) {
          tile.frameCounter = 0;
          tile.hueOffset = (Math.random() - 0.5) * 0.18;
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

    const baseGreen = '#4A7C59';
    const darkGreen = '#3A6349';
    const lightGreen = '#5A9C69';

    for (let r = 0; r < this.grassTiles.length; r++) {
      for (let c = 0; c < this.grassTiles[r].length; c++) {
        const tile = this.grassTiles[r][c];
        const x = c * this.grassTileSize;
        const y = r * this.grassTileSize;
        const shade = tile.hueOffset;
        let color = baseGreen;
        if (shade < -0.08) color = darkGreen;
        else if (shade > 0.08) color = lightGreen;
        ctx.fillStyle = color;
        ctx.fillRect(x, y, this.grassTileSize, this.grassTileSize);

        ctx.fillStyle = shade > 0 ? lightGreen : darkGreen;
        for (let i = 0; i < 2; i++) {
          const gx = x + Math.floor(((c * 3 + i * 7) % this.grassTileSize));
          const gy = y + Math.floor(((r * 5 + i * 11) % this.grassTileSize));
          ctx.fillRect(gx, gy, 1, 2);
        }

        if ((c + r) % 5 === 0) {
          ctx.fillStyle = '#6AAF79';
          ctx.fillRect(x + 4, y + 12, 1, 3);
          ctx.fillRect(x + 5, y + 11, 1, 4);
          ctx.fillRect(x + 6, y + 12, 1, 3);
        }
      }
    }
  }

  private spawnFood(): void {
    const shapes: FoodShape[] = ['circle', 'square', 'triangle'];
    const margin = 40;
    const x = margin + Math.random() * (this.width - margin * 2);
    const y = this.grassStartY + 10 + Math.random() * (this.height - this.grassStartY - 40);

    this.foods.push({
      x, y,
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      color: this.warmColors[Math.floor(Math.random() * this.warmColors.length)],
      size: 8 + Math.floor(Math.random() * 4),
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

    const colors = this.getTimeGradientColors();
    const grad = ctx.createLinearGradient(0, 0, 0, grassH);
    grad.addColorStop(0, colors.top);
    grad.addColorStop(0.6, colors.mid);
    grad.addColorStop(1, colors.bottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, grassH);
    void h;

    if (this.weather === 'cloudy' || this.weather === 'rain') {
      ctx.fillStyle = 'rgba(150, 150, 160, 0.25)';
      for (let i = 0; i < 5; i++) {
        const cx = (i * 160 + 80) % w;
        const cy = 40 + (i % 2) * 30;
        ctx.beginPath();
        ctx.arc(cx, cy, 35, 0, Math.PI * 2);
        ctx.arc(cx + 30, cy + 5, 28, 0, Math.PI * 2);
        ctx.arc(cx - 28, cy + 8, 26, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (this.weather === 'sunny' || this.weather === 'snow') {
      const sunProgress = this.timeOfDay / 1440;
      if (sunProgress > 0.2 && sunProgress < 0.85) {
        const sunX = w * 0.15 + sunProgress * w * 0.7;
        const sunY = 30 + Math.sin((sunProgress - 0.2) * Math.PI) * 60 + 40;
        ctx.fillStyle = this.weather === 'sunny' ? '#FFE066' : '#E8E8E8';
        ctx.beginPath();
        ctx.arc(sunX, sunY, 18, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private getTimeGradientColors(): { top: string; mid: string; bottom: string } {
    const t = this.timeOfDay / 1440;
    if (t < 0.2) {
      return { top: '#0a1628', mid: '#1a2a4a', bottom: '#2a3a5a' };
    } else if (t < 0.3) {
      const p = (t - 0.2) / 0.1;
      return {
        top: this.mix('#0a1628', '#2c3e6e, p),
        mid: this.mix('#1a2a4a', '#e8956a, p),
        bottom: this.mix('#2a3a5a', '#f5c49a, p)
      };
    } else if (t < 0.45) {
      return { top: '#2c3e6e', mid: '#e8956a', bottom: '#f5c49a' };
    } else if (t < 0.55) {
      const p = (t - 0.45) / 0.1;
      return {
        top: this.mix('#2c3e6e', '#5a9fd4', p),
        mid: this.mix('#e8956a', '#87CEEB', p),
        bottom: this.mix('#f5c49a', '#b8e0f0, p)
      };
    } else if (t < 0.75) {
      return { top: '#5a9fd4', mid: '#87CEEB', bottom: '#b8e0f0' };
    } else if (t < 0.85) {
      const p = (t - 0.75) / 0.1;
      return {
        top: this.mix('#5a9fd4', '#4a3a6a', p),
        mid: this.mix('#87CEEB', '#e87858', p),
        bottom: this.mix('#b8e0f0', '#f5b080', p)
      };
    } else if (t < 0.92) {
      const p = (t - 0.85) / 0.07;
      return {
        top: this.mix('#4a3a6a', '#16243f', p),
        mid: this.mix('#e87858', '#2a3a5a', p),
        bottom: this.mix('#f5b080', '#2a3a5a', p)
      };
    } else {
      return { top: '#16243f', mid: '#1a2a4a', bottom: '#2a3a5a' };
    }
  }

  private mix(c1: string, c2: string, ratio: number): string {
    const n1 = parseInt(c1.replace('#', ''), 16);
    const n2 = parseInt(c2.replace('#', ''), 16);
    const r = Math.floor(((n1 >> 16) * (1 - ratio) + (n2 >> 16) * ratio);
    const g = Math.floor((((n1 >> 8) & 0xFF) * (1 - ratio) + ((n2 >> 8 & 0xFF) * ratio);
    const b = Math.floor(((n1 & 0xFF) * (1 - ratio) + ((n2 & 0xFF) * ratio);
    return '#' + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
  }

  public drawFoods(renderer: Renderer): void {
    const ctx = renderer.getContext();
    for (const food of this.foods) {
      ctx.fillStyle = food.color;
      const s = food.size;
      const x = Math.floor(food.x - s / 2);
      const y = Math.floor(food.y - s / 2);

      if (food.shape === 'square') {
        ctx.fillRect(x, y, s, s);
        ctx.fillStyle = this.shade(food.color, -0.25);
        ctx.fillRect(x + s - 2, y, 2, s);
        ctx.fillRect(x, y + s - 2, s, 2);
      } else if (food.shape === 'circle') {
        const r = s / 2;
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            if (dx * dx + dy * dy <= r * r + 0.5) {
              ctx.fillRect(Math.floor(food.x + dx), Math.floor(food.y + dy), 1, 1);
            }
          }
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(Math.floor(food.x - r / 2), Math.floor(food.y - r / 2), 1, 1);
      } else if (food.shape === 'triangle') {
        for (let i = 0; i < s; i++) {
          const w = s - i;
          ctx.fillRect(Math.floor(food.x - w / 2), Math.floor(y + i), w, 1);
        }
      }

      if (food.isDragging) {
        ctx.strokeStyle = '#F5D442';
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 2, y - 2, s + 4, s + 4);
      }
    }
  }

  private shade(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent * 100);
    const R = Math.max(0, Math.min(255, (num >> 16) + amt));
    const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amt));
    const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt));
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  }

  public getFoodAt(x: number, y: number): Food | null {
    for (let i = this.foods.length - 1; i >= 0; i--) {
      const f = this.foods[i];
      const dx = x - f.x;
      const dy = y - f.y;
      if (dx * dx + dy * dy <= (f.size * f.size)) {
        return f;
      }
    }
    return null;
  }

  public removeFood(food: Food): void {
    const idx = this.foods.indexOf(food);
    if (idx >= 0) {
      this.foods.splice(idx, 1);
    }
  }

  public getGrassStartY(): number {
    return this.grassStartY;
  }

  public getTimeIndicatorColor(): string {
    const t = this.timeOfDay / 1440;
    const hour = Math.floor(this.timeOfDay / 60);
    const min = Math.floor(this.timeOfDay % 60);
    void hour; void min;
    if (t < 0.25 || t > 0.9) return '#0a1628';
    if (t < 0.35) return '#e8956a';
    if (t < 0.75) return '#87CEEB';
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
    return `${h.toString().padStart(2, '0') + ':' + m.toString().padStart(2, '0');
  }

  public forceWeatherChange(newWeather: WeatherType): void {
    this.weather = newWeather;
    this.weatherTimer = 0;
  }
}
