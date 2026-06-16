export type ElementType = 'fire' | 'ice' | 'thunder' | 'wind' | 'earth' | 'water' | 'light' | 'dark' | 'nature' | 'metal' | 'spirit' | 'poison';
export type PlantElement = 'fire' | 'ice' | 'thunder';

export const ELEMENT_COLORS: Record<ElementType, string> = {
  fire: '#ff6b6b',
  ice: '#48dbfb',
  thunder: '#feca57',
  wind: '#1dd1a1',
  earth: '#8b7355',
  water: '#54a0ff',
  light: '#ffeaa7',
  dark: '#636e72',
  nature: '#00b894',
  metal: '#b2bec3',
  spirit: '#a29bfe',
  poison: '#6c5ce7'
};

export const ELEMENT_NAMES: Record<ElementType, string> = {
  fire: '火焰',
  ice: '冰霜',
  thunder: '雷电',
  wind: '疾风',
  earth: '大地',
  water: '流水',
  light: '光明',
  dark: '暗影',
  nature: '自然',
  metal: '金属',
  spirit: '精神',
  poison: '剧毒'
};

export const ALL_ELEMENTS: ElementType[] = ['fire', 'ice', 'thunder', 'wind', 'earth', 'water', 'light', 'dark', 'nature', 'metal', 'spirit', 'poison'];
export const PLANT_ELEMENTS: PlantElement[] = ['fire', 'ice', 'thunder'];

export const PLANT_CONFIG: Record<PlantElement, { growthTime: number; manaRadius: number }> = {
  fire: { growthTime: 3000, manaRadius: 35 },
  ice: { growthTime: 6000, manaRadius: 40 },
  thunder: { growthTime: 10000, manaRadius: 50 }
};

let idCounter = 0;
const generateId = (): string => `${Date.now()}-${++idCounter}`;

export class Plant {
  id: string;
  element: PlantElement;
  x: number;
  y: number;
  gridX: number;
  gridY: number;
  growthProgress: number;
  growthTime: number;
  manaRadius: number;
  color: string;
  plantedAt: number;
  scale: number;
  targetScale: number;

  constructor(gridX: number, gridY: number, element: PlantElement, cellSize: number) {
    this.id = generateId();
    this.element = element;
    this.gridX = gridX;
    this.gridY = gridY;
    this.x = gridX * cellSize + cellSize / 2;
    this.y = gridY * cellSize + cellSize / 2;
    this.growthProgress = 0;
    this.growthTime = PLANT_CONFIG[element].growthTime;
    this.manaRadius = PLANT_CONFIG[element].manaRadius;
    this.color = ELEMENT_COLORS[element];
    this.plantedAt = performance.now();
    this.scale = 0;
    this.targetScale = 1;
  }

  update(deltaTime: number): boolean {
    if (this.growthProgress < 1) {
      this.growthProgress = Math.min(1, this.growthProgress + deltaTime / this.growthTime);
    }
    if (this.scale < this.targetScale) {
      const elastic = 0.08 + (this.targetScale - this.scale) * 0.1;
      this.scale = Math.min(this.targetScale, this.scale + elastic);
    }
    return this.growthProgress >= 1;
  }

  isFullyGrown(): boolean {
    return this.growthProgress >= 1;
  }
}

export class Sprite {
  id: string;
  element: ElementType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  baseSpeed: number;
  size: { w: number; h: number };
  color: string;
  feedCount: number;
  level: number;
  isEvolved: boolean;
  isMutated: boolean;
  stayTimer: number;
  flashTimer: number;
  scale: number;
  targetScale: number;
  targetAngle: number;
  currentAngle: number;
  sparkTimer: number;

  constructor(x: number, y: number, element: ElementType, speed?: number) {
    this.id = generateId();
    this.element = element;
    this.x = x;
    this.y = y;
    this.baseSpeed = speed ?? (40 + Math.random() * 40);
    this.speed = this.baseSpeed;
    this.size = { w: 16, h: 24 };
    this.color = ELEMENT_COLORS[element];
    this.feedCount = 0;
    this.level = 1;
    this.isEvolved = false;
    this.isMutated = false;
    this.stayTimer = 0;
    this.flashTimer = 0;
    this.scale = 1;
    this.targetScale = 1;
    this.targetAngle = Math.random() * Math.PI * 2;
    this.currentAngle = this.targetAngle;
    this.sparkTimer = 0;
    this.vx = Math.cos(this.currentAngle) * this.speed;
    this.vy = Math.sin(this.currentAngle) * this.speed;
  }

