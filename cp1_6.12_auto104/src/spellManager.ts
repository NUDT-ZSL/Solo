const WORD_POOL: string[] = [
  'cat', 'dog', 'sun', 'moon', 'star', 'fire', 'water',
  'earth', 'wind', 'storm', 'magic', 'spell', 'power',
  'light', 'shadow', 'dragon', 'phoenix', 'wizard',
  'knight', 'castle', 'forest', 'mountain', 'ocean',
  'thunder', 'frost', 'flame', 'crystal', 'ancient',
  'mystic', 'arcane', 'rune', 'mana', 'element',
  'spirit', 'familiar', 'grimoire', 'potion', 'enchant',
  'curse', 'blessing', 'divine', 'chaos', 'order'
];

export interface SpellResult {
  player: 'blue' | 'red';
  correct: boolean;
  complete: boolean;
  progress: number;
}

export class SpellManager {
  private currentWord: string = '';
  private shuffledLetters: string[] = [];
  private blueProgress: number = 0;
  private redProgress: number = 0;

  constructor() {
    this.pickNewWord();
  }

  pickNewWord(): void {
    let word: string;
    do {
      word = WORD_POOL[Math.floor(Math.random() * WORD_POOL.length)];
    } while (word === this.currentWord);
    this.currentWord = word;
    this.shuffledLetters = this.shuffle(word.split(''));
    this.blueProgress = 0;
    this.redProgress = 0;
  }

  private shuffle(arr: string[]): string[] {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    const original = arr.join('');
    if (result.join('') === original && result.length > 1) {
      const allSame = result.every(c => c === result[0]);
      if (!allSame) {
        let swapIdx = 1;
        while (swapIdx < result.length && result[swapIdx] === result[0]) {
          swapIdx++;
        }
        [result[0], result[swapIdx]] = [result[swapIdx], result[0]];
      }
    }
    return result;
  }

  getCurrentWord(): string {
    return this.currentWord;
  }

  getShuffledLetters(): string[] {
    return [...this.shuffledLetters];
  }

  getProgress(player: 'blue' | 'red'): number {
    return player === 'blue' ? this.blueProgress : this.redProgress;
  }

  resetProgressHalf(player: 'blue' | 'red'): void {
    if (player === 'blue') {
      this.blueProgress = Math.floor(this.blueProgress / 2);
    } else {
      this.redProgress = Math.floor(this.redProgress / 2);
    }
  }

  resetProgressFull(player: 'blue' | 'red'): void {
    if (player === 'blue') {
      this.blueProgress = 0;
    } else {
      this.redProgress = 0;
    }
  }

  handleInput(player: 'blue' | 'red', key: string): SpellResult {
    const progress = player === 'blue' ? this.blueProgress : this.redProgress;
    const expected = this.currentWord[progress]?.toLowerCase();
    const input = key.toLowerCase();

    if (expected === input) {
      const newProgress = progress + 1;
      if (player === 'blue') {
        this.blueProgress = newProgress;
      } else {
        this.redProgress = newProgress;
      }
      const complete = newProgress >= this.currentWord.length;
      return { player, correct: true, complete, progress: newProgress };
    }
    return { player, correct: false, complete: false, progress };
  }
}
