import { Board } from './board';
import { Unit, Team, Position } from './unit';
import { AI } from './ai';

type GamePhase = 'select' | 'move' | 'attack' | 'skill' | 'aiThinking' | 'gameOver';

class Game {
  private canvas: HTMLCanvasElement;
  private board: Board;
  private ai: AI;

  private phase: GamePhase = 'select';
  private currentTeam: Team = 'red';
  private selectedUnit: Unit | null = null;
  private aiMode: boolean = false;
  private winner: Team | null = null;
  private turnCount: number = 1;

  private lastTime: number = 0;

  private modeBtn: HTMLButtonElement;
  private skillBtn: HTMLButtonElement;
  private restartBtn: HTMLButtonElement;
  private playAgainBtn: HTMLButtonElement;
  private victoryOverlay: HTMLElement;
  private victoryTeam: HTMLElement;
  private turnTeamEl: HTMLElement;
  private turnGlowEl: HTMLElement;
  private redCountEl: HTMLElement;
  private redHpEl: HTMLElement;
  private blueCountEl: HTMLElement;
  private blueHpEl: HTMLElement;

  private goldParticles: { x: number; y: number; vy: number; life: number }[] = [];
  private victoryTime: number = 0;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.board = new Board(this.canvas);
    this.ai = new AI(3);

    this.modeBtn = document.getElementById('modeBtn') as HTMLButtonElement;
    this.skillBtn = document.getElementById('skillBtn') as HTMLButtonElement;
    this.restartBtn = document.getElementById('restartBtn') as HTMLButtonElement;
    this.playAgainBtn = document.getElementById('playAgainBtn') as HTMLButtonElement;
    this.victoryOverlay = document.getElementById('victoryOverlay') as HTMLElement;
    this.victoryTeam = document.getElementById('victoryTeam') as HTMLElement;
    this.turnTeamEl = document.getElementById('turnTeam') as HTMLElement;
    this.turnGlowEl = document.getElementById('turnGlow') as HTMLElement;
    this.redCountEl = document.getElementById('redCount') as HTMLElement;
    this.redHpEl = document.getElementById('redHp') as HTMLElement;
    this.blueCountEl = document.getElementById('blueCount') as HTMLElement;
    this.blueHpEl = document.getElementById('blueHp') as HTMLElement;

