import {
  Faction,
  GameState,
  GridCoord,
  Piece,
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

      const moveRange = this.getMoveRange(piece, occupiedPositions);
      const attackableEnemies = this.getAttackableEnemies(piece, enemyPieces, occupiedPositions);

      if (attackableEnemies.length > 0) {
        const afterimageTargets = this.prioritizeAfterimageTargets(piece, attackableEnemies, state);
        if (afterimageTargets.length > 0) {
          const target = afterimageTargets[0];
          actions.push({ type: 'attack', pieceId: piece.id, targetPieceId: target.id });
          unusedPieces.delete(piece.id);
          continue;
        }

        const weakest = this.findWeakestEnemy(attackableEnemies);
        if (weakest) {
          actions.push({ type: 'attack', pieceId: piece.id, targetPieceId: weakest.id });
          unusedPieces.delete(piece.id);
          continue;
        }
      }

      let bestMove: GridCoord | null = null;
      let bestScore = -Infinity;

      for (const move of moveRange) {
        if (this.isTimeout()) break;
        const score = this.evaluateMovePosition(piece, move, enemyPieces, state);
        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }
      }

      if (bestMove && (bestMove.q !== piece.position.q || bestMove.r !== piece.position.r)) {
        actions.push({ type: 'move', pieceId: piece.id, target: bestMove });
        occupiedPositions.delete(coordKey(piece.position));
        occupiedPositions.add(coordKey(bestMove));
      }
    }

    actions.push({ type: 'end' });
    return actions;
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
    enemies: Piece[],
    _occupied: Set<string>
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

  private prioritizeAfterimageTargets(
    piece: Piece,
    enemies: Piece[],
    state: GameState
  ): Piece[] {
    return enemies.filter(enemy => {
      return state.afterimages.some(img => {
        const dx = img.worldX;
        const dy = img.worldY;
        const dist = Math.sqrt(
          Math.pow(dx - (enemy.position.q * 36), 2) +
          Math.pow(dy - (enemy.position.r * 36), 2)
        );
        return dist < 100;
      });
    });
  }

  private findWeakestEnemy(enemies: Piece[]): Piece | null {
    if (enemies.length === 0) return null;
    let weakest = enemies[0];
    for (const e of enemies) {
      if (e.hp < weakest.hp) weakest = e;
    }
    return weakest;
  }

  private evaluateMovePosition(
    piece: Piece,
    pos: GridCoord,
    enemies: Piece[],
    _state: GameState
  ): number {
    const centerQ = 6;
    const centerR = 6;
    const distToCenter = gridDistance(pos, { q: centerQ, r: centerR });

    let minEnemyDist = Infinity;
    for (const e of enemies) {
      const d = gridDistance(pos, e.position);
      if (d < minEnemyDist) minEnemyDist = d;
    }

    const centerScore = -distToCenter * 3;
    let attackScore = 0;
    if (minEnemyDist <= piece.attackRange) {
      attackScore = 20 - (minEnemyDist * 2);
    }
    const approachScore = minEnemyDist < Infinity ? -minEnemyDist * 1.5 : 0;

    return centerScore + attackScore + approachScore;
  }
}
