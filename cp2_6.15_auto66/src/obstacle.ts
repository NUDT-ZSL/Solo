import { Rect, checkCollision } from './player';
import { Scene } from './scene';

export type ObstacleType = 'low_block' | 'high_wall' | 'saw' | 'boost';

export interface Obstacle {
  type: ObstacleType;
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  lane: number;
  active: boolean;
  rotation: number;
  direction: number;
  passed: boolean;
  glowPhase: number;
}

interface ObjectPool<T> {
  pool: T[];
  create: () => T;
  reset: (obj: T) => void;
  acquire: () => T;
  release: (obj: T) => void;
}

function createObstaclePool(): ObjectPool<Obstacle> {
  const pool: Obstacle[] = [];
  
  const create = (): Obstacle => ({
    type: 'low_block',
    x: 0,
    y: 0,
    z: 0,
    width: 0,
    height: 0,
    lane: 0,
    active: false,
    rotation: 0,
    direction: 1,
    passed: false,
    glowPhase: 0,
  });
  
  const reset = (obj: Obstacle): void => {
    obj.active = false;
    obj.passed = false;
    obj.rotation = 0;
    obj.direction = 1;
    obj.glowPhase = 0;
  };
  
  const acquire = (): Obstacle => {
    return pool.pop() || create();
  };
  
  const release = (obj: Obstacle): void => {
    reset(obj);
    pool.push(obj);
  };
  
  return { pool, create, reset, acquire, release };
}

