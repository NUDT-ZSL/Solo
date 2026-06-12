import type { Building, Vehicle, GameStats, Particle, Camera } from './types';

const TILE_WIDTH = 64;
const TILE_HEIGHT = 32;
const SHADOW_COEFFICIENT = 0.8;
const MAX_PARTICLES_PER_BUILDING = 50;

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
  private lastTime: number = 0;
  private engine: any = null;
  private previewBuilding: { x: number; y: number; type: string } | null = null;
  private buildingParticleCounts: Map<string, number> = new Map();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context');
    this.ctx = ctx;
    this.resize(canvas.width, canvas.height);
    this.lastTime = performance.now();
  }

  setEngine(engine: any): void {
    this.engine = engine;
  }

  setPreview(building: { x: number; y: number; type: string } | null): void {
    this.previewBuilding = building;
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
    const adjustedX = screenX - this.camera.offsetX;
    const adjustedY = screenY - this.camera.offsetY;
    const halfTileW = (TILE_WIDTH / 2) * this.camera.zoom;
    const halfTileH = (TILE_HEIGHT / 2) * this.camera.zoom;
    const x = (adjustedX / halfTileW + adjustedY / halfTileH) / 2;
    const y = (adjustedY / halfTileH - adjustedX / halfTileW) / 2;
    return { x: Math.floor(x), y: Math.floor(y) };
  }

  addParticles(x: number, y: number, type: 'build' | 'firework', count: number): void {
    const key = `${x},${y}`;
    const currentCount = this.buildingParticleCounts.get(key) || 0;
    const availableSlots = MAX_PARTICLES_PER_BUILDING - currentCount;
    const actualCount = Math.min(count, availableSlots);

    for (let i = 0; i < actualCount; i++) {
      if (this.particles.length >= 1000) break;

      if (type === 'build') {
        this.particles.push({
          x: x + (Math.random() - 0.5) * 0.6,
          y: y + (Math.random() - 0.5) * 0.6,
          z: 0,
          vx: (Math.random() - 0.5) * 0.03,
          vy: (Math.random() - 0.5) * 0.03,
          vz: 0.08 + Math.random() * 0.08,
          life: 1.5,
          maxLife: 1.5,
          color: '#ffffff',
          size: 2 + Math.random() * 3,
          type: 'build'
        });
      } else if (type === 'firework') {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.08 + Math.random() * 0.12;
        this.particles.push({
          x,
          y,
          z: 3 + Math.random() * 3,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          vz: 0.12 + Math.random() * 0.15,
          life: 2,
          maxLife: 2,
          color: `hsl(${Math.random() * 360}, 100%, 60%)`,
          size: 3 + Math.random() * 4,
          type: 'firework'
        });
      }
    }

    this.buildingParticleCounts.set(key, currentCount + actualCount);
  }

  shakeScreen(duration: number, intensity: number): void {
    this.shakeTime = duration;
    this.shakeIntensity = intensity;
  }

  render(): void {
    const now = performance.now();
    const deltaTime = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;
    this.time += deltaTime;

    this.ctx.save();

    if (this.shakeTime > 0) {
      this.shakeTime -= deltaTime;
      const shakeX = (Math.random() - 0.5) * this.shakeIntensity;
      const shakeY = (Math.random() - 0.5) * this.shakeIntensity;
      this.ctx.translate(shakeX, shakeY);
    }

    this.drawSky();
    this.drawGround();

    if (this.engine) {
      const grid: Building[][] = this.engine.getGrid() || [];
      const vehicles: Vehicle[] = this.engine.getVehicles() || [];
      const sunAngle: number = this.engine.getSunAngle() || 0;
      const timeHours: number = this.engine.getTimeOfDay() || 12;
      const congestedRoads = this.engine.getCongestedRoads() || [];

      const congestedSet = new Set(congestedRoads.map((r: { x: number; y: number }) => `${r.x},${r.y}`));

      const buildings: Building[] = [];
      for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[y].length; x++) {
          const building = grid[y][x];
          if (building.type !== 'empty') {
            buildings.push(building);
          }
        }
      }

      const sortedBuildings = [...buildings].sort((a, b) => (a.x + a.y) - (b.x + b.y));

      for (const building of sortedBuildings) {
        this.drawBuildingShadow(building, sunAngle);
      }

      for (const building of sortedBuildings) {
        this.drawBuilding(building, sunAngle, timeHours);
      }

      for (const building of sortedBuildings) {
        if (building.type !== 'road' && building.state === 'normal') {
          const neighbors = this.getNeighboringRoads(building, grid);
          for (const neighbor of neighbors) {
            if (congestedSet.has(`${neighbor.x},${neighbor.y}`)) {
              this.drawCongestionGlow(building);
              break;
            }
          }
        }
      }

      for (const vehicle of vehicles) {
        this.drawVehicle(vehicle);
      }
    }

    if (this.previewBuilding) {
      this.drawPreview();
    }

    this.updateParticles(deltaTime);
    this.drawParticles();

    this.ctx.restore();
  }

  private getNeighboringRoads(building: Building, grid: Building[][]): { x: number; y: number }[] {
    const directions = [
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 },
    ];
    const roads: { x: number; y: number }[] = [];
    for (const dir of directions) {
      const nx = building.x + dir.dx;
      const ny = building.y + dir.dy;
      if (nx >= 0 && ny >= 0 && ny < grid.length && nx < grid[0].length) {
        if (grid[ny][nx].type === 'road') {
          roads.push({ x: nx, y: ny });
        }
      }
    }
    return roads;
  }

  private drawSky(): void {
    const timeHours = this.engine?.getTimeOfDay?.() ?? 12;
    const isDay = timeHours >= 6 && timeHours < 18;

    let topColor: string;
    let bottomColor: string;

    if (isDay) {
      const dayProgress = (timeHours - 6) / 12;
      if (dayProgress < 0.25) {
        const t = dayProgress / 0.25;
        topColor = this.lerpColor('#4a90c2', '#87CEEB', t);
        bottomColor = this.lerpColor('#ff8c42', '#ffe4b5', t);
      } else if (dayProgress < 0.75) {
        const t = (dayProgress - 0.25) / 0.5;
        topColor = this.lerpColor('#87CEEB', '#6bb3d9', t);
        bottomColor = this.lerpColor('#ffe4b5', '#b0e0e6', t);
      } else {
        const t = (dayProgress - 0.75) / 0.25;
        topColor = this.lerpColor('#6bb3d9', '#4a90c2', t);
        bottomColor = this.lerpColor('#b0e0e6', '#ff8c42', t);
      }
    } else {
      let nightProgress: number;
      if (timeHours >= 18) {
        nightProgress = (timeHours - 18) / 12;
      } else {
        nightProgress = (timeHours + 6) / 12;
      }
      if (nightProgress < 0.5) {
        const t = nightProgress / 0.5;
        topColor = this.lerpColor('#1a237e', '#0a0a1a', t);
        bottomColor = this.lerpColor('#3f51b5', '#000005', t);
      } else {
        const t = (nightProgress - 0.5) / 0.5;
        topColor = this.lerpColor('#0a0a1a', '#1a237e', t);
        bottomColor = this.lerpColor('#000005', '#3f51b5', t);
      }
    }

    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, topColor);
    gradient.addColorStop(1, bottomColor);
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);

    if (!isDay) {
      this.ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 80; i++) {
        const sx = (i * 137.508) % this.width;
        const sy = (i * 97.314) % (this.height * 0.7);
        const twinkle = Math.sin(this.time * 3 + i * 0.7) * 0.5 + 0.5;
        this.ctx.globalAlpha = twinkle * 0.9;
        this.ctx.beginPath();
        this.ctx.arc(sx, sy, 1 + twinkle * 0.5, 0, Math.PI * 2);
        this.ctx.fill();
      }
      this.ctx.globalAlpha = 1;
    }

    if (isDay) {
      const sunAngle = this.engine?.getSunAngle?.() ?? Math.PI / 2;
      const sunX = this.width * 0.2 + Math.cos(sunAngle - Math.PI / 2) * this.width * 0.6;
      const sunY = this.height * 0.1 + (1 - Math.sin(sunAngle)) * this.height * 0.5;
      const sunRadius = 30 + Math.sin(sunAngle) * 10;

      const sunGlow = this.ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunRadius * 3);
      sunGlow.addColorStop(0, 'rgba(255, 236, 179, 0.8)');
      sunGlow.addColorStop(0.5, 'rgba(255, 193, 7, 0.3)');
      sunGlow.addColorStop(1, 'rgba(255, 193, 7, 0)');
      this.ctx.fillStyle = sunGlow;
      this.ctx.fillRect(sunX - sunRadius * 3, sunY - sunRadius * 3, sunRadius * 6, sunRadius * 6);

      this.ctx.fillStyle = '#FFD700';
      this.ctx.beginPath();
      this.ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawGround(): void {
    const timeHours = this.engine?.getTimeOfDay?.() ?? 12;
    const isNight = timeHours < 6 || timeHours >= 18;
    const grid = this.engine?.getGrid?.() || [];

    const groundColor = isNight ? '#1a3d1a' : '#3d8b3d';

    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < (grid[y]?.length || 0); x++) {
        const { screenX, screenY } = this.gridToScreen(x, y);

        this.ctx.beginPath();
        this.ctx.moveTo(screenX, screenY);
        this.ctx.lineTo(screenX + TILE_WIDTH / 2 * this.camera.zoom, screenY + TILE_HEIGHT / 2 * this.camera.zoom);
        this.ctx.lineTo(screenX, screenY + TILE_HEIGHT * this.camera.zoom);
        this.ctx.lineTo(screenX - TILE_WIDTH / 2 * this.camera.zoom, screenY + TILE_HEIGHT / 2 * this.camera.zoom);
        this.ctx.closePath();

        const shade = ((x + y) % 2 === 0) ? 0 : -15;
        this.ctx.fillStyle = this.adjustColor(groundColor, shade);
        this.ctx.fill();
        this.ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        this.ctx.lineWidth = 0.5;
        this.ctx.stroke();
      }
    }
  }

  private drawBuildingShadow(building: Building, sunAngle: number): void {
    if (building.type === 'road') return;
    if (building.state === 'ruin') {
      this.drawRuinsShadow(building, sunAngle);
      return;
    }

    const { screenX, screenY } = this.gridToScreen(building.x, building.y);
    let height = building.height * TILE_HEIGHT * this.camera.zoom;

    if (building.state === 'constructing') {
      height = height * building.constructProgress;
    }

    const shadowLength = Math.max(0, building.height * Math.sin(sunAngle)) * SHADOW_COEFFICIENT * this.camera.zoom;
    const shadowDirX = Math.cos(sunAngle - Math.PI / 2) * shadowLength;
    const shadowDirY = Math.sin(sunAngle - Math.PI / 2) * shadowLength * 0.5;

    const w = TILE_WIDTH / 2 * this.camera.zoom;
    const h = TILE_HEIGHT / 2 * this.camera.zoom;

    this.ctx.save();
    this.ctx.globalAlpha = 0.35;
    this.ctx.fillStyle = '#000000';

    this.ctx.beginPath();
    this.ctx.moveTo(screenX + w, screenY + h);
    this.ctx.lineTo(screenX + w + shadowDirX, screenY + h + shadowDirY);
    this.ctx.lineTo(screenX + w + shadowDirX, screenY + h - height + shadowDirY);
    this.ctx.lineTo(screenX + w, screenY + h - height);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.moveTo(screenX - w, screenY + h);
    this.ctx.lineTo(screenX - w + shadowDirX, screenY + h + shadowDirY);
    this.ctx.lineTo(screenX - w + shadowDirX, screenY + h - height + shadowDirY);
    this.ctx.lineTo(screenX - w, screenY + h - height);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.moveTo(screenX + w, screenY + h - height);
    this.ctx.lineTo(screenX + w + shadowDirX, screenY + h - height + shadowDirY);
    this.ctx.lineTo(screenX + shadowDirX, screenY - height + shadowDirY);
    this.ctx.lineTo(screenX, screenY - height);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.moveTo(screenX - w, screenY + h - height);
    this.ctx.lineTo(screenX - w + shadowDirX, screenY + h - height + shadowDirY);
    this.ctx.lineTo(screenX + shadowDirX, screenY - height + shadowDirY);
    this.ctx.lineTo(screenX, screenY - height);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.restore();
  }

  private drawRuinsShadow(building: Building, sunAngle: number): void {
    const { screenX, screenY } = this.gridToScreen(building.x, building.y);
    const height = building.height * TILE_HEIGHT * this.camera.zoom * 0.4;
    const shadowLength = Math.max(0, building.height * 0.4 * Math.sin(sunAngle)) * SHADOW_COEFFICIENT * this.camera.zoom;
    const shadowDirX = Math.cos(sunAngle - Math.PI / 2) * shadowLength;
    const shadowDirY = Math.sin(sunAngle - Math.PI / 2) * shadowLength * 0.5;

    const w = TILE_WIDTH / 2 * this.camera.zoom;
    const h = TILE_HEIGHT / 2 * this.camera.zoom;

    this.ctx.save();
    this.ctx.globalAlpha = 0.25;
    this.ctx.fillStyle = '#000000';

    this.ctx.beginPath();
    this.ctx.moveTo(screenX + w, screenY + h);
    this.ctx.lineTo(screenX + w + shadowDirX, screenY + h + shadowDirY);
    this.ctx.lineTo(screenX + w + shadowDirX, screenY + h - height + shadowDirY);
    this.ctx.lineTo(screenX + w, screenY + h - height);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.moveTo(screenX - w, screenY + h);
    this.ctx.lineTo(screenX - w + shadowDirX, screenY + h + shadowDirY);
    this.ctx.lineTo(screenX - w + shadowDirX, screenY + h - height + shadowDirY);
    this.ctx.lineTo(screenX - w, screenY + h - height);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.restore();
  }

  private drawBuilding(building: Building, sunAngle: number, timeHours: number): void {
    if (building.type === 'road') {
      this.drawRoad(building);
      return;
    }

    if (building.state === 'ruin') {
      this.drawRuins(building);
      return;
    }

    const { screenX, screenY } = this.gridToScreen(building.x, building.y);
    const baseHeight = building.height * TILE_HEIGHT * this.camera.zoom;
    let height = baseHeight;

    if (building.state === 'constructing') {
      height = baseHeight * building.constructProgress;
    }

    const w = TILE_WIDTH / 2 * this.camera.zoom;
    const h = TILE_HEIGHT / 2 * this.camera.zoom;

    const colors = this.getBuildingColors(building.type, building.level);

    if (building.state === 'repairing') {
      const flash = Math.sin(this.time * Math.PI * 2) * 0.3 + 0.7;
      this.ctx.globalAlpha = flash * 0.6;
    }

    if (building.state === 'constructing') {
      this.drawConstructingBuilding(building, screenX, screenY, baseHeight, w, h, colors);
    } else {
      this.drawBuildingBody(building, screenX, screenY, height, w, h, colors);
    }

    if (building.state !== 'constructing' && building.state !== 'ruin') {
      this.drawWindows(building, timeHours < 6 || timeHours >= 18);
    }

    this.ctx.globalAlpha = 1;
  }

  private getBuildingColors(type: string, level: number): { top: string; left: string; right: string } {
    const levelAdjust = (level - 1) * 8;
    switch (type) {
      case 'residential':
        return {
          top: this.adjustColor('#FFD700', levelAdjust),
          left: this.adjustColor('#DAA520', levelAdjust),
          right: this.adjustColor('#B8860B', levelAdjust)
        };
      case 'commercial':
        return {
          top: this.adjustColor('#87CEEB', levelAdjust),
          left: this.adjustColor('#5F9EA0', levelAdjust),
          right: this.adjustColor('#4682B4', levelAdjust)
        };
      case 'industrial':
        return {
          top: this.adjustColor('#808080', levelAdjust),
          left: this.adjustColor('#696969', levelAdjust),
          right: this.adjustColor('#505050', levelAdjust)
        };
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

  private drawConstructingBuilding(
    building: Building,
    screenX: number,
    screenY: number,
    baseHeight: number,
    w: number,
    h: number,
    colors: { top: string; left: string; right: string }
  ): void {
    const progress = building.constructProgress;
    const floors = building.height;
    const floorHeight = baseHeight / floors;
    const completedFloors = Math.floor(progress * floors);
    const currentFloorProgress = (progress * floors) - completedFloors;

    for (let i = 0; i < completedFloors; i++) {
      const floorY = screenY - (i + 1) * floorHeight;
      const prevY = screenY - i * floorHeight;

      this.ctx.globalAlpha = 0.85;

      this.ctx.beginPath();
      this.ctx.moveTo(screenX, floorY);
      this.ctx.lineTo(screenX + w, floorY + h);
      this.ctx.lineTo(screenX + w, prevY + h);
      this.ctx.lineTo(screenX, prevY);
      this.ctx.closePath();
      this.ctx.fillStyle = colors.right;
      this.ctx.fill();

      this.ctx.beginPath();
      this.ctx.moveTo(screenX, floorY);
      this.ctx.lineTo(screenX - w, floorY + h);
      this.ctx.lineTo(screenX - w, prevY + h);
      this.ctx.lineTo(screenX, prevY);
      this.ctx.closePath();
      this.ctx.fillStyle = colors.left;
      this.ctx.fill();

      this.ctx.beginPath();
      this.ctx.moveTo(screenX, floorY);
      this.ctx.lineTo(screenX + w, floorY + h);
      this.ctx.lineTo(screenX, floorY + TILE_HEIGHT * this.camera.zoom);
      this.ctx.lineTo(screenX - w, floorY + h);
      this.ctx.closePath();
      this.ctx.fillStyle = colors.top;
      this.ctx.fill();
    }

    if (currentFloorProgress > 0 && completedFloors < floors) {
      const currentHeight = floorHeight * currentFloorProgress;
      const floorY = screenY - completedFloors * floorHeight - currentHeight;
      const prevY = screenY - completedFloors * floorHeight;

      this.ctx.globalAlpha = 0.6;

      this.ctx.beginPath();
      this.ctx.moveTo(screenX, floorY);
      this.ctx.lineTo(screenX + w, floorY + h * currentFloorProgress);
      this.ctx.lineTo(screenX + w, prevY + h);
      this.ctx.lineTo(screenX, prevY);
      this.ctx.closePath();
      this.ctx.fillStyle = colors.right;
      this.ctx.fill();

      this.ctx.beginPath();
      this.ctx.moveTo(screenX, floorY);
      this.ctx.lineTo(screenX - w, floorY + h * currentFloorProgress);
      this.ctx.lineTo(screenX - w, prevY + h);
      this.ctx.lineTo(screenX, prevY);
      this.ctx.closePath();
      this.ctx.fillStyle = colors.left;
      this.ctx.fill();
    }

    this.ctx.globalAlpha = 1;
  }

  private drawWindows(building: Building, isNight: boolean): void {
    if (!isNight || !building.windowsLit) return;

    const { screenX, screenY } = this.gridToScreen(building.x, building.y);
    const height = building.height * TILE_HEIGHT * this.camera.zoom;
    const w = TILE_WIDTH / 2 * this.camera.zoom;
    const h = TILE_HEIGHT / 2 * this.camera.zoom;

    const windowRows = Math.max(1, Math.floor(building.height));
    const windowCols = 2;
    const windowWidth = w * 0.25;
    const windowHeight = h * 0.3;

    this.ctx.fillStyle = '#FFE66D';
    this.ctx.shadowColor = '#FFE66D';
    this.ctx.shadowBlur = 5;

    for (let row = 0; row < windowRows; row++) {
      for (let col = 0; col < windowCols; col++) {
        const windowY = screenY - (row + 1) * (height / windowRows) + (height / windowRows) * 0.3;
        const windowXRight = screenX + w * 0.3 + col * w * 0.35;
        const windowXLeft = screenX - w * 0.55 + col * w * 0.35;

        this.ctx.fillRect(windowXRight - windowWidth / 2, windowY - windowHeight / 2, windowWidth, windowHeight);
        this.ctx.fillRect(windowXLeft - windowWidth / 2, windowY - windowHeight / 2, windowWidth, windowHeight);
      }
    }

    this.ctx.shadowBlur = 0;
  }

  private drawRoad(building: Building): void {
    const { screenX, screenY } = this.gridToScreen(building.x, building.y);
    const w = TILE_WIDTH / 2 * this.camera.zoom;
    const h = TILE_HEIGHT / 2 * this.camera.zoom;

    const roadColor = building.level >= 2 ? '#4a4a4a' : '#666666';

    this.ctx.beginPath();
    this.ctx.moveTo(screenX, screenY);
    this.ctx.lineTo(screenX + w, screenY + h);
    this.ctx.lineTo(screenX, screenY + TILE_HEIGHT * this.camera.zoom);
    this.ctx.lineTo(screenX - w, screenY + h);
    this.ctx.closePath();
    this.ctx.fillStyle = roadColor;
    this.ctx.fill();
    this.ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    this.ctx.lineWidth = 0.5;
    this.ctx.stroke();

    if (building.level >= 2) {
      this.ctx.strokeStyle = '#FFD700';
      this.ctx.lineWidth = 1;
      this.ctx.setLineDash([3, 3]);
      this.ctx.beginPath();
      this.ctx.moveTo(screenX - w * 0.5, screenY + h * 0.5);
      this.ctx.lineTo(screenX + w * 0.5, screenY + h * 0.5);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }
  }

  private drawRuins(building: Building): void {
    const { screenX, screenY } = this.gridToScreen(building.x, building.y);
    const height = building.height * TILE_HEIGHT * this.camera.zoom * 0.4;
    const w = T