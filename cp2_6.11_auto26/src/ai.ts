import { Board } from './board';
import { Unit, Team, Position } from './unit';

interface MoveAction {
  unitId: string;
  moveTo: Position | null;
  attackTargetId: string | null;
  score: number;
  useSkill: boolean;
}

export class AI {
  private depth: number = 3;
  private startTime: number = 0;
  private timeLimit: number = 180;

  constructor(depth: number = 3) {
    this.depth = depth;
  }

  findBestMove(board: Board, team: Team): MoveAction | null {
    this.startTime = performance.now();
    const actions = this.generateAllActions(board, team);

    if (actions.length === 0) return null;

    let bestAction = actions[0];
    let bestScore = -Infinity;

    const savedUnits = board.cloneUnits();

    for (const action of actions) {
      if (performance.now() - this.startTime > this.timeLimit) {
        break;
      }

      board.restoreUnits(savedUnits.map(u => {
        const nu = new Unit(u.type, u.team, { ...u.position });
        nu.id = u.id;
        nu.hp = u.hp;
        nu.energy = u.energy;
        nu.shield = u.shield;
        nu.shieldTurns = u.shieldTurns;
        nu.skillCooldown = u.skillCooldown;
        nu.isAlive = u.isAlive;
        nu.hasMoved = u.hasMoved;
        nu.hasAttacked = u.hasAttacked;
        return nu;
      }));

      this.applyAction(board, action, team);

      const score = this.minimax(board, this.depth - 1, -Infinity, Infinity, false, team);

      if (score > bestScore) {
        bestScore = score;
        bestAction = action;
        bestAction.score = score;
      }
    }

    board.restoreUnits(savedUnits.map(u => {
      const nu = new Unit(u.type, u.team, { ...u.position });
      nu.id = u.id;
      nu.hp = u.hp;
      nu.energy = u.energy;
      nu.shield = u.shield;
      nu.shieldTurns = u.shieldTurns;
      nu.skillCooldown = u.skillCooldown;
      nu.isAlive = u.isAlive;
      nu.hasMoved = u.hasMoved;
      nu.hasAttacked = u.hasAttacked;
      return nu;
    }));

    return bestAction;
  }

