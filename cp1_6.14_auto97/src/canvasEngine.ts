export type ToolType = 'square' | 'circle' | 'slope' | 'player' | 'enemy-red' | 'enemy-purple' | 'eraser';
export type BrushSize = 8 | 16 | 32;
export type TerrainType = 'square' | 'circle' | 'slope';
export type EntityType = 'player' | 'enemy-red' | 'enemy-purple';

export interface Vec2 {
  x: number;
  y: number;
}

export interface TerrainBlock {
  id: string;
  type: TerrainType;
  position: Vec2;
  size: Vec2;
  slopeDirection?: 'left' | 'right';
  flashTime?: number;
}

export interface EntityBase {
  id: string;
  type: EntityType;
  position: Vec2;
  size: Vec2;
  velocity: Vec2;
  onGround: boolean;
  collisionNormal: Vec2 | null;
}

export interface Player extends EntityBase {
  type: 'player';
}

export interface Enemy extends EntityBase {
  type: 'enemy-red' | 'enemy-purple';
  patrolDirection: number;
}

export type GameEntity = Player | Enemy;

export interface GameState {
  terrains: TerrainBlock[];
  entities: GameEntity[];
  isSimulating: boolean;
  player: Player | null;
}

export interface InfoData {
  playerPos: Vec2 | null;
  playerVel: Vec2 | null;
  onGround: boolean;
  collisionNormal: Vec2 | null;
  terrainCount: number;
  entityCount: number;
}

const GRAVITY = 980;
const PLAYER_SPEED = 300;
const JUMP_IMPULSE = 500;
const ENEMY_SPEED = 80;
const FLASH_DURATION = 0.1;
const GRID_SIZE = 32;

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function vec(x: number, y: number): Vec2 {
  return { x, y };
}

function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

function normalize(v: Vec2): Vec2 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

function getAABB(position: Vec2, size: Vec2) {
  return {
    minX: position.x,
    minY: position.y,
    maxX: position.x + size.x,
    maxY: position.y + size.y
  };
}

function aabbOverlap(aMinX: number, aMinY: number, aMaxX: number, aMaxY: number,
                     bMinX: number, bMinY: number, bMaxX: number, bMaxY: number): boolean {
  return aMinX < bMaxX && aMaxX > bMinX && aMinY < bMaxY && aMaxY > bMinY;
}

function getRectCorners(position: Vec2, size: Vec2): Vec2[] {
  return [
    { x: position.x, y: position.y },
    { x: position.x + size.x, y: position.y },
    { x: position.x + size.x, y: position.y + size.y },
    { x: position.x, y: position.y + size.y }
  ];
}

function getSlopeCorners(terrain: TerrainBlock): Vec2[] {
  const { position, size, slopeDirection } = terrain;
  if (slopeDirection === 'right') {
    return [
      { x: position.x, y: position.y + size.y },
      { x: position.x + size.x, y: position.y },
      { x: position.x + size.x, y: position.y + size.y }
    ];
  }
  return [
    { x: position.x, y: position.y },
    { x: position.x + size.x, y: position.y + size.y },
    { x: position.x, y: position.y + size.y }
  ];
}

function getAxesForRect(): Vec2[] {
  return [
    { x: 1, y: 0 },
    { x: 0, y: 1 }
  ];
}

function getAxesForPolygon(corners: Vec2[]): Vec2[] {
  const axes: Vec2[] = [];
  for (let i = 0; i < corners.length; i++) {
    const p1 = corners[i];
    const p2 = corners[(i + 1) % corners.length];
    const edge = { x: p2.x - p1.x, y: p2.y - p1.y };
    const normal = normalize({ x: -edge.y, y: edge.x });
    axes.push(normal);
  }
  return axes;
}

function projectPointsOntoAxis(points: Vec2[], axis: Vec2): { min: number; max: number } {
  let min = Infinity, max = -Infinity;
  for (const p of points) {
    const d = dot(p, axis);
    if (d < min) min = d;
    if (d > max) max = d;
  }
  return { min, max };
}

