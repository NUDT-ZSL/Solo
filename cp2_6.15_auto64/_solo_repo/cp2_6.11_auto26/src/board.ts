import {
  Unit,
  Team,
  Position,
  Particle,
  DamageNumber,
  drawUnit,
  createExplosionParticles,
  createDeathParticles,
  createDamageNumber,
  updateParticles,
  updateDamageNumbers,
  drawParticles,
  drawDamageNumbers,
  TEAM_COLORS,
  UnitType,
} from './unit';

export interface DragState {
  isDragging: boolean;
  unit: Unit | null;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export interface HighlightInfo {
  type: 'move' | 'attack' | 'invalid';
  position: Position;
  time: number;
}

export class Board {
  public gridSize: number = 8;
  public cellSize: number = 60;
  public units: Unit[] = [];
  public particles: Particle[] = [];
  public damageNumbers: DamageNumber[] = [];
  public highlights: HighlightInfo[] = [];
  public dragState: DragState = {
    isDragging: false,
    unit: null,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  };
  public turnFlash: { radius: number; maxRadius: number; life: number; maxLife: number; color: string } | null = null;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private hoveredUnit: Unit | null = null;
  private time: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context');
    this.ctx = ctx;
    this.resize();
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.cellSize = rect.width / this.gridSize;
  }

  getCanvasWidth(): number {
    return this.canvas.getBoundingClientRect().width;
  }

  getCanvasHeight(): number {
    return this.canvas.getBoundingClientRect().height;
  }

  initUnits(): void {
    this.units = [];
    const redPositions: { type: UnitType; pos: Position }[] = [
      { type: 'king', pos: { x: 3, y: 7 } },
      { type: 'knight', pos: { x: 1, y: 7 } },
      { type: 'knight', pos: { x: 6, y: 7 } },
      { type: 'archer', pos: { x: 0, y: 6 } },
      { type: 'archer', pos: { x: 7, y: 6 } },
    ];
    for (const u of redPositions) {
      this.units.push(new Unit(u.type, 'red', u.pos));
    }

    const bluePositions: { type: UnitType; pos: Position }[] = [
      { type: 'king', pos: { x: 4, y: 0 } },
      { type: 'knight', pos: { x: 1, y: 0 } },
      { type: 'knight', pos: { x: 6, y: 0 } },
      { type: 'archer', pos: { x: 0, y: 1 } },
      { type: 'archer', pos: { x: 7, y: 1 } },
    ];
    for (const u of bluePositions) {
      this.units.push(new Unit(u.type, 'blue', u.pos));
    }
  }

  getUnitAt(x: number, y: number): Unit | null {
    return this.units.find(u => u.isAlive && u.position.x === x && u.position.y === y) || null;
  }

  getUnitsByTeam(team: Team): Unit[] {
    return this.units.filter(u => u.isAlive && u.team === team);
  }

  getMoveRange(unit: Unit): Position[] {
    const positions: Position[] = [];
    const range = unit.moveRange;
    for (let dx = -range; dx <= range; dx++) {
      for (let dy = -range; dy <= range; dy++) {
        if (dx === 0 && dy === 0) continue;
        if (Math.abs(dx) + Math.abs(dy) > range) continue;
        const nx = unit.position.x + dx;
        const ny = unit.position.y + dy;
        if (nx >= 0 && nx < this.gridSize && ny >= 0 && ny < this.gridSize) {
          if (!this.getUnitAt(nx, ny)) {
            positions.push({ x: nx, y: ny });
          }
        }
      }
    }
    return positions;
  }

  getAttackRange(unit: Unit, fromPos?: Position): Position[] {
    const positions: Position[] = [];
    const pos = fromPos || unit.position;
    const range = unit.attackRange;
    for (let dx = -range; dx <= range; dx++) {
      for (let dy = -range; dy <= range; dy++) {
        if (dx === 0 && dy === 0) continue;
        if (Math.abs(dx) + Math.abs(dy) > range) continue;
        if (unit.attackRange > 1) {
          if (dx !== 0 && dy !== 0) continue;
        }
        const nx = pos.x + dx;
        const ny = pos.y + dy;
        if (nx >= 0 && nx < this.gridSize && ny >= 0 && ny < this.gridSize) {
          const target = this.getUnitAt(nx, ny);
          if (target && target.team !== unit.team) {
            positions.push({ x: nx, y: ny });
          }
        }
      }
    }
    return positions;
  }