    this.init();
  }

  private init(): void {
    this.board.initUnits();
    this.bindEvents();
    this.updateUI();
    this.lastTime = performance.now();
    this.gameLoop(this.lastTime);
    window.addEventListener('resize', () => this.handleResize());
    this.handleResize();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    this.canvas.addEventListener('mouseleave', () => this.handleMouseLeave());

    this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
    this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
    this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));

    this.modeBtn.addEventListener('click', () => this.toggleAIMode());
    this.skillBtn.addEventListener('click', () => this.useSkill());
    this.restartBtn.addEventListener('click', () => this.restart());
    this.playAgainBtn.addEventListener('click', () => this.restart());
  }

  private handleResize(): void {
    this.board.resize();
  }

  private handleMouseDown(e: MouseEvent): void {
    if (this.phase === 'gameOver' || this.phase === 'aiThinking') return;
    if (this.aiMode && this.currentTeam === 'blue') return;

    const unit = this.board.getUnitAtScreen(e.clientX, e.clientY);
    if (unit && unit.team === this.currentTeam) {
      this.selectedUnit = unit;
      this.board.startDrag(unit, e.clientX, e.clientY);
      this.phase = 'move';
    } else if (this.selectedUnit) {
      this.handleClickOnBoard(e.clientX, e.clientY);
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    const hovered = this.board.getUnitAtScreen(e.clientX, e.clientY);
    this.board.setHoveredUnit(hovered);

    if (this.board.dragState.isDragging) {
      this.board.updateDrag(e.clientX, e.clientY);
    }
  }

  private handleMouseUp(e: MouseEvent): void {
    if (!this.board.dragState.isDragging) return;

    const unit = this.board.dragState.unit;
    if (!unit) {
      this.board.endDrag();
      return;
    }

    const gridPos = this.board.screenToGrid(e.clientX, e.clientY);
    if (gridPos) {
      this.handleDragEnd(unit, gridPos);
    } else {
      this.board.endDrag();
    }
  }

  private handleMouseLeave(): void {
    this.board.setHoveredUnit(null);
    if (this.board.dragState.isDragging) {
      this.board.endDrag();
    }
  }

  private handleTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    this.handleMouseDown({ clientX: touch.clientX, clientY: touch.clientY } as MouseEvent);
  }

  private handleTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    this.handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY } as MouseEvent);
  }

  private handleTouchEnd(e: TouchEvent): void {
    e.preventDefault();
    if (e.changedTouches.length === 0) return;
    const touch = e.changedTouches[0];
    this.handleMouseUp({ clientX: touch.clientX, clientY: touch.clientY } as MouseEvent);
  }

  private handleClickOnBoard(clientX: number, clientY: number): void {
    if (!this.selectedUnit) return;

    const gridPos = this.board.screenToGrid(clientX, clientY);
    if (!gridPos) return;

    const targetUnit = this.board.getUnitAt(gridPos.x, gridPos.y);

    if (targetUnit && targetUnit.team !== this.currentTeam) {
      this.tryAttack(this.selectedUnit, targetUnit);
    } else if (!targetUnit) {
      this.tryMove(this.selectedUnit, gridPos);
    }
  }

  private handleDragEnd(unit: Unit, gridPos: Position): void {
    this.board.endDrag();

    const targetUnit = this.board.getUnitAt(gridPos.x, gridPos.y);

    if (targetUnit && targetUnit.team !== unit.team) {
      this.tryAttack(unit, targetUnit);
    } else if (!targetUnit) {
      this.tryMove(unit, gridPos);
    }
  }

  private tryMove(unit: Unit, targetPos: Position): boolean {
    const moveRange = this.board.getMoveRange(unit);
    const canMove = moveRange.some(p => p.x === targetPos.x && p.y === targetPos.y);

    if (!canMove) {
      this.board.addHighlight('invalid', targetPos);
      return false;
    }

    unit.position = { ...targetPos };
    unit.hasMoved = true;

    const attackTargets = this.board.getAttackRange(unit);
    if (attackTargets.length === 0) {
      this.endTurn();
    } else {
      this.phase = 'attack';
    }

    return true;
  }

  private tryAttack(attacker: Unit, target: Unit): boolean {
    const attackRange = this.board.getAttackRange(attacker);
    const canAttack = attackRange.some(p => p.x === target.position.x && p.y === target.position.y);

    if (!canAttack) {
      this.board.addHighlight('invalid', target.position);
      return false;
    }

    this.board.attackUnit(attacker, target);
    attacker.hasAttacked = true;

    this.checkGameOver();
    if (!this.winner) {
      this.endTurn();
    }

    return true;
  }

  private useSkill(): void {
    if (!this.selectedUnit) return;
    if (!this.selectedUnit.canUseSkill()) return;
    if (this.phase === 'gameOver' || this.phase === 'aiThinking') return;

    const unit = this.selectedUnit;
    unit.useSkill();

    if (unit.type === 'king') {
      const range = 2;
      for (let dx = -range; dx <= range; dx++) {
        for (let dy = -range; dy <= range; dy++) {
          const nx = unit.position.x + dx;
          const ny = unit.position.y + dy;
          if (nx >= 0 && nx < this.board.gridSize && ny >= 0 && ny < this.board.gridSize) {
            const target = this.board.getUnitAt(nx, ny);
            if (target && target.team === unit.team) {
              target.shield = Math.max(target.shield, 5);
              target.shieldTurns = 2;
            }
          }
        }
      }
      unit.shield = Math.max(unit.shield, 5);
      unit.shieldTurns = 2;
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
          if (nx >= 0 && nx < this.board.gridSize && ny >= 0 && ny < this.board.gridSize) {
            const target = this.board.getUnitAt(nx, ny);
            if (target && target.team !== unit.team) {
              this.board.attackUnit(unit, target);
              unit.position = {
                x: unit.position.x + dir.dx * (dist - 1),
                y: unit.position.y + dir.dy * (dist - 1),
              };
              break;
            }
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
          if (nx >= 0 && nx < this.board.gridSize && ny >= 0 && ny < this.board.gridSize) {
            const target = this.board.getUnitAt(nx, ny);
            if (target && target.team !== unit.team) {
              const savedAttack = target.attack;
              void savedAttack;
              target.takeDamage(Math.floor(unit.attack / 2));
              const pixel = this.board.gridToPixel(target.position.x, target.position.y);
              this.board.damageNumbers.push({
                x: pixel.x + this.board.cellSize / 2,
                y: pixel.y + this.board.cellSize / 2 - 20,
                value: Math.floor(unit.attack / 2),
                life: 0.2,
                maxLife: 0.2,
                vy: -1.5,
              });
            }
          }
        }
      }
    }

    this.checkGameOver();
    if (!this.winner) {
      this.endTurn();
    }
  }

  private endTurn(): void {
    this.selectedUnit = null;
    this.board.clearHighlights();

    for (const unit of this.board.getUnitsByTeam(this.currentTeam)) {
      if (unit.shieldTurns > 0) {
        unit.shieldTurns--;
        if (unit.shieldTurns <= 0) {
          unit.shield = 0;
        }
      }
      if (unit.skillCooldown > 0) {
        unit.skillCooldown--;
      }
      unit.hasMoved = false;
      unit.hasAttacked = false;
    }

    this.currentTeam = this.currentTeam === 'red' ? 'blue' : 'red';
    if (this.currentTeam === 'red') {
      this.turnCount++;
    }

    this.board.triggerTurnFlash(this.currentTeam);
    this.phase = 'select';
    this.updateUI();

    if (this.aiMode && this.currentTeam === 'blue') {
      this.phase = 'aiThinking';
      setTimeout(() => this.executeAITurn(), 300);
    }
  }

  private executeAITurn(): void {
    const action = this.ai.findBestMove(this.board, 'blue');

    if (!action) {
      this.endTurn();
      return;
    }

    const unit = this.board.units.find(u => u.id === action.unitId);
    if (!unit || !unit.isAlive) {
      this.endTurn();
      return;
    }

    this.selectedUnit = unit;

    let delay = 0;

    if (action.useSkill) {
      setTimeout(() => {
        this.selectedUnit = unit;
        this.useSkill();
      }, 400);
      return;
    }

    if (action.moveTo) {
      setTimeout(() => {
        this.tryMove(unit, action.moveTo!);
      }, 300);
      delay += 300;
    }

    if (action.attackTargetId) {
      setTimeout(() => {
        const target = this.board.units.find(u => u.id === action.attackTargetId);
        if (target && target.isAlive) {
          this.tryAttack(unit, target);
        } else {
          this.endTurn();
        }
      }, delay + 400);
    } else if (!action.moveTo) {
      setTimeout(() => this.endTurn(), 300);
    }
  }

  private checkGameOver(): void {
    const redUnits = this.board.getUnitsByTeam('red');
    const blueUnits = this.board.getUnitsByTeam('blue');

    const redKing = redUnits.find(u => u.type === 'king');
    const blueKing = blueUnits.find(u => u.type === 'king');

    if (redUnits.length === 0 || !redKing) {
      this.winner = 'blue';
      this.phase = 'gameOver';
      this.showVictory();
    } else if (blueUnits.length === 0 || !blueKing) {
      this.winner = 'red';
      this.phase = 'gameOver';
      this.showVictory();
    }
  }

  private showVictory(): void {
    this.victoryTeam.textContent = this.winner === 'red' ? '红方获胜' : '蓝方获胜';
    this.victoryTeam.className = `victory-team ${this.winner}`;
    this.victoryOverlay.classList.add('active');
    this.spawnGoldParticles();
  }

  private spawnGoldParticles(): void {
    const plaque = document.getElementById('victoryPlaque');
    if (!plaque) return;

    const rect = plaque.getBoundingClientRect();
    for (let i = 0; i < 50; i++) {
      this.goldParticles.push({
        x: rect.left + Math.random() * rect.width,
        y: rect.top - 20 - Math.random() * 50,
        vy: 1 + Math.random() * 2,
        life: 2 + Math.random() * 1,
      });
    }
  }

  private updateGoldParticles(deltaTime: number): void {
    if (this.goldParticles.length === 0) return;

    const plaque = document.getElementById('victoryPlaque');
    if (!plaque) return;
    const rect = plaque.getBoundingClientRect();

    for (let i = this.goldParticles.length - 1; i >= 0; i--) {
      const p = this.goldParticles[i];
      p.y += p.vy * deltaTime * 60;
      p.life -= deltaTime;

      if (p.life <= 0 || p.y > rect.bottom + 50) {
        this.goldParticles.splice(i, 1);
      }
    }

    if (this.winner && this.victoryTime < 2) {
      if (Math.random() < 0.3) {
        this.goldParticles.push({
          x: rect.left + Math.random() * rect.width,
          y: rect.top - 10,
          vy: 1 + Math.random() * 2,
          life: 2 + Math.random() * 1,
        });
      }
    }
  }

  private toggleAIMode(): void {
    this.aiMode = !this.aiMode;
    this.modeBtn.textContent = this.aiMode ? '双人模式' : 'AI 模式';

    if (this.aiMode && this.currentTeam === 'blue' && this.phase === 'select') {
      this.phase = 'aiThinking';
      setTimeout(() => this.executeAITurn(), 300);
    }
  }

  private restart(): void {
    this.board.initUnits();
    this.phase = 'select';
    this.currentTeam = 'red';
    this.selectedUnit = null;
    this.winner = null;
    this.turnCount = 1;
    this.victoryOverlay.classList.remove('active');
    this.goldParticles = [];
    this.victoryTime = 0;
    this.updateUI();
    this.board.triggerTurnFlash('red');
  }

  private updateUI(): void {
    this.turnTeamEl.textContent = this.currentTeam === 'red' ? '红方' : '蓝方';
    this.turnTeamEl.className = `turn-team ${this.currentTeam}`;
    this.turnGlowEl.className = `turn-glow ${this.currentTeam}`;

    const redUnits = this.board.getUnitsByTeam('red');
    const blueUnits = this.board.getUnitsByTeam('blue');

    const redTotalHp = redUnits.reduce((sum, u) => sum + u.hp, 0);
    const blueTotalHp = blueUnits.reduce((sum, u) => sum + u.hp, 0);

    this.redCountEl.textContent = redUnits.length.toString();
    this.redHpEl.textContent = redTotalHp.toString();
    this.blueCountEl.textContent = blueUnits.length.toString();
    this.blueHpEl.textContent = blueTotalHp.toString();

    const canUseSkill = this.selectedUnit && this.selectedUnit.canUseSkill() && this.selectedUnit.team === this.currentTeam;
    this.skillBtn.disabled = !canUseSkill;
    if (this.selectedUnit && canUseSkill) {
      const skillNames: Record<string, string> = {
        king: '暗影庇护',
        knight: '突袭冲锋',
        archer: '贯穿之箭',
      };
      this.skillBtn.textContent = `技能: ${skillNames[this.selectedUnit.type] || ''}`;
    } else {
      this.skillBtn.textContent = '释放技能';
    }
  }

  private getCanActUnits(): Unit[] {
    if (this.phase === 'aiThinking' || this.phase === 'gameOver') return [];
    if (this.aiMode && this.currentTeam === 'blue') return [];

    return this.board.getUnitsByTeam(this.currentTeam).filter(u => {
      const moveRange = this.board.getMoveRange(u);
      const attackRange = this.board.getAttackRange(u);
      return moveRange.length > 0 || attackRange.length > 0;
    });
  }

  private gameLoop(currentTime: number): void {
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    if (this.winner) {
      this.victoryTime += deltaTime;
      this.updateGoldParticles(deltaTime);
    }

    this.board.update(deltaTime, currentTime);
    this.board.render(this.selectedUnit, this.currentTeam, this.getCanActUnits());
    this.updateUI();

    requestAnimationFrame((t) => this.gameLoop(t));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
