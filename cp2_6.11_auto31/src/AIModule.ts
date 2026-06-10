import {
  Faction,
  GameState,
  GridCoord,
  Piece,
  Afterimage,
  gridDistance,
  HEX_DIRECTIONS,
  isInBoard,
  coordKey,
} from './types';

export interface AIAction {
  type: 'move' | 'attack' | 'end';
  pieceId?: string;
  target?: GridCoord;
  targetPieceId?: string;
}

export class AIModule {
  private startTime = 0;
  private readonly MAX_TIME_MS = 200;

  public decide(state: GameState, faction: Faction): AIAction[] {
    this.startTime = performance.now();
    const actions: AIAction[] = [];
    const myPieces = state.pieces.filter(p => p.faction === faction && p.hp > 0);
    const enemyPieces = state.pieces.filter(p => p.faction !== faction && p.hp > 0);

    const unusedPieces = new Set(myPieces.map(p => p.id));
    const occupiedPositions = new Set(
      state.pieces.filter(p => p.hp > 0).map(p => coordKey(p.position))
    );

    for (const piece of myPieces) {
      if (!unusedPieces.has(piece.id)) continue;
      if (this.isTimeout()) break;

      const attackableEnemies = this.getAttackableEnemies(piece, enemyPieces);

      if (attackableEnemies.length > 0) {
        const target = this.chooseAttackTarget(piece, attackableEnemies, state, faction);
        if (target) {
          actions.push({ type: 'attack', pieceId: piece.id, targetPieceId: target.id });
          unusedPieces.delete(piece.id);
          continue;
        }
      }

      const moveRange = this.getMoveRange(piece, occupiedPositions);
      const bestMove = this.chooseBestMove(piece, moveRange, enemyPieces, state, faction);

      if (bestMove && (bestMove.q !== piece.position.q || bestMove.r !== piece.position.r)) {
        actions.push({ type: 'move', pieceId: piece.id, target: bestMove });
        occupiedPositions.delete(coordKey(piece.position));
        occupiedPositions.add(coordKey(bestMove));
      }
    }

    actions.push({ type: 'end' });
    return actions;
  }

  private chooseAttackTarget(
    piece: Piece,
    attackableEnemies: Piece[],
    state: GameState,
    faction: Faction
  ): Piece | null {
    if (attackableEnemies.length === 0) return null;

    const afterimageScores = this.scoreEnemiesByAfterimageProximity(attackableEnemies, state, faction);
    const afterimageTargets = afterimageScores.filter(s => s.score > 0);

    if (afterimageTargets.length > 0) {
      afterimageTargets.sort((a, b) => b.score - a.score);
      return afterimageTargets[0].enemy;
    }

    return this.findWeakestEnemy(attackableEnemies);
  }

  private scoreEnemiesByAfterimageProximity(
    enemies: Piece[],
    state: GameState,
    faction: Faction
  ): { enemy: Piece; score: number }[] {
    const friendlyAfterimages = state.afterimages.filter(img => img.faction === faction);

    return enemies.map(enemy => {
      let minDist = Infinity;
      const enemyWorld = this.gridToWorldApprox(enemy.position);

      for (const img of friendlyAfterimages) {
        const dist = Math.hypot(img.worldX - enemyWorld.x, img.worldY - enemyWorld.y);
        if (dist < minDist) {
          minDist = dist;
        }
      }

      if (minDist === Infinity || minDist >= 150) {
        return { enemy, score: 0 };
      }

      const score = Math.max(0, 150 - minDist);
      return { enemy, score };
    });
  }

  private gridToWorldApprox(g: GridCoord): { x: number; y: number } {
    const cos30 = Math.cos(Math.PI / 6);
    const sin30 = Math.sin(Math.PI / 6);
    const step = 36;
    const x = step * (cos30 * g.q + cos30 * 0.5 * g.r);
    const y = step * (sin30 * g.r);
    return { x, y };
  }

  private chooseBestMove(
    piece: Piece,
    moveRange: GridCoord[],
    enemies: Piece[],
    state: GameState,
    faction: Faction
  ): GridCoord | null {
    if (moveRange.length === 0) return null;

    let bestMove: GridCoord | null = null;
    let bestScore = -Infinity;

    for (const move of moveRange) {
      if (this.isTimeout()) break;
      const score = this.evaluateMovePosition(piece, move, enemies, state, faction);
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
  }

  private evaluateMovePosition(
    piece: Piece,
    pos: GridCoord,
    enemies: Piece[],
    state: GameState,
    faction: Faction
  ): number {
    const centerQ = 6;
    const centerR = 6;
    const distToCenter = gridDistance(pos, { q: centerQ, r: centerR });
    const centerScore = -distToCenter * 5;

    let minEnemyDist = Infinity;
    for (const e of enemies) {
      const d = gridDistance(pos, e.position);
      if (d < minEnemyDist) minEnemyDist = d;
    }

    let attackScore = 0;
    if (minEnemyDist <= piece.attackRange) {
      attackScore = 30 - minEnemyDist * 3;
    }

    const approachScore = minEnemyDist < Infinity ? -minEnemyDist * 1 : 0;

    let afterimageScore = 0;
    const friendlyAfterimages = state.afterimages.filter(img => img.faction === faction);
    if (friendlyAfterimages.length > 0) {
      let minAfterimageDist = Infinity;
      const posWorld = this.gridToWorldApprox(pos);
      for (const img of friendlyAfterimages) {
        const d = Math.hypot(img.worldX - posWorld.x, img.worldY - posWorld.y);
        if (d < minAfterimageDist) minAfterimageDist = d;
      }
      if (minAfterimageDist < Infinity && minAfterimageDist < 200) {
        afterimageScore = (200 - minAfterimageDist) * 0.05;
      }
    }

    return centerScore + attackScore + approachScore + afterimageScore;
  }

  private isTimeout(): boolean {
    return performance.now() - this.startTime >= this.MAX_TIME_MS;
  }

  private getMoveRange(piece: Piece, occupied: Set<string>): GridCoord[] {
    const visited = new Map<string, number>();
    const queue: { coord: GridCoord; depth: number }[] = [{ coord: piece.position, depth: 0 }];
    const result: GridCoord[] = [piece.position];
    visited.set(coordKey(piece.position), 0);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.depth >= piece.moveRange) continue;

      for (const dir of HEX_DIRECTIONS) {
        const next: GridCoord = { q: current.coord.q + dir.q, r: current.coord.r + dir.r };
        const key = coordKey(next);
        if (!isInBoard(next)) continue;
        if (visited.has(key)) continue;
        if (occupied.has(key)) continue;

        visited.set(key, current.depth + 1);
        result.push(next);
        queue.push({ coord: next, depth: current.depth + 1 });
      }
    }

    return result;
  }

  private getAttackableEnemies(
    piece: Piece,
    enemies: Piece[]
  ): Piece[] {
    const result: Piece[] = [];
    for (const enemy of enemies) {
      const dist = gridDistance(piece.position, enemy.position);
      if (dist <= piece.attackRange) {
        result.push(enemy);
      }
    }
    return result;
  }

  private findWeakestEnemy(enemies: Piece[]): Piece | null {
    if (enemies.length === 0) return null;
    let weakest = enemies[0];
    for (const e of enemies) {
      if (e.hp < weakest.hp) weakest = e;
    }
    return weakest;
  }
}
