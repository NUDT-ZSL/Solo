import { Piece, Position, RecordedAction, PIECE_CONFIGS, PieceType } from '../entities/Piece';

export interface Shadow {
  id: string;
  sourcePieceId: string;
  playerId: number;
  pieceType: PieceType;
  position: Position;
  turnsRemaining: number;
  action: RecordedAction;
  sprite: Phaser.GameObjects.Container | null;
}

export class ShadowSystem {
  public shadows: Map<string, Shadow[]>;
  public readonly MAX_SHADOW_TURNS = 3;
  private static nextShadowId = 0;

  constructor() {
    this.shadows = new Map();
  }

  private getCellKey(pos: Position): string {
    return `${pos.x}_${pos.y}`;
  }

  public hasShadowAt(pos: Position): boolean {
    const key = this.getCellKey(pos);
    const list = this.shadows.get(key);
    return list !== undefined && list.length > 0;
  }

  public getShadowsAt(pos: Position): Shadow[] {
    const key = this.getCellKey(pos);
    return this.shadows.get(key) || [];
  }

  public getAllShadows(): Shadow[] {
    const result: Shadow[] = [];
    for (const list of this.shadows.values()) {
      result.push(...list);
    }
    return result;
  }

  public createShadow(
    piece: Piece,
    position: Position,
    action: RecordedAction
  ): Shadow | null {
    if (this.hasShadowAt(position)) {
      return null;
    }

    const shadow: Shadow = {
      id: `shadow_${ShadowSystem.nextShadowId++}`,
      sourcePieceId: piece.id,
      playerId: piece.playerId,
      pieceType: piece.type,
      position: { ...position },
      turnsRemaining: this.MAX_SHADOW_TURNS,
      action: JSON.parse(JSON.stringify(action)),
      sprite: null
    };

    const key = this.getCellKey(position);
    if (!this.shadows.has(key)) {
      this.shadows.set(key, []);
    }
    this.shadows.get(key)!.push(shadow);

    piece.shadowCount++;

    return shadow;
  }

  public removeShadow(shadow: Shadow): void {
    const key = this.getCellKey(shadow.position);
    const list = this.shadows.get(key);
    if (!list) return;
    const idx = list.findIndex(s => s.id === shadow.id);
    if (idx >= 0) {
      list.splice(idx, 1);
    }
    if (list.length === 0) {
      this.shadows.delete(key);
    }
  }

  public getPiecesShadowCount(pieceId: string): number {
    let count = 0;
    for (const list of this.shadows.values()) {
      for (const s of list) {
        if (s.sourcePieceId === pieceId) count++;
      }
    }
    return count;
  }

  public onTurnEnd(callback: (shadow: Shadow, action: RecordedAction) => {
    movedTo?: Position;
    attackedTargetId?: string;
  }[]): void {
    const expiredShadows: Shadow[] = [];
    const executeResults: Array<{
      shadow: Shadow;
      action: RecordedAction;
      result: ReturnType<typeof callback>[0];
    }> = [];

    for (const list of this.shadows.values()) {
      for (const shadow of list) {
        shadow.turnsRemaining--;
        if (shadow.turnsRemaining <= 0) {
          expiredShadows.push(shadow);
        }
      }
    }

    for (const shadow of expiredShadows) {
      const results = callback(shadow, shadow.action);
      if (results && results.length > 0) {
        for (const r of results) {
          executeResults.push({ shadow, action: shadow.action, result: r });
        }
      }
      this.removeShadow(shadow);
    }
  }

  public tickShadows(): Shadow[] {
    const expiring: Shadow[] = [];
    for (const list of this.shadows.values()) {
      for (const shadow of list) {
        shadow.turnsRemaining--;
        if (shadow.turnsRemaining <= 0) {
          expiring.push(shadow);
        }
      }
    }
    return expiring;
  }

  public clearAll(): void {
    this.shadows.clear();
  }
}
