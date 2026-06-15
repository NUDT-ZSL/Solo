import type { GameEngine } from '../game/GameEngine'

export class HUD {
  private ctx: CanvasRenderingContext2D
  private engine: GameEngine

  constructor(ctx: CanvasRenderingContext2D, engine: GameEngine) {
    this.ctx = ctx
    this.engine = engine
  }

  render() {
    // HUD is rendered via Vue overlay; this class reserved for future canvas-based HUD features
    // and provides a uniform interface for the engine to notify of state changes.
    this.renderMiniCrystalCounter()
  }

  private renderMiniCrystalCounter() {
    // Rendering is handled in App.vue using Vue reactive system.
    // This method intentionally left minimal for engine compatibility.
  }
}
