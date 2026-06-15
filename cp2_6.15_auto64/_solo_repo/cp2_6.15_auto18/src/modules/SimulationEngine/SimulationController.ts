import type { Galaxy, SimulationParams, WorkerCommand, WorkerResponse } from '../../constants'

export type FrameCallback = (data: {
  positions: Float32Array
  colors: Float32Array
  prevPositions: Float32Array
  particleIds: Int32Array
  galaxyIds: string[]
  particleGalaxies: Int32Array
  totalParticles: number
}) => void

export type CollisionEventCallback = (mergedGalaxyId: string) => void
export type CollisionStartCallback = () => void

export class SimulationController {
  private worker: Worker | null = null
  private frameCallback: FrameCallback | null = null
  private collisionCompleteCb: CollisionEventCallback | null = null
  private collisionStartCb: CollisionStartCallback | null = null
  private animFrameId: number = 0
  private running = false
  private lastTime = 0
  private galaxies: Galaxy[] = []
  private params: SimulationParams = { gravityConstant: 1.0, elasticity: 0.5, simulationSpeed: 1.0 }

  constructor() {
    this.initWorker()
  }

  private initWorker() {
    this.worker = new Worker(
      new URL('./SimulationWorker.ts', import.meta.url),
      { type: 'module' }
    )
    this.worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const msg = e.data
      if (msg.type === 'FRAME_UPDATE') {
        if (this.frameCallback) this.frameCallback(msg)
      } else if (msg.type === 'COLLISION_COMPLETE') {
        if (this.collisionCompleteCb) this.collisionCompleteCb(msg.mergedGalaxyId)
      } else if (msg.type === 'COLLISION_STARTED') {
        if (this.collisionStartCb) this.collisionStartCb()
      }
    }
  }

  private send(cmd: WorkerCommand) {
    if (this.worker) this.worker.postMessage(cmd)
  }

  private startLoop() {
    if (this.running) return
    this.running = true
    this.lastTime = performance.now()
    const loop = (t: number) => {
      if (!this.running) return
      const dt = Math.min((t - this.lastTime) / 16.667, 3)
      this.lastTime = t
      this.send({ type: 'STEP', dt })
      this.animFrameId = requestAnimationFrame(loop)
    }
    this.animFrameId = requestAnimationFrame(loop)
  }

  private stopLoop() {
    this.running = false
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId)
    this.animFrameId = 0
  }

  init(galaxies: Galaxy[], params: SimulationParams) {
    this.galaxies = [...galaxies]
    this.params = { ...params }
    this.send({ type: 'INIT', galaxies: this.galaxies, params: this.params })
    this.startLoop()
  }

  addGalaxy(galaxy: Galaxy) {
    this.galaxies.push(galaxy)
    this.send({ type: 'ADD_GALAXY', galaxy })
  }

  updateParams(params: Partial<SimulationParams>) {
    this.params = { ...this.params, ...params }
    this.send({ type: 'UPDATE_PARAMS', params: this.params })
  }

  startCollision(galaxyIds: [string, string]) {
    this.send({ type: 'START_COLLISION', galaxyIds })
  }

  pause() {
    this.stopLoop()
    this.send({ type: 'PAUSE' })
  }

  resume() {
    this.send({ type: 'RESUME' })
    this.startLoop()
  }

  isPaused() {
    return !this.running
  }

  reset() {
    this.stopLoop()
    this.galaxies = []
    this.send({ type: 'RESET' })
  }

  onFrame(cb: FrameCallback) { this.frameCallback = cb }
  onCollisionComplete(cb: CollisionEventCallback) { this.collisionCompleteCb = cb }
  onCollisionStart(cb: CollisionStartCallback) { this.collisionStartCb = cb }

  getGalaxies(): Galaxy[] { return [...this.galaxies] }
  getGalaxyCount(): number { return this.galaxies.length }
  getParams(): SimulationParams { return { ...this.params } }

  destroy() {
    this.stopLoop()
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }
  }
}
