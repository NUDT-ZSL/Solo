export type Base = 'A' | 'T' | 'C' | 'G';

export const BASE_COLORS: Record<Base, string> = {
  A: '#FF6B6B',
  T: '#4ECDC4',
  C: '#45B7D1',
  G: '#96CEB4'
};

export const COMPLEMENTARY_BASES: Record<Base, Base> = {
  A: 'T',
  T: 'A',
  C: 'G',
  G: 'C'
};

const ALL_BASES: Base[] = ['A', 'T', 'C', 'G'];

export function getRandomBase(): Base {
  return ALL_BASES[Math.floor(Math.random() * ALL_BASES.length)];
}

export function getRandomSequence(length: number): Base[] {
  const sequence: Base[] = [];
  for (let i = 0; i < length; i++) {
    sequence.push(getRandomBase());
  }
  return sequence;
}

export function getComplementarySequence(sequence: Base[]): Base[] {
  return sequence.map(base => COMPLEMENTARY_BASES[base]);
}

export interface AlignmentResult {
  matches: boolean[];
  matchPercentage: number;
  alignedSeq1: (Base | '-')[];
  alignedSeq2: (Base | '-')[];
}

export function alignSequences(seq1: Base[], seq2: Base[]): AlignmentResult {
  const maxLen = Math.max(seq1.length, seq2.length);
  const alignedSeq1: (Base | '-')[] = [];
  const alignedSeq2: (Base | '-')[] = [];
  const matches: boolean[] = [];
  let matchCount = 0;

  for (let i = 0; i < maxLen; i++) {
    const b1 = i < seq1.length ? seq1[i] : '-';
    const b2 = i < seq2.length ? seq2[i] : '-';
    alignedSeq1.push(b1);
    alignedSeq2.push(b2);

    const isMatch = b1 !== '-' && b2 !== '-' && b1 === b2;
    matches.push(isMatch);
    if (isMatch) {
      matchCount++;
    }
  }

  const matchPercentage = maxLen > 0 ? (matchCount / maxLen) * 100 : 0;

  return {
    matches,
    matchPercentage,
    alignedSeq1,
    alignedSeq2
  };
}

export class DNASequence {
  private bases: Base[] = [];
  private hoverIndex: number = -1;

  constructor(initialBases?: Base[]) {
    if (initialBases) {
      this.bases = [...initialBases];
    }
  }

  getBases(): Base[] {
    return [...this.bases];
  }

  getLength(): number {
    return this.bases.length;
  }

  getComplementary(): Base[] {
    return getComplementarySequence(this.bases);
  }

  setSequence(bases: Base[]): void {
    this.bases = [...bases];
  }

  getHoverIndex(): number {
    return this.hoverIndex;
  }

  setHoverIndex(index: number): void {
    this.hoverIndex = index;
  }

  pointMutation(index: number): Base | null {
    if (index < 0 || index >= this.bases.length) {
      return null;
    }
    const currentBase = this.bases[index];
    let newBase: Base;
    do {
      newBase = getRandomBase();
    } while (newBase === currentBase);
    this.bases[index] = newBase;
    return newBase;
  }

  insertBases(index: number, count: number = 3): Base[] {
    const clampedIndex = Math.max(0, Math.min(index + 1, this.bases.length));
    const newBases = getRandomSequence(count);
    this.bases.splice(clampedIndex, 0, ...newBases);
    return newBases;
  }

  deleteBases(index: number, count: number = 3): Base[] {
    if (index < 0 || index >= this.bases.length) {
      return [];
    }
    const actualCount = Math.min(count, this.bases.length - index);
    const removed = this.bases.splice(index, actualCount);
    return removed;
  }

  getBaseAt(index: number): Base | null {
    if (index < 0 || index >= this.bases.length) {
      return null;
    }
    return this.bases[index];
  }
}

export function generateReferenceSequence(): Base[] {
  return getRandomSequence(40);
}
