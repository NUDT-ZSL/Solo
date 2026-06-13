import { TimeLoopState, GameEvent } from './types'
import { LOOP_DURATION, MAX_SHARDS } from './constants'

type Listener = (state: TimeLoopState, event?: GameEvent) => void

export class TimeLoopManager {
  private state: TimeLoopState
  private listeners: Set<Listener> = new Set()
  private deltaAccumulator: number = 0

  constructor() {
    this.state = {
      loopCount: 1,
      timeRemaining: LOOP_DURATION,
      maxTime: LOOP_DURATION,
      shardsCollected: [],
    }
  }

  getState(): TimeLoopState {
    return { ...this.state }
  }

  getLoopCount(): number {
    return this.state.loopCount
  }

  getTimeRemaining(): number {
    return this.state.timeRemaining
  }

  getShardsCollected(): string[] {
    return [...this.state.shardsCollected]
  }

  hasShard(shardId: string): boolean {
    return this.state.shardsCollected.includes(shardId)
  }

  collectShard(shardId: string): boolean {
    if (this.state.shardsCollected.length >= MAX_SHARDS) return false
    if (this.state.shardsCollected.includes(shardId)) return false

    this.state.shardsCollected.push(shardId)
    this.notifyListeners({ type: 'SHARD_COLLECTED', shardId })
    return true
  }

  update(deltaTime: number, isPaused: boolean): void {
    if (isPaused) return

    this.deltaAccumulator += deltaTime
    if (this.deltaAccumulator >= 1) {
      const secondsToSubtract = Math.floor(this.deltaAccumulator)
      this.deltaAccumulator -= secondsToSubtract
      this.state.timeRemaining -= secondsToSubtract

      if (this.state.timeRemaining <= 0) {
        this.resetLoop()
      }
    }
  }

  resetLoop(): void {
    this.state.loopCount += 1
    this.state.timeRemaining = LOOP_DURATION
    this.notifyListeners({ type: 'LOOP_RESET' })
  }

  addListener(listener: Listener): void {
    this.listeners.add(listener)
  }

  removeListener(listener: Listener): void {
    this.listeners.delete(listener)
  }

  private notifyListeners(event?: GameEvent): void {
    this.listeners.forEach((listener) => listener(this.getState(), event))
  }

  checkAllShardsCollected(): boolean {
    return this.state.shardsCollected.length >= MAX_SHARDS
  }
}