function projectCircleOntoAxis(center: Vec2, radius: number, axis: Vec2): { min: number; max: number } {
  const centerProj = dot(center, axis);
  return { min: centerProj - radius, max: centerProj + radius };
}

function findClosestPointOnPolygon(point: Vec2, polygon: Vec2[]): Vec2 {
  let closest = polygon[0];
  let minDistSq = Infinity;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const ab = { x: b.x - a.x, y: b.y - a.y };
    const ap = { x: point.x - a.x, y: point.y - a.y };
    const lenSq = ab.x * ab.x + ab.y * ab.y;
    let t = lenSq > 0 ? dot(ap, ab) / lenSq : 0;
    t = Math.max(0, Math.min(1, t));
    const cp = { x: a.x + t * ab.x, y: a.y + t * ab.y };
    const distSq = (point.x - cp.x) ** 2 + (point.y - cp.y) ** 2;
    if (distSq < minDistSq) {
      minDistSq = distSq;
      closest = cp;
    }
  }
  return closest;
}

function collideRectVsRect(
  rectPos: Vec2, rectSize: Vec2,
  otherPos: Vec2, otherSize: Vec2
): { overlap: number; normal: Vec2 } | null {
  const axes = getAxesForRect();
  let minOverlap = Infinity;
  let minNormal: Vec2 = { x: 0, y: 0 };
  const cornersA = getRectCorners(rectPos, rectSize);
  const cornersB = getRectCorners(otherPos, otherSize);

  for (const axis of axes) {
    const projA = projectPointsOntoAxis(cornersA, axis);
    const projB = projectPointsOntoAxis(cornersB, axis);
    const overlap = Math.min(projA.max, projB.max) - Math.max(projA.min, projB.min);
    if (overlap <= 0) return null;
    if (overlap < minOverlap) {
      minOverlap = overlap;
      minNormal = axis;
    }
  }

  const centerA = { x: rectPos.x + rectSize.x / 2, y: rectPos.y + rectSize.y / 2 };
  const centerB = { x: otherPos.x + otherSize.x / 2, y: otherPos.y + otherSize.y / 2 };
  const dir = { x: centerA.x - centerB.x, y: centerA.y - centerB.y };
  if (dot(dir, minNormal) < 0) {
    minNormal = { x: -minNormal.x, y: -minNormal.y };
  }

  return { overlap: minOverlap, normal: minNormal };
}

function collideRectVsCircle(
  rectPos: Vec2, rectSize: Vec2,
  circleCenter: Vec2, circleRadius: number
): { overlap: number; normal: Vec2 } | null {
  const closest = findClosestPointOnPolygon(circleCenter, getRectCorners(rectPos, rectSize));
  const diff = { x: circleCenter.x - closest.x, y: circleCenter.y - closest.y };
  const distSq = diff.x * diff.x + diff.y * diff.y;

  if (distSq > circleRadius * circleRadius) {
    return null;
  }

  const dist = Math.sqrt(distSq);
  let normal: Vec2;
  if (dist === 0) {
    const center = { x: rectPos.x + rectSize.x / 2, y: rectPos.y + rectSize.y / 2 };
    const toCenter = { x: circleCenter.x - center.x, y: circleCenter.y - center.y };
    normal = normalize(toCenter);
    if (normal.x === 0 && normal.y === 0) normal = { x: 0, y: -1 };
  } else {
    normal = { x: diff.x / dist, y: diff.y / dist };
  }

  return { overlap: circleRadius - dist, normal };
}

