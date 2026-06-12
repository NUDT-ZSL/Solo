export interface Building {
  id: string;
  type: 'residential' | 'commercial' | 'industrial' | 'road';
  x: number;
  y: number;
  level: number;
  height: number;
  isBuilding: boolean;
  buildProgress: number;
  isRepairing: boolean;
  isRuined: boolean;
  windows: { x: number; y: number; lit: boolean }[];
  congestion: number;
}

export interface Vehicle {
  id: string;
  x: number;
  y: number;
  color: string;
  speed: number;
  direction: number;
}

export interface GameStats {
  timeOfDay: number;
  day: number;
  population: number;
  money: number;
}

export interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: 'build' | 'firework' | 'explosion';
}

export interface Camera {
  offsetX: number;
  offsetY: number;
  zoom: number;
}

const TILE_WIDTH = 64;
const TILE_HEIGHT = 32;
const GRID_SIZE = 30;

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private camera: Camera = { offsetX: 0, offsetY: 0, zoom: 1 };
  private particles: Particle[] = [];
  private shakeTime: number = 0;
  private shakeIntensity: number = 0;
  private time: number = 0;
  private engine: any = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context');
    this.ctx = ctx;
    this.resize(canvas.width, canvas.height);
  }

  setEngine(engine: any): void {
    this.engine = engine;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.camera.offsetX = width / 2;
    this.camera.offsetY = height * 0.3;
  }

  gridToScreen(x: number, y: number, z: number = 0): { screenX: number; screenY: number } {
    const screenX = (x - y) * (TILE_WIDTH / 2) * this.camera.zoom + this.camera.offsetX;
    const screenY = (x + y) * (TILE_HEIGHT / 2) * this.camera.zoom + this.camera.offsetY - z * this.camera.zoom;
    return { screenX, screenY };
  }

  screenToGrid(screenX: number, screenY: number): { x: number; y: number } {
    const x = ((screenX - this.camera.offsetX) / (TILE_WIDTH / 2) / this.camera.zoom +
               (screenY - this.camera.offsetY) / (TILE_HEIGHT / 2) / this.camera.zoom) / 2;
    const y = ((screenY - this.camera.offsetY) / (TILE_HEIGHT / 2) / this.camera.zoom -
               (screenX - this.camera.offsetX) / (TILE_WIDTH / 2) / this.camera.zoom) / 2;
    return { x: Math.floor(x), y: Math.floor(y) };
  }

  addParticles(x: number, y: number, type: 'build' | 'firework', count: number): void {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= 500) break;
      
      if (type === 'build') {
        this.particles.push({
          x: x + (Math.random() - 0.5) * 0.5,
          y: y + (Math.random() - 0.5) * 0.5,
          z: 0,
          vx: (Math.random() - 0.5) * 0.02,
          vy: (Math.random() - 0.5) * 0.02,
          vz: 0.05 + Math.random() * 0.05,
          life: 1,
          maxLife: 1,
          color: '#ffffff',
          size: 2 + Math.random() * 2,
          type: 'build'
        });
      } else if (type === 'firework') {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.1 + Math.random() * 0.1;
        this.particles.push({
          x,
          y,
          z: 2 + Math.random() * 2,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          vz: 0.15 + Math.random() * 0.1,
          life: 1,
          maxLife: 1,
          color: `hsl(${Math.random() * 360}, 100%, 60%)`,
          size: 3 + Math.random() * 3,
          type: 'firework'
        });
      }
    }
  }

  shakeScreen(duration: number, intensity: number): void {
    this.shakeTime = duration;
    this.shakeIntensity = intensity;
  }

  render(): void {
    this.time += 1 / 60;

    if (this.shakeTime > 0) {
      this.shakeTime -= 1 / 60;
      const shakeX = (Math.random() - 0.5) * this.shakeIntensity;
      const shakeY = (Math.random() - 0.5) * this.shakeIntensity;
      this.ctx.save();
      this.ctx.translate(shakeX, shakeY);
    }

    this.drawSky();
    this.drawGround();

    if (this.engine) {
      const buildings: Building[] = this.engine.buildings || [];
      const vehicles: Vehicle[] = this.engine.vehicles || [];
      const stats: GameStats = this.engine.stats || { timeOfDay: 0.5, day: 1, population: 0, money: 0 };

      const sortedBuildings = [...buildings].sort((a, b) => (a.x + a.y) - (b.x + b.y));

      for (const building of sortedBuildings) {
        this.drawBuildingShadow(building, stats.timeOfDay);
      }

      for (const building of sortedBuildings) {
        this.drawBuilding(building, stats.timeOfDay);
      }

      for (const vehicle of vehicles) {
        this.drawVehicle(vehicle);
      }

      if (this.engine.previewBuilding) {
        this.drawPreview(this.engine.previewBuilding);
      }
    }

    this.updateAndDrawParticles();

    if (this.shakeTime > 0) {
      this.ctx.restore();
    }
  }

  private drawSky(): void {
    const stats = this.engine?.stats || { timeOfDay: 0.5 };
    const t = stats.timeOfDay;

    let topColor: string;
    let bottomColor: string;

    if (t < 0.25) {
      topColor = this.lerpColor('#0a0a1a', '#1a1a3a', t * 4);
      bottomColor = this.lerpColor('#000005', '#1a1a2e', t * 4);
    } else if (t < 0.5) {
      topColor = this.lerpColor('#1a1a3a', '#87CEEB', (t - 0.25) * 4);
      bottomColor = this.lerpColor('#1a1a2e', '#FFE4B5', (t - 0.25) * 4);
    } else if (t < 0.75) {
      topColor = this.lerpColor('#87CEEB', '#FF8C69', (t - 0.5) * 4);
      bottomColor = this.lerpColor('#FFE4B5', '#FFD700', (t - 0.5) * 4);
    } else {
      topColor = this.lerpColor('#FF8C69', '#0a0a1a', (t - 0.75) * 4);
      bottomColor = this.lerpColor('#FFD700', '#000005', (t - 0.75) * 4);
    }

    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, topColor);
    gradient.addColorStop(1, bottomColor);
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);

    if (t > 0.8 || t < 0.2) {
      this.ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 50; i++) {
        const sx = (i * 137.5) % this.width;
        const sy = (i * 97.3) % (this.height * 0.6);
        const twinkle = Math.sin(this.time * 2 + i) * 0.5 + 0.5;
        this.ctx.globalAlpha = twinkle * 0.8;
        this.ctx.beginPath();
        this.ctx.arc(sx, sy, 1, 0, Math.PI * 2);
        this.ctx.fill();
      }
      this.ctx.globalAlpha = 1;
    }
  }

  private lerpColor(color1: string, color2: string, t: number): string {
    const r1 = parseInt(color1.slice(1, 3), 16);
    const g1 = parseInt(color1.slice(3, 5), 16);
    const b1 = parseInt(color1.slice(5, 7), 16);
    const r2 = parseInt(color2.slice(1, 3), 16);
    const g2 = parseInt(color2.slice(3, 5), 16);
    const b2 = parseInt(color2.slice(5, 7), 16);

    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  private drawGround(): void {
    const stats = this.engine?.stats || { timeOfDay: 0.5 };
    const isNight = stats.timeOfDay > 0.8 || stats.timeOfDay < 0.2;

    const groundColor = isNight ? '#1a3d1a' : '#3d8b3d';

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const { screenX, screenY } = this.gridToScreen(x, y);
        
        this.ctx.beginPath();
        this.ctx.moveTo(screenX, screenY);
        this.ctx.lineTo(screenX + TILE_WIDTH / 2 * this.camera.zoom, screenY + TILE_HEIGHT / 2 * this.camera.zoom);
        this.ctx.lineTo(screenX, screenY + TILE_HEIGHT * this.camera.zoom);
        this.ctx.lineTo(screenX - TILE_WIDTH / 2 * this.camera.zoom, screenY + TILE_HEIGHT / 2 * this.camera.zoom);
        this.ctx.closePath();

        const shade = ((x + y) % 2 === 0) ? 0 : -10;
        this.ctx.fillStyle = this.adjustColor(groundColor, shade);
        this.ctx.fill();
        this.ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        this.ctx.lineWidth = 0.5;
        this.ctx.stroke();
      }
    }
  }

  private adjustColor(color: string, amount: number): string {
    const r = Math.max(0, Math.min(255, parseInt(color.slice(1, 3), 16) + amount));
    const g = Math.max(0, Math.min(255, parseInt(color.slice(3, 5), 16) + amount));
    const b = Math.max(0, Math.min(255, parseInt(color.slice(5, 7), 16) + amount));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  private drawBuildingShadow(building: Building, timeOfDay: number): void {
    if (building.type === 'road') return;
    if (building.isRuined) return;

    const shadowAngle = timeOfDay * Math.PI * 2 - Math.PI / 2;
    const shadowLength = Math.abs(Math.sin(timeOfDay * Math.PI)) * 3 + 0.5;

    const { screenX, screenY } = this.gridToScreen(building.x, building.y);
    const height = building.height * TILE_HEIGHT * this.camera.zoom;

    const shadowOffsetX = Math.cos(shadowAngle) * shadowLength * 20;
    const shadowOffsetY = Math.sin(shadowAngle) * shadowLength * 10;

    this.ctx.save();
    this.ctx.globalAlpha = 0.3;
    this.ctx.fillStyle = '#000000';

    const w = TILE_WIDTH / 2 * this.camera.zoom;
    const h = TILE_HEIGHT / 2 * this.camera.zoom;

    this.ctx.beginPath();
    this.ctx.moveTo(screenX + shadowOffsetX, screenY - height + shadowOffsetY);
    this.ctx.lineTo(screenX + w + shadowOffsetX, screenY + h - height + shadowOffsetY);
    this.ctx.lineTo(screenX + w + shadowOffsetX, screenY + h + shadowOffsetY);
    this.ctx.lineTo(screenX + shadowOffsetX, screenY + shadowOffsetY);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.moveTo(screenX + shadowOffsetX, screenY - height + shadowOffsetY);
    this.ctx.lineTo(screenX - w + shadowOffsetX, screenY + h - height + shadowOffsetY);
    this.ctx.lineTo(screenX - w + shadowOffsetX, screenY + h + shadowOffsetY);
    this.ctx.lineTo(screenX + shadowOffsetX, screenY + shadowOffsetY);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.restore();
  }

  private drawBuilding(building: Building, timeOfDay: number): void {
    if (building.type === 'road') {
      this.drawRoad(building);
      return;
    }

    if (building.isRuined) {
      this.drawRuins(building);
      return;
    }

    const { screenX, screenY } = this.gridToScreen(building.x, building.y);
    const baseHeight = building.height * TILE_HEIGHT * this.camera.zoom;
    let height = baseHeight;

    if (building.isBuilding) {
      height = baseHeight * building.buildProgress;
    }

    const w = TILE_WIDTH / 2 * this.camera.zoom;
    const h = TILE_HEIGHT / 2 * this.camera.zoom;

    const colors = this.getBuildingColors(building.type);

    if (building.isRepairing) {
      const flash = Math.sin(this.time * Math.PI * 2) * 0.3 + 0.7;
      this.ctx.globalAlpha = flash * 0.6;
    }

    if (building.isBuilding) {
      this.drawBuildingSkeleton(building, screenX, screenY, height, w, h, colors);
    } else {
      this.drawBuildingBody(building, screenX, screenY, height, w, h, colors);
    }

    if (!building.isBuilding && !building.isRuined) {
      this.drawWindows(building, screenX, screenY, height, w, h, timeOfDay);
    }

    if (building.type === 'commercial' && building.congestion > 0.5) {
      this.drawCongestionGlow(building, screenX, screenY, height);
    }

    this.ctx.globalAlpha = 1;
  }

  private getBuildingColors(type: string): { top: string; left: string; right: string } {
    switch (type) {
      case 'residential':
        return { top: '#FFD700', left: '#DAA520', right: '#B8860B' };
      case 'commercial':
        return { top: '#87CEEB', left: '#5F9EA0', right: '#4682B4' };
      case 'industrial':
        return { top: '#696969', left: '#505050', right: '#383838' };
      default:
        return { top: '#888888', left: '#666666', right: '#444444' };
    }
  }

  private drawBuildingBody(
    building: Building,
    screenX: number,
    screenY: number,
    height: number,
    w: number,
    h: number,
    colors: { top: string; left: string; right: string }
  ): void {
    this.ctx.beginPath();
    this.ctx.moveTo(screenX, screenY - height);
    this.ctx.lineTo(screenX + w, screenY + h - height);
    this.ctx.lineTo(screenX + w, screenY + h);
    this.ctx.lineTo(screenX, screenY);
    this.ctx.closePath();
    this.ctx.fillStyle = colors.right;
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.moveTo(screenX, screenY - height);
    this.ctx.lineTo(screenX - w, screenY + h - height);
    this.ctx.lineTo(screenX - w, screenY + h);
    this.ctx.lineTo(screenX, screenY);
    this.ctx.closePath();
    this.ctx.fillStyle = colors.left;
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.moveTo(screenX, screenY - height);
    this.ctx.lineTo(screenX + w, screenY + h - height);
    this.ctx.lineTo(screenX, screenY + TILE_HEIGHT * this.camera.zoom - height);
    this.ctx.lineTo(screenX - w, screenY + h - height);
    this.ctx.closePath();
    this.ctx.fillStyle = colors.top;
    this.ctx.fill();

    this.ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    this.ctx.lineWidth = 0.5;
    this.ctx.stroke();
  }

  private drawBuildingSkeleton(
    building: Building,
    screenX: number,
    screenY: number,
    height: number,
    w: number,
    h: number,
    colors: { top: string; left: string; right: string }
  ): void {
    const floors = Math.floor(building.buildProgress * building.level);

    for (let i = 0; i < floors; i++) {
      const floorHeight = (i + 1) * (baseHeight / building.level);
      const y = screenY - floorHeight;
      const prevY = screenY - i * (baseHeight / building.level);

      this.ctx.globalAlpha = 0.8;

      this.ctx.beginPath();
      this.ctx.moveTo(screenX, y);
      this.ctx.lineTo(screenX + w, y + h);
      this.ctx.lineTo(screenX + w, prevY + h);
      this.ctx.lineTo(screenX, prevY);
      this.ctx.closePath();
      this.ctx.fillStyle = colors.right;
      this.ctx.fill();

      this.ctx.beginPath();
      this.ctx.moveTo(screenX, y);
      this.ctx.lineTo(screenX - w, y + h);
      this.ctx.lineTo(screenX - w, prevY + h);
      this.ctx.lineTo(screenX, prevY);
      this.ctx.closePath();
      this.ctx.fillStyle = colors.left;
      this.ctx.fill();

      this.ctx.beginPath();
      this.ctx.moveTo(screenX, y);
      this.ctx.lineTo(screenX + w, y + h);
      this.ctx.lineTo(screenX, y + TILE_HEIGHT * this.camera.zoom);
      this.ctx.lineTo(screenX - w, y + h);
      this.ctx.closePath();
      this.ctx.fillStyle = colors.top;
      this.ctx.fill();
    }

    this.ctx.globalAlpha = 1;
  }

  private drawWindows(
    building: Building,
    screenX: number,
    screenY: number,
    height: number,
    w: number,
    h: number,
    timeOfDay: number
  ): void {
    const isNight = timeOfDay > 0.8 || timeOfDay < 0.2;
    if (!isNight) return;

    const windowRows = Math.max(1, Math.floor(building.height / 10));
    const