  getSkillTargets(unit: Unit): Position[] {
    const positions: Position[] = [];
    if (unit.type === 'king') {
      const range = 2;
      for (let dx = -range; dx <= range; dx++) {
        for (let dy = -range; dy <= range; dy++) {
          if (dx === 0 && dy === 0) continue;
          const nx = unit.position.x + dx;
          const ny = unit.position.y + dy;
          if (nx >= 0 && nx < this.gridSize && ny >= 0 && ny < this.gridSize) {
            const target = this.getUnitAt(nx, ny);
            if (target && target.team === unit.team) {
              positions.push({ x: nx, y: ny });
            }
          }
        }
      }
    } else if (unit.type === 'knight') {
      const dirs = [
        { dx: 0, dy: -1 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 },
        { dx: 1, dy: 0 },
      ];
      for (const dir of dirs) {
        for (let dist = 1; dist <= 3; dist++) {
          const nx = unit.position.x + dir.dx * dist;
          const ny = unit.position.y + dir.dy * dist;
          if (nx >= 0 && nx < this.gridSize && ny >= 0 && ny < this.gridSize) {
            const target = this.getUnitAt(nx, ny);
            if (target && target.team !== unit.team) {
              positions.push({ x: nx, y: ny });
              break;
            }
          } else {
            break;
          }
        }
      }
    } else if (unit.type === 'archer') {
      const dirs = [
        { dx: 0, dy: -1 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 },
        { dx: 1, dy: 0 },
      ];
      for (const dir of dirs) {
        for (let dist = 1; dist <= 2; dist++) {
          const nx = unit.position.x + dir.dx * dist;
          const ny = unit.position.y + dir.dy * dist;
          if (nx >= 0 && nx < this.gridSize && ny >= 0 && ny < this.gridSize) {
            const target = this.getUnitAt(nx, ny);
            if (target && target.team !== unit.team) {
              positions.push({ x: nx, y: ny });
            }
          }
        }
      }
    }
    return positions;
  }

  screenToGrid(screenX: number, screenY: number): Position | null {
    const rect = this.canvas.getBoundingClientRect();
    const x = screenX - rect.left;
    const y = screenY - rect.top;
    const gridX = Math.floor(x / this.cellSize);
    const gridY = Math.floor(y / this.cellSize);
    if (gridX >= 0 && gridX < this.gridSize && gridY >= 0 && gridY < this.gridSize) {
      return { x: gridX, y: gridY };
    }
    return null;
  }

  gridToPixel(gridX: number, gridY: number): { x: number; y: number } {
    return {
      x: gridX * this.cellSize,
      y: gridY * this.cellSize,
    };
  }

  getUnitAtScreen(screenX: number, screenY: number): Unit | null {
    const pos = this.screenToGrid(screenX, screenY);
    if (!pos) return null;
    return this.getUnitAt(pos.x, pos.y);
  }

  setHoveredUnit(unit: Unit | null): void {
    this.hoveredUnit = unit;
  }

  getHoveredUnit(): Unit | null {
    return this.hoveredUnit;
  }

  addHighlight(type: 'move' | 'attack' | 'invalid', position: Position): void {
    this.highlights.push({ type, position, time: 0 });
  }

  clearHighlights(): void {
    this.highlights = [];
  }

  startDrag(unit: Unit, screenX: number, screenY: number): void {
    this.dragState.isDragging = true;
    this.dragState.unit = unit;
    const rect = this.canvas.getBoundingClientRect();
    this.dragState.startX = screenX - rect.left;
    this.dragState.startY = screenY - rect.top;
    this.dragState.currentX = screenX - rect.left;
    this.dragState.currentY = screenY - rect.top;
  }

  updateDrag(screenX: number, screenY: number): void {
    const rect = this.canvas.getBoundingClientRect();
    this.dragState.currentX = screenX - rect.left;
    this.dragState.currentY = screenY - rect.top;
  }

  endDrag(): void {
    this.dragState.isDragging = false;
    this.dragState.unit = null;
  }

  attackUnit(attacker: Unit, target: Unit): number {
    const damage = target.takeDamage(attacker.attack);
    attacker.addEnergy(10);

    const targetPixel = this.gridToPixel(target.position.x, target.position.y);
    const centerX = targetPixel.x + this.cellSize / 2;
    const centerY = targetPixel.y + this.cellSize / 2;

    const explosionParticles = createExplosionParticles(
      centerX,
      centerY,
      TEAM_COLORS[target.team],
      12
    );
    this.particles.push(...explosionParticles);

    const dmgNum = createDamageNumber(centerX, centerY - 20, damage);
    this.damageNumbers.push(dmgNum);

    if (!target.isAlive) {
      const deathParticles = createDeathParticles(
        centerX,
        centerY,
        TEAM_COLORS[target.team]
      );
      this.particles.push(...deathParticles);
    }

    if (this.particles.length > 100) {
      this.particles = this.particles.slice(-100);
    }

    return damage;
  }