export class ObstacleManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private scene: Scene;
  private pool: ObjectPool<Obstacle>;
  private obstacles: Obstacle[] = [];
  private boostPads: Obstacle[] = [];
  
  private spawnTimer: number = 0;
  private minSpawnInterval: number = 1500;
  private maxSpawnInterval: number = 4000;
  private nextSpawnTime: number = 2000;
  
  private boostSpawnTimer: number = 0;
  private boostSpawnInterval: number = 8000;
  
  private sawMoveRange: number = 150;
  private sawMoveSpeed: number = 100;

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, scene: Scene) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.scene = scene;
    this.pool = createObstaclePool();
  }

  private getObstacleDimensions(type: ObstacleType): { width: number; height: number } {
    switch (type) {
      case 'low_block':
        return { width: 50, height: 30 };
      case 'high_wall':
        return { width: 60, height: 80 };
      case 'saw':
        return { width: 40, height: 40 };
      case 'boost':
        return { width: 120, height: 20 };
      default:
        return { width: 50, height: 50 };
    }
  }

  private getRandomObstacleType(): ObstacleType {
    const rand = Math.random();
    if (rand < 0.4) return 'low_block';
    if (rand < 0.7) return 'high_wall';
    return 'saw';
  }

  spawnObstacle(): void {
    const type = this.getRandomObstacleType();
    const dims = this.getObstacleDimensions(type);
    const lane = Math.floor(Math.random() * 3) - 1;
    const laneX = this.scene.getLaneX(lane);
    
    const obstacle = this.pool.acquire();
    obstacle.type = type;
    obstacle.x = laneX;
    obstacle.y = this.canvas.height * 0.75 - dims.height / 2;
    obstacle.z = 1500;
    obstacle.width = dims.width;
    obstacle.height = dims.height;
    obstacle.lane = lane;
    obstacle.active = true;
    obstacle.rotation = 0;
    obstacle.direction = Math.random() > 0.5 ? 1 : -1;
    
    this.obstacles.push(obstacle);
  }

  spawnBoostPad(): void {
    const lane = Math.floor(Math.random() * 3) - 1;
    const laneX = this.scene.getLaneX(lane);
    const dims = this.getObstacleDimensions('boost');
    
    const boost = this.pool.acquire();
    boost.type = 'boost';
    boost.x = laneX;
    boost.y = this.canvas.height * 0.75 + dims.height / 2;
    boost.z = 1500;
    boost.width = dims.width;
    boost.height = dims.height;
    boost.lane = lane;
    boost.active = true;
    boost.glowPhase = 0;
    
    this.boostPads.push(boost);
  }

  update(deltaTime: number, speed: number, _currentTime: number): void {
    this.spawnTimer += deltaTime;
    if (this.spawnTimer >= this.nextSpawnTime) {
      this.spawnObstacle();
      this.spawnTimer = 0;
      this.nextSpawnTime = this.minSpawnInterval + 
        Math.random() * (this.maxSpawnInterval - this.minSpawnInterval);
    }
    
    this.boostSpawnTimer += deltaTime;
    if (this.boostSpawnTimer >= this.boostSpawnInterval) {
      this.spawnBoostPad();
      this.boostSpawnTimer = 0;
    }
    
    const moveSpeed = speed * deltaTime * 0.001;
    
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.z -= moveSpeed;
      
      if (obs.type === 'saw') {
        obs.rotation += deltaTime * 0.005;
        obs.x += obs.direction * this.sawMoveSpeed * deltaTime * 0.001;
        
        const minX = this.scene.getLaneX(-1) - this.sawMoveRange / 2;
        const maxX = this.scene.getLaneX(1) + this.sawMoveRange / 2;
        if (obs.x < minX || obs.x > maxX) {
          obs.direction *= -1;
        }
      }
      
      if (obs.z < -100) {
        this.pool.release(obs);
        this.obstacles.splice(i, 1);
      }
    }
    
    for (let i = this.boostPads.length - 1; i >= 0; i--) {
      const boost = this.boostPads[i];
      boost.z -= moveSpeed;
      boost.glowPhase += deltaTime * 0.005;
      
      if (boost.z < -100) {
        this.pool.release(boost);
        this.boostPads.splice(i, 1);
      }
    }
  }

  render(): void {
    const allObjects = [...this.boostPads, ...this.obstacles];
    allObjects.sort((a, b) => b.z - a.z);
    
    for (const obj of allObjects) {
      if (!obj.active) continue;
      this.renderObstacle(obj);
    }
  }

  private renderObstacle(obs: Obstacle): void {
    const projected = this.scene.project3D(obs.x, obs.y, obs.z);
    const scale = projected.scale;
    const scaledWidth = obs.width * scale;
    const scaledHeight = obs.height * scale;
    
    if (scale < 0.01) return;
    
    this.ctx.save();
    
    switch (obs.type) {
      case 'low_block':
        this.renderLowBlock(obs, projected.x, projected.y, scaledWidth, scaledHeight, scale);
        break;
      case 'high_wall':
        this.renderHighWall(obs, projected.x, projected.y, scaledWidth, scaledHeight, scale);
        break;
      case 'saw':
        this.renderSaw(obs, projected.x, projected.y, scaledWidth, scaledHeight, scale);
        break;
      case 'boost':
        this.renderBoostPad(obs, projected.x, projected.y, scaledWidth, scaledHeight, scale);
        break;
    }
    
    this.ctx.restore();
  }

  private renderLowBlock(
    _obs: Obstacle,
    x: number,
    y: number,
    width: number,
    height: number,
    scale: number
  ): void {
    this.ctx.shadowColor = '#e53935';
    this.ctx.shadowBlur = 15 * scale;
    
    const gradient = this.ctx.createLinearGradient(
      x - width / 2,
      y - height / 2,
      x + width / 2,
      y + height / 2
    );
    gradient.addColorStop(0, '#ff6659');
    gradient.addColorStop(1, '#e53935');
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(x - width / 2, y - height / 2, width, height);
    
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    this.ctx.fillRect(x - width / 2, y - height / 2, width, height * 0.3);
    
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.lineWidth = 2 * scale;
    this.ctx.strokeRect(x - width / 2, y - height / 2, width, height);
  }

  private renderHighWall(
    _obs: Obstacle,
    x: number,
    y: number,
    width: number,
    height: number,
    scale: number
  ): void {
    this.ctx.shadowColor = '#6a1b9a';
    this.ctx.shadowBlur = 20 * scale;
    
    const gradient = this.ctx.createLinearGradient(
      x,
      y - height / 2,
      x,
      y + height / 2
    );
    gradient.addColorStop(0, '#9c27b0');
    gradient.addColorStop(1, '#6a1b9a');
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(x - width / 2, y - height / 2, width, height);
    
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    this.ctx.fillRect(x - width / 2, y - height / 2, width * 0.3, height);
    
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.lineWidth = 2 * scale;
    this.ctx.strokeRect(x - width / 2, y - height / 2, width, height);
  }

  private renderSaw(
    obs: Obstacle,
    x: number,
    y: number,
    width: number,
    _height: number,
    scale: number
  ): void {
    this.ctx.translate(x, y);
    this.ctx.rotate(obs.rotation);
    
    this.ctx.shadowColor = '#ff5722';
    this.ctx.shadowBlur = 25 * scale;
    
    this.ctx.beginPath();
    const sides = 6;
    const radius = width / 2;
    for (let i = 0; i < sides; i++) {
      const angle = (i * Math.PI * 2) / sides - Math.PI / 2;
      const px = Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius;
      if (i === 0) {
        this.ctx.moveTo(px, py);
      } else {
        this.ctx.lineTo(px, py);
      }
    }
    this.ctx.closePath();
    
    const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    gradient.addColorStop(0, '#ff8a65');
    gradient.addColorStop(1, '#ff5722');
    
    this.ctx.fillStyle = gradient;
    this.ctx.fill();
    
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2 * scale;
    this.ctx.stroke();
    
    this.ctx.beginPath();
    this.ctx.arc(0, 0, radius * 0.3, 0, Math.PI * 2);
    this.ctx.fillStyle = '#333333';
    this.ctx.fill();
    this.ctx.strokeStyle = '#666666';
    this.ctx.lineWidth = 2 * scale;
    this.ctx.stroke();
  }

  private renderBoostPad(
    obs: Obstacle,
    x: number,
    y: number,
    width: number,
    height: number,
    scale: number
  ): void {
    this.ctx.shadowColor = '#1e88e5';
    this.ctx.shadowBlur = 30 * scale;
    
    const gradient = this.ctx.createLinearGradient(
      x - width / 2,
      y,
      x + width / 2,
      y
    );
    const glowIntensity = (Math.sin(obs.glowPhase) + 1) / 2;
    gradient.addColorStop(0, `rgba(30, 136, 229, ${0.3 + glowIntensity * 0.4})`);
    gradient.addColorStop(0.5, `rgba(66, 165, 245, ${0.5 + glowIntensity * 0.3})`);
    gradient.addColorStop(1, `rgba(30, 136, 229, ${0.3 + glowIntensity * 0.4})`);
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(x - width / 2, y - height / 2, width, height);
    
    const arrowOffset = (obs.glowPhase * 20) % 40 - 20;
    this.ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + glowIntensity * 0.5})`;
    for (let i = 0; i < 3; i++) {
      const arrowX = x - width / 2 + width * 0.25 + i * width * 0.25 + arrowOffset * scale;
      this.drawArrow(arrowX, y, 8 * scale, 5 * scale);
    }
    
    this.ctx.strokeStyle = `rgba(255, 255, 255, ${0.6 + glowIntensity * 0.4})`;
    this.ctx.lineWidth = 2 * scale;
    this.ctx.strokeRect(x - width / 2, y - height / 2, width, height);
  }

  private drawArrow(x: number, y: number, width: number, height: number): void {
    this.ctx.beginPath();
    this.ctx.moveTo(x - width / 2, y);
    this.ctx.lineTo(x - width / 2 + height, y - height);
    this.ctx.lineTo(x - width / 2 + height, y - height / 2);
    this.ctx.lineTo(x + width / 2, y - height / 2);
    this.ctx.lineTo(x + width / 2, y + height / 2);
    this.ctx.lineTo(x - width / 2 + height, y + height / 2);
    this.ctx.lineTo(x - width / 2 + height, y + height);
    this.ctx.closePath();
    this.ctx.fill();
  }

  checkPlayerCollision(playerBox: Rect, playerLane: number, isJumping: boolean): { 
    hit: boolean; 
    type: ObstacleType | null;
    scoreGain: number;
    boost: boolean;
  } {
    let result = { hit: false, type: null as ObstacleType | null, scoreGain: 0, boost: false };
    
    for (const obs of this.obstacles) {
      if (!obs.active || obs.passed || obs.z > 100 || obs.z < -50) continue;
      
      const projected = this.scene.project3D(obs.x, obs.y, obs.z);
      const scale = projected.scale;
      
      const obstacleBox: Rect = {
        x: projected.x - (obs.width * scale) / 2,
        y: projected.y - (obs.height * scale) / 2,
        width: obs.width * scale,
        height: obs.height * scale,
      };
      
      if (checkCollision(playerBox, obstacleBox)) {
        if (obs.type === 'low_block' && isJumping) {
          if (!obs.passed) {
            obs.passed = true;
            result.scoreGain += 10;
          }
        } else if (obs.type === 'high_wall' && playerLane !== obs.lane) {
          if (!obs.passed) {
            obs.passed = true;
            result.scoreGain += 15;
          }
        } else {
          result.hit = true;
          result.type = obs.type;
          obs.passed = true;
        }
      } else if (obs.z < 0 && !obs.passed) {
        obs.passed = true;
        result.scoreGain += 5;
      }
    }
    
    for (const boost of this.boostPads) {
      if (!boost.active || boost.passed || boost.z > 100 || boost.z < -50) continue;
      
      const projected = this.scene.project3D(boost.x, boost.y, boost.z);
      const scale = projected.scale;
      
      const boostBox: Rect = {
        x: projected.x - (boost.width * scale) / 2,
        y: projected.y - (boost.height * scale) / 2,
        width: boost.width * scale,
        height: boost.height * scale,
      };
      
      if (checkCollision(playerBox, boostBox) && !isJumping) {
        boost.passed = true;
        result.boost = true;
        result.scoreGain += 20;
      }
    }
    
    return result;
  }

  reset(): void {
    for (const obs of this.obstacles) {
      this.pool.release(obs);
    }
    for (const boost of this.boostPads) {
      this.pool.release(boost);
    }
    this.obstacles = [];
    this.boostPads = [];
    this.spawnTimer = 0;
    this.boostSpawnTimer = 0;
    this.nextSpawnTime = 2000;
  }

  getActiveObstacles(): Readonly<Obstacle[]> {
    return this.obstacles;
  }

  getActiveBoostPads(): Readonly<Obstacle[]> {
    return this.boostPads;
  }
}
