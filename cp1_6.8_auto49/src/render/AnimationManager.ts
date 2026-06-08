import type { AnimationData, Position } from '../core/types'
import type { ParticleSystem } from './ParticleSystem'

export interface AnimationState {
  unitId: string
  visualX: number
  visualY: number
  scale: number
  opacity: number
  isAnimating: boolean
}

export class AnimationManager {
  private animations: AnimationData[] = []
  private animationStates: Map<string, AnimationState> = new Map()
  private cellSize: number = 64
  private particleSystem: ParticleSystem | null = null
  private onAnimationComplete: (() => void) | null = null

  setCellSize(size: number): void {
    this.cellSize = size
  }

  setParticleSystem(ps: ParticleSystem): void {
    this.particleSystem = ps
  }

  setOnAnimationComplete(cb: () => void): void {
    this.onAnimationComplete = cb
  }

  addAnimations(animations: AnimationData[]): void {
    this.animations.push(...animations)
  }

  initUnitState(unitId: string, pos: Position): void {
    this.animationStates.set(unitId, {
      unitId,
      visualX: pos.col * this.cellSize,
      visualY: pos.row * this.cellSize,
      scale: 1,
      opacity: 1,
      isAnimating: false,
    })
  }

  getUnitState(unitId: string): AnimationState | undefined {
    return this.animationStates.get(unitId)
  }

  removeUnitState(unitId: string): void {
    this.animationStates.delete(unitId)
  }

  update(currentTime: number): void {
    const completedIndices: number[] = []

    for (let i = 0; i < this.animations.length; i++) {
      const anim = this.animations[i]
      const elapsed = currentTime - anim.startTime

      if (elapsed < 0) continue

      const progress = Math.min(1, elapsed / anim.duration)

      switch (anim.type) {
        case 'move':
          this.updateMoveAnimation(anim, progress)
          break
        case 'attack':
          this.updateAttackAnimation(anim, progress)
          break
        case 'skill':
          this.updateSkillAnimation(anim, progress)
          break
        case 'pickup':
          this.updatePickupAnimation(anim, progress)
          break
        case 'death':
          this.updateDeathAnimation(anim, progress)
          break
        case 'turnTransition':
          break
      }

      if (progress >= 1) {
        completedIndices.push(i)
        this.onAnimationFinished(anim)
      }
    }

    for (let i = completedIndices.length - 1; i >= 0; i--) {
      this.animations.splice(completedIndices[i], 1)
    }

    if (this.animations.length === 0 && completedIndices.length > 0) {
      this.onAnimationComplete?.()
    }
  }

  private updateMoveAnimation(anim: AnimationData, progress: number): void {
    if (!anim.path || anim.path.length === 0) return

    const state = this.animationStates.get(anim.unitId)
    if (!state) return

    state.isAnimating = true
    const totalSteps = anim.path.length
    const currentStep = Math.min(Math.floor(progress * totalSteps), totalSteps - 1)
    const stepProgress = (progress * totalSteps) - currentStep

    const fromPos = currentStep === 0 ? anim.from! : anim.path[currentStep - 1]
    const toPos = anim.path[currentStep]

    const easedStep = this.easeInOutCubic(stepProgress)
    state.visualX = (fromPos.col + (toPos.col - fromPos.col) * easedStep) * this.cellSize
    state.visualY = (fromPos.row + (toPos.row - fromPos.row) * easedStep) * this.cellSize

    if (progress >= 1) {
      state.visualX = anim.to!.col * this.cellSize
      state.visualY = anim.to!.row * this.cellSize
      state.isAnimating = false
    }
  }