  private minimax(
    board: Board,
    depth: number,
    alpha: number,
    beta: number,
    isMaximizing: boolean,
    aiTeam: Team
  ): number {
    if (performance.now() - this.startTime > this.timeLimit) {
      return this.evaluateBoard(board, aiTeam);
    }

    const winner = this.checkWinner(board);
    if (winner) {
      return winner === aiTeam ? 10000 : -10000;
    }

    if (depth === 0) {
      return this.evaluateBoard(board, aiTeam);
    }

    const currentTeam = isMaximizing ? aiTeam : (aiTeam === 'red' ? 'blue' : 'red');
    const actions = this.generateAllActions(board, currentTeam);

    if (actions.length === 0) {
      return this.evaluateBoard(board, aiTeam);
    }

    const savedUnits = board.cloneUnits();

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const action of actions) {
        if (performance.now() - this.startTime > this.timeLimit) break;

        board.restoreUnits(savedUnits.map(u => {
          const nu = new Unit(u.type, u.team, { ...u.position });
          nu.id = u.id;
          nu.hp = u.hp;
          nu.energy = u.energy;
          nu.shield = u.shield;
          nu.shieldTurns = u.shieldTurns;
          nu.skillCooldown = u.skillCooldown;
          nu.isAlive = u.isAlive;
          nu.hasMoved = u.hasMoved;
          nu.hasAttacked = u.hasAttacked;
          return nu;
        }));

        this.applyAction(board, action, currentTeam);
        const evalScore = this.minimax(board, depth - 1, alpha, beta, false, aiTeam);
        maxEval = Math.max(maxEval, evalScore);
        alpha = Math.max(alpha, evalScore);

        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const action of actions) {
        if (performance.now() - this.startTime > this.timeLimit) break;

        board.restoreUnits(savedUnits.map(u => {
          const nu = new Unit(u.type, u.team, { ...u.position });
          nu.id = u.id;
          nu.hp = u.hp;
          nu.energy = u.energy;
          nu.shield = u.shield;
          nu.shieldTurns = u.shieldTurns;
          nu.skillCooldown = u.skillCooldown;
          nu.isAlive = u.isAlive;
          nu.hasMoved = u.hasMoved;
          nu.hasAttacked = u.hasAttacked;
          return nu;
        }));

        this.applyAction(board, action, currentTeam);
        const evalScore = this.minimax(board, depth - 1, alpha, beta, true, aiTeam);
        minEval = Math.min(minEval, evalScore);
        beta = Math.min(beta, evalScore);

        if (beta <= alpha) break;
      }
      return minEval;
    }
  }

  private generateAllActions(board: Board, team: Team): MoveAction[] {
    const actions: MoveAction[] = [];
    const teamUnits = board.getUnitsByTeam(team);

    for (const unit of teamUnits) {
      if (!unit.isAlive) continue;

      const moveRange = board.getMoveRange(unit);
      const attackRange = board.getAttackRange(unit);

      if (moveRange.length === 0 && attackRange.length === 0) {
        actions.push({
          unitId: unit.id,
          moveTo: null,
          attackTargetId: null,
          score: 0,
          useSkill: false,
        });
        continue;
      }

      for (const movePos of moveRange) {
        const attackFromMove = this.getAttackRangeFrom(board, unit, movePos);
        if (attackFromMove.length > 0) {
          for (const targetPos of attackFromMove) {
            const target = board.getUnitAt(targetPos.x, targetPos.y);
            if (target && target.team !== team) {
              actions.push({
                unitId: unit.id,
                moveTo: movePos,
                attackTargetId: target.id,
                score: 0,
                useSkill: false,
              });
            }
          }
        } else {
          actions.push({
            unitId: unit.id,
            moveTo: movePos,
            attackTargetId: null,
            score: 0,
            useSkill: false,
          });
        }
      }

      for (const attackPos of attackRange) {
        const target = board.getUnitAt(attackPos.x, attackPos.y);
        if (target && target.team !== team) {
          actions.push({
            unitId: unit.id,
            moveTo: null,
            attackTargetId: target.id,
            score: 0,
            useSkill: false,
          });
        }
      }
    }

    for (const unit of teamUnits) {
      if (unit.canUseSkill()) {
        const skillTargets = board.getSkillTargets(unit);
        if (skillTargets.length > 0 || unit.type === 'king') {
          actions.push({
            unitId: unit.id,
            moveTo: null,
            attackTargetId: null,
            score: 0,
            useSkill: true,
          });
        }
      }
    }

    return actions;
  }

  private getAttackRangeFrom(board: Board, unit: Unit, fromPos: Position): Position[] {
    const positions: Position[] = [];
    const range = unit.attackRange;
    for (let dx = -range; dx <= range; dx++) {
      for (let dy = -range; dy <= range; dy++) {
        if (dx === 0 && dy === 0) continue;
        if (Math.abs(dx) + Math.abs(dy) > range) continue;
        if (unit.attackRange > 1) {
          if (dx !== 0 && dy !== 0) continue;
        }
        const nx = fromPos.x + dx;
        const ny = fromPos.y + dy;
        if (nx >= 0 && nx < board.gridSize && ny >= 0 && ny < board.gridSize) {
          const target = board.getUnitAt(nx, ny);
          if (target && target.team !== unit.team) {
            positions.push({ x: nx, y: ny });
          }
        }
      }
    }
    return positions;
  }

  private applyAction(board: Board, action: MoveAction, team: Team): void {
    const unit = board.units.find(u => u.id === action.unitId);
    if (!unit || !unit.isAlive) return;

    if (action.useSkill) {
      this.applySkill(board, unit);
      return;
    }

    if (action.moveTo) {
      unit.position = { ...action.moveTo };
    }

    if (action.attackTargetId) {
      const target = board.units.find(u => u.id === action.attackTargetId);
      if (target && target.isAlive && target.team !== team) {
        target.takeDamage(unit.attack);
      }
    }
  }

  private applySkill(board: Board, unit: Unit): void {
    if (!unit.canUseSkill()) return;
    unit.useSkill();

    if (unit.type === 'king') {
      const range = 2;
      for (let dx = -range; dx <= range; dx++) {
        for (let dy = -range; dy <= range; dy++) {
          const nx = unit.position.x + dx;
          const ny = unit.position.y + dy;
          if (nx >= 0 && nx < board.gridSize && ny >= 0 && ny < board.gridSize) {
            const target = board.getUnitAt(nx, ny);
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
          if (nx >= 0 && nx < board.gridSize && ny >= 0 && ny < board.gridSize) {
            const target = board.getUnitAt(nx, ny);
            if (target && target.team !== unit.team) {
              target.takeDamage(unit.attack);
              unit.position = { x: unit.position.x + dir.dx * (dist - 1), y: unit.position.y + dir.dy * (dist - 1) };
              return;
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
          if (nx >= 0 && nx < board.gridSize && ny >= 0 && ny < board.gridSize) {
            const target = board.getUnitAt(nx, ny);
            if (target && target.team !== unit.team) {
              target.takeDamage(Math.floor(unit.attack / 2));
            }
          }
        }
      }
    }
  }

  private evaluateBoard(board: Board, aiTeam: Team): number {
    let score = 0;

    const aiUnits = board.getUnitsByTeam(aiTeam);
    const enemyUnits = board.getUnitsByTeam(aiTeam === 'red' ? 'blue' : 'red');

    for (const unit of aiUnits) {
      const typeValue = unit.type === 'king' ? 15 : unit.type === 'knight' ? 10 : 8;
      score += typeValue;
      score += unit.hp * 1.5;
      score += unit.shield * 2;
      score += unit.energy * 0.1;
    }

    for (const unit of enemyUnits) {
      const typeValue = unit.type === 'king' ? 15 : unit.type === 'knight' ? 10 : 8;
      score -= typeValue;
      score -= unit.hp * 1.5;
      score -= unit.shield * 2;
    }

    const aiKing = aiUnits.find(u => u.type === 'king');
    const enemyKing = enemyUnits.find(u => u.type === 'king');
    if (!aiKing) score -= 1000;
    if (!enemyKing) score += 1000;

    for (const unit of aiUnits) {
      const attackTargets = board.getAttackRange(unit);
      for (const pos of attackTargets) {
        const target = board.getUnitAt(pos.x, pos.y);
        if (target && target.team !== aiTeam) {
          const targetValue = target.type === 'king' ? 30 : target.type === 'knight' ? 15 : 10;
          const damage = Math.max(0, unit.attack - target.shield);
          score += targetValue * 0.3 + damage * 0.5;

          if (target.hp - unit.attack <= 0) {
            score += targetValue * 2;
          }
        }
      }
    }

    for (const unit of aiUnits) {
      const centerX = board.gridSize / 2;
      const centerY = board.gridSize / 2;
      const distToCenter = Math.abs(unit.position.x - centerX) + Math.abs(unit.position.y - centerY);
      score -= distToCenter * 0.1;
    }

    return score;
  }

  private checkWinner(board: Board): Team | null {
    const redUnits = board.getUnitsByTeam('red');
    const blueUnits = board.getUnitsByTeam('blue');

    if (redUnits.length === 0) return 'blue';
    if (blueUnits.length === 0) return 'red';

    const redKing = redUnits.find(u => u.type === 'king');
    const blueKing = blueUnits.find(u => u.type === 'king');

    if (!redKing) return 'blue';
    if (!blueKing) return 'red';

    return null;
  }
}