  triggerTurnFlash(team: Team): void {
    this.turnFlash = {
      radius: 0,
      maxRadius: 100,
      life: 0.3,
      maxLife: 0.3,
      color: TEAM_COLORS[team],
    };
  }

  update(deltaTime: number, currentTime: number): void {
    this.time = currentTime;
    updateParticles(this.particles, deltaTime);
    updateDamageNumbers(this.damageNumbers, deltaTime);

    for (let i = this.highlights.length - 1; i >= 0; i--) {
      this.highlights[i].time += deltaTime;
      if (this.highlights[i].type === 'invalid' && this.highlights[i].time > 0.5) {
        this.highlights.splice(i, 1);
      }
    }

    if (this.turnFlash) {
      this.turnFlash.life -= deltaTime;
      const progress = 1 - this.turnFlash.life / this.turnFlash.maxLife;
      this.turnFlash.radius = this.turnFlash.maxRadius * progress;
      if (this.turnFlash.life <= 0) {
        this.turnFlash = null;
      }
    }
  }

  render(selectedUnit: Unit | null, currentTeam: Team, canActUnits: Unit[]): void {
    const ctx = this.ctx;
    const width = this.getCanvasWidth();
    const height = this.getCanvasHeight();

    ctx.clearRect(0, 0, width, height);

    this.drawBoard();
    this.drawHighlights(selectedUnit, currentTeam);
    this.drawUnits(selectedUnit, canActUnits);
    this.drawDragGhost();
    drawParticles(ctx, this.particles);
    drawDamageNumbers(ctx, this.damageNumbers);
    this.drawTurnFlash();
  }