function collideRectVsSlope(
  rectPos: Vec2, rectSize: Vec2,
  terrain: TerrainBlock
): { overlap: number; normal: Vec2 } | null {
  const slopeCorners = getSlopeCorners(terrain);
  const rectCorners = getRectCorners(rectPos, rectSize);

  const axes = [...getAxesForRect(), ...getAxesForPolygon(slopeCorners)];
  let minOverlap = Infinity;
  let minNormal: Vec2 = { x: 0, y: 0 };

  for (const axis of axes) {
    const projA = projectPointsOntoAxis(rectCorners, axis);
    const projB = projectPointsOntoAxis(slopeCorners, axis);
    const overlap = Math.min(projA.max, projB.max) - Math.max(projA.min, projB.min);
    if (overlap <= 0) return null;
    if (overlap < minOverlap) {
      minOverlap = overlap;
      minNormal = axis;
    }
  }

  const centerA = { x: rectPos.x + rectSize.x / 2, y: rectPos.y + rectSize.y / 2 };
  let slopeCenterX = 0, slopeCenterY = 0;
  for (const c of slopeCorners) {
    slopeCenterX += c.x;
    slopeCenterY += c.y;
  }
  slopeCenterX /= slopeCorners.length;
  slopeCenterY /= slopeCorners.length;
  const dir = { x: centerA.x - slopeCenterX, y: centerA.y - slopeCenterY };
  if (dot(dir, minNormal) < 0) {
    minNormal = { x: -minNormal.x, y: -minNormal.y };
  }

  return { overlap: minOverlap, normal: minNormal };
}

