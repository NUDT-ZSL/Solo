export type ToolType = 'square' | 'circle' | 'slope' | 'player' | 'enemy-red' | 'enemy-purple' | 'eraser';
export type BrushSize = 8 | 16 | 32;

export interface Vec2 {
  x: number;
  y: number;
}

export interface TerrainBlock {
  id: string;
  type: 'square' | 'circle' | 'slope';
  x: number;
  y: number;
  width: number;
  height: number;
  slopeDirection?: 'left' | 'right';
  flashTime?: number;
}

export interface Entity {
  id: string;
  type: 'player' | 'enemy-red' | 'enemy-purple';
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  onGround: boolean;
  collisionNormal: Vec2 | null;
  patrolDirection?: number;
}

export interface GameState {
  terrains: TerrainBlock[];
  entities: Entity[];
  isSimulating: boolean;
  player: Entity | null;
}

export interface InfoData {
  playerPos: Vec2 | null;
  playerVel: Vec2 | null;
  onGround: boolean;
  collisionNormal: Vec2 | null;
}

const GRAVITY = 980;
const PLAYER_SPEED = 300;
const JUMP_VELOCITY = 500;
const ENEMY_SPEED = 80;
const FLASH_DURATION = 0.1;

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function rectsOverlap(a: { x: number; y: number; width: number; height: number },
                      b: { x: number; y: number; width: number; height: number }): boolean {
  return a.x < b.x + b.width &&
         a.x + a.width > b.x &&
         a.y < b.y + b.height &&
         a.y + a.height > b.y;
}

function getAxes(rect: { x: number; y: number; width: number; height: number }): Vec2[] {
  return [
    { x: 1, y: 0 },
    { x: 0, y: 1 }
  ];
}

function projectOntoAxis(rect: { x: number; y: number; width: number; height: number }, axis: Vec2): { min: number; max: number } {
  const corners = [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x + rect.width, y: rect.y + rect.height },
    { x: rect.x, y: rect.y + rect.height }
  ];
  let min = Infinity, max = -Infinity;
  for (const c of corners) {
    const dot = c.x * axis.x + c.y * axis.y;
    if (dot < min) min = dot;
    if (dot > max) max = dot;
  }
  return { min, max };
}

function satCollide(a: { x: number; y: number; width: number; height: number },
                    b: { x: number; y: number; width: number; height: number }): { overlap: number; normal: Vec2 } | null {
  const axes = [...getAxes(a), ...getAxes(b)];
  let minOverlap = Infinity;
  let minNormal: Vec2 = { x: 0, y: 0 };

  for (const axis of axes) {
    const projA = projectOntoAxis(a, axis);
    const projB = projectOntoAxis(b, axis);
    const overlap = Math.min(projA.max, projB.max) - Math.max(projA.min, projB.min);
    if (overlap <= 0) return null;
    if (overlap < minOverlap) {
      minOverlap = overlap;
      minNormal = axis;
    }
  }

  const dirX = (a.x + a.width / 2) - (b.x + b.width / 2);
  const dirY = (a.y + a.height / 2) - (b.y + b.height / 2);
  if (dirX * minNormal.x + dirY * minNormal.y < 0) {
    minNormal = { x: -minNormal.x, y: -minNormal.y };
  }

  return { overlap: minOverlap, normal: minNormal };
}

