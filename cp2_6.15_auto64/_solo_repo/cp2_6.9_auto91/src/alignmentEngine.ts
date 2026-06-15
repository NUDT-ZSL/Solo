export type SequenceType = 'DNA' | 'RNA';

export type AlignmentState = 'match' | 'mismatch' | 'gap_seq1' | 'gap_seq2';

export interface AlignmentCell {
  score: number;
  i: number;
  j: number;
  state: AlignmentState;
}

export interface AlignmentResult {
  score: number;
  matches: number;
  mismatches: number;
  gaps: number;
  path: AlignmentCell[];
  alignedSeq1: string;
  alignedSeq2: string;
  scoreMatrix: number[][];
}

export interface ScoringParams {
  match: number;
  mismatch: number;
  gapOpen: number;
  gapExtend: number;
}

const DEFAULT_SCORING: ScoringParams = {
  match: 2,
  mismatch: -1,
  gapOpen: -2,
  gapExtend: -1,
};

export class AlignmentEngine {
  private scoring: ScoringParams;

  constructor(scoring: Partial<ScoringParams> = {}) {
    this.scoring = { ...DEFAULT_SCORING, ...scoring };
  }

  private isValidBase(c: string, type: SequenceType): boolean {
    if (type === 'DNA') {
      return 'ATCG'.includes(c.toUpperCase());
    }
    return 'AUCG'.includes(c.toUpperCase());
  }

  sanitizeSequence(seq: string, type: SequenceType): { clean: string; invalidIndices: number[] } {
    const clean: string[] = [];
    const invalidIndices: number[] = [];
    for (let i = 0; i < seq.length; i++) {
      const c = seq[i].toUpperCase();
      if (this.isValidBase(c, type)) {
        clean.push(c);
      } else {
        invalidIndices.push(i);
      }
    }
    return { clean: clean.join(''), invalidIndices };
  }

  calculateGC(seq: string): number {
    if (seq.length === 0) return 0;
    let gc = 0;
    for (let i = 0; i < seq.length; i++) {
      const c = seq[i].toUpperCase();
      if (c === 'G' || c === 'C') gc++;
    }
    return (gc / seq.length) * 100;
  }

  align(seq1: string, seq2: string): AlignmentResult {
    const s1 = seq1.toUpperCase();
    const s2 = seq2.toUpperCase();
    const m = s1.length;
    const n = s2.length;

    const scoreMatrix: number[][] = Array(m + 1)
      .fill(0)
      .map(() => Array(n + 1).fill(0));

    const traceback: (AlignmentCell | null)[][] = Array(m + 1)
      .fill(0)
      .map(() => Array(n + 1).fill(null));

    let maxScore = 0;
    let maxI = 0;
    let maxJ = 0;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const matchScore =
          s1[i - 1] === s2[j - 1] ? this.scoring.match : this.scoring.mismatch;

        const diag = scoreMatrix[i - 1][j - 1] + matchScore;
        const up = scoreMatrix[i - 1][j] + (traceback[i - 1][j]?.state === 'gap_seq1'
          ? this.scoring.gapExtend
          : this.scoring.gapOpen);
        const left = scoreMatrix[i][j - 1] + (traceback[i][j - 1]?.state === 'gap_seq2'
          ? this.scoring.gapExtend
          : this.scoring.gapOpen);

        const max = Math.max(diag, up, left, 0);
        scoreMatrix[i][j] = max;

        if (max === diag && max > 0) {
          traceback[i][j] = {
            score: max,
            i: i - 1,
            j: j - 1,
            state: s1[i - 1] === s2[j - 1] ? 'match' : 'mismatch',
          };
        } else if (max === up && max > 0) {
          traceback[i][j] = { score: max, i: i - 1, j, state: 'gap_seq2' };
        } else if (max === left && max > 0) {
          traceback[i][j] = { score: max, i, j: j - 1, state: 'gap_seq1' };
        }

        if (max > maxScore) {
          maxScore = max;
          maxI = i;
          maxJ = j;
        }
      }
    }

    const path: AlignmentCell[] = [];
    let ci = maxI;
    let cj = maxJ;
    while (traceback[ci][cj] !== null && scoreMatrix[ci][cj] > 0) {
      const cell = traceback[ci][cj]!;
      path.push({ ...cell, i: ci, j: cj });
      ci = cell.i;
      cj = cell.j;
    }
    path.reverse();

    let alignedSeq1 = '';
    let alignedSeq2 = '';
    let matches = 0;
    let mismatches = 0;
    let gaps = 0;

    for (const cell of path) {
      if (cell.state === 'match') {
        alignedSeq1 += s1[cell.i - 1];
        alignedSeq2 += s2[cell.j - 1];
        matches++;
      } else if (cell.state === 'mismatch') {
        alignedSeq1 += s1[cell.i - 1];
        alignedSeq2 += s2[cell.j - 1];
        mismatches++;
      } else if (cell.state === 'gap_seq1') {
        alignedSeq1 += '-';
        alignedSeq2 += s2[cell.j - 1];
        gaps++;
      } else if (cell.state === 'gap_seq2') {
        alignedSeq1 += s1[cell.i - 1];
        alignedSeq2 += '-';
        gaps++;
      }
    }

    return {
      score: maxScore,
      matches,
      mismatches,
      gaps,
      path,
      alignedSeq1,
      alignedSeq2,
      scoreMatrix,
    };
  }

  getComplement(base: string, type: SequenceType): string {
    const upper = base.toUpperCase();
    const comp: Record<string, string> =
      type === 'DNA'
        ? { A: 'T', T: 'A', C: 'G', G: 'C' }
        : { A: 'U', U: 'A', C: 'G', G: 'C' };
    return comp[upper] || base;
  }
}
