import { TowerType } from '../entities/Tower';

export interface SpellResult {
  matched: boolean;
  type: TowerType | null;
  confidence: number;
  word: string;
}

interface RunePattern {
  word: string;
  type: TowerType;
  directions: number[];
  minStrokes: number;
}

const PATTERNS: RunePattern[] = [
  {
    word: 'FIRE',
    type: 'fire',
    directions: [270, 0, 270, 90],
    minStrokes: 3,
  },
  {
    word: 'ICE',
    type: 'ice',
    directions: [315, 225, 315],
    minStrokes: 3,
  },
  {
    word: 'BOLT',
    type: 'lightning',
    directions: [315, 225, 315, 225],
    minStrokes: 4,
  },
];

const DIR_SECTORS = 8;
const SECTOR_ANGLE = 360 / DIR_SECTORS;
const DIR_NAMES = ['E', 'NE', 'N', 'NW', 'W', 'SW', 'S', 'SE'];
const DIR_MAP: Record<string, number> = {
  E: 0,
  NE: 45,
  N: 90,
  NW: 135,
  W: 180,
  SW: 225,
  S: 270,
  SE: 315,
};

export class SpellManager {
  private points: { x: number; y: number }[] = [];
  private isDrawing: boolean = false;

  public startDrawing(): void {
    this.points = [];
    this.isDrawing = true;
  }

  public addPoint(x: number, y: number): void {
    if (!this.isDrawing) return;
    if (this.points.length > 0) {
      const last = this.points[this.points.length - 1];
      const dist = Math.sqrt((x - last.x) ** 2 + (y - last.y) ** 2);
      if (dist < 5) return;
    }
    this.points.push({ x, y });
  }

  public endDrawing(): SpellResult {
    this.isDrawing = false;

    if (this.points.length < 5) {
      return { matched: false, type: null, confidence: 0, word: '' };
    }

    const strokeDirs = this.extractDirections();
    const result = this.matchPattern(strokeDirs);
    return result;
  }

  public getIsDrawing(): boolean {
    return this.isDrawing;
  }

  public getPoints(): { x: number; y: number }[] {
    return [...this.points];
  }

  private extractDirections(): number[] {
    const simplified = this.simplifyPoints();
    const dirs: number[] = [];

    for (let i = 1; i < simplified.length; i++) {
      const dx = simplified[i].x - simplified[i - 1].x;
      const dy = simplified[i].y - simplified[i - 1].y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 8) continue;

      let angle = (Math.atan2(-dy, dx) * 180) / Math.PI;
      if (angle < 0) angle += 360;

      const sector = Math.round(angle / SECTOR_ANGLE) % DIR_SECTORS;
      const dirName = DIR_NAMES[sector];
      dirs.push(DIR_MAP[dirName]);
    }

    return this.mergeConsecutive(dirs);
  }

  private simplifyPoints(): { x: number; y: number }[] {
    if (this.points.length <= 2) return this.points;

    const result: { x: number; y: number }[] = [this.points[0]];

    for (let i = 1; i < this.points.length - 1; i++) {
      const prev = result[result.length - 1];
      const curr = this.points[i];
      const next = this.points[i + 1];

      const v1x = curr.x - prev.x;
      const v1y = curr.y - prev.y;
      const v2x = next.x - curr.x;
      const v2y = next.y - curr.y;

      const len1 = Math.sqrt(v1x * v1x + v1y * v1y);
      const len2 = Math.sqrt(v2x * v2x + v2y * v2y);

      if (len1 > 0 && len2 > 0) {
        const dot = (v1x * v2x + v1y * v2y) / (len1 * len2);
        if (dot < 0.85) {
          result.push(curr);
        }
      }
    }

    result.push(this.points[this.points.length - 1]);
    return result;
  }

  private mergeConsecutive(dirs: number[]): number[] {
    if (dirs.length === 0) return dirs;
    const result: number[] = [dirs[0]];
    for (let i = 1; i < dirs.length; i++) {
      if (dirs[i] !== result[result.length - 1]) {
        result.push(dirs[i]);
      }
    }
    return result;
  }

  private matchPattern(strokeDirs: number[]): SpellResult {
    let bestMatch: SpellResult = { matched: false, type: null, confidence: 0, word: '' };

    for (const pattern of PATTERNS) {
      const similarity = this.computeSimilarity(strokeDirs, pattern.directions);
      const confidence = similarity;

      if (confidence > 0.4 && confidence > bestMatch.confidence) {
        bestMatch = {
          matched: true,
          type: pattern.type,
          confidence,
          word: pattern.word,
        };
      }
    }

    return bestMatch;
  }

  private computeSimilarity(input: number[], pattern: number[]): number {
    if (input.length === 0 || pattern.length === 0) return 0;

    const lenDiff = Math.abs(input.length - pattern.length);
    const maxLen = Math.max(input.length, pattern.length);

    if (lenDiff > maxLen * 0.5) return 0;

    const minLen = Math.min(input.length, pattern.length);
    let totalDiff = 0;

    const step = input.length / minLen;
    for (let i = 0; i < minLen; i++) {
      const inputIdx = Math.min(Math.floor(i * step), input.length - 1);
      const diff = this.angleDiff(input[inputIdx], pattern[i % pattern.length]);
      totalDiff += diff;
    }

    const avgDiff = totalDiff / minLen;
    return Math.max(0, 1 - avgDiff / 180);
  }

  private angleDiff(a: number, b: number): number {
    let diff = Math.abs(a - b);
    if (diff > 180) diff = 360 - diff;
    return diff;
  }

  public static getSpellInfo(): { word: string; type: TowerType; hint: string }[] {
    return [
      { word: 'FIRE', type: 'fire', hint: '向下→向右→向下→向上 绘制火焰符文' },
      { word: 'ICE', type: 'ice', hint: '锯齿形 绘制冰霜符文' },
      { word: 'BOLT', type: 'lightning', hint: '连续锯齿 绘制闪电符文' },
    ];
  }
}
