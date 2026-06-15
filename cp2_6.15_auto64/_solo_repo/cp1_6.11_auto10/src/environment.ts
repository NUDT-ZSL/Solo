import type { Renderer } from './renderer';

export type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'snowy';

export interface Food {
  id: number;
  x: number;
  y: number;
  pixelSize: number;
  shape: number;
  color: string;
  shapeData: (string | null)[][];
  eaten: boolean;
}

interface WeatherParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  life: number;
}

const WARM_COLORS = [
  '#FF6B6B', '#FFA07A', '#FFD93D', '#FF8C42',
  '#FF5252', '#FFA726', '#FFB74D', '#FFCC80',
  '#FF8A65', '#FF7043', '#F44336', '#FFC107',
];

const SHAPE_TYPES = 4;

export class Environment {
  private sceneWidth: number;
  private sceneHeight: number;
  private groundY: number;

  private grassTiles: Map<string, { base: string; shade: string; tint: number }> = new Map();
  private grassTileSize: number = 16;
  private frameCount: number = 0;

  private timeOfDayMinutes: number = 12 * 60;
  private timeSpeed: number = 0.5;

  private weather: WeatherType = 'sunny';
  private weatherTimer: number = 0;
  private weatherSwitchInterval: number = 30 * 60;
  private weatherParticles: WeatherParticle[] = [];

  private foods: Food[] = [];
  private foodSpawnTimer: number = 0;
  private foodSpawnInterval: number = 5;
  private maxFoods: number = 5;
  private foodIdCounter: number = 0;

  private skyColors: { morning: string; day: string; evening: string; night: string } = {
    morning: '#FF8C42',
    day: '#4A90A4',
    evening: '#FF6B6B',
    night: '#1B2838',
  };

  constructor(sceneWidth: number, sceneHeight: number, groundY: number) {
    this.sceneWidth = sceneWidth;
    this.sceneHeight = sceneHeight;
    this.groundY = groundY;
    this.initializeGrassTiles();
  }

