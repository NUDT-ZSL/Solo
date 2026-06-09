import type { HistoryState, Stroke, CharacterClip } from '../../types';

const MAX_HISTORY = 20;

export class HistoryManager {
  private states: HistoryState[] = [];
  private currentIndex: number = -1;

  save(strokes: Stroke[], characters: CharacterClip[]): void {
    while (this.states.length > this.currentIndex + 1) {
      this.states.pop();
    }

    this.states.push({
      strokes: JSON.parse(JSON.stringify(strokes)),
      characters: JSON.parse(JSON.stringify(characters)),
      timestamp: Date.now()
    });

    if (this.states.length > MAX_HISTORY) {
      this.states.shift();
    } else {
      this.currentIndex++;
    }
  }

  undo(): HistoryState | null {
    if (this.currentIndex <= 0) return null;
    this.currentIndex--;
    return JSON.parse(JSON.stringify(this.states[this.currentIndex]));
  }

  redo(): HistoryState | null {
    if (this.currentIndex >= this.states.length - 1) return null;
    this.currentIndex++;
    return JSON.parse(JSON.stringify(this.states[this.currentIndex]));
  }

  canUndo(): boolean {
    return this.currentIndex > 0;
  }

  canRedo(): boolean {
    return this.currentIndex < this.states.length - 1;
  }

  clear(): void {
    this.states = [];
    this.currentIndex = -1;
  }

  size(): number {
    return this.states.length;
  }
}
