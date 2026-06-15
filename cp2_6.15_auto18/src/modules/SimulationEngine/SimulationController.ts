import type { Galaxy, SimulationParams, Particle, WorkerCommand, WorkerResponse } from '../../constants'

type FrameCallback = (particles: Particle[], galaxyRotations: Record<string, number>) => void
type CollisionCallback = (mergedGalaxyId: string) => void

export class SimulationController {
  private worker: Worker | null = null
  private frameCallback: FrameCallback | null = null
  private collisionCallback: CollisionCallback | null = null
  private animFrameId: number = 0
  private running = false
  private lastTime = 0
  private galaxies: Galaxy[] = []
  private params: SimulationParams

  constructor() {
    this.params = { gravityConstant: 1.0, elasticity: 0.5, simulationSpeed: 1.0 }
    this.initWorker()
  }

  private initWorker() {
    this.worker = new Worker(
      new URL('./SimulationWorker.ts', import.meta.url),
      { type: 'module' }
    )

    this.worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const msg = e.data
      switch (msg.type) {
        case 'FRAME_UPDATE':
          if (this.frameCallback) {
            this.frameCallback(msg.particles, msg.galaxyRotations)
          }
          break
        case 'COLLISION_COMPLETE':
          if (this.collisionCallback) {
            this.collisionCallback(msg.mergedGalaxyId)
          }
          break
        case 'READY':
          break
      }
    }
  }

  private sendCommand(cmd: WorkerCommand) {
    if (this.worker) {
      this.worker.postMessage(cmd)
    }
  }

  private startLoop() {
    if (this.running) return
    this.running = true
    this.lastTime = performance.now()

    const loop = (time: number) => {
      if (!this.running) return
      const dt = Math.min((time - this.lastTime) / 16.667, 3)
      this.lastTime = time
      this.sendCommand({ type: 'STEP', dt })
      this.animFrameId = requestAnimationFrame(loop)
    }

    this.animFrameId = requestAnimationFrame(loop)
  }

  private stopLoop() {
    this.running = false
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId)
      this.animFrameId = 0
    }
  }

  init(galaxies: Galaxy[], params: SimulationParams) {
    this.galaxies = galaxies
    this.params = params
    this.sendCommand({ type: 'INIT', galaxies, params })
    this.startLoop()
  }

  addGalaxy(galaxy: Galaxy) {
    this.galaxies.push(galaxy)
    this.sendCommand({ type: 'ADD_GALAXY', galaxy })
  }

  updateParams(params: Partial<SimulationParams>) {
    this.params = { ...this.params, ...params }
    this.sendCommand({ type: 'UPDATE_PARAMS', params: this.params })
  }

  startCollision(galaxyIds: [string, string]) {
    this.sendCommand({ type: 'START_COLLISION', galaxyIds })
  }

  pause() {
    this.stopLoop()
    this.sendCommand({ type: 'PAUSE' })
  }

  resume() {
    this.sendCommand({ type: 'RESUME' })
    this.startLoop()
  }

  reset() {
    this.stopLoop()
    this.galaxies = []
    this.sendCommand({ type: 'RESET' })
  }

  onFrame(cb: FrameCallback) {
    this.frameCallback = cb
  }

  onCollisionComplete(cb: CollisionCallback) {
    this.collisionCallback = cb
  }

  getGalaxies(): Galaxy[] {
    return this.galaxies
  }

  getParams(): SimulationParams {
    return { ...this.params }
  }

  destroy() {
    this.stopLoop()
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }
  }
}
