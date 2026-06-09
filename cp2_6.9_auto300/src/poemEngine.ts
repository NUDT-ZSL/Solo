export interface Poem {
  id: number;
  text: string;
  keywords: string[];
  description: string;
}

export interface FragmentData {
  id: string;
  char: string;
  poemId: number;
  positionInPoem: number;
}

export interface FragmentGroup {
  id: string;
  fragmentIds: string[];
  x: number;
  y: number;
}

const POEMS: Poem[] = [
  { id: 1, text: '床前明月光', keywords: ['明月', '光'], description: '静夜思乡' },
  { id: 2, text: '疑是地上霜', keywords: ['霜', '地'], description: '秋夜寒霜' },
  { id: 3, text: '举头望明月', keywords: ['明月', '望'], description: '望月怀远' },
  { id: 4, text: '低头思故乡', keywords: ['故乡', '思'], description: '思念故土' },
  { id: 5, text: '白日依山尽', keywords: ['白日', '山'], description: '落日余晖' },
  { id: 6, text: '黄河入海流', keywords: ['黄河', '海', '流'], description: '江河奔流' },
  { id: 7, text: '欲穷千里目', keywords: ['千里', '目'], description: '登高望远' },
  { id: 8, text: '更上一层楼', keywords: ['楼', '上'], description: '更上层楼' },
  { id: 9, text: '春眠不觉晓', keywords: ['春', '眠', '晓'], description: '春日晨曦' },
  { id: 10, text: '处处闻啼鸟', keywords: ['鸟', '啼', '闻'], description: '鸟语花香' }
];

export class PoemEngine {
  private poems: Poem[] = [];
  private fragments: FragmentData[] = [];
  private completedPoemIds: Set<number> = new Set();
  private currentActiveFragmentIds: string[] = [];

  constructor() {
    this.poems = [...POEMS];
    this.initFragments();
  }

  private initFragments(): void {
    const allFragments: FragmentData[] = [];
    for (const poem of this.poems) {
      for (let i = 0; i < poem.text.length; i++) {
        allFragments.push({
          id: `p${poem.id}-${i}`,
          char: poem.text[i],
          poemId: poem.id,
          positionInPoem: i
        });
      }
    }
    this.fragments = allFragments;
    this.currentActiveFragmentIds = this.fragments.map(f => f.id);
  }

  getPoems(): Poem[] {
    return this.poems;
  }

  getTotalPoems(): number {
    return this.poems.length;
  }

  getCompletedCount(): number {
    return this.completedPoemIds.size;
  }

  isAllCompleted(): boolean {
    return this.completedPoemIds.size === this.poems.length;
  }

  getFragmentById(id: string): FragmentData | undefined {
    return this.fragments.find(f => f.id === id);
  }

  getFragmentsForNextBatch(): FragmentData[] {
    const available = this.fragments.filter(
      f => !this.completedPoemIds.has(f.poemId)
    );
    const usedPoemIds = new Set<number>();
    const result: FragmentData[] = [];
    
    for (const frag of available) {
      if (!usedPoemIds.has(frag.poemId) && result.length < 10) {
        const poemFragments = available.filter(f => f.poemId === frag.poemId);
        const needed = Math.min(poemFragments.length, 10 - result.length);
        result.push(...poemFragments.slice(0, needed));
        usedPoemIds.add(frag.poemId);
        if (result.length >= 10) break;
      }
    }
    
    return result.slice(0, 10);
  }

  checkGroupFormsPoem(charSequence: string[]): Poem | null {
    if (charSequence.length < 5) return null;
    const joined = charSequence.join('');
    for (const poem of this.poems) {
      if (poem.text === joined && !this.completedPoemIds.has(poem.id)) {
        return poem;
      }
    }
    return null;
  }

  markPoemCompleted(poemId: number): void {
    this.completedPoemIds.add(poemId);
  }

  getCompletedPoems(): Poem[] {
    return this.poems.filter(p => this.completedPoemIds.has(p.id));
  }

  areFragmentsAdjacentInPoem(frag1Id: string, frag2Id: string): boolean {
    const f1 = this.getFragmentById(frag1Id);
    const f2 = this.getFragmentById(frag2Id);
    if (!f1 || !f2) return false;
    if (f1.poemId !== f2.poemId) return false;
    return Math.abs(f1.positionInPoem - f2.positionInPoem) === 1;
  }

  getPoemById(id: number): Poem | undefined {
    return this.poems.find(p => p.id === id);
  }
}
