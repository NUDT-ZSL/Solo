import { TimeLoopState, GameEvent } from './types'
import { LOOP_DURATION, MAX_SHARDS, WARNING_TIME } from './constants'

type Listener = (state: TimeLoopState, event?: GameEvent) => void

export class TimeLoopManager {
  private state: TimeLoopState
  private listeners: Set<Listener> = new Set()
  private elapsedSinceLastSecond: number = 0

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

  isWarning(): boolean {
    return this.state.timeRemaining <= WARNING_TIME && this.state.timeRemaining > 0
  }

  collectShard(shardId: string): boolean {
    if (this.state.shardsCollected.length >= MAX_SHARDS) return false
    if (this.state.shardsCollected.includes(shardId)) return false

    this.state.shardsCollected.push(shardId)
    this.notifyListeners({ type: 'SHARD_COLLECTED', shardId })
    return true
  }

  update(deltaTime: number, isPaused: boolean): boolean {
    if (isPaused) return false

    this.elapsedSinceLastSecond += deltaTime

    let loopReset = false

    while (this.elapsedSinceLastSecond >= 1) {
      this.elapsedSinceLastSecond -= 1
      this.state.timeRemaining -= 1

      if (this.state.timeRemaining <= 0) {
        this.state.timeRemaining = 0
        this.resetLoop()
        loopReset = true
        break
      }

      this.notifyListeners()
    }

    return loopReset
  }

  resetLoop(): void {
    this.state.loopCount += 1
    this.state.timeRemaining = LOOP_DURATION
    this.elapsedSinceLastSecond = 0
    this.notifyListeners({ type: 'LOOP_RESET' })
  }

  addListener(listener: Listener): void {
    this.listeners.add(listener)
  }

  removeListener(listener: Listener): void {
    this.listeners.delete(listener)
  }

  private notifyListeners(event?: GameEvent): void {
    const state = this.getState()
    this.listeners.forEach((listener) => listener(state, event))
  }

  checkAllShardsCollected(): boolean {
    return this.state.shardsCollected.length >= MAX_SHARDS
  }
}