  update(deltaTime: number, gardenWidth: number, gardenHeight: number): void {
    if (this.stayTimer > 0) {
      this.stayTimer -= deltaTime;
      this.sparkTimer -= deltaTime;
      if (this.sparkTimer <= 0) {
        this.sparkTimer = 200;
      }
    } else {
      if (Math.random() < 0.02) {
        this.targetAngle += (Math.random() - 0.5) * Math.PI / 3;
      }

      const margin = 20;
      if (this.x < margin) {
        this.targetAngle = Math.atan2(this.vy, Math.abs(this.vx));
      } else if (this.x > gardenWidth - margin) {
        this.targetAngle = Math.atan2(this.vy, -Math.abs(this.vx));
      }
      if (this.y < margin) {
        this.targetAngle = Math.atan2(Math.abs(this.vy), this.vx);
      } else if (this.y > gardenHeight - margin) {
        this.targetAngle = Math.atan2(-Math.abs(this.vy), this.vx);
      }

      let angleDiff = this.targetAngle - this.currentAngle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      const maxTurn = Math.PI / 6;
      angleDiff = Math.max(-maxTurn, Math.min(maxTurn, angleDiff));
      this.currentAngle += angleDiff * 0.1;

      this.vx = Math.cos(this.currentAngle) * this.speed;
      this.vy = Math.sin(this.currentAngle) * this.speed;

      this.x += this.vx * deltaTime / 1000;
      this.y += this.vy * deltaTime / 1000;
    }

    if (this.flashTimer > 0) {
      this.flashTimer -= deltaTime;
    }

    if (this.scale !== this.targetScale) {
      this.scale += (this.targetScale - this.scale) * 0.15;
      if (Math.abs(this.scale - this.targetScale) < 0.01) {
        this.scale = this.targetScale;
      }
    }
  }

  stay(duration: number): void {
    this.stayTimer = duration;
    this.sparkTimer = 0;
  }

  feed(): boolean {
    this.feedCount++;
    this.targetScale = 1.3;
    this.flashTimer = 600;
    this.level = Math.floor(this.feedCount / 3) + 1;
    return this.feedCount >= 3;
  }

  shouldEmitSpark(): boolean {
    return this.stayTimer > 0 && this.sparkTimer <= 0;
  }

  resetSparkTimer(): void {
    this.sparkTimer = 200;
  }

  isFlashing(): boolean {
    return this.flashTimer > 0 && Math.floor(this.flashTimer / 150) % 2 === 0;
  }

  evolve(): [Sprite, Sprite] {
    const normalChild = new Sprite(this.x, this.y, this.element, this.baseSpeed * 1.15);
    normalChild.isEvolved = true;
    normalChild.level = this.level + 1;
    normalChild.targetScale = 1;

    const otherElements = ALL_ELEMENTS.filter(e => e !== this.element);
    const mutatedElement = otherElements[Math.floor(Math.random() * otherElements.length)];
    const mutatedChild = new Sprite(this.x + 20, this.y, mutatedElement, this.baseSpeed * 1.15);
    mutatedChild.isEvolved = true;
    mutatedChild.isMutated = true;
    mutatedChild.level = this.level + 1;
    mutatedChild.targetScale = 1;

    return [normalChild, mutatedChild];
  }
}

export class Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: 'spark' | 'repel';

  constructor(x: number, y: number, color: string, type: 'spark' | 'repel' = 'spark') {
    this.id = generateId();
    this.x = x;
    this.y = y;
    this.color = color;
    this.type = type;
    this.maxLife = type === 'spark' ? 800 : 500;
    this.life = this.maxLife;
    this.size = type === 'spark' ? (2 + Math.random() * 3) : 5;

    const angle = Math.random() * Math.PI * 2;
    const speed = type === 'spark' ? (30 + Math.random() * 50) : 0;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }

  update(deltaTime: number): boolean {
    this.life -= deltaTime;
    this.x += this.vx * deltaTime / 1000;
    this.y += this.vy * deltaTime / 1000;
    this.vy += 20 * deltaTime / 1000;
    return this.life > 0;
  }

  getAlpha(): number {
    return this.life / this.maxLife;
  }
}

export class Ripple {
  id: string;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  color: string;

  constructor(x: number, y: number, maxRadius: number, color: string) {
    this.id = generateId();
    this.x = x;
    this.y = y;
    this.radius = 0;
    this.maxRadius = maxRadius;
    this.maxLife = 1500;
    this.life = this.maxLife;
    this.color = color;
  }

  update(deltaTime: number): boolean {
    this.life -= deltaTime;
    this.radius = this.maxRadius * (1 - this.life / this.maxLife);
    return this.life > 0;
  }

  getAlpha(): number {
    return (this.life / this.maxLife) * 0.6;
  }
}

export interface GameState {
  plants: Plant[];
  sprites: Sprite[];
  particles: Particle[];
  ripples: Ripple[];
  gridSize: number;
  cellSize: number;
  gardenWidth: number;
  gardenHeight: number;
  selectedPlantElement: PlantElement;
  selectedSprite: Sprite | null;
  isDragging: boolean;
  dragOffset: { x: number; y: number };
  mouseX: number;
  mouseY: number;
  totalPlanted: number;
  lastSpriteSpawn: number;
  spriteSpawnInterval: number;
}