export class CanvasEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private terrains: TerrainBlock[] = [];
  private entities: GameEntity[] = [];
  private isSimulating = false;
  private animationId: number | null = null;
  private lastTime = 0;
  private keys: Record<string, boolean> = {};
  private onInfoUpdate: ((data: InfoData) => void) | null = null;
  private onStateChange: (() => void) | null = null;
  private history: { terrains: TerrainBlock[]; entities: GameEntity[] }[] = [];
  private historyIndex = -1;
  private isDrawing = false;
  private currentTool: ToolType = 'square';
  private brushSize: BrushSize = 32;
  private mousePos: Vec2 = { x: 0, y: 0 };
  private gridSize = GRID_SIZE;
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

  setOnStateChange(callback: () => void) {
    this.onStateChange = callback;
  }

  setTool(tool: ToolType) {
    this.currentTool = tool;
    this.onStateChange?.();
  }

  setBrushSize(size: BrushSize) {
    this.brushSize = size;
    this.onStateChange?.();
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
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') {
      e.preventDefault();
      if (!this.isSimulating) this.undo();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyY') {
      e.preventDefault();
      if (!this.isSimulating) this.redo();
      return;
    }
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
    const brushAABB = { position: { x: gx, y: gy }, size: { x: size, y: size } };

    if (this.currentTool === 'eraser') {
      this.terrains = this.terrains.filter(t => {
        return !aabbOverlap(
          gx, gy, gx + size, gy + size,
          t.position.x, t.position.y, t.position.x + t.size.x, t.position.y + t.size.y
        );
      });
      this.entities = this.entities.filter(e => {
        return !aabbOverlap(
          gx, gy, gx + size, gy + size,
          e.position.x, e.position.y, e.position.x + e.size.x, e.position.y + e.size.y
        );
      });
    } else if (this.currentTool === 'square' || this.currentTool === 'circle' || this.currentTool === 'slope') {
      const exists = this.terrains.some(t =>
        t.position.x === gx && t.position.y === gy &&
        t.size.x === size && t.size.y === size && t.type === this.currentTool
      );
      if (!exists) {
        this.terrains.push({
          id: generateId(),
          type: this.currentTool,
          position: { x: gx, y: gy },
          size: { x: size, y: size },
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
    this.entities = this.entities.filter(e => e.type !== 'player') as GameEntity[];
    this.entities.push({
      id: generateId(),
      type: 'player',
      position: { x: gx, y: gy },
      size: { x: 32, y: 32 },
      velocity: { x: 0, y: 0 },
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
      position: { x: gx, y: gy },
      size: { x: 32, y: 32 },
      velocity: { x: 0, y: 0 },
      onGround: false,
      collisionNormal: null,
      patrolDirection: 1
    });
  }

  private saveState() {
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push({
      terrains: JSON.parse(JSON.stringify(this.terrains)),
      entities: JSON.parse(JSON.stringify(this.entities))
    });
    this.historyIndex++;
    if (this.history.length > 50) {
      this.history.shift();
      this.historyIndex--;
    }
  }

  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      const state = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
      this.terrains = state.terrains;
      this.entities = state.entities;
      this.render();
      this.onStateChange?.();
    }
  }

  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      const state = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
      this.terrains = state.terrains;
      this.entities = state.entities;
      this.render();
      this.onStateChange?.();
    }
  }

  clearAll() {
    this.terrains = [];
    this.entities = [];
    this.saveState();
    this.render();
    this.onStateChange?.();
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
      for (const entity of this.entities) {
        entity.velocity = { x: 0, y: 0 };
        entity.collisionNormal = null;
      }
    }
    this.render();
    this.onStateChange?.();
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
        entity.velocity.x = moveX * PLAYER_SPEED;

        if ((this.keys['Space'] || this.keys['KeyW'] || this.keys['ArrowUp']) && entity.onGround) {
          entity.velocity.y = -JUMP_IMPULSE;
          entity.onGround = false;
        }
      } else {
        entity.velocity.x = entity.patrolDirection * ENEMY_SPEED;
      }

      entity.velocity.y += GRAVITY * dt;

      entity.position.x += entity.velocity.x * dt;
      this.resolveCollisions(entity, 'x');

      entity.position.y += entity.velocity.y * dt;
      this.resolveCollisions(entity, 'y');

      if (entity.type !== 'player') {
        this.checkEnemyPatrol(entity as Enemy);
      }

      if (entity.position.y > this.canvasHeight + 200) {
        entity.position.y = 100;
        entity.position.x = 100;
        entity.velocity.y = 0;
      }
      if (entity.position.x < 0) {
        entity.position.x = 0;
        entity.velocity.x = Math.abs(entity.velocity.x);
        if (entity.type !== 'player') (entity as Enemy).patrolDirection = 1;
      }
      if (entity.position.x + entity.size.x > this.canvasWidth) {
        entity.position.x = this.canvasWidth - entity.size.x;
        entity.velocity.x = -Math.abs(entity.velocity.x);
        if (entity.type !== 'player') (entity as Enemy).patrolDirection = -1;
      }
    }
  }

  private checkCollisionWithTerrain(entity: GameEntity, terrain: TerrainBlock):
    { overlap: number; normal: Vec2 } | null {
    if (terrain.type === 'square') {
      return collideRectVsRect(entity.position, entity.size, terrain.position, terrain.size);
    } else if (terrain.type === 'circle') {
      const center = {
        x: terrain.position.x + terrain.size.x / 2,
        y: terrain.position.y + terrain.size.y / 2
      };
      const radius = terrain.size.x / 2;
      return collideRectVsCircle(entity.position, entity.size, center, radius);
    } else if (terrain.type === 'slope') {
      return collideRectVsSlope(entity.position, entity.size, terrain);
    }
    return null;
  }

  private resolveCollisions(entity: GameEntity, axis: 'x' | 'y') {
    for (const terrain of this.terrains) {
      const collision = this.checkCollisionWithTerrain(entity, terrain);
      if (collision) {
        terrain.flashTime = FLASH_DURATION;

        if (collision.normal.y < -0.5 && axis === 'y') {
          entity.position.y -= collision.overlap;
          entity.velocity.y = 0;
          entity.onGround = true;
          entity.collisionNormal = { x: 0, y: -1 };
        } else if (collision.normal.y > 0.5 && axis === 'y') {
          entity.position.y += collision.overlap;
          entity.velocity.y = 0;
          entity.collisionNormal = { x: 0, y: 1 };
        }

        if (Math.abs(collision.normal.x) > 0.5 && axis === 'x') {
          entity.position.x += collision.normal.x * collision.overlap;
          if (entity.type === 'player') {
            entity.velocity.x = 0;
          } else {
            (entity as Enemy).patrolDirection = -(entity as Enemy).patrolDirection;
            entity.velocity.x = (entity as Enemy).patrolDirection * ENEMY_SPEED;
          }
          entity.collisionNormal = { x: collision.normal.x, y: 0 };
        }
      }
    }

    for (const other of this.entities) {
      if (other.id === entity.id) continue;
      const collision = collideRectVsRect(entity.position, entity.size, other.position, other.size);
      if (collision) {
        if (Math.abs(collision.normal.x) > 0.5 && axis === 'x') {
          entity.position.x += collision.normal.x * collision.overlap;
          if (entity.type !== 'player') {
            (entity as Enemy).patrolDirection = -(entity as Enemy).patrolDirection;
            entity.velocity.x = (entity as Enemy).patrolDirection * ENEMY_SPEED;
          }
          entity.collisionNormal = { x: collision.normal.x, y: 0 };
        }
      }
    }
  }

  private checkEnemyPatrol(enemy: Enemy) {
    const aheadX = enemy.patrolDirection === 1
      ? enemy.position.x + enemy.size.x + 2
      : enemy.position.x - 2;

    let hasGroundAhead = false;
    for (const terrain of this.terrains) {
      if (aheadX >= terrain.position.x && aheadX <= terrain.position.x + terrain.size.x) {
        if (Math.abs((enemy.position.y + enemy.size.y) - terrain.position.y) < 6) {
          hasGroundAhead = true;
          break;
        }
      }
    }

    const probe = {
      position: { x: aheadX - 4, y: enemy.position.y },
      size: { x: 8, y: enemy.size.y + 4 }
    };

    let blocked = false;
    for (const terrain of this.terrains) {
      if (aabbOverlap(
        probe.position.x, probe.position.y,
        probe.position.x + probe.size.x, probe.position.y + probe.size.y,
        terrain.position.x, terrain.position.y,
        terrain.position.x + terrain.size.x, terrain.position.y + terrain.size.y
      )) {
        blocked = true;
        break;
      }
    }

    if ((!hasGroundAhead && enemy.onGround) || blocked) {
      enemy.patrolDirection = -enemy.patrolDirection;
      enemy.velocity.x = enemy.patrolDirection * ENEMY_SPEED;
    }
  }

  private emitInfo() {
    if (!this.onInfoUpdate) return;
    const player = this.entities.find(e => e.type === 'player') as Player | undefined;
    this.onInfoUpdate({
      playerPos: player ? { x: Math.round(player.position.x), y: Math.round(player.position.y) } : null,
      playerVel: player ? { x: Math.round(player.velocity.x), y: Math.round(player.velocity.y) } : null,
      onGround: player ? player.onGround : false,
      collisionNormal: player ? player.collisionNormal : null,
      terrainCount: this.terrains.length,
      entityCount: this.entities.length
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

    const x = terrain.position.x;
    const y = terrain.position.y;
    const w = terrain.size.x;
    const h = terrain.size.y;

    if (terrain.type === 'square') {
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
    } else if (terrain.type === 'circle') {
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, w / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (terrain.type === 'slope') {
      ctx.beginPath();
      ctx.moveTo(x, y + h);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w, y + h);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawEntity(entity: GameEntity) {
    const { ctx } = this;
    ctx.save();

    let color = '#4a90d9';
    if (entity.type === 'enemy-red') color = '#e74c3c';
    if (entity.type === 'enemy-purple') color = '#9b59b6';

    ctx.fillStyle = color;
    ctx.fillRect(entity.position.x, entity.position.y, entity.size.x, entity.size.y);

    ctx.strokeStyle = 'rgba(255, 68, 68, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      entity.position.x - 2,
      entity.position.y - 2,
      entity.size.x + 4,
      entity.size.y + 4
    );

    const eyeY = entity.position.y + 10;
    if (entity.type === 'player') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(entity.position.x + 8, eyeY, 4, 4);
      ctx.fillRect(entity.position.x + 20, eyeY, 4, 4);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(entity.position.x + 6, eyeY, 5, 5);
      ctx.fillRect(entity.position.x + 21, eyeY, 5, 5);
      ctx.fillStyle = '#000000';
      ctx.fillRect(entity.position.x + 7, eyeY + 1, 3, 3);
      ctx.fillRect(entity.position.x + 22, eyeY + 1, 3, 3);
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

  addEntity(entity: GameEntity) {
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
      player: (this.entities.find(e => e.type === 'player') as Player) || null
    };
  }
}
