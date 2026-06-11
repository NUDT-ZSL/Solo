export class HistoryManager<T> {
  private past: T[] = []
  private future: T[] = []
  private maxHistory: number

  constructor(maxHistory: number = 20) {
    this.maxHistory = maxHistory
  }

  push(state: T): void {
    this.past.push(JSON.parse(JSON.stringify(state)))
    if (this.past.length > this.maxHistory) {
      this.past.shift()
    }
    this.future = []
  }

  undo(currentState: T): T | null {
    if (this.past.length === 0) return null
    const previous = this.past.pop()!
    this.future.push(JSON.parse(JSON.stringify(currentState)))
    return previous
  }

  redo(currentState: T): T | null {
    if (this.future.length === 0) return null
    const next = this.future.pop()!
    this.past.push(JSON.parse(JSON.stringify(currentState)))
    return next
  }

  canUndo(): boolean {
    return this.past.length > 0
  }

  canRedo(): boolean {
    return this.future.length > 0
  }

  clear(): void {
    this.past = []
    this.future = []
  }
}
