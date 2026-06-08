import {
  BOARD_COLS,
  BOARD_ROWS,
  RUNE_COUNT,
  RUNE_ACTIVATION_COUNT,
  RUNE_ACTIVE_TURNS,
  CENTER_RUNE_CELLS,
  RuneType,
  RUNE_EFFECTS,
} from '../utils/constants';

export interface RuneData {
  col: number;
  row: number;
  type: RuneType;
  active: boolean;
  activeTurnsRemaining: number;
}

export class RuneSystem {
  private runes: RuneData[] = [];
  private runeTypes: RuneType[] = Object.values(RuneType) as RuneType[];

  public generateRunes(): RuneData[] {
    this.runes = [];
    const usedPositions = new Set<string>();
    const centerKeys = new Set(CENTER_RUNE_CELLS.map((c) => `${c.col},${c.row}`));

    let attempts = 0;
    while (this.runes.length < RUNE_COUNT && attempts < 200) {
      const col = Math.floor(Math.random() * BOARD_COLS);
      const row = Math.floor(Math.random() * BOARD_ROWS);
      const key = `${col},${row}`;

      if (usedPositions.has(key) || centerKeys.has(key)) {
        attempts++;
        continue;
      }

      usedPositions.add(key);
      const type = this.runeTypes[Math.floor(Math.random() * this.runeTypes.length)];
      this.runes.push({
        col,
        row,
        type,
        active: false,
        activeTurnsRemaining: 0,
      });
      attempts++;
    }

    return this.runes;
  }

  public activateRandomRunes(): RuneData[] {
    const inactiveRunes = this.runes.filter((r) => !r.active);
    const toActivate: RuneData[] = [];
    const count = Math.min(RUNE_ACTIVATION_COUNT, inactiveRunes.length);

    const shuffled = [...inactiveRunes].sort(() => Math.random() - 0.5);
    for (let i = 0; i < count; i++) {
      const rune = shuffled[i];
      rune.active = true;
      rune.activeTurnsRemaining = RUNE_ACTIVE_TURNS;
      toActivate.push(rune);
    }

    return toActivate;
  }

  public tickActiveRunes(): void {
    for (const rune of this.runes) {
      if (rune.active) {
        rune.activeTurnsRemaining--;
        if (rune.activeTurnsRemaining <= 0) {
          rune.active = false;
        }
      }
    }
  }

  public getRuneAt(col: number, row: number): RuneData | undefined {
    return this.runes.find((r) => r.col === col && r.row === row);
  }

  public isCenterRune(col: number, row: number): boolean {
    return CENTER_RUNE_CELLS.some((c) => c.col === col && c.row === row);
  }

  public getAllRunes(): RuneData[] {
    return [...this.runes];
  }

  public getActiveRunes(): RuneData[] {
    return this.runes.filter((r) => r.active);
  }

  public getRuneColor(type: RuneType): number {
    switch (type) {
      case RuneType.HEAL:
        return 0x44ff88;
      case RuneType.DAMAGE_BOOST:
        return 0xff8844;
      case RuneType.SHIELD:
        return 0x44aaff;
      case RuneType.DAMAGE:
        return 0xff4444;
      case RuneType.SLOW:
        return 0x8844ff;
      default:
        return 0xffffff;
    }
  }

  public reset(): void {
    this.runes = [];
  }
}