  private initializeGrassTiles(): void {
    const cols = Math.ceil(this.sceneWidth / this.grassTileSize);
    const rows = Math.ceil((this.sceneHeight - this.groundY) / this.grassTileSize);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const key = `${r}_${c}`;
        const baseGreen = this.generateGreen();
        this.grassTiles.set(key, {
          base: baseGreen,
          shade: this.darkenColor(baseGreen, 0.85),
          tint: Math.random(),
        });
      }
    }
  }

  private generateGreen(): string {
    const greens = ['#4A7C59', '#5A8C69', '#3F6B49', '#6A9C79', '#457052'];
    return greens[Math.floor(Math.random() * greens.length)];
  }

  private darkenColor(color: string, factor: number): string {
    const hex = color.replace('#', '');
    const r = Math.floor(parseInt(hex.slice(0, 2), 16) * factor);
    const g = Math.floor(parseInt(hex.slice(2, 4), 16) * factor);
    const b = Math.floor(parseInt(hex.slice(4, 6), 16) * factor);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  private lightenColor(color: string, factor: number): string {
    const hex = color.replace('#', '');
    const r = Math.min(255, Math.floor(parseInt(hex.slice(0, 2), 16) * (2 - factor) + 255 * (factor - 1)));
    const g = Math.min(255, Math.floor(parseInt(hex.slice(2, 4), 16) * (2 - factor) + 255 * (factor - 1)));
    const b = Math.min(255, Math.floor(parseInt(hex.slice(4, 6), 16) * (2 - factor) + 255 * (factor - 1)));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  update(deltaTime: number): void {
    this.frameCount++;
    this.timeOfDayMinutes += this.timeSpeed * deltaTime;
    this.timeOfDayMinutes = this.timeOfDayMinutes % (24 * 60);

    this.weatherTimer += deltaTime;
    if (this.weatherTimer >= this.weatherSwitchInterval) {
      this.weatherTimer = 0;
      this.switchWeather();
    }

    this.updateWeatherParticles(deltaTime);

    this.foodSpawnTimer += deltaTime;
    if (this.foodSpawnTimer >= this.foodSpawnInterval && this.foods.length < this.maxFoods) {
      this.foodSpawnTimer = 0;
      this.spawnFood();
    }
  }

  private switchWeather(): void {
    const weathers: WeatherType[] = ['sunny', 'cloudy', 'rainy', 'snowy'];
    let newWeather: WeatherType;
    do {
      newWeather = weathers[Math.floor(Math.random() * weathers.length)];
    } while (newWeather === this.weather && weathers.length > 1);
    this.weather = newWeather;
    this.weatherParticles = [];
  }

  setWeather(weather: WeatherType): void {
    this.weather = weather;
    this.weatherTimer = 0;
    this.weatherParticles = [];
  }

  private updateWeatherParticles(deltaTime: number): void {
    if (this.weather === 'sunny') return;

    const targetCount = this.weather === 'cloudy' ? 30 : this.weather === 'rainy' ? 80 : 60;

    while (this.weatherParticles.length < targetCount) {
      this.weatherParticles.push(this.createWeatherParticle());
    }

    for (let i = this.weatherParticles.length - 1; i >= 0; i--) {
      const p = this.weatherParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= deltaTime;

      if (p.y > this.sceneHeight || p.life <= 0) {
        this.weatherParticles[i] = this.createWeatherParticle(true);
      }
    }
  }

  private createWeatherParticle(fromTop: boolean = false): WeatherParticle {
    if (this.weather === 'cloudy') {
      return {
        x: Math.random() * this.sceneWidth,
        y: fromTop ? -10 : Math.random() * this.sceneHeight * 0.6,
        vx: 0.3 + Math.random() * 0.3,
        vy: 0.05 + Math.random() * 0.1,
        size: 4 + Math.floor(Math.random() * 5),
        alpha: 0.15 + Math.random() * 0.2,
        color: '#808080',
        life: 10 + Math.random() * 10,
      };
    } else if (this.weather === 'rainy') {
      return {
        x: Math.random() * this.sceneWidth,
        y: fromTop ? -5 : Math.random() * this.sceneHeight,
        vx: -0.5 + Math.random() * 0.3,
        vy: 8 + Math.random() * 4,
        size: 2,
        alpha: 0.7 + Math.random() * 0.3,
        color: '#64B5F6',
        life: 5,
      };
    } else {
      return {
        x: Math.random() * this.sceneWidth,
        y: fromTop ? -5 : Math.random() * this.sceneHeight,
        vx: -0.5 + Math.random(),
        vy: 1 + Math.random() * 2,
        size: 2 + Math.floor(Math.random() * 2),
        alpha: 0.8 + Math.random() * 0.2,
        color: '#FFFFFF',
        life: 10,
      };
    }
  }

  draw(renderer: Renderer): void {
    this.drawSky(renderer);
    this.drawGround(renderer);
    this.drawGrass(renderer);
    this.drawWeatherParticles(renderer);
    this.drawFoods(renderer);
    this.drawTimeIndicator(renderer);
  }

  private drawSky(renderer: Renderer): void {
    const skyColor = this.getCurrentSkyColor();
    const ctx = (renderer as any).ctx as CanvasRenderingContext2D;

    const gradient = ctx.createLinearGradient(0, 0, 0, this.groundY);
    gradient.addColorStop(0, this.darkenColor(skyColor, 0.7));
    gradient.addColorStop(0.5, skyColor);
    gradient.addColorStop(1, this.lightenColor(skyColor, 1.1));

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.sceneWidth, this.groundY);
  }

  private getCurrentSkyColor(): string {
    const t = this.timeOfDayMinutes;

    if (t >= 6 * 60 && t < 10 * 60) {
      const f = (t - 6 * 60) / (4 * 60);
      return this.lerpColor(this.skyColors.night, this.skyColors.morning, f);
    } else if (t >= 10 * 60 && t < 16 * 60) {
      const f = (t - 10 * 60) / (6 * 60);
      return this.lerpColor(this.skyColors.morning, this.skyColors.day, f);
    } else if (t >= 16 * 60 && t < 20 * 60) {
      const f = (t - 16 * 60) / (4 * 60);
      return this.lerpColor(this.skyColors.day, this.skyColors.evening, f);
    } else {
      let normalizedT: number;
      if (t >= 20 * 60) {
        normalizedT = (t - 20 * 60) / (10 * 60);
      } else {
        normalizedT = (t + 4 * 60) / (10 * 60);
      }
      return this.lerpColor(this.skyColors.evening, this.skyColors.night, Math.min(1, normalizedT));
    }
  }

  private lerpColor(c1: string, c2: string, t: number): string {
    const h1 = c1.replace('#', '');
    const h2 = c2.replace('#', '');
    const r1 = parseInt(h1.slice(0, 2), 16);
    const g1 = parseInt(h1.slice(2, 4), 16);
    const b1 = parseInt(h1.slice(4, 6), 16);
    const r2 = parseInt(h2.slice(0, 2), 16);
    const g2 = parseInt(h2.slice(2, 4), 16);
    const b2 = parseInt(h2.slice(4, 6), 16);

    const r = Math.floor(r1 + (r2 - r1) * t);
    const g = Math.floor(g1 + (g2 - g1) * t);
    const b = Math.floor(b1 + (b2 - b1) * t);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  private drawGround(renderer: Renderer): void {
    renderer.drawRect(0, this.groundY, this.sceneWidth, this.sceneHeight - this.groundY, '#3D5A47');
    renderer.drawRect(0, this.groundY, this.sceneWidth, 4, '#5A8C69');
  }

  private drawGrass(renderer: Renderer): void {
    const cols = Math.ceil(this.sceneWidth / this.grassTileSize);
    const rows = Math.ceil((this.sceneHeight - this.groundY) / this.grassTileSize);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const key = `${r}_${c}`;
        const tile = this.grassTiles.get(key)!;
        const x = c * this.grassTileSize;
        const y = this.groundY + r * this.grassTileSize;

        const breathe = Math.sin((this.frameCount + tile.tint * 100) / 60) * 0.5 + 0.5;
        const color = this.lerpColor(tile.base, tile.shade, breathe);

        this.drawGrassTile(renderer, x, y, color, tile.shade, c, r);
      }
    }
  }

  private drawGrassTile(
    renderer: Renderer,
    x: number,
    y: number,
    base: string,
    shade: string,
    tileX: number,
    tileY: number
  ): void {
    const s = 4;
    const pattern = (tileX * 7 + tileY * 13) % 4;

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        let color = base;

        const isBlade = ((r + c + pattern) % 5 === 0) && r === 0;
        const isShade = ((r + c) % 7 === pattern % 7) || r === 3;

        if (isBlade) color = this.lightenColor(base, 1.2);
        else if (isShade) color = shade;

        renderer.drawPixel(x + c * s, y + r * s, color, s);
      }
    }
  }

  private drawWeatherParticles(renderer: Renderer): void {
    const ctx = (renderer as any).ctx as CanvasRenderingContext2D;

    for (const p of this.weatherParticles) {
      ctx.globalAlpha = p.alpha;
      if (this.weather === 'rainy') {
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size * 3);
      } else {
        renderer.drawPixel(p.x, p.y, p.color, p.size);
      }
    }
    ctx.globalAlpha = 1;
  }

  private drawTimeIndicator(renderer: Renderer): void {
    const hours = Math.floor(this.timeOfDayMinutes / 60);
    const minutes = Math.floor(this.timeOfDayMinutes % 60);
    const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    const weatherIcons: Record<WeatherType, string> = {
      sunny: '☀',
      cloudy: '☁',
      rainy: '🌧',
      snowy: '❄',
    };

    renderer.drawText(`${weatherIcons[this.weather]} ${timeStr}`, 12, 28, '#F5D442', 10);
  }

  private spawnFood(): void {
    const pixelSize = 2;
    const shape = Math.floor(Math.random() * SHAPE_TYPES);
    const color = WARM_COLORS[Math.floor(Math.random() * WARM_COLORS.length)];
    const shapeData = this.generateFoodShape(shape, color);

    const foodWidth = shapeData[0].length * pixelSize;
    const foodHeight = shapeData.length * pixelSize;

    const food: Food = {
      id: this.foodIdCounter++,
      x: 30 + Math.random() * (this.sceneWidth - 60 - foodWidth),
      y: this.groundY - foodHeight - Math.random() * 20,
      pixelSize,
      shape,
      color,
      shapeData,
      eaten: false,
    };

    this.foods.push(food);
  }

  private generateFoodShape(shape: number, color: string): (string | null)[][] {
    const dark = this.darkenColor(color, 0.7);
    const light = this.lightenColor(color, 1.2);
    const C = color;
    const D = dark;
    const L = light;
    const S = '#5D4037';
    const G = '#66BB6A';
    const N: string | null = null;

    switch (shape) {
      case 0:
        return [
          [N, N, S, S, N, N],
          [N, S, G, G, S, N],
          [N, C, C, C, C, N],
          [C, C, L, C, C, D],
          [C, L, C, C, D, D],
          [N, C, C, D, D, N],
          [N, N, D, D, N, N],
        ];
      case 1:
        return [
          [N, N, L, L, N, N],
          [N, L, L, C, C, N],
          [L, C, C, C, C, C],
          [C, C, C, L, C, C],
          [C, L, C, C, C, D],
          [N, C, C, D, D, N],
          [N, N, D, D, N, N],
        ];
      case 2:
        return [
          [N, L, L, L, L, N],
          [L, C, C, C, C, L],
          [L, C, S, C, C, C],
          [L, C, C, C, L, C],
          [L, C, L, C, C, C],
          [N, C, C, C, D, N],
          [N, N, D, D, N, N],
        ];
      case 3:
        return [
          [N, N, S, N, N, N, N],
          [N, N, G, N, L, L, N],
          [N, L, L, L, L, C, L],
          [L, L, C, C, C, C, L],
          [L, C, C, L, C, C, C],
          [N, C, C, C, C, D, N],
          [N, N, D, D, D, N, N],
        ];
      default:
        return [[C]];
    }
  }

  private drawFoods(renderer: Renderer): void {
    for (const food of this.foods) {
      if (food.eaten) continue;
      renderer.drawPixelMatrix(food.shapeData, food.x, food.y, food.pixelSize);
    }
  }

  getFoodAt(x: number, y: number): Food | null {
    for (const food of this.foods) {
      if (food.eaten) continue;
      const w = food.shapeData[0].length * food.pixelSize;
      const h = food.shapeData.length * food.pixelSize;
      if (x >= food.x && x <= food.x + w && y >= food.y && y <= food.y + h) {
        return food;
      }
    }
    return null;
  }

  removeFood(food: Food): void {
    food.eaten = true;
    const idx = this.foods.indexOf(food);
    if (idx > -1) {
      this.foods.splice(idx, 1);
    }
  }

  getFoods(): Food[] {
    return this.foods.filter(f => !f.eaten);
  }

  getWeather(): WeatherType {
    return this.weather;
  }

  getGroundY(): number {
    return this.groundY;
  }

  getTimeString(): string {
    const hours = Math.floor(this.timeOfDayMinutes / 60);
    const minutes = Math.floor(this.timeOfDayMinutes % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
}