  private updateAttackAnimation(anim: AnimationData, progress: number): void {
    const state = this.animationStates.get(anim.unitId)
    if (!state) return

    state.isAnimating = true

    if (progress < 0.3) {
      const t = progress / 0.3
      const dx = (anim.to!.col - anim.from!.col) * this.cellSize * 0.3
      const dy = (anim.to!.row - anim.from!.row) * this.cellSize * 0.3
      state.visualX = anim.from!.col * this.cellSize + dx * this.easeOutCubic(t)
      state.visualY = anim.from!.row * this.cellSize + dy * this.easeOutCubic(t)
      state.scale = 1 + t * 0.15
    } else if (progress < 0.5) {
      const t = (progress - 0.3) / 0.2
      const dx = (anim.to!.col - anim.from!.col) * this.cellSize * 0.3
      const dy = (anim.to!.row - anim.from!.row) * this.cellSize * 0.3
      state.visualX = anim.from!.col * this.cellSize + dx * (1 - this.easeInCubic(t))
      state.visualY = anim.from!.row * this.cellSize + dy * (1 - this.easeInCubic(t))
      state.scale = 1.15 - t * 0.15
    } else {
      state.visualX = anim.from!.col * this.cellSize
      state.visualY = anim.from!.row * this.cellSize
      state.scale = 1
      state.isAnimating = false
    }

    if (progress > 0.35 && progress < 0.45 && this.particleSystem && anim.to) {
      this.particleSystem.emit(anim.to, this.cellSize, 'attack', 8)
      this.particleSystem.emitRing(anim.to, this.cellSize)
    }
  }

  private updateSkillAnimation(anim: AnimationData, progress: number): void {
    const state = this.animationStates.get(anim.unitId)
    if (!state) return

    state.isAnimating = true

    if (progress < 0.4) {
      const t = progress / 0.4
      state.scale = 1 + Math.sin(t * Math.PI) * 0.2
    } else {
      state.scale = 1
      state.isAnimating = false
    }

    if (progress > 0.4 && progress < 0.5 && this.particleSystem && anim.to) {
      this.particleSystem.emit(anim.to, this.cellSize, 'skill', 20)
      this.particleSystem.emitRing(anim.to, this.cellSize, '#6c5ce7', 50)
    }
  }

  private updatePickupAnimation(anim: AnimationData, progress: number): void {
    if (this.particleSystem && anim.from) {
      const cx = anim.from.col * this.cellSize + this.cellSize / 2
      const cy = anim.from.row * this.cellSize + this.cellSize / 2
      if (progress < 0.1) {
        this.particleSystem.emit(anim.from, this.cellSize, 'pickup', 12)
      }
    }
  }

  private updateDeathAnimation(anim: AnimationData, progress: number): void {
    const state = this.animationStates.get(anim.unitId)
    if (!state) return

    state.isAnimating = true
    state.opacity = 1 - progress
    state.scale = 1 - progress * 0.5

    if (this.particleSystem && progress < 0.1) {
      const pos = { row: Math.round(state.visualY / this.cellSize), col: Math.round(state.visualX / this.cellSize) }
      this.particleSystem.emit(pos, this.cellSize, 'death', 20)
    }
  }

  private onAnimationFinished(anim: AnimationData): void {
    const state = this.animationStates.get(anim.unitId)
    if (state) {
      state.isAnimating = false
      state.scale = 1
      if (anim.type === 'move' && anim.to) {
        state.visualX = anim.to.col * this.cellSize
        state.visualY = anim.to.row * this.cellSize
      } else if (anim.type === 'attack' && anim.from) {
        state.visualX = anim.from.col * this.cellSize
        state.visualY = anim.from.row * this.cellSize
      } else if (anim.type === 'death') {
        state.opacity = 0
      }
    }
  }

  getTurnTransitionAlpha(currentTime: number): number {
    for (const anim of this.animations) {
      if (anim.type === 'turnTransition') {
        const elapsed = currentTime - anim.startTime
        const progress = Math.min(1, elapsed / anim.duration)
        if (progress < 0.5) {
          return progress * 2
        }
        return (1 - progress) * 2
      }
    }
    return 0
  }

  hasAnimations(): boolean {
    return this.animations.length > 0
  }

  clear(): void {
    this.animations = []
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3)
  }

  private easeInCubic(t: number): number {
    return t * t * t
  }
}