  private drawBoard(): void {
    const ctx = this.ctx;
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        const pixel = this.gridToPixel(x, y);
        const isDark = (x + y) % 2 === 0;
        ctx.fillStyle = isDark ? '#2C2C3A' : '#1A1A3A';
        ctx.fillRect(pixel.x, pixel.y, this.cellSize, this.cellSize);
      }
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= this.gridSize; i++) {
      ctx.beginPath();
      ctx.moveTo(i * this.cellSize, 0);
      ctx.lineTo(i * this.cellSize, this.gridSize * this.cellSize);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * this.cellSize);
      ctx.lineTo(this.gridSize * this.cellSize, i * this.cellSize);
      ctx.stroke();
    }
  }

  private drawHighlights(selectedUnit: Unit | null, currentTeam: Team): void {
    const ctx = this.ctx;

    if (selectedUnit && selectedUnit.team === currentTeam) {
      const moveRange = this.getMoveRange(selectedUnit);
      for (const pos of moveRange) {
        const pixel = this.gridToPixel(pos.x, pos.y);
        ctx.fillStyle = 'rgba(255, 215, 0, 0.2)';
        ctx.fillRect(pixel.x, pixel.y, this.cellSize, this.cellSize);
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(pixel.x + 2, pixel.y + 2, this.cellSize - 4, this.cellSize - 4);
      }

      const attackRange = this.getAttackRange(selectedUnit);
      for (const pos of attackRange) {
        const pixel = this.gridToPixel(pos.x, pos.y);
        ctx.fillStyle = 'rgba(233, 69, 96, 0.25)';
        ctx.fillRect(pixel.x, pixel.y, this.cellSize, this.cellSize);
        ctx.strokeStyle = 'rgba(233, 69, 96, 0.6)';
        ctx.lineWidth = 2;
        ctx.strokeRect(pixel.x + 2, pixel.y + 2, this.cellSize - 4, this.cellSize - 4);
      }
    }

    for (const hl of this.highlights) {
      const pixel = this.gridToPixel(hl.position.x, hl.position.y);
      if (hl.type === 'invalid') {
        const flashOn = Math.sin(hl.time * Math.PI * 4) > 0;
        if (flashOn) {
          ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
          ctx.fillRect(pixel.x, pixel.y, this.cellSize, this.cellSize);
        }
      } else if (hl.type === 'move') {
        ctx.fillStyle = 'rgba(255, 215, 0, 0.5)';
        ctx.fillRect(pixel.x, pixel.y, this.cellSize, this.cellSize);
      } else if (hl.type === 'attack') {
        ctx.fillStyle = 'rgba(233, 69, 96, 0.5)';
        ctx.fillRect(pixel.x, pixel.y, this.cellSize, this.cellSize);
      }
    }

    if (this.dragState.isDragging && this.dragState.unit) {
      const gridPos = this.screenToGrid(
        this.dragState.currentX + this.canvas.getBoundingClientRect().left,
        this.dragState.currentY + this.canvas.getBoundingClientRect().top
      );
      if (gridPos) {
        const pixel = this.gridToPixel(gridPos.x, gridPos.y);
        const unit = this.dragState.unit;
        const targetUnit = this.getUnitAt(gridPos.x, gridPos.y);
        let isValid = false;
        let isAttack = false;

        if (targetUnit && targetUnit.team !== unit.team) {
          const attackRange = this.getAttackRange(unit);
          isAttack = attackRange.some(p => p.x === gridPos.x && p.y === gridPos.y);
          isValid = isAttack;
        } else if (!targetUnit) {
          const moveRange = this.getMoveRange(unit);
          isValid = moveRange.some(p => p.x === gridPos.x && p.y === gridPos.y);
        }

        if (isAttack) {
          ctx.fillStyle = 'rgba(233, 69, 96, 0.5)';
        } else if (isValid) {
          ctx.fillStyle = 'rgba(255, 215, 0, 0.5)';
        } else {
          ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        }
        ctx.fillRect(pixel.x, pixel.y, this.cellSize, this.cellSize);
      }
    }
  }

  private drawUnits(selectedUnit: Unit | null, canActUnits: Unit[]): void {
    const ctx = this.ctx;
    for (const unit of this.units) {
      if (!unit.isAlive) continue;
      if (this.dragState.isDragging && this.dragState.unit === unit) continue;

      const pixel = this.gridToPixel(unit.position.x, unit.position.y);
      const isHovered = this.hoveredUnit === unit;
      const isSelected = selectedUnit === unit;
      const canAct = canActUnits.includes(unit);

      drawUnit(
        ctx,
        unit,
        this.cellSize,
        pixel.x,
        pixel.y,
        this.time,
        isHovered,
        isSelected,
        canAct
      );
    }
  }

  private drawDragGhost(): void {
    if (!this.dragState.isDragging || !this.dragState.unit) return;

    const ctx = this.ctx;
    const unit = this.dragState.unit;
    const x = this.dragState.currentX;
    const y = this.dragState.currentY;

    ctx.save();
    ctx.globalAlpha = 0.7;
    drawUnit(
      ctx,
      unit,
      this.cellSize,
      x - this.cellSize / 2,
      y - this.cellSize / 2,
      this.time,
      false,
      false,
      false
    );
    ctx.restore();
  }

  private drawTurnFlash(): void {
    if (!this.turnFlash) return;

    const ctx = this.ctx;
    const centerX = this.getCanvasWidth() / 2;
    const centerY = this.getCanvasHeight() / 2;

    const gradient = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, this.turnFlash.radius
    );
    const alpha = this.turnFlash.life / this.turnFlash.maxLife;
    gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.3})`);
    gradient.addColorStop(0.7, `rgba(255, 255, 255, ${alpha * 0.1})`);
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.getCanvasWidth(), this.getCanvasHeight());
  }

  cloneUnits(): Unit[] {
    const cloned: Unit[] = [];
    for (const u of this.units) {
      const newUnit = new Unit(u.type, u.team, { ...u.position });
      newUnit.id = u.id;
      newUnit.hp = u.hp;
      newUnit.energy = u.energy;
      newUnit.shield = u.shield;
      newUnit.shieldTurns = u.shieldTurns;
      newUnit.skillCooldown = u.skillCooldown;
      newUnit.isAlive = u.isAlive;
      newUnit.hasMoved = u.hasMoved;
      newUnit.hasAttacked = u.hasAttacked;
      cloned.push(newUnit);
    }
    return cloned;
  }

  restoreUnits(units: Unit[]): void {
    this.units = units.map(u => {
      const newUnit = new Unit(u.type, u.team, { ...u.position });
      newUnit.id = u.id;
      newUnit.hp = u.hp;
      newUnit.energy = u.energy;
      newUnit.shield = u.shield;
      newUnit.shieldTurns = u.shieldTurns;
      newUnit.skillCooldown = u.skillCooldown;
      newUnit.isAlive = u.isAlive;
      newUnit.hasMoved = u.hasMoved;
      newUnit.hasAttacked = u.hasAttacked;
      return newUnit;
    });
  }
}
