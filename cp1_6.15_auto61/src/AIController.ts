import type { Unit, AIDecision, Skill } from './types';
import { BattleMap } from './BattleMap';

export class AIController {
  private battleMap: BattleMap;

  constructor(battleMap: BattleMap) {
    this.battleMap = battleMap;
  }

  makeDecision(aiUnit: Unit, playerUnits: Unit[], _allUnits: Unit[]): AIDecision {
    const startTime = performance.now();
    const alivePlayers = playerUnits.filter(u => u.hp > 0);

    if (alivePlayers.length === 0) {
      return { unitId: aiUnit.id, action: 'end' };
    }

    const targets = this.sortTargets(aiUnit, alivePlayers);
    const primaryTarget = targets[0];

    const availableSkill = aiUnit.skills.find(s => s.currentCooldown === 0);

    if (!aiUnit.hasActed) {
      const attackDecision = this.tryAttack(aiUnit, primaryTarget, availableSkill);
      if (attackDecision) {
        this.logDecisionTime(startTime);
        return attackDecision;
      }
    }

    if (!aiUnit.hasMoved) {
      const moveDecision = this.tryMove(aiUnit, primaryTarget);
      if (moveDecision) {
        this.logDecisionTime(startTime);
        return moveDecision;
      }
    }

    if (!aiUnit.hasActed) {
      for (const target of targets) {
        const attackDecision = this.tryAttack(aiUnit, target, availableSkill);
        if (attackDecision) {
          this.logDecisionTime(startTime);
          return attackDecision;
        }
      }
    }

    this.logDecisionTime(startTime);
    return { unitId: aiUnit.id, action: 'end' };
  }

  private sortTargets(aiUnit: Unit, targets: Unit[]): Unit[] {
    return [...targets].sort((a, b) => {
      const distA = this.battleMap.getDistance(aiUnit.gridX, aiUnit.gridY, a.gridX, a.gridY);
      const distB = this.battleMap.getDistance(aiUnit.gridX, aiUnit.gridY, b.gridX, b.gridY);

      if (distA !== distB) return distA - distB;
      return a.hp - b.hp;
    });
  }

  private tryAttack(aiUnit: Unit, target: Unit, skill?: Skill): AIDecision | null {
    const dist = this.battleMap.getDistance(aiUnit.gridX, aiUnit.gridY, target.gridX, target.gridY);

    if (skill) {
      const inSkillRange = dist <= skill.range;
      const hasLOS = skill.ignoreObstacle || this.battleMap.hasLineOfSight(aiUnit.gridX, aiUnit.gridY, target.gridX, target.gridY);

      if (inSkillRange && hasLOS) {
        return {
          unitId: aiUnit.id,
          action: 'skill',
          targetUnitId: target.id,
          skillId: skill.id
        };
      }
    }

    const inAttackRange = dist <= aiUnit.attackRange;
    const hasLOS = this.battleMap.hasLineOfSight(aiUnit.gridX, aiUnit.gridY, target.gridX, target.gridY);

    if (inAttackRange && hasLOS) {
      return {
        unitId: aiUnit.id,
        action: 'attack',
        targetUnitId: target.id
      };
    }

    return null;
  }

  private tryMove(aiUnit: Unit, target: Unit): AIDecision | null {
    const moveableCells = this.battleMap.getMoveableCells(aiUnit);

    if (moveableCells.length === 0) return null;

    let bestCell = moveableCells[0];
    let bestScore = -Infinity;

    for (const cell of moveableCells) {
      const score = this.evaluateCell(aiUnit, target, cell.x, cell.y);
      if (score > bestScore) {
        bestScore = score;
        bestCell = cell;
      }
    }

    if (bestScore > -Infinity) {
      return {
        unitId: aiUnit.id,
        action: 'move',
        targetX: bestCell.x,
        targetY: bestCell.y
      };
    }

    return null;
  }

  private evaluateCell(aiUnit: Unit, target: Unit, cellX: number, cellY: number): number {
    let score = 0;

    const distanceToTarget = this.battleMap.getDistance(cellX, cellY, target.gridX, target.gridY);
    score -= distanceToTarget * 10;

    if (distanceToTarget <= aiUnit.attackRange) {
      const hasLOS = this.battleMap.hasLineOfSight(cellX, cellY, target.gridX, target.gridY);
      if (hasLOS) {
        score += 100;
      }
    }

    for (const skill of aiUnit.skills) {
      if (skill.currentCooldown === 0 && distanceToTarget <= skill.range) {
        const hasLOS = skill.ignoreObstacle || this.battleMap.hasLineOfSight(cellX, cellY, target.gridX, target.gridY);
        if (hasLOS) {
          score += 150;
        }
      }
    }

    score += Math.random() * 5;

    return score;
  }

  private logDecisionTime(startTime: number): void {
    const elapsed = performance.now() - startTime;
    if (elapsed > 100) {
      console.warn(`AI决策耗时较长: ${elapsed.toFixed(2)}ms`);
    }
  }
}
