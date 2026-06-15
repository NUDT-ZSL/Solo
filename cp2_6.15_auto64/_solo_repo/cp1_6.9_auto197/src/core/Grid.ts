export enum PillarColor {
  RED = 0,
  GREEN = 1,
  BLUE = 2,
  PURPLE = 3,
}

export const PILLAR_COLOR_HEX: Record<PillarColor, string> = {
  [PillarColor.RED]: '#FF4444',
  [PillarColor.GREEN]: '#44FF44',
  [PillarColor.BLUE]: '#4444FF',
  [PillarColor.PURPLE]: '#FF44FF',
};

export interface Pillar {
  row: number;
  col: number;
  color: PillarColor;
  extinguished: boolean;
  brightness: number;
  flashPhase: number;
  extinguishStartTime: number;
  colorChangeTime: number;
}

export interface GridSnapshot {
  pillars: Pillar[][];
}

const DIRS: Array<[number, number]> = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

function clonePillar(p: Pillar): Pillar {
  return { ...p };
}

function cloneMatrix(m: Pillar[][]): Pillar[][] {
  return m.map((row) => row.map(clonePillar));
}

export class Grid {
  private _size: number;
  private _level: number;
  private pillars: Pillar[][];

  constructor(level: number) {
    this._level = level;
    this._size = Math.min(4 + Math.floor((level - 1) / 1), 6);
    this.pillars = this.generate();
  }

  get size(): number {
    return this._size;
  }

  get level(): number {
    return this._level;
  }

  getPillar(row: number, col: number): Readonly<Pillar> | null {
    if (row < 0 || row >= this._size || col < 0 || col >= this._size) return null;
    return this.pillars[row][col];
  }

  getAllPillars(): Readonly<Pillar>[][] {
    return this.pillars;
  }

  snapshot(): GridSnapshot {
    return { pillars: cloneMatrix(this.pillars) };
  }

  restore(snap: GridSnapshot): void {
    this.pillars = cloneMatrix(snap.pillars);
  }

  isAllExtinguished(): boolean {
    for (let r = 0; r < this._size; r++) {
      for (let c = 0; c < this._size; c++) {
        if (!this.pillars[r][c].extinguished) return false;
      }
    }
    return true;
  }

  hitPillar(row: number, col: number, now: number): { hit: boolean; changed: Array<[number, number]> } {
    const p = this.pillars[row]?.[col];
    if (!p || p.extinguished) return { hit: false, changed: [] };
    const changed: Array<[number, number]> = [];
    p.extinguished = true;
    p.brightness = 1.0;
    p.extinguishStartTime = now;
    changed.push([row, col]);
    for (const [dr, dc] of DIRS) {
      const nr = row + dr;
      const nc = col + dc;
      const np = this.pillars[nr]?.[nc];
      if (np && !np.extinguished) {
        np.color = ((np.color + 1) % 4) as PillarColor;
        np.colorChangeTime = now;
        changed.push([nr, nc]);
      }
    }
    return { hit: true, changed };
  }

  updateBrightness(now: number): void {
    for (let r = 0; r < this._size; r++) {
      for (let c = 0; c < this._size; c++) {
        const p = this.pillars[r][c];
        if (p.extinguished) {
          const t = (now - p.extinguishStartTime) / 500;
          if (t >= 1) {
            p.brightness = 0.1;
          } else {
            p.brightness = 1.0 - 0.9 * t;
          }
        } else {
          p.brightness = 1.0;
        }
        const flashCycle = 3000;
        const t = (now % flashCycle) / flashCycle;
        const flashWindow = 0.2 / 3;
        const center = 0.5;
        if (Math.abs(t - center) < flashWindow) {
          const phase = (t - (center - flashWindow)) / (flashWindow * 2);
          p.flashPhase = Math.sin(phase * Math.PI) * 10;
        } else {
          p.flashPhase = 0;
        }
      }
    }
  }

  private generate(): Pillar[][] {
    const N = this._size;
    const matrix: Pillar[][] = [];
    for (let r = 0; r < N; r++) {
      const row: Pillar[] = [];
      for (let c = 0; c < N; c++) {
        row.push({
          row: r,
          col: c,
          color: PillarColor.RED,
          extinguished: true,
          brightness: 0.1,
          flashPhase: 0,
          extinguishStartTime: 0,
          colorChangeTime: 0,
        });
      }
      matrix.push(row);
    }
    const K = N + Math.floor(Math.random() * (N + 1));
    const triggerSeq: Array<[number, number]> = [];
    for (let i = 0; i < K; i++) {
      const r = Math.floor(Math.random() * N);
      const c = Math.floor(Math.random() * N);
      triggerSeq.push([r, c]);
    }
    const randColor = (): PillarColor => Math.floor(Math.random() * 4) as PillarColor;
    for (const [r, c] of triggerSeq) {
      const p = matrix[r][c];
      if (p.extinguished) {
        p.extinguished = false;
        p.brightness = 1.0;
      }
      p.color = randColor();
      for (const [dr, dc] of DIRS) {
        const nr = r + dr;
        const nc = c + dc;
        const np = matrix[nr]?.[nc];
        if (np && !np.extinguished) {
          np.color = ((np.color + 3) % 4) as PillarColor;
        }
      }
    }
    let allExt = true;
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (!matrix[r][c].extinguished) {
          allExt = false;
          break;
        }
      }
      if (!allExt) break;
    }
    if (allExt) {
      matrix[0][0].extinguished = false;
      matrix[0][0].color = PillarColor.RED;
      matrix[0][0].brightness = 1.0;
    }
    return matrix;
  }
}