export class CanvasEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private terrains: TerrainBlock[] = [];
  private entities: Entity[] = [];
  private isSimulating = false;
  private animationId: number | null = null;
  private lastTime = 0;
  private keys: Record<string, boolean> = {};
  private onInfoUpdate: ((data: InfoData) => void) | null = null;
  private history: TerrainBlock[][] = [];
  private historyIndex = -1;
  private isDrawing = false;
  private currentTool: ToolType = 'square';
  private brushSize: BrushSize = 32;
  private mousePos: Vec2 = { x: 0, y: 0 };
  private gridSize = 32;
  private canvasWidth = 0;
  private canvasHeight = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.setupEventListeners();
    this.saveState();
  }

  setOnInfoUpdate(callback: (data: InfoData) => void) {
    this.onInfoUpdate = callback;
  }

  setTool(tool: ToolType) {
    this.currentTool = tool;
  }

  setBrushSize(size: BrushSize) {
    this.brushSize = size;
  }

  getTool(): ToolType {
    return this.currentTool;
  }

  getBrushSize(): BrushSize {
    return this.brushSize;
  }

  resize(width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.render();
  }

  private setupEventListeners() {
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('mouseleave', this.handleMouseUp);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  destroy() {
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('mouseleave', this.handleMouseUp);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    this.keys[e.code] = true;
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keys[e.code] = false;
  };

  private getGridAligned(value: number): number {
    return Math.floor(value / this.gridSize) * this.gridSize;
  }

  private handleMouseDown = (e: MouseEvent) => {
    if (this.isSimulating) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.mousePos = { x, y };

    if (this.currentTool === 'player') {
      this.placePlayer(x, y);
      this.saveState();
      return;
    }
    if (this.currentTool === 'enemy-red' || this.currentTool === 'enemy-purple') {
      this.placeEnemy(this.currentTool, x, y);
      this.saveState();
      return;
    }

    this.isDrawing = true;
    this.applyBrush(x, y);
  };

  private handleMouseMove = (e: MouseEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.mousePos = { x, y };

    if (this.isDrawing && !this.isSimulating) {
      this.applyBrush(x, y);
    }

    if (!this.isSimulating) {
      this.render();
      this.drawBrushPreview();
    }
  };

  private handleMouseUp = () => {
    if (this.isDrawing) {
      this.isDrawing = false;
      this.saveState();
    }
  };

  private applyBrush(x: number, y: number) {
    const gx = this.getGridAligned(x);
    const gy = this.getGridAligned(y);
    const size = this.brushSize;

    if (this.currentTool === 'eraser') {
      this.terrains = this.terrains.filter(t => {
        return !rectsOverlap(
          { x: gx, y: gy, width: size, height: size },
          t
        );
      });
      this.entities = this.entities.filter(e => {
        return !rectsOverlap(
          { x: gx, y: gy, width: size, height: size },
          e
        );
      });
    } else if (this.currentTool === 'square' || this.currentTool === 'circle' || this.currentTool === 'slope') {
      const exists = this.terrains.some(t =>
        t.x === gx && t.y === gy && t.width === size && t.height === size && t.type === this.currentTool
      );
      if (!exists) {
        this.terrains.push({
          id: generateId(),
          type: this.currentTool,
          x: gx,
          y: gy,
          width: size,
          height: size,
          slopeDirection: this.currentTool === 'slope' ? 'left' : undefined
        });
      }
    }
  }

  private drawBrushPreview() {
    const { ctx, mousePos, brushSize, currentTool, gridSize } = this;
    const gx = Math.floor(mousePos.x / gridSize) * gridSize;
    const gy = Math.floor(mousePos.y / gridSize) * gridSize;

    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;

    if (currentTool === 'square') {
      ctx.strokeRect(gx, gy, brushSize, brushSize);
    } else if (currentTool === 'circle') {
      ctx.beginPath();
      ctx.arc(gx + brushSize / 2, gy + brushSize / 2, brushSize / 2, 0, Math.PI * 2);
      ctx.stroke();
    } else if (currentTool === 'slope') {
      ctx.beginPath();
      ctx.moveTo(gx, gy + brushSize);
      ctx.lineTo(gx + brushSize, gy);
      ctx.lineTo(gx + brushSize, gy + brushSize);
      ctx.closePath();
      ctx.stroke();
    } else if (currentTool === 'player') {
      ctx.strokeStyle = '#4a90d9';
      ctx.strokeRect(gx, gy, 32, 32);
    } else if (currentTool === 'enemy-red') {
      ctx.strokeStyle = '#e74c3c';
      ctx.strokeRect(gx, gy, 32, 32);
    } else if (currentTool === 'enemy-purple') {
      ctx.strokeStyle = '#9b59b6';
      ctx.strokeRect(gx, gy, 32, 32);
    } else if (currentTool === 'eraser') {
      ctx.strokeStyle = '#ff4444';
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(gx, gy, brushSize, brushSize);
    }

    ctx.restore();
  }

  private placePlayer(x: number, y: number) {
    const gx = this.getGridAligned(x);
    const gy = this.getGridAligned(y);
    this.entities = this.entities.filter(e => e.type !== 'player');
    this.entities.push({
      id: generateId(),
      type: 'player',
      x: gx,
      y: gy,
      width: 32,
      height: 32,
      vx: 0,
      vy: 0,
      onGround: false,
      collisionNormal: null
    });
  }

  private placeEnemy(type: 'enemy-red' | 'enemy-purple', x: number, y: number) {
    const gx = this.getGridAligned(x);
    const gy = this.getGridAligned(y);
    this.entities.push({
      id: generateId(),
      type,
      x: gx,
      y: gy,
      width: 32,
      height: 32,
      vx: 0,
      vy: 0,
      onGround: false,
      collisionNormal: null,
      patrolDirection: 1
    });
  }

  private saveState() {
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(JSON.parse(JSON.stringify(this.terrains)));
    this.historyIndex++;
    if (this.history.length > 50) {
      this.history.shift();
      this.historyIndex--;
    }
  }

  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.terrains = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
      this.render();
    }
  }

  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.terrains = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
      this.render();
    }
  }

  clearAll() {
    this.terrains = [];
    this.entities = [];
    this.saveState();
    this.render();
  }

  toggleSimulation(): boolean {
    this.isSimulating = !this.isSimulating;
    if (this.isSimulating) {
      this.lastTime = performance.now();
      this.startGameLoop();
    } else {
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
    }
    this.render();
    return this.isSimulating;
  }

  isSimulationRunning(): boolean {
    return this.isSimulating;
  }

  private startGameLoop() {
    const loop = (time: number) => {
      const dt = Math.min((time - this.lastTime) / 1000, 1 / 30);
      this.lastTime = time;
      this.update(dt);
      this.render();
      this.emitInfo();
      if (this.isSimulating) {
        this.animationId = requestAnimationFrame(loop);
      }
    };
    this.animationId = requestAnimationFrame(loop);
  }

  private update(dt: number) {
    for (const terrain of this.terrains) {
      if (terrain.flashTime !== undefined && terrain.flashTime > 0) {
        terrain.flashTime -= dt;
      }
    }

    for (const entity of this.entities) {
      entity.collisionNormal = null;
      entity.onGround = false;

      if (entity.type === 'player') {
        let moveX = 0;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveX -= 1;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) moveX += 1;
        entity.vx = moveX * PLAYER_SPEED;

        if ((this.keys['Space'] || this.keys['KeyW'] || this.keys['ArrowUp']) && entity.onGround) {
          entity.vy = -JUMP_VELOCITY;
          entity.onGround = false;
        }
      } else {
        if (entity.patrolDirection === undefined) entity.patrolDirection = 1;
        entity.vx = entity.patrolDirection * ENEMY_SPEED;
      }

      entity.vy += GRAVITY * dt;

      entity.x += entity.vx * dt;
      this.resolveCollisions(entity, 'x');

      entity.y += entity.vy * dt;
      this.resolveCollisions(entity, 'y');

      if (entity.type !== 'player') {
        this.checkEnemyPatrol(entity);
      }

      if (entity.y > this.canvasHeight + 200) {
        entity.y = 100;
        entity.x = 100;
        entity.vy = 0;
      }
      if (entity.x < 0) {
        entity.x = 0;
        entity.vx = Math.abs(entity.vx);
        if (entity.type !== 'player') entity.patrolDirection = 1;
      }
      if (entity.x + entity.width > this.canvasWidth) {
        entity.x = this.canvasWidth - entity.width;
        entity.vx = -Math.abs(entity.vx);
        if (entity.type !== 'player') entity.patrolDirection = -1;
      }
    }
  }

  private resolveCollisions(entity: Entity, axis: 'x' | 'y') {
    for (const terrain of this.terrains) {
      const collision = satCollide(entity, terrain);
      if (collision) {
        terrain.flashTime = FLASH_DURATION;

        if (collision.normal.y < -0.5 && axis === 'y') {
          entity.y -= collision.overlap;
          entity.vy = 0;
          entity.onGround = true;
          entity.collisionNormal = { x: 0, y: -1 };
        } else if (collision.normal.y > 0.5 && axis === 'y') {
          entity.y += collision.overlap;
          entity.vy = 0;
          entity.collisionNormal = { x: 0, y: 1 };
        }

        if (Math.abs(collision.normal.x) > 0.5 && axis === 'x') {
          entity.x += collision.normal.x * collision.overlap;
          if (entity.type === 'player') {
            entity.vx = 0;
          } else {
            entity.patrolDirection = -(entity.patrolDirection || 1);
            entity.vx = entity.patrolDirection * ENEMY_SPEED;
          }
          entity.collisionNormal = { x: collision.normal.x, y: 0 };
        }
      }
    }

    for (const other of this.entities) {
      if (other.id === entity.id) continue;
      const collision = satCollide(entity, other);
      if (collision) {
        if (Math.abs(collision.normal.x) > 0.5 && axis === 'x') {
          entity.x += collision.normal.x * collision.overlap;
          if (entity.type !== 'player') {
            entity.patrolDirection = -(entity.patrolDirection || 1);
            entity.vx = entity.patrolDirection * ENEMY_SPEED;
          }
          entity.collisionNormal = { x: collision.normal.x, y: 0 };
        }
      }
    }
  }

  private checkEnemyPatrol(enemy: Entity) {
    const aheadX = enemy.patrolDirection === 1
      ? enemy.x + enemy.width + 2
      : enemy.x - 2;

    let hasGroundAhead = false;
    for (const terrain of this.terrains) {
      if (aheadX >= terrain.x && aheadX <= terrain.x + terrain.width) {
        if (Math.abs((enemy.y + enemy.height) - terrain.y) < 4) {
          hasGroundAhead = true;
          break;
        }
      }
    }

    const probe = {
      x: aheadX - 4,
      y: enemy.y,
      width: 8,
      height: enemy.height + 4
    };

    let blocked = false;
    for (const terrain of this.terrains) {
      if (rectsOverlap(probe, terrain)) {
        blocked = true;
        break;
      }
    }

    if ((!hasGroundAhead && enemy.onGround) || blocked) {
      enemy.patrolDirection = -(enemy.patrolDirection || 1);
      enemy.vx = enemy.patrolDirection * ENEMY_SPEED;
    }
  }

  private emitInfo() {
    if (!this.onInfoUpdate) return;
    const player = this.entities.find(e => e.type === 'player');
    this.onInfoUpdate({
      playerPos: player ? { x: Math.round(player.x), y: Math.round(player.y) } : null,
      playerVel: player ? { x: Math.round(player.vx), y: Math.round(player.vy) } : null,
      onGround: player ? player.onGround : false,
      collisionNormal: player ? player.collisionNormal : null
    });
  }

  private render() {
    const { ctx, canvasWidth, canvasHeight } = this;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    ctx.strokeStyle = '#2a2a3e';
    ctx.lineWidth = 1;
    for (let x = 0; x <= canvasWidth; x += this.gridSize) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, canvasHeight);
      ctx.stroke();
    }
    for (let y = 0; y <= canvasHeight; y += this.gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(canvasWidth, y + 0.5);
      ctx.stroke();
    }

    for (const terrain of this.terrains) {
      this.drawTerrain(terrain);
    }

    for (const entity of this.entities) {
      this.drawEntity(entity);
    }
  }

  private drawTerrain(terrain: TerrainBlock) {
    const { ctx } = this;
    const isFlashing = terrain.flashTime !== undefined && terrain.flashTime > 0;
    const fillColor = isFlashing ? '#ffffff' : '#3a3a5e';
    const strokeColor = isFlashing ? '#ffffff' : '#5a5a7e';

    ctx.save();
    ctx.fillStyle = fillColor;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;

    if (terrain.type === 'square') {
      ctx.fillRect(terrain.x, terrain.y, terrain.width, terrain.height);
      ctx.strokeRect(terrain.x, terrain.y, terrain.width, terrain.height);
    } else if (terrain.type === 'circle') {
      ctx.beginPath();
      ctx.arc(terrain.x + terrain.width / 2, terrain.y + terrain.height / 2, terrain.width / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (terrain.type === 'slope') {
      ctx.beginPath();
      ctx.moveTo(terrain.x, terrain.y + terrain.height);
      ctx.lineTo(terrain.x + terrain.width, terrain.y);
      ctx.lineTo(terrain.x + terrain.width, terrain.y + terrain.height);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawEntity(entity: Entity) {
    const { ctx } = this;
    ctx.save();

    let color = '#4a90d9';
    if (entity.type === 'enemy-red') color = '#e74c3c';
    if (entity.type === 'enemy-purple') color = '#9b59b6';

    ctx.fillStyle = color;
    ctx.fillRect(entity.x, entity.y, entity.width, entity.height);

    ctx.strokeStyle = 'rgba(255, 68, 68, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(entity.x - 2, entity.y - 2, entity.width + 4, entity.height + 4);

    ctx.fillStyle = '#ffffff';
    const eyeY = entity.y + 10;
    const eyeSize = 4;
    if (entity.type === 'player') {
      ctx.fillRect(entity.x + 8, eyeY, eyeSize, eyeSize);
      ctx.fillRect(entity.x + 20, eyeY, eyeSize, eyeSize);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(entity.x + 6, eyeY, 5, 5);
      ctx.fillRect(entity.x + 21, eyeY, 5, 5);
      ctx.fillStyle = '#000000';
      ctx.fillRect(entity.x + 7, eyeY + 1, 3, 3);
      ctx.fillRect(entity.x + 22, eyeY + 1, 3, 3);
    }

    ctx.restore();
  }

  addTerrain(block: TerrainBlock) {
    this.terrains.push(block);
    this.render();
  }

  removeTerrain(id: string) {
    this.terrains = this.terrains.filter(t => t.id !== id);
    this.render();
  }

  addEntity(entity: Entity) {
    this.entities.push(entity);
    this.render();
  }

  removeEntity(id: string) {
    this.entities = this.entities.filter(e => e.id !== id);
    this.render();
  }

  getState(): GameState {
    return {
      terrains: [...this.terrains],
      entities: [...this.entities],
      isSimulating: this.isSimulating,
      player: this.entities.find(e => e.type === 'player') || null
    };
  }
}
